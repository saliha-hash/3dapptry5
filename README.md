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
- Kept the main scale in place and generated one clean main-scale row.
- Fixed the texture enhancement so it no longer overwrites unrelated mapped surfaces, which could create a dark rectangular patch above the main scale.
- Added mobile visibility/resizing and WebGL context-restoration handling to reduce the chance of a black viewer after switching tabs/apps.

Install:
Replace index.html and script.js in the GitHub Pages repository root. Keep verniercaliper.glb beside index.html. README.md is informational.

The main scale has NOT been removed. The fix targets the texture assignment that could place a dark rectangle on the carriage above the main scale.
