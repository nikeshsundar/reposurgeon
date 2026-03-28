import { migrateDependencies, migrateJsToTs } from "./js-to-ts";
import type { RepoFile } from "../analyzer";

export type MigrationResult = {
	type: string;
	totalFiles: number;
	migratedFiles: number;
	skippedFiles: number;
	results: Array<{
		original: string;
		migrated: string;
		filePath: string;
	}>;
	outputDir: string;
};

export async function runMigration(
	migrationType: string,
	files: RepoFile[],
	repoPath: string,
	outputDir: string,
): Promise<MigrationResult> {
	if (migrationType === "js-to-ts") {
		const totalFiles = files.filter((file) => file.extension === ".js").length;
		const results = await migrateJsToTs(files, outputDir);
		await migrateDependencies(repoPath, outputDir);

		const migratedFiles = results.length;
		const skippedFiles = Math.max(totalFiles - migratedFiles, 0);

		return {
			type: migrationType,
			totalFiles,
			migratedFiles,
			skippedFiles,
			results,
			outputDir,
		};
	}

	if (migrationType === "unknown") {
		throw new Error("Could not detect migration type. Use --type flag to specify.");
	}

	throw new Error("Migration type not supported yet. Coming soon!");
}
