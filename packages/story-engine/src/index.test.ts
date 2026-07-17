import {describe, expect, it} from "vitest";
import {
  analyzeStory,
  buildAnimaticSync,
  getShowPack,
  parseScript,
  sampleWorkshopScript,
} from "./index";

describe("StoryStage story engine", () => {
  it("parses the acceptance script into two natural scenes and recurring entities", () => {
    const document = parseScript(sampleWorkshopScript, "The Punctual Box");
    const analysis = analyzeStory(document);

    expect(document.elements.filter((element) => element.type === "scene-heading")).toHaveLength(2);
    expect(analysis.characters.map((character) => character.name)).toEqual(["MARA", "ELI"]);
    expect(analysis.locations.map((location) => location.name)).toEqual(["WORKSHOP", "HALLWAY"]);
    expect(analysis.props.map((prop) => prop.name)).toEqual(expect.arrayContaining(["BOX", "CLOCK"]));
  });

  it("rejects malformed scripts instead of inventing a scene", () => {
    expect(() => parseScript("MARA: There is no heading here.")).toThrow(/begin with a scene heading/i);
  });

  it("builds deterministic profile-specific animatics", () => {
    const kids = buildAnimaticSync({script: sampleWorkshopScript, title: "The Punctual Box", showPackId: "kids-adventure-v1", preset: "studio"});
    const history = buildAnimaticSync({script: sampleWorkshopScript, title: "The Punctual Box", showPackId: "weird-history-editorial-v1", preset: "studio"});
    const historyAgain = buildAnimaticSync({script: sampleWorkshopScript, title: "The Punctual Box", showPackId: "weird-history-editorial-v1", preset: "studio"});

    expect(kids.creativePlan.scenes).toHaveLength(2);
    expect(kids.renderPlan.shots.length).toBeGreaterThanOrEqual(6);
    expect(history.renderPlan.shots.length).toBeGreaterThan(kids.renderPlan.shots.length);
    expect(new Set(kids.renderPlan.shots.map((shot) => shot.framing)).size).toBeGreaterThanOrEqual(3);
    expect(history.renderPlan.shots.some((shot) => shot.treatment === "kinetic-type")).toBe(true);
    expect(history.renderPlan.shots.flatMap((shot) => shot.actions).map((action) => action.type)).toEqual(
      expect.arrayContaining(["cameraPush", "insert", "talk", "react"]),
    );
    expect(history).toEqual(historyAgain);
  });

  it("recompiles semantic shot overrides without source edits", () => {
    const initial = buildAnimaticSync({script: sampleWorkshopScript, showPackId: "kids-adventure-v1"});
    const shotId = initial.renderPlan.shots[1]!.id;
    const updated = buildAnimaticSync({
      script: sampleWorkshopScript,
      showPackId: "kids-adventure-v1",
      overrides: [{shotId, framing: "close-up", gesture: "point", treatment: "reaction"}],
    });
    const changedShot = updated.renderPlan.shots.find((shot) => shot.id === shotId)!;

    expect(changedShot.framing).toBe("close-up");
    expect(changedShot.treatment).toBe("reaction");
    expect(changedShot.actions.some((action) => action.label === "Gesture: point")).toBe(true);
  });

  it("keeps unresolved assets visible and strips acquisition instructions from the render plan", () => {
    const build = buildAnimaticSync({script: sampleWorkshopScript, showPackId: "weird-history-editorial-v1"});
    const clock = build.resolvedPlan.props.find((prop) => prop.entityName === "CLOCK")!;
    const serializedRenderPlan = JSON.stringify(build.renderPlan);

    expect(clock.resolved).toBe(false);
    expect(build.renderPlan.unresolvedWarnings.some((warning) => /CLOCK/.test(warning))).toBe(true);
    expect(build.resolvedPlan.generationRequests.length).toBeGreaterThan(0);
    expect(serializedRenderPlan).not.toMatch(/prompt|brief|https?:\/\//i);
  });

  it("exposes two materially different directing policies", () => {
    const kids = getShowPack("kids-adventure-v1");
    const history = getShowPack("weird-history-editorial-v1");

    expect(kids.profile.textMode).toBe("participation-cues");
    expect(history.profile.textMode).toBe("editorial-keywords");
    expect(kids.profile.cadenceSeconds[0]).toBeGreaterThan(history.profile.cadenceSeconds[0]);
    expect(kids.assetFactory.providerClass).toBe("chatgpt-images");
    expect(history.assetFactory.approvalRequired).toBe(true);
  });

  it("meets the binding two-profile comparison thresholds", () => {
    const kids = buildAnimaticSync({script: sampleWorkshopScript, showPackId: "kids-adventure-v1", preset: "studio"}).renderPlan;
    const history = buildAnimaticSync({script: sampleWorkshopScript, showPackId: "weird-history-editorial-v1", preset: "studio"}).renderPlan;
    const averageSeconds = (plan: typeof kids) => plan.shots.reduce((sum, shot) => sum + shot.durationInFrames, 0) / plan.shots.length / plan.fps;
    const routedShare = (plan: typeof kids) => plan.shots.filter((shot) => ["insert", "kinetic-type", "diagram", "licensed-media", "generated-illustration"].includes(shot.treatment)).length / plan.shots.length;
    const performanceRate = (plan: typeof kids) => {
      const events = plan.shots.flatMap((shot) => shot.actions).filter((action) => ["gesture", "react", "enter", "beatAccent"].includes(action.type)).length;
      return events / (plan.durationInFrames / plan.fps / 60);
    };

    expect(Math.max(averageSeconds(kids), averageSeconds(history)) / Math.min(averageSeconds(kids), averageSeconds(history))).toBeGreaterThanOrEqual(1.2);
    expect(routedShare(history)).toBeGreaterThanOrEqual(routedShare(kids) * 1.5);
    expect(performanceRate(kids)).toBeGreaterThanOrEqual(performanceRate(history) * 1.5);
  });

  it("makes production presets alter real planning and asset-factory parameters", () => {
    const draft = buildAnimaticSync({script: sampleWorkshopScript, showPackId: "kids-adventure-v1", preset: "draft"});
    const premium = buildAnimaticSync({script: sampleWorkshopScript, showPackId: "kids-adventure-v1", preset: "premium"});
    const draftPolicy = draft.creativePlan.productionPolicy;
    const premiumPolicy = premium.creativePlan.productionPolicy;

    expect(draftPolicy.imageCandidatesPerRequest).not.toBe(premiumPolicy.imageCandidatesPerRequest);
    expect(draftPolicy.imageQuality).not.toBe(premiumPolicy.imageQuality);
    expect(draftPolicy.backgroundLayerTarget).not.toBe(premiumPolicy.backgroundLayerTarget);
    expect(draftPolicy.posePack).not.toBe(premiumPolicy.posePack);
    expect(draftPolicy.outputHeight).not.toBe(premiumPolicy.outputHeight);
    expect(draft.renderPlan.durationInFrames).not.toBe(premium.renderPlan.durationInFrames);
    expect(draft.resolvedPlan.generationRequests[0]!.candidateCount).toBe(1);
    expect(premium.resolvedPlan.generationRequests[0]!.candidateCount).toBe(4);
  });
});
