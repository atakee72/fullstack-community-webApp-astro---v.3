/**
 * Event compose draft store — localStorage-backed Svelte writable.
 * Mirrors `composeDraftStore.ts` but with calendar-specific fields.
 *
 * Single slot for the in-flight event compose. Recovers the form if
 * the user refreshes or accidentally closes the tab. Cleared on
 * successful submit.
 */

import { writable } from 'svelte/store';
import type { EventCategory } from '../types';

export type EventDraftValues = {
  title: string;
  body: string;
  category: EventCategory;
  startDate: string; // ISO date (yyyy-mm-dd) — time stored separately
  startTime: string; // 'HH:mm'
  endDate: string;
  endTime: string;
  allDay: boolean;
  location: string;
  capacity: number | null;
  visibility: 'public' | 'private';
  tags: string[];
};

const STORAGE_KEY = 'kiosk-draft:event';

function readInitial(): EventDraftValues | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.title === 'string' &&
      typeof parsed.body === 'string' &&
      typeof parsed.category === 'string' &&
      typeof parsed.startDate === 'string' &&
      typeof parsed.endDate === 'string' &&
      Array.isArray(parsed.tags)
    ) {
      return parsed as EventDraftValues;
    }
    return null;
  } catch {
    return null;
  }
}

function createStore() {
  const store = writable<EventDraftValues | null>(readInitial());

  function setDraft(v: EventDraftValues) {
    store.set(v);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
      } catch {
        /* quota / privacy mode */
      }
    }
  }

  function clearDraft() {
    store.set(null);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }

  return { subscribe: store.subscribe, setDraft, clearDraft };
}

export const eventDraft = createStore();
