/**
 * Content script — injected into every page.
 * Listens for a SCRAPE message from the service worker and replies with
 * a list of detected ScrapedItems.
 */

import type { ScrapedItem } from '../types';
import { scrapeTwitter } from './platforms/twitter';
import { scrapeGeneric } from './platforms/generic';

function detectPlatform(): 'twitter' | 'generic' {
  const host = window.location.hostname;
  if (host.includes('twitter.com') || host.includes('x.com')) return 'twitter';
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
    case 'twitter':
      items = scrapeTwitter();
      break;
    default:
      items = scrapeGeneric();
      break;
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
