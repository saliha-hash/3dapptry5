Vernier Calliper website update

Files to publish together in the same GitHub Pages folder:
- index.html
- script.js
- verniercaliper.glb

Changes in this build:
- Keeps the supplied GLB model and its original embedded materials/scale texture; no generated ruler texture or recolouring is applied.
- Does not hide model parts during setup.
- Object Dimensions panel starts open and is automatically opened when an object is selected.
- Remove Object button is in the Objects section and blue.
- Apply Zero Error button uses the neutral button style.
- Applying/resetting zero error updates the displayed measurement and offsets the movable jaw/vernier assembly visually.
- Plus/minus zoom steps are stronger (0.60x and 1.67x camera distance).
- On returning to the page after Android suspends it, the renderer is asked to restore its existing exposure and redraw.

Validation performed: JavaScript syntax check with Node.js. A full live-browser interaction test on the user's phone was not performed.
