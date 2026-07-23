/**
 * Bounded local Ollo demo project for the product-v1 journey.
 *
 * Concise metadata only — a 20-minute episode shape (two acts, four
 * sequences, eight scenes, lightweight beat metadata) so the Studio shell
 * can exercise long-form information architecture. No script text, no
 * imagery, no production claims: every scene is labelled as not produced.
 */

export interface DemoBeat {
  title: string;
  seconds: number;
}

export interface DemoScene {
  id: string;
  title: string;
  seconds: number;
  beats: DemoBeat[];
}

export interface DemoSequence {
  id: string;
  title: string;
  scenes: DemoScene[];
}

export interface DemoAct {
  id: string;
  title: string;
  sequences: DemoSequence[];
}

const scene = (
  id: string,
  title: string,
  seconds: number,
  beats: Array<[string, number]>,
): DemoScene => ({
  id,
  title,
  seconds,
  beats: beats.map(([beatTitle, beatSeconds]) => ({
    title: beatTitle,
    seconds: beatSeconds,
  })),
});

export const OLLO_DEMO_ACTS: DemoAct[] = [
  {
    id: "act-1",
    title: "Act I · Everyday Problem",
    sequences: [
      {
        id: "seq-1",
        title: "Sequence 1 · A quiet ordinary",
        scenes: [
          scene("scene-1", "The Home Nook", 150, [
            ["Morning light through the round window", 70],
            ["A shelf of unfinished stories", 80],
          ]),
          scene("scene-2", "Forest Path", 160, [
            ["Ollo bounces ahead of Tix", 85],
            ["A golden glow between the ferns", 75],
          ]),
        ],
      },
      {
        id: "seq-2",
        title: "Sequence 2 · First signs",
        scenes: [
          scene("scene-3", "Berry Patch", 140, [
            ["Dot finds a trail of dropped berries", 65],
            ["The glow flickers twice, inviting", 75],
          ]),
          scene("scene-4", "Little Stream", 150, [
            ["Stepping stones across the water", 80],
            ["Something hums under the roots", 70],
          ]),
        ],
      },
    ],
  },
  {
    id: "act-2",
    title: "Act II · The Little Elsewhere",
    sequences: [
      {
        id: "seq-3",
        title: "Sequence 3 · The journey",
        scenes: [
          scene("scene-5", "Lantern Bridge", 170, [
            ["The bridge lanterns wake one by one", 90],
            ["A small voice says hello", 80],
          ]),
          scene("scene-6", "Folded Hills", 150, [
            ["Paper hills unfold into a valley", 75],
            ["The Storylight shows the doorway", 75],
          ]),
        ],
      },
      {
        id: "seq-4",
        title: "Sequence 4 · Resolution",
        scenes: [
          scene("scene-7", "Sunflower Field", 140, [
            ["A field that turns to watch them pass", 70],
            ["The oldest story opens its first page", 70],
          ]),
          scene("scene-8", "Back Home", 140, [
            ["The lantern rests by the den door", 70],
            ["No hallway is too dark now", 70],
          ]),
        ],
      },
    ],
  },
];

export const OLLO_DEMO_SCENES: DemoScene[] = OLLO_DEMO_ACTS.flatMap((act) =>
  act.sequences.flatMap((sequence) => sequence.scenes),
);

export const OLLO_DEMO_TOTAL_SECONDS = OLLO_DEMO_SCENES.reduce(
  (sum, entry) => sum + entry.seconds,
  0,
);

export interface DemoProject {
  id: string;
  title: string;
  grammar: string;
  artStyle: string;
  durationLabel: string;
  status: string;
  acts: DemoAct[];
}

export const OLLO_DEMO_PROJECT: DemoProject = {
  id: "ollo-storylight-demo",
  title: "The Storylight in the Little Wood",
  grammar: "Kids Adventure",
  artStyle: "Storybook Cutout",
  durationLabel: "~20 min episode",
  status: "Local UI demo",
  acts: OLLO_DEMO_ACTS,
};

export const LOCAL_DEMO_BANNER =
  "Local UI demo — production services are not connected.";
