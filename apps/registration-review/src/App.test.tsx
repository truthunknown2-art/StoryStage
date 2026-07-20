import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { RegistrationReviewApp } from "./App";
import {
  registrationReviewFixture,
  registrationReviewFixtureWithMissingImages,
} from "./fixture-model";
import {
  emptyRegistrationReviewHost,
  fixtureRegistrationReviewHost,
} from "./host";
import type {
  DiagnosticTabKind,
  RegistrationReviewPresentation,
} from "./presentation-model";

const fixtureHost = () =>
  fixtureRegistrationReviewHost(registrationReviewFixture);

const missingImagesHost = () =>
  fixtureRegistrationReviewHost(registrationReviewFixtureWithMissingImages);

afterEach(cleanup);

describe("private rig lab — registration review", () => {
  it("renders the polished empty state when no artifact is supplied", async () => {
    render(<RegistrationReviewApp host={emptyRegistrationReviewHost} />);
    expect(
      await screen.findByText("No verified registration artifact loaded."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/candidate evidence only · no runtime node/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("TEST FIXTURE — NOT PRODUCTION EVIDENCE")).not.toBeInTheDocument();
  });

  it("marks the fixture persistently so it cannot be mistaken for real evidence", async () => {
    render(<RegistrationReviewApp host={fixtureHost()} />);
    expect(
      await screen.findByText("TEST FIXTURE — NOT PRODUCTION EVIDENCE"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^approved$/i)).not.toBeInTheDocument();
  });

  it("renders all three view states with model-derived counts in source order", async () => {
    render(<RegistrationReviewApp host={fixtureHost()} />);
    const rail = await screen.findByRole("navigation", {
      name: "Registration views",
    });
    const cards = within(rail).getAllByRole("button");
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveTextContent("Front");
    expect(cards[1]).toHaveTextContent("Profile left");
    expect(cards[2]).toHaveTextContent("Profile right");
    // Exact v8 joint-evidence set counts: 32 / 29 / 29 (never a
    // sockets-plus-attachments sum).
    expect(cards[0]).toHaveTextContent("29 components · 32 joints");
    expect(cards[1]).toHaveTextContent("29 components · 29 joints");
    expect(cards[2]).toHaveTextContent("29 components · 29 joints");
    expect(cards[0]).toHaveTextContent("3 unresolved");
    expect(cards[1]).toHaveTextContent("3 unresolved");
    expect(cards[2]).toHaveTextContent("2 unresolved");
  });

  it("pins the exact v8 joint-evidence counts 32/29/29", () => {
    const counts = registrationReviewFixture.views.map(
      (view) => [view.view, view.counts.joints] as const,
    );
    expect(counts).toEqual([
      ["front", 32],
      ["profile-left", 29],
      ["profile-right", 29],
    ]);
    // The joint/orbit tables are the complete gap-orbit sample sets and are
    // labelled separately from joint-evidence counts.
    expect(
      registrationReviewFixture.views.map((view) => view.joints.length),
    ).toEqual([16, 16, 17]);
  });

  it("renders exactly the 8 unresolved items from the supplied model, not constants", async () => {
    render(<RegistrationReviewApp host={fixtureHost()} />);
    const strip = await screen.findByRole("region", {
      name: "Unresolved requirements",
    });
    expect(within(strip).getAllByRole("button")).toHaveLength(8);
    expect(strip).toHaveTextContent("8 open");
    expect(strip).toHaveTextContent("front-pelvis-tail-base-distal");
    expect(strip).toHaveTextContent("profile-left-pelvis-tail-base-distal");
    expect(
      within(strip).getAllByText(/secondary-(back|front)-mask/),
    ).toHaveLength(6);
  });

  it("selecting a view changes the stage view and inspector selection", async () => {
    const user = userEvent.setup();
    render(<RegistrationReviewApp host={fixtureHost()} />);
    const rail = await screen.findByRole("navigation", {
      name: "Registration views",
    });
    await user.click(within(rail).getByRole("button", { name: /Profile right/ }));
    expect(
      await screen.findByRole("heading", {
        name: "profile-right-secondary-back-mask",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /pelvis-tail-base-distal/ }),
    ).not.toBeInTheDocument();
  });

  it("selecting an issue focuses the exact corresponding inspector evidence", async () => {
    const user = userEvent.setup();
    render(<RegistrationReviewApp host={fixtureHost()} />);
    const strip = await screen.findByRole("region", {
      name: "Unresolved requirements",
    });
    await user.click(
      within(strip).getByRole("button", {
        name: /front-secondary-front-mask/,
      }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "front-secondary-front-mask",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Decorative scarf support blends/)).toBeInTheDocument();
    expect(
      screen.getAllByText(/alpha alone cannot authorize a hinge/i).length,
    ).toBeGreaterThan(0);
  });

  it("selecting issues in other views atomically switches view and requirement", async () => {
    const user = userEvent.setup();
    render(<RegistrationReviewApp host={fixtureHost()} />);
    const rail = await screen.findByRole("navigation", {
      name: "Registration views",
    });
    const strip = await screen.findByRole("region", {
      name: "Unresolved requirements",
    });

    // Begin on Front and select a Profile left issue: rail, stage, selected
    // requirement, and inspector must all agree on Profile left.
    await user.click(
      within(strip).getByRole("button", {
        name: /profile-left-pelvis-tail-base-distal/,
      }),
    );
    expect(
      within(rail).getByRole("button", { name: /Profile left/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      await screen.findByRole("heading", {
        name: "profile-left-pelvis-tail-base-distal",
      }),
    ).toBeInTheDocument();
    expect(
      within(strip).getByRole("button", {
        name: /profile-left-pelvis-tail-base-distal/,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("img", { name: /profile-left view/ }),
    ).toBeInTheDocument();

    // Now select a Profile right issue from Profile left: everything must
    // move to Profile right and the stale-selection guard must not replace
    // the selection with a Front or leftover requirement.
    await user.click(
      within(strip).getByRole("button", {
        name: /profile-right-secondary-back-mask/,
      }),
    );
    expect(
      within(rail).getByRole("button", { name: /Profile right/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      await screen.findByRole("heading", {
        name: "profile-right-secondary-back-mask",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /pelvis-tail-base-distal/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /profile-right view/ }),
    ).toBeInTheDocument();

    // And back to Front via the issue strip.
    await user.click(
      within(strip).getByRole("button", {
        name: /front-pelvis-tail-base-distal/,
      }),
    );
    expect(
      within(rail).getByRole("button", { name: /Front/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      await screen.findByRole("heading", {
        name: "front-pelvis-tail-base-distal",
      }),
    ).toBeInTheDocument();
  });

  it("shows the exact supplied image per tab and explicit unavailable states otherwise", async () => {
    const user = userEvent.setup();
    render(<RegistrationReviewApp host={missingImagesHost()} />);
    const tabs = await screen.findByRole("tablist", {
      name: "Diagnostic tabs",
    });
    const tabButtons = within(tabs).getAllByRole("tab");
    expect(tabButtons).toHaveLength(9);
    for (const tab of tabButtons) {
      await user.click(tab);
      const missing = tab.textContent?.includes("unavailable");
      if (missing) {
        expect(
          await screen.findByText("Evidence unavailable"),
        ).toBeInTheDocument();
        expect(
          screen.queryByRole("img", { name: /diagnostic evidence/ }),
        ).not.toBeInTheDocument();
      } else {
        const image = await screen.findByRole("img", {
          name: /diagnostic evidence/,
        });
        expect(image.getAttribute("src")).toMatch(/^\/evidence\//);
        expect(
          screen.queryByText("Evidence unavailable"),
        ).not.toBeInTheDocument();
      }
    }
  });

  it("exposes no approval, export, render, or publish controls", async () => {
    render(<RegistrationReviewApp host={fixtureHost()} />);
    await screen.findByRole("navigation", { name: "Registration views" });
    for (const forbidden of ["Approve", "Export", "Render", "Publish"]) {
      expect(
        screen.queryByRole("button", { name: new RegExp(forbidden, "i") }),
      ).not.toBeInTheDocument();
    }
    expect(screen.queryByLabelText("Remotion animation")).not.toBeInTheDocument();
  });

  it("keeps locked authority labels visible in the top bar and footer", async () => {
    render(<RegistrationReviewApp host={fixtureHost()} />);
    expect(
      await screen.findByText("Needs registration correction"),
    ).toBeInTheDocument();
    expect(screen.getByText("Unapproved evidence")).toBeInTheDocument();
    expect(screen.getByText("Motion locked")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Candidate evidence only · no runtime node · no motion channel · no production binding/,
      ),
    ).toBeInTheDocument();
  });

  it("supports keyboard navigation across the view rail", async () => {
    const user = userEvent.setup();
    render(<RegistrationReviewApp host={fixtureHost()} />);
    const rail = await screen.findByRole("navigation", {
      name: "Registration views",
    });
    const cards = within(rail).getAllByRole("button");
    cards[0]!.focus();
    await user.keyboard("{ArrowDown}");
    expect(cards[1]).toHaveAttribute("aria-pressed", "true");
    await user.keyboard("{ArrowDown}");
    expect(cards[2]).toHaveAttribute("aria-pressed", "true");
    await user.keyboard("{ArrowUp}");
    expect(cards[1]).toHaveAttribute("aria-pressed", "true");
  });

  it("resets stale selection safely when a replacement model lacks the prior item", async () => {
    const user = userEvent.setup();
    const firstHost = fixtureHost();
    const { rerender } = render(<RegistrationReviewApp host={firstHost} />);
    const strip = await screen.findByRole("region", {
      name: "Unresolved requirements",
    });
    await user.click(
      within(strip).getByRole("button", {
        name: /front-pelvis-tail-base-distal/,
      }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "front-pelvis-tail-base-distal",
      }),
    ).toBeInTheDocument();

    const reduced: RegistrationReviewPresentation = {
      ...registrationReviewFixture,
      views: registrationReviewFixture.views.map((view) =>
        view.view === "front"
          ? {
              ...view,
              unresolvedRequirements: view.unresolvedRequirements.filter(
                (requirement) =>
                  requirement.requirementId !== "front-pelvis-tail-base-distal",
              ),
            }
          : view,
      ),
    };
    rerender(
      <RegistrationReviewApp
        host={fixtureRegistrationReviewHost(reduced)}
      />,
    );
    expect(
      await screen.findByRole("heading", {
        name: "front-secondary-back-mask",
      }),
    ).toBeInTheDocument();
  });

  it("zoom control genuinely changes the stage canvas state", async () => {
    const user = userEvent.setup();
    render(<RegistrationReviewApp host={fixtureHost()} />);
    const fit = await screen.findByRole("button", { name: "Fit" });
    const full = screen.getByRole("button", { name: "100%" });
    const canvas = document.querySelector(".rr-stage-canvas")!;
    expect(canvas.className).not.toContain("is-full-zoom");
    await user.click(full);
    expect(canvas.className).toContain("is-full-zoom");
    await user.click(fit);
    expect(canvas.className).not.toContain("is-full-zoom");
  });

  it("presents the exact URL and full SHA-256 for every available tab", async () => {
    const user = userEvent.setup();
    render(<RegistrationReviewApp host={fixtureHost()} />);
    const tabs = await screen.findByRole("tablist", {
      name: "Diagnostic tabs",
    });
    for (const image of registrationReviewFixture.views[0]!.images) {
      const tabLabel = TAB_LABELS_FOR_TEST[image.kind];
      await user.click(
        within(tabs).getByRole("tab", { name: new RegExp(tabLabel) }),
      );
      const rendered = await screen.findByRole("img", {
        name: /diagnostic evidence/,
      });
      expect(rendered.getAttribute("src")).toBe(image.url);
      expect(
        screen.getByText(`sha256 ${image.sha256}`),
      ).toBeInTheDocument();
      expect(
        screen.getByText(image.url!, { selector: "code" }),
      ).toBeInTheDocument();
    }
  });

  it("pins the exact profile-right seams/rest bindings against the known swap", () => {
    const right = registrationReviewFixture.views.find(
      (view) => view.view === "profile-right",
    )!;
    const byKind = Object.fromEntries(
      right.images.map((image) => [image.kind, image.sha256]),
    );
    // Under the rejected swap these two pins fail: seams must not carry the
    // rest hash, and rest must not carry the −15° hash.
    expect(byKind["seams"]).toBe(
      "3d28b985a696572d0e61db1c068ccf0a450005bf93c4571d9f9a3659f4041329",
    );
    expect(byKind["rest"]).toBe(
      "e8b6d83e672b7612281eea1287773e65341197b6126b03e57e95df8eacdc6244",
    );
    expect(byKind["minus-15"]).toBe(
      "5f5d72e0a9e3034ec39ba69f16b28252cb99a931f4daf903f67dd2b8e75e46be",
    );
  });

  it("exposes the selected view's exact measurement, proposal, and gate hashes", async () => {
    render(<RegistrationReviewApp host={fixtureHost()} />);
    const inspector = await screen.findByRole("complementary", {
      name: "Requirement inspector",
    });
    const front = registrationReviewFixture.views[0]!;
    expect(inspector).toHaveTextContent(front.measurementReportContentHash);
    expect(inspector).toHaveTextContent(front.effectiveProposalContentHash);
    expect(inspector).toHaveTextContent(front.gateContentHash);
  });

  it("implements roving diagnostic tabs with arrow-key selection and a labelled panel", async () => {
    const user = userEvent.setup();
    render(<RegistrationReviewApp host={fixtureHost()} />);
    const tabs = await screen.findByRole("tablist", {
      name: "Diagnostic tabs",
    });
    const tabButtons = within(tabs).getAllByRole("tab");
    // One tab stop: only the active tab is in the tab order.
    expect(
      tabButtons.filter((tab) => tab.getAttribute("tabindex") === "0"),
    ).toHaveLength(1);
    expect(tabButtons[0]).toHaveAttribute("tabindex", "0");

    tabButtons[0]!.focus();
    await user.keyboard("{ArrowRight}");
    const seamsTab = within(tabs).getByRole("tab", { name: /Seams/ });
    expect(seamsTab).toHaveAttribute("aria-selected", "true");
    expect(seamsTab).toHaveAttribute("tabindex", "0");
    expect(seamsTab).toHaveFocus();
    expect(tabButtons[0]).toHaveAttribute("tabindex", "-1");

    await user.keyboard("{ArrowLeft}");
    expect(tabButtons[0]).toHaveAttribute("aria-selected", "true");
    expect(tabButtons[0]).toHaveFocus();

    // tab/tabpanel relationship: the active tab labels the panel it controls.
    const panel = screen.getByRole("tabpanel");
    expect(tabButtons[0]).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveAttribute("aria-labelledby", tabButtons[0]!.id);
  });

  it("enforces the 44px target contract, fixed footer, and reduced-motion rule in the stylesheet", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/registration-review.css"),
      "utf8",
    );
    const block = (selector: string) => {
      const match = css.match(
        new RegExp(`${selector.replaceAll(".", "\\.")} \\{[^}]*\\}`),
      );
      expect(match, `missing rule for ${selector}`).not.toBeNull();
      return match![0];
    };
    expect(block(".rr-stage-tabs button")).toContain("min-height: 44px");
    expect(block(".rr-stage-zoom button")).toContain("min-height: 44px");
    expect(block(".rr-stage-zoom button")).toContain("min-width: 44px");
    expect(block(".rr-issue-group button")).toContain("min-height: 44px");
    expect(block(".rr-authority-footer")).toContain("position: fixed");
    expect(block(".rr-joints-scroll")).toContain("overflow-x: auto");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(":focus-visible");
  });
});

const TAB_LABELS_FOR_TEST: Record<DiagnosticTabKind, string> = {
  original: "Original",
  seams: "Seams",
  rest: "Rest",
  "minus-15": "−15°",
  zero: "0°",
  "plus-15": "\\+15°",
  "gap-orbit": "Gap/orbit",
  "z-order-near-far": "Near/far",
  masked: "Masked",
};
