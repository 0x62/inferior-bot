import type { Logger } from "winston";
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

  constructor(config: BotConfig, logger: Logger) {
    this.apiKey = config.llm.apiKey;
    this.model = config.llm.model;
    this.baseUrl = config.llm.baseUrl;
    this.logger = logger;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async complete(prompt: LlmPrompt): Promise<string> {
    if (!this.apiKey) {
      throw new Error("LLM API key is not configured.");
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.4,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user }
        ]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error("LLM request failed: %s", text);
      throw new Error(`LLM request failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("LLM response was empty.");
    }

    return content;
  }
}
