# Transit diagram design guide

Reference notes for improving `MartaMap`/`StationMarker`/`stations.ts`. Compiled
because the original ask — Robert Aehnelt's 2018 "Transit Maps Design Study |
Busy Routes" (linked via an [r/TransitDiagrams post](https://www.reddit.com/r/TransitDiagrams/comments/kd1h3b/robert_aehnelts_transit_map_design_study_2018/))
— wasn't reachable: Reddit's gallery blocked direct fetching, and the study's
host site (`transit.robertaehnelt.de`) is currently down with no Wayback
Machine snapshot. What's confirmed about that study secondhand (via a Pinterest
reference to "Transit Maps Design Study | Busy Routes"): it focuses on visual
hierarchy, color differentiation between routes, and clear directional
indicators on high-traffic line segments — consistent with, and folded into,
the principles below.

In its place, this guide draws on the closest rigorous substitute: **Wu et
al., "A Survey on Transit Map Layout – from Design, Machine, and Human
Perspectives," Computer Graphics Forum, 2020** ([PMC7539984](https://pmc.ncbi.nlm.nih.gov/articles/PMC7539984/),
[Wiley](https://onlinelibrary.wiley.com/doi/full/10.1111/cgf.14030)) — an
academic synthesis of transit-map design literature, including the Beck/TfL
and Vignelli schools this style descends from. If the original Aehnelt study
resurfaces, fold its specifics in alongside this.

The user later shared a concrete reference image (a "'900 Design Map" poster —
Italian design-history infographic styled as a transit diagram) that's closer
to the desired look than either the academic survey alone or our first pass.
Its specific contributions, folded into the sections below: **rounded
(filleted) corners instead of sharp octolinear miters**, and **co-routed
lines drawn as separate parallel tracks instead of one overdrawing the
other**. Its other traits — fully external labeling (no inline station
names) and neutral black/white station markers regardless of line — were
explicitly *not* adopted, since our map is interactive (a user needs to read
station names to click the right one) where that poster is a static image.

## Layout & geometry

- **Octolinearity is the de facto standard**: every line segment should be
  horizontal (0°), vertical (90°), or diagonal (45°/135°) — no other angles.
  This is what `MartaMap` already does via the 35-unit grid in `stations.ts`.
- **Even station spacing** along a line aids both grid alignment and a sense
  of rhythm — avoid stretches where spacing varies arbitrarily between
  adjacent stations on the same line.
- **Simplify trajectories**: minimize the number of direction changes per
  line. Prefer one clean bend over several small ones. Real curved/looping
  routes should be straightened into clean geometric shapes, not traced
  literally.
- **Enlarge dense areas, compress sparse ones.** Central/downtown clusters
  (our Five Points / Lindbergh Center / trunk corridor) legitimately get more
  visual space per station than outlying single-line stretches — this is
  standard practice, not an inaccuracy.
- **Minimize connection crossings** (two different lines crossing mid-segment)
  more aggressively than station crossings (lines crossing exactly at a
  shared vertex) — a station crossing at a real interchange (Five Points) is
  expected and correct; an incidental line-over-line crossing elsewhere is a
  layout smell worth re-routing around.
- **Preserve relative positions** of stations where reasonably possible —
  schematization should distort geography, not invert it (a station that's
  east of another in reality shouldn't end up west of it on the diagram
  without a strong legibility reason).

## Line styling

- **Rounded corners over sharp miters.** Octolinearity governs the *angles*
  a line can bend through, not whether the bend itself is a hard corner.
  `MartaMap`'s `roundedLinePath` shortens each segment on either side of a
  bend by `CORNER_RADIUS` and blends between them with a quadratic curve —
  every bend in the system (45° and 90° alike) gets the same fillet radius,
  which is what makes it read as a deliberate style rather than per-corner
  inconsistency. Radius is clamped to half the shorter adjacent segment so
  it can't overshoot on the system's shortest (diagonal) segments.
- **Co-routed lines must never literally overlap.** Two lines sharing trunk
  track (Red/Gold from Lindbergh Center to the Airport; Blue/Green from
  Ashby to Edgewood/Candler Park) sit on *identical* station coordinates —
  drawing both undoctored means one polyline completely hides the other.
  `linePoints()` in `stations.ts` applies a small fixed perpendicular
  `LANE_OFFSET` to each line across exactly that shared stretch (and only
  that stretch — unshared portions, like Red's own diagonal branch, use the
  true coordinate), so both render as distinct parallel tracks. The offset
  is kept smaller than every station marker's radius, so the lines still
  visually connect to the dot at each shared station rather than appearing
  to miss it by a few units.

## Color

- **Maximize perceptual distance between line colors.** Adjacent/parallel
  lines should never be colors a viewer could confuse at a glance — verify
  any new line color token against the existing `line-red/gold/blue/green`
  set, not just against neutrals.
- Colored diagrams measurably outperform monochrome ones for route
  interpretation (eye-tracking studies) — keep line color as the primary way
  to distinguish routes, not pattern/dash alone.
- Maintain **overall color harmony** — the existing dark background +
  saturated line colors + white text is consistent with this; any added UI
  chrome (legends, buttons) should pull from the same token palette rather
  than introducing new arbitrary colors.

## Stations & interchanges

- **Vary station marker style by role**: terminal, regular stop, and
  interchange should be visually distinct in size/shape/silhouette — not just
  color. Implemented: regular stops are a small hollow circle (white fill,
  line-colored stroke); termini (`Station.terminal`) are a small filled dot
  in the line's color; interchanges are a larger ring split into one colored
  wedge per line meeting there (a donut "pie," via `donutWedgePath` in
  `StationMarker.tsx`), so e.g. Five Points visibly shows all 4 colors
  instead of one.
- **Stations should never visually overlap** — distinct stations need
  distinct, separated positions even under heavy schematization.

## Labels

- **Pick one consistent label side per line section** rather than ad hoc
  per-station choices — readers track a line visually and expect its labels
  to stay on a predictable side. Our current `labelSide` overrides
  (alternating top/bottom along the horizontal corridor, left/right split
  between the two parallel diagonals) are deliberate exceptions made *because*
  the default collided — that's the correct use of the escape hatch, not a
  pattern to extend casually elsewhere.
- **Default to horizontal label text.** Diagonal or vertical orientation is
  acceptable only when horizontal text would otherwise collide — prefer
  fixing it via spacing/side first, rotation as a last resort (we haven't
  needed rotation yet; if a future dense cluster needs it, it's the
  documented fallback, not the first move).
- **Keep labels overlap-free and close to their station** — small fixed
  offset preferred over leader lines unless density forces it. If a future
  station genuinely can't fit a same-side label without overlap even after
  spacing/side adjustments, a short leader line (small tick from station to
  a label placed further out) is the standard fallback before resorting to
  abbreviation.
- **Condensed type and hyphenation** are the standard fixes for long names in
  tight spots — we already widened spacing for the worst offenders
  (`Inman Park/Reynoldstown`, etc.) rather than shrinking type further; if
  density increases later, a slightly condensed font face is preferable to
  shrinking `FONT_SIZE` again, since legibility has a floor.

## Quantifiable checks worth re-running after any layout change

Borrowed from the survey's metric set — useful as a quick self-review
checklist, not something to automate:

1. **Topology preserved** — no line accidentally implies a connection that
   doesn't exist, or omits one that does.
2. **Straightness** — count bends per line; flag any bend that isn't at a
   real-world turn or interchange.
3. **Edge-length uniformity** — spacing between consecutive same-line
   stations shouldn't vary wildly without a density reason.
4. **Label disjointness** — screenshot at a few viewport widths (see
   `/tmp/pw-runner` pattern used during the responsive rebuild) and visually
   confirm no two labels overlap.
5. **Crossing count** — connection crossings (not station crossings at real
   interchanges) should trend toward zero as the diagram is refined.

## Superseded (2026-06-20)

`MartaMap` no longer hand-draws line geometry or station markers — it
composes the source map SVG's own kept artwork (`MartaMapBase`) with a live
`<text>`/interactivity overlay (`StationMarker`). The **Line styling** and
**Stations & interchanges** sections above (rounded corners, lane-offset for
co-routed track, donut-wedge interchange markers, terminal-dot styling) no
longer apply — that geometry comes from the kept SVG artwork, not from this
codebase. **Layout & geometry**, **Color**, and **Labels** still apply
conceptually (they describe what the source map already does well), but
aren't enforced by code here anymore.

## Open follow-ups for this project

- If the real Aehnelt gallery becomes reachable later, revisit this doc and
  fold in anything specific to its "busy routes" framing that isn't already
  covered above.
