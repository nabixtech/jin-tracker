// WebAuthn Utility for Local Device Authentication

const CREDENTIAL_ID_KEY = 'family_bill_webauthn_id';

// Helper to generate a random 32-byte challenge
function generateChallenge(): ArrayBuffer {
  return crypto.getRandomValues(new Uint8Array(32)).buffer;
}

// Helper to encode ArrayBuffer to base64url string
function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Helper to decode base64url string to ArrayBuffer
function base64urlToBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const str = atob(base64);
  const buffer = new ArrayBuffer(str.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return buffer;
}

/**
 * Checks if the user has a registered WebAuthn passkey in localStorage.
 */
export function hasBiometricsRegistered(): boolean {
  return !!localStorage.getItem(CREDENTIAL_ID_KEY);
}

/**
 * Prompts the device OS (Windows Hello, FaceID, TouchID, PIN) to register a new local passkey.
 */
export async function registerBiometrics(): Promise<boolean> {
  // In a local-only app, we only care about the OS verifying the user.
  // We use dummy challenge/rp details for the WebAuthn API.
  try {
    const challenge = generateChallenge();
    const userId = crypto.getRandomValues(new Uint8Array(16)).buffer;
    
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: challenge as BufferSource,
        rp: {
          name: "Family Bill Tracker",
          // id must match the domain. 'localhost' works, but omitting it makes it use the current domain automatically.
        },
        user: {
          id: userId as BufferSource,
          name: "user@familybill",
          displayName: "Local User"
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // use device built-in authenticator
          userVerification: "required"
        },
        timeout: 60000,
        attestation: "none"
      }
    });

    if (credential && 'rawId' in credential) {
      const rawIdBase64 = bufferToBase64url(credential.rawId as ArrayBuffer);
      localStorage.setItem(CREDENTIAL_ID_KEY, rawIdBase64);
      return true;
    }
    return false;
  } catch (err) {
    console.error("Failed to register biometrics", err);
    return false;
  }
}

/**
 * Prompts the device OS to verify the previously registered passkey.
 */
export async function verifyBiometrics(): Promise<boolean> {
  try {
    const credentialIdStr = localStorage.getItem(CREDENTIAL_ID_KEY);
    if (!credentialIdStr) return false;
    
    const credentialId = base64urlToBuffer(credentialIdStr);
    const challenge = generateChallenge();
    
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challenge as BufferSource,
        allowCredentials: [{
          id: credentialId,
          type: "public-key",
          transports: ["internal"] // optional, but hints we want the platform authenticator
        }],
        userVerification: "required",
        timeout: 60000
      }
    });
    
    if (assertion) {
      return true;
    }
    return false;
  } catch (err) {
    console.error("Failed to verify biometrics", err);
    return false;
  }
}
