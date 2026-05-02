"use client";

import React from "react";
import { useGetExchangeRate } from "@/features/currencies/hooks/use-currencies";
import { useAuthStore } from "@/stores/authStore";
import { useCurrencyDisplayStore } from "@/stores/currencyDisplayStore";
import { formatCurrency } from "@/utils/formatters";

export function useDualAmount(amount: number, currency: string) {
  const user = useAuthStore((s) => s.user);
  const mode = useCurrencyDisplayStore((s) => s.mode);
  const defaultCurrency = user?.currency || "USD";
  const src = currency || defaultCurrency;
  const same = src === defaultCurrency;
  const { data: rateData } = useGetExchangeRate(src, defaultCurrency);
  const rate = same ? 1 : rateData?.rate ?? null;

  const realStr = formatCurrency(amount, src);
  const convertedStr = rate != null ? formatCurrency(amount * rate, defaultCurrency) : null;

  if (same) return { primary: realStr, secondary: null as string | null };
  if (mode === "real") return { primary: realStr, secondary: null as string | null };
  if (mode === "converted") return { primary: convertedStr ?? realStr, secondary: null as string | null };
  return { primary: convertedStr ?? realStr, secondary: convertedStr ? realStr : null };
}

interface DualAmountProps {
  amount: number;
  currency: string;
  className?: string;
  secondaryStyle?: React.CSSProperties;
  style?: React.CSSProperties;
}

export function DualAmount({ amount, currency, className, style, secondaryStyle }: DualAmountProps) {
  const { primary, secondary } = useDualAmount(amount, currency);
  return (
    <span className={className} style={style}>
      {primary}
      {secondary && (
        <span style={{ opacity: 0.55, marginLeft: 5, ...secondaryStyle }}>({secondary})</span>
      )}
    </span>
  );
}
