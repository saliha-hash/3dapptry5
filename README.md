# Vernier Calliper — four-file replacement

Replace these files together in the GitHub Pages repository root:
- `index.html`
- `script.js`
- `verniercaliper.glb`
- `README.md`

## Latest fixes
- Removed the generated scale-band outline that was creating a dark horizontal line above the main graduations.
- Darkened the main scale's satin-silver material and reduced environment reflections so it is less washed out against the rest of the calliper.
- Corrected the vernier atlas shift to use the scale's approximate 19 mm width, so applying zero error shifts the complete ticks-and-numbers strip by the right pixel amount rather than clipping it excessively.
- Limited zero-error entry to -5 mm through +5 mm, matching the slider and visible physical range.
- Recreates the WebGL renderer when returning from a long hidden/background period to reduce the black-screen failure on Android.

The original `verniercaliper.glb` is retained. JavaScript syntax is checked, but live Android WebGL rendering cannot be guaranteed without testing the deployed GitHub Pages site.
