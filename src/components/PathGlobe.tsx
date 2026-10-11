import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import { Mesh, MeshPhongMaterial, SphereGeometry, SRGBColorSpace, TextureLoader, TOUCH, type Texture } from 'three';
import { pathSteps, travelPlaces, type PathStep, type TravelPlace } from '../data/path';

interface Props {
  step: PathStep;
  stage: number;
  selectedPlace: TravelPlace | null;
  running: boolean;
  reducedMotion: boolean;
  onReady: () => void;
  onUnavailable: () => void;
}
interface Marker { lat: number; lng: number; name: string; active: boolean }

export default function PathGlobe({ step, stage, selectedPlace, running, reducedMotion, onReady, onUnavailable }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const globe = useRef<GlobeMethods>();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [ready, setReady] = useState(false);
  const hasSize = size.width > 0 && size.height > 0;
  const readyRef = useRef(false);
  const clouds = useRef<Mesh<SphereGeometry, MeshPhongMaterial>>();
  const initialView = useRef({ step, selectedPlace });
  initialView.current = { step, selectedPlace };

  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  const handleReady = useCallback(() => {
    const instance = globe.current;
    if (!instance) return;
    const controls = instance.controls();
    controls.enabled = false;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = false;
    instance.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    const initial = initialView.current;
    instance.pointOfView(initial.selectedPlace
      ? { lat: initial.selectedPlace.lat, lng: initial.selectedPlace.lng, altitude: 1.6 }
      : { lat: initial.step.lat, lng: initial.step.lng, altitude: initial.step.altitude }, 0);
    readyRef.current = true;
    setReady(true);
    onReady();
  }, [onReady]);

  useEffect(() => {
    const instance = globe.current;
    if (!ready || !instance) return;
    const interactive = stage === 3;
    const controls = instance.controls();
    controls.enabled = interactive;
    controls.enableRotate = interactive;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = !reducedMotion;
    controls.touches.ONE = TOUCH.ROTATE;
    controls.touches.TWO = TOUCH.DOLLY_ROTATE;
    controls.cursorStyle = interactive ? 'grab' : 'auto';
    controls.autoRotate = interactive && !selectedPlace && !reducedMotion;
    controls.autoRotateSpeed = 0.24;
    const startDragging = () => {
      controls.autoRotate = false;
      // Cancel a location tween at the current view so it cannot fight a drag.
      instance.pointOfView(instance.pointOfView(), 0);
    };
    if (interactive) controls.addEventListener('start', startDragging);
    const destination = selectedPlace
      ? { lat: selectedPlace.lat, lng: selectedPlace.lng, altitude: 1.6 }
      : { lat: step.lat, lng: step.lng, altitude: step.altitude };
    instance.pointOfView(destination, reducedMotion ? 0 : 1150);
    return () => controls.removeEventListener('start', startDragging);
  }, [ready, step, stage, selectedPlace, reducedMotion]);

  useEffect(() => {
    const instance = globe.current;
    if (!instance) return;
    if (running) instance.resumeAnimation();
    else instance.pauseAnimation();
  }, [hasSize, ready, running]);

  useEffect(() => {
    const instance = globe.current;
    if (!instance) return;
    instance.controls().enabled = false;
    instance.controls().enableZoom = false;
    instance.controls().enablePan = false;
    const canvas = instance.renderer().domElement;
    const contextLost = (event: Event) => {
      event.preventDefault();
      instance.pauseAnimation();
      onUnavailable();
    };
    canvas.addEventListener('webglcontextlost', contextLost);
    let cancelled = false;
    const image = new Image();
    image.onerror = () => { if (!cancelled) onUnavailable(); };
    image.src = '/images/globe/earth-blue-marble.webp';
    const timeout = window.setTimeout(() => {
      if (!readyRef.current && !cancelled) onUnavailable();
    }, 30000);
    return () => {
      cancelled = true;
      image.onerror = null;
      window.clearTimeout(timeout);
      canvas.removeEventListener('webglcontextlost', contextLost);
    };
  }, [hasSize, onUnavailable]);

  // The official clouds example adapted with StrictMode-safe resource cleanup.
  useEffect(() => {
    const instance = globe.current;
    if (!ready || !instance) return;
    let cancelled = false;
    let cloudMesh: Mesh<SphereGeometry, MeshPhongMaterial> | undefined;
    let texture: Texture | undefined;
    const scene = instance.scene();
    new TextureLoader().load('/images/globe/clouds.webp', loaded => {
      if (cancelled) { loaded.dispose(); return; }
      texture = loaded;
      texture.colorSpace = SRGBColorSpace;
      const geometry = new SphereGeometry(instance.getGlobeRadius() * 1.006, 64, 48);
      const material = new MeshPhongMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0.85 });
      cloudMesh = new Mesh(geometry, material);
      cloudMesh.name = 'my-path-cloud-layer';
      scene.add(cloudMesh);
      clouds.current = cloudMesh;
    }, undefined, () => { /* The Earth remains usable without optional clouds. */ });
    return () => {
      cancelled = true;
      if (cloudMesh) {
        if (clouds.current === cloudMesh) clouds.current = undefined;
        scene.remove(cloudMesh);
        cloudMesh.geometry.dispose();
        cloudMesh.material.dispose();
      }
      texture?.dispose();
    };
  }, [ready]);

  useEffect(() => {
    if (!ready || !running || reducedMotion) return;
    let frame = 0;
    let previous = performance.now();
    const rotate = (time: number) => {
      const delta = Math.min((time - previous) / 1000, 0.1);
      previous = time;
      if (clouds.current) clouds.current.rotation.y -= 0.006 * delta;
      frame = requestAnimationFrame(rotate);
    };
    frame = requestAnimationFrame(rotate);
    return () => cancelAnimationFrame(frame);
  }, [ready, running, reducedMotion]);

  const markers = useMemo<Marker[]>(() => stage === 3
    ? travelPlaces.map(place => ({ ...place, active: place.id === selectedPlace?.id }))
    : pathSteps.slice(0, stage + 1).map((place, i) => ({ ...place, name: ['Wuhan', 'BCIT', 'SFU'][i], active: i === stage })), [stage, selectedPlace]);
  const activeMarker = markers.find(marker => marker.active);
  const arcs = useMemo(() => stage === 0 || stage === 3 ? [] : pathSteps.slice(1, stage + 1).map((destination, i) => ({
    startLat: pathSteps[i].lat, startLng: pathSteps[i].lng,
    endLat: destination.lat, endLng: destination.lng,
    color: i === stage - 1 ? ['#be91ff', '#8fbfff'] : ['#8057b3', '#648baa'],
  })), [stage]);

  return <div ref={container} className={`path-webgl${ready && stage === 3 && running ? ' is-interactive' : ''}`} aria-hidden="true">
    {size.width > 0 && size.height > 0 && <Globe
      ref={globe} width={size.width} height={size.height}
      backgroundColor="rgba(0,0,0,0)" animateIn={false}
      globeImageUrl="/images/globe/earth-blue-marble.webp"
      bumpImageUrl="/images/globe/earth-topology.png"
      globeCurvatureResolution={2.5}
      atmosphereColor="#86a8eb" atmosphereAltitude={0.12}
      enablePointerInteraction={false} onGlobeReady={handleReady}
      pointsData={markers} pointLat="lat" pointLng="lng"
      pointColor={object => (object as Marker).active ? '#dac0ff' : stage === 3 ? '#f2c586' : '#93a9bd'}
      pointRadius={object => (object as Marker).active ? 0.55 : stage === 3 ? 0.28 : 0.22}
      pointAltitude={0.014} pointResolution={16}
      pointsTransitionDuration={reducedMotion ? 0 : 350}
      labelsData={activeMarker ? [activeMarker] : []} labelText="name" labelSize={0.9}
      labelColor={() => '#f3eaff'} labelDotRadius={0.35} labelAltitude={0.025}
      labelDotOrientation={() => 'bottom'} labelsTransitionDuration={reducedMotion ? 0 : 350}
      arcsData={arcs} arcColor="color" arcStroke={0.18} arcAltitudeAutoScale={0.28}
      arcDashLength={0.45} arcDashGap={0.15} arcDashAnimateTime={reducedMotion ? 0 : 2400}
      arcsTransitionDuration={reducedMotion ? 0 : 600}
    />}
  </div>;
}
