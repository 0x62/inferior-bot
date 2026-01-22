import type { Logger } from "winston";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { BotConfig } from "../config.js";

export type LlmPrompt = {
  system: string;
  user: string;
};

export class LlmClient {
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly logger: Logger;
  private readonly provider: ReturnType<typeof createOpenAI>;

  constructor(config: BotConfig, logger: Logger) {
    this.apiKey = config.llm.apiKey;
    this.model = config.llm.model;
    this.baseUrl = config.llm.baseUrl;
    this.logger = logger;
    this.provider = createOpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseUrl
    });
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async complete(prompt: LlmPrompt): Promise<string> {
    if (!this.apiKey) {
      throw new Error("LLM API key is not configured.");
    }

    try {
      const { text } = await generateText({
        model: this.provider.chat(this.model),
        system: prompt.system,
        prompt: prompt.user,
        temperature: 0.4
      });
      const content = text.trim();
      if (!content) {
        throw new Error("LLM response was empty.");
      }
      return content;
    } catch (error) {
      this.logger.error("LLM request failed: %s", String(error));
      throw error;
    }
  }
}
