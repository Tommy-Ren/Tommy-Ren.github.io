# Tommy Ren — Personal Portfolio

A personal portfolio with oversized metallic typography, Tommy's interactive 3D avatar, a bidirectional project gallery, scroll-revealed text, and stacked project cards. Adapted from the supplied creator-portfolio design brief to Tommy's software engineering background.

## Run locally

Requires Node.js 22.12 or later and npm.

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite.

```powershell
npm run build
npm run preview
```

The build includes TypeScript validation. Production files go to `dist/`.

## Publish on GitHub Pages

This repository is named `Tommy-Ren.github.io`, so Vite uses `/` as its base path. The intended public URL is https://tommy-ren.github.io/.

1. Push the source and lockfile to the repository's `main` branch.
2. In **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source.
3. Run **Actions → Deploy portfolio to GitHub Pages** if it did not start automatically.
4. Wait for the deployment job to complete.

`.github/workflows/deploy-pages.yml` builds and publishes the static output. The site does not require a server, account system, or secret API keys. If you publish under a different repository name, update Vite's base and asset URL handling first.

## Edit content

The hero renders the user-provided `tommy-avatar.glb` using Three.js. The original is preserved; the site downloads `public/models/tommy-avatar-web.glb`, optimized from 64.1 MB to 3.8 MB. The head gently follows a desktop pointer and floats at a maximum of 30 frames per second. Rendering pauses offscreen and in hidden tabs; reduced-motion preferences show a still 3D pose. The matching transparent poster `public/images/tommy-avatar.webp` appears while loading and remains available if WebGL or model loading fails.

- Avatar view, camera framing, lights, and movement: `src/components/AvatarScene.tsx`.
- Loading, visibility, and fallback: `src/components/Avatar.tsx`, `src/components/avatarAsset.ts`.
- Model optimization and rebuild instructions: `scripts/prepare-avatar.mjs`, `public/models/README.md`.

`My Path` follows About Me: four scroll-driven chapters move the realistic globe from Wuhan Foreign Language School to BCIT, then SFU, and finally 18 visited places. Chapter buttons navigate the same scroll sequence; travel buttons focus the globe on each destination. Education routes connect the supplied study locations. Travel dates and flight routes are not assumed.

- Education, visited places, and map coordinates: `src/data/path.ts`.
- Sticky layout and scroll chapters: `src/components/MyPath.tsx`, `src/components/MyPath.css`.
- Realistic Earth, atmosphere, animated clouds, and markers: `src/components/PathGlobe.tsx`, adapted from the [react-globe.gl clouds example](https://vasturiano.github.io/react-globe.gl/example/clouds/).
- Texture sources, MIT notices, and optimization recipe: `public/images/globe/README.sources.md`.

The WebGL module loads near the Path section and pauses when offscreen or when the browser tab is hidden. In Around the world, visitors can drag with a mouse or one finger to rotate the Earth in both directions, including after selecting a destination. Dragging stops automatic rotation and any active location tween, preserving the chosen view. The mouse wheel scrolls the page; on touchscreens, swipe outside the globe to continue the journey. Education chapters retain their guided camera views. Reduced-motion preferences disable cloud movement, camera tweening, inertia, and automatic rotation while allowing deliberate dragging. A static Earth remains available when WebGL cannot initialize. City coordinates are reference points; Sichuan and Bali use approximate region markers. BCIT and SFU are located at their Burnaby campuses.

The opening is a four-second CRT welcome sequence with an original SVG handwriting animation. It plays on each full page load; scrolling between sections does not replay it. Visitors can skip it with the button or Escape. Reduced-motion preferences bypass it entirely. The homepage mounts after the opening exits, preserving its entrance animations. On homepage entry the avatar module and optimized model preload during the opening; direct links to other sections defer them until the avatar becomes visible. The small poster preloads from the document head.

- Opening duration and terminal text: `src/components/BootIntro.tsx` (`INTRO_DURATION_MS`, in milliseconds).
- Monitor frame, scan lines, handwriting, and mobile layout: `src/components/BootIntro.css`.

- Personal details, education, experience, and projects: `src/data/portfolio.ts`.
- Layout and interactions: `src/App.tsx`, `src/components/Motion.tsx`.
- Typography, responsive rules, and colors: `src/styles.css`.
- Original project illustrations: `scripts/build-artwork.mjs`; regenerate with `node scripts/build-artwork.mjs`.
- Reference images and provenance: `docs/ASSETS.md`.
- Content evidence and functionality notes: `docs/CONTENT-SOURCES.md`.

The original brief used fictional creator names, projects, prices, and design experience; these are replaced with Tommy's verified background and real repositories. The hero uses Tommy's supplied stylized avatar. The old reference head is retained as a source asset and is no longer displayed. Project images are labeled original illustrations/interface studies, not product screenshots. The reference's 21 GIFs were replaced with local visuals because accessible GIFs total roughly 168 MiB and one URL is unavailable. The opposing gallery motion and tripled rows remain.

React, TypeScript, Tailwind CSS, Framer Motion, Lucide, and Vite are used. Tailwind is updated to v4 to avoid known advisories in the v3 development dependency chain. Fonts load from Google Fonts with a system fallback. Motion respects reduced-motion preferences; small screens use normal project flow instead of sticky stacking.

The resume and cover letter originals, phone number, and application-specific details are not included in this repository.
