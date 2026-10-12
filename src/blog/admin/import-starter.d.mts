import type { SupabaseClient } from '@supabase/supabase-js';
export interface StarterBundle {
  version: number;
  posts: Array<Record<string, unknown> & { slug: string; cover: string }>;
  photos: Array<Record<string, unknown> & { id: string; title: string; image_url: string }>;
  links: Array<Record<string, unknown> & { id: string }>;
}
export interface ImportCounts { posts: number; photos: number; links: number; uploaded: number; skipped: number }
export function importStarterContent(client: SupabaseClient, userId: string, bundle: StarterBundle, onProgress?: (message: string) => void, fetchImage?: typeof fetch): Promise<ImportCounts>;
