import type { Message } from "discord.js";

export type MessageContext = {
  previousMessages: Message[];
  replyChain: Message[];
};

export type MessageContextOptions = {
  historyDepth?: number;
  replyDepth?: number;
};

export const buildMessageContext = async (
  message: Message,
  options: MessageContextOptions = {}
): Promise<MessageContext> => {
  const historyDepth = options.historyDepth ?? 5;
  const replyDepth = options.replyDepth ?? 5;

  const previousMessages: Message[] = [];
  if (message.channel?.isTextBased()) {
    const fetched = await message.channel.messages.fetch({
      limit: historyDepth,
      before: message.id
    });
    previousMessages.push(...Array.from(fetched.values()).reverse());
  }

  const replyChain: Message[] = [];
  if (message.channel?.isTextBased()) {
    let currentId = message.reference?.messageId ?? null;
    while (currentId && replyChain.length < replyDepth) {
      const fetched = await message.channel.messages
        .fetch(currentId)
        .catch(() => null);
      if (!fetched) break;
      replyChain.push(fetched);
      currentId = fetched.reference?.messageId ?? null;
    }
  }

  return { previousMessages, replyChain };
};
