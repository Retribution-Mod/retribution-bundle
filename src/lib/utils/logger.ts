import { captureException } from "@lib/sentry";
import { findByNameLazy } from "@metro/wrappers";

type LoggerFunction = (...messages: any[]) => void;
export interface Logger {
    log: LoggerFunction;
    info: LoggerFunction;
    warn: LoggerFunction;
    error: LoggerFunction;
    time: LoggerFunction;
    trace: LoggerFunction;
    verbose: LoggerFunction;
}

export const LoggerClass = findByNameLazy("Logger");
export const logger: Logger = new LoggerClass("Retribution");

const originalError = logger.error;
logger.error = function (...messages: any[]) {
    const error = messages.find(m => m instanceof Error) as Error | undefined;
    if (error) captureException(error);
    return originalError.apply(this, messages);
};
