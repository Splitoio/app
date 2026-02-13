"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2, Trash2, LogOut, Save, Info } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { fadeIn } from "@/utils/animations";
import { toast } from "sonner";
import { signOut } from "@/lib/auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddWalletModal } from "@/components/add-wallet-modal";
import { useUpdateUser } from "@/features/user/hooks/use-update-profile";
import { asEnhancedUser } from "@/types/user";
import {
  useGetAllCurrencies,
  useOrganizedCurrencies,
} from "@/features/currencies/hooks/use-currencies";
import type { Currency } from "@/features/currencies/api/client";
import {
  useUserWallets,
  useAddWallet,
  useSetWalletAsPrimary,
  useRemoveWallet,
} from "@/features/wallets/hooks/use-wallets";
import CurrencyDropdown from "@/components/currency-dropdown";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getUser } from "@/features/user/api/client";
import { Button } from "@/components/ui/button";

// Base API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface UserUpdateData {
  name?: string;
  preferredCurrency?: string;
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
        updateData.preferredCurrency = preferredCurrency;
      }

      // Call update API
      updateUser(updateData, {
        onSuccess: () => {
          // Update initial values to match current values
          setInitialDisplayName(displayName);
          setInitialPreferredCurrency(preferredCurrency);

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
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-white/70 text-lg">
          You need to be logged in to view this page. Redirecting...
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className="flex w-full min-h-screen bg-black rounded-xl"
    >
      <div className="w-[750px] pl-10 pt-10 pr-4 pb-24">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-white">Settings</h1>
          <div className="flex gap-3">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center justify-center gap-1 sm:gap-2 rounded-full bg-transparent border border-white/20 text-white h-10 sm:h-12 px-4 sm:px-6 text-mobile-sm sm:text-base font-medium hover:bg-white/5 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  <span>Logging out...</span>
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Logout</span>
                </>
              )}
            </button>
          </div>
        </div>
        {/* Profile Photo Upload */}
        <div className="mb-8">
          <p className="text-white mb-3">Upload your PFP</p>
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-[100px] h-[100px] rounded-full border border-dashed border-white/30 flex items-center justify-center overflow-hidden">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt="Profile"
                    width={100}
                    height={100}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-xs text-white/60 text-center p-2">
                    PNGs, JPGs
                  </div>
                )}
                {isUploadingImage && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-white mb-2" />
                    <span className="text-xs text-white">
                      {uploadProgress}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <label
                htmlFor="profile-upload"
                className={`bg-transparent border border-white/20 text-white rounded-full px-6 py-2.5 hover:bg-white/5 transition cursor-pointer ${
                  isUploadingImage ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isUploadingImage ? "Uploading..." : "Select Image"}
                <input
                  id="profile-upload"
                  type="file"
                  accept="image/png, image/jpeg"
                  className="hidden"
                  disabled={isUploadingImage}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImageUpload(file);
                    }
                  }}
                />
              </label>
              {uploadError && (
                <p className="text-red-500 text-xs mt-2">{uploadError}</p>
              )}
            </div>
          </div>
        </div>
        {/* Display Name */}
        <div className="mb-8">
          <label htmlFor="display-name" className="block text-white mb-2">
            Display Name
          </label>
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-black border border-white/20 text-white p-3 rounded-lg h-12 focus:outline-none focus:ring-1 focus:ring-white/40"
            placeholder="Enter your name"
          />
        </div>
        <div className="mb-8">
          <label className="text-white mb-2 flex items-center gap-2">
            Accept Payments in
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-white/80" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Select the tokens you want to accept payments in</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </label>

          {wallets.length > 0 ? (
            <CurrencyDropdown
              selectedCurrencies={selectedCurrencies}
              setSelectedCurrencies={setSelectedCurrencies}
              filterCurrencies={(currency: Currency) =>
                currency.symbol !== "ETH" &&
                currency.symbol !== "USDC" &&
                wallets.some((wallet) => wallet.chainId === currency.chainId)
              }
              showFiatCurrencies={false}
            />
          ) : (
            <div className="text-white/50 text-sm">
              You don't have any wallets yet. Add one to get started.
            </div>
          )}
        </div>
        {/* Preferred Currency - Single Dropdown */}
        <div className="mb-8">
          <label className="text-white mb-2 flex items-center gap-2">
            Platform Default Currency
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-white/80" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Currencies will be converted to this currency for Display
                    purposes
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </label>
          <CurrencyDropdown
            selectedCurrencies={preferredCurrency ? [preferredCurrency] : []}
            setSelectedCurrencies={(currencies) =>
              setPreferredCurrency(currencies[0] || "")
            }
            mode="single"
            showFiatCurrencies={true}
            filterCurrencies={(currency: Currency) =>
              currency.symbol !== "ETH" && currency.symbol !== "USDC"
            }
            disableChainCurrencies={true}
          />
        </div>

        {hasChanges && (
          <button
            onClick={handleSaveChanges}
            disabled={isUpdatatingUser}
            className={`flex w-full items-center justify-center gap-1 sm:gap-2 rounded-full border text-white h-10 sm:h-12 px-4 sm:px-6 text-mobile-sm sm:text-base font-medium transition-all disabled:cursor-not-allowed ${
              !isUpdatatingUser
                ? "bg-black text-black border-white hover:bg-zinc-900"
                : "bg-transparent border-white/20 text-white/40"
            }`}
          >
            {isUpdatatingUser ? (
              <>
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        )}
        {/* Divider Line */}
        <div className="h-px w-full bg-white/10 my-8"></div>
        {/* Wallet Management */}
        <div className="mb-8">
          <button
            onClick={() => setIsWalletModalOpen(true)}
            disabled={isAddingWallet}
            className="w-full flex items-center justify-center h-10 sm:h-12 gap-1 sm:gap-2 bg-white text-black rounded-full px-4 sm:px-6 text-mobile-sm sm:text-base font-medium hover:bg-white/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isAddingWallet ? (
              <>
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                <span>Adding Wallet...</span>
              </>
            ) : (
              <span>Add Wallet</span>
            )}
          </button>

          {/* Wallet List */}
          <div className="space-y-6 pt-6">
            <h2 className="text-white text-2lg font-semibold ">Your Wallets</h2>
            {isLoadingWallets ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-white/50" />
              </div>
            ) : wallets.length > 0 ? (
              wallets.map((wallet) => (
                <div key={wallet.id} className="pb-6 mb-2">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-mono">
                      {wallet.address.length > 20
                        ? wallet.address.slice(0, 17) +
                          "..." +
                          wallet.address.slice(-4)
                        : wallet.address}
                    </p>
                    {!wallet.isDefault ? (
                      <div className="flex items-center">
                        {/* <button
                          onClick={() => handleSetAsPrimary(wallet.id)}
                          className="border border-white/80 text-white text-sm rounded-full px-4 py-1.5 hover:bg-white/5 transition"
                        >
                          Set as primary
                        </button> */}
                        <button
                          onClick={() => handleRemoveWallet(wallet.id)}
                          disabled={isRemovingWallet}
                          className="text-white/70 p-1.5 rounded-full hover:bg-white/5 transition ml-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isRemovingWallet ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Trash2 className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="text-white/60 text-sm">
                          Primary Wallet
                        </div>
                        <button
                          onClick={() => handleRemoveWallet(wallet.id)}
                          disabled={isRemovingWallet}
                          className="text-white/70 p-1.5 rounded-full hover:bg-white/5 transition ml-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isRemovingWallet ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Trash2 className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <p className="text-white/60 text-sm">
                      {getChainName(wallet.chainId)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-white/50">
                You don't have any wallets yet. Add one to get started.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Wallet Modal */}
      <AddWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => {
          setIsWalletModalOpen(false);
          // Optionally, refetch user wallets or user profile here if needed
          // handleWalletAdded();
        }}
      />

      {/* Remove Wallet Confirmation Modal */}
      <AnimatePresence>
        {isRemoveConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={cancelRemoveWallet}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-[#1A1A1D] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="text-center">
                <h3 className="text-xl font-semibold text-white mb-2">
                  Remove Wallet
                </h3>

                <p className="text-white/70 mb-6">
                  Are you sure you want to remove this wallet? This action
                  cannot be undone.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={cancelRemoveWallet}
                    disabled={isRemovingWallet}
                    className="flex-1 px-4 py-2.5 bg-transparent border border-white/20 text-white rounded-lg hover:bg-white/5 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={confirmRemoveWallet}
                    disabled={isRemovingWallet}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isRemovingWallet ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Removing...
                      </>
                    ) : (
                      "Remove Wallet"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
