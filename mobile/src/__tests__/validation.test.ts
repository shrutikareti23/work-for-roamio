import { isValidCode, isValidEmail, normalizeEmail, passwordProblem } from '@/lib/validation';

describe('email', () => {
  it.each(['a@b.co', ' Shrutika@Example.COM ', 'first.last+trips@mail.example.org'])(
    'accepts %s',
    (e) => expect(isValidEmail(e)).toBe(true),
  );
  it.each(['', 'nope', 'a@b', 'a b@c.com', '@example.com'])('rejects %s', (e) =>
    expect(isValidEmail(e)).toBe(false),
  );
  it('normalizes case and spaces', () => {
    expect(normalizeEmail('  Me@Example.COM ')).toBe('me@example.com');
  });
});

describe('password', () => {
  it.each([
    ['short1', 'Use at least 8 characters.'],
    ['onlyletters', 'Use at least one letter and one number.'],
    ['12345678', 'Use at least one letter and one number.'],
    ['a1'.repeat(40), 'That password is too long.'],
  ])('%s -> %s', (pw, msg) => expect(passwordProblem(pw)).toBe(msg));
  it('accepts a reasonable password', () => expect(passwordProblem('lisbon2026')).toBeNull());
});

describe('codes', () => {
  it('accepts 6–10 digits only', () => {
    expect(isValidCode('123456')).toBe(true);
    expect(isValidCode(' 12345678 ')).toBe(true);
    expect(isValidCode('12345')).toBe(false);
    expect(isValidCode('12a456')).toBe(false);
  });
});
