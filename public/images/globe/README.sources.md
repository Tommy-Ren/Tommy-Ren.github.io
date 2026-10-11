# Globe texture sources

The three image files are unmodified downloads of the textures used by the official react-globe.gl cloud example. Exact source URLs, dimensions, hashes, payload sizes and alpha ranges are in `sources.json`.

- `earth-blue-marble.jpg`: three-globe example imagery. The upstream file is a realistic equirectangular Earth color texture (4096 x 2048).
- `earth-topology.png`: three-globe example bump imagery. This is a grayscale equirectangular height texture (2048 x 1024), not transparency.
- `clouds.png`: react-globe.gl example, attributed by its source to turban/webgl-earth. It is byte-identical to Bjorn Sandvik's `fair_clouds_4k.png` and uses indexed PNG palette transparency. Decoding to RGBA yields alpha values from 0 to 255.

## Attribution and licensing

The three-globe and react-globe.gl repositories are MIT licensed, copyright (c) 2019 Vasco Asturiano. Their complete license notices are retained beside the textures. This establishes the repositories' software licensing; it is not an independently verified NASA provenance statement for each bitmap.

The official cloud example cites turban/webgl-earth as the source. Bjorn Sandvik's original [article](https://blog.mastermaps.com/2013/09/creating-webgl-earth-with-threejs.html) identifies his cloud source as Tom Patterson's Natural Earth III and explains the transparent PNG conversion. The [Natural Earth III terms](https://www.shadedrelief.com/natural3/pages/use.html) state its underlying data and images are public domain and allow modification and redistribution. The turban/webgl-earth repository itself has no separate license file; preserve the full attribution chain for the converted cloud file: Tom Patterson / Natural Earth III; transparency conversion by Bjorn Sandvik; distributed through react-globe.gl by Vasco Asturiano.

No NASA source has been verified for the exact earth-blue-marble.jpg or earth-topology.png byte streams. Do not credit every image to NASA solely from the filename.

## Rendering suggestions

Keep the color map in sRGB and the bump map as linear data. Use the PNG's built-in alpha for the transparent cloud sphere, a radius about 1.004 times the Earth radius, and `depthWrite: false` for the cloud layer. Load the globe and its textures only near the My Path section, pause rendering when offscreen, clamp device pixel ratio, and dispose all textures and meshes when unmounted. The full texture payload is 6,873,606 bytes (6.56 MiB); the cloud PNG accounts for most of it. A mobile quality option can omit clouds or use a smaller derived cloud texture while retaining these originals.

## Runtime WebP conversion

`earth-blue-marble.webp` retains 4096 x 2048 at quality 85 (810,376 bytes). `clouds.webp` is resized to 2048 x 1024 at quality 90 and alpha quality 100 (1,158,706 bytes). Both were generated using bundled sharp; the cloud WebP alpha still spans 0 to 255. The runtime set including the original bump map totals 2,347,325 bytes (2.24 MiB), 65.9% smaller than the three originals.

Equivalent sharp calls:

```js
await sharp('earth-blue-marble.jpg')
  .webp({ quality: 85 })
  .toFile('earth-blue-marble.webp');
await sharp('clouds.png')
  .resize(2048, 1024)
  .webp({ quality: 90, alphaQuality: 100 })
  .toFile('clouds.webp');
```
