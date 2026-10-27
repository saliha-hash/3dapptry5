VERNIER CALLIPER — CONTROL AND ZERO-ERROR UPDATE

Files in this ZIP:
- index.html
- script.js
- verniercaliper.glb (the original 3D model)
- README.md

Updates:
- Jaw View now frames the jaw end instead of zooming into the centre of the ruler.
- Plus/minus zoom buttons use stronger steps and a wider zoom range.
- Apply Zero Error now offsets the physical sliding carriage as well as updating the observed and corrected reading.
- Resetting zero error returns the physical carriage to its zero-error position.
- Added a dedicated Remove Object button in the Objects section; the existing jaw-control removal action remains available.
- How It Works opens from the Learn tab and its accordion arrow can expand/collapse the panel.
- Existing GLB model retained; the upper extra scale/black strip may still need a targeted mesh/material edit after checking the live 3D render, because the screenshot alone does not identify the exact GLB mesh safely.

Install:
Upload/replace index.html and script.js in the repository root, and keep verniercaliper.glb in the same folder. README.md is optional.

Checks:
JavaScript syntax was checked with Node. A full browser/WebGL visual test was not available here, so please check the model on GitHub Pages after replacing the files.
