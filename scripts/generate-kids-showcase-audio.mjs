import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Buffer } from "node:buffer";
import { stdout } from "node:process";

const sampleRate = 22050;
const output = resolve("packages/remotion-runtime/public/audio/kids-showcase");

const makeTrack = (duration) => ({
  left: new Float32Array(Math.ceil(duration * sampleRate)),
  right: new Float32Array(Math.ceil(duration * sampleRate)),
});

const envelope = (time, duration, attack = 0.02, release = 0.16) =>
  Math.min(1, time / attack, (duration - time) / release);

const tone = (
  track,
  { start = 0, duration, frequency, gain, pan = 0, glide = 0, harmonic = 0 },
) => {
  const begin = Math.floor(start * sampleRate);
  const end = Math.min(
    track.left.length,
    begin + Math.floor(duration * sampleRate),
  );
  for (let index = begin; index < end; index += 1) {
    const time = (index - begin) / sampleRate;
    const phase = Math.PI * 2 * (frequency * time + glide * time * time * 0.5);
    const value =
      (Math.sin(phase) + harmonic * Math.sin(phase * 2.01)) *
      gain *
      Math.max(0, envelope(time, duration));
    track.left[index] += value * Math.sqrt((1 - pan) / 2);
    track.right[index] += value * Math.sqrt((1 + pan) / 2);
  }
};

let seed = 0x57a9e;
const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0xffffffff;
};

const noise = (track, { start = 0, duration, gain, pan = 0, color = 0.82 }) => {
  const begin = Math.floor(start * sampleRate);
  const end = Math.min(
    track.left.length,
    begin + Math.floor(duration * sampleRate),
  );
  let previous = 0;
  for (let index = begin; index < end; index += 1) {
    const time = (index - begin) / sampleRate;
    const white = random() * 2 - 1;
    previous = previous * color + white * (1 - color);
    const value =
      previous *
      gain *
      Math.max(0, envelope(time, duration, 0.005, duration * 0.72));
    track.left[index] += value * Math.sqrt((1 - pan) / 2);
    track.right[index] += value * Math.sqrt((1 + pan) / 2);
  }
};

const normalize = (track, ceiling = 0.88) => {
  let peak = 0;
  for (let index = 0; index < track.left.length; index += 1)
    peak = Math.max(
      peak,
      Math.abs(track.left[index]),
      Math.abs(track.right[index]),
    );
  const scale = peak > ceiling ? ceiling / peak : 1;
  for (let index = 0; index < track.left.length; index += 1) {
    track.left[index] *= scale;
    track.right[index] *= scale;
  }
};

const wav = (track) => {
  normalize(track);
  const dataBytes = track.left.length * 4;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(2, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 4, 28);
  buffer.writeUInt16LE(4, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataBytes, 40);
  for (let index = 0; index < track.left.length; index += 1) {
    buffer.writeInt16LE(
      Math.max(-32767, Math.min(32767, Math.round(track.left[index] * 32767))),
      44 + index * 4,
    );
    buffer.writeInt16LE(
      Math.max(-32767, Math.min(32767, Math.round(track.right[index] * 32767))),
      46 + index * 4,
    );
  }
  return buffer;
};

const save = async (name, track) =>
  writeFile(resolve(output, `${name}.wav`), wav(track));

await mkdir(output, { recursive: true });

const music = makeTrack(30);
const chords = [
  [196, 246.94, 293.66],
  [174.61, 220, 261.63],
  [146.83, 196, 246.94],
  [164.81, 207.65, 261.63],
];
for (let bar = 0; bar < 10; bar += 1) {
  const chord = chords[bar % chords.length];
  chord.forEach((frequency, index) =>
    tone(music, {
      start: bar * 3,
      duration: 3.15,
      frequency,
      gain: 0.052,
      pan: (index - 1) * 0.34,
      harmonic: 0.17,
    }),
  );
  tone(music, {
    start: bar * 3 + 0.06,
    duration: 1.1,
    frequency: chord[2] * 2,
    gain: 0.026,
    pan: bar % 2 ? -0.45 : 0.45,
    harmonic: 0.28,
  });
}
await save("music-bed", music);

const footstep = makeTrack(0.22);
noise(footstep, { duration: 0.18, gain: 0.85, color: 0.91 });
tone(footstep, { duration: 0.16, frequency: 72, glide: -180, gain: 0.52 });
await save("footstep", footstep);

const rustle = makeTrack(0.6);
noise(rustle, { duration: 0.56, gain: 0.72, pan: -0.25, color: 0.72 });
noise(rustle, {
  start: 0.12,
  duration: 0.42,
  gain: 0.48,
  pan: 0.4,
  color: 0.86,
});
await save("rustle", rustle);

const chime = makeTrack(0.9);
[880, 1318.51, 1760].forEach((frequency, index) =>
  tone(chime, {
    start: index * 0.045,
    duration: 0.8 - index * 0.08,
    frequency,
    gain: 0.2 / (index + 1),
    pan: index % 2 ? 0.35 : -0.3,
    harmonic: 0.2,
  }),
);
await save("moth-chime", chime);

const wake = makeTrack(1.25);
tone(wake, {
  duration: 1.2,
  frequency: 64,
  glide: 48,
  gain: 0.34,
  harmonic: 0.4,
});
noise(wake, { start: 0.08, duration: 1.08, gain: 0.32, color: 0.94 });
await save("wake", wake);

const sneeze = makeTrack(1.05);
noise(sneeze, { duration: 0.92, gain: 0.95, color: 0.78 });
tone(sneeze, {
  start: 0.02,
  duration: 0.74,
  frequency: 150,
  glide: -125,
  gain: 0.58,
  harmonic: 0.35,
});
await save("sneeze", sneeze);

const spark = makeTrack(1.0);
for (let index = 0; index < 10; index += 1)
  tone(spark, {
    start: index * 0.055,
    duration: 0.42,
    frequency: 920 + index * 117,
    gain: 0.105,
    pan: -0.9 + index * 0.2,
    harmonic: 0.32,
  });
await save("spark", spark);

const resolveTrack = makeTrack(1.8);
[392, 493.88, 587.33, 783.99].forEach((frequency, index) =>
  tone(resolveTrack, {
    start: index * 0.13,
    duration: 1.45,
    frequency,
    gain: 0.17,
    pan: -0.45 + index * 0.3,
    harmonic: 0.18,
  }),
);
await save("resolve", resolveTrack);

stdout.write(
  `Generated deterministic Kids showcase guide audio in ${output}\n`,
);
