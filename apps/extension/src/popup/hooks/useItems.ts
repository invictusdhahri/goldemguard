import { useState, useCallback, useRef } from 'react';
import type { ScrapedItem, RevealResult, AnalysisResponse, ExtMessage } from '../../types';

export interface ItemsState {
  items: ScrapedItem[];
  reveals: Record<string, RevealResult>;
  scraping: boolean;
  scrapeError: string | null;
}

export function useItems() {
  const [state, setState] = useState<ItemsState>({
    items: [],
    reveals: {},
    scraping: false,
    scrapeError: null,
  });
  const scrapedOnce = useRef(false);

  const scrape = useCallback(() => {
    if (scrapedOnce.current) return;
    scrapedOnce.current = true;
    setState((s) => ({ ...s, scraping: true, scrapeError: null }));

    chrome.runtime.sendMessage({ type: 'SCRAPE' }, (res: ExtMessage | undefined) => {
      if (chrome.runtime.lastError) {
        setState((s) => ({ ...s, scraping: false, scrapeError: 'Could not connect to page.' }));
        return;
      }
      if (res?.type === 'SCRAPE_RESULT') {
        setState((s) => ({ ...s, scraping: false, items: res.items }));
      } else {
        setState((s) => ({ ...s, scraping: false, scrapeError: 'Unexpected scrape response.' }));
      }
    });
  }, []);

  const reveal = useCallback((item: ScrapedItem) => {
    setState((s) => ({
      ...s,
      reveals: { ...s.reveals, [item.id]: { status: 'loading' } },
    }));

    chrome.runtime.sendMessage({ type: 'REVEAL', item }, (res: ExtMessage | undefined) => {
      if (chrome.runtime.lastError || !res) {
        const error = chrome.runtime.lastError?.message ?? 'Background not reachable';
        setState((s) => ({
          ...s,
          reveals: { ...s.reveals, [item.id]: { status: 'error', error } },
        }));
        return;
      }

      if (res.type === 'REVEAL_RESULT') {
        const data: AnalysisResponse = res.result;
        setState((s) => ({
          ...s,
          reveals: { ...s.reveals, [item.id]: { status: 'done', data } },
        }));
      } else if (res.type === 'REVEAL_ERROR') {
        setState((s) => ({
          ...s,
          reveals: { ...s.reveals, [item.id]: { status: 'error', error: res.error } },
        }));
      }
    });
  }, []);

  const rescrape = useCallback(() => {
    scrapedOnce.current = false;
    setState({ items: [], reveals: {}, scraping: false, scrapeError: null });
    scrape();
  }, [scrape]);

  return { ...state, scrape, rescrape, reveal };
}
