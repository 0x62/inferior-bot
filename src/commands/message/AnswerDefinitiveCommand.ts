import { AnswerBase } from "./AnswerBase.js";
import type { CommandOptions } from "../base/BaseCommand.js";
import type { LlmClient } from "../../services/LlmClient.js";
import type { AiBanService } from "../../services/AiBanService.js";

export class AnswerDefinitiveCommand extends AnswerBase {
  protected systemPrompt =
    "You are a concise assistant. Provide a short, specific answer without nuance.";

  constructor(llm: LlmClient, aiBanService: AiBanService, options: CommandOptions = {}) {
    super(llm, aiBanService, options);
  }
}
