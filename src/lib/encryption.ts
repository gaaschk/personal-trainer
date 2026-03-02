import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

function getKey(): Buffer {
  const secret = process.env.AUTH_SECRET ?? '';
  return createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns: hex(iv):hex(authTag):hex(ciphertext)
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a string produced by encrypt().
 */
export function decrypt(encryptedStr: string): string {
  const key = getKey();
  const parts = encryptedStr.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted format');
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
}
