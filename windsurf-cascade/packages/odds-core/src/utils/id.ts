export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 8);
}

export function generateTimestampId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}
