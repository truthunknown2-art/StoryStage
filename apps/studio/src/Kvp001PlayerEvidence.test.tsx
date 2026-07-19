import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@remotion/player", () => ({
  Player: ({
    inputProps,
  }: {
    inputProps: { episodePlan: { contentHash: string } };
  }) => (
    <div
      data-testid="production-player"
      data-episode-hash={inputProps.episodePlan.contentHash}
    />
  ),
}));

import {
  createKvp001PlayerEvidenceState,
  Kvp001PlayerEvidence,
} from "./Kvp001PlayerEvidence";

describe("KVP-001 real Player evidence surface", () => {
  it("compiles the exact proof shot into a sealed production episode", () => {
    const first = createKvp001PlayerEvidenceState();
    const second = createKvp001PlayerEvidenceState();

    expect(first.proofShot).toMatchObject({
      startFrame: 0,
      endFrameExclusive: 140,
    });
    expect(first.directorProject.contentHash).toBe(
      second.directorProject.contentHash,
    );
    expect(first.directorProject.executableEpisodePlan.contentHash).toBe(
      second.directorProject.executableEpisodePlan.contentHash,
    );
  });

  it("mounts the production Director Player with that exact sealed episode", () => {
    const evidence = createKvp001PlayerEvidenceState();
    render(<Kvp001PlayerEvidence />);

    expect(
      screen.getByRole("heading", { name: /canonical Player path/i }),
    ).toBeVisible();
    expect(screen.getByTestId("production-player")).toHaveAttribute(
      "data-episode-hash",
      evidence.directorProject.executableEpisodePlan.contentHash,
    );
    expect(
      screen.getByText(/does not claim that the ordinary planner/i),
    ).toBeVisible();
  });
});
