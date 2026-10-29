VERNIER CALLIPER — FIXED BUILD

Files:
- index.html
- script.js
- verniercaliper.glb (original supplied 3D model)

Fixes in this build:
- Object-dimensions area remains visible after model initialization and after removing an object; choose a shape to enable its dimensions.
- Zero-error slider widened to -5.00 mm through +5.00 mm in 0.05 mm steps.
- Added an exact typed zero-error field accepting -20.00 mm through +20.00 mm.
- Slider and typed zero error stay synchronized when within the slider range.
- Removing an object closes the jaws while preserving the applied zero-error offset.
- Replaced the three duplicate generated scale rows with one clean main-scale row to remove extra scale markings/strips.
- Added mobile visibility/resizing and WebGL context-restoration handling to reduce the chance of a black viewer after switching tabs/apps.

Install:
Replace index.html and script.js in the GitHub Pages repository root. Keep verniercaliper.glb beside index.html. README.md is informational.

Note:
The physical GLB's exact top strip is part of the supplied model geometry/UV atlas. This build removes the extra generated scale rows; the precise GLB mesh strip may still need a model-level mesh edit if the original geometry itself shows a separate black strip.
