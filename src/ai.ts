import chalk from "chalk";
import * as dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config({ quiet: true });

type ProviderId =
  | "openai"
  | "anthropic"
  | "github"
  | "gemini"
  | "groq"
  | "mistral"
  | "cohere"
  | "together"
  | "fireworks"
  | "perplexity"
  | "deepseek"
  | "xai"
  | "azure-openai"
  | "openrouter"
  | "ollama"
  | "lm-studio"
  | "jan";

type DetectedProvider = {
  id: ProviderId;
  name: string;
  model: string;
  apiKey: string;
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
};

type CloudProviderSpec = {
  id: ProviderId;
  name: string;
  envKey: string;
  defaultModel: string;
  baseURL?: string;
  modelEnvKey?: string;
  baseUrlEnvKey?: string;
  defaultHeaders?: Record<string, string>;
};

type LocalProviderSpec = {
  id: ProviderId;
  name: string;
  envKey: string;
  defaultHost: string;
  defaultModel: string;
  modelEnvKey?: string;
  pingPaths: string[];
  apiKey: string;
};

export type DependencyAnalysis = {
  toAdd: string[];
  toRemove: string[];
  toUpdate: Record<string, string>;
};

const cloudProviders: CloudProviderSpec[] = [
  {
    id: "openai",
    name: "OpenAI",
    envKey: "OPENAI_API_KEY",
    defaultModel: "gpt-4o",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    baseURL: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-4-20250514",
  },
  {
    id: "github",
    name: "GitHub Models",
    envKey: "GITHUB_TOKEN",
    baseURL: "https://models.inference.ai.azure.com",
    defaultModel: "gpt-4o",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    envKey: "GEMINI_API_KEY",
    baseURL: "https://generativelanguage.googleapis.com/openai",
    defaultModel: "gemini-2.0-flash",
  },
  {
    id: "groq",
    name: "Groq",
    envKey: "GROQ_API_KEY",
    baseURL: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
  },
  {
    id: "mistral",
    name: "Mistral",
    envKey: "MISTRAL_API_KEY",
    baseURL: "https://api.mistral.ai/v1",
    defaultModel: "mistral-large-latest",
  },
  {
    id: "cohere",
    name: "Cohere",
    envKey: "COHERE_API_KEY",
    baseURL: "https://api.cohere.ai/compatibility/v1",
    defaultModel: "command-r-plus",
  },
  {
    id: "together",
    name: "Together AI",
    envKey: "TOGETHER_API_KEY",
    baseURL: "https://api.together.xyz/v1",
    defaultModel: "meta-llama/Llama-3-70b-chat-hf",
  },
  {
    id: "fireworks",
    name: "Fireworks",
    envKey: "FIREWORKS_API_KEY",
    baseURL: "https://api.fireworks.ai/inference/v1",
    defaultModel: "accounts/fireworks/models/llama-v3p1-70b-instruct",
  },
  {
    id: "perplexity",
    name: "Perplexity",
    envKey: "PERPLEXITY_API_KEY",
    baseURL: "https://api.perplexity.ai",
    defaultModel: "llama-3.1-sonar-large-128k-online",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    envKey: "DEEPSEEK_API_KEY",
    baseURL: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-coder",
  },
  {
    id: "xai",
    name: "xAI",
    envKey: "XAI_API_KEY",
    baseURL: "https://api.x.ai/v1",
    defaultModel: "grok-2-latest",
  },
  {
    id: "azure-openai",
    name: "Azure OpenAI",
    envKey: "AZURE_OPENAI_API_KEY",
    baseUrlEnvKey: "AZURE_OPENAI_ENDPOINT",
    modelEnvKey: "AZURE_OPENAI_MODEL",
    defaultModel: "gpt-4o",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    envKey: "OPENROUTER_API_KEY",
    baseURL: "https://openrouter.ai/api/v1",
    defaultModel: "anthropic/claude-3.5-sonnet",
    defaultHeaders: {
      "HTTP-Referer": "https://github.com/reposurgeon",
    },
  },
];

const localProviders: LocalProviderSpec[] = [
  {
    id: "ollama",
    name: "Ollama",
    envKey: "OLLAMA_BASE_URL",
    defaultHost: "http://localhost:11434",
    defaultModel: "codellama",
    modelEnvKey: "OLLAMA_MODEL",
    pingPaths: ["/api/tags", "/v1/models"],
    apiKey: "ollama",
  },
  {
    id: "lm-studio",
    name: "LM Studio",
    envKey: "LM_STUDIO_BASE_URL",
    defaultHost: "http://localhost:1234",
    defaultModel: "local-model",
    pingPaths: ["/v1/models"],
    apiKey: "lm-studio",
  },
  {
    id: "jan",
    name: "Jan",
    envKey: "JAN_BASE_URL",
    defaultHost: "http://localhost:1337",
    defaultModel: "local-model",
    pingPaths: ["/v1/models"],
    apiKey: "jan",
  },
];

let client!: OpenAI;
let AI_MODEL = "";
let AI_PROVIDER = "";
let providerInitPromise: Promise<void> | null = null;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeHost(host: string): string {
  return host.replace(/\/+$/, "");
}

function withV1(host: string): string {
  const normalized = normalizeHost(host);
  return normalized.endsWith("/v1") ? normalized : `${normalized}/v1`;
}

async function pingUrl(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1000);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });
    return response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function detectCloudProvider(id?: string): Promise<DetectedProvider | null> {
  for (const provider of cloudProviders) {
    if (id && provider.id !== id) {
      continue;
    }

    const apiKey = readEnv(provider.envKey);
    if (!apiKey) {
      continue;
    }

    const baseURL = provider.baseUrlEnvKey ? readEnv(provider.baseUrlEnvKey) : provider.baseURL;
    if (provider.id === "azure-openai" && !baseURL) {
      continue;
    }

    const model = readEnv(provider.modelEnvKey ?? "") ?? provider.defaultModel;
    return {
      id: provider.id,
      name: provider.name,
      model,
      apiKey,
      baseURL,
      defaultHeaders: provider.defaultHeaders,
    };
  }

  return null;
}

async function detectLocalProvider(id?: string): Promise<DetectedProvider | null> {
  for (const provider of localProviders) {
    if (id && provider.id !== id) {
      continue;
    }

    const host = readEnv(provider.envKey) ?? provider.defaultHost;
    const normalizedHost = normalizeHost(host);
    const pingResults = await Promise.all(
      provider.pingPaths.map(async (pingPath) => pingUrl(`${normalizedHost}${pingPath}`)),
    );
    const isAlive = pingResults.some((value) => value);

    if (!isAlive) {
      continue;
    }

    return {
      id: provider.id,
      name: provider.name,
      model: readEnv(provider.modelEnvKey ?? "") ?? provider.defaultModel,
      apiKey: provider.apiKey,
      baseURL: withV1(normalizedHost),
    };
  }

  return null;
}

function printProviderBox(providerName: string, model: string): void {
  const lines = [
    "🔑 RepoSurgeon AI Provider",
    `Provider : ${providerName}`,
    `Model    : ${model}`,
    "Status   : ✅ Ready",
  ];

  const width = Math.max(...lines.map((line) => line.length)) + 2;
  const top = `┌${"─".repeat(width)}┐`;
  const bottom = `└${"─".repeat(width)}┘`;

  console.log(chalk.cyan(top));
  for (const line of lines) {
    const padded = line + " ".repeat(width - line.length);
    console.log(chalk.cyan("│") + ` ${chalk.white(padded.slice(0, width - 1))}` + chalk.cyan("│"));
  }
  console.log(chalk.cyan(bottom));
}

function printNoProviderHelp(): void {
  console.error(chalk.red("❌ No AI provider detected! Add ANY of these to .env:\n"));
  console.error(chalk.blue("☁️  CLOUD (need API key):"));
  console.error("    OPENAI_API_KEY=sk-...");
  console.error("    ANTHROPIC_API_KEY=sk-ant-...");
  console.error("    GITHUB_TOKEN=ghp_...");
  console.error("    GEMINI_API_KEY=...");
  console.error("    GROQ_API_KEY=...");
  console.error("    MISTRAL_API_KEY=...");
  console.error("    COHERE_API_KEY=...");
  console.error("    TOGETHER_API_KEY=...");
  console.error("    FIREWORKS_API_KEY=...");
  console.error("    PERPLEXITY_API_KEY=...");
  console.error("    DEEPSEEK_API_KEY=...");
  console.error("    XAI_API_KEY=...");
  console.error("    AZURE_OPENAI_API_KEY=...");
  console.error("    OPENROUTER_API_KEY=...\n");
  console.error(chalk.magenta("🖥️  LOCAL (free, no key needed):"));
  console.error("    Install Ollama -> https://ollama.ai (auto-detected!)");
  console.error("    Install LM Studio -> https://lmstudio.ai (auto-detected!)");
  console.error("    Install Jan -> https://jan.ai (auto-detected!)");
}

async function detectProvider(): Promise<DetectedProvider> {
  const forcedProvider = readEnv("REPOSURGEON_PROVIDER")?.toLowerCase();
  const forcedModel = readEnv("REPOSURGEON_MODEL");

  let detected: DetectedProvider | null = null;

  if (forcedProvider) {
    detected = (await detectCloudProvider(forcedProvider)) ?? (await detectLocalProvider(forcedProvider));
    if (!detected) {
      throw new Error(`Forced provider '${forcedProvider}' is not available or not configured.`);
    }
  } else {
    detected = (await detectCloudProvider()) ?? (await detectLocalProvider());
  }

  if (!detected) {
    printNoProviderHelp();
    throw new Error("No AI provider configured.");
  }

  if (forcedModel) {
    detected.model = forcedModel;
  }

  return detected;
}

function createClient(provider: DetectedProvider): OpenAI {
  return new OpenAI({
    apiKey: provider.apiKey,
    baseURL: provider.baseURL,
    defaultHeaders: provider.defaultHeaders,
  });
}

async function ensureProviderReady(): Promise<void> {
  if (!providerInitPromise) {
    providerInitPromise = (async () => {
      const detected = await detectProvider();
      client = createClient(detected);
      AI_MODEL = detected.model;
      AI_PROVIDER = detected.id;
      printProviderBox(detected.name, detected.model);
    })();
  }

  await providerInitPromise;
}

function getMessageContent(content: string | null): string {
  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  return content.trim();
}

export function listProviders(): void {
  console.log(chalk.bold("\nRepoSurgeon Supported Providers\n"));
  console.log(chalk.blue("Cloud Providers"));
  for (const provider of cloudProviders) {
    const base = provider.baseURL ?? `${provider.baseUrlEnvKey ?? "(from env)"}`;
    console.log(
      `${chalk.green("- ")}${chalk.white(provider.name.padEnd(14))} ${chalk.gray(provider.envKey.padEnd(22))} ${chalk.cyan(provider.defaultModel.padEnd(36))} ${chalk.yellow(base)}`,
    );
  }

  console.log(chalk.magenta("\nLocal Providers"));
  for (const provider of localProviders) {
    console.log(
      `${chalk.green("- ")}${chalk.white(provider.name.padEnd(14))} ${chalk.gray(provider.envKey.padEnd(22))} ${chalk.cyan(provider.defaultModel.padEnd(36))} ${chalk.yellow(`${provider.defaultHost}/v1`)}`,
    );
  }
  console.log("");
}

export async function transformWithAI(
  code: string,
  instruction: string,
  filePath: string,
): Promise<string> {
  await ensureProviderReady();

  const completion = await client.chat.completions.create({
    model: AI_MODEL,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "You are RepoSurgeon, an expert code migration engine. Return ONLY transformed code. No markdown, no explanations. Preserve all logic. Add proper TypeScript types.",
      },
      {
        role: "user",
        content: `filePath: ${filePath}\ninstruction: ${instruction}\n\ncode:\n${code}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? null;
  return getMessageContent(content);
}

export async function analyzeDependencies(
  packageJsonContent: string,
): Promise<DependencyAnalysis> {
  await ensureProviderReady();

  const completion = await client.chat.completions.create({
    model: AI_MODEL,
    messages: [
      {
        role: "system",
        content: "You are a dependency expert. Return ONLY valid JSON.",
      },
      {
        role: "user",
        content:
          "Analyze this package.json content and return ONLY valid JSON with this exact shape: { \"toAdd\": [], \"toRemove\": [], \"toUpdate\": {} }.\n\n" +
          packageJsonContent,
      },
    ],
  });

  const content = getMessageContent(completion.choices[0]?.message?.content ?? null);
  return JSON.parse(content) as DependencyAnalysis;
}

export { client, AI_MODEL, AI_PROVIDER };
