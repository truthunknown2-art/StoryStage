import type {
  RegistrationViewId,
  RegistrationViewModel,
} from "../presentation-model";

const VIEW_LABELS: Record<RegistrationViewId, string> = {
  front: "Front",
  "profile-left": "Profile left",
  "profile-right": "Profile right",
};

const TYPE_LABELS: Record<string, string> = {
  "articulation-distal": "Parent socket",
  "articulation-proximal": "Parent socket",
  "mask-only": "Scarf mask-only",
  "rigid-registration": "Rigid registration",
};

export function IssueStrip({
  onSelectRequirement,
  selectedRequirementId,
  views,
}: {
  onSelectRequirement: (requirementId: string) => void;
  selectedRequirementId: string | null;
  views: RegistrationViewModel[];
}) {
  const groups = views.map((view) => ({
    view: view.view,
    items: view.unresolvedRequirements,
  }));
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <section aria-label="Unresolved requirements" className="rr-issue-strip">
      <header>
        <small>Unresolved requirements</small>
        <strong>{total} open</strong>
      </header>
      <div className="rr-issue-groups">
        {groups.map((group) => (
          <div className="rr-issue-group" key={group.view}>
            <small>{VIEW_LABELS[group.view]}</small>
            {group.items.map((requirement) => (
              <button
                aria-pressed={
                  requirement.requirementId === selectedRequirementId
                }
                className={
                  requirement.requirementId === selectedRequirementId
                    ? "is-selected"
                    : ""
                }
                key={requirement.requirementId}
                onClick={() =>
                  onSelectRequirement(requirement.requirementId)
                }
                type="button"
              >
                <em>{TYPE_LABELS[requirement.featureClass]}</em>
                <strong>{requirement.requirementId}</strong>
              </button>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
