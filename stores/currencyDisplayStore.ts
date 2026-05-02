import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CurrencyDisplayMode = "both" | "real" | "converted";

interface CurrencyDisplayState {
  mode: CurrencyDisplayMode;
  setMode: (mode: CurrencyDisplayMode) => void;
}

export const useCurrencyDisplayStore = create<CurrencyDisplayState>()(
  persist(
    (set) => ({
      mode: "both",
      setMode: (mode) => set({ mode }),
    }),
    { name: "splito-currency-display" }
  )
);
