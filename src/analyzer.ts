import fs from "fs-extra";
import { glob } from "glob";
import path from "path";

export type RepoFile = {
	filePath: string;
	content: string;
	extension: string;
	isTest: boolean;
};

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".svg", ".gif", ".ico"]);

function isTestFile(relativeFilePath: string): boolean {
	return (
		relativeFilePath.includes("/__tests__/") ||
		/\.(test|spec)\.[^.]+$/i.test(relativeFilePath)
	);
}

export async function analyzeRepo(repoPath: string): Promise<RepoFile[]> {
	const filePaths = await glob("**/*", {
		cwd: repoPath,
		nodir: true,
		dot: true,
		ignore: [
			"**/node_modules/**",
			"**/.git/**",
			"**/dist/**",
			"**/build/**",
			"**/coverage/**",
			"**/*.png",
			"**/*.jpg",
			"**/*.jpeg",
			"**/*.svg",
			"**/*.gif",
			"**/*.ico",
		],
	});

	const repoFiles: RepoFile[] = [];

	for (const relativeFilePath of filePaths) {
		const extension = path.extname(relativeFilePath).toLowerCase();
		if (IMAGE_EXTENSIONS.has(extension)) {
			continue;
		}

		const absoluteFilePath = path.join(repoPath, relativeFilePath);

		let content: string;
		try {
			content = await fs.readFile(absoluteFilePath, "utf8");
		} catch {
			content = "";
		}

		repoFiles.push({
			filePath: relativeFilePath,
			content,
			extension,
			isTest: isTestFile(relativeFilePath),
		});
	}

	return repoFiles;
}

export function detectMigrationType(files: RepoFile[]): string {
	const hasTsConfig = files.some((file) => path.basename(file.filePath).toLowerCase() === "tsconfig.json");

	const jsFiles = files.filter((file) => file.extension === ".js");
	const jsTsFiles = files.filter((file) => file.extension === ".js" || file.extension === ".ts");
	const jsMajority = jsTsFiles.length > 0 && jsFiles.length / jsTsFiles.length > 0.5;

	if (jsMajority && !hasTsConfig) {
		return "js-to-ts";
	}

	const packageJsonFile = files.find(
		(file) => path.basename(file.filePath).toLowerCase() === "package.json",
	);
	if (packageJsonFile?.content.includes("react-scripts")) {
		return "cra-to-vite";
	}

	const hasWebpackConfig = files.some(
		(file) => path.basename(file.filePath).toLowerCase() === "webpack.config.js",
	);
	if (hasWebpackConfig) {
		return "webpack-to-vite";
	}

	return "unknown";
}
