#!/usr/bin/env python3
"""Locate where a station's native bulge sits in docs/reference/native-line-paths.json,
and print a ready-to-edit JSON spec for build_segment.py.

Usage:
    python3 scripts/find_anchors.py red dunwoody medical-center

For a through-station you should see exactly 4 hits (down-pass entry/exit,
up-pass entry/exit). For a station with extra native complexity (e.g. a
pronounced terminus bulge, or an interchange) you may see more — eyeball the
printed coordinates against docs/reference/marta-rail-map-reference.jpg and
pick the right ones by hand; this script narrows the search, it doesn't
replace judgment.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from native_path_lib import (  # noqa: E402
    extract_edge,
    find_station_anchors,
    load_native_paths,
    load_station_bulges,
    parse_path,
)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("line")
    p.add_argument("station_a")
    p.add_argument("station_b")
    p.add_argument("--threshold", type=float, default=30.0)
    p.add_argument("--piece", type=int, default=None,
                    help="index into native-line-paths.json[line] to search; default tries all and uses the first with hits for both stations")
    args = p.parse_args()

    native = load_native_paths()
    bulges = load_station_bulges()
    if args.line not in native:
        sys.exit(f"unknown line {args.line!r}; have {list(native)}")

    a_key, b_key = (args.station_a, args.line), (args.station_b, args.line)
    if a_key not in bulges:
        sys.exit(f"no stationBulges entry for {a_key}")
    if b_key not in bulges:
        sys.exit(f"no stationBulges entry for {b_key}")
    a_center, b_center = bulges[a_key], bulges[b_key]

    pieces = [args.piece] if args.piece is not None else range(len(native[args.line]))
    for piece_idx in pieces:
        cmds = parse_path(native[args.line][piece_idx])
        a_hits = find_station_anchors(cmds, a_center, args.threshold)
        b_hits = find_station_anchors(cmds, b_center, args.threshold)
        if a_hits and b_hits:
            break
    else:
        sys.exit("no piece of this line's native path has hits for both stations — try a larger --threshold or check stationBulges.ts")

    print(f"# native-line-paths.json['{args.line}'][{piece_idx}], {len(cmds)} commands total\n")
    print(f"{args.station_a} {a_center} hits (index, end point):")
    for i in a_hits:
        print(f"  [{i}] {cmds[i]['end']}")
    print(f"\n{args.station_b} {b_center} hits (index, end point):")
    for i in b_hits:
        print(f"  [{i}] {cmds[i]['end']}")

    print(
        "Pick by hand from the hits above (lower index = earlier along the path):\n"
        "  down_exit  = A's hit just before B's first hit (the down-pass attach point)\n"
        "  down_entry = B's matching down-pass hit\n"
        "  up_exit    = B's hit on the way back up, just before A's next hit\n"
        "  up_entry   = A's last hit overall\n"
        "Then: extract_edge(cmds, a_down_exit_idx, b_down_entry_idx) -> down_edge\n"
        "      extract_edge(cmds, b_up_exit_idx, a_up_entry_idx)    -> up_edge\n"
        "(strip the leading 'M x y ' from each before putting it in the spec's\n"
        "down_edge/up_edge fields — build_segment.py expects native commands only).\n"
        f"\nRun this in a python3 REPL with '{__file__}' on sys.path, or inline:\n"
        f"  cmds = parse_path(load_native_paths()['{args.line}'][{piece_idx}])\n"
    )


if __name__ == "__main__":
    main()
