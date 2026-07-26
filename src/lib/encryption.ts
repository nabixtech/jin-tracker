import CryptoJS from 'crypto-js';

// We store the master key in localStorage.
// If it doesn't exist, we generate a random one and save it.
// This prevents casual DB dumps from being readable, though it is not secure against XSS.
const KEY_STORAGE_NAME = 'family_bill_db_key';

function getOrGenerateKey(): string {
  let key = localStorage.getItem(KEY_STORAGE_NAME);
  if (!key) {
    // Generate a random 256-bit key (32 bytes) represented as hex
    key = CryptoJS.lib.WordArray.random(32).toString();
    localStorage.setItem(KEY_STORAGE_NAME, key);
  }
  return key;
}

export function encryptString(text: string | undefined): string | undefined {
  if (!text) return text;
  const key = getOrGenerateKey();
  return CryptoJS.AES.encrypt(text, key).toString();
}

export function decryptString(ciphertext: string | undefined): string | undefined {
  if (!ciphertext) return ciphertext;
  try {
    const key = getOrGenerateKey();
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    // If decryption fails or ciphertext is malformed, originalText might be empty
    return originalText || ciphertext;
  } catch (error) {
    console.error("Failed to decrypt string:", error);
    // Return original ciphertext in case it wasn't actually encrypted (e.g. legacy data)
    return ciphertext;
  }
}
