export class DatabaseError extends Error {
    constructor(
        public readonly originalError: Error,
        public readonly context?: string
    ) {
        const message = `${context ? `DatabaseError: in ${context}` : `${originalError.message}`}`;
        super(message);
        this.name = 'DatabaseError';
    }
}

export class AppError extends Error {
    statusCode: number;
    at: string;

    constructor(
        message: string, statusCode = 500, at: string
    ) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AppError';
        this.at = at;
    }
}