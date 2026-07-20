import { describe, expect, it } from "vitest";
import { hashCanonical } from "./canonical-hash";
import {
  assertGuideClockAbEquality,
  assertGuideVoiceClockMatchesSources,
  assertGuideVoiceTimingBasisMatchesClock,
  bindGuideVoiceClockToFrames,
  guideFrameToSample,
  guideSampleToFrame,
  guideVoiceClockSchema,
  guideVoiceTimingBasisSchema,
  hashGuideAudioBytes,
  restoreGuideVoiceClock,
  restoreGuideVoiceTimingBasis,
  sealGuideVoiceClock,
  sealGuideVoiceTimingBasis,
  serializeGuideVoiceClock,
  serializeGuideVoiceTimingBasis,
  type GuideVoiceClause,
  type GuideVoiceClockSources,
} from "./guide-voice-clock";

const writeAscii = (bytes: Uint8Array, offset: number, value: string) =>
  [...value].forEach((character, index) => {
    bytes[offset + index] = character.charCodeAt(0);
  });

const concatenateBytes = (...parts: Uint8Array[]) => {
  const bytes = new Uint8Array(
    parts.reduce((length, part) => length + part.byteLength, 0),
  );
  let offset = 0;
  parts.forEach((part) => {
    bytes.set(part, offset);
    offset += part.byteLength;
  });
  return bytes;
};

function makeWavChunk(
  chunkId: string,
  payload: Uint8Array,
  {
    includePadding = true,
    paddingByte = 0,
  }: { includePadding?: boolean; paddingByte?: number } = {},
): Uint8Array {
  const padding = payload.byteLength % 2 === 1 && includePadding ? 1 : 0;
  const chunk = new Uint8Array(8 + payload.byteLength + padding);
  const view = new DataView(chunk.buffer);
  writeAscii(chunk, 0, chunkId);
  view.setUint32(4, payload.byteLength, true);
  chunk.set(payload, 8);
  if (padding) chunk[chunk.byteLength - 1] = paddingByte;
  return chunk;
}

function makePcmFormatChunk({
  sampleRate = 48_000,
  channels = 1,
  bitsPerSample = 16,
  audioFormat = 1,
  byteRate,
  blockAlign,
}: {
  sampleRate?: number;
  channels?: 1 | 2;
  bitsPerSample?: 16 | 24 | 32;
  audioFormat?: number;
  byteRate?: number;
  blockAlign?: number;
} = {}): Uint8Array {
  const payload = new Uint8Array(16);
  const view = new DataView(payload.buffer);
  const derivedBlockAlign = (channels * bitsPerSample) / 8;
  view.setUint16(0, audioFormat, true);
  view.setUint16(2, channels, true);
  view.setUint32(4, sampleRate, true);
  view.setUint32(8, byteRate ?? sampleRate * derivedBlockAlign, true);
  view.setUint16(12, blockAlign ?? derivedBlockAlign, true);
  view.setUint16(14, bitsPerSample, true);
  return makeWavChunk("fmt ", payload);
}

function makePcmDataChunk({
  durationSamples = 48_000,
  channels = 1,
  bitsPerSample = 16,
  seed = 0,
}: {
  durationSamples?: number;
  channels?: 1 | 2;
  bitsPerSample?: 16 | 24 | 32;
  seed?: number;
} = {}): Uint8Array {
  const dataBytes = durationSamples * channels * (bitsPerSample / 8);
  const payload = new Uint8Array(dataBytes);
  for (let index = 0; index < payload.length; index += 1)
    payload[index] = (index + seed) % 251;
  return makeWavChunk("data", payload);
}

function makeRiffWave(
  chunks: readonly Uint8Array[],
  declaredRiffSize?: number,
): Uint8Array {
  const chunkBytes = concatenateBytes(...chunks);
  const bytes = new Uint8Array(12 + chunkBytes.byteLength);
  const view = new DataView(bytes.buffer);
  writeAscii(bytes, 0, "RIFF");
  view.setUint32(4, declaredRiffSize ?? bytes.byteLength - 8, true);
  writeAscii(bytes, 8, "WAVE");
  bytes.set(chunkBytes, 12);
  return bytes;
}

function withDeclaredRiffSize(bytes: Uint8Array, riffSize: number) {
  const altered = bytes.slice();
  new DataView(
    altered.buffer,
    altered.byteOffset,
    altered.byteLength,
  ).setUint32(4, riffSize, true);
  return altered;
}

function makePcmWav({
  sampleRate = 48_000,
  durationSamples = 48_000,
  channels = 1,
  seed = 0,
}: {
  sampleRate?: number;
  durationSamples?: number;
  channels?: 1 | 2;
  seed?: number;
} = {}): Uint8Array {
  return makeRiffWave([
    makePcmFormatChunk({ sampleRate, channels }),
    makePcmDataChunk({ durationSamples, channels, seed }),
  ]);
}

const script = "Ollo finds the light. Tix listens carefully.";
const clauses: GuideVoiceClause[] = [
  {
    clauseId: "clause-ollo-finds",
    sourceRange: { start: 0, end: 21 },
    speakerRef: "narrator",
    startSample: 0,
    endSampleExclusive: 16_000,
  },
  {
    clauseId: "clause-tix-listens",
    sourceRange: { start: 22, end: script.length },
    speakerRef: "narrator",
    startSample: 16_000,
    endSampleExclusive: 32_000,
  },
];

const createFixture = (
  options: Parameters<typeof makePcmWav>[0] = {},
  clauseGrid: GuideVoiceClause[] = clauses,
) => {
  const sources = { script, audioBytes: makePcmWav(options) };
  const clock = sealGuideVoiceClock(sources, clauseGrid);
  return { sources, clock };
};

const resealClock = (clock: ReturnType<typeof sealGuideVoiceClock>) => {
  const draft: Partial<typeof clock> = { ...clock };
  delete draft.contentHash;
  return guideVoiceClockSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

const resealBasis = (
  basis: ReturnType<typeof sealGuideVoiceTimingBasis>,
  overrides: Partial<typeof basis>,
) => {
  const draft: Partial<typeof basis> = { ...basis, ...overrides };
  delete draft.contentHash;
  return guideVoiceTimingBasisSchema.parse({
    ...draft,
    contentHash: hashCanonical(draft),
  });
};

const expectClock = (clock: ReturnType<typeof sealGuideVoiceClock>) => ({
  expectedContentHash: clock.contentHash,
});

const expectFrameBinding = (
  clock: ReturnType<typeof sealGuideVoiceClock>,
  basis: ReturnType<typeof sealGuideVoiceTimingBasis>,
) => ({
  expectedClockContentHash: clock.contentHash,
  expectedTimingBasisContentHash: basis.contentHash,
});

describe("GuideVoiceClockV1", () => {
  it("seals and restores exact script, WAV bytes, metadata, clauses, and guide-only authority", () => {
    const { sources, clock } = createFixture({ channels: 2 });

    expect(clock).toMatchObject({
      schemaVersion: "1.0",
      audioContentHash: hashGuideAudioBytes(sources.audioBytes),
      codec: "wav",
      sampleRate: 48_000,
      channels: 2,
      durationSamples: 48_000,
      authority: "guide-timing-only",
      productionBindable: false,
    });
    expect(clock.contentHash).toHaveLength(64);
    expect(
      restoreGuideVoiceClock(
        serializeGuideVoiceClock(clock),
        sources,
        expectClock(clock),
      ),
    ).toEqual(clock);
  });

  it("hashes and inspects one copied audio snapshot", () => {
    const firstAudio = makePcmWav();
    const secondAudio = makePcmWav({
      sampleRate: 44_100,
      durationSamples: 44_100,
      seed: 9,
    });
    let audioReads = 0;
    const changingSources = {
      script,
      get audioBytes() {
        audioReads += 1;
        return audioReads === 1 ? firstAudio : secondAudio;
      },
    } as GuideVoiceClockSources;

    const clock = sealGuideVoiceClock(changingSources, clauses);
    expect(audioReads).toBe(1);
    expect(clock.audioContentHash).toBe(hashGuideAudioBytes(firstAudio));
    expect(clock).toMatchObject({
      sampleRate: 48_000,
      channels: 1,
      durationSamples: 48_000,
    });

    audioReads = 0;
    expect(() =>
      assertGuideVoiceClockMatchesSources(
        clock,
        changingSources,
        expectClock(clock),
      ),
    ).not.toThrow();
    expect(audioReads).toBe(1);
  });

  it("accepts an in-RIFF metadata chunk without deriving timing from it", () => {
    const fakeTiming = new Uint8Array(16);
    const fakeView = new DataView(fakeTiming.buffer);
    fakeView.setUint16(0, 3, true);
    fakeView.setUint16(2, 2, true);
    fakeView.setUint32(4, 8_000, true);
    fakeView.setUint32(8, 64_000, true);
    fakeView.setUint16(12, 8, true);
    fakeView.setUint16(14, 32, true);
    const audioBytes = makeRiffWave([
      makeWavChunk("JUNK", fakeTiming),
      makePcmFormatChunk(),
      makePcmDataChunk(),
    ]);

    const clock = sealGuideVoiceClock({ script, audioBytes }, clauses);
    expect(clock).toMatchObject({
      sampleRate: 48_000,
      channels: 1,
      durationSamples: 48_000,
    });
  });

  it("rejects malformed RIFF structure, duplicate timing chunks, and inconsistent PCM metadata", () => {
    const format = makePcmFormatChunk();
    const data = makePcmDataChunk();
    const valid = makeRiffWave([format, data]);
    const declaredSize = valid.byteLength - 8;
    const trailingFormat = concatenateBytes(valid, format);
    const missingPadding = makeRiffWave([
      makeWavChunk("JUNK", Uint8Array.of(1), { includePadding: false }),
      format,
      data,
    ]);
    const outOfBoundsChunk = valid.slice();
    new DataView(
      outOfBoundsChunk.buffer,
      outOfBoundsChunk.byteOffset,
      outOfBoundsChunk.byteLength,
    ).setUint32(40, 96_002, true);

    const cases: Array<[string, Uint8Array, RegExp]> = [
      ["trailing fmt beyond RIFF", trailingFormat, /RIFF size/],
      [
        "duplicate fmt",
        makeRiffWave([format, format, data]),
        /exactly one format chunk/,
      ],
      [
        "duplicate data",
        makeRiffWave([format, data, data]),
        /exactly one audio-data chunk/,
      ],
      [
        "fmt after data",
        makeRiffWave([data, format]),
        /format chunk must precede/,
      ],
      [
        "stale short RIFF size",
        withDeclaredRiffSize(valid, declaredSize - 2),
        /RIFF size/,
      ],
      [
        "stale long RIFF size",
        withDeclaredRiffSize(valid, declaredSize + 2),
        /RIFF size/,
      ],
      ["missing odd-chunk padding", missingPadding, /padding/],
      ["chunk beyond RIFF bounds", outOfBoundsChunk, /RIFF bounds/],
      [
        "non-PCM format",
        makeRiffWave([makePcmFormatChunk({ audioFormat: 3 }), data]),
        /integer PCM/,
      ],
      [
        "inconsistent byte rate",
        makeRiffWave([makePcmFormatChunk({ byteRate: 1 }), data]),
        /byte rate and block alignment/,
      ],
      [
        "inconsistent block align",
        makeRiffWave([makePcmFormatChunk({ blockAlign: 4 }), data]),
        /byte rate and block alignment/,
      ],
      [
        "partial sample frame",
        makeRiffWave([
          makePcmFormatChunk({ channels: 2 }),
          makeWavChunk("data", new Uint8Array(6)),
        ]),
        /complete sample frame/,
      ],
    ];

    cases.forEach(([label, audioBytes, expected]) => {
      expect(
        () => sealGuideVoiceClock({ script, audioBytes }, clauses),
        label,
      ).toThrow(expected);
    });
  });

  it("rejects altered hashes, scripts, WAV bytes, and WAV metadata", () => {
    const { sources, clock } = createFixture();
    expect(() =>
      guideVoiceClockSchema.parse({ ...clock, contentHash: "0".repeat(64) }),
    ).toThrow(/hash is invalid/);
    expect(() =>
      assertGuideVoiceClockMatchesSources(
        clock,
        {
          ...sources,
          script: `${sources.script} altered`,
        },
        expectClock(clock),
      ),
    ).toThrow(/exact source script/);

    const alteredBytes = sources.audioBytes.slice();
    alteredBytes[alteredBytes.length - 1]! ^= 1;
    expect(() =>
      assertGuideVoiceClockMatchesSources(
        clock,
        {
          ...sources,
          audioBytes: alteredBytes,
        },
        expectClock(clock),
      ),
    ).toThrow(/exact WAV bytes/);

    const metadataDraft = { ...clock, sampleRate: 44_100 };
    const metadataClock = resealClock(metadataDraft);
    expect(() =>
      assertGuideVoiceClockMatchesSources(
        metadataClock,
        sources,
        expectClock(metadataClock),
      ),
    ).toThrow(/WAV metadata/);
  });

  it("rejects a valid self-rehashed alternate clause grid against the frozen clock", () => {
    const frozen = createFixture();
    const alternate = createFixture({}, [
      { ...clauses[0]!, endSampleExclusive: 14_400 },
      { ...clauses[1]!, startSample: 14_400 },
    ]);

    expect(() =>
      assertGuideVoiceClockMatchesSources(
        alternate.clock,
        alternate.sources,
        expectClock(frozen.clock),
      ),
    ).toThrow(/frozen expected clock hash/);
    expect(() =>
      restoreGuideVoiceClock(
        serializeGuideVoiceClock(alternate.clock),
        alternate.sources,
        { expectedClauses: frozen.clock.clauses },
      ),
    ).toThrow(/frozen expected clause grid/);
  });

  it("rejects duplicate, overlapping, out-of-order, empty, and out-of-script clauses", () => {
    const sources = { script, audioBytes: makePcmWav() };
    const expectClausesToFail = (candidate: GuideVoiceClause[]) =>
      expect(() => sealGuideVoiceClock(sources, candidate)).toThrow();

    expectClausesToFail([
      clauses[0]!,
      { ...clauses[1]!, clauseId: clauses[0]!.clauseId },
    ]);
    expectClausesToFail([
      clauses[0]!,
      { ...clauses[1]!, sourceRange: { start: 20, end: script.length } },
    ]);
    expectClausesToFail([clauses[0]!, { ...clauses[1]!, startSample: 15_999 }]);
    expectClausesToFail([
      { ...clauses[0]!, sourceRange: { start: 4, end: 4 } },
    ]);
    expectClausesToFail([
      {
        ...clauses[0]!,
        sourceRange: { start: script.length, end: script.length + 1 },
      },
    ]);
    expect(() =>
      sealGuideVoiceClock(sources, [
        { ...clauses[0]!, sourceRange: { start: 1, end: 21 } },
        clauses[1]!,
      ]),
    ).toThrow(/omit non-whitespace.*before clause 1/);
    expect(() =>
      sealGuideVoiceClock(sources, [
        { ...clauses[0]!, sourceRange: { start: 0, end: 20 } },
        clauses[1]!,
      ]),
    ).toThrow(/omit non-whitespace.*before clause 2/);
    expect(() =>
      sealGuideVoiceClock(sources, [
        clauses[0]!,
        {
          ...clauses[1]!,
          sourceRange: { start: 22, end: script.length - 1 },
        },
      ]),
    ).toThrow(/omit non-whitespace.*after the final clause/);
  });
});

describe("guide-only TimingBasis", () => {
  it("maps exact sample boundaries against one immutable FPS basis", () => {
    const { sources, clock } = createFixture();
    const basis = sealGuideVoiceTimingBasis(clock, sources, 30);

    expect(basis).toMatchObject({
      kind: "guide-audio",
      guideVoiceClockContentHash: clock.contentHash,
      audioContentHash: clock.audioContentHash,
      sampleRate: 48_000,
      durationSamples: 48_000,
      fps: 30,
      samplesPerFrame: 1_600,
      authority: "guide-timing-only",
      productionBindable: false,
    });
    expect(guideSampleToFrame(16_000, basis)).toBe(10);
    expect(guideFrameToSample(10, basis)).toBe(16_000);
    expect(
      bindGuideVoiceClockToFrames(
        clock,
        basis,
        expectFrameBinding(clock, basis),
      ),
    ).toEqual([
      { ...clauses[0]!, startFrame: 0, endFrameExclusive: 10 },
      { ...clauses[1]!, startFrame: 10, endFrameExclusive: 20 },
    ]);
    expect(
      restoreGuideVoiceTimingBasis(
        serializeGuideVoiceTimingBasis(basis),
        clock,
        sources,
        expectClock(clock),
        { expectedContentHash: basis.contentHash },
      ),
    ).toEqual(basis);
  });

  it("rejects fractional FPS, duration, and clause boundaries plus estimated timing", () => {
    const { sources, clock } = createFixture();
    expect(() => sealGuideVoiceTimingBasis(clock, sources, 29)).toThrow(
      /integer number of samples per frame/,
    );

    const fractionalDuration = createFixture({ durationSamples: 48_001 });
    expect(() =>
      sealGuideVoiceTimingBasis(
        fractionalDuration.clock,
        fractionalDuration.sources,
        30,
      ),
    ).toThrow(/fractional frame boundary/);

    const basis = sealGuideVoiceTimingBasis(clock, sources, 30);
    expect(() => guideSampleToFrame(1, basis)).toThrow(/fractional frame/);
    const fractionalClauseClock = sealGuideVoiceClock(sources, [
      { ...clauses[0]!, startSample: 1 },
      clauses[1]!,
    ]);
    const fractionalClauseBasis = sealGuideVoiceTimingBasis(
      fractionalClauseClock,
      sources,
      30,
    );
    expect(() =>
      bindGuideVoiceClockToFrames(
        fractionalClauseClock,
        fractionalClauseBasis,
        expectFrameBinding(fractionalClauseClock, fractionalClauseBasis),
      ),
    ).toThrow(/fractional frame/);
    expect(() =>
      guideSampleToFrame(0, {
        kind: "estimated",
        contentHash: "0".repeat(64),
      } as unknown as Parameters<typeof guideSampleToFrame>[1]),
    ).toThrow();
  });

  it("rejects a resealed timing basis that belongs to a different guide clock", () => {
    const fixture = createFixture();
    const other = createFixture({ seed: 4 });
    const basis = sealGuideVoiceTimingBasis(fixture.clock, fixture.sources, 30);
    const draft: Partial<typeof basis> = { ...basis };
    delete draft.contentHash;
    const forgedDraft = {
      ...draft,
      guideVoiceClockContentHash: other.clock.contentHash,
    };
    const forged = guideVoiceTimingBasisSchema.parse({
      ...forgedDraft,
      contentHash: hashCanonical(forgedDraft),
    });
    expect(() =>
      bindGuideVoiceClockToFrames(fixture.clock, forged, {
        expectedClockContentHash: fixture.clock.contentHash,
        expectedTimingBasisContentHash: forged.contentHash,
      }),
    ).toThrow(/does not match/);
  });

  it("rejects another valid FPS divisor against the frozen selected basis", () => {
    const fixture = createFixture();
    const basis30 = sealGuideVoiceTimingBasis(
      fixture.clock,
      fixture.sources,
      30,
    );
    const basis24 = sealGuideVoiceTimingBasis(
      fixture.clock,
      fixture.sources,
      24,
    );

    expect(() =>
      assertGuideVoiceTimingBasisMatchesClock(basis24, fixture.clock, {
        expectedContentHash: basis30.contentHash,
      }),
    ).toThrow(/frozen expected basis hash/);
    expect(() =>
      restoreGuideVoiceTimingBasis(
        serializeGuideVoiceTimingBasis(basis24),
        fixture.clock,
        fixture.sources,
        expectClock(fixture.clock),
        { expectedFps: 30 },
      ),
    ).toThrow(/frozen selected FPS/);
  });
});

describe("blind A/B guide-clock equality", () => {
  const bind = (
    sources: GuideVoiceClockSources,
    clock: ReturnType<typeof sealGuideVoiceClock>,
  ) => ({
    ...sources,
    clock,
    timingBasis: sealGuideVoiceTimingBasis(clock, sources, 30),
  });

  it("accepts only cuts with the same clock hash, exact bytes, clause grid, and TimingBasis", () => {
    const fixture = createFixture();
    const cut = bind(fixture.sources, fixture.clock);
    const frozen = expectFrameBinding(fixture.clock, cut.timingBasis);
    expect(() =>
      assertGuideClockAbEquality(cut, { ...cut }, frozen),
    ).not.toThrow();

    const otherAudio = createFixture({ seed: 7 });
    expect(() =>
      assertGuideClockAbEquality(
        cut,
        bind(otherAudio.sources, otherAudio.clock),
        frozen,
      ),
    ).toThrow(/frozen expected clock hash/);

    const alternateClauses: GuideVoiceClause[] = [
      { ...clauses[0]!, endSampleExclusive: 14_400 },
      { ...clauses[1]!, startSample: 14_400 },
    ];
    const otherGrid = createFixture({}, alternateClauses);
    const otherGridCut = bind(otherGrid.sources, otherGrid.clock);
    expect(() =>
      assertGuideClockAbEquality(otherGridCut, { ...otherGridCut }, frozen),
    ).toThrow(/frozen expected clock hash/);

    const basis24 = sealGuideVoiceTimingBasis(
      fixture.clock,
      fixture.sources,
      24,
    );
    const cut24 = { ...cut, timingBasis: basis24 };
    expect(() =>
      assertGuideClockAbEquality(cut24, { ...cut24 }, frozen),
    ).toThrow(/frozen expected basis hash/);
  });

  it("rejects two colluding cuts with the same self-consistent malformed WAV", () => {
    const fixture = createFixture();
    const validBasis = sealGuideVoiceTimingBasis(
      fixture.clock,
      fixture.sources,
      30,
    );
    const malformedAudio = concatenateBytes(
      fixture.sources.audioBytes,
      makePcmFormatChunk({ sampleRate: 8_000 }),
    );
    const forgedClock = resealClock({
      ...fixture.clock,
      audioContentHash: hashGuideAudioBytes(malformedAudio),
    });
    const forgedBasis = resealBasis(validBasis, {
      guideVoiceClockContentHash: forgedClock.contentHash,
      audioContentHash: forgedClock.audioContentHash,
    });
    const colludingCut = {
      script,
      audioBytes: malformedAudio,
      clock: forgedClock,
      timingBasis: forgedBasis,
    };

    expect(() =>
      assertGuideClockAbEquality(
        colludingCut,
        { ...colludingCut, audioBytes: malformedAudio.slice() },
        expectFrameBinding(forgedClock, forgedBasis),
      ),
    ).toThrow(/RIFF size/);
  });
});
