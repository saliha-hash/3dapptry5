VERNIER CALLIPER — CONTROL AND SCALE FIXES

Files in this ZIP:
- index.html
- script.js
- verniercaliper.glb
- README.md

Changes in this build:
- Added an explicit Apply Dimensions button for the selected object.
- Expanded zero-error entry to −5.00 mm through +5.00 mm in 0.05 mm steps.
- Added a numeric zero-error input as an alternative to the slider. Press Apply Zero Error to commit it.
- Removing an object now closes the jaws automatically.
- The generated scale texture now draws graduations on only one UV band; the other bands are plain steel to avoid duplicate scales. Removed the generated band border that could appear as a black line.
- Jaw View frames the jaw end; zoom buttons use stronger increments.

Install:
Upload/replace index.html and script.js in the repository root, and keep verniercaliper.glb in that same folder. README.md is optional for the website.

Mobile/WebGL recovery:
- Reduced the renderer pixel ratio on mobile to lower GPU memory pressure.
- Added WebGL context-loss/context-restoration handlers. When the browser restores the context, textures and materials are marked for upload again and the scene is redrawn.
- Added a visibility-change redraw and viewport refresh when returning to the page after switching tabs/apps.

Validation:
JavaScript syntax was checked with Node. A complete visual browser test was not available. The supplied GLB model itself is retained; only its generated scale texture, interactive controls, and WebGL recovery handling are changed.
