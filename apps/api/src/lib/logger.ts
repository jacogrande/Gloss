import type { ServerEnv } from "@gloss/shared/env";

type LogLevel = ServerEnv["LOG_LEVEL"];

type LogContext = Record<string, string | number | boolean | null | undefined>;

type LogEntry = {
  context?: LogContext;
  level: LogLevel;
  message: string;
  service: "api";
  timestamp: string;
};

const logOrder: Record<LogLevel, number> = {
  debug: 10,
  error: 40,
  info: 20,
  warn: 30,
};

const shouldLog = (current: LogLevel, requested: LogLevel): boolean =>
  (logOrder[requested] ?? 0) >= (logOrder[current] ?? 0);

const writeEntry = (entry: LogEntry): void => {
  const serialized = JSON.stringify(entry);

  switch (entry.level) {
    case "debug":
    case "info":
      console.log(serialized);
      return;
    case "warn":
      console.warn(serialized);
      return;
    case "error":
      console.error(serialized);
  }
};

export type Logger = {
  debug: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
};

export const createLogger = (level: LogLevel): Logger => ({
  debug: (message, context) => {
    if (shouldLog(level, "debug")) {
      writeEntry({
        ...(context ? { context } : {}),
        level: "debug",
        message,
        service: "api",
        timestamp: new Date().toISOString(),
      });
    }
  },
  error: (message, context) => {
    if (shouldLog(level, "error")) {
      writeEntry({
        ...(context ? { context } : {}),
        level: "error",
        message,
        service: "api",
        timestamp: new Date().toISOString(),
      });
    }
  },
  info: (message, context) => {
    if (shouldLog(level, "info")) {
      writeEntry({
        ...(context ? { context } : {}),
        level: "info",
        message,
        service: "api",
        timestamp: new Date().toISOString(),
      });
    }
  },
  warn: (message, context) => {
    if (shouldLog(level, "warn")) {
      writeEntry({
        ...(context ? { context } : {}),
        level: "warn",
        message,
        service: "api",
        timestamp: new Date().toISOString(),
      });
    }
  },
});
