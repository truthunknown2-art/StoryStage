export type PcmWavMetadata = {
  codec: "pcm-wav" | "ieee-float-wav";
  sampleRate: number;
  channels: 1 | 2;
  bitsPerSample: 16 | 24 | 32;
  dataBytes: number;
  durationInSeconds: number;
};

const ascii = (bytes: Uint8Array, offset: number, length: number) => String.fromCharCode(...bytes.subarray(offset, offset + length));

export function inspectPcmWav(bytes: Uint8Array): PcmWavMetadata {
  if (bytes.byteLength < 44 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WAVE") throw new Error("Voice recording must be a valid RIFF/WAVE file.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let format: {audioFormat: number; sampleRate: number; channels: number; bitsPerSample: number; byteRate: number; blockAlign: number} | null = null;
  let dataBytes = 0;
  let offset = 12;
  while (offset + 8 <= bytes.byteLength) {
    const chunkId = ascii(bytes, offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkSize;
    if (chunkEnd > bytes.byteLength) throw new Error("Voice WAV contains a truncated chunk.");
    if (chunkId === "fmt ") {
      if (chunkSize < 16) throw new Error("Voice WAV has an incomplete format chunk.");
      let audioFormat = view.getUint16(chunkStart, true);
      if (audioFormat === 0xfffe && chunkSize >= 40) audioFormat = view.getUint16(chunkStart + 24, true);
      format = {audioFormat, channels: view.getUint16(chunkStart + 2, true), sampleRate: view.getUint32(chunkStart + 4, true), byteRate: view.getUint32(chunkStart + 8, true), blockAlign: view.getUint16(chunkStart + 12, true), bitsPerSample: view.getUint16(chunkStart + 14, true)};
    }
    if (chunkId === "data") dataBytes += chunkSize;
    offset = chunkEnd + (chunkSize % 2);
  }
  if (!format || dataBytes === 0) throw new Error("Voice WAV must contain format and audio-data chunks.");
  if (![1, 3].includes(format.audioFormat)) throw new Error("Voice WAV must use uncompressed PCM or IEEE float samples.");
  if (![1, 2].includes(format.channels)) throw new Error("Voice WAV must be mono or stereo.");
  if (![16, 24, 32].includes(format.bitsPerSample)) throw new Error("Voice WAV must use 16, 24, or 32 bits per sample.");
  if (format.sampleRate < 8_000 || format.sampleRate > 192_000) throw new Error("Voice WAV sample rate is outside the supported 8-192 kHz range.");
  const expectedBlockAlign = format.channels * format.bitsPerSample / 8;
  if (format.blockAlign !== expectedBlockAlign || format.byteRate !== format.sampleRate * expectedBlockAlign) throw new Error("Voice WAV byte alignment does not match its declared audio format.");
  const durationInSeconds = dataBytes / format.byteRate;
  if (!Number.isFinite(durationInSeconds) || durationInSeconds <= 0 || durationInSeconds > 14_400) throw new Error("Voice WAV duration is invalid or exceeds four hours.");
  return {codec: format.audioFormat === 3 ? "ieee-float-wav" : "pcm-wav", sampleRate: format.sampleRate, channels: format.channels as 1 | 2, bitsPerSample: format.bitsPerSample as 16 | 24 | 32, dataBytes, durationInSeconds};
}
