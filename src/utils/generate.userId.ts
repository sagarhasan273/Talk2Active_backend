import { randomBytes } from 'node:crypto';

export function generateUserId(prefix = 'USR'): string {
  const random = randomBytes(5).toString('hex').toUpperCase();

  return `${prefix}${random}`;
}