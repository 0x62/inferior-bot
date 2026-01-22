import type { Logger } from "winston";
import type { BotConfig } from "../config.js";

export class GrokClient {
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly logger: Logger;

  constructor(config: BotConfig, logger: Logger) {
    this.apiKey = config.grok.apiKey;
    this.model = config.grok.model;
    this.baseUrl = config.grok.baseUrl;
    this.logger = logger;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async fetchContext(message: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Grok API key is not configured.");
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "Provide concise, confident background context using web search when helpful. " +
              "Do not mention that you searched or reference the user or message directly."
          },
          {
            role: "user",
            content: `What is the context around this: ${message}`
          }
        ],
        tools: [{ type: "live_search" }],
        tool_choice: "auto"
      })
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error("Grok request failed: %s", text);
      throw new Error(`Grok request failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("Grok response was empty.");
    }

    return content;
  }
}
