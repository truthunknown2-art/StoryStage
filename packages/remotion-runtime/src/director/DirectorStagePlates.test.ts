import { describe, expect, it } from "vitest";
import { resolveLayeredStagePlateAssetIds } from "./DirectorEpisodeRenderer";

describe("resolveLayeredStagePlateAssetIds", () => {
  it("maps the far plate first and every remaining plate to foreground occlusion", () => {
    expect(
      resolveLayeredStagePlateAssetIds({
        id: "little-wood-hollow-log",
        rendererId: "layered-stage",
        layerIds: ["background", "characters", "foreground"],
        assetIds: [
          "little-wood-hollow-log-background-v1",
          "little-wood-hollow-log-foreground-v1",
        ],
      }),
    ).toEqual({
      backgroundAssetId: "little-wood-hollow-log-background-v1",
      foregroundAssetIds: ["little-wood-hollow-log-foreground-v1"],
    });
  });

  it("preserves the proxy stage fallback when no approved plate is bound", () => {
    expect(
      resolveLayeredStagePlateAssetIds({
        id: "proxy-stage",
        rendererId: "proxy-layered-stage",
        layerIds: ["background", "characters", "foreground"],
        assetIds: [],
      }),
    ).toEqual({ backgroundAssetId: null, foregroundAssetIds: [] });
  });
});
