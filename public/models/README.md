# Tommy avatar model

`tommy-avatar.glb` is the original 3D avatar file provided by the user. It is preserved unchanged. Its embedded generator field identifies Tripo. It contains one mesh, one triangle primitive and one PBR material; there are no skins or animation clips.

`tommy-avatar-web.glb` is the website version generated from that original by `scripts/prepare-avatar.mjs`. Authored UVs, vertex normals, base-color/normal textures, double-sided rendering, metallic factor 0 and roughness factor 0.5 are retained. Simplification, quantization and texture resizing are lossy; the normal map is encoded losslessly after resizing.

| Property | Original | Web version |
| --- | ---: | ---: |
| File bytes | 64,061,996 | 3,764,964 |
| Triangles | 1,931,091 | 289,656 |
| Vertices | 1,003,118 | 170,295 |
| Base-color texture | 4096 × 4096 JPEG, 2,821,418 B | 2048 × 2048 WebP, 395,880 B |
| Normal texture | 4096 × 4096 PNG, 5,965,798 B | 2048 × 2048 lossless WebP, 944,696 B |

The web file is 94.1% smaller and renders 85.0% fewer triangles. Original world bounds are x −0.426666 to 0.426666, y 0 to 0.979858, and z −0.440155 to 0.440155. Decoded web bounds differ by less than 0.000164 units per coordinate. These are asset coordinates, not geographic coordinates.

## Rebuild

Run these commands from the repository root with Node.js and npm installed. Optimization packages are installed only into the ignored `.preview/model-tools` directory. The website's `package.json` and lockfile are not changed.

```powershell
npm install --prefix .preview/model-tools --no-save --package-lock=false @gltf-transform/core@4.5.0 @gltf-transform/extensions@4.5.0 @gltf-transform/functions@4.5.0 meshoptimizer@1.3.0 sharp@0.35.5 gltf-validator@2.0.0-dev.3.10
node scripts/prepare-avatar.mjs
```

To use a different independent tool directory, set `AVATAR_TOOLS_DIR` to its absolute path after installing the same packages there. Reports are written into that directory.

The pipeline deduplicates and welds equivalent vertices; simplifies toward a 0.15 triangle ratio with an error limit of 0.00075; resizes both textures to 2048 pixels; writes base color at WebP quality 90 and normal data as lossless WebP; reorders vertices; quantizes position/normal/UV data to 14/12/14 bits; and encodes geometry with Meshopt. It also validates and fully decodes the result. The optional, unrecognized original `FB_ngon_encoding` tag carries no required rendering data and is not retained in the web file.

## Runtime decoding

The output requires `EXT_meshopt_compression`, `EXT_texture_webp`, and `KHR_mesh_quantization`. Three.js GLTFLoader supports quantized attributes and browser WebP images. Configure its Meshopt decoder explicitly:

```ts
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
```

No Draco or KTX/Basis decoder is needed.

## Verification

The Khronos glTF validator reported zero errors. It reports one tangent-space portability warning because the original model has no authored tangent attribute, and one informational message because this validator does not inspect Meshopt internals. Independent NodeIO Meshopt decoding and Three.js GLTFLoader loading in headless Edge both succeeded. The browser rendered exactly 1,931,091 and 289,656 triangles, with one draw call per version and no page errors. A side-by-side render at the intended presentation scale retained the face, glasses, hair silhouette and material appearance.

Local QA evidence is preserved in `.preview/model-tools/optimization-report.json`, `browser-validation.json`, and `avatar-comparison.png`. The original inspection/optimization scripts also remain there as historical evidence.

## Independent eye version

The website now loads `tommy-avatar-eyes-web.glb` (3,827,368 bytes, 307,653 triangles). `tommy-avatar-web.glb` remains the unrigged optimized source. The eye version has a `Head` parent, fixed `Head_Surface`, and independent `Eye_L` / `Eye_R` pivots, whose local +Z is forward. Quantized geometry lives under each eye's child surface so compression cannot shift the authored rotation center.

The authored brown iris, pupils, visible eye geometry, UVs and normals are retained. The spherical eye surface is segmented from the head; a closed shell extends the hidden eye surface and stays behind the iris using raycast depth. Fixed eyelids, glasses and eye corners remain with the head. Eyes are limited to 12 degrees yaw and 6 degrees pitch in the runtime. This is an object rig; there are no skin weights or blink morph targets.

The editable Blender 5.1 source is `artwork/avatar/tommy-avatar-eye-rig.blend`. Select `Gaze_Target` and move it in X (horizontal) or Z (vertical) to inspect the eye constraints. Its neutral position is `(0, -4, 0.406)` in Blender coordinates. The hidden `Reference_Original_Web_Head` collection provides the unmodified web head for comparison. The original full-detail GLB is also preserved unchanged.

To rebuild, install the same separate optimization tooling documented above, then run from the repository root (adjust the Blender executable path for your installation):

```powershell
node scripts/prepare-avatar-eyes.mjs --prepare-input
& 'D:/Software/Blender 5.1/blender.exe' --background --python scripts/build-avatar-eyes.py
node scripts/prepare-avatar-eyes.mjs
```

The construction script regenerates the editable source from the unrigged web asset. It exports the eyes in their neutral pose before enabling the Blender gaze constraints. Compression preserves the eye hierarchy without a second mesh simplification, validates the GLB and independently decodes it. Generated intermediates and reports remain in the ignored `.preview/model-tools` directory.
