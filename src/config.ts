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
    embeddingModel: string;
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
    embeddingModel: process.env.LLM_EMBEDDING_MODEL ?? "text-embedding-3-small",
    baseUrl: process.env.LLM_BASE_URL ?? "https://api.openai.com/v1"
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
