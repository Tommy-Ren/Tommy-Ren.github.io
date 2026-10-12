import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const toolDir = process.env.AVATAR_TOOLS_DIR ? path.resolve(process.env.AVATAR_TOOLS_DIR) : path.join(repo,'.preview/model-tools');
const require = createRequire(path.join(toolDir,'tooling.cjs'));
const {NodeIO} = require('@gltf-transform/core');
const {ALL_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP} = require('@gltf-transform/extensions');
const {dequantize, dedup, weld, reorder, quantize} = require('@gltf-transform/functions');
const {MeshoptEncoder, MeshoptDecoder} = await import(pathToFileURL(require.resolve('meshoptimizer')).href);
const sharp = require('sharp');
const validator = require('gltf-validator');
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});
await fs.mkdir(toolDir,{recursive:true});
if(process.argv.includes('--prepare-input')) {
  const doc = await io.read(path.join(repo,'public/models/tommy-avatar-web.glb'));
  await doc.transform(dequantize());
  for(const e of doc.getRoot().listExtensionsUsed()) if(['EXT_meshopt_compression','KHR_mesh_quantization'].includes(e.extensionName)) e.dispose();
  await io.write(path.join(repo,'.preview/model-tools/tommy-avatar-decoded.glb'),doc);
  console.log('Decoded the unrigged avatar for Blender. Run scripts/build-avatar-eyes.py next.');
} else {
  const doc = await io.read(path.join(repo,'.preview/model-tools/tommy-avatar-eye-rig-raw.glb'));
  // Quantization may recenter mesh nodes. A separate empty parent protects each
  // authored eyeball center while its child mesh receives quantization offsets.
  const authoredPivots = {};
  for(const name of ['Eye_L','Eye_R']) {
    const node = doc.getRoot().listNodes().find(n=>n.getName()===name);
    if(!node?.getMesh()) throw Error('Missing authored eye mesh: '+name);
    authoredPivots[name] = node.getTranslation().slice();
    const surface = doc.createNode(name+'_Surface').setMesh(node.getMesh());
    node.setMesh(null).addChild(surface);
  }
  const normalTextures = new Set(doc.getRoot().listMaterials().map(m=>m.getNormalTexture()).filter(Boolean));
  for(const texture of doc.getRoot().listTextures()) {
    const data = await sharp(texture.getImage()).resize(2048,2048,{fit:'inside',withoutEnlargement:true}).webp(normalTextures.has(texture)?{lossless:true,effort:6}:{quality:90,effort:6}).toBuffer();
    texture.setImage(data).setMimeType('image/webp');
  }
  doc.createExtension(EXTTextureWebP).setRequired(true);
  // The head was already simplified. Preserve authored iris geometry and node
  // pivots; no second simplification or flattening of the object hierarchy.
  await doc.transform(dedup(),weld(),reorder({encoder:MeshoptEncoder,target:'size'}),quantize({quantizePosition:14,quantizeNormal:12,quantizeTexcoord:14}));
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.QUANTIZE});
  const output = path.join(repo,'public/models/tommy-avatar-eyes-web.glb');
  await io.write(output,doc);
  const bytes = new Uint8Array(await fs.readFile(output));
  const validation = await validator.validateBytes(bytes,{uri:path.basename(output),maxIssues:100});
  const decoded = await io.read(output);
  const root = decoded.getRoot();
  const eyeNodes = ['Eye_L','Eye_R'].map(name=>root.listNodes().find(n=>n.getName()===name));
  if(eyeNodes.some(n=>!n||!n.listChildren().some(child=>child.getMesh()))) throw Error('Export lost an eye pivot');
  for(const n of eyeNodes) if(n.getTranslation().some((value,i)=>Math.abs(value-authoredPivots[n.getName()][i])>1e-7)) throw Error('Quantization moved an eye pivot');
  const report = {output,bytes:bytes.byteLength,nodes:root.listNodes().map(n=>({name:n.getName(),translation:n.getTranslation(),rotation:n.getRotation(),scale:n.getScale(),mesh:n.getMesh()?.getName()})),triangles:root.listMeshes().flatMap(m=>m.listPrimitives()).reduce((sum,p)=>sum+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),validation:validation.issues};
  await fs.writeFile(path.join(toolDir,'eye-rig-optimization-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  if(validation.issues.numErrors) throw Error('glTF validation failed');
}
