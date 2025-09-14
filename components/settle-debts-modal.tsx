"use client";

import { X, Loader2, ChevronDown, MinusCircle } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeIn, scaleIn } from "@/utils/animations";
import { toast } from "sonner";
import Image from "next/image";
import { GroupBalance, User } from "@/api-helpers/modelSchema";
import { useSettleDebt } from "@/features/settle/hooks/use-splits";
import { useHandleEscapeToCloseModal } from "@/hooks/useHandleEscape";
import { useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/constants";
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

// Define a type for friend data coming from the API
interface FriendWithBalances {
  id: string;
  name: string;
  email: string;
  image: string | null;
  balances: Array<{ currency: string; amount: number }>;
  stellarAccount?: string | null;
}

interface SettleDebtsModalProps {
  isOpen: boolean;
  onClose: () => void;
  balances?: GroupBalance[];
  groupId?: string;
  members?: User[];
  showIndividualView?: boolean;
  selectedFriendId?: string | null;
  defaultCurrency?: string; // <-- add this
  specificAmount?: number; // Add specific amount for individual debt settlement
  specificDebtByCurrency?: Record<string, number>; // Add currency-specific debt info
}

export function SettleDebtsModal({
  isOpen,
  onClose,
  balances = [],
  groupId = "",
  members = [],
  showIndividualView = false,
  selectedFriendId = null,
  defaultCurrency,
  specificAmount, // Add this parameter
  specificDebtByCurrency, // Add currency-specific debt info
}: SettleDebtsModalProps) {
  const user = useAuthStore((state) => state.user);
  const {
    isConnected: walletConnected,
    isConnecting,
    connectWallet,
    wallet,
    aptosWallet,
    address,
    walletType,
  } = useWallet();
  const [selectedToken, setSelectedToken] = useState<TokenOption | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [excludedFriendIds, setExcludedFriendIds] = useState<string[]>([]);
  const [totalAmount, setTotalAmount] = useState("0");
  const [individualAmount, setIndividualAmount] = useState("0");
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const [availableChainsForToken, setAvailableChainsForToken] = useState<string[]>([]);
  const [debtCurrency, setDebtCurrency] = useState<string>("USD"); // Currency of the debt
  const [fiatAmount, setFiatAmount] = useState("0"); // Original fiat amount
  const [tokenAmount, setTokenAmount] = useState("0"); // Converted token amount
  const [multiCurrencyDebts, setMultiCurrencyDebts] = useState<Array<{currency: string, amount: number, tokenAmount: number}>>([]);
  const [totalTokenAmount, setTotalTokenAmount] = useState("0"); // Total token amount for all currencies

  const settleDebtMutation = useSettleDebt(groupId);
  const queryClient = useQueryClient();
  const { data: friends } = useGetFriends();
  const { data: groups } = useGetAllGroups();
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
    const total = Object.entries(balancesData).reduce((total, [currency, amount]) => {
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
      .filter(([currency, amount]) => amount > 0)
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

  // Multi-currency pricing for group settlements
  const groupBalancesObj = balances && typeof balances === 'object' && !Array.isArray(balances) 
    ? balances as Record<string, number>
    : balances && Array.isArray(balances) && user
    ? transformGroupBalancesToCurrencyMap(balances as GroupBalance[], user.id)
    : {};

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
    const fiatCurrency = organizedCurrencies.fiatCurrencies?.find((c: any) => c.id === currencyId);
    if (fiatCurrency) return fiatCurrency.symbol;
    
    // Check chain groups for crypto currencies
    for (const chainGroup of Object.values(organizedCurrencies.chainGroups || {})) {
      const cryptoCurrency = chainGroup.find((c: any) => c.id === currencyId);
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

  // Set the selected user based on selectedFriendId prop
  useEffect(() => {
    if (selectedFriendId && friends) {
      const friend = friends.find((friend: any) => friend.id === selectedFriendId);
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
  }, [balanceData, balances, groupId]); // Removed friends dependency

  // Fetch available tokens
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
  }, [selectedUser, specificAmount, specificDebtByCurrency]); // Updated dependencies

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
        const pricingEntry = multiCurrencyPricing?.find((p: any) => p.currency === debt.currency);
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
  const toggleExcludeFriend = (friendId: string) => {
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
  const isWalletConnectedForChain = () => {
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
    const result = {
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
      onError: (err) => {
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
  const hasDebtsToSettle = Object.values(selectedUserDebtByCurrency).some(amount => amount !== 0);

  // Calculate the remaining total after exclusions
  const remainingTotal = calculateRemainingTotal();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 h-screen w-screen"
          {...fadeIn}
        >
          <motion.div
            className="fixed inset-0 bg-black/70 brightness-50"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full md:w-[90%] max-w-[600px] px-4 sm:px-0">
            {/* Settle All Debts Section - Only shown when header button is clicked */}
            {!showIndividualView && (
              <motion.div
                className="relative z-10 rounded-[24px] bg-black p-5 sm:p-8 border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                {...scaleIn}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="mb-1 text-xs sm:text-sm text-white/60">
                      Settle All Debt
                    </div>
                    <h2 className="text-xl sm:text-3xl font-semibold text-white">
                      Settle All Debts
                    </h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-white/[0.03] transition-colors"
                  >
                    <X className="h-5 w-5 text-white/60" />
                  </button>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  {/* Show user's stored Stellar address */}
                  {userStellarAddress ? (
                    <div className="text-sm text-white/70">
                      Using address: {userStellarAddress.slice(0, 25)}...
                    </div>
                  ) : (
                    <div className="text-sm text-red-400">
                      Please add your Stellar wallet address in settings first.
                    </div>
                  )}

                  <div>
                    <div className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">
                      Choose Payment Token
                    </div>

                    <div className="relative mb-3 sm:mb-4">
                      <button className="w-full flex items-center justify-between rounded-full h-12 sm:h-14 px-4 sm:px-6 bg-transparent border border-white/10 text-white">
                        <span className="text-base sm:text-lg">
                          {selectedToken?.symbol || "Token"}
                        </span>
                        <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-white/50" />
                      </button>
                    </div>

                    {availableChainsForToken.length > 1 && (
                      <div className="mb-3 sm:mb-4">
                        <label className="block text-white mb-1">Select Chain</label>
                        <select
                          value={selectedChain || ''}
                          onChange={e => setSelectedChain(e.target.value)}
                          className="w-full rounded px-3 py-2 bg-black border border-white/10 text-white"
                        >
                          {availableChainsForToken.map(chain => (
                            <option key={chain} value={chain}>
                              {chain.charAt(0).toUpperCase() + chain.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="relative">
                      <div className="w-full flex items-center justify-between rounded-full h-12 sm:h-14 px-4 sm:px-6 bg-transparent border border-white/10 text-white">
                        <input
                          type="text"
                          value={multiCurrencyDebts.length > 0 ? totalTokenAmount : remainingTotal.toFixed(2)}
                          onChange={(e) => setTotalAmount(e.target.value)}
                          className="bg-transparent outline-none text-base sm:text-lg w-full"
                          readOnly={multiCurrencyDebts.length > 0}
                        />
                        <span className="text-base sm:text-lg text-white/50">
                          {selectedToken?.symbol || "Token"}
                        </span>
                      </div>
                      
                      {/* Multi-currency breakdown display - show for both group and individual view */}
                      {multiCurrencyDebts.length > 0 && (
                        <div className="mt-3 p-3 bg-white/5 rounded-lg">
                          <div className="text-sm text-white/70 mb-2">Settlement Breakdown:</div>
                          {multiCurrencyDebts.map((debt, index) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                              <span className="text-white/80">
                                {formatCurrency(debt.amount, debt.currency)} worth {selectedToken?.symbol}
                              </span>
                              <span className="text-white/60">
                                {debt.tokenAmount.toFixed(6)} {selectedToken?.symbol}
                              </span>
                            </div>
                          ))}
                          <div className="border-t border-white/10 mt-2 pt-2">
                            <div className="flex justify-between items-center text-sm font-medium">
                              <span className="text-white">Total:</span>
                              <span className="text-white">
                                {totalTokenAmount} {selectedToken?.symbol}
                              </span>
                            </div>
                          </div>
                          {isLoadingMultiCurrency && (
                            <div className="text-xs text-yellow-400 mt-1">
                              Calculating conversion rates...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-5 max-h-[200px] sm:max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {/* Group debt breakdown - show when in group context */}
                    {groupDebtBreakdown.length > 0 ? (
                      <>
                        <div className="text-white/70 text-sm mb-3">Debts to settle:</div>
                        {groupDebtBreakdown.map((debt, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3 sm:gap-4">
                              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-white/10 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs sm:text-sm font-medium">
                                  {getCurrencySymbol(debt.currency)}
                                </span>
                              </div>
                              <div>
                                <p className="text-mobile-base sm:text-lg text-white font-medium">
                                  {debt.currency}
                                </p>
                                <p className="text-mobile-sm sm:text-base text-white/60">
                                  You owe{" "}
                                  <span className="text-[#FF4444]">
                                    {formatCurrency(debt.amount, debt.currency)}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      /* COMMENTED OUT: Friend-based debt list - focusing only on group balances */
                      <div className="text-center text-white/60 py-4 text-mobile-sm sm:text-base">
                        Individual friend debt settlement has been disabled. Please use group-specific debt settlement.
                      </div>
                    )}
                  </div>
                </div>

                {/* Show wallet connection component for any chain if not connected */}
                {!canProceedWithSettlement() && (
                  <div className="mb-6">
                    {selectedChain === 'aptos' && <ShadcnWalletSelector />}
                  </div>
                )}

                {canProceedWithSettlement() ? (
                  <button
                    className="w-full mt-8 sm:mt-12 flex items-center justify-center gap-2 text-mobile-base sm:text-lg font-medium h-10 sm:h-14 bg-white text-black rounded-full hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => {
                      console.log("[SettleDebtsModal] Settle All button clicked", { 
                        isPending, 
                        remainingTotal, 
                        // COMMENTED OUT: friendsWithDebtsLength: friendsWithDebts.length - focus only on group debts
                        multiCurrencyDebts: multiCurrencyDebts.length > 0 ? multiCurrencyDebts : 'empty',
                        totalTokenAmount,
                        groupDebtBreakdown: groupDebtBreakdown.length > 0 ? groupDebtBreakdown : 'empty'
                      });
                      handleSettleAll();
                    }}
                    disabled={
                      isPending ||
                      remainingTotal <= 0 ||
                      (groupDebtBreakdown.length === 0) // COMMENTED OUT: && friendsWithDebts.length === 0 - focus only on group debts
                    }
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                        <span>Settling payment...</span>
                      </>
                    ) : (
                      <>
                        <Image
                          src="/coins-dollar.svg"
                          alt="Settle Payment"
                          width={24}
                          height={24}
                          className="invert h-4 w-4 sm:h-5 sm:w-5"
                        />
                        <span>Settle Payment</span>
                      </>
                    )}
                  </button>
                ) : (
                  selectedChain === 'stellar' && (
                    <button
                      className="w-full mt-8 sm:mt-12 flex items-center justify-center gap-2 text-sm font-medium h-10 sm:h-12 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
                      onClick={connectWallet}
                    >
                      <span>Connect Stellar Wallet</span>
                    </button>
                  )
                )}
                
                {/* Show appropriate wallet connection message */}
                {selectedChain === 'aptos' && !isWalletConnectedForChain() && (
                  <div className="text-sm text-amber-400 mt-2 text-center">
                    Please connect your Aptos wallet to continue
                  </div>
                )}
                {selectedChain === 'stellar' && !getUserWalletAddress() && (
                  <div className="text-sm text-red-400 mt-2 text-center">
                    Please connect your Stellar wallet or add your Stellar wallet address in settings first.
                  </div>
                )}
              </motion.div>
            )}

            {/* Settle Individual Debt Section - Only shown when a friend's button is clicked */}
            {showIndividualView && (
              <motion.div
                className="relative z-10 rounded-[24px] bg-black p-5 sm:p-8 border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                {...scaleIn}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="mb-1 text-xs sm:text-sm text-white/60">
                      Settle Individual Debt
                    </div>
                    <h2 className="text-xl sm:text-3xl font-semibold text-white">
                      {selectedUser
                        ? `Settle ${selectedUser.name}'s Debts`
                        : "Settle Individual Debt"}
                    </h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-white/[0.03] transition-colors"
                  >
                    <X className="h-5 w-5 text-white/60" />
                  </button>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <div className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">
                      Choose Payment Token
                    </div>

                    <div className="relative mb-3 sm:mb-4">
                      <ResolverSelector
                        value={selectedToken || undefined}
                        onChange={(option) => setSelectedToken(option || null)}
                      />
                    </div>

                    {availableChainsForToken.length > 1 && (
                      <div className="mb-3 sm:mb-4">
                        <label className="block text-white mb-1">Select Chain</label>
                        <select
                          value={selectedChain || ''}
                          onChange={e => setSelectedChain(e.target.value)}
                          className="w-full rounded px-3 py-2 bg-black border border-white/10 text-white"
                        >
                          {availableChainsForToken.map(chain => (
                            <option key={chain} value={chain}>
                              {chain.charAt(0).toUpperCase() + chain.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="relative space-y-3">
                      {/* Token Amount to Send - Merged with debt amount functionality */}
                      {selectedToken && (
                        <div>
                          <label className="block text-white mb-2 text-sm">
                            Token Amount to Send {(isLoadingTokenPrice || isLoadingRate || isLoadingMultiCurrency) && "(Converting...)"}
                          </label>
                          <div className="w-full flex items-center justify-between rounded-full h-12 sm:h-14 px-4 sm:px-6 bg-transparent border border-white/10 text-white">
                            <input
                              type="text"
                              value={multiCurrencyDebts.length > 0 ? totalTokenAmount : (tokenAmount || fiatAmount)}
                              onChange={(e) => {
                                if (multiCurrencyDebts.length === 0) {
                                  setFiatAmount(e.target.value);
                                  setIndividualAmount(e.target.value); // Keep for compatibility
                                }
                              }}
                              className="bg-transparent outline-none text-base sm:text-lg w-full"
                              placeholder="0.00"
                              readOnly={multiCurrencyDebts.length > 0 || (isLoadingTokenPrice || isLoadingRate || isLoadingMultiCurrency)}
                            />
                            <span className="text-base sm:text-lg text-white/50">
                              {selectedToken?.symbol || "Token"}
                            </span>
                          </div>
                          
                          {/* Conversion Breakdown Dropdown */}
                          {multiCurrencyDebts.length > 0 && (
                            <details className="mt-3 group">
                              <summary className="cursor-pointer text-sm text-white/70 hover:text-white transition-colors flex items-center gap-2 list-none [&::-webkit-details-marker]:hidden">
                                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
                                Conversion Breakdown
                              </summary>
                              <div className="mt-2 p-3 bg-white/5 rounded-lg">
                                {multiCurrencyDebts.map((debt, index) => (
                                  <div key={index} className="flex justify-between items-center text-sm py-1">
                                    <span className="text-white/80">
                                      {formatCurrency(debt.amount, debt.currency)}
                                    </span>
                                    <span className="text-white/60">
                                      {debt.tokenAmount.toFixed(6)} {selectedToken?.symbol}
                                    </span>
                                  </div>
                                ))}
                                <div className="border-t border-white/20 mt-2 pt-2">
                                  <div className="flex justify-between items-center text-sm font-medium">
                                    <span className="text-white">Total:</span>
                                    <span className="text-white">
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
                    <div className="text-center text-white/60 py-4 text-mobile-sm sm:text-base">
                      Select a user to settle individual debt
                    </div>
                  )}

                  {selectedUser && (
                    <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 rounded-xl">
                      <div className="h-10 w-10 sm:h-14 sm:w-14 overflow-hidden rounded-full">
                        <Image
                          src={
                            selectedUser.image ||
                            `https://api.dicebear.com/9.x/identicon/svg?seed=${selectedUser.id}`
                          }
                          alt={selectedUser.name || "User"}
                          width={56}
                          height={56}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            // Fallback to dicebear
                            const target = e.target as HTMLImageElement;
                            target.src = `https://api.dicebear.com/9.x/identicon/svg?seed=${selectedUser.id}`;
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-mobile-base sm:text-xl text-white font-medium">
                          {selectedUser.name}
                        </p>
                        <p className="text-mobile-sm sm:text-base text-white/60">
                          You owe{" "}
                          {(() => {
                            console.log('Display logic check:', {
                              multiCurrencyDebts: multiCurrencyDebts,
                              multiCurrencyDebtsLength: multiCurrencyDebts.length,
                              selectedUserBalance,
                              defaultCurrency,
                              groupDebtCurrencies,
                              showIndividualView
                            });
                            
                            return multiCurrencyDebts.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {multiCurrencyDebts.map((debt, idx) => (
                                  <span key={idx} className="text-[#FF4444]">
                                    {formatCurrency(debt.amount, debt.currency)}
                                    {idx < multiCurrencyDebts.length - 1 && ", "}
                                  </span>
                                ))}
                                <span className="text-white/60 ml-1">
                                  worth {totalTokenAmount} {selectedToken?.symbol || "tokens"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[#FF4444]">
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
                  <div className="mb-6">
                    {selectedChain === 'aptos' && <ShadcnWalletSelector />}
                  </div>
                )}

                {canProceedWithSettlement() ? (
                  <button
                    className="w-full mt-8 sm:mt-12 flex items-center justify-center gap-2 text-mobile-base sm:text-lg font-medium h-10 sm:h-14 bg-white text-black rounded-full hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                        <span>Settling payment...</span>
                      </>
                    ) : (
                      <>
                        <Image
                          src="/coins-dollar.svg"
                          alt="Settle Payment"
                          width={24}
                          height={24}
                          className="invert h-4 w-4 sm:h-5 sm:w-5"
                        />
                        <span>Settle Payment</span>
                      </>
                    )}
                  </button>
                ) : (
                  selectedChain === 'stellar' && (
                    <button
                      className="text-white transition-colors text-base flex items-center justify-center gap-2 w-full bg-transparent border py-3 rounded-full mt-2 border-white/40 hover:bg-white/10"
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
