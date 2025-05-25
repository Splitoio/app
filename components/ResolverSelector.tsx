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
  const [allOptions, setAllOptions] = useState<Option[]>([]);

  useEffect(() => {
    if (availableChains?.chains && organized) {
      // Map all available chains to Option type
      const chainOptions: Option[] = availableChains.chains.map((chain: any) => ({
        id: chain.id,
        symbol: chain.id.toUpperCase(),
        name: chain.name,
        chainId: chain.id,
        type: "CHAIN",
      }));
      // Merge with tokens from organized.chainGroups
      const tokenOptions = Object.values(organized.chainGroups || {}).flat();
      const fiatOptions = organized.fiatCurrencies || [];
      setAllOptions([...chainOptions, ...tokenOptions, ...fiatOptions]);
    }
  }, [availableChains, organized]);

  // Value logic
  const selectedValue = value ? value.id : "__default__";

  return (
    <Select
      value={selectedValue}
      onValueChange={val => {
        if (!val || val === "__default__") return onChange(undefined);
        const selected = allOptions.find(o => o.id === val);
        onChange(selected);
      }}
    >
      <SelectTrigger className="w-full h-12 bg-[#17171A] text-white border-none focus:ring-1 focus:ring-white/20">
        <SelectValue
          placeholder="(No Resolver / Use Default)"
          {...(value ? { children: `${value.symbol} • ${value.name}` } : {})}
        />
      </SelectTrigger>
      <SelectContent className="bg-[#17171A] border-white/10">
        <SelectItem value="__default__" className="text-white">
          (No Resolver / Use Default)
        </SelectItem>
        {/* Group by chain */}
        {availableChains?.chains?.map((chain: any) => {
          // Find tokens for this chain
          const tokens = (organized?.chainGroups?.[chain.id] || []);
          return (
            <SelectGroup key={chain.id}>
              <SelectLabel className="text-sm text-white/70 font-normal px-4 py-1">
                {chain.name}
              </SelectLabel>
              {/* Chain itself as an option */}
              <SelectItem value={chain.id} className="flex items-center text-white hover:bg-white/10">
                <span className="font-medium mr-2">{chain.id.toUpperCase()}</span>
                <span className="text-white/70">• {chain.name}</span>
              </SelectItem>
              {/* Tokens for this chain */}
              {tokens.map((opt: Option) => (
                <SelectItem key={opt.id} value={opt.id} className="flex items-center text-white hover:bg-white/10">
                  <span className="font-medium mr-2">{opt.symbol}</span>
                  <span className="text-white/70">• {opt.name}</span>
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
        {/* Fiat Section */}
        {organized?.fiatCurrencies?.length > 0 && (
          <SelectGroup>
            <SelectLabel className="text-sm text-white/70 font-normal px-4 py-1">Fiat</SelectLabel>
            {organized.fiatCurrencies.map(opt => (
              <SelectItem key={opt.id} value={opt.id} className="flex items-center text-white hover:bg-white/10">
                <span className="font-medium mr-2">{opt.symbol}</span>
                <span className="text-white/70">• {opt.name}</span>
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}