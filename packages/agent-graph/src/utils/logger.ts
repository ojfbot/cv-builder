import pino from "pino";

/**
 * Create logger instance with pretty printing in development
 */
export function getLogger(name: string) {
  return pino({
    name,
    level: process.env.LOG_LEVEL || "info",
    transport:
      process.env.NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss",
              ignore: "pid,hostname"
            }
          }
        : undefined
  });
}
