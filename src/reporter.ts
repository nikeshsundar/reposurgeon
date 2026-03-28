import chalk from "chalk";
import { createPatch } from "diff";
import fs from "fs-extra";
import path from "path";
import type { MigrationResult } from "./migrators/index";

export function printSummary(result: MigrationResult): void {
	const lines = [
		chalk.green("✅ Migration Complete!"),
		chalk.white(`Type: ${result.type}`),
		chalk.green(`Migrated: ${result.migratedFiles} files`),
		chalk.yellow(`Skipped: ${result.skippedFiles} files`),
		chalk.blue(`Output: ${result.outputDir}`),
	];

	const maxLength = Math.max(...lines.map((line) => line.length));
	const top = chalk.white(`┌${"─".repeat(maxLength + 2)}┐`);
	const bottom = chalk.white(`└${"─".repeat(maxLength + 2)}┘`);

	console.log(top);
	for (const line of lines) {
		const plainLength = line.length;
		const padding = " ".repeat(maxLength - plainLength);
		console.log(chalk.white("│ ") + line + padding + chalk.white(" │"));
	}
	console.log(bottom);
}

export async function generateReport(result: MigrationResult, outputDir: string): Promise<void> {
	const reportPath = path.join(outputDir, "migration-report.md");
	const now = new Date().toISOString();

	let report = "";
	report += "# RepoSurgeon Migration Report\n\n";
	report += `Date: ${now}\n`;
	report += `Migration Type: ${result.type}\n\n`;
	report += "## Summary\n\n";
	report += "| Metric | Count |\n";
	report += "| --- | ---: |\n";
	report += `| Total | ${result.totalFiles} |\n`;
	report += `| Migrated | ${result.migratedFiles} |\n`;
	report += `| Skipped | ${result.skippedFiles} |\n\n`;
	report += "## File Diffs\n\n";

	for (const fileResult of result.results) {
		const patch = createPatch(
			fileResult.filePath,
			fileResult.original,
			fileResult.migrated,
			"original",
			"migrated",
		);

		report += `### ${fileResult.filePath}\n\n`;
		report += "```diff\n";
		report += patch;
		report += "\n```\n\n";
	}

	await fs.ensureDir(outputDir);
	await fs.writeFile(reportPath, report, "utf8");
}
