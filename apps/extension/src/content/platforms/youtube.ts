import type { ScrapedItem, Platform } from '../../types';

function makeId(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return `yt_${Math.abs(h).toString(36)}`;
}

export function scrapeYoutube(): ScrapedItem[] {
  const items: ScrapedItem[] = [];
  const platform: Platform = 'youtube';

  // Video page — single video
  const videoPlayer = document.querySelector('video.html5-main-video') as HTMLVideoElement | null;
  if (videoPlayer) {
    const titleEl = document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string');
    const descEl  = document.querySelector('#description-inline-expander, #description');
    const title   = titleEl?.textContent?.trim() ?? document.title;
    const desc    = descEl?.textContent?.trim().slice(0, 300) ?? null;
    const text    = `${title}${desc ? ` — ${desc}` : ''}`;
    const sourceUrl = window.location.href;
    const thumbUrl  = `https://img.youtube.com/vi/${new URLSearchParams(window.location.search).get('v')}/mqdefault.jpg`;

    items.push({
      id: makeId(sourceUrl),
      type: 'video',
      platform,
      text,
      mediaUrl: sourceUrl,
      mediaType: 'video',
      sourceUrl,
      thumbnailUrl: thumbUrl,
    });
    return items;
  }

  // Feed / search / recommendations — video cards
  const cards = document.querySelectorAll(
    'ytd-video-renderer, ytd-rich-item-renderer, ytd-compact-video-renderer',
  );

  cards.forEach((card) => {
    const titleEl = card.querySelector('#video-title') as HTMLElement | null;
    const title = titleEl?.textContent?.trim() ?? null;
    if (!title) return;

    const linkEl = card.querySelector('a#video-title, a#thumbnail') as HTMLAnchorElement | null;
    const href   = linkEl?.href ?? '';
    const videoId = new URLSearchParams(new URL(href, window.location.href).search).get('v');
    const sourceUrl = href || window.location.href;
    const thumbnailUrl = videoId
      ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
      : null;

    items.push({
      id: makeId(sourceUrl),
      type: 'video',
      platform,
      text: title,
      mediaUrl: sourceUrl,
      mediaType: 'video',
      sourceUrl,
      thumbnailUrl,
    });
  });

  return items;
}
