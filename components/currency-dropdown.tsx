"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Loader2, ChevronDown, Check, X, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrganizedCurrencies } from "@/features/currencies/hooks/use-currencies";
import type { Currency } from "@/features/currencies/api/client";

const dropdownVariants = {
  hidden: {
    opacity: 0,
    y: -5,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  exit: {
    opacity: 0,
    y: -5,
    scale: 0.95,
  },
};

type Props = {
  selectedCurrencies: string[];
  setSelectedCurrencies: (currencies: string[]) => void;
  showFiatCurrencies?: boolean;
  filterCurrencies?: (currency: Currency) => boolean;
  mode?: "single" | "multi";
  placeholder?: string;
  disableChainCurrencies?: boolean;
};

export default function CurrencyDropdown({
  selectedCurrencies,
  setSelectedCurrencies,
  showFiatCurrencies = true,
  filterCurrencies,
  mode = "multi",
  placeholder,
  disableChainCurrencies = false,
}: Props) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const triggerRef = useRef<HTMLDivElement>(null);
  const [dropdownRect, setDropdownRect] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (activeDropdown !== "currency" || !triggerRef.current) {
      setDropdownRect(null);
      setSearchQuery("");
      return;
    }
    const el = triggerRef.current;
    const rect = el.getBoundingClientRect();
    const padding = 8;
    const spaceBelow = window.innerHeight - rect.bottom - padding;
    const spaceAbove = rect.top - padding;
    const maxH = 320;
    const maxHeight = Math.min(maxH, spaceBelow > spaceAbove ? spaceBelow : spaceAbove, window.innerHeight - padding * 2);
    setDropdownRect({
      top: spaceBelow >= maxH ? rect.bottom + 4 : rect.top - maxHeight - 4,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(120, maxHeight),
    });
  }, [activeDropdown]);

  // Close on click outside
  useLayoutEffect(() => {
    if (activeDropdown !== "currency") return;
    const handleClick = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
      if ((e.target as Element).closest("[data-currency-dropdown-portal]")) return;
      setActiveDropdown(null);
    };
    document.addEventListener("mousedown", handleClick, true);
    return () => document.removeEventListener("mousedown", handleClick, true);
  }, [activeDropdown]);

  const { data: organizedCurrencies, isLoading: isLoadingCurrencies } =
    useOrganizedCurrencies();

  const fiatCurrencies = organizedCurrencies?.fiatCurrencies || [];
  const chainGroups = organizedCurrencies?.chainGroups || {};
  const chainCurrencies = Object.values(chainGroups).flat();

  // Apply filter if provided
  const filteredFiatCurrencies = filterCurrencies
    ? fiatCurrencies.filter(filterCurrencies)
    : fiatCurrencies;
  const filteredChainCurrencies = filterCurrencies
    ? chainCurrencies.filter(filterCurrencies)
    : chainCurrencies;

  const currencies = [...filteredChainCurrencies, ...filteredFiatCurrencies];

  const toggleDropdown = (dropdown: string) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const toggleCurrencySelection = (currencyId: string) => {
    if (mode === "single") {
      setSelectedCurrencies([currencyId]);
      setActiveDropdown(null);
    } else {
      // Multi-select mode
      if (selectedCurrencies.includes(currencyId)) {
        setSelectedCurrencies(
          selectedCurrencies.filter((id) => id !== currencyId)
        );
      } else {
        setSelectedCurrencies([...selectedCurrencies, currencyId]);
      }
    }
  };

  const removeCurrency = (currencyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newCurrencies = selectedCurrencies.filter((id) => id !== currencyId);
    setSelectedCurrencies(newCurrencies);
  };

  const matchesSearch = (c: Currency, q: string) => {
    if (!q.trim()) return true;
    const lower = q.toLowerCase().trim();
    return [c.id, c.symbol, c.name].some(
      (s) => s && String(s).toLowerCase().includes(lower)
    );
  };

  const renderCurrencyDropdown = () => {
    if (isLoadingCurrencies) {
      return (
        <div className="px-4 py-3 text-white/60 flex items-center">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span>Loading currencies...</span>
        </div>
      );
    }

    const fiatList = filteredFiatCurrencies.filter((c) =>
      matchesSearch(c, searchQuery)
    );
    const cryptoList = filteredChainCurrencies.filter((c) =>
      matchesSearch(c, searchQuery)
    );

    return (
      <>
        <div className="sticky top-0 bg-[#17171A] px-3 py-2 border-b border-white/10 z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Search currency..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-black/50 border border-white/10 text-white placeholder:text-white/50 text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>
        </div>
        <div className="py-2">
          {showFiatCurrencies && (
            <>
              <div className="px-4 py-2 text-xs font-medium text-white/50 uppercase tracking-wider">
                Fiat
              </div>
              {fiatList.length === 0 ? (
                <div className="px-4 py-2 text-sm text-white/50">
                  No matching fiat currencies
                </div>
              ) : (
                fiatList.map((currency) => (
                  <button
                    key={`fiat-${currency.id}`}
                    type="button"
                    className={`w-full px-4 py-2 text-left text-white hover:bg-white/5 flex items-center ${
                      selectedCurrencies.includes(currency.id) ? "bg-white/5" : ""
                    }`}
                    onClick={() => toggleCurrencySelection(currency.id)}
                  >
                    <div
                      className={`w-5 h-5 flex items-center justify-center rounded-md border mr-3 ${
                        selectedCurrencies.includes(currency.id)
                          ? "border-white bg-white"
                          : "border-white/30 bg-transparent"
                      }`}
                    >
                      {selectedCurrencies.includes(currency.id) && (
                        <Check className="h-3.5 w-3.5 text-black" />
                      )}
                    </div>
                    <div>
                      <span className="font-medium">{currency.id}</span>
                      <span className="text-white/70"> • {currency.name}</span>
                    </div>
                  </button>
                ))
              )}
            </>
          )}

          {!disableChainCurrencies && (
            <>
              <div className="px-4 py-2 text-xs font-medium text-white/50 uppercase tracking-wider mt-1">
                Crypto
              </div>
              {cryptoList.length === 0 ? (
                <div className="px-4 py-2 text-sm text-white/50">
                  No matching crypto
                </div>
              ) : (
                cryptoList.map((currency) => (
                  <button
                    key={`crypto-${currency.id}`}
                    type="button"
                    className={`w-full px-4 py-2 text-left text-white hover:bg-white/5 flex items-center ${
                      selectedCurrencies.includes(currency.id) ? "bg-white/5" : ""
                    }`}
                    onClick={() => toggleCurrencySelection(currency.id)}
                  >
                    <div
                      className={`w-5 h-5 flex items-center justify-center rounded-md border mr-3 ${
                        selectedCurrencies.includes(currency.id)
                          ? "border-white bg-white"
                          : "border-white/30 bg-transparent"
                      }`}
                    >
                      {selectedCurrencies.includes(currency.id) && (
                        <Check className="h-3.5 w-3.5 text-black" />
                      )}
                    </div>
                    <div>
                      <span className="font-medium">{currency.symbol}</span>
                      <span className="text-white/70"> • {currency.name}</span>
                    </div>
                  </button>
                ))
              )}
            </>
          )}
        </div>
      </>
    );
  };

  const defaultPlaceholder =
    mode === "single" ? "Select currency..." : "Select Payment Token...";

  return (
    <div className="relative" ref={triggerRef}>
      <button
        type="button"
        onClick={() => toggleDropdown("currency")}
        className="w-full min-h-12 bg-black border border-white/20 text-white rounded-lg px-4 py-2
          flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-white/40"
      >
        {mode === "single" ? (
          // Single select mode - show selected currency inline
          <span className="truncate text-left">
            {isLoadingCurrencies ? (
              "Loading currencies..."
            ) : selectedCurrencies.length > 0 ? (
              (() => {
                const selected = currencies.find(
                  (c) => c.id === selectedCurrencies[0]
                );
                return selected ? (
                  <span>
                    <span className="font-medium">
                      {selected.type === "FIAT" ? selected.id : selected.symbol}
                    </span>
                    <span className="text-white/70"> • {selected.name}</span>
                  </span>
                ) : (
                  selectedCurrencies[0]
                );
              })()
            ) : (
              <span className="text-white/70">
                {placeholder || defaultPlaceholder}
              </span>
            )}
          </span>
        ) : (
          // Multi-select mode - show chips with wrapping
          <div className="flex flex-wrap gap-2 items-center flex-1 min-w-0">
            {isLoadingCurrencies ? (
              <span className="py-1">Loading currencies...</span>
            ) : selectedCurrencies.length > 0 ? (
              selectedCurrencies.map((currencyId) => {
                const selected = currencies.find((c) => c.id === currencyId);
                if (!selected) return null;

                return (
                  <div
                    key={currencyId}
                    className="bg-white/10 rounded-md px-2 py-1 flex items-center flex-shrink-0"
                  >
                    <span className="font-medium mr-1 text-sm">
                      {selected.type === "FIAT" ? selected.id : selected.symbol}
                    </span>
                    <div
                      onClick={(e) => removeCurrency(currencyId, e)}
                      className="text-white/70 hover:text-white cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </div>
                  </div>
                );
              })
            ) : (
              <span className="py-1 text-white/70">
                {placeholder || defaultPlaceholder}
              </span>
            )}
          </div>
        )}
        <ChevronDown
          className={`h-5 w-5 text-white/70 transition-transform duration-200 ${
            activeDropdown === "currency" ? "rotate-180" : ""
          } ml-2 flex-shrink-0`}
        />
      </button>

      {typeof document !== "undefined" &&
        activeDropdown === "currency" &&
        dropdownRect &&
        createPortal(
          <AnimatePresence>
            <motion.div
              data-currency-dropdown-portal
              variants={dropdownVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                position: "fixed",
                top: dropdownRect.top,
                left: dropdownRect.left,
                width: dropdownRect.width,
                maxHeight: dropdownRect.maxHeight,
                zIndex: 99999,
              }}
              className="bg-[#17171A] rounded-lg py-2 overflow-y-auto shadow-xl border border-white/10"
            >
              {renderCurrencyDropdown()}
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
