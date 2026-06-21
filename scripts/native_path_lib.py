"""Shared helpers for working with docs/reference/native-line-paths.json.

These are the pre-split per-line outlines extracted from the original source
SVG (see AGENTS.md / docs/line-segment-construction.md) — one continuous
ribbon per line, traced down one edge through every station and back up the
other. As martaLinePaths.json gets rebuilt station-by-station into
independent segments, this file stays the fixed reference for "what did the
native art actually do here" so we don't have to re-mine git history per
segment.
"""
import json
import math
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
NATIVE_PATHS_FILE = REPO_ROOT / "docs/reference/native-line-paths.json"
STATION_BULGES_FILE = REPO_ROOT / "src/data/stationBulges.ts"


def load_native_paths():
    return json.loads(NATIVE_PATHS_FILE.read_text())


def load_station_bulges():
    """Parse the stationBulges.ts array into {(stationId, line): (cx, cy)}."""
    text = STATION_BULGES_FILE.read_text()
    out = {}
    for m in re.finditer(
        r'stationId:\s*"([^"]+)",\s*line:\s*"([^"]+)",\s*cx:\s*(-?[\d.]+),\s*cy:\s*(-?[\d.]+)',
        text,
    ):
        station_id, line, cx, cy = m.groups()
        out[(station_id, line)] = (float(cx), float(cy))
    return out


def parse_path(d):
    """Parse an M/C/L/Z-only path string into a list of command dicts.

    Each dict has: cmd ('M'|'C'|'L'|'Z'), points (list of (x,y) pairs as they
    appear in the command), end ((x,y) of the command's terminal point).
    """
    tokens = re.findall(r"[MCLZz]|-?\d+\.?\d*(?:[eE]-?\d+)?", d)
    i = 0
    cmds = []
    last_end = None
    while i < len(tokens):
        t = tokens[i]
        if t in "MCLZz":
            cmd = t.upper()
            i += 1
            if cmd == "Z":
                cmds.append({"cmd": "Z", "points": [], "end": last_end})
                continue
            nums_needed = {"M": 2, "C": 6, "L": 2}[cmd]
            nums = [float(tokens[i + k]) for k in range(nums_needed)]
            i += nums_needed
            xy = [(nums[j], nums[j + 1]) for j in range(0, len(nums), 2)]
            cmds.append({"cmd": cmd, "points": xy, "end": xy[-1]})
            last_end = xy[-1]
        else:
            i += 1
    return cmds


def serialize(cmds):
    parts = []
    for c in cmds:
        if c["cmd"] == "Z":
            parts.append("Z")
            continue
        flat = " ".join(f"{x:.2f} {y:.2f}" for x, y in c["points"])
        parts.append(f"{c['cmd']} {flat}")
    return " ".join(parts)


def dist(a, b):
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5


def find_station_anchors(cmds, center, threshold=30.0):
    """Return sorted command indices whose endpoint lies within `threshold`
    of `center`. For a station on a through-line, expect exactly two: the
    down-pass visit and the up-pass visit (in index order)."""
    hits = []
    for idx, c in enumerate(cmds):
        if c["end"] is None:
            continue
        if dist(c["end"], center) <= threshold:
            hits.append(idx)
    return hits


def extract_edge(cmds, start_idx, end_idx):
    """Serialize commands (start_idx, end_idx] as a standalone path fragment
    starting with M at cmds[start_idx]['end']."""
    start_point = cmds[start_idx]["end"]
    fragment = [{"cmd": "M", "points": [start_point], "end": start_point}]
    fragment += cmds[start_idx + 1 : end_idx + 1]
    return serialize(fragment)


# --- full-path flattening (M/C/L/Z/A) + evenodd hole verification ---------
#
# build_segment.py's generated segments use M/C/L/Z for the ribbon and A
# (circular arcs) for the INNER_R hole subpaths. Browsers render both fine,
# but a self-intersecting or wrongly-wound scallop can flip the evenodd
# parity at a station's exact center from "hole" to "solid" in a way that's
# easy to miss in a quick visual check (see the Buckhead crescent/solid-fill
# bug in docs/line-segment-construction.md). check_hole_parity() below makes
# that check mechanical instead of relying on a screenshot glance.

def _bezier_flatten(p0, c1, c2, p1, n=20):
    pts = []
    for k in range(1, n + 1):
        t = k / n
        mt = 1 - t
        x = mt**3 * p0[0] + 3 * mt**2 * t * c1[0] + 3 * mt * t**2 * c2[0] + t**3 * p1[0]
        y = mt**3 * p0[1] + 3 * mt**2 * t * c1[1] + 3 * mt * t**2 * c2[1] + t**3 * p1[1]
        pts.append((x, y))
    return pts


def _arc_flatten(p0, rx, large_arc, sweep, end, n=20):
    """Flatten an SVG 'A rx ry 0 large sweep x y' arc. Only handles the
    circular (rx==ry, rotation 0) case our circle() helper emits."""
    mx, my = (p0[0] + end[0]) / 2, (p0[1] + end[1]) / 2
    dx, dy = end[0] - p0[0], end[1] - p0[1]
    dist_ = math.hypot(dx, dy)
    if dist_ == 0:
        return [end]
    h = math.sqrt(max(rx * rx - (dist_ / 2) ** 2, 0))
    ux, uy = -dy / dist_, dx / dist_
    c1c = (mx + ux * h, my + uy * h)
    c2c = (mx - ux * h, my - uy * h)
    center = c1c if sweep == 0 else c2c
    a0 = math.atan2(p0[1] - center[1], p0[0] - center[0])
    a1 = math.atan2(end[1] - center[1], end[0] - center[0])
    diff = (a1 - a0) % (2 * math.pi)
    if abs(diff - math.pi) > 0.2:
        diff = diff - 2 * math.pi if diff > math.pi else diff
    return [
        (center[0] + rx * math.cos(a0 + diff * k / n), center[1] + rx * math.sin(a0 + diff * k / n))
        for k in range(1, n + 1)
    ]


def parse_path_full(d):
    """Like parse_path, but also understands 'A' (circular arc) commands."""
    tokens = re.findall(r"[MCLZzAa]|-?\d+\.?\d*(?:[eE]-?\d+)?", d)
    i = 0
    cmds = []
    cur = None
    while i < len(tokens):
        t = tokens[i]
        u = t.upper()
        if u == "M":
            i += 1
            cur = (float(tokens[i]), float(tokens[i + 1]))
            i += 2
            cmds.append({"cmd": "M", "end": cur})
        elif u == "L":
            i += 1
            cur = (float(tokens[i]), float(tokens[i + 1]))
            i += 2
            cmds.append({"cmd": "L", "end": cur})
        elif u == "C":
            i += 1
            nums = [float(tokens[i + k]) for k in range(6)]
            i += 6
            c1, c2, end = (nums[0], nums[1]), (nums[2], nums[3]), (nums[4], nums[5])
            cmds.append({"cmd": "C", "start": cur, "c1": c1, "c2": c2, "end": end})
            cur = end
        elif u == "A":
            i += 1
            nums = [float(tokens[i + k]) for k in range(7)]
            i += 7
            rx, ry, rot, large, sweep, x, y = nums
            end = (x, y)
            cmds.append({"cmd": "A", "start": cur, "rx": rx, "large": large, "sweep": sweep, "end": end})
            cur = end
        elif u == "Z":
            i += 1
            cmds.append({"cmd": "Z"})
        else:
            i += 1
    return cmds


def flatten_to_polyline(cmds):
    poly = []
    start = None
    for c in cmds:
        if c["cmd"] == "M":
            start = c["end"]
            poly.append(c["end"])
        elif c["cmd"] == "L":
            poly.append(c["end"])
        elif c["cmd"] == "C":
            poly.extend(_bezier_flatten(c["start"], c["c1"], c["c2"], c["end"]))
        elif c["cmd"] == "A":
            poly.extend(_arc_flatten(c["start"], c["rx"], c["large"], c["sweep"], c["end"]))
        elif c["cmd"] == "Z":
            poly.append(start)
    return poly


def crossing_count(polyline, point):
    """Count crossings of a +x ray from `point` through the polyline — the
    raw input to the evenodd rule (odd = filled, even = not filled)."""
    x0, y0 = point
    count = 0
    for i in range(len(polyline) - 1):
        x1, y1 = polyline[i]
        x2, y2 = polyline[i + 1]
        if (y1 > y0) != (y2 > y0):
            x_int = x1 + (y0 - y1) * (x2 - x1) / (y2 - y1)
            if x_int > x0:
                count += 1
    return count


def check_hole_parity(d, points):
    """For a segment's full `d` string (ribbon + INNER_R circle subpaths),
    report whether each given (label, (x, y)) point renders as a hole
    (even crossings -> transparent) or solid (odd -> filled). Returns a list
    of (label, point, crossings, is_hole)."""
    poly = flatten_to_polyline(parse_path_full(d))
    results = []
    for label, point in points:
        n = crossing_count(poly, point)
        results.append((label, point, n, n % 2 == 0))
    return results
