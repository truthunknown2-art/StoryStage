import {productionBundleDraftSchema, type ProductionBundle, type ProductionBundleDraft} from "@storystage/story-engine";

export function productionDraftPayload(bundle: ProductionBundle): ProductionBundleDraft {
  const {savedAt: _savedAt, contentHash: _contentHash, ...draft} = bundle;
  void _savedAt;
  void _contentHash;
  return productionBundleDraftSchema.parse(draft);
}
