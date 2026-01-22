import type { Logger } from "winston";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { BotConfig } from "../config.js";
import { ServiceError } from "../logging/LogError.js";

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
      throw new ServiceError("LLM API key is not configured.");
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
        throw new ServiceError("LLM response was empty.");
      }
      return content;
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }
      throw new ServiceError("LLM request failed.", { cause: error });
    }
  }
}
