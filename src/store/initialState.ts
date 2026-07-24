import { sampleLeads } from "../data/sampleLeads";
import type { AppState } from "./selectors";

export const STORAGE_KEY = "contribution-engine-demo";

export const createInitialState = (): AppState => ({
  bookings: sampleLeads,
  plans: [],
  activities: [],
  notifications: [],
  paymentLedger: [],
});

export const loadState = (): AppState => {
  if (typeof window === "undefined") return createInitialState();

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return createInitialState();

  try {
    const parsed = JSON.parse(stored) as AppState;
    return {
      ...createInitialState(),
      ...parsed,
      paymentLedger: parsed.paymentLedger ?? [],
    };
  } catch {
    return createInitialState();
  }
};

export const persistState = (state: AppState) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
