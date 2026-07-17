import {interpolate, useCurrentFrame} from "remotion";

type CutoutCharacterProps = {
  accent: string;
  body: string;
  gestureFrom?: number;
  name: string;
  paper: string;
  side: "left" | "right";
};

export const CutoutCharacter: React.FC<CutoutCharacterProps> = ({
  accent,
  body,
  gestureFrom = 1000,
  name,
  paper,
  side,
}) => {
  const frame = useCurrentFrame();
  const isLeft = side === "left";
  const entrance = interpolate(frame, [12, 42], [isLeft ? -130 : 130, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const settle = interpolate(frame, [42, 76, 110], [0, isLeft ? -8 : 8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const gesture = interpolate(
    frame,
    [gestureFrom, gestureFrom + 16, gestureFrom + 44, gestureFrom + 66],
    [0, isLeft ? -38 : 38, isLeft ? -38 : 38, 0],
    {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
  );
  const blink = frame % 94 >= 88 ? 0.14 : 1;

  return (
    <div
      aria-label={name}
      style={{
        bottom: 56,
        height: 580,
        left: isLeft ? 210 : undefined,
        position: "absolute",
        right: isLeft ? undefined : 210,
        translate: `${entrance}px ${settle}px`,
        width: 430,
      }}
    >
      <div
        style={{
          background: paper,
          border: "8px solid rgba(27, 24, 20, 0.7)",
          borderRadius: "48% 52% 44% 56%",
          boxShadow: "10px 14px 0 rgba(16, 18, 18, 0.26)",
          height: 252,
          left: 82,
          position: "absolute",
          rotate: isLeft ? "-3deg" : "3deg",
          top: 12,
          width: 266,
          zIndex: 3,
        }}
      >
        <div style={{background: accent, borderRadius: 12, height: 30, left: 38, position: "absolute", rotate: "-8deg", top: 46, width: 80}} />
        <div style={{background: accent, borderRadius: 12, height: 30, position: "absolute", right: 38, rotate: "8deg", top: 46, width: 80}} />
        <div style={{alignItems: "center", display: "flex", gap: 50, justifyContent: "center", marginTop: 92}}>
          <div style={{background: "#211e1b", borderRadius: 999, height: 30 * blink, width: 24}} />
          <div style={{background: "#211e1b", borderRadius: 999, height: 30 * blink, width: 24}} />
        </div>
        <div style={{borderBottom: "7px solid #211e1b", borderRadius: "0 0 70px 70px", height: 34, left: 91, position: "absolute", top: 154, width: 78}} />
        <div style={{background: "rgba(128,74,58,0.22)", borderRadius: "50%", height: 25, left: 34, position: "absolute", top: 152, width: 48}} />
      </div>

      <div
        style={{
          background: body,
          border: "8px solid rgba(27, 24, 20, 0.7)",
          borderRadius: "44% 44% 22% 22%",
          bottom: 0,
          boxShadow: "12px 16px 0 rgba(16, 18, 18, 0.24)",
          height: 354,
          left: 62,
          position: "absolute",
          width: 306,
          zIndex: 2,
        }}
      >
        <div style={{background: accent, height: 18, left: 38, opacity: 0.75, position: "absolute", top: 84, width: 212}} />
        <div style={{background: accent, height: 18, left: 38, opacity: 0.5, position: "absolute", top: 122, width: 160}} />
      </div>

      <div
        style={{
          background: body,
          border: "8px solid rgba(27, 24, 20, 0.7)",
          borderRadius: 80,
          height: 104,
          left: isLeft ? 322 : 4,
          position: "absolute",
          rotate: `${gesture + (isLeft ? -8 : 8)}deg`,
          top: 316,
          transformOrigin: isLeft ? "10% 50%" : "90% 50%",
          width: 188,
          zIndex: 1,
        }}
      >
        <div
          style={{
            background: paper,
            border: "7px solid rgba(27, 24, 20, 0.7)",
            borderRadius: "50%",
            height: 88,
            position: "absolute",
            right: isLeft ? -42 : undefined,
            left: isLeft ? undefined : -42,
            top: 0,
            width: 88,
          }}
        />
      </div>

      <div
        style={{
          background: "rgba(25, 22, 19, 0.72)",
          borderRadius: 999,
          bottom: -22,
          filter: "blur(2px)",
          height: 38,
          left: 42,
          opacity: 0.38,
          position: "absolute",
          width: 340,
        }}
      />
    </div>
  );
};
