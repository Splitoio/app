"use client";

import { useState } from "react";
import { Loader2, ChevronDown, Check, X } from "lucide-react";
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
    transition: {
      duration: 0.2,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -5,
    scale: 0.95,
    transition: {
      duration: 0.15,
      ease: "easeIn",
    },
  },
};

type Props = {
  selectedCurrencies: string[];
  setSelectedCurrencies: (currencies: string[]) => void;
  showFiatCurrencies?: boolean;
  filterCurrencies?: (currency: Currency) => boolean;
};

export default function CurrencyDropdown({
  selectedCurrencies,
  setSelectedCurrencies,
  showFiatCurrencies,
  filterCurrencies,
}: Props) {
  // const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const { data: organizedCurrencies, isLoading: isLoadingCurrencies } =
    useOrganizedCurrencies();

  const fiatCurrencies = organizedCurrencies?.fiatCurrencies || [];
  const chainGroups = organizedCurrencies?.chainGroups || {};
  const chainCurrencies = Object.values(chainGroups).flat();
  
  // Apply filter if provided
  const filteredFiatCurrencies = filterCurrencies ? fiatCurrencies.filter(filterCurrencies) : fiatCurrencies;
  const filteredChainCurrencies = filterCurrencies ? chainCurrencies.filter(filterCurrencies) : chainCurrencies;
  
  const currencies = [...filteredChainCurrencies, ...filteredFiatCurrencies];


  console.log(currencies)

  const toggleDropdown = (dropdown: string) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const toggleCurrencySelection = (currencyId: string) => {
    // Single select: always set to the selected currency
    setSelectedCurrencies([currencyId]);
    setActiveDropdown(null); // Close dropdown after selection
  };

  const removeCurrency = (currencyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newCurrencies = selectedCurrencies.filter((id) => id !== currencyId);
    setSelectedCurrencies(newCurrencies);
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

    // Use the cached organized currencies from our hook
    const fiatCurrencies = organizedCurrencies?.fiatCurrencies || [];
    const chainGroups = organizedCurrencies?.chainGroups || {};
    
    // Apply filter if provided
    const filteredFiatCurrencies = filterCurrencies ? fiatCurrencies.filter(filterCurrencies) : fiatCurrencies;
    
    // Filter chain groups
    const filteredChainGroups: Record<string, Currency[]> = {};
    Object.entries(chainGroups).forEach(([chainId, currencies]) => {
      const filteredCurrencies = filterCurrencies ? currencies.filter(filterCurrencies) : currencies;
      if (filteredCurrencies.length > 0) {
        filteredChainGroups[chainId] = filteredCurrencies;
      }
    });

    return (
      <>
        {showFiatCurrencies && (
          <>
            <div className="px-4 py-2 text-sm text-white/50 font-medium">
              Fiat
            </div>
            {filteredFiatCurrencies.map((currency) => (
              <button
                key={`fiat-${currency.id}`}
                type="button"
                className={`w-full px-4 py-2 text-left text-white hover:bg-white/5 flex items-center ${
                  selectedCurrencies.includes(currency.id) ? "bg-white/5" : ""
                }`}
                onClick={() => toggleCurrencySelection(currency.id)}
              >
                <div
                  className={`w-5 h-5 flex items-center justify-center rounded-md border ${
                    selectedCurrencies.includes(currency.id)
                      ? "border-white bg-white"
                      : "border-white/30 bg-transparent"
                  } mr-3`}
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
            ))}
          </>
        )}

        {/* Chain Currencies */}
        {Object.entries(filteredChainGroups).map(([chainId, currencies]) => (
          <div key={`chain-${chainId}`}>
            <div className="px-4 py-2 text-sm text-white/50 font-medium">
              {chainId}
            </div>
            {currencies.map((currency) => (
              <button
                key={`chain-${chainId}-${currency.id}`}
                type="button"
                className={`w-full px-4 py-2 text-left text-white hover:bg-white/5 flex items-center ${
                  selectedCurrencies.includes(currency.id) ? "bg-white/5" : ""
                }`}
                onClick={() => toggleCurrencySelection(currency.id)}
              >
                <div
                  className={`w-5 h-5 flex items-center justify-center rounded-md border ${
                    selectedCurrencies.includes(currency.id)
                      ? "border-white bg-white"
                      : "border-white/30 bg-transparent"
                  } mr-3`}
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
            ))}
          </div>
        ))}
      </>
    );
  };

  return (
    // <div className="mb-8">
    // <label className="block text-white mb-2">Preferred Currencies</label>
    <div className="relative">
      <button
        type="button"
        onClick={() => toggleDropdown("currency")}
        className="w-full min-h-12 bg-black border border-white/20 text-white rounded-lg px-4 py-2
          flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-white/40"
      >
        <div className="flex flex-wrap gap-2 items-center">
          {isLoadingCurrencies ? (
            <span className="py-1">Loading currencies...</span>
          ) : selectedCurrencies.length > 0 ? (
            selectedCurrencies.map((currencyId) => {
              const selected = currencies.find((c) => c.id === currencyId);
              if (!selected) return null;

              return (
                <div
                  key={currencyId}
                  className="bg-white/10 rounded-md px-2 py-1 flex items-center"
                >
                  <span className="font-medium mr-1">
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
            <span className="py-1 text-white/70">Select currencies...</span>
          )}
        </div>
        <ChevronDown
          className={`h-5 w-5 text-white/70 transition-transform duration-200 ${
            activeDropdown === "currency" ? "rotate-180" : ""
          } ml-2 flex-shrink-0`}
        />
      </button>

      <AnimatePresence>
        {activeDropdown === "currency" && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute top-full left-0 right-0 mt-1 bg-[#17171A] rounded-lg py-2 z-10 max-h-[320px] overflow-y-auto shadow-xl border border-white/10"
          >
            {renderCurrencyDropdown()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    // </div>
  );
}
