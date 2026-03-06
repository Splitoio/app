"use client";

import React from "react";
import { Plus } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getAllGroups } from "@/features/groups/api/client";
import { useQuery } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/constants";
import Cookies from "js-cookie";
import { toast } from "sonner";
import { ApiError } from "@/types/api-error";
import { useDeleteGroup } from "@/features/groups/hooks/use-create-group";
import { useGetAllCurrencies, useConvertedBalanceTotal } from "@/features/currencies/hooks/use-currencies";
import { useAuthStore } from "@/stores/authStore";
import { G, T } from "@/lib/splito-design";
import { GroupsListContent } from "@/components/groups-list-content";

export function GroupsList({ searchQuery = "" }: { searchQuery?: string }) {
  const {
    data: groupsData,
    isLoading: isGroupsLoading,
    error,
  } = useQuery({
    queryKey: [QueryKeys.GROUPS, "PERSONAL"],
    queryFn: () => getAllGroups({ type: "PERSONAL" }),
  });
  const deleteGroupMutation = useDeleteGroup();
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: allCurrencies } = useGetAllCurrencies();
  const defaultCurrency = user?.currency || "USD";

  const filteredGroups = useMemo(() => {
    if (!groupsData) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groupsData;
    return groupsData.filter((g) => g.name.toLowerCase().includes(q));
  }, [groupsData, searchQuery]);

  // Aggregate owe/owed across all groups for net balance
  const { totalOweItems, totalOwedItems } = useMemo(() => {
    if (!user || !groupsData) return { totalOweItems: [] as { amount: number; currency: string }[], totalOwedItems: [] as { amount: number; currency: string }[] };
    const oweItems: { amount: number; currency: string }[] = [];
    const owedItems: { amount: number; currency: string }[] = [];
    groupsData.forEach((group) => {
      const balances = group.groupBalances || [];
      const userBalances = balances.filter((b) => b.userId === user.id);
      const byCurrency: Record<string, number> = {};
      userBalances.forEach((b) => {
        byCurrency[b.currency] = (byCurrency[b.currency] ?? 0) + b.amount;
      });
      Object.entries(byCurrency).forEach(([curr, amount]) => {
        if (amount > 0) oweItems.push({ amount, currency: curr });
        else if (amount < 0) owedItems.push({ amount: Math.abs(amount), currency: curr });
      });
    });
    return { totalOweItems: oweItems, totalOwedItems: owedItems };
  }, [groupsData, user]);

  const { total: totalOwe } = useConvertedBalanceTotal(totalOweItems, defaultCurrency);
  const { total: totalOwed } = useConvertedBalanceTotal(totalOwedItems, defaultCurrency);
  const netBalance = totalOwed - totalOwe;

  // Helper function to get currency symbol from the currencies data
  const getCurrencySymbol = (currencyId: string): string => {
    const currency = allCurrencies?.currencies?.find(c => c.id === currencyId);
    return currency?.symbol || currencyId;
  };

  // Helper function to format currency using actual symbols from API
  const formatCurrency = (amount: number, currencyId: string): string => {
    const symbol = getCurrencySymbol(currencyId);
    // For currencies like JPY, don't show decimals
    const decimals = currencyId === 'JPY' ? 0 : 2;
    return `${symbol}${amount.toFixed(decimals)}`;
  };

  // Total spent across all groups (sum of all expense amounts, converted to default currency)
  const totalSpentItems = useMemo(() => {
    if (!groupsData) return [];
    return groupsData.flatMap((g) =>
      (Array.isArray((g as { expenses?: { amount: number; currency: string }[] }).expenses)
        ? (g as { expenses: { amount: number; currency: string }[] }).expenses
        : []
      ).map((e) => ({ amount: e.amount, currency: e.currency }))
    );
  }, [groupsData]);
  const { total: totalSpent } = useConvertedBalanceTotal(totalSpentItems, defaultCurrency);
  const totalSpentFormatted = formatCurrency(totalSpent, defaultCurrency);

  useEffect(() => {
    if (error) {
      const apiError = error as ApiError;
      const statusCode =
        apiError.response?.status || apiError.status || apiError.code;

      if (statusCode === 401) {
        Cookies.remove("sessionToken");
        router.push("/login");
        toast.error("Session expired. Please log in again.");
      } else if (error) {
        toast.error("An unexpected error occurred.");
      }
    }
  }, [error, router]);

  const [_editingId, setEditingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".group-menu")) {
        setEditingId(null);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const _handleDeleteGroup = (
    e: React.MouseEvent,
    groupId: string,
    groupName: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Show delete modal
    setGroupToDelete({ id: groupId, name: groupName });
    setShowDeleteModal(true);
    setIsDeleting(false);
    setDeleteError(null);
    setDeleteSuccess(false);
  };

  const confirmDelete = () => {
    if (!groupToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    deleteGroupMutation.mutate(groupToDelete.id, {
      onSuccess: () => {
        setIsDeleting(false);
        setDeleteSuccess(true);
        setEditingId(null);
        // We'll close the modal after a short delay
        setTimeout(() => {
          setShowDeleteModal(false);
          setGroupToDelete(null);
          setDeleteSuccess(false);
        }, 1500);
      },
      onError: (error: unknown) => {
        setIsDeleting(false);

        // Cast to a modified error type to handle the API error format
        type ExtendedApiError = ApiError & {
          data?: {
            error?: string;
          };
        };

        const apiError = error as ExtendedApiError;

        if (
          apiError?.message?.includes("non-zero balance") ||
          apiError?.data?.error?.includes("non-zero balance")
        ) {
          setDeleteError(
            "You have unsettled balances in this group. Please clear all dues before deleting."
          );
        } else {
          setDeleteError(apiError?.message || "Failed to delete group");
        }
      },
    });
  };

  if (isGroupsLoading || !groupsData) {
    return (
      <div className="flex items-center justify-center py-8 sm:py-12">
        <div className="text-mobile-base sm:text-base text-white/50">
          Loading groups...
        </div>
      </div>
    );
  }

  if (groupsData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl bg-[#101012] p-6 sm:p-12 min-h-[calc(100vh-160px)] sm:min-h-[calc(100vh-180px)]">
        <div className="text-mobile-lg sm:text-xl text-white/70 mb-3 sm:mb-4">
          No groups created yet
        </div>
        <p className="text-mobile-sm sm:text-base text-white/50 text-center max-w-md mb-6 sm:mb-8">
          Create a group to start tracking expenses and settle debts with your
          friends
        </p>
        <button
          onClick={() =>
            document.dispatchEvent(new CustomEvent("open-create-group-modal"))
          }
          className="flex items-center justify-center gap-2 rounded-full bg-white text-black h-10 sm:h-12 px-4 sm:px-6 text-mobile-base sm:text-base font-medium hover:bg-white/90 transition-all"
        >
          <Plus className="h-4 sm:h-5 w-4 sm:w-5" strokeWidth={1.5} />
          <span>Create Group</span>
        </button>
      </div>
    );
  }

  // Summary stats: net balance formatted (use default currency symbol)
  const netBalanceFormatted = (() => {
    if (netBalance > 0) return formatCurrency(netBalance, defaultCurrency);
    if (netBalance < 0) return `-${formatCurrency(Math.abs(netBalance), defaultCurrency)}`;
    return formatCurrency(0, defaultCurrency);
  })();
  const netBalanceColor = netBalance > 0 ? G : netBalance < 0 ? "#FF4444" : T.muted;

  return React.createElement(GroupsListContent, {
    filteredGroups,
    user,
    defaultCurrency,
    formatCurrency,
    getCurrencySymbol,
    netBalanceFormatted,
    netBalanceColor,
    totalSpentFormatted,
    showDeleteModal,
    setShowDeleteModal,
    groupToDelete,
    setGroupToDelete,
    deleteSuccess,
    deleteError,
    isDeleting,
    confirmDelete,
  });
}
