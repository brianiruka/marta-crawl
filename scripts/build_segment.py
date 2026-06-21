#!/usr/bin/env python3
"""Build a martaLinePaths.json segment between two adjacent stations.

Given each station's center and the native down/up edge curve strings that
connect them (see find_anchors.py to recover those from
docs/reference/native-line-paths.json), this generates a complete closed
ribbon segment: a scallop loop at each station (auto-placed, orbiting the
center, swept along the side away from the straight line between the two
attach points) plus the station's INNER_R hole subpath, per the rules in
docs/line-segment-construction.md.

Usage as a library:
    from build_segment import build_segment_from_spec
    d = build_segment_from_spec(spec)  # see build_segment_from_spec's docstring for the spec shape

Or from the CLI with a JSON spec file: `python3 scripts/build_segment.py spec.json`
"""
import argparse
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from native_path_lib import parse_path, serialize, check_hole_parity  # noqa: E402

OUTER_R = 15.0
INNER_R = 6.0
MARGIN = 1.0  # keep scallop points at least this far inside OUTER_R


def catmull_rom_segs(points):
    n = len(points)
    segs = []
    for i in range(n - 1):
        p0 = points[i - 1] if i - 1 >= 0 else points[i]
        p1 = points[i]
        p2 = points[i + 1]
        p3 = points[i + 2] if i + 2 < n else points[i + 1]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6.0, p1[1] + (p2[1] - p0[1]) / 6.0)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6.0, p2[1] - (p3[1] - p1[1]) / 6.0)
        segs.append((c1, c2, p2))
    return segs


def fmt(p):
    return f"{p[0]:.2f} {p[1]:.2f}"


def scallop_d(points, start_with_m):
    segs = catmull_rom_segs(points)
    d = (f"M {fmt(points[0])}" if start_with_m else "")
    for c1, c2, end in segs:
        d += f" C {fmt(c1)} {fmt(c2)} {fmt(end)}"
    return d


def circle(cx, cy, r):
    return f"M {cx + r} {cy} A {r} {r} 0 1 0 {cx - r} {cy} A {r} {r} 0 1 0 {cx + r} {cy} Z"


def _angle(center, p):
    return math.atan2(p[1] - center[1], p[0] - center[0])


def _pull_in(center, p, max_r):
    dx, dy = p[0] - center[0], p[1] - center[1]
    d = math.hypot(dx, dy)
    if d <= max_r:
        return p
    scale = max_r / d
    return (center[0] + dx * scale, center[1] + dy * scale)


def make_scallop(center, entry, exit, n_waypoints=4, radii=None, sweep="long"):
    """Auto-place a scallop loop around `center`, starting at `entry` and
    ending at `exit` (both native attach points, pulled inside OUTER_R if
    needed).

    `sweep` picks which arc between entry and exit the loop follows:
    "long" (default) goes the long way around — away from the straight
    chord between the two points, so the loop bulges outward into open
    space rather than cutting across the station. "short" goes the other
    way. When entry and exit are nearly antipodal (~180° apart, common for
    a station that's a temporary line-end with both native attach points on
    roughly opposite sides), long vs. short can each pass close to the
    incoming/outgoing edge curves; whichever one doesn't overlap them keeps
    the closed ribbon simple. build_segment_from_spec() picks this
    automatically via check_hole_parity() — you shouldn't need to set it by
    hand except when debugging.

    `radii` overrides the default dip/pull-back wave (fractions of
    OUTER_R); defaults alternate closer/farther for the "loosely orbiting"
    look the construction doc asks for.
    """
    max_r = OUTER_R - MARGIN
    entry = _pull_in(center, entry, max_r)
    exit = _pull_in(center, exit, max_r)

    a0 = _angle(center, entry)
    a1 = _angle(center, exit)

    ccw_diff = (a1 - a0) % (2 * math.pi)  # CCW sweep magnitude from a0 to a1, in [0, 2pi)
    if ccw_diff < math.pi:
        short_angle, long_angle = ccw_diff, ccw_diff - 2 * math.pi
    else:
        long_angle, short_angle = ccw_diff, ccw_diff - 2 * math.pi
    sweep_angle = long_angle if sweep == "long" else short_angle
    step = sweep_angle / (n_waypoints + 1)

    if radii is None:
        # alternate dip-closer / pull-back, scaled to OUTER_R
        radii = [0.62, 0.92, 0.66, 0.88, 0.7, 0.9][:n_waypoints]
        while len(radii) < n_waypoints:
            radii.append(0.8)

    points = [entry]
    for i in range(1, n_waypoints + 1):
        ang = a0 + step * i
        r = radii[i - 1] * OUTER_R
        points.append((center[0] + r * math.cos(ang), center[1] + r * math.sin(ang)))
    points.append(exit)
    return points


def _snap_edge_end(edge_cmds_text, new_end):
    """Re-point the final command of a native edge fragment at `new_end`
    (a scallop's pulled-in attach point) so the edge lands exactly where the
    scallop starts/ends, instead of at the original unpulled native
    coordinate. Control points are left untouched — at this distance (a
    pixel or two) the shape difference is invisible, same as doing it by
    hand."""
    cmds = parse_path(edge_cmds_text)
    last = cmds[-1]
    if last["cmd"] == "Z":
        raise ValueError("edge fragment should not include a closing Z")
    pts = last["points"][:]
    pts[-1] = new_end
    last["points"] = pts
    last["end"] = new_end
    return serialize(cmds)


def _assemble(spec, a_sweep, b_sweep):
    a = spec["station_a"]
    b = spec["station_b"]

    a_loop = make_scallop(
        a["center"], a["up_entry"], a["down_exit"],
        n_waypoints=a.get("n_waypoints", 4), radii=a.get("radii"), sweep=a_sweep,
    )
    b_loop = make_scallop(
        b["center"], b["down_entry"], b["up_exit"],
        n_waypoints=b.get("n_waypoints", 4), radii=b.get("radii"), sweep=b_sweep,
    )
    # a_loop/b_loop's first & last points are the *pulled-in* attach points —
    # snap the native edge curves onto them so there's no sub-pixel seam.
    down_edge = _snap_edge_end(spec["down_edge"], b_loop[0])
    up_edge = _snap_edge_end(spec["up_edge"], a_loop[0])

    d = scallop_d(a_loop, start_with_m=True)
    d += " " + down_edge
    d += " " + scallop_d(b_loop[1:], start_with_m=False)
    d += " " + up_edge
    d += " Z"
    d += " " + circle(a["center"][0], a["center"][1], INNER_R)
    d += " " + circle(b["center"][0], b["center"][1], INNER_R)
    return d


def build_segment_from_spec(spec, verbose=False):
    """spec: {
        "station_a": {"center": [x,y], "down_exit": [x,y], "up_entry": [x,y], "n_waypoints": 4, "radii": [...]},
        "station_b": {"center": [x,y], "down_entry": [x,y], "up_exit": [x,y], "n_waypoints": 4, "radii": [...]},
        "down_edge": "C ... C ...",   # native commands, A.down_exit -> B.down_entry (no leading M)
        "up_edge": "C ... C ...",     # native commands, B.up_exit -> A.up_entry (no leading M)
    }

    Defaults both scallops to sweeping the long way around, then verifies
    with check_hole_parity() that each station's center actually renders as
    a hole (even ray crossings). If either fails — which happens when a
    station's two native attach points are close to antipodal, where "long"
    and "short" both pass near the chord and one of them ends up
    self-intersecting with the rest of the ribbon — it flips that station's
    sweep direction and rechecks before giving up. This is what caught (and
    now auto-avoids) the Buckhead bug: a "long way" scallop that rendered as
    a solid filled disc instead of a hole.
    """
    a, b = spec["station_a"], spec["station_b"]
    centers = [("station_a", tuple(a["center"])), ("station_b", tuple(b["center"]))]

    for a_sweep, b_sweep in (("long", "long"), ("short", "long"), ("long", "short"), ("short", "short")):
        d = _assemble(spec, a_sweep, b_sweep)
        results = check_hole_parity(d, centers)
        bad = [r for r in results if not r[3]]
        if verbose:
            print(f"  sweep a={a_sweep} b={b_sweep}: " +
                  ", ".join(f"{label} crossings={n} {'OK' if ok else 'FAIL'}" for label, _, n, ok in results),
                  file=sys.stderr)
        if not bad:
            return d

    raise RuntimeError(
        "could not find a sweep combination where both stations' holes render correctly "
        f"(last attempt: {results}). The scallop geometry likely needs a manual radii/"
        "n_waypoints override — see make_scallop()'s docstring."
    )


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("spec", help="path to a JSON spec file (see build_segment_from_spec docstring), or '-' for stdin")
    p.add_argument("-v", "--verbose", action="store_true", help="print the sweep/parity attempts to stderr")
    args = p.parse_args()
    raw = sys.stdin.read() if args.spec == "-" else open(args.spec).read()
    spec = json.loads(raw)
    print(build_segment_from_spec(spec, verbose=args.verbose))


if __name__ == "__main__":
    main()
