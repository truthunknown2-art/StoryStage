# Director plan contract

Emit stable IDs and explicit references. The application schema is authoritative; this is the minimum semantic shape.

```json
{
  "schemaVersion": "1.0",
  "productionId": "production-id",
  "grammarId": "kids-adventure-v1",
  "sourceContentHash": "64-hex",
  "startFrame": 84,
  "durationInFrames": 48,
  "scenes": [
    {
      "id": "scene-id",
      "objective": "Make entering the ruins feel like a choice.",
      "geography": "The arch divides safe forest from dark corridor.",
      "beatIds": ["beat-id"],
      "sceneKitId": "scene-kit-id"
    }
  ],
  "beats": [
    {
      "id": "beat-id",
      "sceneId": "scene-id",
      "audienceQuestion": "What are they following?",
      "knowledgeBefore": "A light is moving in the forest.",
      "knowledgeAfter": "The light entered the ruins.",
      "emotionBefore": "curiosity",
      "emotionAfter": "caution",
      "muteReadableAction": "The moth crosses the threshold and the children stop.",
      "audioReadableIntent": "Forest ambience narrows; one leaf contact marks the step.",
      "shotIds": ["shot-id"]
    }
  ],
  "shots": [
    {
      "id": "shot-id",
      "beatId": "beat-id",
      "storyFunction": "threshold",
      "startFrame": 84,
      "durationInFrames": 48,
      "sceneId": "scene-id",
      "composition": {
        "scale": "close-up",
        "focalSubjectId": "mara-foot",
        "screenDirection": "left-to-right",
        "depthPlaneIds": ["ground", "feet", "foreground-leaves"],
        "eyelineTargetIds": [],
        "staging": "Keep the foot contact clear while leaves cross only the frame edge."
      },
      "transition": {
        "type": "foreground-wipe",
        "motivation": "leaf contact covers the geography change"
      },
      "continuity": {
        "entryState": "Mara approaches frame-left.",
        "exitState": "Her planted foot is inside the arch."
      },
      "performanceProgramIds": ["mara-threshold-step"],
      "assetRequirementIds": ["moon-arch-scene-kit", "foreground-leaves"],
      "events": [
        {
          "id": "threshold-contact",
          "kind": "contact",
          "frameOffset": 10,
          "description": "Mara's foot plants inside the ruins."
        }
      ],
      "audioIntentIds": ["threshold-rustle"]
    }
  ],
  "audioIntents": [
    {
      "id": "threshold-rustle",
      "role": "foley",
      "shotId": "shot-id",
      "anchorEventId": "threshold-contact",
      "offsetFrames": 0,
      "direction": "Dry paper-leaf rustle; brief and close."
    }
  ],
  "contentHash": "64-hex"
}
```

Hard validation must confirm:

- all scene, beat, shot, performance, asset, event, and audio references resolve exactly once;
- frames and events remain within their shot and production;
- shots cover their intended sequence without overlap or gaps unless declared;
- moving-subject continuity is compatible or has an explicit reset/exception;
- performance source semantics match the action;
- audio anchors resolve to picture events and approved source hashes;
- dialogue lines resolve to exact text, take, alignment, and viseme hashes;
- every consumed visual and audio asset is included in the production content hash.
