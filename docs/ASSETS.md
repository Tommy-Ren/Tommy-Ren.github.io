# Visual asset sources

## Tommy's 3D avatar

The user supplied `public/models/tommy-avatar.glb`, a stylized head with black hair and glasses. Its metadata identifies Tripo as the exporter. The original is preserved unchanged. `public/models/tommy-avatar-web.glb` is the derived runtime version: 3,764,964 bytes, 289,656 triangles, two embedded 2048 × 2048 WebP textures, with Meshopt geometry compression. Exact optimization settings, original statistics, and validation are documented in `public/models/README.md` and reproducible with `scripts/prepare-avatar.mjs`.

`public/images/tommy-avatar.webp` is a transparent 1000 × 1080 render of the same optimized model, using the homepage's neutral pose, camera and studio lighting. It is the loading poster and WebGL failure fallback. The original model has no animation clips or skin; mouse following and floating are procedural movement of the whole head. There is no invented blinking or facial animation.

## Reference artwork

These five assets were supplied in the user-provided design brief. They are stored locally to avoid third-party runtime availability dependencies. They are reference illustrations, not photographs of Tommy, and do not represent Tommy's work or identity. The old hero head with freckles and silver hoop earrings is retained only as a source; Tommy's supplied avatar now replaces it on the homepage.

All five PNG file signatures, dimensions and image decoding were verified.

| Local file | Dimensions | Bytes | Source |
| --- | --- | ---: | --- |
| `public/images/reference/hero.png` | 1450 × 1570 | 2,557,944 | [Original PNG](https://shrug-person-78902957.figma.site/_components/v2/d24c01ad3a56fc65e942a1f501eb73db42d7cf9a/Rectangle_40443.81459862.png) |
| `public/images/reference/moon.png` | 714 × 714 | 213,785 | [Original PNG](https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/moon_icon.11395d36.png) |
| `public/images/reference/object.png` | 420 × 446 | 108,127 | [Original PNG](https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/p59_1.4659672e.png) |
| `public/images/reference/lego.png` | 708 × 862 | 432,502 | [Original PNG](https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/lego_icon-1.703bb594.png) |
| `public/images/reference/group.png` | 688 × 676 | 235,973 | [Original PNG](https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/Group_134-1.2e04f3ce.png) |

## MotionSites marquee references

The supplied GIFs are design-template previews, not Tommy's projects. Label their row as a visual moodboard if used. Requests were checked on 2026-10-10 with HEAD and byte-range HEAD; this probes metadata without downloading the full animations. Standard HEAD omitted Content-Length, so total bytes below were read from Content-Range.

| Source | HTTP status | Full payload bytes |
| --- | ---: | ---: |
| [hero-space-voyage-preview-eECLH3Yc.gif](https://motionsites.ai/assets/hero-space-voyage-preview-eECLH3Yc.gif) | 206 | 14,452,812 |
| [hero-codenest-preview-Cgppc2qV.gif](https://motionsites.ai/assets/hero-codenest-preview-Cgppc2qV.gif) | 206 | 8,431,024 |
| [hero-vex-ventures-preview-BczMFIiw.gif](https://motionsites.ai/assets/hero-vex-ventures-preview-BczMFIiw.gif) | 206 | 11,495,326 |
| [hero-stellar-ai-v2-preview-DjvxjG3C.gif](https://motionsites.ai/assets/hero-stellar-ai-v2-preview-DjvxjG3C.gif) | 206 | 10,573,276 |
| [hero-asme-preview-B_nGDnTP.gif](https://motionsites.ai/assets/hero-asme-preview-B_nGDnTP.gif) | 206 | 11,153,253 |
| [hero-transform-data-preview-Cx5OU29N.gif](https://motionsites.ai/assets/hero-transform-data-preview-Cx5OU29N.gif) | 206 | 8,635,170 |
| [hero-vitara-preview-Cjz2QYyU.gif](https://motionsites.ai/assets/hero-vitara-preview-Cjz2QYyU.gif) | 206 | 3,361,948 |
| [hero-terra-preview-BFjrCr7T.gif](https://motionsites.ai/assets/hero-terra-preview-BFjrCr7T.gif) | 206 | 7,008,252 |
| [hero-skyelite-preview-DHaZIgUv.gif](https://motionsites.ai/assets/hero-skyelite-preview-DHaZIgUv.gif) | 206 | 1,385,341 |
| [hero-aethera-preview-DknSlcTa.gif](https://motionsites.ai/assets/hero-aethera-preview-DknSlcTa.gif) | 206 | 13,543,814 |
| [hero-designpro-preview-D8c5_een.gif](https://motionsites.ai/assets/hero-designpro-preview-D8c5_een.gif) | 206 | 5,774,694 |
| [hero-stellar-ai-preview-D3HL6bw1.gif](https://motionsites.ai/assets/hero-stellar-ai-preview-D3HL6bw1.gif) | 206 | 7,720,369 |
| [hero-xportfolio-preview-D4A8maiC.gif](https://motionsites.ai/assets/hero-xportfolio-preview-D4A8maiC.gif) | 206 | 8,167,453 |
| [hero-orbit-web3-preview-BXt4OttD.gif](https://motionsites.ai/assets/hero-orbit-web3-preview-BXt4OttD.gif) | 206 | 11,477,083 |
| [hero-nexora-preview-cx5HmUgo.gif](https://motionsites.ai/assets/hero-nexora-preview-cx5HmUgo.gif) | 206 | 5,651,480 |
| [hero-evr-ventures-preview-DZxeVFEX.gif](https://motionsites.ai/assets/hero-evr-ventures-preview-DZxeVFEX.gif) | 206 | 8,714,367 |
| [hero-planet-orbit-preview-DWAP8Z1P.gif](https://motionsites.ai/assets/hero-planet-orbit-preview-DWAP8Z1P.gif) | 206 | 12,026,612 |
| [hero-new-era-preview-CocuDUm9.gif](https://motionsites.ai/assets/hero-new-era-preview-CocuDUm9.gif) | 206 | 10,688,001 |
| [hero-wealth-preview-B70idl_u.gif](https://motionsites.ai/assets/hero-wealth-preview-B70idl_u.gif) | 206 | 7,379,671 |
| [hero-luminex-preview-CxOP7ce6.gif](https://motionsites.ai/assets/hero-luminex-preview-CxOP7ce6.gif) | 206 | 8,471,722 |
| [hero-celestia-preview-0yO3jXO8.gif](https://motionsites.ai/assets/hero-celestia-preview-0yO3jXO8.gif) | 404 | Unavailable |

Total for the 20 accessible animations: **176,111,668 bytes (167.95 MiB)**. The supplied Celestia URL returns HTTP 404. No full marquee GIFs were downloaded during this assessment.

## Runtime recommendations

The CRT welcome sequence references the opening of the user-supplied `website.mp4`. Its continuous `hello` SVG path, monitor frame, scan lines, terminal copy, and progress bar are implemented locally in `BootIntro.tsx` and `BootIntro.css`. The recording itself is not bundled or played by the site; no additional media download is needed for this opening.

- Retain the two opposing scroll-driven rows, but use compact locally generated project or technology cards by default. This preserves the template movement without importing unrelated portfolio claims or the large GIF payload.
- If exact template previews are needed, convert a selected small set to compressed WebP poster images or muted loop videos with posters. Lazy-load only near the viewport.
- Do not mount three copies of 20 animated GIFs. Reuse presentation cards and hide duplicate rows from assistive technology.
- Honor prefers-reduced-motion by leaving the marquee still and avoiding animated image decoding.
- Keep the original PNGs as sources. A build-time local WebP conversion at their rendered sizes would further reduce load; no raster edits have been applied here.
