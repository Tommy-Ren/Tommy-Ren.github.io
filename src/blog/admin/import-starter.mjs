// Explicit administrator action only. Never run during public page rendering.
// Stable IDs/paths and ignoreDuplicates make interrupted imports safe to retry.
export async function importStarterContent(client, userId, bundle, onProgress = () => {}, fetchImage = fetch) {
  if (bundle.version !== 1 || !/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('无法识别模板或管理员账号。');
  const permission = await client.rpc('is_blog_admin');
  if (permission.error) throw permission.error;
  if (permission.data !== true) throw new Error('只有博客管理员可以导入模板。');

  const counts = { posts: 0, photos: 0, links: 0, uploaded: 0, skipped: 0 };
  const bucket = client.storage.from('blog-media');
  const existing = await client.from('blog_photos').select('id,image_url').in('id', bundle.photos.map(photo => photo.id));
  if (existing.error) throw existing.error;
  const existingPhotos = new Map((existing.data || []).map(photo => [photo.id, photo.image_url]));
  const imageUrls = new Map();

  for (const [index, photo] of bundle.photos.entries()) {
    const previousUrl = existingPhotos.get(photo.id);
    if (previousUrl) { imageUrls.set(photo.image_url, previousUrl); continue; }
    onProgress(`正在准备图片 ${index + 1}/${bundle.photos.length}：${photo.title}`);
    if (!/^\/blog\/assets\/[a-z0-9-]+\.webp$/.test(photo.image_url)) throw new Error('模板图片路径不正确。');
    const filename = `starter-v1-${photo.image_url.split('/').at(-1)}`;
    const storagePath = `${userId}/${filename}`;
    const listed = await bucket.list(userId, { search: filename, limit: 100 });
    if (listed.error) throw listed.error;
    if (!(listed.data || []).some(file => file.name === filename)) {
      const response = await fetchImage(photo.image_url);
      if (!response.ok) throw new Error(`无法读取图片：${photo.title}。请刷新页面后重试。`);
      const blob = await response.blob();
      if (blob.type !== 'image/webp' || blob.size === 0 || blob.size > 5 * 1024 * 1024) throw new Error(`图片格式或大小不符合要求：${photo.title}`);
      const uploaded = await bucket.upload(storagePath, blob, { contentType: 'image/webp', upsert: false, cacheControl: '31536000' });
      if (uploaded.error) throw uploaded.error;
      counts.uploaded++;
    }
    const url = bucket.getPublicUrl(storagePath).data.publicUrl;
    imageUrls.set(photo.image_url, url);
    const saved = await client.from('blog_photos').upsert({ ...photo, image_url: url }, { onConflict: 'id', ignoreDuplicates: true }).select('id');
    if (saved.error) throw saved.error;
    counts.photos += saved.data?.length || 0;
  }

  onProgress('正在导入文章与封面…');
  const posts = bundle.posts.map(post => ({ ...post, cover: imageUrls.get(post.cover) || post.cover }));
  const savedPosts = await client.from('blog_posts').upsert(posts, { onConflict: 'slug', ignoreDuplicates: true }).select('id');
  if (savedPosts.error) throw savedPosts.error;
  counts.posts = savedPosts.data?.length || 0;

  onProgress('正在导入收藏链接…');
  const savedLinks = await client.from('blog_links').upsert(bundle.links, { onConflict: 'id', ignoreDuplicates: true }).select('id');
  if (savedLinks.error) throw savedLinks.error;
  counts.links = savedLinks.data?.length || 0;
  counts.skipped = bundle.posts.length + bundle.photos.length + bundle.links.length - counts.posts - counts.photos - counts.links;
  return counts;
}
