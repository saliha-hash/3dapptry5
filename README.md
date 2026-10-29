# Vernier Calliper — Four-file replacement

Replace these four files together in the GitHub Pages repository root:

- `index.html`
- `script.js`
- `verniercaliper.glb`
- `README.md`

Keep the original GLB model. The index page imports Three.js from jsDelivr, so the page needs an internet connection to load that library.

## Fixes in this build

- Keeps the true generated main scale and gives its surface a darker satin-silver finish rather than a washed-out white appearance.
- Patches the embedded GLB atlas on the exposed left/right ends of the slider to remove the duplicate small tick row while leaving the centered vernier numbers intact.
- Replaces the dark rectangle under the sliding carriage with a brushed-silver patch and applies the patch to all GLB materials that use that texture atlas.
- Measures the moving jaw's actual mesh offset and aligns its contact face to the fixed jaw. Object size and jaw contact remain unchanged when applying zero error; the reading receives the zero-error correction.
- Keeps Object Dimensions expanded at all times and scrolls to the inputs when an object is selected.
- Stops rendering while the page is hidden and includes a fallback that rebuilds the renderer if Android/WebGL does not restore its context after returning to the page.

## Checks performed

- JavaScript module syntax check passed with Node.
- Confirmed the ZIP contains all four files and the GLB binary is unchanged.
- A live Android WebGL visual test was not available in this environment, so the final on-device appearance and return-from-background behavior still need confirmation on GitHub Pages.
