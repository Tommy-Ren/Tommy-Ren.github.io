import { useEffect, useRef } from 'react';
import { ACESFilmicToneMapping, Box3, DirectionalLight, Group, HemisphereLight, MathUtils, Mesh, PerspectiveCamera, PMREMGenerator, Scene, SRGBColorSpace, Texture, Vector3, WebGLRenderer, type Material, type WebGLRenderTarget } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadAvatarBuffer } from './avatarAsset';

export interface AvatarSceneProps {
  running: boolean;
  reducedMotion: boolean;
  onReady: () => void;
  onUnavailable: () => void;
}

function disposeModel(root: Group) {
  const geometries = new Set<Mesh['geometry']>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  root.traverse(object => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
  textures.forEach(texture => {
    texture.dispose();
    if (typeof ImageBitmap !== 'undefined' && texture.image instanceof ImageBitmap) texture.image.close();
  });
}

export default function AvatarScene({ running, reducedMotion, onReady, onUnavailable }: AvatarSceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const preferences = useRef({ running, reducedMotion });
  preferences.current = { running, reducedMotion };
  const sync = useRef<() => void>();

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let cancelled = false;
    let failed = false;
    let frame = 0;
    let previous = 0;
    let elapsed = 0;
    let model: Group | undefined;
    let renderer: WebGLRenderer | undefined;
    let environment: WebGLRenderTarget | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let removePointerListeners: (() => void) | undefined;
    let contextLost: ((event: Event) => void) | undefined;

    const fail = () => {
      if (cancelled || failed) return;
      failed = true;
      cancelAnimationFrame(frame);
      onUnavailable();
    };

    const initialize = async () => {
      const buffer = await loadAvatarBuffer();
      if (cancelled) return;
      const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
      const gltf = await loader.parseAsync(buffer, '/models/');
      model = gltf.scene;
      if (cancelled) { disposeModel(model); model = undefined; return; }

      renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = SRGBColorSpace;
      renderer.toneMapping = ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      renderer.domElement.setAttribute('aria-hidden', 'true');
      container.appendChild(renderer.domElement);
      contextLost = event => { event.preventDefault(); fail(); };
      renderer.domElement.addEventListener('webglcontextlost', contextLost);

      const scene = new Scene();
      const camera = new PerspectiveCamera(32, 1, 0.1, 30);
      const room = new RoomEnvironment();
      const generator = new PMREMGenerator(renderer);
      try { environment = generator.fromScene(room, 0.04); }
      finally { room.dispose(); generator.dispose(); }
      scene.environment = environment.texture;
      scene.environmentIntensity = 0.65;
      scene.add(new HemisphereLight(0xe3edff, 0x292032, 0.6));
      const key = new DirectionalLight(0xffeedb, 2.4);
      key.position.set(3, 4, 5);
      const fill = new DirectionalLight(0xb8d3ff, 0.9);
      fill.position.set(-4, 1, 3);
      const rim = new DirectionalLight(0xce9fff, 2.8);
      rim.position.set(-3, 3, -3);
      scene.add(key, fill, rim);

      const bounds = new Box3().setFromObject(model);
      const dimensions = bounds.getSize(new Vector3());
      const center = bounds.getCenter(new Vector3());
      const scale = 2 / dimensions.y;
      if (!Number.isFinite(scale) || scale <= 0) throw new Error('Invalid avatar bounds');
      model.position.sub(center);
      const normalized = new Group();
      normalized.scale.setScalar(scale);
      normalized.add(model);
      const pivot = new Group();
      pivot.name = 'tommy-avatar-pivot';
      pivot.add(normalized);
      scene.add(pivot);
      const target = { x: 0, y: 0 };
      const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
      const pointer = (event: PointerEvent) => {
        if (!preferences.current.running || preferences.current.reducedMotion || !finePointer.matches) return;
        const rect = container.getBoundingClientRect();
        target.x = MathUtils.clamp((event.clientX - rect.left - rect.width / 2) / (window.innerWidth / 2), -1, 1);
        target.y = MathUtils.clamp((event.clientY - rect.top - rect.height / 2) / (window.innerHeight / 2), -1, 1);
      };
      const resetPointer = () => { target.x = 0; target.y = 0; };
      window.addEventListener('pointermove', pointer, { passive: true });
      document.addEventListener('pointerleave', resetPointer);
      removePointerListeners = () => {
        window.removeEventListener('pointermove', pointer);
        document.removeEventListener('pointerleave', resetPointer);
      };

      const neutral = () => {
        pivot.rotation.set(0, -0.1, -0.025);
        pivot.position.y = 0;
        resetPointer();
      };
      neutral();
      const draw = () => { if (!cancelled && !failed) renderer?.render(scene, camera); };
      const animate = (time: number) => {
        frame = 0;
        if (cancelled || failed || !preferences.current.running || preferences.current.reducedMotion) return;
        // Limit this decorative scene to 30 fps, independently of screen refresh.
        if (time - previous >= 1000 / 30) {
          const delta = Math.min((time - previous) / 1000, 0.1);
          previous = time;
          elapsed += delta;
          const smoothing = 1 - Math.exp(-7 * delta);
          pivot.rotation.y = MathUtils.lerp(pivot.rotation.y, -0.1 + target.x * 0.2, smoothing);
          pivot.rotation.x = MathUtils.lerp(pivot.rotation.x, target.y * 0.09, smoothing);
          pivot.rotation.z = -0.025 + Math.sin(elapsed * 0.65) * 0.012;
          pivot.position.y = Math.sin(elapsed * 1.1) * 0.035;
          draw();
        }
        frame = requestAnimationFrame(animate);
      };
      const resize = () => {
        const { width, height } = container.getBoundingClientRect();
        if (!width || !height || cancelled || failed) return;
        camera.aspect = width / height;
        const tangent = Math.tan(MathUtils.degToRad(camera.fov / 2));
        const vertical = dimensions.y * scale / 2 / tangent;
        const horizontal = dimensions.x * scale / 2 / (tangent * camera.aspect);
        camera.position.set(0, 0.025, (Math.max(vertical, horizontal) + dimensions.z * scale / 2) * 1.06);
        camera.lookAt(0, 0.025, 0);
        camera.updateProjectionMatrix();
        renderer?.setSize(Math.round(width), Math.round(height), false);
        if (preferences.current.running) draw();
      };
      sync.current = () => {
        cancelAnimationFrame(frame);
        frame = 0;
        if (cancelled || failed || !preferences.current.running) return;
        if (preferences.current.reducedMotion) { neutral(); draw(); }
        else { previous = performance.now(); frame = requestAnimationFrame(animate); }
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
      resize();
      draw();
      onReady();
      sync.current();
    };
    void initialize().catch(fail);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      sync.current = undefined;
      resizeObserver?.disconnect();
      removePointerListeners?.();
      if (renderer && contextLost) renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      if (model) disposeModel(model);
      environment?.dispose();
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      }
    };
  }, [onReady, onUnavailable]);

  useEffect(() => { sync.current?.(); }, [running, reducedMotion]);
  return <div ref={host} className="avatar-webgl" aria-hidden="true" />;
}
