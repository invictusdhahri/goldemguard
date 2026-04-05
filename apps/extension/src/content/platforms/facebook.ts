import type { ScrapedItem, Platform } from '../../types';

function makeId(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return `fb_${Math.abs(h).toString(36)}`;
}

export function scrapeFacebook(): ScrapedItem[] {
  const items: ScrapedItem[] = [];
  const platform: Platform = 'facebook';
  const sourceUrl = window.location.href;

  // Article-level posts
  const articles = document.querySelectorAll('[role="article"]');

  articles.forEach((article) => {
    // Extract text
    const textEl =
      article.querySelector('[data-ad-preview="message"]') ??
      article.querySelector('[dir="auto"]');
    const text = textEl?.textContent?.trim() ?? null;
    if (!text && !article.querySelector('img, video')) return;

    // Image
    const imgEl = article.querySelector(
      'img[data-imgperflogname], img[referrerpolicy]',
    ) as HTMLImageElement | null;

    // Video
    const videoEl = article.querySelector('video') as HTMLVideoElement | null;

    const id = makeId(sourceUrl + (text ?? '') + (imgEl?.src ?? '') + (videoEl?.src ?? ''));

    if (imgEl) {
      items.push({
        id,
        type: text ? 'post' : 'image',
        platform,
        text,
        mediaUrl: imgEl.src,
        mediaType: 'image',
        sourceUrl,
        thumbnailUrl: imgEl.src,
      });
    } else if (videoEl) {
      items.push({
        id,
        type: text ? 'post' : 'video',
        platform,
        text,
        mediaUrl: videoEl.src || null,
        mediaType: 'video',
        sourceUrl,
        thumbnailUrl: videoEl.poster || null,
      });
    } else if (text && text.length > 10) {
      items.push({
        id,
        type: 'post',
        platform,
        text,
        mediaUrl: null,
        mediaType: null,
        sourceUrl,
        thumbnailUrl: null,
      });
    }
  });

  return items;
}
