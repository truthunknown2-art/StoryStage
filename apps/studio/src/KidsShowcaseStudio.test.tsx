import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  KidsShowcaseStudio,
  KIDS_SHOWCASE_DOWNLOAD_URL,
} from "./KidsShowcaseStudio";

const playerHarness = vi.hoisted(() => ({
  addEventListener: vi.fn(),
  isPlaying: vi.fn(() => false),
  pause: vi.fn(),
  play: vi.fn(),
  removeEventListener: vi.fn(),
  requestFullscreen: vi.fn(),
  seekTo: vi.fn(),
  listeners: {} as Record<
    string,
    (event: { detail: { frame: number } }) => void
  >,
}));

vi.mock("@remotion/player", async () => {
  const React = await import("react");
  playerHarness.addEventListener.mockImplementation(
    (
      name: string,
      listener: (event: { detail: { frame: number } }) => void,
    ) => {
      playerHarness.listeners[name] = listener;
    },
  );
  playerHarness.removeEventListener.mockImplementation((name: string) => {
    delete playerHarness.listeners[name];
  });
  return {
    Player: React.forwardRef(function MockPlayer(
      _props: Record<string, unknown>,
      ref: React.ForwardedRef<unknown>,
    ) {
      React.useImperativeHandle(ref, () => playerHarness);
      return <div aria-label="Remotion animation" role="img" />;
    }),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  playerHarness.listeners = {};
});

describe("Kids showcase transport", () => {
  it("offers the exact published 30-second render for download", () => {
    render(<KidsShowcaseStudio onBack={vi.fn()} />);

    expect(
      screen.getByRole("link", {
        name: "Download current 30-second MP4",
      }),
    ).toHaveAttribute("href", KIDS_SHOWCASE_DOWNLOAD_URL);
  });

  it("seeks the player and the directed workspace from range input", () => {
    render(<KidsShowcaseStudio onBack={vi.fn()} />);

    fireEvent.input(screen.getByRole("slider", { name: "Showcase playhead" }), {
      target: { value: "580" },
    });

    expect(playerHarness.seekTo).toHaveBeenLastCalledWith(580);
    expect(screen.getByText("0:19.33")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "The spark sneeze" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("slider", { name: "Showcase playhead" }),
    ).toHaveValue("580");
  });

  it("uses Player frame events as the displayed playback clock", () => {
    render(<KidsShowcaseStudio onBack={vi.fn()} />);

    act(() => {
      playerHarness.listeners.frameupdate?.({ detail: { frame: 820 } });
    });

    expect(screen.getByText("0:27.33")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Offer and hesitate" }),
    ).toBeInTheDocument();
  });
});
