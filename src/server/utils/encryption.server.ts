/**
 * AES-256-GCM encryption for sensitive values stored in Supabase.
 *
 * Ciphertext format: <iv_hex>:<ciphertext_hex>:<authTag_hex>
 * All parts are hex-encoded for safe storage in text columns.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';


const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM


/** Derive a 32-byte key from an arbitrary-length secret using SHA-256. */
function deriveKey(secret: string): Buffer {
  const { createHash } = require('node:crypto') as typeof import('node:crypto');
  return createHash('sha256').update(secret).digest();
}


/**
 * Encrypts a plaintext string.
 *
 * @param plaintext - Value to encrypt.
 * @param secret - Secret from ENCRYPTION_SECRET env var (min 32 chars).
 * @returns Encrypted string in format `iv:ciphertext:authTag` (hex).
 */
export function encrypt(plaintext: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${authTag.toString('hex')}`;
}


/**
 * Decrypts a ciphertext produced by `encrypt()`.
 *
 * @param ciphertext - Encrypted string in format `iv:ciphertext:authTag`.
 * @param secret - Same secret used during encryption.
 * @returns Original plaintext.
 * @throws Error if ciphertext format is invalid or decryption fails.
 */
export function decrypt(ciphertext: string, secret: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3)
    throw new Error('Invalid ciphertext format — expected iv:ciphertext:authTag');

  const [ivHex, encryptedHex, authTagHex] = parts as [string, string, string];

  const key = deriveKey(secret);
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString('utf8');
}
