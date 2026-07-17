import {Buffer} from "node:buffer";
import {mkdir, writeFile} from "node:fs/promises";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "packages/remotion-runtime/public/audio/paper-flip.wav");
const sampleRate = 44100;
const durationSeconds = 0.48;
const sampleCount = Math.floor(sampleRate * durationSeconds);
const bytesPerSample = 2;
const dataSize = sampleCount * bytesPerSample;
const buffer = Buffer.alloc(44 + dataSize);

buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(1, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * bytesPerSample, 28);
buffer.writeUInt16LE(bytesPerSample, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);

let seed = 1729;
for (let index = 0; index < sampleCount; index += 1) {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  const noise = seed / 0xffffffff * 2 - 1;
  const time = index / sampleRate;
  const envelope = Math.sin(Math.min(1, time / 0.025) * Math.PI * 0.5) * Math.max(0, 1 - time / durationSeconds) ** 2.8;
  const flutter = Math.sin(2 * Math.PI * (130 + time * 290) * time) * 0.25;
  const sample = Math.max(-1, Math.min(1, (noise * 0.58 + flutter) * envelope));
  buffer.writeInt16LE(Math.round(sample * 32767), 44 + index * bytesPerSample);
}

await mkdir(dirname(output), {recursive: true});
await writeFile(output, buffer);
