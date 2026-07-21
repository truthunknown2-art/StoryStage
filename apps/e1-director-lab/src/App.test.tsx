import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { E1DirectorLabApp } from "./App";
import { liveProposalLabModel } from "./model";

describe("E1 Director proposal lab", () => {
  it("shows the exact blocked scope and keeps every review action disabled", () => {
    render(<E1DirectorLabApp host={{ model: liveProposalLabModel }} />);

    expect(screen.getByText("Ollo & Friends")).toBeVisible();
    expect(
      screen.getByText(liveProposalLabModel.proposal.summary),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Apply disabled" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Preview unavailable" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Reject unavailable" }),
    ).toBeDisabled();
    expect(screen.getByText(/credential boundary blocker/i)).toBeVisible();
    expect(screen.getByRole("region", { name: "Security blocker" })).toBeVisible();
  });
});
