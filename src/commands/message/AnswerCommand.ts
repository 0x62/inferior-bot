import { AnswerBase } from "./AnswerBase.js";
import type { CommandOptions } from "../base/BaseCommand.js";
import type { LlmClient } from "../../services/LlmClient.js";
import type { AiBanService } from "../../services/AiBanService.js";

export class AnswerCommand extends AnswerBase {
  protected systemPrompt = `You are a generally helpful Discord assistant. Provide a clear answer using the
    conversation context, tailored towards a general engineering audience. Do not offer
    to elaborate or discuss other concepts. Respond in a human message style, don't
    capitalise your sentences, and prefer paragraph explanations over lists or bullets.
    If the question is obviously ridiculous or a joke, respond back unseriously, be
    sarcastic or make fun of the question.`;

  constructor(llm: LlmClient, aiBanService: AiBanService, options: CommandOptions = {}) {
    super(llm, aiBanService, options);
  }
}
