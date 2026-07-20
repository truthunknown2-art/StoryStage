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
import type { RegistrationReviewPresentation } from "./presentation-model";

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
    expect(cards[0]).toHaveTextContent("29 components · 32 joints");
    expect(cards[0]).toHaveTextContent("3 unresolved");
    expect(cards[1]).toHaveTextContent("3 unresolved");
    expect(cards[2]).toHaveTextContent("2 unresolved");
    expect(cards[2]).toHaveTextContent("34 joints");
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
});
