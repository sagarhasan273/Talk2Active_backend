let dailyCounter = 0;
let lastDate: string | null = null;

export function generateUserId(prefix = 'USR'): string {
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0].replace(/-/g, '').slice(2); // YYMMDD format

  // Reset counter if it's a new day
  if (lastDate !== currentDate) {
    dailyCounter = 0;
    lastDate = currentDate;
  }

  dailyCounter++;

  const counterPart = dailyCounter.toString().padStart(4, '0'); // 4-digit counter

  return `${prefix}${currentDate}${counterPart}`;
}
