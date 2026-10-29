VERNIER CALLIPER — SCALE, OBJECT FIT AND MOBILE GRAPHICS FIX

Files in this ZIP:
- index.html
- script.js
- verniercaliper.glb (original 3D model retained)
- README.md

Changes in this build:
- Kept the main scale; removed the duplicate markings from the visible top/reverse scale face while retaining a silver surface.
- Replaced the dark rectangular carriage texture patch with brushed silver in the GLB's metallic texture atlas.
- Zero-error adjustment changes the observed/corrected reading without moving the jaw away from the selected object.
- Object Dimensions opens by default and is expanded when an object is selected.
- Pauses rendering while the page is hidden, resumes on visibility/pageshow, and requests WebGL context restoration instead of reloading the page when the context-restored event fires.
- Original model file kept unchanged.

Install by replacing index.html and script.js in the GitHub Pages repository root. Keep verniercaliper.glb beside them.

Validation: JavaScript syntax and required ZIP contents are checked locally. A live mobile browser/WebGL visual test is not available in this environment.
