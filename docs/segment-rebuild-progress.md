# Per-station segment rebuild — progress grid

Tracks `martaLinePaths.json`'s rebuild from one giant path per line into
separate per-station segments (see `docs/line-segment-construction.md` for
the construction rules). One row per (station, line) pair — interchange
stations appear once per line they're on, since each line has its own
array in the JSON.

Status values: **Done** (segment built and verified live), **Planned**
(construction worked out and checked analytically, not yet written to the
file), **Not started**.

## Red line

| Station | Status | Notes |
|---|---|---|
| North Springs | Done | Native terminus cap kept as-is — already a clean circle, no rebuild needed. |
| Sandy Springs | Done | Native bulge replaced with explicit r=12 circle, connected to the existing neck via true tangent-line connectors. Floating apart from the rest of the line (deliberate gap, no connection to Dunwoody onward). Verified against the live render. |
| Dunwoody | Done | Rebuilt as its own "Sandy Springs to Dunwoody" segment using the scallop pattern (see `docs/line-segment-construction.md`): native bulge replaced with a 4-point wave orbiting (1237, 298), smoothed via Catmull-Rom, native approach curves on both sides kept unchanged. Segment ends here for now (Medical Center onward not yet built) — Dunwoody temporarily reads as a line-end. Verified against the live render. |
| Medical Center | Not started | Floating marker only, no line geometry yet. |
| Buckhead | Not started | Floating marker only, no line geometry yet. |
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
