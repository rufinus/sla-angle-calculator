# Issue Tracker

## Open Issues

(none)

---

## Fixed Issues

### ISSUE-001: SVG diagram doesn't match reference - wrong visualization style and missing information

**Status:** Fixed
**Severity:** High
**Reported:** 2025-12-27
**Fixed:** 2025-12-27

**Problem:**
The SVG angle diagram didn't display information correctly compared to the RC87 reference implementation.

**Root causes found:**
1. Used complex 3D isometric blocks instead of simple 2D tilted rectangles
2. Angle formula was inverted: used `atan(layerHeight/pixelSize)` instead of `atan(pixelSize/layerHeight)`
3. No complementary angle (90° - angle) was shown
4. No arc visualization for the complementary angle

**Fix applied:**
1. Replaced 3D block rendering with 2D tilted rectangles (`createTiltedRect()`)
2. Fixed angle calculation: `atan(pixelSize/layerHeight)` gives angle from vertical (matches RC87)
3. Added `complementaryAngleX/Y` computed properties
4. Added arc path generation with `createArcPath()`
5. Updated SVG template with proper angle indicators and labels

**Files changed:**
- `js/app.js` - New 2D diagram calculations, fixed angle formula
- `index.html` - New SVG structure with tilted rectangles and arcs
- `css/app.css` - Updated styles for 2D diagram elements

**Verification:**
- Square pixels (20x20, layer 50): Shows 21.8014° (matches RC87)
- Non-square pixels (20x26, layer 50): Shows 21.8014° (X) and 27.4744° (Y)
- Complementary angles display correctly with arc visualization
- Single block for square pixels, two blocks for non-square
