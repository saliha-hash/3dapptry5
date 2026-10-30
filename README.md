VERNIER CALLIPER — FIX UPDATE

Files in this ZIP (upload all to the repository root, replacing the old ones):
- index.html
- script.js
- verniercaliper.glb (unchanged)
- README.md

What was fixed:
1. Object Dimensions: the section was empty until an object was chosen. It now always shows a hint, and the size fields appear once an object is selected.
2. Zero error: slider and typed box now share one range, -5.00 to +5.00 mm (set by ZERO_RANGE at the top of script.js) (snapped to the 0.05 mm least count). Press Apply Zero Error (or Enter). The Apply button is no longer solid blue.
3. Zero error is now shown on the 3D caliper by shifting the main-scale graduations against the vernier zero, so the jaws always stay exactly on the object. Negative values with closed jaws are written as e.g. -1 mm + 14 x 0.05 = -0.30 mm.
4. Removing an object now closes the jaws automatically (smooth slide). To keep the jaws open instead, set CLOSE_JAWS_ON_REMOVE = false at the top of script.js.
5. Removed the black line along the top of the main scale (and the matching dark line along its bottom edge), the second row of tick marks, and the dark inch-scale bar ("1/128 in") above the main scale. The sliding part's upper housing keeps a plain steel colour.
6. Caliper turning black after leaving the page and coming back: the steel reflection map is lost when the browser frees graphics memory. It is now rebuilt automatically when the page returns (and after a WebGL context loss).
7. The jaw slider label now says 100 mm (the real limit) instead of 150 mm.

UPDATE 2 — vernier alignment and one even steel look:
8. The vernier scale is now drawn by the program instead of using the photo. It has exactly 20 divisions over exactly 19 mm (0.95 mm each, least count 0.05 mm) and its zero line sits at the same position as the main-scale 0. With the jaws closed and zero error 0.00 mm, the vernier 0 coincides exactly with the main-scale 0 and every vernier line follows the correct spacing, so coincidence readings are true. The main-scale graduations are also drawn at exact positions (no pixel rounding).
9. The whole caliper now uses one steel look: the main scale, vernier, jaws and body share the same colour, shine and fine brushed grain, and the photo parts no longer have the pink or blue tint. The sliding part's upper housing and upper blade are plain steel too.
10. A thin white line under the vernier scale (from the photo) was removed.
Tuning knobs at the top of script.js: STEEL_COLOR (overall brightness), STEEL_METALNESS, STEEL_ROUGHNESS, STEEL_GAMMA.
