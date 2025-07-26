export class DatabaseError extends Error {
    constructor(
        public readonly originalError: Error,
        public readonly context?: string
    ) {
        const message = `DatabaseError: ${context ? `in ${context}` : `${originalError.message}`}`;
        const status = false
        super(message);
        this.name = 'DatabaseError';
    }
}

export class AppError extends Error {
    statusCode: number;

    constructor(
        message: string, statusCode = 500
    ) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AppError';
    }
}