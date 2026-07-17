# Profile comparison

The measured references support two separate production grammars. These are original StoryStage envelopes, not copied shot lists.

| Dimension | Kids Adventure lab | Frankly Weird History lab |
| --- | --- | --- |
| Typical shot | 2.7-4.3s, longer participatory loops | 1.9-3.0s, short editorial inserts |
| Primary visual engine | character performance over layered sets | editorial reset across presenter, type, evidence, diagram, and insert |
| Shot emphasis | wide action and medium two-shots | evidence/B-roll, graphics, maps, and restrained host |
| Camera | stable action stage, gentle push/track, foreground wipe | hard cuts, crop/push on stills, sparse punch-in |
| Text | zero to six words, action prompts and refrains | dates, names, locations, quotations, punch labels |
| Performance | large silhouette and gesture changes | economical presenter changes and deadpan reactions |
| Asset priority | approved recurring assets, generated custom art, graphic inserts | authenticated archive/public domain, licensed stock, diagrams, labeled reconstruction |
| Audio | lyric and beat are the master clock | narration clause is the master clock |

The canonical SS-002 script comparison is enforced in `packages/story-engine/src/index.test.ts`: average shot duration differs by at least 20%, history insert/evidence/graphic routing is at least 1.5x the kids share, and kids character-performance event rate is at least 1.5x the history rate.
