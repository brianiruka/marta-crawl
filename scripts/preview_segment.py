#!/usr/bin/env python3
"""Render a zoomed-in, isolated preview of martaLinePaths.json plus an
optional draft segment, for visually checking scallop/hole geometry before
committing it — without fighting screenshot-cropping tools on the full app.

Requires Google Chrome (used headless for rasterization; this repo has no
SVG rasterizer otherwise).

Usage:
    python3 scripts/preview_segment.py --line red --viewbox 1140 60 150 380 \
        --draft /tmp/segment.txt --out /tmp/preview.png

    # or with no --draft, just to inspect the current committed state:
    python3 scripts/preview_segment.py --line red --viewbox 1140 250 200 220 --out /tmp/preview.png
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from native_path_lib import REPO_ROOT, load_station_bulges  # noqa: E402

CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "google-chrome",
    "chromium",
]

LINE_COLORS = {
    "red": "#ec2527",
    "gold": "#ffa500",
    "blue": "#0093d0",
    "green": "#69bd47",
}
BACKGROUND = "#0a0a0a"
OUTER_R = 15
INNER_R = 6


def find_chrome():
    for c in CHROME_CANDIDATES:
        if c.startswith("/"):
            if Path(c).exists():
                return c
        else:
            from shutil import which
            if which(c):
                return c
    sys.exit("no Chrome/Chromium binary found for headless rendering")


def ring_path(cx, cy):
    def circle(r):
        return f"M {cx + r} {cy} A {r} {r} 0 1 0 {cx - r} {cy} A {r} {r} 0 1 0 {cx + r} {cy} Z"
    return f"{circle(OUTER_R)} {circle(INNER_R)}"


def build_svg(line, viewbox, draft_d, scale):
    vb_x, vb_y, vb_w, vb_h = viewbox
    color = LINE_COLORS[line]
    line_paths = json.loads((REPO_ROOT / "src/data/martaLinePaths.json").read_text())
    bulges = load_station_bulges()

    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb_x} {vb_y} {vb_w} {vb_h}" '
              f'width="{int(vb_w*scale)}" height="{int(vb_h*scale)}" style="background:{BACKGROUND}">']

    parts.append(f'<g fill="{color}">')
    for d in line_paths.get(line, []):
        parts.append(f'<path fill-rule="evenodd" d="{d}"/>')
    if draft_d:
        parts.append(f'<path fill-rule="evenodd" d="{draft_d}"/>')
    parts.append('</g>')

    parts.append(f'<g fill="{color}">')
    for (station_id, ln), (cx, cy) in bulges.items():
        if ln != line:
            continue
        if not (vb_x - OUTER_R <= cx <= vb_x + vb_w + OUTER_R and vb_y - OUTER_R <= cy <= vb_y + vb_h + OUTER_R):
            continue
        parts.append(f'<path fill-rule="evenodd" d="{ring_path(cx, cy)}"/>')
        parts.append(f'<circle cx="{cx}" cy="{cy}" r="1.2" fill="white"/>')
    parts.append('</g>')

    parts.append('</svg>')
    return "\n".join(parts)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--line", required=True, choices=list(LINE_COLORS))
    p.add_argument("--viewbox", nargs=4, type=float, metavar=("X", "Y", "W", "H"), required=True)
    p.add_argument("--draft", help="path to a file containing a draft segment's 'd' string to overlay; '-' for stdin")
    p.add_argument("--scale", type=float, default=6.0, help="pixels per SVG unit (default 6)")
    p.add_argument("--out", default="/tmp/segment-preview.png")
    args = p.parse_args()

    draft_d = None
    if args.draft:
        draft_d = (sys.stdin.read() if args.draft == "-" else Path(args.draft).read_text()).strip()

    svg = build_svg(args.line, args.viewbox, draft_d, args.scale)
    html_path = Path("/tmp/_preview_segment.html")
    html_path.write_text(f"<!DOCTYPE html><html><body style='margin:0'>{svg}</body></html>")

    chrome = find_chrome()
    vb_w, vb_h = args.viewbox[2], args.viewbox[3]
    window_w, window_h = int(vb_w * args.scale) + 40, int(vb_h * args.scale) + 40
    subprocess.run([
        chrome, "--headless=new", "--disable-gpu",
        f"--screenshot={args.out}",
        f"--window-size={window_w},{window_h}",
        "--hide-scrollbars",
        f"file://{html_path}",
    ], check=True, capture_output=True)
    print(args.out)


if __name__ == "__main__":
    main()
