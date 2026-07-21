import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import captureReceipt from "../../../reports/evidence/E1-WP3/capture-receipt.json";
import { E1DirectorLabApp } from "./App";
import { liveProposalLabModel } from "./model";

describe("E1 Director proposal lab", () => {
  it("shows the exact live scope and keeps Apply permanently disabled", () => {
    render(<E1DirectorLabApp host={{ model: liveProposalLabModel }} />);

    expect(screen.getByText("Ollo & Friends")).toBeVisible();
    expect(
      screen.getByText(liveProposalLabModel.proposal.summary),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Apply disabled" }),
    ).toBeDisabled();
    expect(screen.getByText(/live recorded round trip/i)).toBeVisible();
    expect(captureReceipt.authority).toEqual({
      previewAvailable: true,
      rejectAvailable: true,
      applyEnabled: false,
    });
    expect(captureReceipt.mcpIsolation).toMatchObject({
      proofStatus: "passed-before-prompt",
      onlyStoryStageMcpEnabled: true,
      inheritedServerCount: 0,
    });
  });

  it("previews and rejects locally without enabling Apply", async () => {
    const user = userEvent.setup();
    render(<E1DirectorLabApp host={{ model: liveProposalLabModel }} />);

    await user.click(screen.getByRole("button", { name: "Preview proposal" }));
    expect(
      screen.getByRole("region", { name: "Proposal preview" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Reject" }));

    expect(screen.getByText("Rejected locally")).toBeVisible();
    expect(screen.getByRole("button", { name: "Rejected" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Apply disabled" }),
    ).toBeDisabled();
  });
});
