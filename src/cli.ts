#!/usr/bin/env node

import chalk from "chalk";
import { Command } from "commander";
import * as dotenv from "dotenv";
import fs from "fs-extra";
import ora from "ora";
import path from "path";
import { listProviders } from "./ai";
import { analyzeRepo, detectMigrationType } from "./analyzer";
import { runMigration } from "./migrators/index";
import { generateReport, printSummary } from "./reporter";

dotenv.config();

const program = new Command();

function handleCliError(error: unknown): never {
	const message = error instanceof Error ? error.message : "An unknown error occurred.";
	console.error(chalk.red(message));
	process.exit(1);
}

program
	.name("reposurgeon")
	.description("AI-powered surgical codebase migration tool")
	.version("1.0.0");

program
	.command("migrate")
	.argument("[repoPath]", "Path to repository", ".")
	.option("--type <type>", "Override auto-detected migration type")
	.option("--output <dir>", "Output directory", "./reposurgeon-output")
	.option("--no-report", "Skip generating markdown report")
	.action(async (repoPathArg: string, options: { type?: string; output: string; report: boolean }) => {
		const spinner = ora();

		try {
			const repoPath = path.resolve(repoPathArg || ".");
			const outputDir = path.resolve(options.output);

			const repoExists = await fs.pathExists(repoPath);
			if (!repoExists) {
				throw new Error(`Repository path does not exist: ${repoPath}`);
			}

			spinner.start("Analyzing repository...");
			const files = await analyzeRepo(repoPath);

			const migrationType = options.type ?? detectMigrationType(files);
			const totalFiles =
				migrationType === "js-to-ts"
					? files.filter((file) => file.extension === ".js").length
					: files.length;

			spinner.text = `Migrating ${totalFiles} files with AI...`;

			await fs.ensureDir(outputDir);
			const result = await runMigration(migrationType, files, repoPath, outputDir);

			spinner.stop();
			printSummary(result);

			if (options.report) {
				await generateReport(result, outputDir);
			}

			console.log(chalk.green(`Output saved to ${outputDir}`));
		} catch (error: unknown) {
			spinner.fail("Migration failed.");
			handleCliError(error);
		}
	});

program
	.command("detect")
	.argument("[repoPath]", "Path to repository", ".")
	.action(async (repoPathArg: string) => {
		const spinner = ora();

		try {
			const repoPath = path.resolve(repoPathArg || ".");
			const repoExists = await fs.pathExists(repoPath);
			if (!repoExists) {
				throw new Error(`Repository path does not exist: ${repoPath}`);
			}

			spinner.start("Analyzing repository...");
			const files = await analyzeRepo(repoPath);
			const migrationType = detectMigrationType(files);
			spinner.succeed(`Detected migration type: ${migrationType}`);
		} catch (error: unknown) {
			spinner.fail("Detection failed.");
			handleCliError(error);
		}
	});

program
	.command("providers")
	.description("List all supported AI providers")
	.action(() => {
		try {
			listProviders();
		} catch (error: unknown) {
			handleCliError(error);
		}
	});

program.parseAsync(process.argv).catch(handleCliError);
