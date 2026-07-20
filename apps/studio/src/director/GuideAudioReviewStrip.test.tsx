import {
  cleanup,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createCv002ArtDirectionSelection,
  createCv002Project,
} from "@storystage/story-engine";
import {
  alphaCapabilityRegistry,
  compileDirectorProject,
} from "@storystage/story-engine/director-alpha";
import type { DirectorGuideAudioPlayback } from "@storystage/remotion-runtime/director";
import { Cv002DraftReview } from "../Cv002DraftReview";
import { createGuideAudioFixturePlayback } from "./guide-audio-dev-fixture";

const playerHarness = vi.hoisted(() => ({
  lastProps: null as Record<string, unknown> | null,
  reset() {
    this.lastProps = null;
  },
}));

vi.mock("@remotion/player", async () => {
  const React = await import("react");
  return {
    Player: React.forwardRef(function MockPlayer(
      props: Record<string, unknown>,
      ref,
    ) {
      playerHarness.lastProps = props;
      React.useImperativeHandle(ref, () => ({
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        getCurrentFrame: () => 0,
        isPlaying: () => false,
        seekTo: vi.fn(),
        play: vi.fn(),
        pause: vi.fn(),
      }));
      return <div aria-label="Remotion animation" role="img" />;
    }),
  };
});

afterEach(() => {
  cleanup();
  playerHarness.reset();
  window.localStorage.clear();
});

const createProject = () =>
  createCv002Project(
    "Guide audio review",
    [
      "Ollo spots a soft green glow beyond the den door. He tilts his head, listens to the quiet hum, and takes one careful step toward it. The glow pulses gently, like it is breathing, and Ollo decides it must be friendly.",
      "He follows the glow down the hallway, past the stack of picture books and the sleeping cat. Each step makes the light a little brighter and the hum a little warmer, until he finds a small lantern sitting on the windowsill.",
      "The lantern flickers as Ollo reaches out and lifts it with both paws. It is lighter than he expected, and warm like morning sun. He carries it back to the den, sets it by the door, and smiles because the hallway is not dark anymore.",
    ].join("\n\n"),
    "kids-adventure",
    createCv002ArtDirectionSelection(
      "kids-adventure",
      "storybook-watercolor-paper-cutout",
    ),
  );

// Mirrors the app's Kids Adventure sample (Cv001CreatorApp OLLO_FRIENDS_SAMPLE)
// — the only fixture with a reaction beat the patch interpreter accepts.
const KIDS_SAMPLE_SCRIPT = `Ollo bounces down the forest path, certain that today hides an adventure. Tix flutters beside him, asking him to slow down and look carefully. A soft golden glow drifts between the ferns, and Dot floats after it without a sound.

The glow slips under the roots of an old oak and becomes a tiny leaf-shaped lantern. Ollo gasps, then reaches for it with both paws before Tix can whisper a warning. The lantern flickers awake, and a gentle voice introduces itself as the Storylight, a guide who loves stories and lights the way.

Ollo gasps with delight, then promises to carry the Storylight carefully while Tix sighs with relief. The lantern glows brighter, drawing a warm trail through the trees. Dot lands on Ollo's scarf, and together the friends follow the light toward the oldest story in the Little Wood.`;

const createKidsSampleProject = () =>
  createCv002Project(
    "The Storylight in the Little Wood",
    KIDS_SAMPLE_SCRIPT,
    "kids-adventure",
    createCv002ArtDirectionSelection(
      "kids-adventure",
      "storybook-watercolor-paper-cutout",
    ),
  );

const createFixturePlayback = (
  project: ReturnType<typeof createProject>,
): DirectorGuideAudioPlayback => {
  const director = compileDirectorProject({
    storyProject: project,
    capabilities: alphaCapabilityRegistry,
  });
  // Explicit test fixture: sealed against the exact compiled episode format.
  return createGuideAudioFixturePlayback(director.executableEpisodePlan.format);
};

async function openDirectionScreen(
  project: ReturnType<typeof createProject>,
  guideAudio?: DirectorGuideAudioPlayback,
) {
  const user = userEvent.setup();
  render(
    <Cv002DraftReview
      guideAudio={guideAudio}
      onBack={() => {}}
      onProjectChange={() => {}}
      project={project}
    />,
  );
  await user.click(
    await screen.findByRole("button", { name: /Review direction draft/ }),
  );
  const strip = await screen.findByTestId("guide-audio-strip");
  return { strip, user };
}

const inputProps = () =>
  playerHarness.lastProps?.inputProps as {
    episodePlan: { contentHash: string };
    guideAudio?: DirectorGuideAudioPlayback;
  };

describe("Director Studio guide-audio review strip", () => {
  it("shows the exact guide bindings and authority labels when a guide artifact exists", async () => {
    const project = createProject();
    const playback = createFixturePlayback(project);
    const { strip } = await openDirectionScreen(project, playback);

    expect(strip).toHaveTextContent(
      "Guide read · private timing/scoring only",
    );
    expect(strip).toHaveTextContent(
      "Not final voice · not production-bindable",
    );
    // Exact full hashes are visibly accessible, never truncated.
    expect(strip).toHaveTextContent(playback.clock.contentHash);
    expect(strip).toHaveTextContent(playback.timingBasis.contentHash);
    expect(strip).toHaveTextContent(playback.source.contentHash);
    expect(strip).toHaveTextContent(`${playback.timingBasis.fps} fps`);
    expect(strip).toHaveTextContent(/frames/);

    // The playback reaches the Player input props untouched (unmuted first).
    expect(inputProps().guideAudio?.muted).toBe(false);
    expect(inputProps().guideAudio?.clock.contentHash).toBe(
      playback.clock.contentHash,
    );
  });

  it("mute/unmute changes only the Player props, never the episode plan", async () => {
    const project = createProject();
    const playback = createFixturePlayback(project);
    const { strip, user } = await openDirectionScreen(project, playback);

    const planBefore = inputProps().episodePlan;
    const hashBefore = planBefore.contentHash;

    const mute = within(strip).getByRole("button", {
      name: "Mute guide read",
    });
    expect(mute).toHaveAttribute("aria-pressed", "false");
    await user.click(mute);

    expect(inputProps().guideAudio?.muted).toBe(true);
    expect(
      within(strip).getByRole("button", { name: "Unmute guide read" }),
    ).toHaveAttribute("aria-pressed", "true");
    // Episode plan object and hash are untouched by the review-only toggle.
    expect(inputProps().episodePlan).toBe(planBefore);
    expect(inputProps().episodePlan.contentHash).toBe(hashBefore);

    await user.click(
      within(strip).getByRole("button", { name: "Unmute guide read" }),
    );
    expect(inputProps().guideAudio?.muted).toBe(false);
    expect(inputProps().episodePlan).toBe(planBefore);
  });

  it("shows an honest silent state with no authoring controls when no guide exists", async () => {
    const project = createProject();
    const { strip } = await openDirectionScreen(project);

    expect(strip).toHaveTextContent("No guide read attached.");
    expect(strip).toHaveTextContent(/private timing\/scoring only/);
    expect(
      within(strip).queryByRole("button", { name: /guide read/i }),
    ).not.toBeInTheDocument();
    // No import/generate/approve affordance exists in this slice.
    expect(
      within(strip).queryByRole("button", {
        name: /import|generate|approve/i,
      }),
    ).not.toBeInTheDocument();
    expect(inputProps().guideAudio).toBeUndefined();
  });

  it("keeps the guide playback out of the episode plan hash", async () => {
    const project = createProject();
    const director = compileDirectorProject({
      storyProject: project,
      capabilities: alphaCapabilityRegistry,
    });
    const playback = createFixturePlayback(project);
    const { user } = await openDirectionScreen(project, playback);

    const sealedHash = director.executableEpisodePlan.contentHash;
    expect(inputProps().episodePlan.contentHash).toBe(sealedHash);
    await user.click(
      screen.getByRole("button", { name: "Mute guide read" }),
    );
    expect(inputProps().episodePlan.contentHash).toBe(sealedHash);
  });

  it("detaches a stale guide honestly after a real retiming patch", async () => {
    const project = createKidsSampleProject();
    const playback = createFixturePlayback(project);
    const { strip, user } = await openDirectionScreen(project, playback);

    const originalHash = inputProps().episodePlan.contentHash;
    expect(inputProps().guideAudio?.muted).toBe(false);

    // Apply the real reaction-delay patch: the revised cut no longer matches
    // the supplied guide's timing basis.
    const rail = screen.getByLabelText("Studio scenes and beats");
    await user.click(
      within(rail).getByRole("button", { name: /3\.1 reaction/i }),
    );
    await user.type(
      screen.getByLabelText("Direction for selected beat"),
      "Make the reaction 6 frames later",
    );
    await user.click(screen.getByRole("button", { name: "Preview change" }));
    await user.click(
      await screen.findByRole("button", {
        name: "Apply and replay this beat",
      }),
    );

    // The Player receives the revised plan and no stale guide — it must not
    // throw — and the strip tells the truth about the detachment.
    expect(inputProps().episodePlan.contentHash).not.toBe(originalHash);
    expect(inputProps().guideAudio).toBeUndefined();
    expect(
      await screen.findByText(/stale for the revised cut/i),
    ).toBeInTheDocument();
    expect(strip).toHaveTextContent(/not retimed, stretched/i);
    expect(
      within(strip).queryByRole("button", { name: /guide read/i }),
    ).not.toBeInTheDocument();
  });

  it("seeds the initial mute state from the supplied playback's muted value", async () => {
    const project = createProject();
    const playback: DirectorGuideAudioPlayback = {
      ...createFixturePlayback(project),
      muted: true,
    };
    const { strip } = await openDirectionScreen(project, playback);

    expect(inputProps().guideAudio?.muted).toBe(true);
    expect(
      within(strip).getByRole("button", { name: "Unmute guide read" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("resynchronizes mute from a replacement guide and never leaks the prior toggle", async () => {
    const project = createProject();
    const format = createFixturePlayback(project).timingBasis;
    const guideA = createFixturePlayback(project);
    const guideB: DirectorGuideAudioPlayback = {
      ...createGuideAudioFixturePlayback(
        {
          fps: format.fps,
          durationInFrames:
            format.durationSamples / format.samplesPerFrame,
        },
        "A second guide timing read fixture.",
      ),
      muted: false,
    };
    expect(guideB.expectedGuideVoiceClockContentHash).not.toBe(
      guideA.expectedGuideVoiceClockContentHash,
    );

    const user = userEvent.setup();
    const { rerender } = render(
      <Cv002DraftReview
        guideAudio={guideA}
        onBack={() => {}}
        onProjectChange={() => {}}
        project={project}
      />,
    );
    await user.click(
      await screen.findByRole("button", { name: /Review direction draft/ }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Mute guide read" }),
    );
    expect(inputProps().guideAudio?.muted).toBe(true);

    rerender(
      <Cv002DraftReview
        guideAudio={guideB}
        onBack={() => {}}
        onProjectChange={() => {}}
        project={project}
      />,
    );
    // B's supplied mute truth wins; A's local toggle does not leak.
    expect(inputProps().guideAudio?.muted).toBe(false);
    expect(inputProps().guideAudio?.clock.contentHash).toBe(
      guideB.clock.contentHash,
    );
  });

  it("keeps an unchanged compatible guide attached across rerenders without resetting the toggle", async () => {
    const project = createProject();
    const playback = createFixturePlayback(project);
    const user = userEvent.setup();
    const { rerender } = render(
      <Cv002DraftReview
        guideAudio={playback}
        onBack={() => {}}
        onProjectChange={() => {}}
        project={project}
      />,
    );
    await user.click(
      await screen.findByRole("button", { name: /Review direction draft/ }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Mute guide read" }),
    );
    rerender(
      <Cv002DraftReview
        guideAudio={playback}
        onBack={() => {}}
        onProjectChange={() => {}}
        project={project}
      />,
    );
    expect(inputProps().guideAudio?.muted).toBe(true);
    expect(inputProps().guideAudio?.clock.contentHash).toBe(
      playback.clock.contentHash,
    );
  });

  it("activates the dev fixture only for exactly ?guide-audio-fixture=1", async () => {
    const cases: Array<{ query: string; fixtureExpected: boolean }> = [
      { query: "?guide-audio-fixture=1", fixtureExpected: true },
      { query: "?guide-audio-fixture=0", fixtureExpected: false },
      { query: "?guide-audio-fixture=", fixtureExpected: false },
      { query: "?guide-audio-fixture=true", fixtureExpected: false },
      { query: "", fixtureExpected: false },
    ];
    for (const { query, fixtureExpected } of cases) {
      window.history.replaceState({}, "", `/${query}`);
      cleanup();
      const user = userEvent.setup();
      render(
        <Cv002DraftReview
          onBack={() => {}}
          onProjectChange={() => {}}
          project={createProject()}
        />,
      );
      await user.click(
        await screen.findByRole("button", { name: /Review direction draft/ }),
      );
      const strip = await screen.findByTestId("guide-audio-strip");
      if (fixtureExpected) {
        expect(strip).toHaveTextContent("Guide read · private timing/scoring only");
      } else {
        expect(strip).toHaveTextContent("No guide read attached.");
      }
    }
    window.history.replaceState({}, "", "/");
  });
});
