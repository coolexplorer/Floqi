import { encrypt, decrypt } from '@/lib/crypto';

describe('crypto.ts — AES-256-GCM encryption', () => {
  const originalKey = process.env.TOKEN_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = '0'.repeat(64); // 32 bytes hex
  });

  afterEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = originalKey;
  });

  it('roundtrip: encrypt → decrypt returns original plaintext', async () => {
    const plaintext = 'my-secret-token';
    const encrypted = await encrypt(plaintext);
    const decrypted = await decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('non-deterministic: same plaintext produces different ciphertext each time', async () => {
    const plaintext = 'my-secret-token';
    const encrypted1 = await encrypt(plaintext);
    const encrypted2 = await encrypt(plaintext);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('tampered ciphertext: decrypt throws on integrity failure', async () => {
    const plaintext = 'my-secret-token';
    const encrypted = await encrypt(plaintext);
    const [ivHex, ciphertextAndTagHex] = encrypted.split(':');
    // Flip the first byte of the ciphertext+tag portion
    const tampered = ciphertextAndTagHex.replace(/^../, 'ff');
    const tamperedEncrypted = `${ivHex}:${tampered}`;
    await expect(decrypt(tamperedEncrypted)).rejects.toThrow();
  });

  it('wrong key: decrypt throws when key does not match', async () => {
    const plaintext = 'my-secret-token';
    const encrypted = await encrypt(plaintext);
    // Change key to a different value before decrypting
    process.env.TOKEN_ENCRYPTION_KEY = 'f'.repeat(64); // different 32-byte key
    await expect(decrypt(encrypted)).rejects.toThrow();
  });

  it('missing TOKEN_ENCRYPTION_KEY: encrypt throws meaningful error', async () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    await expect(encrypt('any-plaintext')).rejects.toThrow('TOKEN_ENCRYPTION_KEY is not set');
  });
});
