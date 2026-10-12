export const AVATAR_MODEL_URL = '/models/tommy-avatar-eyes-web.glb';
export const AVATAR_POSTER_URL = '/images/tommy-avatar.webp';

let modelBuffer: Promise<ArrayBuffer> | undefined;
let sceneModule: Promise<typeof import('./AvatarScene')> | undefined;

export function loadAvatarScene() {
  return sceneModule ??= import('./AvatarScene');
}

export function preloadAvatar() {
  // A failed preload must not block the welcome sequence or the rest of the site.
  void loadAvatarScene().catch(() => {});
  void loadAvatarBuffer().catch(() => {});
}

// Share the download between the opening preload and React StrictMode mounts.
export function loadAvatarBuffer() {
  if (!modelBuffer) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    modelBuffer = fetch(AVATAR_MODEL_URL, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Avatar model unavailable');
        return response.arrayBuffer();
      })
      .catch(error => {
        modelBuffer = undefined;
        throw error;
      })
      .finally(() => window.clearTimeout(timeout));
  }
  return modelBuffer;
}
