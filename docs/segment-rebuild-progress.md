# Per-station segment rebuild — progress grid

Tracks `martaLinePaths.json`'s rebuild from one giant path per line into
separate per-station segments (see `docs/line-segment-construction.md` for
the construction rules). One row per (station, line) pair — interchange
stations appear once per line they're on, since each line has its own
array in the JSON.

Status values: **Done** (segment built and verified live), **Planned**
(construction worked out and checked analytically, not yet written to the
file), **Not started**.

Gold, Blue, and Green's native monolithic paths have been removed from
`martaLinePaths.json` (their array is now `[]`) so all three render as
floating station markers only, matching how Red's not-yet-rebuilt stations
already looked. The original geometry isn't lost — it's preserved in
`docs/reference/native-line-paths.json` for when each line's segment
rebuild starts. Work is paused on connecting lines for now to focus on the
station markers themselves; resume per-line segment work (using the
`scripts/find_anchors.py` → `build_segment.py` → `preview_segment.py`
pipeline) when that's done.

## Red line

| Station | Status | Notes |
|---|---|---|
| North Springs | Done | Native terminus cap kept as-is — already a clean circle, no rebuild needed. |
| Sandy Springs | Done | Native bulge replaced with explicit r=12 circle, connected to the existing neck via true tangent-line connectors. Floating apart from the rest of the line (deliberate gap, no connection to Dunwoody onward). Verified against the live render. |
| Dunwoody | Done | Rebuilt as its own "Sandy Springs to Dunwoody" segment using the scallop pattern (see `docs/line-segment-construction.md`): native bulge replaced with a 4-point wave orbiting (1237, 298), smoothed via Catmull-Rom, native approach curves on both sides kept unchanged. Now also has a second, independent scallop+hole at the same point from the "Dunwoody to Medical Center" segment — the two overlap harmlessly since both share the line's fill color. Verified against the live render. |
| Medical Center | Done | Rebuilt as its own "Dunwoody to Medical Center" segment using the scallop pattern: fresh 6-point wave orbiting (1237, 298) for Dunwoody's south-facing approach (independent of the scallop+hole the prior segment already built there — both now overlap harmlessly) and a fresh wave orbiting (1205, 406) for Medical Center, connected by the native down/up edge curves between them. Now also has a second, independent scallop+hole at the same point from the "Medical Center to Buckhead" segment, same as Dunwoody. Verified against the live render. |
| Buckhead | Done | Rebuilt as its own "Medical Center to Buckhead" segment, built with the new `scripts/find_anchors.py` + `scripts/build_segment.py` + `scripts/preview_segment.py` pipeline (see `docs/line-segment-construction.md`'s Tooling section) instead of hand-deriving scallop waypoints — auto-placed 4-point waves orbiting (1205, 406) and (1152, 623). First pass actually shipped with a solid-filled (non-hole) marker — Buckhead's native attach points are close to antipodal, and the default "sweep the long way" scallop self-intersected with the incoming/outgoing edge curves there. Caught by eye (not by the tooling) after committing; fixed by adding an automatic `check_hole_parity()` pass to `build_segment_from_spec()` that retries with the sweep direction flipped, which now produces the correct result without manual intervention. Segment ends here for now (Lindbergh Center onward not yet built) — Buckhead temporarily reads as a line-end. Re-verified against the live render. |
| Lindbergh Center | Not started | Interchange with Gold — floating marker only. |
| Arts Center | Not started | Interchange with Gold — floating marker only. |
| Midtown | Not started | Interchange with Gold — floating marker only. |
| North Avenue | Not started | Interchange with Gold — floating marker only. |
| Civic Center | Not started | Interchange with Gold — floating marker only. |
| Peachtree Center | Not started | Interchange with Gold — floating marker only. |
| Five Points | Not started | Interchange with Gold/Blue/Green. |
| Garnett | Not started | Interchange with Gold. Accepted overlap at fixed marker size for now (see below). |
| West End | Not started | Interchange with Gold. |
| Oakland City | Not started | Interchange with Gold. Accepted overlap at fixed marker size for now. |
| Lakewood/Ft. McPherson | Not started | Interchange with Gold. Accepted overlap at fixed marker size for now. |
| East Point | Not started | Interchange with Gold. |
| College Park | Not started | Interchange with Gold. |
| Airport | Not started | Interchange with Gold. |

## Gold line

| Station | Status | Notes |
|---|---|---|
| Doraville | Not started | Terminus. |
| Chamblee | Not started | |
| Brookhaven/Oglethorpe | Not started | |
| Lenox | Not started | |
| Lindbergh Center | Not started | Interchange with Red. |
| Arts Center | Not started | Interchange with Red. |
| Midtown | Not started | Interchange with Red. |
| North Avenue | Not started | Interchange with Red. |
| Civic Center | Not started | Interchange with Red. |
| Peachtree Center | Not started | Interchange with Red. |
| Five Points | Not started | Interchange with Red/Blue/Green. |
| Garnett | Not started | Interchange with Red. |
| West End | Not started | Interchange with Red. |
| Oakland City | Not started | Interchange with Red. |
| Lakewood/Ft. McPherson | Not started | Interchange with Red. |
| East Point | Not started | Interchange with Red. |
| College Park | Not started | Interchange with Red. |
| Airport | Not started | Interchange with Red. |

## Blue line

| Station | Status | Notes |
|---|---|---|
| Hamilton E. Holmes | Not started | Terminus. Earlier exploratory work compared its native cap/hole to North Springs and found mismatches — superseded by the fixed-size `StationHole` component, no longer relevant to this rebuild. |
| West Lake | Not started | |
| Ashby | Not started | Interchange with Green. |
| Vine City | Not started | Interchange with Green. |
| SEC District | Not started | Interchange with Green. |
| Georgia State | Not started | Interchange with Green. |
| King Memorial | Not started | Interchange with Green. |
| Inman Park/Reynoldstown | Not started | Interchange with Green. |
| Edgewood/Candler Park | Not started | Interchange with Green. |
| East Lake | Not started | |
| Decatur | Not started | |
| Avondale | Not started | |
| Kensington | Not started | |
| Indian Creek | Not started | Terminus. |
| Five Points | Not started | Interchange with Red/Gold/Green. |

## Green line

| Station | Status | Notes |
|---|---|---|
| Bankhead | Not started | Terminus. Earlier exploratory work fixed its terminus cap Bezier directly — superseded by the fixed-size `StationHole` component, no longer relevant to this rebuild. |
| Ashby | Not started | Interchange with Blue. |
| Vine City | Not started | Interchange with Blue. |
| SEC District | Not started | Interchange with Blue. |
| Georgia State | Not started | Interchange with Blue. |
| King Memorial | Not started | Interchange with Blue. |
| Inman Park/Reynoldstown | Not started | Interchange with Blue. |
| Edgewood/Candler Park | Not started | Interchange with Blue. |
| Five Points | Not started | Interchange with Red/Gold/Blue. |

## Streetcar

No stations defined in `stations.ts` yet — out of scope for this rebuild until they exist.
