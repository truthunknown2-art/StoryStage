import {productionPolicySchema, type ProductionPolicy, type ProductionPreset} from "./model";

export const productionPolicies: Record<ProductionPreset, ProductionPolicy> = {
  draft: productionPolicySchema.parse({
    preset: "draft",
    maxNewAssets: 4,
    imageCandidatesPerRequest: 1,
    imageQuality: "low",
    backgroundLayerTarget: 2,
    posePack: "basic",
    stockSearchLimit: 0,
    maxProposed3DShots: 0,
    cadenceMultiplier: 0.85,
    outputHeight: 720,
    audioPasses: 1,
  }),
  studio: productionPolicySchema.parse({
    preset: "studio",
    maxNewAssets: 12,
    imageCandidatesPerRequest: 2,
    imageQuality: "medium",
    backgroundLayerTarget: 3,
    posePack: "standard",
    stockSearchLimit: 5,
    maxProposed3DShots: 1,
    cadenceMultiplier: 1,
    outputHeight: 1080,
    audioPasses: 2,
  }),
  premium: productionPolicySchema.parse({
    preset: "premium",
    maxNewAssets: 24,
    imageCandidatesPerRequest: 4,
    imageQuality: "high",
    backgroundLayerTarget: 5,
    posePack: "extended",
    stockSearchLimit: 12,
    maxProposed3DShots: 2,
    cadenceMultiplier: 1.1,
    outputHeight: 2160,
    audioPasses: 3,
  }),
};

export function getProductionPolicy(preset: ProductionPreset): ProductionPolicy {
  return productionPolicies[preset];
}
