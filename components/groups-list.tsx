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
        // amount > 0 = you owe, amount < 0 = owed to you
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
      (Array.isArray((g as { expenses?: { amount: number; currency: string; splitType?: string }[] }).expenses)
        ? (g as { expenses: { amount: number; currency: string; splitType?: string }[] }).expenses
        : []
      )
        .filter((e) => e.splitType !== "SETTLEMENT")
        .map((e) => ({ amount: e.amount, currency: e.currency }))
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
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <p style={{ fontSize: 48, marginBottom: 18 }}>👥</p>
        <p style={{ fontSize: 18, fontWeight: 800, color: T.body, marginBottom: 8 }}>
          No groups yet
        </p>
        <p style={{ fontSize: 14, color: T.sub, marginBottom: 24 }}>
          Create a group to start tracking expenses and settle debts with your friends
        </p>
        <button
          type="button"
          onClick={() =>
            document.dispatchEvent(new CustomEvent("open-create-group-modal"))
          }
          className="inline-flex items-center gap-2 rounded-xl text-[13px] font-extrabold text-[#0a0a0a] transition-opacity hover:opacity-90"
          style={{ background: "#22D3EE", padding: "10px 18px" }}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          New Group
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
  const netBalanceColor = netBalance > 0 ? G : netBalance < 0 ? "#F87171" : T.muted;

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
