import { createContext, useContext } from "react";
import type { AppAction } from "./reducer";
import type { AppState } from "./selectors";

export type ContributionContextValue = {
  state: AppState;
  dispatch: (action: AppAction) => void;
  resetDemo: () => void;
};

export const ContributionContext =
  createContext<ContributionContextValue | null>(null);

export const useContributionStore = () => {
  const context = useContext(ContributionContext);
  if (!context) {
    throw new Error(
      "useContributionStore must be used within ContributionProvider",
    );
  }
  return context;
};
