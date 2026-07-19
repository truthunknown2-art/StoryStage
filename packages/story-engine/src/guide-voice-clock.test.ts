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
  const bytesPerSample = 2;
  const dataBytes = durationSamples * channels * bytesPerSample;
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
  view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(bytes, 36, "data");
  view.setUint32(40, dataBytes, true);
  for (let index = 44; index < bytes.length; index += 1)
    bytes[index] = (index + seed) % 251;
  return bytes;
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
});
