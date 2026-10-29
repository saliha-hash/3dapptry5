# Vernier Calliper — four-file replacement

Replace these four files together in the root of the GitHub Pages repository:

- `index.html`
- `script.js`
- `verniercaliper.glb`
- `README.md`

Keep all four in the same folder. The page loads Three.js modules from jsDelivr and requires an internet connection.

## Fixes in this revision

- Restores the original main-scale UV mapping. The previous face-by-face V remap sent the scale to a blank texture region, which made the main scale appear white or missing.
- Keeps all three generated ruler texture bands marked so whichever existing GLB UV band is used by the front face still shows the numbered main scale.
- Clears the exposed duplicate ruler ticks on the fixed beam's atlas outside the vernier strip, while retaining the separate main scale.
- Replaces the dark carriage plate atlas area with a brighter satin-silver patch.
- Applies the atlas texture only to materials that actually use the metal atlas; it no longer overwrites the separate object texture.
- Scales the physical zero-error mark shift to the ruler's actual pixels-per-millimetre, so vernier labels should remain in view instead of sliding off the strip.
- Rebuilds the WebGL renderer when the page returns from the background, which addresses Android browsers that resume with a black canvas.

## Validation and limitation

The JavaScript syntax was checked with Node, and the original GLB is retained. A live Android WebGL session was not available, so the final visual appearance and on-device tab-resume behavior are not claimed as browser-tested.
