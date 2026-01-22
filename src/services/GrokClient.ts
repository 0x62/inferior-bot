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

    const response = await fetch(`${this.baseUrl}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.3,
        input: [
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
        tools: [{ type: "web_search" }],
        tool_choice: "auto"
      })
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error("Grok request failed: %s", text);
      throw new Error(`Grok request failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
      output_text?: string;
      output?: {
        type?: string;
        role?: string;
        content?: { type?: string; text?: string }[] | string;
      }[];
    };

    let content = data.output_text?.trim() ?? "";
    if (!content && Array.isArray(data.output)) {
      const textChunks: string[] = [];
      for (const output of data.output) {
        if (output?.type && output.type !== "message") continue;
        const contentField = output?.content;
        if (typeof contentField === "string") {
          textChunks.push(contentField);
          continue;
        }
        if (Array.isArray(contentField)) {
          for (const entry of contentField) {
            if (!entry) continue;
            if (entry.type && entry.type !== "output_text" && entry.type !== "text") {
              continue;
            }
            if (entry.text) textChunks.push(entry.text);
          }
        }
      }
      content = textChunks.join("").trim();
    }
    if (!content) {
      throw new Error("Grok response was empty.");
    }

    return content;
  }
}
