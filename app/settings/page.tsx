"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signOut } from "@/lib/auth";
import { useUpdateUser } from "@/features/user/hooks/use-update-profile";
import { asEnhancedUser } from "@/types/user";
import { useGetAllCurrencies } from "@/features/currencies/hooks/use-currencies";
import {
  useUserWallets,
  useAddWallet,
  useSetWalletAsPrimary,
  useRemoveWallet,
} from "@/features/wallets/hooks/use-wallets";
import { SettingsPageContent } from "@/app/settings/settings-page-content";
import { useGetAllGroups } from "@/features/groups/hooks/use-create-group";
import { useGetFriends } from "@/features/friends/hooks/use-get-friends";

// Base API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface UserUpdateData {
  name?: string;
  currency?: string;
  [key: string]: string | undefined;
}

export default function SettingsPage() {
  const { isAuthenticated, isLoading, user, setUser } = useAuthStore();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { mutate: updateUser, isPending: isUpdatatingUser } = useUpdateUser();

  // State for user settings
  const [displayName, setDisplayName] = useState<string>("");
  const [preferredCurrency, setPreferredCurrency] = useState<string>("");
  const [initialDisplayName, setInitialDisplayName] = useState<string>("");
  const [initialPreferredCurrency, setInitialPreferredCurrency] =
    useState<string>("");

  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);

  // State for wallets
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  // State for wallet removal confirmation
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [walletToRemove, setWalletToRemove] = useState<string | null>(null);

  // Use TanStack Query for API calls
  const { data: currencyData, isLoading: isLoadingCurrencies } =
    useGetAllCurrencies();

  // Use our wallet hooks
  const { data: walletData, isLoading: isLoadingWallets } = useUserWallets();
  const { mutate: addWallet, isPending: isAddingWallet } = useAddWallet();
  const { mutate: setWalletAsPrimary } = useSetWalletAsPrimary();
  const { mutate: removeWallet, isPending: isRemovingWallet } =
    useRemoveWallet();

  // Guard against infinite loop if API fails
  const autoSetPrimaryAttempted = React.useRef<string | null>(null);

  // Process wallet data for UI
  const wallets = walletData?.accounts || [];

  // Get all currencies from the API response and filter out ETH and USDC
  const allCurrencies = currencyData?.currencies || [];
  const currencies = allCurrencies.filter(
    (currency) => currency.symbol !== "ETH" && currency.symbol !== "USDC"
  );

  // Check if user has made changes to their profile
  const hasChanges =
    displayName !== initialDisplayName ||
    preferredCurrency !== initialPreferredCurrency;

  // Platform default currency from locale (e.g. en-US -> USD, en-GB -> GBP)
  const getPlatformDefaultCurrency = (): string => {
    if (typeof navigator === "undefined") return "USD";
    try {
      const locale = navigator.language || "en-US";
      const region = locale.split("-")[1] || locale.split("-")[0];
      const map: Record<string, string> = {
        US: "USD",
        GB: "GBP",
        IN: "INR",
        JP: "JPY",
        CN: "CNY",
        AU: "AUD",
        CA: "CAD",
        CH: "CHF",
        EU: "EUR",
      };
      return map[region] || "USD";
    } catch {
      return "USD";
    }
  };

  // Load user data when available; use platform default currency when user has none set
  useEffect(() => {
    if (user) {
      const enhancedUser = asEnhancedUser(user);
      const name = enhancedUser.name || "";
      const currency = enhancedUser.currency || getPlatformDefaultCurrency();

      setDisplayName(name);
      setPreferredCurrency(currency);

      // Also store initial values for comparison
      setInitialDisplayName(name);
      setInitialPreferredCurrency(currency);
    }
  }, [user]);

  // useEffect(() => {
  //   if (!isLoading && !isAuthenticated) {
  //     router.push("/login");
  //   }
  // }, [isLoading, isAuthenticated, router]);

  // Handle save changes
  const handleSaveChanges = async () => {
    if (!hasChanges) return;

    try {
      // Prepare update data
      const updateData: UserUpdateData = {};

      if (displayName !== initialDisplayName) {
        updateData.name = displayName;
      }

      if (preferredCurrency !== initialPreferredCurrency) {
        updateData.currency = preferredCurrency;
      }

      // Call update API
      updateUser(updateData, {
        onSuccess: () => {
          setInitialDisplayName(displayName);
          setInitialPreferredCurrency(preferredCurrency);
          // Update auth store so default currency (and name) apply app-wide immediately
          if (user) {
            setUser({
              ...user,
              ...(updateData.name !== undefined && { name: updateData.name }),
              ...(updateData.currency !== undefined && { currency: updateData.currency }),
            });
          }
          toast.success("Profile updated successfully");
        },
        onError: (error) => {
          toast.error("Failed to update profile");
          console.error("Error updating profile:", error);
        },
      });
    } catch (error) {
      toast.error("Failed to update profile");
      console.error("Error updating profile:", error);
    }
  };

  // Auto-save currency change immediately (no save button needed for dropdown)
  const handleCurrencyChange = (newCurrency: string) => {
    if (!newCurrency || newCurrency === initialPreferredCurrency) return;
    setPreferredCurrency(newCurrency);
    updateUser({ currency: newCurrency }, {
      onSuccess: () => {
        setInitialPreferredCurrency(newCurrency);
        if (user) {
          setUser({ ...user, currency: newCurrency });
        }
        toast.success("Currency updated");
      },
      onError: (error) => {
        toast.error("Failed to update currency");
        console.error("Error updating currency:", error);
        setPreferredCurrency(initialPreferredCurrency); // revert on error
      },
    });
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      // Clear the user from the store
      setUser(null);
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to log out. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Set a wallet as primary using the mutation hook
  const handleSetAsPrimary = (walletId: string) => {
    const walletToUpdate = wallets.find((w) => w.id === walletId);
    if (!walletToUpdate) return;

    setWalletAsPrimary({
      chainId: walletToUpdate.chainId,
      address: walletToUpdate.address,
    });
  };

  // Auto-set single wallet as primary
  useEffect(() => {
    if (wallets.length === 1 && !wallets[0].isDefault) {
      if (autoSetPrimaryAttempted.current !== wallets[0].id) {
        autoSetPrimaryAttempted.current = wallets[0].id;
        handleSetAsPrimary(wallets[0].id);
      }
    } else if (wallets.length > 1 || wallets.length === 0) {
      autoSetPrimaryAttempted.current = null;
    }
  }, [wallets, handleSetAsPrimary]);

  // Remove a wallet using the mutation hook
  const handleRemoveWallet = (walletId: string) => {
    setWalletToRemove(walletId);
    setIsRemoveConfirmOpen(true);
  };

  // Confirm wallet removal
  const confirmRemoveWallet = () => {
    if (walletToRemove) {
      removeWallet(walletToRemove);
      setIsRemoveConfirmOpen(false);
      setWalletToRemove(null);
    }
  };

  // Cancel wallet removal
  const cancelRemoveWallet = () => {
    setIsRemoveConfirmOpen(false);
    setWalletToRemove(null);
  };

  // Handle file upload for profile picture
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    try {
      setIsUploadingImage(true);
      setUploadProgress(0);
      setUploadError("");

      // Step 1: Get a presigned upload URL from the backend
      const response = await fetch(`${API_URL}/api/files/upload-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          fileType: file.type,
          fileName: file.name,
          folder: "profile-pictures",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl, filePath, downloadUrl } = await response.json();

      // Step 2: Upload the file directly to storage with progress tracking
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round(
            (event.loaded / event.total) * 100
          );
          setUploadProgress(percentComplete);
        }
      };

      await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response);
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(file);
      });

      // Step 3: Update the user profile with the new image URL
      const updateData = {
        image: downloadUrl,
      };

      updateUser(updateData, {
        onSuccess: () => {
          toast.success("Profile picture updated successfully");
        },
        onError: (error) => {
          console.error("Error updating profile picture:", error);
          toast.error("Failed to update profile picture");
        },
      });
    } catch (error) {
      console.error("Image upload error:", error);
      setUploadError(
        error instanceof Error ? error.message : "Failed to upload image"
      );
      toast.error("Failed to upload profile picture");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const { data: allGroups = [] } = useGetAllGroups({ type: "PERSONAL" });
  const { data: allFriends = [] } = useGetFriends();

  // Get chain name from currency list
  const getChainName = (chainId: string) => {
    const currency = currencies.find((c) => c.chainId === chainId);
    return currency ? currency.name : chainId;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-white/50" />
          <p className="text-white/70 text-lg">Loading your profile...</p>
        </div>
      </div>
    );
  } else   if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-white/70 text-lg">
          You need to be logged in to view this page. Redirecting...
        </div>
      </div>
    );
  }

  return React.createElement(SettingsPageContent, {
    user,
    displayName,
    setDisplayName,
    preferredCurrency,
    setPreferredCurrency,
    onCurrencyChange: handleCurrencyChange,
    hasChanges,
    handleSaveChanges,
    isUpdatatingUser,
    wallets,
    handleRemoveWallet,
    handleSetAsPrimary,
    getChainName,
    isAddingWallet,
    isWalletModalOpen,
    setIsWalletModalOpen,
    isRemovingWallet,
    isRemoveConfirmOpen,
    confirmRemoveWallet,
    cancelRemoveWallet,
    isUploadingImage,
    uploadProgress,
    uploadError,
    handleImageUpload,
    selectedCurrencies,
    setSelectedCurrencies,
    isLoadingWallets,
    onLogout: handleLogout,
    isLoggingOut: isLoggingOut,
    groupCount: allGroups.length,
    friendCount: Array.isArray(allFriends) ? allFriends.length : 0,
    settledCount: Array.isArray(allFriends)
      ? allFriends.filter((f) => !f.balances?.some((b) => b.amount !== 0)).length
      : 0,
  });
}
