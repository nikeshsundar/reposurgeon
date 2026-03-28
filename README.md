# 🔪 RepoSurgeon

> AI-powered surgical codebase migration tool

[![npm version](https://badge.fury.io/js/reposurgeon.svg)](https://www.npmjs.com/package/reposurgeon)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Migrate any codebase with any AI provider in one command.**

No config files. No setup. Just point it at your project and go.

## Install

npm install -g reposurgeon

## Usage

cd your-project
reposurgeon migrate .

## Supported AI Providers

Works with ANY of these — just set one key in .env:

| Provider | Key |
|---|---|
| OpenAI | OPENAI_API_KEY |
| Anthropic Claude | ANTHROPIC_API_KEY |
| GitHub Models | GITHUB_TOKEN |
| Google Gemini | GEMINI_API_KEY |
| Groq (Free!) | GROQ_API_KEY |
| Mistral | MISTRAL_API_KEY |
| Cohere | COHERE_API_KEY |
| Together AI | TOGETHER_API_KEY |
| Fireworks | FIREWORKS_API_KEY |
| Perplexity | PERPLEXITY_API_KEY |
| DeepSeek | DEEPSEEK_API_KEY |
| xAI Grok | XAI_API_KEY |
| Azure OpenAI | AZURE_OPENAI_API_KEY |
| OpenRouter | OPENROUTER_API_KEY |
| Ollama (Local/Free!) | Auto-detected |
| LM Studio (Local/Free!) | Auto-detected |
| Jan (Local/Free!) | Auto-detected |

## Supported Migrations

| From | To | Status |
|---|---|---|
| JavaScript | TypeScript | ✅ Ready |
| React CRA | Vite | 🔜 Coming Soon |
| Webpack | Vite | 🔜 Coming Soon |
| REST API | GraphQL | 🔜 Coming Soon |
| Python 2 | Python 3 | 🔜 Coming Soon |

## Commands

# Migrate your project
reposurgeon migrate .

# Detect what migration is needed
reposurgeon detect .

# See all supported AI providers
reposurgeon providers

# Migrate to custom output folder
reposurgeon migrate . --output ./my-ts-project

# Force specific migration type
reposurgeon migrate . --type js-to-ts

## How It Works

1. Scans your entire codebase
2. Auto-detects what migration is needed
3. Uses AI to surgically transform each file
4. Preserves all your logic — only syntax changes
5. Outputs to a new folder — original code never touched
6. Generates a full diff report

## Quick Start with Free Providers

### Option 1 — Groq (Free, Fast)
1. Get free key at https://console.groq.com
2. echo "GROQ_API_KEY=your_key" > .env
3. reposurgeon migrate .

### Option 2 — Ollama (100% Local, Free)
1. Install Ollama from https://ollama.ai
2. ollama pull codellama
3. reposurgeon migrate .
   (auto-detected, no key needed!)

### Option 3 — GitHub Token (Free)
1. Go to https://github.com/settings/tokens
2. echo "GITHUB_TOKEN=your_token" > .env
3. reposurgeon migrate .

## Contributing

PRs welcome! Adding a new migration type:
1. Fork the repo
2. Add your migrator in src/migrators/
3. Register it in src/migrators/index.ts
4. Submit a PR

## License

MIT

---

If RepoSurgeon saved you time, please ⭐ star this repo!
