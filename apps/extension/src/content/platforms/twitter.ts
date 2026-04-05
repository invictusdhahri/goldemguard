import type { ScrapedItem, Platform } from '../../types';

/** Generate a stable ID from a URL + text snippet. */
function makeId(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return `tw_${Math.abs(h).toString(36)}`;
}

function absoluteUrl(src: string): string {
  try {
    return new URL(src, window.location.href).href;
  } catch {
    return src;
  }
}

export function scrapeTwitter(): ScrapedItem[] {
  const items: ScrapedItem[] = [];
  const platform: Platform = 'twitter';

  const tweets = document.querySelectorAll('[data-testid="tweet"]');

  tweets.forEach((tweet) => {
    const textEl = tweet.querySelector('[data-testid="tweetText"]');
    const text = textEl?.textContent?.trim() ?? null;

    // Try to find permalink
    const linkEl = tweet.querySelector('a[href*="/status/"]') as HTMLAnchorElement | null;
    const sourceUrl = linkEl ? absoluteUrl(linkEl.href) : window.location.href;

    // Image
    const imgEl = tweet.querySelector('img[src*="pbs.twimg.com/media"]') as HTMLImageElement | null;
    if (imgEl) {
      const mediaUrl = imgEl.src.replace(/\?.*$/, '?format=jpg&name=medium');
      items.push({
        id: makeId(sourceUrl + (text ?? '')),
        type: text ? 'post' : 'image',
        platform,
        text,
        mediaUrl,
        mediaType: 'image',
        sourceUrl,
        thumbnailUrl: imgEl.src,
      });
      return; // one item per tweet
    }

    // Video
    const videoEl = tweet.querySelector('video') as HTMLVideoElement | null;
    if (videoEl) {
      const posterUrl = videoEl.poster || null;
      // The actual video src might be in a <source> or set as videoEl.src
      const srcEl = videoEl.querySelector('source') as HTMLSourceElement | null;
      const mediaUrl = srcEl?.src || videoEl.src || null;
      items.push({
        id: makeId(sourceUrl + (text ?? '')),
        type: text ? 'post' : 'video',
        platform,
        text,
        mediaUrl,
        mediaType: 'video',
        sourceUrl,
        thumbnailUrl: posterUrl,
      });
      return;
    }

    // Text-only post
    if (text && text.length > 10) {
      items.push({
        id: makeId(sourceUrl + text),
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
