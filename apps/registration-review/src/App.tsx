import { useEffect, useMemo, useState } from "react";
import type { RegistrationReviewHost } from "./host";
import type {
  RegistrationReviewPresentation,
  RegistrationViewId,
} from "./presentation-model";
import { DiagnosticStage } from "./components/DiagnosticStage";
import { EmptyState } from "./components/EmptyState";
import { IssueStrip } from "./components/IssueStrip";
import { RequirementInspector } from "./components/RequirementInspector";
import { TopBar } from "./components/TopBar";
import { ViewRail } from "./components/ViewRail";
import "./registration-review.css";

export function RegistrationReviewApp({
  host,
}: {
  host: RegistrationReviewHost;
}) {
  const [presentation, setPresentation] =
    useState<RegistrationReviewPresentation | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedView, setSelectedView] = useState<RegistrationViewId>("front");
  const [selectedRequirementId, setSelectedRequirementId] = useState<
    string | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    host.loadPresentation().then((model) => {
      if (cancelled) return;
      setPresentation(model);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [host]);

  const view = useMemo(
    () => presentation?.views.find((entry) => entry.view === selectedView),
    [presentation, selectedView],
  );
  const selectedRequirement = useMemo(
    () =>
      view?.unresolvedRequirements.find(
        (requirement) => requirement.requirementId === selectedRequirementId,
      ) ?? null,
    [selectedRequirementId, view],
  );

  // Stale-selection safety: a replacement model that lacks the prior item
  // resets selection to the view's first unresolved requirement (or none).
  useEffect(() => {
    if (!view) return;
    if (
      selectedRequirementId &&
      !view.unresolvedRequirements.some(
        (requirement) => requirement.requirementId === selectedRequirementId,
      )
    ) {
      setSelectedRequirementId(
        view.unresolvedRequirements[0]?.requirementId ?? null,
      );
    }
    if (!selectedRequirementId && view.unresolvedRequirements[0]) {
      setSelectedRequirementId(view.unresolvedRequirements[0].requirementId);
    }
  }, [selectedRequirementId, view]);

  if (!loaded) return null;
  if (!presentation) return <EmptyState />;

  return (
    <main className="rr-app">
      <TopBar aggregate={presentation.aggregate} candidate={presentation.candidate} />
      {presentation.isTestFixture ? (
        <p className="rr-fixture-banner" role="note">
          TEST FIXTURE — NOT PRODUCTION EVIDENCE
        </p>
      ) : null}
      <div className="rr-workspace">
        <ViewRail
          onSelectView={setSelectedView}
          selectedView={selectedView}
          views={presentation.views}
        />
        <div className="rr-stage-column">
          <DiagnosticStage view={view!} />
          <IssueStrip
            onSelectRequirement={setSelectedRequirementId}
            selectedRequirementId={selectedRequirementId}
            views={presentation.views}
          />
        </div>
        <RequirementInspector
          requirement={selectedRequirement}
          view={view!}
        />
      </div>
      <footer className="rr-authority-footer">
        Candidate evidence only · no runtime node · no motion channel · no
        production binding
      </footer>
    </main>
  );
}
