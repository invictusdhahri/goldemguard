/**
 * Content script — injected into every page.
 * Listens for a SCRAPE message from the service worker and replies with
 * a list of detected ScrapedItems.
 */

import type { ScrapedItem } from '../types';
import { scrapeTwitter }  from './platforms/twitter';
import { scrapeFacebook } from './platforms/facebook';
import { scrapeYoutube }  from './platforms/youtube';
import { scrapeGeneric }  from './platforms/generic';

function detectPlatform(): 'twitter' | 'facebook' | 'youtube' | 'generic' {
  const host = window.location.hostname;
  if (host.includes('twitter.com') || host.includes('x.com')) return 'twitter';
  if (host.includes('facebook.com') || host.includes('fb.com')) return 'facebook';
  if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
  return 'generic';
}

function dedupeById(items: ScrapedItem[]): ScrapedItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function scrape(): ScrapedItem[] {
  const platform = detectPlatform();
  let items: ScrapedItem[];

  switch (platform) {
    case 'twitter':  items = scrapeTwitter();  break;
    case 'facebook': items = scrapeFacebook(); break;
    case 'youtube':  items = scrapeYoutube();  break;
    default:         items = scrapeGeneric();  break;
  }

  return dedupeById(items);
}

// Listen for SCRAPE requests from the popup / service worker
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'SCRAPE') {
    try {
      const items = scrape();
      sendResponse({ type: 'SCRAPE_RESULT', items });
    } catch (err) {
      console.error('[VeritasAI scraper]', err);
      sendResponse({ type: 'SCRAPE_RESULT', items: [] });
    }
    return true; // keep channel open for async sendResponse
  }
});
