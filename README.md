# Harare Discord Bot

Harare is a moderation + utility Discord bot built with TypeScript and discord.js. It is a shameless imitation of QualityBot from the Engineering Students Discord, and it is still under active development.

## Setup

Requirements:
- Node.js 20+
- pnpm

Install dependencies:
```bash
pnpm install
```

Create a `.env` file with the required variables:
```
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_IDS=            # comma-separated allowlist
MODERATOR_ROLE_IDS=           # comma-separated role IDs
DATABASE_PATH=./data/bot.db
LOG_LEVEL=info
OPENAI_API_KEY=
LLM_MODEL=gpt-4o-mini
LLM_BASE_URL=https://api.openai.com/v1
XAI_API_KEY=
XAI_MODEL=grok-4-fast
XAI_BASE_URL=https://api.x.ai/v1
```

Run locally:
```bash
pnpm run dev
```

Typecheck:
```bash
pnpm run typecheck
```

## Public commands

Slash commands:
- `/help` — show available commands
- `/stats` — uptime + reminder count

Message commands:
- `answer` — reply to a message to get an LLM answer
- `answer_definitive` — same, but concise and definitive
- `acronym` — expand acronyms from the replied message
- `context` — explain a replied message using Grok web search
- `question` — posts https://dontasktoask.com
- `wiki <query>` — top Wikipedia result in an embed
- `remind me <time>` — natural language reminders

## Moderator commands

Slash commands:
- `/modhelp` — moderator help
- `/slowuser` — per-user slow mode
- `/unslowuser` — remove slow mode
- `/aiban` — block a user from LLM commands
- `/aiunban` — unblock a user from LLM commands
- `/log` — recent error logs
- `/cooldownset` — set per-user cooldown override
- `/cooldownclear` — clear per-user cooldown override
- `/reply` — reply as the bot to a specific message

## License

MIT
