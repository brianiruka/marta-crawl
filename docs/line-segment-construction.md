# Rebuilding `martaLinePaths.json` as per-station segments

`martaLinePaths.json` originally held one giant continuous path per line
(e.g. all of `red[1]` from North Springs down to Five Points as a single
closed contour). We're rebuilding this station-by-station into separate
segments — each its own entry in the line's array — so individual stretches
can be reshaped without fighting a single sprawling `d` string. This doc
captures the rules discovered while doing that, so each new segment is built
consistently instead of re-deriving the same fixes.

## Station markers are a separate layer

`StationHole` (`src/components/StationHole.tsx`) draws the actual visible
ring at every station: a fixed-size outer disc (`OUTER_R`) with a fixed-size
inner hole (`INNER_R`) cut via `fillRule="evenodd"`, positioned from
`src/data/stationBulges.ts`. It's drawn on top of the line paths, not part of
them — a segment's job is just to connect cleanly into the area where that
ring will sit, not to draw the ring itself.

## How a segment should end at a station — the scallop pattern

A segment doesn't connect to a station by meeting its center at one precise
point, and it doesn't need to be tangent to some circle, either. Both of
those were tried earlier (see git history on the North Springs/Sandy Springs
connector) and turned out fragile — a single mis-angled line or a
slightly-off tangent point is enough to leave a visible gap or carve a
corner into the fill. The pattern that replaced them, used now for every
segment end:

1. Let the segment's normal curve run toward the station as it naturally
   would.
2. Instead of closing at one sharp point right at the station, break the
   approach into **three or four points that loosely orbit the station's
   center** at varying distances — dipping closer, pulling back out, closer
   again — rather than landing on a single spot or following a perfect arc.
3. Smooth those points into one continuous curve (a Catmull-Rom spline
   converted to cubic Béziers works well) so the result reads as a soft
   scalloped wave, not a polyline with corners.
4. Keep every point in that wave **inside `OUTER_R`** (so the segment's fill
   reaches well past where the ring will be drawn — overlap, not a
   boundary-to-boundary meeting) and **outside the center itself by a
   reasonable margin** (the wave should orbit the center, never pass through
   it).

Because the segment and the ring share the same fill color, the overlap
region is invisible — there's no seam that has to land exactly right, which
is what made the tangent/arc approach so easy to get subtly wrong. Repeat
this same four-point scallop at both ends of every new segment.

**The scallop only shapes the outside of the marker — it does not, by
itself, create a hole.** This is a hard requirement, not an optional
follow-up: a closed path with a wavy boundary is still one solid filled
region all the way to its center, no matter how far that boundary orbits
away from the center point. Staying clear of the center keeps the boundary
*curve* from cutting through it, but the *area* at the center is still
filled unless something explicitly says otherwise. The only way to make
that area genuinely transparent (showing the dark page background, not the
segment's own color) is a second, separate closed subpath — a plain circle
of radius `INNER_R` at the station's exact `(cx, cy)`, appended after the
segment's main `z`, with the whole `<path>` rendered `fillRule="evenodd"`.
**Every segment end that lands on a station must include both pieces: the
scallop (shapes the outer edge) and the inner-circle subpath (creates the
hole). Neither one substitutes for the other.** A segment with a nice
scallop and no inner-circle subpath will still render as a solid filled
disc at that station — exactly the defect found when Dunwoody was built
without it.

To verify this isn't just visually assumed: after rendering, sample the
pixel color at the station's exact `(cx, cy)` (not a nearby ring-shaped
glance) and confirm it matches the page background, not the line's fill
color.

## Closing a segment off cleanly

When a segment ends at a real terminus (not at a station, but where the
line simply stops), close it with a clean rounded cap, not a straight or
pointed cut — a pointed tail reads as "still reaching toward" whatever it
used to connect to, even once there's a visible gap. See the
Bankhead/Hamilton terminus fixes earlier in the project history for the
kappa=0.5523 quarter-circle construction.

## Disconnected ("floating") pieces need an actual gap

If two stations should *not* read as connected (e.g. North Springs/Sandy
Springs floating apart from the rest of the line after a cut), a structurally
separate array entry isn't enough on its own — if its closing edge lands on
the exact same coordinates as the neighboring segment's starting edge, they
render edge-to-edge and look like one continuous line. Pull the cut point
back on at least one side so there's empty space between the two shapes when
rendered together.

## Quick checklist for each new segment

1. Identify the cut point(s) in the original `d` string (or construct new
   geometry) for the stations this segment should include.
2. At each end that meets a station, replace the native approach with the
   four-point scallop (above): points orbiting the center at varying
   distances, smoothed into a curve, all inside `OUTER_R`, none passing
   through the center.
3. **At every one of those same station ends, also append a separate
   `INNER_R`-radius circle subpath at the station's exact `(cx, cy)`,
   after the segment's closing `z`, and confirm the `<path>` uses
   `fillRule="evenodd"`.** This step is mandatory, not conditional — do it
   even if the scallop alone "looks" fine in a quick render. Skipping it is
   exactly what produced a solid-filled Dunwoody.
4. At each end that's a real terminus (not a station), close with a rounded
   cap instead of a point. (Termini still get the `INNER_R` hole from step 3
   if a marker renders there — only skip step 3 where no marker exists.)
5. Render the literal live page (dev server, actual component output) and
   sample the pixel color at the station's exact `(cx, cy)` — confirm it's
   the page background, not the line's fill color. A ring-shaped glance at a
   thumbnail is not a substitute for this; it's what missed Dunwoody's solid
   center.
6. If splitting a piece off as deliberately disconnected, confirm a visible
   gap exists between it and its former neighbor.
