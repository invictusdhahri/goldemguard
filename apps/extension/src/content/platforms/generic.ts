import type { ScrapedItem, Platform } from '../../types';

function makeId(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return `gen_${Math.abs(h).toString(36)}`;
}

function nearestText(el: Element): string | null {
  // Walk up to 3 levels to find a sibling or parent with meaningful text
  let node: Element | null = el;
  for (let i = 0; i < 3; i++) {
    const parent = node?.parentElement;
    if (!parent) break;
    const text = Array.from(parent.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE || (n.nodeType === Node.ELEMENT_NODE && !(n as Element).querySelector('img, video')))
      .map((n) => n.textContent?.trim() ?? '')
      .join(' ')
      .trim();
    if (text.length > 20) return text.slice(0, 300);
    node = parent;
  }
  return null;
}

export function scrapeGeneric(): ScrapedItem[] {
  const items: ScrapedItem[] = [];
  const platform: Platform   = 'generic';
  const sourceUrl            = window.location.href;
  const seen                 = new Set<string>();

  // Articles first
  const articles = document.querySelectorAll('article, [role="article"]');
  const roots: Element[] = articles.length > 0
    ? Array.from(articles)
    : [document.querySelector('main') ?? document.body];

  for (const root of roots) {
    // Images
    root.querySelectorAll('img').forEach((img: HTMLImageElement) => {
      const src = img.src;
      if (!src || seen.has(src)) return;
      // Skip tiny icons / tracking pixels
      if (img.naturalWidth < 100 || img.naturalHeight < 100) return;
      if (img.width < 80 || img.height < 80) return;
      seen.add(src);

      const text = img.alt?.trim() || nearestText(img);
      const id = makeId(src + (text ?? ''));

      items.push({
        id,
        type: 'image',
        platform,
        text: text ?? null,
        mediaUrl: src,
        mediaType: 'image',
        sourceUrl,
        thumbnailUrl: src,
      });
    });

    // Videos
    root.querySelectorAll('video').forEach((video: HTMLVideoElement) => {
      const src = video.src || video.querySelector('source')?.getAttribute('src') || null;
      const key = src ?? video.poster ?? 'video';
      if (seen.has(key)) return;
      seen.add(key);

      const text = nearestText(video);
      const id   = makeId(key + (text ?? ''));

      items.push({
        id,
        type: 'video',
        platform,
        text: text ?? null,
        mediaUrl: src,
        mediaType: 'video',
        sourceUrl,
        thumbnailUrl: video.poster || null,
      });
    });
  }

  // Cap at 20 items to avoid flooding the popup
  return items.slice(0, 20);
}
