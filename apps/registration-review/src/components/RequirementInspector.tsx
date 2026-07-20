import { FileQuestion, ShieldAlert } from "lucide-react";
import type {
  RegistrationViewModel,
  UnresolvedRequirement,
} from "../presentation-model";

const humanize = (value: string) => value.replaceAll("-", " ");

export function RequirementInspector({
  requirement,
  view,
}: {
  requirement: UnresolvedRequirement | null;
  view: RegistrationViewModel;
}) {
  if (!requirement) {
    return (
      <aside aria-label="Requirement inspector" className="rr-inspector">
        <div className="rr-inspector-empty">
          <FileQuestion size={18} />
          <p>No unresolved requirement selected in the {view.view} view.</p>
        </div>
      </aside>
    );
  }

  const isMaskOnly = requirement.featureClass === "mask-only";

  return (
    <aside aria-label="Requirement inspector" className="rr-inspector">
      <header className="rr-inspector-header">
        <span>
          <ShieldAlert size={16} />
        </span>
        <div>
          <small>Unresolved requirement</small>
          <h2>{requirement.requirementId}</h2>
        </div>
      </header>
      <dl className="rr-facts">
        <div>
          <dt>Component role</dt>
          <dd>{humanize(requirement.componentRole)}</dd>
        </div>
        <div>
          <dt>Feature class</dt>
          <dd>{humanize(requirement.featureClass)}</dd>
        </div>
        <div>
          <dt>Topology edge</dt>
          <dd>
            {requirement.topologyEdge
              ? `${requirement.topologyEdge.parentRole} → ${requirement.topologyEdge.childRole} · socket ${requirement.topologyEdge.socketId}`
              : "none (mask-only support)"}
          </dd>
        </div>
        <div>
          <dt>Measurement status</dt>
          <dd>
            {humanize(requirement.status)} · {requirement.reasonCode}
          </dd>
        </div>
        <div>
          <dt>Evidence basis</dt>
          <dd>{humanize(requirement.displayBasis)}</dd>
        </div>
        <div>
          <dt>Source feature IDs</dt>
          <dd>
            {requirement.sourceFeatureIds.length > 0
              ? requirement.sourceFeatureIds.join(", ")
              : "none bound"}
          </dd>
        </div>
        <div>
          <dt>Proposal state</dt>
          <dd>{requirement.proposalState}</dd>
        </div>
      </dl>
      <p className="rr-inspector-detail">{requirement.detail}</p>

      {isMaskOnly ? (
        <section aria-label="Mask evidence" className="rr-mask-evidence">
          <h3>Mask evidence</h3>
          {view.maskSummaries.length > 0 ? (
            view.maskSummaries.map((mask) => (
              <dl className="rr-facts" key={mask.componentId}>
                <div>
                  <dt>Nearest measured component</dt>
                  <dd>
                    {mask.componentId} ({mask.semanticRole})
                  </dd>
                </div>
                <div>
                  <dt>Original PNG hash</dt>
                  <dd>
                    <code>{mask.originalPngContentHash.slice(0, 16)}…</code>
                  </dd>
                </div>
                <div>
                  <dt>Masked PNG hash</dt>
                  <dd>
                    <code>{mask.maskedPngContentHash.slice(0, 16)}…</code>
                  </dd>
                </div>
                <div>
                  <dt>Masked pixels</dt>
                  <dd>{mask.maskedPixelCount.toLocaleString()}</dd>
                </div>
                <div>
                  <dt>View mask entries</dt>
                  <dd>{mask.viewMaskEntryCount}</dd>
                </div>
              </dl>
            ))
          ) : (
            <p>No component mask-derivation entries exist for this view.</p>
          )}
          <p className="rr-mask-note">
            No isolable mask exists for this requirement. Decorative scarf
            support is alpha-indistinguishable from the semantic artwork, so
            alpha alone cannot authorize a hinge or a complete mask. The
            requirement stays blocked pending human correction or regenerated
            source art.
          </p>
        </section>
      ) : null}

      {view.joints.length > 0 ? (
        <section aria-label="Joint orbit samples" className="rr-joints">
          <h3>Joint/orbit samples (supplied)</h3>
          <table>
            <thead>
              <tr>
                <th scope="col">Joint</th>
                <th scope="col">−15°</th>
                <th scope="col">0°</th>
                <th scope="col">+15°</th>
              </tr>
            </thead>
            <tbody>
              {view.joints.map((joint) => (
                <tr key={joint.attachmentId}>
                  <th scope="row">
                    {joint.parentRole}:{joint.socketId}
                  </th>
                  {joint.angles.map((angle) => (
                    <td data-heat={angle.heat} key={angle.angleDegrees}>
                      {(angle.gapMicropixels / 1_000_000).toFixed(1)}px ·{" "}
                      {angle.heat}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </aside>
  );
}
