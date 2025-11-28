/**
 * Production-safe logger utility
 * Only logs in development mode unless explicitly overridden
 */

const isDev = process.env.NODE_ENV === 'development';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
    enabledInProd?: boolean;
    prefix?: string;
}

function createLogger(config: LoggerConfig = {}) {
    const { enabledInProd = false, prefix = '[DEMO]' } = config;

    const shouldLog = (level: LogLevel): boolean => {
        // Always log errors
        if (level === 'error') return true;
        // Always log warnings
        if (level === 'warn') return true;
        // Debug/info only in dev or if explicitly enabled
        return isDev || enabledInProd;
    };

    return {
        debug: (...args: unknown[]) => {
            if (shouldLog('debug')) {
                console.debug(prefix, ...args);
            }
        },
        info: (...args: unknown[]) => {
            if (shouldLog('info')) {
                console.info(prefix, ...args);
            }
        },
        warn: (...args: unknown[]) => {
            if (shouldLog('warn')) {
                console.warn(prefix, ...args);
            }
        },
        error: (...args: unknown[]) => {
            if (shouldLog('error')) {
                console.error(prefix, ...args);
            }
        },
    };
}

export const logger = createLogger();

/**
 * Helper to extract error message safely
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message: unknown }).message);
    }
    return 'An unknown error occurred';
}
