import { Writable } from "node:stream";
import winston from "winston";

export type LogErrorEntry = {
  timestamp?: string;
  level?: string;
  message?: string;
  stack?: string;
  [key: string]: unknown;
};

export class Logger {
  private static instance: winston.Logger | null = null;
  private static readonly errorBuffer: LogErrorEntry[] = [];
  private static readonly maxErrors = 200;

  static init(level: string, transports?: winston.transport[]): winston.Logger {
    if (Logger.instance) return Logger.instance;
    const errorStream = new Writable({
      write(chunk, _encoding, callback) {
        try {
          const text = chunk.toString().trim();
          if (!text) return callback();
          const parsed = JSON.parse(text) as LogErrorEntry;
          Logger.errorBuffer.push(parsed);
        } catch {
          Logger.errorBuffer.push({ message: String(chunk) });
        }

        if (Logger.errorBuffer.length > Logger.maxErrors) {
          Logger.errorBuffer.splice(0, Logger.errorBuffer.length - Logger.maxErrors);
        }
        callback();
      }
    });

    const errorTransport = new winston.transports.Stream({
      stream: errorStream,
      level: "error"
    });

    const baseTransports = transports?.length
      ? [...transports]
      : [new winston.transports.Console({})];
    baseTransports.push(errorTransport);

    const logger = winston.createLogger({
      level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
      ),
      transports: baseTransports
    });
    Logger.instance = logger;
    return logger;
  }

  static get(): winston.Logger {
    if (!Logger.instance) {
      Logger.instance = Logger.init("info");
    }
    return Logger.instance;
  }

  static addTransport(transport: winston.transport): void {
    Logger.get().add(transport);
  }

  static getRecentErrors(limit = 10): LogErrorEntry[] {
    const sliceStart = Math.max(Logger.errorBuffer.length - limit, 0);
    return Logger.errorBuffer.slice(sliceStart);
  }
}
