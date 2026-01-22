export type BotConfig = {
  token: string;
  clientId: string;
  guildIds: string[];
  moderatorRoleIds: string[];
  databasePath: string;
  logLevel: string;
  llm: {
    apiKey?: string;
    model: string;
    baseUrl: string;
  };
  grok: {
    apiKey?: string;
    model: string;
    baseUrl: string;
  };
};

const splitCsv = (value?: string): string[] => {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

export const config: BotConfig = {
  token: process.env.DISCORD_TOKEN ?? "",
  clientId: process.env.DISCORD_CLIENT_ID ?? "",
  guildIds: splitCsv(process.env.DISCORD_GUILD_IDS ?? process.env.DISCORD_GUILD_ID),
  moderatorRoleIds: splitCsv(process.env.MODERATOR_ROLE_IDS),
  databasePath: process.env.DATABASE_PATH ?? "./data/bot.db",
  logLevel: process.env.LOG_LEVEL ?? "info",
  llm: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.LLM_MODEL ?? "gpt-4o-mini",
    baseUrl: process.env.LLM_BASE_URL ?? "https://api.openai.com/v1"
  },
  grok: {
    apiKey: process.env.XAI_API_KEY,
    model: process.env.XAI_MODEL ?? "grok-4-fast",
    baseUrl: process.env.XAI_BASE_URL ?? "https://api.x.ai/v1"
  }
};

export const validateConfig = (): void => {
  if (!config.token) {
    throw new Error("Missing DISCORD_TOKEN in environment.");
  }
  if (!config.clientId) {
    throw new Error("Missing DISCORD_CLIENT_ID in environment.");
  }
};
