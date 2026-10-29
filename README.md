VERNIER CALLIPER — CORRECTED SCALE AND OBJECT DIMENSIONS

Files in this ZIP:
- index.html
- script.js
- verniercaliper.glb (original 3D model)

Fixes in this version:
- Rebuilt the main-scale texture as continuous brushed silver-grey steel with dark graduations and labels; the main scale is retained.
- Made Object Dimensions accordion reliably open, and automatically expand it when an object is selected.
- Stopped the inner dimensions container from remaining hidden after startup or object removal.
- Retained the existing zero-error controls and mobile WebGL resume handling.

Install: replace index.html and script.js in the GitHub Pages repository root and keep verniercaliper.glb beside them.

Validation: script.js passed `node --check`. A live browser/WebGL visual test was not available in this environment, so confirm the visual result on GitHub Pages.
