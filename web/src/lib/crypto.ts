import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const keyHex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!keyHex) throw new Error('TOKEN_ENCRYPTION_KEY is not set');
  return Buffer.from(keyHex, 'hex');
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${Buffer.concat([ciphertext, tag]).toString('hex')}`;
}

export async function decrypt(encrypted: string): Promise<string> {
  const key = getKey();
  const [ivHex, ciphertextAndTagHex] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const ciphertextAndTag = Buffer.from(ciphertextAndTagHex, 'hex');
  const tag = ciphertextAndTag.slice(-16);
  const ciphertext = ciphertextAndTag.slice(0, -16);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
