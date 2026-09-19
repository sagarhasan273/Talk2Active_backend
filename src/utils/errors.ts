import logger from "./logger";

export class DatabaseError extends Error {
    public readonly originalError: Error;

    constructor(
        error: unknown,
        public readonly context?: string
    ) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        const message = context
            ? `DatabaseError in ${context}: ${normalizedError.message}`
            : normalizedError.message;

        super(message);
        this.name = 'DatabaseError';
        this.originalError = normalizedError;

        Object.setPrototypeOf(this, DatabaseError.prototype);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, DatabaseError);
        }

        logger.error(`[${this.name}] ${message}`, {
            context: this.context,
            originalError: {
                message: normalizedError.message,
                stack: normalizedError.stack,
            },
            stack: this.stack,
        });
    }
}

export class AppError extends Error {
    statusCode: number;
    at: string;

    constructor(message: string, statusCode = 500, at: string) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.at = at;

        Object.setPrototypeOf(this, AppError.prototype);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }

        logger.error(`[${this.name}] ${message}`, {
            statusCode: this.statusCode,
            at: this.at,
            stack: this.stack,
        });
    }
}