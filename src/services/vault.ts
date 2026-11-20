import type { VaultEntry } from "../types";
export async function derive(secret: string, salt: number[]) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new Uint8Array(salt),
      iterations: 600000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function seal(
  key: CryptoKey,
  text: string,
  id = crypto.randomUUID() as string,
): Promise<VaultEntry> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return {
    id,
    iv: iv.buffer,
    cipher: await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(id) },
      key,
      new TextEncoder().encode(text),
    ),
  };
}
export async function open(key: CryptoKey, row: VaultEntry) {
  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: row.iv,
        additionalData: new TextEncoder().encode(row.id),
      },
      key,
      row.cipher,
    ),
  );
}
