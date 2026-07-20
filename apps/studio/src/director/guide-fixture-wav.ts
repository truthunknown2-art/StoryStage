/**
 * Shared silent-PCM WAV writer for the explicit development/test guide-audio
 * fixture. Used by the dev-fixture playback module (sealed bytes) and the
 * dev-only Vite middleware (served bytes) so both sides agree byte-for-byte.
 */

const writeAscii = (bytes: Uint8Array, offset: number, value: string) => {
  for (let index = 0; index < value.length; index += 1)
    bytes[offset + index] = value.charCodeAt(index);
};

export const GUIDE_FIXTURE_SAMPLE_RATE = 48_000;

export function createSilentPcmWav(durationSamples: number): Uint8Array {
  const channels = 1;
  const bitsPerSample = 16;
  const sampleRate = GUIDE_FIXTURE_SAMPLE_RATE;
  const blockAlign = (channels * bitsPerSample) / 8;
  const dataBytes = durationSamples * blockAlign;
  const bytes = new Uint8Array(44 + dataBytes);
  const view = new DataView(bytes.buffer);
  writeAscii(bytes, 0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(bytes, 8, "WAVE");
  writeAscii(bytes, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(bytes, 36, "data");
  view.setUint32(40, dataBytes, true);
  return bytes;
}
