"use client";

import { X, Loader2, ChevronDown, ChevronRight, ChevronUp, Landmark, Link2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeIn, scaleIn } from "@/utils/animations";
import { toast } from "sonner";
import Image from "next/image";
import { GroupBalance, User } from "@/api-helpers/modelSchema";
import { useSettleDebt } from "@/features/settle/hooks/use-splits";
import { useMarkAsPaid } from "@/features/groups/hooks/use-create-group";
import { useHandleEscapeToCloseModal } from "@/hooks/useHandleEscape";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useQueryClient } from "@tanstack/react-query";
import { useGetFriends } from "@/features/friends/hooks/use-get-friends";
import { useGetAllGroups } from "@/features/groups/hooks/use-create-group";
import { useBalances } from "@/features/balances/hooks/use-balances";
import ResolverSelector, { Option as TokenOption } from "./ResolverSelector";
import { useOrganizedCurrencies, useGetExchangeRate } from "@/features/currencies/hooks/use-currencies";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import { useUserWallets } from "@/features/wallets/hooks/use-wallets";
import { WalletSelector as ShadcnWalletSelector } from "@/components/WalletSelector";

interface SettleDebtsModalProps {
  isOpen: boolean;
  onClose: () => void;
  balances?: GroupBalance[];
  groupId?: string;
  members?: User[];
  showIndividualView?: boolean;
  selectedFriendId?: string | null;
  defaultCurrency?: string;
  specificAmount?: number;
  specificDebtByCurrency?: Record<string, number>;
  defaultExpandedMemberId?: string | null;
}

export function SettleDebtsModal({
  isOpen,
  onClose,
  balances = [],
  groupId = "",
  members: _members = [],
  showIndividualView = false,
  selectedFriendId = null,
  defaultCurrency,
  specificAmount,
  specificDebtByCurrency,
  defaultExpandedMemberId,
}: SettleDebtsModalProps) {
  const user = useAuthStore((state) => state.user);
  const {
    isConnected: walletConnected,
    isConnecting: _isConnecting,
    connectWallet,
    wallet,
    aptosWallet,
    address,
    walletType: _walletType,
  } = useWallet();
  const [selectedToken, setSelectedToken] = useState<TokenOption | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [_excludedFriendIds, setExcludedFriendIds] = useState<string[]>([]);
  const [totalAmount, setTotalAmount] = useState("0");
  const [individualAmount, setIndividualAmount] = useState("0");
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const [availableChainsForToken, setAvailableChainsForToken] = useState<string[]>([]);
  const [debtCurrency, setDebtCurrency] = useState<string>("USD"); // Currency of the debt
  const [fiatAmount, setFiatAmount] = useState("0"); // Original fiat amount
  const [tokenAmount, setTokenAmount] = useState("0"); // Converted token amount
  const [multiCurrencyDebts, setMultiCurrencyDebts] = useState<Array<{currency: string, amount: number, tokenAmount: number}>>([]);
  const [totalTokenAmount, setTotalTokenAmount] = useState("0"); // Total token amount for all currencies
  const [expandedRowMemberId, setExpandedRowMemberId] = useState<string | null>(null);
  const [memberMethods, setMemberMethods] = useState<Record<string, "crypto" | "bank">>({});
  const [memberMarkedPaid, setMemberMarkedPaid] = useState<Record<string, boolean>>({});
  const [memberChains, setMemberChains] = useState<Record<string, string>>({});
  const [memberBankCurrencies, setMemberBankCurrencies] = useState<Record<string, string>>({});
  const [memberBankDropdownOpen, setMemberBankDropdownOpen] = useState<Record<string, boolean>>({});
  const [memberBankSearch, setMemberBankSearch] = useState<Record<string, string>>({});

  const settleDebtMutation = useSettleDebt(groupId);
  const markAsPaidMutation = useMarkAsPaid();
  const _queryClient = useQueryClient();
  const { data: friends } = useGetFriends();
  const { data: _groups } = useGetAllGroups();
  const { data: balanceData } = useBalances();
  const { data: organizedCurrencies } = useOrganizedCurrencies();
  const { data: walletData } = useUserWallets();
  const wallets = walletData?.accounts || [];
  const stellarWallet = wallets.find(w => w.chainId === "stellar");
  const userStellarAddress = stellarWallet?.address || null;
  useHandleEscapeToCloseModal(isOpen, onClose);

  // Helper functions for debt calculations
  const transformGroupBalancesToCurrencyMap = (groupBalances: GroupBalance[], userId: string): Record<string, number> => {
    const currencyMap: Record<string, number> = {};
    
    groupBalances.forEach(balance => {
      // Only include balances for the current user
      if (balance.userId === userId) {
        if (!currencyMap[balance.currency]) {
          currencyMap[balance.currency] = 0;
        }
        currencyMap[balance.currency] += balance.amount;
      }
    });

    return currencyMap;
  };

  const calculateTotalDebtsFromBalances = (balancesData: Record<string, number>) => {
    const total = Object.entries(balancesData).reduce((total, [_currency, amount]) => {
      // Only include positive amounts (debts we owe)
      if (amount > 0) {
        return total + amount;
      }
      return total;
    }, 0);
    return total;
  };

  const getDebtCurrencies = (balancesData: Record<string, number>) => {
    const result = Object.entries(balancesData)
      .filter(([_currency, amount]) => amount > 0)
      .map(([currency, amount]) => ({ currency, amount }));
    return result;
  };

  // COMMENTED OUT: Individual friend debt logic - focus only on group balances
  // const calculateTotalDebts = (friendsList: FriendWithBalances[]) => {
  //   const total = friendsList.reduce((total, friend) => {
  //     const positiveBalances = friend.balances.filter((b) => b.amount > 0);
  //     const friendTotal = positiveBalances.reduce((sum: number, balance) => {
  //       return sum + balance.amount;
  //     }, 0);
  //     return total + friendTotal;
  //   }, 0);
  //   return total;
  // };

  // Custom pricing data fetcher using the pricing API
  const fetchPricingData = async (tokenId: string, baseCurrency: string) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const response = await fetch(
      `${API_URL}/api/pricing/price?id=${tokenId}&baseCurrency=${baseCurrency}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch price for ${tokenId} in ${baseCurrency}`);
    }

    return await response.json();
  };

  // Fetch pricing data for multiple currencies
  const fetchMultiCurrencyPricing = async (tokenId: string, currencies: string[]) => {
    const promises = currencies.map(currency => 
      fetchPricingData(tokenId, currency.toLowerCase()).catch(error => ({
        currency,
        error: error.message,
        price: null
      }))
    );
    
    const results = await Promise.all(promises);
    return results.map((result, index) => ({
      currency: currencies[index],
      price: result.price || null,
      error: result.error || null
    }));
  };

  // Currency conversion using pricing API - get token price in debt currency
  const shouldConvert = debtCurrency !== selectedToken?.id && debtCurrency !== selectedToken?.symbol;
  const { data: tokenPriceData, isLoading: isLoadingTokenPrice, error: priceError } = useQuery({
    queryKey: ['tokenPrice', selectedToken?.id, debtCurrency],
    queryFn: () => fetchPricingData(selectedToken?.id || '', debtCurrency.toLowerCase()),
    enabled: !!selectedToken?.id && !!debtCurrency && shouldConvert,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Multi-currency pricing for group settlements (memoized to stabilize useMemo deps below)
  const groupBalancesObj = useMemo(() => {
    if (balances && typeof balances === "object" && !Array.isArray(balances)) {
      return balances as Record<string, number>;
    }
    if (balances && Array.isArray(balances) && user) {
      return transformGroupBalancesToCurrencyMap(balances as GroupBalance[], user.id);
    }
    return {};
  }, [balances, user]);

  // Memoize group debt currencies to prevent infinite loops
  const groupDebtCurrencies = useMemo(() => {
    return Object.keys(groupBalancesObj).length > 0
      ? getDebtCurrencies(groupBalancesObj)
      : [];
  }, [groupBalancesObj]);
  
  const { data: multiCurrencyPricing, isLoading: isLoadingMultiCurrency } = useQuery({
    queryKey: ['multiCurrencyPricing', selectedToken?.id, groupDebtCurrencies.map(d => d.currency).join(',')],
    queryFn: () => fetchMultiCurrencyPricing(
      selectedToken?.id || '', 
      groupDebtCurrencies.map(d => d.currency)
    ),
    enabled: !!selectedToken?.id && groupDebtCurrencies.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fallback: Use exchange rate if conversion fails
  const { data: exchangeRateData, isLoading: isLoadingRate, error: exchangeRateError } = useGetExchangeRate(
    debtCurrency,
    selectedToken?.id || ""
  );

  // Helper function to get currency symbol from organized currencies data
  const getCurrencySymbol = (currencyId: string): string => {
    if (!organizedCurrencies) return currencyId;
    
    // Check fiat currencies first
    const fiatCurrency = organizedCurrencies.fiatCurrencies?.find((c: { id?: string }) => c.id === currencyId);
    if (fiatCurrency) return fiatCurrency.symbol;
    
    // Check chain groups for crypto currencies
    for (const chainGroup of Object.values(organizedCurrencies.chainGroups || {})) {
      const cryptoCurrency = chainGroup.find((c: { id?: string; symbol?: string }) => c.id === currencyId);
      if (cryptoCurrency) return cryptoCurrency.symbol;
    }
    
    return currencyId;
  };

  // Helper function to format currency using actual symbols
  const formatCurrency = (amount: number, currencyId: string = 'USD'): string => {
    const symbol = getCurrencySymbol(currencyId);
    const decimals = currencyId === 'JPY' ? 0 : 2;
    return `${symbol}${amount.toFixed(decimals)}`;
  };

  // Reset excluded friends when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setExcludedFriendIds([]);
    }
  }, [isOpen, groupId, showIndividualView, selectedFriendId, userStellarAddress]);

  // Auto-expand the specified member row when modal opens
  useEffect(() => {
    if (isOpen && defaultExpandedMemberId) {
      setExpandedRowMemberId(defaultExpandedMemberId);
    }
  }, [isOpen, defaultExpandedMemberId]);

  // Set the selected user based on selectedFriendId prop
  useEffect(() => {
    if (selectedFriendId && friends) {
      const friend = friends.find((f: { id: string }) => f.id === selectedFriendId);
      if (friend) {
        setSelectedUser(friend as unknown as User);

        // Use specific amount if provided, otherwise calculate from friend balances
        if (specificAmount !== undefined) {
          const amount = Math.abs(specificAmount);
          setFiatAmount(amount.toFixed(2));
          setIndividualAmount(amount.toFixed(2));
          // Set debt currency from specificDebtByCurrency if available
          if (specificDebtByCurrency && Object.keys(specificDebtByCurrency).length > 0) {
            setDebtCurrency(Object.keys(specificDebtByCurrency)[0]);
          }
        } else if (specificDebtByCurrency && Object.keys(specificDebtByCurrency).length > 0) {
          // Use currency-specific debt amount - get the first currency's amount
          const firstCurrency = Object.keys(specificDebtByCurrency)[0];
          const firstCurrencyAmount = specificDebtByCurrency[firstCurrency];
          const amount = Math.abs(firstCurrencyAmount);
          setFiatAmount(amount.toFixed(2));
          setIndividualAmount(amount.toFixed(2));
          setDebtCurrency(firstCurrency);
        } else {
          // COMMENTED OUT: Calculate amount owed to this specific friend from cross-group balances
          // Focus only on group-specific debt amounts
          // const positiveBalance = friend.balances.find((b: any) => b.amount > 0);
          // if (positiveBalance) {
          //   const amount = Math.abs(positiveBalance.amount);
          //   setFiatAmount(amount.toFixed(2));
          //   setIndividualAmount(amount.toFixed(2));
          //   // Use currency from the balance data if available, otherwise default
          //   setDebtCurrency(positiveBalance.currency || defaultCurrency || "USD");
          // } else {
          //   setFiatAmount("0");
          //   setIndividualAmount("0");
          // }
          
          // Use only default amounts when no specific debt is provided
          setFiatAmount("0");
          setIndividualAmount("0");
          setDebtCurrency(defaultCurrency || "USD");
        }
      }
    } else if (!showIndividualView) {
      setSelectedUser(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- omit defaultCurrency to avoid unnecessary re-runs
  }, [selectedFriendId, friends, showIndividualView, specificAmount, specificDebtByCurrency]);

  // Calculate total debts across all groups on mount and when data changes
  useEffect(() => {
    if (groupId && balances && typeof balances === 'object' && !Array.isArray(balances)) {
      // We're in a group context with group balances - ONLY use group balances
      const totalOwed = calculateTotalDebtsFromBalances(balances as Record<string, number>);
      setTotalAmount(totalOwed.toFixed(2));
    } 
    // COMMENTED OUT: Individual friend debt calculation to focus only on group balances
    // else if (friends) {
    //   // We're in a general debt settlement context
    //   const totalOwed = calculateTotalDebts(friends as FriendWithBalances[]);
    //   setTotalAmount(totalOwed.toFixed(2));
    // }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omit defaultCurrency to avoid re-running on currency change
  }, [balanceData, balances, groupId]);

  // Fetch available tokens
  // eslint-disable-next-line react-hooks/exhaustive-deps -- omit selectedToken to avoid loop (we only run when !selectedToken)
  useEffect(() => {
    if (isOpen && organizedCurrencies && !selectedToken) {
      const chainCurrencies = Object.values(organizedCurrencies.chainGroups || {}).flat();
      let tokenToSelect = chainCurrencies[0];
      
      // Priority 1: Use currency from specific debt if available
      if (specificDebtByCurrency && Object.keys(specificDebtByCurrency).length > 0) {
        const debtCurrency = Object.keys(specificDebtByCurrency)[0];
        const match = chainCurrencies.find((t) => t.id === debtCurrency || t.symbol === debtCurrency);
        if (match) tokenToSelect = match;
      }
      // Priority 2: Use default currency
      else if (defaultCurrency) {
        const match = chainCurrencies.find(
          (t) => t.symbol === defaultCurrency
        );
        if (match) tokenToSelect = match;
      }
      // Priority 3: Default to XML if available
      else {
        const xmlMatch = chainCurrencies.find((t) => t.symbol === "XML");
        if (xmlMatch) tokenToSelect = xmlMatch;
      }
      
      if (tokenToSelect) {
        setSelectedToken({
          id: tokenToSelect.id,
          symbol: tokenToSelect.symbol,
          name: tokenToSelect.name,
          chainId: tokenToSelect.chainId || undefined,
          type: tokenToSelect.type,
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedToken intentionally omitted to avoid loop
  }, [isOpen, organizedCurrencies, defaultCurrency, specificDebtByCurrency]);

  // Update individualAmount when selectedUser changes
  useEffect(() => {
    if (selectedUser && specificAmount === undefined) {
      // COMMENTED OUT: Only update from user balances if no specific amount is provided
      // Focus on group balances only, not individual friend balances across groups
      // const positiveBalance = (selectedUser as any).balances?.find((b: any) => b.amount > 0);
      // if (positiveBalance) {
      //   setIndividualAmount(Math.abs(positiveBalance.amount).toFixed(2));
      // } else {
      //   setIndividualAmount("0");
      // }
      
      // Use specific debt amount or group balance instead
      if (specificDebtByCurrency && Object.keys(specificDebtByCurrency).length > 0) {
        const firstCurrency = Object.keys(specificDebtByCurrency)[0];
        const amount = Math.abs(specificDebtByCurrency[firstCurrency]);
        setIndividualAmount(amount.toFixed(2));
      } else {
        setIndividualAmount("0");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- omit selectedToken to avoid loops
  }, [selectedUser, specificAmount, specificDebtByCurrency]);

  // Update token amount when pricing data is available
  useEffect(() => {
    const fiatValue = parseFloat(fiatAmount) || 0;
    
    if (!shouldConvert || fiatValue <= 0) {
      // No conversion needed or invalid amount
      setTokenAmount(fiatAmount);
      return;
    }

    if (tokenPriceData && tokenPriceData.price) {
      // Calculate token amount: fiatAmount / tokenPriceInDebtCurrency
      console.log("[SettleDebtsModal] Using pricing data:", tokenPriceData);
      const tokenAmount = fiatValue / tokenPriceData.price;
      setTokenAmount(tokenAmount.toFixed(6));
    } else if (exchangeRateData && exchangeRateData.rate && !isLoadingRate) {
      // Fallback: Calculate using exchange rate
      console.log("[SettleDebtsModal] Using exchange rate fallback:", exchangeRateData);
      const convertedAmount = fiatValue * exchangeRateData.rate;
      setTokenAmount(convertedAmount.toFixed(6));
    } else if (!isLoadingTokenPrice && !isLoadingRate) {
      // If both fail, use fiat amount as fallback
      console.log("[SettleDebtsModal] Using fiat amount fallback due to conversion failure");
      if (priceError) {
        console.error("[SettleDebtsModal] Pricing error:", priceError);
      }
      if (exchangeRateError) {
        console.error("[SettleDebtsModal] Exchange rate error:", exchangeRateError);
      }
      setTokenAmount(fiatAmount);
    }
  }, [tokenPriceData, exchangeRateData, isLoadingTokenPrice, isLoadingRate, fiatAmount, selectedToken, shouldConvert, priceError, exchangeRateError]);

  // Update multi-currency debt calculations
  useEffect(() => {
    console.log('Multi-currency calculation triggered:', {
      multiCurrencyPricing: !!multiCurrencyPricing,
      selectedToken: selectedToken?.symbol,
      groupDebtCurrencies: groupDebtCurrencies,
      showIndividualView,
      groupBalancesObj
    });

    // Prevent infinite loops - only run when we have the required data
    if (!multiCurrencyPricing || !selectedToken || groupDebtCurrencies.length === 0) {
      console.log('Early return from multi-currency calculation');
      return;
    }

    if (!showIndividualView && multiCurrencyPricing && groupDebtCurrencies.length > 0) {

      const debtsWithTokenAmounts = groupDebtCurrencies.map(debt => {
        const pricingData = multiCurrencyPricing.find(p => p.currency === debt.currency);
        let tokenAmount = 0;

        if (pricingData && pricingData.price && !pricingData.error) {
          // Convert using pricing data
          tokenAmount = debt.amount / pricingData.price;
        } else {
          // Fallback: assume 1:1 ratio or use a default conversion
          tokenAmount = debt.amount;
        }
        
        return {
          currency: debt.currency,
          amount: debt.amount,
          tokenAmount: tokenAmount
        };
      });
      
      // Only update if the data has actually changed to prevent infinite loops
      const newDebtsString = JSON.stringify(debtsWithTokenAmounts);
      const currentDebtsString = JSON.stringify(multiCurrencyDebts);
      
      // Calculate total token amount needed
      const totalTokens = debtsWithTokenAmounts.reduce((sum, debt) => sum + debt.tokenAmount, 0);
      
      if (newDebtsString !== currentDebtsString) {
        setMultiCurrencyDebts(debtsWithTokenAmounts);
        setTotalTokenAmount(totalTokens.toFixed(6));
      }
      
      if (newDebtsString !== currentDebtsString) {
        setMultiCurrencyDebts(debtsWithTokenAmounts);
        setTotalTokenAmount(totalTokens.toFixed(6));
      }

    } else if (showIndividualView && multiCurrencyPricing && groupDebtCurrencies.length > 0) {
      const debtsWithTokenAmounts = groupDebtCurrencies.map(debt => {
        const pricingEntry = multiCurrencyPricing?.find((p: { currency: string; price?: number }) => p.currency === debt.currency);
        if (!pricingEntry || !pricingEntry.price) {
          return { ...debt, tokenAmount: 0 };
        }

        const tokenAmount = debt.amount / pricingEntry.price;
        
        return {
          ...debt,
          tokenAmount,
          pricing: pricingEntry
        };
      });

      // Only update if the data has actually changed to prevent infinite loops
      const newDebtsString = JSON.stringify(debtsWithTokenAmounts);
      const currentDebtsString = JSON.stringify(multiCurrencyDebts);
      
      if (newDebtsString !== currentDebtsString) {
        setMultiCurrencyDebts(debtsWithTokenAmounts);
        
        const totalTokens = debtsWithTokenAmounts.reduce((sum, debt) => sum + (debt.tokenAmount || 0), 0);
        setTotalTokenAmount(totalTokens.toFixed(6));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- groupBalancesObj/multiCurrencyDebts are derived; omit to avoid loops
  }, [multiCurrencyPricing, groupDebtCurrencies, showIndividualView, selectedToken?.id]);

  // When fiat amount changes, update individual amount for compatibility
  useEffect(() => {
    setIndividualAmount(fiatAmount);
  }, [fiatAmount]);

  // Update available chains when selectedToken changes
  useEffect(() => {
    if (selectedToken && organizedCurrencies) {
      // Find all tokens with the same symbol (across chains)
      const chainCurrencies = Object.values(organizedCurrencies.chainGroups || {}).flat();
      const matchingTokens = chainCurrencies.filter(
        (t) => t.symbol === selectedToken.symbol
      );
      const chains = matchingTokens.map((t) => t.chainId).filter(Boolean) as string[];
      setAvailableChainsForToken(chains);
      // Auto-select if only one chain
      if (chains.length === 1) {
        setSelectedChain(chains[0]);
      } else {
        setSelectedChain(selectedToken.chainId || null);
      }
    } else {
      setAvailableChainsForToken([]);
      setSelectedChain(null);
    }
  }, [selectedToken, organizedCurrencies]);

  // When chain changes, update selectedToken to the token on that chain
  useEffect(() => {
    if (
      selectedToken &&
      selectedChain &&
      organizedCurrencies &&
      selectedToken.chainId !== selectedChain
    ) {
      const chainCurrencies = Object.values(organizedCurrencies.chainGroups || {}).flat();
      const tokenOnChain = chainCurrencies.find(
        (t) => t.symbol === selectedToken.symbol && t.chainId === selectedChain
      );
      if (tokenOnChain) {
        setSelectedToken({
          id: tokenOnChain.id,
          symbol: tokenOnChain.symbol,
          name: tokenOnChain.name,
          chainId: tokenOnChain.chainId || undefined,
          type: tokenOnChain.type,
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when selectedChain changes to avoid loops
  }, [selectedChain]);

  // Calculate remaining total after excluding friends
  const calculateRemainingTotal = () => {
    if (groupId && balances && typeof balances === 'object' && !Array.isArray(balances)) {
      // For group context, use group balances only - no exclusions needed
      const total = calculateTotalDebtsFromBalances(balances as Record<string, number>);
      console.log("[SettleDebtsModal] Group remaining total:", total);
      return total;
    } 
    // COMMENTED OUT: Individual friend context calculation - focus only on group balances
    // else if (friends) {
    //   // For friend context, calculate with exclusions
    //   const includedFriends = friends.filter(
    //     (friend: any) => !excludedFriendIds.includes(friend.id)
    //   );
    //   const total = calculateTotalDebts(includedFriends as FriendWithBalances[]);
    //   return total;
    // }
    return 0;
  };

  // Toggle excluding a friend from settlement
  const _toggleExcludeFriend = (friendId: string) => {
    setExcludedFriendIds((prev) => {
      if (prev.includes(friendId)) {
        return prev.filter((id) => id !== friendId);
      } else {
        return [...prev, friendId];
      }
    });
  };

  // Get friends with debts for showing in the modal
  // COMMENTED OUT: Individual friend debt logic - focus only on group balances
  // const friendsWithDebts =
  //   friends?.filter((friend: any) =>
  //     friend.balances.some((balance: any) => balance.amount > 0)
  //   ) || [];

  // Get group debt breakdown for group context
  const groupDebtBreakdown = groupId && Object.keys(groupBalancesObj).length > 0
    ? getDebtCurrencies(groupBalancesObj)
    : [];

  console.log("[SettleDebtsModal] Group debt breakdown:", {
    groupId,
    groupBalancesObjKeys: Object.keys(groupBalancesObj),
    groupDebtBreakdown
  });

  // Helper to get the correct wallet address based on selected chain
  const getUserWalletAddress = () => {
    if (selectedChain === 'aptos') {
      // Get sender address from connected Aptos wallet, not from saved wallets
      // Convert to string to ensure type compatibility
      return aptosWallet?.account?.address?.toString() || null;
    } else if (selectedChain === 'stellar') {
      // First try to get from connected wallet, then fallback to saved address
      return address || userStellarAddress;
    }
    // Add more chains as needed
    return null;
  };

  // Helper to check if wallet is connected for the selected chain
  const _isWalletConnectedForChain = () => {
    if (selectedChain === 'aptos') {
      return aptosWallet.connected && aptosWallet.account?.address;
    } else if (selectedChain === 'stellar') {
      // For Stellar, check if the wallet is connected AND we have an address
      return walletConnected && wallet && (address || userStellarAddress);
    }
    return false;
  };

  // Helper to check if we can proceed with settlement
  const canProceedWithSettlement = () => {
    const _result = {
      aptos: selectedChain === 'aptos' ? {
        connected: aptosWallet.connected,
        hasAddress: !!aptosWallet.account?.address,
        canProceed: aptosWallet.connected && aptosWallet.account?.address
      } : null,
      stellar: selectedChain === 'stellar' ? {
        walletConnected,
        hasWallet: !!wallet,
        address,
        userStellarAddress,
        hasAnyAddress: !!(address || userStellarAddress),
        canProceed: walletConnected && wallet && (address || userStellarAddress)
      } : null
    };
    if (selectedChain === 'aptos') {
      // For Aptos, need wallet connected and address available
      return aptosWallet.connected && aptosWallet.account?.address;
    } else if (selectedChain === 'stellar') {
      // For Stellar, need wallet connected and address (either from connected wallet or saved settings)
      return walletConnected && wallet && (address || userStellarAddress);
    }
    return false;
  };

  const handleSettleOne = async (settleWith: User) => {
    const userWalletAddress = getUserWalletAddress();
    
    // Check wallet connection first
    if (!canProceedWithSettlement()) {
      if (selectedChain === 'aptos') {
        toast.error("Please connect your Aptos wallet first.");
        // Don't call connectWallet() for Aptos - user should use the WalletSelector component
        return;
      } else {
        toast.error("Please connect your Stellar wallet first.");
        connectWallet();
        return;
      }
    }
    
    if (!userWalletAddress) {
      toast.error(`Please connect your ${selectedChain === 'aptos' ? 'Aptos' : 'Stellar'} wallet or add your wallet address in settings first.`);
      return;
    }
    
    if (!selectedToken) {
      toast.error("Please select a payment token");
      return;
    }
    // Use multi-currency total if available, otherwise use individual amount
    const amountToSettle = multiCurrencyDebts.length > 0 
      ? parseFloat(totalTokenAmount) 
      : (parseFloat(tokenAmount) || parseFloat(individualAmount));

    const payload = {
      groupId,
      address: userWalletAddress,
      settleWithId: settleWith.id,
      selectedTokenId: selectedToken.id,
      selectedChainId: selectedChain || undefined,
      amount: amountToSettle,
    };
    settleDebtMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(`Successfully settled debt with ${settleWith.name}`);
        onClose();
      },
      onError: (err) => {
        console.error("[SettleDebtsModal] Error settling debt:", err);
        toast.error("Failed to settle debt", {
          description: "Please try again or check your wallet connection.",
        });
      }
    });
  };

  const handleSettleAll = async () => {
    const userWalletAddress = getUserWalletAddress();
    
    // Check wallet connection first
    if (!canProceedWithSettlement()) {
      if (selectedChain === 'aptos') {
        toast.error("Please connect your Aptos wallet first.");
        // Don't call connectWallet() for Aptos - user should use the WalletSelector component
        return;
      } else {
        toast.error("Please connect your Stellar wallet first.");
        connectWallet();
        return;
      }
    }
    
    if (!userWalletAddress) {
      toast.error(`Please connect your ${selectedChain === 'aptos' ? 'Aptos' : 'Stellar'} wallet or add your wallet address in settings first.`);
      return;
    }
    
    if (!selectedToken) {
      toast.error("Please select a payment token");
      return;
    }

    // Use total token amount for multi-currency settlements, or regular total for single currency
    const amountToSettle = multiCurrencyDebts.length > 0 
      ? parseFloat(totalTokenAmount) 
      : parseFloat(totalAmount);

    const payload = {
      groupId,
      address: userWalletAddress,
      selectedTokenId: selectedToken.id,
      selectedChainId: selectedChain || undefined,
      amount: amountToSettle,
    };
    
    settleDebtMutation.mutate(payload, {
      onSuccess: () => {
        onClose();
        toast.success("Successfully settled debts");
      },
      onError: (_err) => {
        toast.error("Failed to settle debts", {
          description: "Please try again or check your wallet connection.",
        });
      }
    });
  };

  const isPending = settleDebtMutation.isPending;

  // Get the selected user's balance for individual settlement
  const selectedUserBalance = selectedUser
    ? (specificAmount !== undefined 
        ? specificAmount 
        : specificDebtByCurrency && Object.keys(specificDebtByCurrency).length > 0
        ? Object.values(specificDebtByCurrency)[0] // Use specific debt amount instead of cross-group balances
        : 0) // COMMENTED OUT: (selectedUser as unknown as FriendWithBalances).balances.find() - focus on group-specific debts
    : 0;

  // Get currency-specific debts for the selected user
  const selectedUserDebtByCurrency = selectedUser && specificDebtByCurrency 
    ? specificDebtByCurrency 
    : {};

  // Check if there are any debts to settle for the selected user
  const _hasDebtsToSettle = Object.values(selectedUserDebtByCurrency).some(amount => amount !== 0);

  // Calculate the remaining total after exclusions
  const remainingTotal = calculateRemainingTotal();
  const displayGroupName = useMemo(() => {
    if (!groupId) return "Group";
    const groupMatch = _groups?.find((g: { id: string; name: string }) => g.id === groupId);
    return groupMatch?.name || "Group";
  }, [_groups, groupId]);

  const memberDebtRows = useMemo(() => {
    const palette = ["#A78BFA", "#34D399", "#FB923C", "#22D3EE", "#F472B6", "#FBBF24"];
    const sourceBalances = Array.isArray(balances) ? balances : [];
    const rows = sourceBalances
      .filter((b) => b.userId !== user?.id && b.amount < 0)
      .reduce((acc, b) => {
        const current = acc.get(b.userId) || 0;
        acc.set(b.userId, current + Math.abs(b.amount));
        return acc;
      }, new Map<string, number>());

    return Array.from(rows.entries())
      .map(([memberId, amount], index) => {
        const member = _members.find((m) => m.id === memberId);
        const initials = (member?.name || member?.email || "?")
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        const color = palette[index % palette.length];
        return {
          memberId,
          name: member?.name || member?.email || "Member",
          initials,
          color,
          amount,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [balances, user?.id, _members]);

  const CURRENCY_FLAG: Record<string, string> = {
    USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵", THB: "🇹🇭",
    INR: "🇮🇳", AUD: "🇦🇺", CAD: "🇨🇦", SGD: "🇸🇬", CHF: "🇨🇭",
    CNY: "🇨🇳", KRW: "🇰🇷", MXN: "🇲🇽", BRL: "🇧🇷", SEK: "🇸🇪",
    NOK: "🇳🇴", DKK: "🇩🇰", NZD: "🇳🇿", ZAR: "🇿🇦", HKD: "🇭🇰",
  };

  const SETTLE_CHAIN_META: Record<string, { icon: string; color: string }> = {
    stellar: { icon: "✦", color: "#34D399" },
    solana:  { icon: "◎", color: "#A78BFA" },
    aptos:   { icon: "⬡", color: "#22D3EE" },
    base:    { icon: "🔵", color: "#3B82F6" },
  };

  const availableChains = organizedCurrencies?.chainGroups
    ? Object.keys(organizedCurrencies.chainGroups)
    : ["stellar", "solana", "aptos", "base"];

  const handleMarkAsPaid = (memberId: string, amount: number) => {
    if (!user || !groupId) return;
    markAsPaidMutation.mutate(
      {
        groupId,
        payload: {
          payerId: memberId,
          payeeId: user.id,
          amount,
          currency: defaultCurrency || "USD",
          currencyType: "FIAT",
        },
      },
      {
        onSuccess: () => {
          toast.success("Marked as paid");
          setMemberMarkedPaid((p) => ({ ...p, [memberId]: true }));
        },
        onError: () => toast.error("Failed to mark as paid"),
      }
    );
  };

  const isMobile = useIsMobile();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 h-screen w-screen"
          {...fadeIn}
        >
          <motion.div
            className="fixed inset-0 bg-black/70 brightness-50"
            style={isMobile ? { backdropFilter: "blur(10px)" } : undefined}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
          <div
            className={
              isMobile
                ? "modal-as-sheet-wrapper fixed inset-x-0 bottom-0 z-10 w-full max-w-[430px] mx-auto"
                : "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full md:w-[90%] max-w-[500px] px-4 sm:px-0"
            }
          >
            {isMobile && <div className="modal-as-sheet-handle" />}
            {/* Settle All Debts Section - Only shown when header button is clicked */}
            {!showIndividualView && (
              <motion.div
                className={
                  isMobile
                    ? "modal-as-sheet-card relative z-10 p-5 sm:p-7"
                    : "relative z-10 rounded-[28px] p-7 border border-white/[0.09] shadow-[0_40px_100px_rgba(0,0,0,0.8)] max-h-[90vh] overflow-y-auto"
                }
                style={isMobile ? undefined : { background: "linear-gradient(160deg, #141414 0%, #0f0f0f 100%)" }}
                {...(isMobile ? { initial: { y: "100%" }, animate: { y: 0 }, transition: { type: "tween", duration: 0.32, ease: [0.34, 1.2, 0.64, 1] } } : scaleIn)}
              >
                <div className={`flex items-center justify-between mb-5 ${isMobile ? "modal-as-sheet-title-bar pb-4" : ""}`}>
                  <div>
                    <h2 className={`font-extrabold text-white tracking-tight ${isMobile ? "text-lg" : "text-xl"}`}>
                      Settle Debts
                    </h2>
                    <p className="mt-1.5 text-xs text-white/55">{displayGroupName}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.07] grid place-items-center hover:bg-white/[0.12] transition-colors flex-shrink-0"
                  >
                    <X className="h-4 w-4 text-white/70" />
                  </button>
                </div>

                {/* Progress bar — one-third filled (step 1) */}
                <div className="flex gap-1.5 mb-6">
                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      className="flex-1 h-1 rounded-full transition-all duration-300"
                      style={{
                        background: s === 1 ? "#22D3EE" : "#2a2a2a",
                        boxShadow: s === 1 ? "0 0 8px rgba(34,211,238,0.5)" : "none",
                      }}
                    />
                  ))}
                </div>

                <div className="space-y-4">
                  {/* Currency block — Group default + Per-member override */}
                  <div
                    className="rounded-[14px] border border-[#22D3EE]/15 bg-[#22D3EE]/[0.06] px-4 py-3 flex items-center justify-between gap-2"
                  >
                    <span className="text-white/60 text-xs font-semibold">
                      Group default:{" "}
                      <span className="text-[#22D3EE] font-extrabold">
                        {defaultCurrency || "USD"}
                      </span>
                    </span>
                    <span className="text-white/45 text-[11px] font-medium">
                      Per-member override below
                    </span>
                  </div>

                  {/* Debtor list — expandable card-like rows */}
                  <div className="space-y-2.5">
                    {memberDebtRows.length > 0 ? (
                      memberDebtRows.map((row) => {
                        const isExpanded = expandedRowMemberId === row.memberId;
                        return (
                          <div
                            key={row.memberId}
                            className="rounded-[18px] border border-white/[0.08] bg-white/[0.03] overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedRowMemberId((id) =>
                                  id === row.memberId ? null : row.memberId
                                )
                              }
                              className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-white/[0.02] transition-colors"
                            >
                              <div
                                className="h-9 w-9 rounded-full border-2 grid place-items-center text-xs font-extrabold flex-shrink-0"
                                style={{
                                  color: row.color,
                                  borderColor: `${row.color}40`,
                                  background: `${row.color}1a`,
                                }}
                              >
                                {row.initials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-[13px] font-bold truncate">
                                  {row.name}
                                </p>
                                <p className="text-white/55 text-[11px] mt-0.5">
                                  {defaultCurrency || "USD"} (Fiat)
                                </p>
                              </div>
                              <p className="text-[#34D399] text-sm font-extrabold tabular-nums flex-shrink-0">
                                +{formatCurrency(row.amount, defaultCurrency || "USD")}
                              </p>
                              <span className="flex-shrink-0 text-white/40">
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </span>
                            </button>
                            {isExpanded && (
                              <div
                                className="border-t border-white/[0.06] bg-black/20 px-4 py-4 space-y-3"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Method tabs */}
                                <div className="grid grid-cols-2 gap-2">
                                  {(["crypto", "bank"] as const).map((method) => {
                                    const active = (memberMethods[row.memberId] ?? "crypto") === method;
                                    return (
                                      <button
                                        key={method}
                                        type="button"
                                        onClick={() => setMemberMethods((p) => ({ ...p, [row.memberId]: method }))}
                                        className="flex items-center justify-center gap-2 py-3 px-3 rounded-[14px] border text-xs font-bold transition-colors"
                                        style={{
                                          background: active ? "rgba(34,211,238,0.10)" : "rgba(255,255,255,0.04)",
                                          borderColor: active ? "rgba(34,211,238,0.50)" : "rgba(255,255,255,0.10)",
                                          color: active ? "#22D3EE" : "rgba(255,255,255,0.80)",
                                        }}
                                      >
                                        {method === "crypto" ? (
                                          <><Link2 className="h-3.5 w-3.5 flex-shrink-0" /> Crypto on-chain</>
                                        ) : (
                                          <><Landmark className="h-3.5 w-3.5 flex-shrink-0" /> Bank / Mark paid</>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Crypto on-chain panel */}
                                {(memberMethods[row.memberId] ?? "crypto") === "crypto" && (
                                  <div>
                                    <p className="text-[10px] font-bold tracking-[0.1em] uppercase mb-2" style={{ color: "#ccc" }}>
                                      Chain
                                    </p>
                                    <div className="grid grid-cols-4 gap-2 mb-3">
                                      {availableChains.map((chain) => {
                                        const meta = SETTLE_CHAIN_META[chain] || { icon: "◆", color: "#666" };
                                        const isChainSel = (memberChains[row.memberId] || selectedChain) === chain;
                                        return (
                                          <button
                                            key={chain}
                                            type="button"
                                            onClick={() => {
                                              setMemberChains((p) => ({ ...p, [row.memberId]: chain }));
                                              setSelectedChain(chain);
                                            }}
                                            className="flex flex-col items-center gap-1.5 py-3 rounded-[14px] border transition-all"
                                            style={{
                                              background: isChainSel ? `${meta.color}18` : "rgba(255,255,255,0.04)",
                                              borderColor: isChainSel ? `${meta.color}55` : "rgba(255,255,255,0.08)",
                                              boxShadow: isChainSel ? `0 0 14px ${meta.color}22` : "none",
                                            }}
                                          >
                                            <span style={{ color: meta.color, fontSize: 18 }}>{meta.icon}</span>
                                            <span className="text-[10px] font-bold" style={{ color: isChainSel ? meta.color : "rgba(255,255,255,0.55)" }}>
                                              {chain.charAt(0).toUpperCase() + chain.slice(1)}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>

                                    {(memberChains[row.memberId] || selectedChain) && (() => {
                                      const member = _members.find((m) => m.id === row.memberId);
                                      if (!canProceedWithSettlement()) {
                                        return (
                                          <div>
                                            {selectedChain === "aptos" && <ShadcnWalletSelector />}
                                            {selectedChain === "stellar" && (
                                              <button
                                                type="button"
                                                className="w-full py-3 rounded-[14px] bg-white/[0.06] border border-white/10 text-white text-sm font-semibold hover:bg-white/[0.1] transition-colors"
                                                onClick={connectWallet}
                                              >
                                                Connect {selectedChain.charAt(0).toUpperCase() + selectedChain.slice(1)} Wallet
                                              </button>
                                            )}
                                            {selectedChain && !getUserWalletAddress() && (
                                              <p className="text-xs text-red-400 mt-2 text-center">
                                                Please connect your {selectedChain} wallet or add it in settings first.
                                              </p>
                                            )}
                                          </div>
                                        );
                                      }
                                      return (
                                        <button
                                          type="button"
                                          disabled={isPending}
                                          className="w-full py-3 rounded-[14px] text-sm font-extrabold transition-opacity hover:opacity-90 disabled:opacity-50"
                                          style={{ background: "#22D3EE", color: "#0a0a0a" }}
                                          onClick={() => member && handleSettleOne(member)}
                                        >
                                          {isPending ? "Sending…" : "Settle Now"}
                                        </button>
                                      );
                                    })()}

                                    <button
                                      type="button"
                                      className="w-full mt-2 py-2.5 rounded-[14px] text-xs font-semibold transition-colors hover:text-white/80"
                                      style={{ border: "1px dashed rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.55)" }}
                                      onClick={() => setMemberMethods((p) => ({ ...p, [row.memberId]: "bank" }))}
                                    >
                                      Don&apos;t trust app? Mark as paid manually instead
                                    </button>
                                  </div>
                                )}

                                {/* Bank / Mark paid panel */}
                                {memberMethods[row.memberId] === "bank" && (() => {
                                  const selCurrency = memberBankCurrencies[row.memberId] || defaultCurrency || "USD";
                                  const isOpen = !!memberBankDropdownOpen[row.memberId];
                                  const search = memberBankSearch[row.memberId] || "";
                                  const fiatList = organizedCurrencies?.fiatCurrencies || [];
                                  const filtered = fiatList.filter((c: { id: string; name: string }) =>
                                    c.id.toLowerCase().includes(search.toLowerCase()) ||
                                    c.name.toLowerCase().includes(search.toLowerCase())
                                  );
                                  const selEntry = fiatList.find((c: { id: string }) => c.id === selCurrency);
                                  return (
                                    <div>
                                      <p className="text-[12px] mb-3" style={{ color: "rgba(255,255,255,0.60)", lineHeight: 1.6 }}>
                                        Ask {row.name.split(" ")[0]} to pay via their banking app, then mark as paid here.
                                      </p>
                                      <p className="text-[10px] font-bold tracking-[0.1em] uppercase mb-2" style={{ color: "#ccc" }}>
                                        They&apos;ll Pay In
                                      </p>

                                      {/* Dropdown trigger */}
                                      <button
                                        type="button"
                                        onClick={() => setMemberBankDropdownOpen((p) => ({ ...p, [row.memberId]: !p[row.memberId] }))}
                                        className="w-full rounded-[14px] px-4 py-3 text-sm font-semibold mb-1 flex items-center justify-between transition-colors"
                                        style={{
                                          background: "rgba(255,255,255,0.05)",
                                          border: `1px solid ${isOpen ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.09)"}`,
                                          color: "#fff",
                                        }}
                                      >
                                        <span>
                                          {CURRENCY_FLAG[selCurrency] || "💱"} {selCurrency}
                                          {selEntry ? ` · ${selEntry.name}` : ""}
                                        </span>
                                        <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, transition: "transform 0.2s", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "none" }}>▾</span>
                                      </button>

                                      {/* Dropdown panel */}
                                      {isOpen && (
                                        <div
                                          className="rounded-[18px] overflow-hidden mb-3"
                                          style={{ border: "1px solid rgba(255,255,255,0.09)", background: "#141414", boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}
                                        >
                                          {/* Search */}
                                          <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                                            <input
                                              autoFocus
                                              placeholder="Search currency…"
                                              value={search}
                                              onChange={(e) => setMemberBankSearch((p) => ({ ...p, [row.memberId]: e.target.value }))}
                                              className="bg-transparent outline-none text-[13px] w-full"
                                              style={{ color: "#fff", fontFamily: "inherit" }}
                                            />
                                          </div>
                                          {/* Fiat label */}
                                          <div className="px-4 py-1.5 text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>
                                            Fiat
                                          </div>
                                          {/* Currency list */}
                                          <div style={{ maxHeight: 200, overflowY: "auto" }}>
                                            {filtered.map((c: { id: string; name: string }, i: number) => {
                                              const isSel = c.id === selCurrency;
                                              return (
                                                <div
                                                  key={c.id}
                                                  onClick={() => {
                                                    setMemberBankCurrencies((p) => ({ ...p, [row.memberId]: c.id }));
                                                    setMemberBankDropdownOpen((p) => ({ ...p, [row.memberId]: false }));
                                                    setMemberBankSearch((p) => ({ ...p, [row.memberId]: "" }));
                                                  }}
                                                  className="flex items-center gap-3 px-4 cursor-pointer transition-colors"
                                                  style={{
                                                    padding: "10px 16px",
                                                    borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                                                    background: isSel ? "rgba(34,211,238,0.06)" : "transparent",
                                                  }}
                                                >
                                                  <span style={{ fontSize: 17 }}>{CURRENCY_FLAG[c.id] || "💱"}</span>
                                                  <span style={{ fontWeight: 700, fontSize: 13, color: isSel ? "#fff" : "rgba(255,255,255,0.85)", minWidth: 36 }}>{c.id}</span>
                                                  <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, flex: 1 }}>{c.name}</span>
                                                  {isSel && <span style={{ color: "#22D3EE", fontSize: 12 }}>✓</span>}
                                                </div>
                                              );
                                            })}
                                            {filtered.length === 0 && (
                                              <p className="text-center py-4 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>No currencies found</p>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {memberMarkedPaid[row.memberId] ? (
                                        <div
                                          className="w-full py-3 rounded-[14px] text-sm font-bold text-center"
                                          style={{
                                            background: "rgba(52,211,153,0.06)",
                                            border: "1px solid rgba(52,211,153,0.20)",
                                            color: "#34D399",
                                          }}
                                        >
                                          ✓ Marked as paid
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          disabled={markAsPaidMutation.isPending}
                                          className="w-full py-3 rounded-[14px] text-sm font-extrabold transition-colors hover:opacity-90 disabled:opacity-50"
                                          style={{
                                            background: "rgba(52,211,153,0.10)",
                                            border: "1.5px solid rgba(52,211,153,0.25)",
                                            color: "#34D399",
                                          }}
                                          onClick={() => handleMarkAsPaid(row.memberId, row.amount)}
                                        >
                                          {markAsPaidMutation.isPending ? "Marking…" : "✓ Mark as Paid"}
                                        </button>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : groupDebtBreakdown.length > 0 ? (
                      groupDebtBreakdown.map((debt) => (
                        <div
                          key={debt.currency}
                          className="rounded-[18px] border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-white text-[13px] font-bold">{debt.currency}</p>
                            <p className="text-white/55 text-[11px] mt-0.5">Unattributed member debt</p>
                          </div>
                          <p className="text-[#34D399] text-sm font-extrabold tabular-nums">
                            +{formatCurrency(debt.amount, debt.currency)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-white/55 py-8 text-sm">
                        No outstanding debts found for this group.
                      </div>
                    )}
                  </div>

                  {/* Total to collect */}
                  <div className="flex items-center justify-between pt-1 pb-1 px-0.5">
                    <span className="text-white/90 text-[13px] font-semibold">Total to collect</span>
                    <span className="text-[#34D399] text-[15px] font-extrabold tabular-nums">
                      +{formatCurrency(remainingTotal, defaultCurrency || "USD")}
                    </span>
                  </div>

                </div>

                <button
                  className="w-full mt-5 h-12 rounded-[14px] bg-[#22D3EE] text-[#0a0a0a] font-extrabold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSettleAll}
                  disabled={isPending || remainingTotal <= 0}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending…</span>
                    </>
                  ) : (
                    <>
                      <span>Review &amp; Confirm</span>
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {/* Settle Individual Debt Section - Only shown when a friend's button is clicked */}
            {showIndividualView && (
              <motion.div
                className={
                  isMobile
                    ? "modal-as-sheet-card relative z-10 p-5 sm:p-7"
                    : "relative z-10 rounded-[28px] p-7 border border-white/[0.09] shadow-[0_40px_100px_rgba(0,0,0,0.8)] max-h-[90vh] overflow-y-auto"
                }
                style={isMobile ? undefined : { background: "linear-gradient(160deg, #141414 0%, #0f0f0f 100%)" }}
                {...(isMobile ? { initial: { y: "100%" }, animate: { y: 0 }, transition: { type: "tween", duration: 0.32, ease: [0.34, 1.2, 0.64, 1] } } : scaleIn)}
              >
                <div className={`flex items-center justify-between mb-5 ${isMobile ? "modal-as-sheet-title-bar pb-4" : ""}`}>
                  <div>
                    <h2 className={`font-extrabold text-white tracking-tight ${isMobile ? "text-lg" : "text-xl"}`}>
                      Settle {selectedUser ? (selectedUser.name || "Member").split(" ")[0] : "Debt"}
                    </h2>
                    <p className="mt-1.5 text-xs text-white/55">Individual settlement</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.07] grid place-items-center hover:bg-white/[0.12] transition-colors flex-shrink-0"
                  >
                    <X className="h-4 w-4 text-white/70" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[#ccc] text-[11px] font-bold tracking-[0.08em] uppercase mb-2 block">
                      Choose Payment Token
                    </label>

                    <div className="relative mb-4">
                      <ResolverSelector
                        value={selectedToken || undefined}
                        onChange={(option) => setSelectedToken(option || null)}
                      />
                    </div>

                    {availableChainsForToken.length > 1 && (
                      <div className="mb-4">
                        <label className="text-[#ccc] text-[11px] font-bold tracking-[0.08em] uppercase mb-2 block">
                          Select Chain
                        </label>
                        <select
                          value={selectedChain || ''}
                          onChange={e => setSelectedChain(e.target.value)}
                          className="w-full rounded-[14px] px-4 py-3 bg-white/[0.05] border-[1.5px] border-white/[0.09] text-white text-[14px] outline-none font-inherit"
                        >
                          {availableChainsForToken.map(chain => (
                            <option key={chain} value={chain} className="bg-[#141414]">
                              {chain.charAt(0).toUpperCase() + chain.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="relative space-y-3">
                      {/* Token Amount to Send */}
                      {selectedToken && (
                        <div>
                          <label className="text-[#ccc] text-[11px] font-bold tracking-[0.08em] uppercase mb-2 block">
                            Amount {(isLoadingTokenPrice || isLoadingRate || isLoadingMultiCurrency) && "(Converting...)"} <span className="text-[#22D3EE]">({selectedToken?.symbol})</span>
                          </label>
                          <div className="w-full flex items-center bg-white/[0.05] border-[1.5px] border-white/[0.09] rounded-[14px] px-4 py-3 text-white">
                            <span className="text-[#22D3EE] text-[20px] font-extrabold mr-2 min-w-[24px]">
                              {selectedToken?.symbol === 'USD' ? '$' : selectedToken?.symbol[0]}
                            </span>
                            <input
                              type="text"
                              value={multiCurrencyDebts.length > 0 ? totalTokenAmount : (tokenAmount || fiatAmount)}
                              onChange={(e) => {
                                if (multiCurrencyDebts.length === 0) {
                                  setFiatAmount(e.target.value);
                                  setIndividualAmount(e.target.value);
                                }
                              }}
                              className="bg-transparent outline-none text-[26px] font-[800] w-full font-inherit"
                              placeholder="0.00"
                              readOnly={multiCurrencyDebts.length > 0 || (isLoadingTokenPrice || isLoadingRate || isLoadingMultiCurrency)}
                            />
                            <span className="text-[14px] font-bold text-white/50 ml-2">
                              {selectedToken?.symbol || "Token"}
                            </span>
                          </div>
                          
                          {/* Conversion Breakdown Dropdown */}
                          {multiCurrencyDebts.length > 0 && (
                            <details className="mt-3 group">
                              <summary className="cursor-pointer text-[13px] text-white/70 hover:text-white transition-colors flex items-center gap-2 font-medium list-none [&::-webkit-details-marker]:hidden">
                                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
                                Conversion Breakdown
                              </summary>
                              <div className="mt-2 p-3 bg-white/[0.03] border border-white/[0.06] rounded-[14px]">
                                {multiCurrencyDebts.map((debt, index) => (
                                  <div key={index} className="flex justify-between items-center text-[12px] py-1">
                                    <span className="text-white/80">
                                      {formatCurrency(debt.amount, debt.currency)}
                                    </span>
                                    <span className="text-[#34D399] font-bold">
                                      {debt.tokenAmount.toFixed(6)} {selectedToken?.symbol}
                                    </span>
                                  </div>
                                ))}
                                <div className="border-t border-white/[0.08] mt-2 pt-2">
                                  <div className="flex justify-between items-center text-[13px] font-bold">
                                    <span className="text-white">Total:</span>
                                    <span className="text-[#34D399]">
                                      {totalTokenAmount} {selectedToken?.symbol}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </details>
                          )}
                          
                          {/* Show pricing info only for single currency conversions */}
                          {multiCurrencyDebts.length === 0 && (tokenPriceData || exchangeRateData) && (
                            <div className="text-xs text-white/60 mt-1">
                              {tokenPriceData ? (
                                <>
                                  Price: 1 {selectedToken?.symbol} = {getCurrencySymbol(debtCurrency)}{tokenPriceData.price?.toFixed(6)}
                                  <br />
                                  Rate: 1 {getCurrencySymbol(debtCurrency)} = {(1/tokenPriceData.price)?.toFixed(6)} {selectedToken?.symbol}
                                </>
                              ) : exchangeRateData ? (
                                <>
                                  Rate: 1 {getCurrencySymbol(debtCurrency)} = {exchangeRateData.rate?.toFixed(6)} {selectedToken?.symbol}
                                  {priceError && " (Using fallback rate)"}
                                </>
                              ) : null}
                            </div>
                          )}
                          
                          {multiCurrencyDebts.length === 0 && priceError && !exchangeRateData && !isLoadingTokenPrice && !isLoadingRate && (
                            <div className="text-xs text-yellow-400 mt-1">
                              Unable to fetch current exchange rate - using fallback conversion
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {!selectedUser && (
                    <div className="text-center text-white/60 py-4 text-[13px]">
                      Select a user to settle individual debt
                    </div>
                  )}

                  {selectedUser && (
                    <div className="flex items-center gap-3 sm:gap-4 p-4 mt-2 bg-white/[0.03] border border-white/[0.08] rounded-[18px]">
                      <div className="h-[46px] w-[46px] overflow-hidden rounded-full border-2 border-white/[0.1]">
                        <Image
                          src={
                            selectedUser.image ||
                            `https://api.dicebear.com/9.x/identicon/svg?seed=${selectedUser.id}`
                          }
                          alt={selectedUser.name || "User"}
                          width={46}
                          height={46}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://api.dicebear.com/9.x/identicon/svg?seed=${selectedUser.id}`;
                          }}
                        />
                      </div>
                      <div className="flex-[1]">
                        <p className="text-[14px] text-white font-[700] mb-0.5">
                          {selectedUser.name}
                        </p>
                        <p className="text-[12px] text-white/60 font-[500]">
                          You owe{" "}
                          {(() => {
                            return multiCurrencyDebts.length > 0 ? (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {multiCurrencyDebts.map((debt, idx) => (
                                  <span key={idx} className="text-[#34D399] font-[800] font-mono">
                                    {formatCurrency(debt.amount, debt.currency)}
                                    {idx < multiCurrencyDebts.length - 1 && ", "}
                                  </span>
                                ))}
                                <span className="text-white/60 ml-1 font-[400] font-sans">
                                  worth {totalTokenAmount} {selectedToken?.symbol || "tokens"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[#34D399] font-[800] font-mono ml-1">
                                {formatCurrency(Math.abs(selectedUserBalance), defaultCurrency)}
                              </span>
                            );
                          })()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Show wallet connection component for any chain if not connected */}
                {!canProceedWithSettlement() && (
                  <div className="mt-4">
                    {selectedChain === 'aptos' && <ShadcnWalletSelector />}
                  </div>
                )}

                {canProceedWithSettlement() ? (
                  <button
                    className="w-full mt-6 h-12 rounded-[14px] bg-[#22D3EE] text-[#0a0a0a] font-extrabold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => selectedUser && handleSettleOne(selectedUser)}
                    disabled={
                      isPending ||
                      !selectedUser ||
                      (multiCurrencyDebts.length > 0 ? parseFloat(totalTokenAmount) <= 0 : (parseFloat(tokenAmount) <= 0 && parseFloat(fiatAmount) <= 0)) ||
                      !selectedToken ||
                      (isLoadingTokenPrice || isLoadingRate || isLoadingMultiCurrency)
                    }
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Sending…</span>
                      </>
                    ) : (
                      <>
                        <span>Review &amp; Confirm</span>
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                ) : (
                  selectedChain === 'stellar' && (
                    <button
                      className="w-full mt-5 h-11 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/[0.1] transition-colors"
                      onClick={connectWallet}
                    >
                      <span>Connect Stellar Wallet</span>
                    </button>
                  )
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
