# Director contracts

StoryStage uses three separate contracts. Do not collapse them into one convenient shot table.

## 1. DirectorPlan: what happens, why, and how it should read

This plan is causal and untimed. It must contain:

- the exact story-graph hash and grammar-profile hash;
- one persistent initial world state;
- scene geography, landmarks, portals, and legal entrances/exits;
- audience takeaway and emotional turn for every beat;
- named causal events with explicit dependencies;
- prop state and ownership changes through named events;
- shot purpose, composition, camera motivation, blocking, eyelines, and depth;
- honest performance requirements and required internal motion channels;
- dialogue, SFX, ambience, and music intentions anchored to events;
- an earliest, preferred, and latest cut event plus a read window.

The DirectorPlan must not contain arbitrary final frame ranges.

## 2. TimingSolution: when the approved events happen

The deterministic solver combines:

- causal dependencies;
- action and rig duration envelopes;
- contact and attachment events;
- reaction-delay and comprehension-hold policy;
- guide or approved dialogue timing;
- music phrase and emphasis anchors;
- compatible outgoing and incoming cut events.

It returns exact event frames and contiguous shot ranges. A timing change invalidates downstream motion, audio, cut proof, and render approvals.

## 3. ExecutableEpisodePlan: the only render input

This plan binds the exact:

- DirectorPlan and TimingSolution hashes;
- shot ranges and cut-event IDs;
- stage kits, landmarks, depth layers, and occluders;
- performance renderer kinds and versioned manifests;
- approved asset versions and content hashes;
- dialogue takes, alignments, visemes, SFX, music, and mix settings;
- output dimensions, frame rate, duration, and registry versions.

Preview, proxy animatic, final Remotion output, cut proof, and decoded-MP4 QA must consume this exact object. The animatic swaps only the asset resolver for proxies; it does not use a separate shot path.

## Hard validation

Confirm all of the following before final artwork:

- every story beat is covered exactly and in source order;
- every reaction has an earlier cause and the event graph is acyclic;
- every shot has one primary purpose and motivated entry/exit events;
- moving subjects preserve legal world position, screen order, facing, gaze, velocity, and gait phase across cuts;
- entity visibility changes only through entrance, exit, reveal, or occlusion events;
- props follow one authoritative free, in-flight, attached, offered, transferred, or released state;
- performance requirements resolve to a renderer with real internal motion channels;
- audio cues resolve to named events and approved source hashes;
- shot timing satisfies reaction delays, read windows, action envelopes, and dialogue timing;
- shots cover the production without gaps or overlaps;
- exact assets and audio are included in the production hash;
- preview and export resolve the same plan and registry versions;
- cut proof checks `-12 -8 -4 -2 -1 | 0 +1 +2 +4 +8 +12` decoded frames;
- the encoded video contains no sprite dropout, clipping, ownership jump, teleport, or unmotivated geography reset.

Creative judgment remains responsible for whether the staging is engaging, the emotion feels honest, the joke lands, and the episode is worth watching. Validation proves coherence and execution, not taste.
