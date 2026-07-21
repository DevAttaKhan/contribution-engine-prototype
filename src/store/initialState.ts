import { sampleLeads } from "../data/sampleLeads";
import type { AppState } from "./selectors";

export const STORAGE_KEY = "contribution-engine-demo";

export const createInitialState = (): AppState => ({
  bookings: sampleLeads,
  plans: [],
  activities: [],
  notifications: [],
});

export const loadState = (): AppState => {
  if (typeof window === "undefined") return createInitialState();

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return createInitialState();

  try {
    return JSON.parse(stored) as AppState;
  } catch {
    return createInitialState();
  }
};

export const persistState = (state: AppState) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
