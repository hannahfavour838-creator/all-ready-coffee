import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

// scrypt parameters (OWASP-recommended minimums: N=2^17 is ideal; 2^15 keeps login < 100 ms on small instances).
const N = 32768;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 128 * N * R * 2;

function scrypt(password: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))));
}

/** Hash format: scrypt$N$r$p$saltB64$hashB64 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    // Still spend comparable time to avoid account-enumeration timing differences.
    await scrypt(password, randomBytes(16), KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
    return false;
  }
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64!, "base64");
  const key = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64!, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 128 * Number(n) * Number(r) * 2,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** A hash that can never match — used for disabled / seeded data-only accounts. */
export const UNUSABLE_PASSWORD_HASH = "disabled$";

const COMMON = new Set([
  "password", "password1", "password123", "123456789", "1234567890", "qwerty123", "iloveyou", "letmein123",
  "welcome123", "coffee123", "allready123", "abc123456", "passw0rd", "admin1234", "football1",
]);

export function passwordProblems(password: string, email?: string): string | null {
  if (password.length < 10) return "Use at least 10 characters.";
  if (password.length > 128) return "Use 128 characters or fewer.";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return "Include at least one letter and one number.";
  if (COMMON.has(password.toLowerCase())) return "That password is too common — try something more unique.";
  if (email && password.toLowerCase().includes(email.split("@")[0]!.toLowerCase()) && email.split("@")[0]!.length >= 4)
    return "Avoid using your email in your password.";
  return null;
}
