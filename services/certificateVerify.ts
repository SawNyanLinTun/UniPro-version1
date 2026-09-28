/**
 * Check a UniPro certificate signature in the browser (WebCrypto Ed25519),
 * so the verify page doesn't have to take the server's word for it.
 *
 * The server returns `signedData` exactly as it was signed, so we verify those
 * bytes directly instead of rebuilding the JSON ourselves.
 */

function base64ToBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

/**
 * Returns true/false when the browser could check the signature,
 * or null when this browser has no Ed25519 support (older browsers).
 */
export async function verifyEd25519InBrowser(
  signedData: string,
  signatureB64: string,
  publicKeyB64: string,
): Promise<boolean | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  let key: CryptoKey;
  try {
    key = await subtle.importKey('raw', base64ToBuffer(publicKeyB64), { name: 'Ed25519' }, false, ['verify']);
  } catch {
    return null; // Ed25519 not supported here
  }
  try {
    return await subtle.verify(
      { name: 'Ed25519' },
      key,
      base64ToBuffer(signatureB64),
      new TextEncoder().encode(signedData),
    );
  } catch {
    return false;
  }
}
