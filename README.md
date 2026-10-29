# Vernier Calliper — complete four-file replacement

Replace these four files together in the root of the GitHub Pages repository:

- `index.html`
- `script.js`
- `verniercaliper.glb`
- `README.md`

Keep all four in the same folder. The page loads Three.js modules from jsDelivr and therefore needs an internet connection.

## Changes in this build

- Keeps the main scale and remaps its front face to the marked silver band, while mapping top/back/end faces to a blank silver band. This removes the duplicate scale marks from the top face instead of deleting the main scale.
- Darkens the main scale's silver material so it reads as satin metal rather than white.
- Patches the original GLB metal atlas to remove the exposed upper duplicate tick row and replace the dark carriage rectangle with a brushed-silver surface. The atlas patch is also applied at runtime.
- Applying zero error shifts only the vernier graduations/labels on the carriage texture. The jaw and measured object stay in contact instead of the sphere being squeezed or displaced by the error adjustment.
- Retains the current object dimension controls and the renderer recovery handlers for returning to the page after Android pauses it.

## Validation

- JavaScript syntax checked with Node.
- GLB header, JSON, and embedded buffer-view offsets checked after the texture atlas edit.
- The atlas image was inspected after patching. A live Android WebGL render was not available here, so the exact on-device appearance and zero-error direction still require confirmation on GitHub Pages.
