import { useEffect, useRef, useState } from "react";
import { OLLO_DEMO_SCENES } from "./demo-project";
import {
  ASSET_CATEGORIES,
  ASSET_EPISODES,
  ASSET_FIXTURE_LABEL,
  ASSET_READINESS_DISCLAIMER,
  ASSET_READINESS_LABELS,
  ASSET_READINESS_NOTES,
  INITIAL_ASSET_SCOPE,
  SCOPE_ALL,
  assetCategoryLabel,
  assetFixtureScopeLabel,
  assetScopeFilterLabel,
  filterAssetFixtures,
  resolveAssetSelection,
  sanitizeAssetScope,
  scenesForEpisodeScope,
  type AssetCategoryId,
  type AssetScope,
} from "./asset-workspace";
import {
  READY_LOCAL_RECORD_DISCLAIMER,
  REQUIREMENT_NECESSITY_LABELS,
  REQUIREMENT_READINESS_LABELS,
  SCENE_REQUIREMENTS,
  countRequirements,
  requirementSceneLabel,
  requirementScopeLabel,
  resolveScopeRequirements,
  type ResolvedSceneRequirement,
  type SceneRequirementFixture,
} from "./asset-requirements";
import { buildRequestPack } from "./asset-request-pack";
import type { LocalCandidateRecord } from "./asset-import";
import { AssetRequestImport } from "./AssetRequestImport";
import {
  NO_REVIEW_EXAMPLE_REASON,
  REVIEW_FIXTURES,
  reviewEligibility,
  reviewFixturesFor,
  type ReviewFixture,
} from "./asset-review";
import { AssetReview } from "./AssetReview";

/** The review action label per eligible category: characters and rigs open
 * the layer-and-rig review, layered sets open the set-layer review. */
const reviewActionLabel = (category: AssetCategoryId): string =>
  category === "layered-sets" ? "Review set layers" : "Review layers & rig";

/* F4-WP5 focus backstop: when a scope, category, or record change removes an
 * open transient panel (or its invoker) without a restore request, focus must
 * never fall to `body` or removed content — it moves to the Scene filter, the
 * stable surviving scope-authority control. Focus that already rests on a
 * surviving control is never yanked. */
const recoverStrandedFocus = (target: HTMLElement | null) => {
  const active = document.activeElement;
  if (
    active !== null &&
    active !== document.body &&
    document.contains(active)
  )
    return;
  target?.focus();
};

/**
 * F4-WP1 Assets & Rigs workspace: category navigation, episode/scene
 * filters, and a synchronized selected-asset detail over deterministic local
 * demo records. One selection identity is shared by the list and the detail;
 * whenever a category or filter change excludes the selected record, the
 * selection deterministically falls to the first visible record or an honest
 * empty scope (render-time adjustment, no effect races). This surface never
 * touches the Studio's selected scene/beat, never creates an artifact, and
 * keeps every preparation action visibly unavailable with its reason.
 *
 * F4-WP3 added the scene-scoped request/import panel; F4-WP4 adds the
 * scene-scoped layer-and-rig review panel. At most one transient panel is
 * open at a time: opening a review closes any open request/import, and
 * opening a request/import closes any open review. Neither panel ever
 * changes requirement readiness or counts.
 */
export function AssetWorkspace({
  usesLayoutDemo = false,
  requirementFixtures = SCENE_REQUIREMENTS,
  reviewFixtures = REVIEW_FIXTURES,
}: {
  usesLayoutDemo?: boolean;
  requirementFixtures?: readonly SceneRequirementFixture[];
  reviewFixtures?: readonly ReviewFixture[];
}) {
  const [category, setCategory] = useState<AssetCategoryId>("characters");
  const [scope, setScope] = useState<AssetScope>(INITIAL_ASSET_SCOPE);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  /* F4-WP3: scene-scoped request/import transient state. The open panel is
   * bound to exactly one requirement id; any scene, category, or requirement
   * scope change closes it so a hidden candidate from another scope can never
   * be retained. Confirmed records live only in this session-local map keyed
   * by requirement id — they never change F4-WP2 readiness or counts. */
  const [openRequestId, setOpenRequestId] = useState<string | null>(null);
  const [candidatesByRequirement, setCandidatesByRequirement] = useState<
    Record<string, readonly LocalCandidateRecord[]>
  >({});
  const requestInvokerRef = useRef<HTMLButtonElement | null>(null);
  const restoreRequestFocusRef = useRef(false);
  const requestWasOpenRef = useRef(false);

  const closeRequest = (restoreFocus: boolean) => {
    if (openRequestId === null) return;
    restoreRequestFocusRef.current = restoreFocus;
    setOpenRequestId(null);
  };

  /* The Scene filter is the stable surviving scope-authority control used by
   * the F4-WP5 stranded-focus backstop. */
  const sceneFilterRef = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    if (openRequestId !== null) {
      requestWasOpenRef.current = true;
      return;
    }
    if (!requestWasOpenRef.current) return;
    if (restoreRequestFocusRef.current) {
      restoreRequestFocusRef.current = false;
      requestInvokerRef.current?.focus();
      return;
    }
    recoverStrandedFocus(sceneFilterRef.current);
  }, [openRequestId]);

  /* F4-WP4: scene-scoped layer-and-rig review transient state. The open
   * panel is bound to exactly one requirement id; any scene, episode,
   * category, requirement, or selected-record scope change closes it, and
   * opening it closes any open request/import panel. Review state is purely
   * presentational — it never changes F4-WP2 readiness or counts. */
  const [openReviewId, setOpenReviewId] = useState<string | null>(null);
  const reviewInvokerRef = useRef<HTMLButtonElement | null>(null);
  const restoreReviewFocusRef = useRef(false);
  const reviewWasOpenRef = useRef(false);

  const closeReview = (restoreFocus: boolean) => {
    if (openReviewId === null) return;
    restoreReviewFocusRef.current = restoreFocus;
    setOpenReviewId(null);
  };

  useEffect(() => {
    if (openReviewId !== null) {
      reviewWasOpenRef.current = true;
      return;
    }
    if (!reviewWasOpenRef.current) return;
    if (restoreReviewFocusRef.current) {
      restoreReviewFocusRef.current = false;
      reviewInvokerRef.current?.focus();
      return;
    }
    recoverStrandedFocus(sceneFilterRef.current);
  }, [openReviewId]);

  const visibleAssets = filterAssetFixtures(category, scope);
  const resolvedSelectedId = resolveAssetSelection(
    visibleAssets,
    selectedAssetId,
  );
  if (resolvedSelectedId !== selectedAssetId) {
    setSelectedAssetId(resolvedSelectedId);
  }
  const selectedAsset =
    visibleAssets.find((asset) => asset.id === resolvedSelectedId) ?? null;

  const sceneOptions = scenesForEpisodeScope(scope.episodeId);
  const scopeLabel = assetScopeFilterLabel(scope);

  /* F4-WP2: scene-scoped requirement truth over the same deterministic
   * fixtures. The scene filter is the scope authority — a selected scene
   * shows scene truth, `all` shows an episode summary that discloses its
   * scope. Counts derive mechanically from the same resolved entries the
   * list renders. */
  const scopeRequirements = resolveScopeRequirements(
    scope,
    requirementFixtures,
  );
  const requirementCounts = countRequirements(scopeRequirements);
  const requirementScopeName = requirementScopeLabel(scope);

  /* Fail-closed backstop: if the open request requirement is no longer a
   * visible, available, non-ready entry in the current scope, close the
   * transient panel (render-time adjustment, same pattern as selection). */
  const openRequestItem =
    openRequestId === null
      ? undefined
      : scopeRequirements.find(
          (item) =>
            item.entry.id === openRequestId &&
            item.unavailableReason === null &&
            item.entry.readiness !== "ready",
        );
  if (openRequestId !== null && openRequestItem === undefined) {
    restoreRequestFocusRef.current = false;
    setOpenRequestId(null);
  }
  const openRequestPack = openRequestItem
    ? buildRequestPack(openRequestItem)
    : null;

  /* Fail-closed backstop for the review panel: the open review requirement
   * must remain visible, cleanly resolved, review-eligible, and backed by at
   * least one declared example in the current scope; otherwise the transient
   * panel closes (render-time adjustment, same pattern as the request). */
  const openReviewItem =
    openReviewId === null
      ? undefined
      : scopeRequirements.find(
          (item) =>
            item.entry.id === openReviewId &&
            item.unavailableReason === null &&
            reviewEligibility(item) === "eligible",
        );
  const openReviewFixtureList =
    openReviewItem === undefined
      ? []
      : reviewFixturesFor(openReviewItem.entry.id, reviewFixtures);
  if (openReviewId !== null && openReviewFixtureList.length === 0) {
    restoreReviewFocusRef.current = false;
    setOpenReviewId(null);
  }
  const selectedSceneRequirement =
    selectedAsset && scope.sceneId !== SCOPE_ALL
      ? scopeRequirements.find(
          (item) => item.entry.assetId === selectedAsset.id,
        )
      : undefined;

  const openRequirementRecord = (item: ResolvedSceneRequirement) => {
    if (item.asset === null) return;
    closeRequest(false);
    closeReview(false);
    setCategory(item.asset.category);
    setSelectedAssetId(item.asset.id);
    if (scope.sceneId === SCOPE_ALL) {
      setScope((current) => ({ ...current, sceneId: item.entry.sceneId }));
    }
  };

  return (
    <section
      aria-label="Assets and rigs workspace"
      className="pv1-assets"
      data-testid="pv1-assets"
    >
      <header className="pv1-assets-header">
        <div>
          <small>Assets &amp; Rigs workspace</small>
          <h1>{assetCategoryLabel(category)}</h1>
        </div>
        <span className="pv1-badge">Planning records — not assets</span>
      </header>

      <p className="pv1-assets-truth" role="note">
        Every item here is a local demo record grounded in the bounded Ollo demo
        plan — no image, file, layer, rig, or approval exists for any of them.{" "}
        <span>{ASSET_READINESS_DISCLAIMER}</span>
      </p>
      {usesLayoutDemo ? (
        <p className="pv1-layout-demo-note" role="note">
          Layout demo — these records describe the bounded Ollo demo plan, not
          assets from your script. Script-specific assets have not been planned
          or created.
        </p>
      ) : null}

      <div className="pv1-assets-controls">
        <nav aria-label="Asset categories" className="pv1-asset-categories">
          {ASSET_CATEGORIES.map((entry) => (
            <button
              aria-current={category === entry.id ? "true" : undefined}
              className={`pv1-asset-category ${category === entry.id ? "is-selected" : ""}`}
              key={entry.id}
              onClick={() => {
                closeRequest(false);
                closeReview(false);
                setCategory(entry.id);
              }}
              type="button"
            >
              {entry.label}
            </button>
          ))}
        </nav>
        <div className="pv1-asset-filters">
          <label>
            <span>Episode</span>
            <select
              aria-label="Episode filter"
              onChange={(event) => {
                closeRequest(false);
                closeReview(false);
                setScope((current) =>
                  sanitizeAssetScope({
                    ...current,
                    episodeId: event.target.value,
                  }),
                );
              }}
              value={scope.episodeId}
            >
              <option value={SCOPE_ALL}>All episodes</option>
              {ASSET_EPISODES.map((episode) => (
                <option key={episode.id} value={episode.id}>
                  {episode.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Scene</span>
            <select
              aria-label="Scene filter"
              onChange={(event) => {
                closeRequest(false);
                closeReview(false);
                setScope((current) =>
                  sanitizeAssetScope({
                    ...current,
                    sceneId: event.target.value,
                  }),
                );
              }}
              ref={sceneFilterRef}
              value={scope.sceneId}
            >
              <option value={SCOPE_ALL}>All scenes</option>
              {sceneOptions.map((scene) => {
                const index = OLLO_DEMO_SCENES.indexOf(scene);
                return (
                  <option key={scene.id} value={scene.id}>
                    Scene {index + 1} · {scene.title}
                  </option>
                );
              })}
            </select>
          </label>
        </div>
      </div>

      <section
        aria-label="Scene asset requirements"
        className="pv1-requirements"
        data-testid="pv1-requirements"
      >
        <header className="pv1-requirements-head">
          <div>
            <small>
              {scope.sceneId === SCOPE_ALL
                ? "Episode requirements summary"
                : "Scene requirements"}
            </small>
            <h2>{requirementScopeName}</h2>
          </div>
          <p className="pv1-requirements-scope-note" role="note">
            {scope.sceneId === SCOPE_ALL
              ? `Episode-scope summary across every scene of the bounded Ollo demo plan — not a selected-scene result. Choose one scene in the Scene filter for scene-scoped requirement truth. Counts derive from the ${requirementCounts.total} records listed below.`
              : `Scene-scoped planning truth for ${requirementScopeName} only — the Scene filter is the scope authority. Counts derive from the ${requirementCounts.total} records listed below.`}
          </p>
        </header>
        <p className="pv1-requirement-counts" aria-label="Requirement counts">
          <span>
            Required {requirementCounts.required} · Optional{" "}
            {requirementCounts.optional} · Reusable {requirementCounts.reusable}
          </span>
          <span>
            Ready {requirementCounts.ready} · Candidate{" "}
            {requirementCounts.candidate} · Missing {requirementCounts.missing}{" "}
            · Needs preparation {requirementCounts.needsPreparation} · Needs
            review {requirementCounts.needsReview}
          </span>
          {requirementCounts.unavailable > 0 ? (
            <span className="pv1-requirement-count-unavailable">
              Unavailable {requirementCounts.unavailable} — invalid or stale
              fixture references fail closed and are never counted as ready
            </span>
          ) : null}
        </p>
        {requirementCounts.ready > 0 ? (
          <p className="pv1-requirement-ready-note" role="note">
            {READY_LOCAL_RECORD_DISCLAIMER}
          </p>
        ) : null}
        {scopeRequirements.length === 0 ? (
          <p className="pv1-asset-empty" role="note">
            No requirement records are scoped to {requirementScopeName}. Nothing
            is hidden — this scope honestly has no requirement records yet, and
            none can be created, imported, or generated in this demo.
          </p>
        ) : (
          <ul className="pv1-requirement-list">
            {scopeRequirements.map((item) => {
              const { entry } = item;
              const isReady = entry.readiness === "ready";
              /* Exactly one row per (asset, scene): the open-record marker
               * can only exist in selected-scene mode, so an episode summary
               * never shows several current rows for one shared record. */
              const isOpen =
                scope.sceneId !== SCOPE_ALL &&
                item.asset?.id === selectedAsset?.id;
              return (
                <li
                  className={`pv1-requirement-row ${isOpen ? "is-open" : ""}`}
                  key={entry.id}
                >
                  <div className="pv1-requirement-main">
                    <strong>{entry.plannedName}</strong>
                    <small>
                      {assetCategoryLabel(entry.category)} ·{" "}
                      {REQUIREMENT_NECESSITY_LABELS[entry.necessity]}
                      {item.reusable ? " · Reusable" : ""} ·{" "}
                      {REQUIREMENT_READINESS_LABELS[entry.readiness]}
                      {scope.sceneId === SCOPE_ALL
                        ? ` · ${requirementSceneLabel(entry.sceneId)}`
                        : ""}
                    </small>
                    {item.unavailableReason !== null ? (
                      <span className="pv1-requirement-reason">
                        Unavailable — {item.unavailableReason}
                      </span>
                    ) : (
                      <span className="pv1-requirement-reason">
                        {isReady ? entry.readyExplanation : entry.blocker}{" "}
                        {isReady ? READY_LOCAL_RECORD_DISCLAIMER : ""}
                      </span>
                    )}
                    <span className="pv1-requirement-source">
                      {entry.sourceTruth}
                    </span>
                  </div>
                  <div className="pv1-requirement-actions">
                    {item.asset !== null ? (
                      <button
                        aria-label={`Open ${entry.plannedName} record for ${requirementSceneLabel(entry.sceneId)}`}
                        aria-current={isOpen ? "true" : undefined}
                        className="pv1-secondary pv1-requirement-open"
                        onClick={() => openRequirementRecord(item)}
                        type="button"
                      >
                        Open record
                      </button>
                    ) : (
                      <span className="pv1-requirement-no-record" role="note">
                        No local record exists to open.
                      </span>
                    )}
                    <span className="pv1-asset-preparation">
                      <button className="pv1-secondary" disabled type="button">
                        {entry.nextPreparation.action}
                      </button>
                      <span>{entry.nextPreparation.unavailableReason}</span>
                    </span>
                    {item.unavailableReason === null && !isReady ? (
                      <button
                        aria-controls={`pv1-request-${entry.id}`}
                        aria-expanded={openRequestId === entry.id}
                        aria-label={`Request image pack for ${entry.plannedName} in ${requirementSceneLabel(entry.sceneId)}`}
                        className="pv1-secondary pv1-requirement-request"
                        onClick={(event) => {
                          requestInvokerRef.current = event.currentTarget;
                          closeReview(false);
                          if (openRequestId === entry.id) closeRequest(true);
                          else setOpenRequestId(entry.id);
                        }}
                        type="button"
                      >
                        Request image pack
                      </button>
                    ) : null}
                    {(() => {
                      /* F4-WP4: the review action exists only for eligible
                       * character/rig/layered-set requirements. An eligible
                       * requirement without a declared example shows a
                       * truthful disabled reason; other categories omit the
                       * action entirely. The enabled control always opens a
                       * real panel — it never leads nowhere. */
                      const eligibility = reviewEligibility(item);
                      if (eligibility !== "eligible") return null;
                      const examples = reviewFixturesFor(
                        entry.id,
                        reviewFixtures,
                      );
                      if (examples.length === 0)
                        return (
                          <span className="pv1-requirement-no-review">
                            <button
                              className="pv1-secondary"
                              disabled
                              type="button"
                            >
                              {reviewActionLabel(entry.category)}
                            </button>
                            <span>{NO_REVIEW_EXAMPLE_REASON}</span>
                          </span>
                        );
                      return (
                        <button
                          aria-controls={`pv1-review-${entry.id}`}
                          aria-expanded={openReviewId === entry.id}
                          aria-label={`${reviewActionLabel(entry.category)} for ${entry.plannedName} in ${requirementSceneLabel(entry.sceneId)}`}
                          className="pv1-secondary pv1-requirement-review"
                          onClick={(event) => {
                            reviewInvokerRef.current = event.currentTarget;
                            closeRequest(false);
                            if (openReviewId === entry.id) closeReview(true);
                            else setOpenReviewId(entry.id);
                          }}
                          type="button"
                        >
                          {reviewActionLabel(entry.category)}
                        </button>
                      );
                    })()}
                    {(candidatesByRequirement[entry.id]?.length ?? 0) > 0 ? (
                      <span className="pv1-requirement-candidates" role="note">
                        Local candidate records:{" "}
                        {candidatesByRequirement[entry.id]!.length} —
                        descriptive session records only; no files exist and
                        readiness is unchanged.
                      </span>
                    ) : null}
                  </div>
                  {openRequestId === entry.id &&
                  openRequestItem !== undefined &&
                  openRequestPack !== null ? (
                    <AssetRequestImport
                      item={openRequestItem}
                      onClose={() => closeRequest(true)}
                      onConfirmRecord={(record) =>
                        setCandidatesByRequirement((current) => ({
                          ...current,
                          [entry.id]: [
                            ...(current[entry.id] ?? []),
                            record,
                          ],
                        }))
                      }
                      pack={openRequestPack}
                      reviewList={candidatesByRequirement[entry.id] ?? []}
                    />
                  ) : null}
                  {openReviewId === entry.id &&
                  openReviewItem !== undefined &&
                  openReviewFixtureList.length > 0 ? (
                    <AssetReview
                      fixtures={openReviewFixtureList}
                      item={openReviewItem}
                      onClose={() => closeReview(true)}
                      sessionCandidates={candidatesByRequirement[entry.id] ?? []}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="pv1-assets-columns">
        <section
          aria-label={`${assetCategoryLabel(category)} records in scope`}
          className="pv1-asset-list"
        >
          <h2>{scopeLabel}</h2>
          {visibleAssets.length === 0 ? (
            <p className="pv1-asset-empty" role="note">
              No {assetCategoryLabel(category).toLowerCase()} records are scoped
              to {scopeLabel}. Nothing is hidden — this scope honestly has no
              records yet, and no assets can be created or imported in this
              demo.
            </p>
          ) : (
            <ul>
              {visibleAssets.map((asset) => {
                const isSelected = asset.id === resolvedSelectedId;
                return (
                  <li key={asset.id}>
                    <button
                      aria-current={isSelected ? "true" : undefined}
                      className={`pv1-asset-item ${isSelected ? "is-selected" : ""}`}
                      onClick={() => {
                        closeReview(false);
                        setSelectedAssetId(asset.id);
                      }}
                      type="button"
                    >
                      <strong>{asset.name}</strong>
                      <small>
                        {ASSET_READINESS_LABELS[asset.readiness]} ·{" "}
                        {ASSET_FIXTURE_LABEL}
                      </small>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          aria-label="Selected asset detail"
          className="pv1-asset-detail"
        >
          {selectedAsset ? (
            <>
              <header>
                <h2>{selectedAsset.name}</h2>
                <p className="pv1-asset-detail-label" role="note">
                  {ASSET_FIXTURE_LABEL}
                </p>
              </header>
              <dl>
                <div>
                  <dt>Category</dt>
                  <dd>{assetCategoryLabel(selectedAsset.category)}</dd>
                </div>
                <div>
                  <dt>Scope</dt>
                  <dd>{assetFixtureScopeLabel(selectedAsset)}</dd>
                </div>
                <div>
                  <dt>What is known</dt>
                  <dd>{selectedAsset.summary}</dd>
                </div>
                <div>
                  <dt>Source truth</dt>
                  <dd>{selectedAsset.sourceTruth}</dd>
                </div>
                <div>
                  <dt>Approval truth</dt>
                  <dd>{selectedAsset.approvalTruth}</dd>
                </div>
                <div>
                  <dt>Readiness</dt>
                  <dd>
                    {ASSET_READINESS_LABELS[selectedAsset.readiness]} —{" "}
                    {ASSET_READINESS_NOTES[selectedAsset.readiness]}
                  </dd>
                </div>
                <div>
                  <dt>Scene requirement</dt>
                  <dd className="pv1-asset-scene-requirement">
                    {selectedSceneRequirement ? (
                      <>
                        {selectedSceneRequirement.unavailableReason !== null ? (
                          <>
                            Unavailable —
                            {selectedSceneRequirement.unavailableReason}
                          </>
                        ) : (
                          <>
                            {
                              REQUIREMENT_NECESSITY_LABELS[
                                selectedSceneRequirement.entry.necessity
                              ]
                            }
                            {selectedSceneRequirement.reusable
                              ? " · Reusable"
                              : ""}{" "}
                            ·{" "}
                            {
                              REQUIREMENT_READINESS_LABELS[
                                selectedSceneRequirement.entry.readiness
                              ]
                            }{" "}
                            in {requirementSceneLabel(scope.sceneId)} —{" "}
                            {selectedSceneRequirement.entry.readiness ===
                            "ready"
                              ? selectedSceneRequirement.entry.readyExplanation
                              : selectedSceneRequirement.entry.blocker}{" "}
                            {selectedSceneRequirement.entry.readiness ===
                            "ready"
                              ? READY_LOCAL_RECORD_DISCLAIMER
                              : ""}
                          </>
                        )}
                      </>
                    ) : scope.sceneId === SCOPE_ALL ? (
                      <>
                        Scene-scoped requirement truth appears here when one
                        scene is selected in the Scene filter. The summary above
                        covers {requirementScopeName} and is not a
                        selected-scene result.
                      </>
                    ) : (
                      <>
                        No requirement record exists for this asset in{" "}
                        {requirementSceneLabel(scope.sceneId)} — an honest gap
                        in the bounded fixture, never a hidden ready state.
                      </>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Next preparation</dt>
                  <dd className="pv1-asset-preparation">
                    <button className="pv1-secondary" disabled type="button">
                      {selectedAsset.nextPreparation.action}
                    </button>
                    <span>
                      {selectedAsset.nextPreparation.unavailableReason}
                    </span>
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="pv1-asset-empty" role="note">
              Nothing selected — the current category and filters form an honest
              empty scope. Choosing a wider scene filter or another category
              shows its records; no record is kept hidden from an earlier scope.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
