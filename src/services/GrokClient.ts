import type { Logger } from "winston";
import { generateText } from "ai";
import { createXai } from "@ai-sdk/xai";
import type { BotConfig } from "../config.js";

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
      baseURL: this.baseUrl
    });
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async fetchContext(message: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Grok API key is not configured.");
    }

    try {
      const { text } = await generateText({
        model: this.provider.responses(this.model),
        prompt: `What is the context around this: ${message}`,
        tools: {
          web_search: this.provider.tools.webSearch()
        },
        toolChoice: "auto",
        temperature: 0.3,
        system:
          "Provide concise, confident background context using web search when helpful. " +
          "Do not mention that you searched or reference the user or message directly."
      });
      const content = text.trim();
      if (!content) {
        throw new Error("Grok response was empty.");
      }
      return content;
    } catch (error) {
      this.logger.error("Grok request failed: %s", String(error));
      throw error;
    }
  }
}
