/**
 * Password strength scorer (Phase 2b) — Bun-native, no npm deps.
 *
 * Score 0–4 from length, character-class variety, repeat/sequence penalties,
 * and a minimal embedded common-password blocklist (not a full breach corpus).
 */

export interface PasswordStrengthResult {
  score: number;
  ok: boolean;
  feedback: string[];
}

/** Minimal top-100-style blocklist — clearly not exhaustive. */
const COMMON_PASSWORDS = new Set(
  [
    'password',
    '123456',
    '123456789',
    '12345678',
    '12345',
    '1234567',
    'password1',
    '123123',
    'qwerty',
    'abc123',
    '111111',
    '1234567890',
    'admin',
    'letmein',
    'welcome',
    'monkey',
    'dragon',
    'master',
    'login',
    'princess',
    'football',
    'shadow',
    'sunshine',
    'iloveyou',
    'trustno1',
    '000000',
    '654321',
    'superman',
    'qazwsx',
    'michael',
    'mustang',
    'password123',
    'batman',
    'passw0rd',
    'hello',
    'charlie',
    'donald',
    'starwars',
    'freedom',
    'whatever',
    'baseball',
    'access',
    '696969',
    'jordan',
    'harley',
    'ranger',
    'buster',
    'thomas',
    'tigger',
    'robert',
    'soccer',
    'hockey',
    'killer',
    'george',
    'andrew',
    'joshua',
    'matthew',
    'summer',
    'pepper',
    'jessica',
    'amanda',
    'nicole',
    'daniel',
    'liverpool',
    'chelsea',
    'arsenal',
    'blink182',
    'corvette',
    'mercedes',
    'ferrari',
    'porsche',
    'nintendo',
    'playstation',
    'microsoft',
    'google',
    'apple',
    'samsung',
    'changeme',
    'secret',
    'test',
    'guest',
    'root',
    'toor',
    'pass',
    'pw',
    'asdfgh',
    'zxcvbn',
    '1q2w3e4r',
    '1qaz2wsx',
    'qwe123',
    'aa123456',
    '00000000',
    '121212',
    '1234',
    '123321',
    '666666',
    '888888',
    '999999',
    '112233',
    '987654321',
    '555555',
    '7777777',
    '159753',
    '147258',
    '789456',
    '456789',
    '987654',
    '852456',
    '741852',
    '963852',
    '159357',
    '753951',
    '246810',
    '135790',
    '102030',
    '112358',
    '314159',
    '271828',
    'password!',
    'Password1',
    'Password123',
    'Qwerty123',
    'Admin123',
    'Welcome1',
    'Letmein1',
    'Summer2024',
    'Winter2024',
    'Spring2024',
    'Fall2024',
    'P@ssw0rd',
    'P@ssword',
    'Passw0rd!',
    'Qwertyuiop',
    'Asdfghjkl',
    'Zxcvbnm',
  ].map(s => s.toLowerCase())
);

const SEQUENCE_RE =
  /0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|defg|efgh|fghi|ghij|qwerty|asdfgh|zxcvbn|password/i;

export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push('Use at least 8 characters');
  if (password.length >= 12) score++;

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const classes = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  if (classes >= 3) score++;
  else feedback.push('Mix uppercase, lowercase, numbers, and symbols');
  if (classes >= 4 && password.length >= 10) score++;

  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(0, score - 1);
    feedback.push('Avoid repeated characters');
  }
  if (SEQUENCE_RE.test(password)) {
    score = Math.max(0, score - 1);
    feedback.push('Avoid common sequences');
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    score = 0;
    feedback.push('Password is too common');
  }

  const words = password.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 4 && password.length >= 20 && score < 3) {
    score = 3;
    feedback.length = 0;
  }

  score = Math.min(4, Math.max(0, score));
  return { score, ok: score >= 3, feedback };
}
