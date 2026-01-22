import type { Client } from "discord.js";
import type { Logger } from "winston";
import type { BotConfig } from "../../config.js";
import type { DatabaseClient } from "../../db/index.js";

export type CommandContext = {
  client: Client;
  logger: Logger;
  config: BotConfig;
  db: DatabaseClient;
};
