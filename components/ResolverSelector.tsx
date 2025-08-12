import React from "react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectLabel,
  SelectGroup,
} from "@/components/ui/select";
import { useOrganizedCurrencies } from "@/features/currencies/hooks/use-currencies";
import { useAvailableChains } from "@/features/wallets/hooks/use-wallets";
import { useEffect, useState } from "react";
import CurrencyDropdown from "./currency-dropdown";
import type { Currency } from "@/features/currencies/api/client";

// Option type for compatibility with parent
// (id = currency id or token id, symbol, name, chainId, type)
export type Option = {
  id: string;
  symbol: string;
  name: string;
  chainId?: string;
  type?: string;
};
type Props = {
  value?: Option;
  onChange: (option: Option | undefined) => void;
};

export default function ResolverSelector({ value, onChange }: Props) {
  const { data: organized, isLoading } = useOrganizedCurrencies();
  const { data: availableChains, isLoading: isChainsLoading } = useAvailableChains();
  // Use state for selected currency (single selection)
  const [selectedCurrency, setSelectedCurrency] = useState<string[]>(value ? [value.id] : []);

  // Compose the full list of currencies (chain tokens + fiat)
  const fiatCurrencies = organized?.fiatCurrencies || [];
  const chainGroups = organized?.chainGroups || {};
  const chainCurrencies = Object.values(chainGroups).flat();
  
  // Filter out ETH and USDC from the currencies
  const filteredChainCurrencies = chainCurrencies.filter(
    (currency) => currency.symbol !== "ETH" && currency.symbol !== "USDC"
  );
  
  const currencies = [...filteredChainCurrencies, ...fiatCurrencies];

  // Update parent when selection changes
  const handleCurrencyChange = (currenciesSelected: string[]) => {
    setSelectedCurrency(currenciesSelected);
    if (currenciesSelected.length === 0) {
      onChange(undefined);
    } else {
      // Find the full currency object
      const selected = currencies.find((c) => c.id === currenciesSelected[0]);
      if (selected) {
        // Map to Option type
        onChange({
          id: selected.id,
          symbol: selected.symbol,
          name: selected.name,
          chainId: selected.chainId || undefined,
          type: selected.type || undefined,
        });
      } else {
        // fallback (shouldn't happen)
        onChange(undefined);
      }
    }
  };

  return (
    <CurrencyDropdown
      selectedCurrencies={selectedCurrency}
      setSelectedCurrencies={handleCurrencyChange}
      showFiatCurrencies={false} // Remove fiat section
      filterCurrencies={(currency: Currency) => currency.symbol !== "ETH" && currency.symbol !== "USDC"} // Filter out ETH and USDC
    />
  );
}