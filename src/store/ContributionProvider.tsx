import { useEffect, useMemo, useReducer, type ReactNode } from "react";
import { createInitialState, loadState, persistState } from "./initialState";
import { appReducer } from "./reducer";
import { ContributionContext } from "./useContributionStore";

export const ContributionProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, undefined, loadState);

  useEffect(() => {
    persistState(state);
  }, [state]);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      resetDemo: () => {
        const fresh = createInitialState();
        persistState(fresh);
        dispatch({ type: "RESET_DEMO" });
      },
    }),
    [state],
  );

  return (
    <ContributionContext.Provider value={value}>
      {children}
    </ContributionContext.Provider>
  );
};
