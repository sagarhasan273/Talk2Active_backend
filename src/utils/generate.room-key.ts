import { randomBytes } from 'node:crypto';

export function generateRoomKey(prefix = 'RM'): string {
    const random = randomBytes(5).toString('hex').toUpperCase();

    return `${prefix}${random}`;
}