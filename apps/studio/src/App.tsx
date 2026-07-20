import { ProductV1App } from "./product-v1/ProductV1App";

/**
 * StoryStage creator entry. F1 routes the default journey through the
 * product-v1 surfaces: Projects → Create → honest local Studio handoff.
 * Legacy engineering/proof surfaces remain in the repository but are no
 * longer the default route (see docs/PRODUCT_PLAN.md).
 */
export function App() {
  return <ProductV1App />;
}
