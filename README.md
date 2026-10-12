# Tommy Ren — Personal Portfolio

A personal portfolio with oversized metallic typography, Tommy's interactive 3D avatar, a bidirectional project gallery, scroll-revealed text, and stacked project cards. Adapted from the supplied creator-portfolio design brief to Tommy's software engineering background.

## Run locally

Requires Node.js 22.12 or later and npm.

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite.

For the blog and its administrator page, run `npm.cmd run dev:blog` from this repository and open `http://127.0.0.1:5175/blog/admin/`. This script sets port 5175 directly, avoiding command-line argument forwarding in PowerShell. Keep the terminal running; `Ctrl+C` stops the server. If the port is occupied, the script reports an error instead of silently selecting another port.

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

`.github/workflows/deploy-pages.yml` builds and publishes the static output. The portfolio is static. The optional blog backend uses Supabase; configure the public connection variables below before building it. If you publish under a different repository name, update Vite's base and asset URL handling first.

## Blog

The portfolio stays at `/`. The blog adapts [momo-blog](https://github.com/snowhejia/momo-blog)'s Bento layout and midnight palette. Supabase provides PostgreSQL, administrator email/password authentication, and image storage; GitHub Pages continues to host the frontend. Its upstream MIT notice is preserved at `public/blog/momo-license.txt`. Initial inspiration photographs retain their sources in `public/blog/assets/sources.json` and are not Tommy's photography.

| Page | URL |
| --- | --- |
| Blog home | `/blog/home/` |
| Writing archive | `/blog/articles/` |
| Database article | `/blog/articles/?post=<slug>` |
| Photo gallery | `/blog/photos/` |
| Curated resources | `/blog/collections/` |
| About the author | `/blog/about/` |
| Administrator | `/blog/admin/` |

### Connect Supabase

Follow the [Chinese setup guide](supabase/README.md). It covers the migration, optional seed content, account creation and administrator membership, authentication redirect URLs, image permissions, and optional dynamic RSS.

1. Run `supabase/migrations/202610110001_blog_backend.sql` once in the project's SQL Editor, It creates the required public settings row; optionally run `supabase/seed.sql` for the opening articles and example assets.
2. Create an email/password user in the Supabase Dashboard, add its user ID to `private.blog_admins` using the guide's SQL, and disable public signup. Passwords are entered only in Supabase or the login form.
3. Copy `.env.example` to `.env.local` and fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. A legacy anon key is supported as `VITE_SUPABASE_ANON_KEY`. Never use a secret/service_role key or database password in browser configuration. Vite rejects privileged keys before generating output.
4. Restart the development server. For GitHub Pages, add the same public values under **Settings → Secrets and variables → Actions → Variables**, then build/deploy with the existing workflow.

`/blog/admin/` supports session restoration, sign out, password recovery, article creation/editing, Markdown preview, drafts, publishing/unpublishing, deletion, image upload, photo and bookmark management, and public author settings. PostgreSQL RLS enforces administrator membership; a successful login alone does not grant editing access. Images in `blog-media` are public as soon as uploaded, including images attached to drafts. Uploads accept PNG/JPEG/WebP/AVIF/GIF up to 5 MiB and use unique filenames in the administrator's UID folder.

The **模板内容** admin tab imports the three opening articles, eight credited Unsplash demonstration photos from momo-blog, and four resource links. It uploads the photos to Supabase Storage and stores their public URLs in photo and article records. Stable IDs and upload paths let interrupted imports resume; existing records and settings are preserved. `node scripts/export-blog-seed.mjs` regenerates both the SQL seed and the admin starter bundle from published Markdown. The photo-led collection also draws layout inspiration from the local spring_blogs and XinghuisamaBlogs references; their personal articles are not presented as Tommy's writing.

Public pages read only published data, including when the browser also has an administrator session. Configured builds do not embed local article snapshots. Empty databases stay empty; connection errors display a retry action. Publishing a new article needs no GitHub rebuild: its query permalink points at an existing static page, so direct access and refresh both return HTTP 200 on GitHub Pages. Unknown or unpublished articles show a not-found view. HTML metadata for new database content is updated in the browser; this does not provide server-rendered previews for every new post.

Dynamic RSS is supplied by the optional `supabase/functions/blog-feed` Edge Function and lists the latest 100 published articles. Deploy that function following the guide, then set `VITE_BLOG_RSS_ENABLED=true` locally and in Actions Variables to display the RSS link. Until enabled, database mode hides that optional link. The static sitemap lists the fixed site pages in database mode.

### Local content without a backend

Until public Supabase configuration is provided, the blog continues to preview the existing local content and `/blog/admin/` shows setup instructions. This mode has no working login or database writes. Add Markdown files to `content/blog/` with `title`, `slug`, `date`, `summary`, `category`, `tags`, and `cover` frontmatter; `draft: true` excludes a file from public output. Local articles use `/blog/articles/<slug>/`. `node scripts/export-blog-seed.mjs` produces import SQL from these published files; repeated imports preserve existing database edits.

`npm run dev` previews both entries. `npm run build` validates TypeScript, builds the browser and blog renderer, and generates actual HTML files for the blog pages and admin, a sitemap, and a 404 page. The blog does not load the portfolio's 3D model or opening sequence.

```powershell
npm run test:blog
npm run test:backend
npm run build
```

Content tests verify safe Markdown and HTML/RSS generation, including excluding local snapshots from database builds. Backend tests check seed export and the public RSS handler. The migration, seed, and transactional RLS suite have also run against PGlite PostgreSQL with fixtures for Supabase's Auth/Storage dependencies. Actual hosted Auth, Storage, and Edge Function acceptance requires the new Supabase project.

- Public rendering and runtime: `src/blog/BlogApp.tsx`, `src/blog/BlogRuntime.tsx`, `src/blog/backend.ts`.
- Administrator UI: `src/blog/admin/AdminApp.tsx`, `src/blog/admin/admin.css`.
- Shared Markdown renderer: `src/blog/markdown.mjs`.
- Database setup and permissions: `supabase/README.md`, `supabase/migrations/`.
- Static route generation: `scripts/build-blog.mjs`, `src/blog/render.tsx`.

## Edit content

The public contact email is `rent823242@gmail.com`. The portfolio and unconfigured blog read it from `src/data/portfolio.ts`; the connected blog reads the `main` record in Supabase `blog_settings`, editable under **站点设置 → 公开联系邮箱**. Initial database and seed settings use the same address.

The portfolio cursor adapts JIEJOE's `018-magnetic-pointer-main`: four illuminated corners follow the pointer and frame links/buttons with magnetic attraction. Its MIT notice is retained in `public/licenses/magnetic-pointer-MIT.txt`. The blog has a separate fine ring and soft, short trail, white in midnight mode and black in fresh mode. Both are non-interactive overlays, restore the native cursor over form fields and WebGL canvases, and turn off for touch, keyboard navigation, forced colors, and reduced-motion preferences. Animations stop when settled or the page is hidden. Implementations live in `src/components/MagneticPointer.tsx`, `src/blog/NeonPointer.tsx`, and the shared `src/components/pointerRuntime.ts`.

The hero renders the user-provided `tommy-avatar.glb` using Three.js. The original is preserved; the site downloads `public/models/tommy-avatar-eyes-web.glb` (3.83 MB), with independent eyes derived from the optimized avatar. Both eyes look toward the same pointer target before the head gently follows, with rotation limits and a smooth return to neutral after two seconds of inactivity or when the pointer leaves. The avatar floats at a maximum of 30 frames per second. Rendering pauses offscreen and in hidden tabs; reduced-motion preferences show a still 3D pose. The matching transparent poster `public/images/tommy-avatar.webp` appears while loading and remains available if WebGL or model loading fails.

- Avatar view, camera framing, lights, and movement: `src/components/AvatarScene.tsx`.
- Loading, visibility, and fallback: `src/components/Avatar.tsx`, `src/components/avatarAsset.ts`.
- Model optimization and rebuild instructions: `scripts/prepare-avatar.mjs`, `public/models/README.md`.
- Editable eyes and gaze target: `artwork/avatar/tommy-avatar-eye-rig.blend`. In Blender, move `Gaze_Target` along X or Z to preview eye movement. The eye constraints limit yaw to 12 degrees and pitch to 6 degrees. The source includes a hidden reference head; only the new head and eyes are exported for the website.
- Eye construction and compression: `scripts/build-avatar-eyes.py`, `scripts/prepare-avatar-eyes.mjs`. Eyelids remain fixed; blinking requires additional eyelid shapes.

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
