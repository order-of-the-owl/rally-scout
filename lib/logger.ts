import { getLogLevel, LogLevel } from '@/lib/config/env';

type LogFields = Readonly<Record<string, unknown>>;

export interface Logger {
  debug(event: string, fields?: LogFields): void;
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
}

interface LoggerOptions {
  minLevel: LogLevel;
  write?: (line: string) => void;
  now?: () => Date;
}

const LEVEL_PRIORITY = {
  [LogLevel.Debug]: 0,
  [LogLevel.Info]: 1,
  [LogLevel.Warn]: 2,
  [LogLevel.Error]: 3,
} as const satisfies Record<LogLevel, number>;

const REDACTED = '[REDACTED]';
const CIRCULAR = '[Circular]';
const SENSITIVE_KEY = /token|secret|password|api_?key|authorization|cookie|database_?url/i;

function serializeError(error: Error, ancestors: Set<object>): Record<string, unknown> {
  const serialized: Record<string, unknown> = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
  if (error.cause !== undefined) {
    serialized.cause = toLoggable(error.cause, ancestors);
  }
  return serialized;
}

function toLoggableRecord(record: object, ancestors: Set<object>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).map(([key, item]: [string, unknown]) => [
      key,
      SENSITIVE_KEY.test(key) ? REDACTED : toLoggable(item, ancestors),
    ]),
  );
}

function toLoggable(value: unknown, ancestors: Set<object>): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (ancestors.has(value)) {
    return CIRCULAR;
  }

  ancestors.add(value);
  let loggable: unknown;
  if (value instanceof Error) {
    loggable = serializeError(value, ancestors);
  } else if (Array.isArray(value)) {
    loggable = value.map((item: unknown) => toLoggable(item, ancestors));
  } else {
    loggable = toLoggableRecord(value, ancestors);
  }
  ancestors.delete(value);
  return loggable;
}

function formatLine(level: LogLevel, event: string, fields: LogFields, timestamp: Date): string {
  const reserved = { timestamp: timestamp.toISOString(), level, event };
  try {
    return JSON.stringify({ ...toLoggableRecord(fields, new Set([fields])), ...reserved });
  } catch {
    return JSON.stringify({ ...reserved, fieldsDropped: true });
  }
}

function writeToStdout(line: string): void {
  console.log(line);
}

export function createLogger({ minLevel, write = writeToStdout, now = () => new Date() }: LoggerOptions): Logger {
  const log = (level: LogLevel, event: string, fields: LogFields = {}): void => {
    if (LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[minLevel]) {
      write(formatLine(level, event, fields, now()));
    }
  };

  return {
    debug: (event, fields) => {
      log(LogLevel.Debug, event, fields);
    },
    info: (event, fields) => {
      log(LogLevel.Info, event, fields);
    },
    warn: (event, fields) => {
      log(LogLevel.Warn, event, fields);
    },
    error: (event, fields) => {
      log(LogLevel.Error, event, fields);
    },
  };
}

export const logger = createLogger({ minLevel: getLogLevel() });
