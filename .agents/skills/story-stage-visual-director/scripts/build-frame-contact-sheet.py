#!/usr/bin/env python3
"""Build a labeled contact sheet from sequential PNG or JPEG frames."""

from __future__ import annotations

import argparse
import math
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont, ImageOps
except ImportError as error:
    raise SystemExit("Pillow is required: python -m pip install Pillow") from error


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("frames_directory", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--columns", type=int, default=7)
    parser.add_argument("--thumb-width", type=int, default=260)
    parser.add_argument("--thumb-height", type=int, default=146)
    parser.add_argument("--pattern", default="frame-*.png")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.columns < 1 or args.thumb_width < 1 or args.thumb_height < 1:
        raise SystemExit("Columns and thumbnail dimensions must be positive.")

    frames = sorted(args.frames_directory.glob(args.pattern))
    if not frames:
        raise SystemExit(f"No frames matched {args.pattern!r} in {args.frames_directory}")

    label_height = 24
    rows = math.ceil(len(frames) / args.columns)
    sheet = Image.new(
        "RGB",
        (args.columns * args.thumb_width, rows * (args.thumb_height + label_height)),
        (15, 17, 21),
    )
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=16)

    for index, frame_path in enumerate(frames):
        with Image.open(frame_path) as source:
            thumb = ImageOps.fit(
                source.convert("RGB"),
                (args.thumb_width, args.thumb_height),
                method=Image.Resampling.LANCZOS,
            )
        x = (index % args.columns) * args.thumb_width
        y = (index // args.columns) * (args.thumb_height + label_height)
        sheet.paste(thumb, (x, y))
        draw.text((x + 7, y + args.thumb_height + 3), frame_path.stem, font=font, fill=(245, 247, 250))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.output, optimize=True)
    print(f"Wrote {len(frames)} frames to {args.output}")


if __name__ == "__main__":
    main()
