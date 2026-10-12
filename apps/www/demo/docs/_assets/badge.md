# Badge fixture source specification

`badge.png` is the existing synthetic badge fixture moved from
`apps/www/public/demo/badge.png`, introduced there by commit `790a546`.
It represents no external service or captured application. This specification
is its reproducible source; PNG encoder metadata and compression may differ.

Draw an opaque, non-antialiased 160 × 40 RGB raster using these pixel coordinates
(zero-based, inclusive), then save it as `badge.png` beside this specification:

1. Fill the canvas with `#171717`.
2. Fill each row from x = 92 through x = 159 with `#22c55e`, except the rounded
   right corners. For y = 0…5, the last filled x is respectively
   153, 155, 156, 157, 158, 158. Mirror those endpoints at y = 39…34.
3. Draw five dots in `#fafafa` with left edges x = 14, 28, 42, 56, 70, and four
   dots in `#0a0a0a` with left edges x = 104, 118, 132, 146. Each dot uses nine
   rows y = 16…24. Relative to its left edge, fill these inclusive x ranges:
   3…6, 2…7, 1…8, 0…9, 0…9, 0…9, 1…8, 2…7, 3…6.

The fixture tests require a 160 × 40 original that preserves its 4:1 ratio.
This Markdown source stays private when Duxt publishes the PNG.
