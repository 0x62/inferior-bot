export class LoggableError extends Error {
  readonly cause?: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = new.target.name;
    this.cause = options?.cause;
  }
}

export class CommandError extends LoggableError {}
export class MessageError extends LoggableError {}
export class ServiceError extends LoggableError {}
