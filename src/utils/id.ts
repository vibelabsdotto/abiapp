// Random RFC 4122 version 4 UUIDs without a native dependency.
// Uses crypto.getRandomValues when the runtime provides it (Hermes with the
// Expo winter runtime does), otherwise Math.random. IDs only need to be
// unique on one device, so the fallback is acceptable.

type RandomSource = { getRandomValues?: (array: Uint8Array) => Uint8Array };

const fillRandom = (bytes: Uint8Array): void => {
  const source = (globalThis as { crypto?: RandomSource }).crypto;
  if (source?.getRandomValues) {
    source.getRandomValues(bytes);
    return;
  }
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }
};

const HEX = Array.from({ length: 256 }, (_, value) =>
  value.toString(16).padStart(2, "0"),
);

export function createId(): string {
  const bytes = new Uint8Array(16);
  fillRandom(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (byte) => HEX[byte]);
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Replaces every id from createId in `text` with "[id]". */
export const redactIds = (text: string): string =>
  text.replace(UUID_PATTERN, "[id]");
