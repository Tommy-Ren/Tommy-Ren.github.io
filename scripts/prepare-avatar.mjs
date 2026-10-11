import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Tooling lives outside the website dependency tree. See public/models/README.md.
const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const toolsDir = process.env.AVATAR_TOOLS_DIR
  ? path.resolve(process.env.AVATAR_TOOLS_DIR)
  : path.join(repoDir, '.preview/model-tools');
const toolRequire = createRequire(path.join(toolsDir, 'tooling.cjs'));
const { NodeIO } = toolRequire('@gltf-transform/core');
const { ALL_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP } = toolRequire('@gltf-transform/extensions');
const { dedup, weld, simplify, prune, quantize, reorder, getBounds } = toolRequire('@gltf-transform/functions');
const { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } = await import(pathToFileURL(toolRequire.resolve('meshoptimizer')).href);
const sharp = toolRequire('sharp');
const validator = toolRequire('gltf-validator');

const input = path.join(repoDir, 'public/models/tommy-avatar.glb');
const output = path.join(repoDir, 'public/models/tommy-avatar-web.glb');
const options = { ratio: 0.15, error: 0.00075, positionBits: 14, normalBits: 12, texcoordBits: 14, textureSize: 2048 };

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const document = await io.read(input);

function inspect(doc) {
  const root = doc.getRoot();
  let vertices = 0, triangles = 0, primitives = 0;
  for (const mesh of root.listMeshes()) for (const primitive of mesh.listPrimitives()) {
    primitives++;
    vertices += primitive.getAttribute('POSITION').getCount();
    triangles += (primitive.getIndices()?.getCount() ?? primitive.getAttribute('POSITION').getCount()) / 3;
  }
  return {
    meshes: root.listMeshes().length, primitives, vertices, triangles,
    materials: root.listMaterials().length, skins: root.listSkins().length, animations: root.listAnimations().length,
    worldBounds: getBounds(root.listScenes()[0]),
    textures: root.listTextures().map(t => ({ name: t.getName(), format: t.getMimeType(), size: t.getSize(), bytes: t.getImage().byteLength })),
    extensionsRequired: root.listExtensionsRequired().map(e => e.extensionName),
  };
}

const before = inspect(document);
await document.transform(
  dedup(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: options.ratio, error: options.error }),
  prune(),
);
// Preserve authored colors, metallic/roughness factors, UVs, normals and normal map.
// Normal maps use lossless compression to avoid additional color compression errors.
const normalTexture = document.getRoot().listMaterials()[0].getNormalTexture();
for (const texture of document.getRoot().listTextures()) {
  const normal = texture === normalTexture;
  const encoder = sharp(texture.getImage()).resize(options.textureSize, options.textureSize, { fit: 'inside', withoutEnlargement: true });
  const data = await encoder.removeAlpha().webp(normal ? { lossless: true, effort: 6 } : { quality: 90, effort: 6 }).toBuffer();
  texture.setImage(data).setMimeType('image/webp');
}
document.createExtension(EXTTextureWebP).setRequired(true);
await document.transform(
  reorder({ encoder: MeshoptEncoder, target: 'size' }),
  quantize({ quantizePosition: options.positionBits, quantizeNormal: options.normalBits, quantizeTexcoord: options.texcoordBits }),
);
document.createExtension(EXTMeshoptCompression)
  .setRequired(true)
  .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
await io.write(output, document);

// Validate the container/spec, then fully decode all Meshopt geometry to check it.
const data = new Uint8Array(await fs.readFile(output));
const validation = await validator.validateBytes(data, { uri: path.basename(output), maxIssues: 200 });
const after = inspect(await io.read(output));
const versions = {};
for (const name of ['@gltf-transform/core', '@gltf-transform/extensions', '@gltf-transform/functions', 'meshoptimizer', 'sharp', 'gltf-validator']) {
  const packageFile = path.join(toolsDir, 'node_modules', name, 'package.json');
  versions[name] = JSON.parse(await fs.readFile(packageFile, 'utf8')).version;
}
const report = {
  input, output, options, versions,
  originalBytes: (await fs.stat(input)).size,
  optimizedBytes: data.byteLength,
  before, after,
  validation: validation.issues,
  runtime: {
    meshopt: 'GLTFLoader.setMeshoptDecoder(MeshoptDecoder), imported from three/addons/libs/meshopt_decoder.module.js',
    webp: 'native browser WebP decoding; no additional JS texture decoder',
    quantization: 'KHR_mesh_quantization handled by GLTFLoader',
  },
};
await fs.mkdir(toolsDir, { recursive: true });
await fs.writeFile(path.join(toolsDir, 'optimization-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (validation.issues.numErrors > 0) throw new Error('Optimized GLB validation failed.');
if (!after.triangles || !after.vertices || after.materials !== before.materials) throw new Error('Decoded GLB geometry/materials are invalid.');
