import "dotenv/config";
import { Client, GatewayIntentBits, Partials, REST, Routes } from "discord.js";
import { config, validateConfig } from "./config.js";
import { Logger } from "./logging/Logger.js";
import { createDb } from "./db/index.js";
import { CommandRegistry } from "./commands/registry/CommandRegistry.js";
import { SlowModeService } from "./services/SlowModeService.js";
import { ReminderService } from "./services/ReminderService.js";
import { WikipediaService } from "./services/WikipediaService.js";
import { LlmClient } from "./services/LlmClient.js";
import { AiBanService } from "./services/AiBanService.js";
import { CooldownRegistry } from "./utils/cooldown.js";
import { SlowUserCommand } from "./commands/slash/SlowUserCommand.js";
import { UnslowUserCommand } from "./commands/slash/UnslowUserCommand.js";
import { AiBanCommand } from "./commands/slash/AiBanCommand.js";
import { AiUnbanCommand } from "./commands/slash/AiUnbanCommand.js";
import { LogErrorsCommand } from "./commands/slash/LogErrorsCommand.js";
import { StatsCommand } from "./commands/slash/StatsCommand.js";
import { HelpCommand } from "./commands/slash/HelpCommand.js";
import { ModHelpCommand } from "./commands/slash/ModHelpCommand.js";
import { AnswerCommand } from "./commands/message/AnswerCommand.js";
import { AnswerDefinitiveCommand } from "./commands/message/AnswerDefinitiveCommand.js";
import { QuestionCommand } from "./commands/message/QuestionCommand.js";
import { WikiCommand } from "./commands/message/WikiCommand.js";
import { RemindMeCommand } from "./commands/message/RemindMeCommand.js";
import { AcronymCommand } from "./commands/message/AcronymCommand.js";

const logger = Logger.init(config.logLevel);
validateConfig();

const db = createDb(config.databasePath);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

const registry = new CommandRegistry();
const slowModeService = new SlowModeService(db, logger);
const reminderService = new ReminderService(db, logger, client);
const aiBanService = new AiBanService(db);
const wikipediaService = new WikipediaService();
const llmClient = new LlmClient(config, logger);
const llmCooldown = new CooldownRegistry(120);
const startedAt = Date.now();
const allowedGuildIds = new Set(config.guildIds);
const isGuildAllowed = (guildId?: string | null): boolean => {
  if (!guildId) return true;
  if (allowedGuildIds.size === 0) return true;
  return allowedGuildIds.has(guildId);
};

registry.registerSlash(
  new SlowUserCommand(slowModeService, {
    allowedRoleIds: config.moderatorRoleIds,
  }),
);
registry.registerSlash(
  new UnslowUserCommand(slowModeService, {
    allowedRoleIds: config.moderatorRoleIds,
  }),
);
registry.registerSlash(
  new AiBanCommand(aiBanService, {
    allowedRoleIds: config.moderatorRoleIds,
  }),
);
registry.registerSlash(
  new AiUnbanCommand(aiBanService, {
    allowedRoleIds: config.moderatorRoleIds,
  }),
);
registry.registerSlash(
  new LogErrorsCommand({
    allowedRoleIds: config.moderatorRoleIds,
  }),
);
registry.registerSlash(new StatsCommand(startedAt));
registry.registerSlash(
  new HelpCommand([
    {
      title: "Slash Commands",
      entries: [
        { name: "/help", description: "Show available commands." },
        { name: "/stats", description: "Show bot stats and reminder count." },
      ],
    },
    {
      title: "Message Commands",
      entries: [
        { name: "answer", description: "Reply to a message with `answer` to get an LLM response." },
        { name: "answer_definitive", description: "Reply with a terse, definitive LLM response." },
        { name: "acronym", description: "Reply to a message to expand acronyms via LLM." },
        { name: "question", description: "Post the 'don't ask to ask' link." },
        { name: "wiki <query>", description: "Search Wikipedia and respond with the top result." },
        { name: "remind me <time>", description: "Schedule a reminder using natural language." },
      ],
    },
  ]),
);
registry.registerSlash(
  new ModHelpCommand(
    [
      { name: "/modhelp", description: "Show moderator-only commands." },
      { name: "/slowuser", description: "Apply per-user slow mode restrictions." },
      { name: "/unslowuser", description: "Remove per-user slow mode restrictions." },
      { name: "/aiban", description: "Block a user from LLM commands." },
      { name: "/aiunban", description: "Unblock a user from LLM commands." },
      { name: "/log", description: "Show recent error logs." },
    ],
    { allowedRoleIds: config.moderatorRoleIds },
  ),
);

registry.registerMessage(
  new AnswerCommand(llmClient, aiBanService, { cooldownRegistry: llmCooldown }),
);
registry.registerMessage(
  new AnswerDefinitiveCommand(llmClient, aiBanService, { cooldownRegistry: llmCooldown }),
);
registry.registerMessage(new QuestionCommand());
registry.registerMessage(new WikiCommand(wikipediaService));
registry.registerMessage(new RemindMeCommand(reminderService));
registry.registerMessage(
  new AcronymCommand(llmClient, aiBanService, { cooldownRegistry: llmCooldown }),
);

client.once("clientReady", async () => {
  logger.info("Logged in as %s", client.user?.tag ?? "unknown");
  reminderService.start();

  try {
    const rest = new REST({ version: "10" }).setToken(config.token);
    const body = registry.listSlashCommands().map((command) => command.build().toJSON());
    if (allowedGuildIds.size > 0) {
      for (const guildId of allowedGuildIds) {
        await rest.put(Routes.applicationGuildCommands(config.clientId, guildId), {
          body,
        });
        logger.info("Registered guild slash commands for %s", guildId);
      }
    } else {
      await rest.put(Routes.applicationCommands(config.clientId), { body });
      logger.info("Registered global slash commands");
    }
  } catch (error) {
    logger.error("Failed to register slash commands: %s", String(error));
  }

  if (allowedGuildIds.size > 0) {
    await client.guilds.fetch();
    for (const guild of client.guilds.cache.values()) {
      if (!allowedGuildIds.has(guild.id)) {
        logger.warn("Leaving unapproved guild %s (%s)", guild.name, guild.id);
        await guild.leave().catch((error) => {
          logger.warn("Failed to leave guild %s: %s", guild.id, String(error));
        });
      }
    }
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (!isGuildAllowed(interaction.guildId)) {
    logger.warn(
      "Ignored command from unapproved guild %s by %s",
      interaction.guildId ?? "unknown",
      interaction.user.id,
    );
    return;
  }
  await registry.handleSlash(interaction, {
    client,
    logger,
    config,
    db,
  });
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!isGuildAllowed(message.guildId)) return;

  const blocked = await slowModeService.handleMessage(message);
  if (blocked) return;

  await registry.handleMessage(message, {
    client,
    logger,
    config,
    db,
  });
});

client.login(config.token).catch((error) => {
  logger.error("Failed to login: %s", String(error));
  if (typeof process !== "undefined" && typeof process.exit === "function") {
    process.exit(1);
  }
});
