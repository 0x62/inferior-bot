import type { Logger } from "winston";
import { generateText } from "ai";
import { createXai } from "@ai-sdk/xai";
import type { BotConfig } from "../config.js";
import { ServiceError } from "../logging/LogError.js";

export class GrokClient {
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly logger: Logger;
  private readonly provider: ReturnType<typeof createXai>;

  constructor(config: BotConfig, logger: Logger) {
    this.apiKey = config.grok.apiKey;
    this.model = config.grok.model;
    this.baseUrl = config.grok.baseUrl;
    this.logger = logger;
    this.provider = createXai({
      apiKey: this.apiKey,
      baseURL: this.baseUrl,
    });
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async fetchContext(message: string): Promise<string> {
    if (!this.apiKey) {
      throw new ServiceError("Grok API key is not configured.");
    }

    try {
      const { text } = await generateText({
        model: this.provider.responses(this.model),
        prompt: `What is the context around this: ${message}`,
        tools: {
          web_search: this.provider.tools.webSearch(),
        },
        toolChoice: "auto",
        temperature: 0.3,
        system:
          "Provide concise, confident background context using web search when helpful. " +
          "Do not mention that you searched or reference the user or message directly. " +
          "Summarise the context in a few sentences. Do not reply with more than 500 words.",
      });
      const content = text.trim();
      if (!content) {
        throw new ServiceError("Grok response was empty.");
      }
      return content;
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }
      throw new ServiceError("Grok request failed.", { cause: error });
    }
  }
}
