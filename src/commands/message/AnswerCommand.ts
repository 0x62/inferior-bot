import { AnswerBase } from "./AnswerBase.js";
import type { CommandOptions } from "../base/BaseCommand.js";
import type { LlmClient } from "../../services/LlmClient.js";
import type { AiBanService } from "../../services/AiBanService.js";

export class AnswerCommand extends AnswerBase {
  protected systemPrompt =
    "You are a helpful assistant. Provide a clear answer using the conversation context.";

  constructor(llm: LlmClient, aiBanService: AiBanService, options: CommandOptions = {}) {
    super(llm, aiBanService, options);
  }
}
