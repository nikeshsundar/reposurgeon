import fs from "fs-extra";
import path from "path";
import { analyzeDependencies, transformWithAI } from "../ai";
import type { RepoFile } from "../analyzer";

export type MigrationResult = {
	original: string;
	migrated: string;
	filePath: string;
};

const JS_TO_TS_INSTRUCTION =
	"Convert this JavaScript file to TypeScript. Add proper types to all functions, variables, and parameters. Add interfaces for all objects. Change import/export syntax if needed. Return only the converted TypeScript code.";

type JsonObject = Record<string, unknown>;

function asRecord(value: unknown): Record<string, string> {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return {};
	}

	return value as Record<string, string>;
}

export async function migrateJsToTs(
	files: RepoFile[],
	outputDir: string,
): Promise<{ original: string; migrated: string; filePath: string }[]> {
	const jsFiles = files.filter(
		(file) => file.extension === ".js" && !file.isTest && !file.filePath.endsWith(".min.js"),
	);

	const results: MigrationResult[] = [];

	for (const file of jsFiles) {
		try {
			const migratedCode = await transformWithAI(file.content, JS_TO_TS_INSTRUCTION, file.filePath);
			const nextFilePath = file.filePath.replace(/\.js$/i, ".ts");
			const outputFilePath = path.join(outputDir, nextFilePath);

			await fs.ensureDir(path.dirname(outputFilePath));
			await fs.writeFile(outputFilePath, migratedCode, "utf8");

			results.push({
				original: file.content,
				migrated: migratedCode,
				filePath: nextFilePath,
			});
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown migration error";
			console.error(`Failed to migrate ${file.filePath}: ${message}`);
		}
	}

	return results;
}

export async function migrateDependencies(repoPath: string, outputDir: string): Promise<void> {
	const packageJsonPath = path.join(repoPath, "package.json");
	const outputPackageJsonPath = path.join(outputDir, "package.json");
	const outputTsConfigPath = path.join(outputDir, "tsconfig.json");

	const packageJsonContent = await fs.readFile(packageJsonPath, "utf8");
	const packageJson = JSON.parse(packageJsonContent) as JsonObject;
	const dependencyAnalysis = await analyzeDependencies(packageJsonContent);

	const dependencies = asRecord(packageJson.dependencies);
	const devDependencies = asRecord(packageJson.devDependencies);

	for (const dependencyName of dependencyAnalysis.toRemove) {
		delete dependencies[dependencyName];
		delete devDependencies[dependencyName];
	}

	for (const [dependencyName, version] of Object.entries(dependencyAnalysis.toUpdate)) {
		if (dependencyName in devDependencies) {
			devDependencies[dependencyName] = version;
			continue;
		}

		dependencies[dependencyName] = version;
	}

	for (const dependencyName of dependencyAnalysis.toAdd) {
		if (!(dependencyName in dependencies) && !(dependencyName in devDependencies)) {
			dependencies[dependencyName] = "latest";
		}
	}

	if (!("typescript" in devDependencies)) {
		devDependencies.typescript = "^5.0.0";
	}

	packageJson.dependencies = dependencies;
	packageJson.devDependencies = devDependencies;

	await fs.ensureDir(outputDir);
	await fs.writeFile(outputPackageJsonPath, JSON.stringify(packageJson, null, 2) + "\n", "utf8");

	const basicTsConfig = {
		compilerOptions: {
			target: "ES2020",
			module: "commonjs",
			strict: true,
			outDir: "./dist",
			rootDir: "./src",
		},
		include: ["src/**/*"],
	};

	await fs.writeFile(outputTsConfigPath, JSON.stringify(basicTsConfig, null, 2) + "\n", "utf8");
}
