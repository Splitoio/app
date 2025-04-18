"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Loader2,
  Trash2,
  LogOut,
  Minus,
  Save,
  ChevronDown,
  Check,
} from "lucide-react";
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
import {
  getUserWallets,
  addWallet as apiAddWallet,
  updateWallet as apiUpdateWallet,
  removeWallet as apiRemoveWallet,
} from "@/services/walletService";
import { useUpdateUser } from "@/features/user/hooks/use-update-profile";
import { asEnhancedUser } from "@/types/user";

// Define wallet interface
interface Wallet {
  id: string;
  address: string;
  chain: string;
  isPrimary: boolean;
}

// Define the available chains
const CHAINS = ["ETH", "BNB", "SOL", "XLM", "MATIC"];

// Define a type for user update data
interface UserUpdateData {
  name?: string;
  currency?: string;
  preferredChain?: string;
  [key: string]: string | undefined;
}

export default function SettingsPage() {
  const { isAuthenticated, isLoading, user, setUser } = useAuthStore();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { mutate: updateUser } = useUpdateUser();

  // State for user settings
  const [displayName, setDisplayName] = useState<string>("");
  const [preferredCurrency, setPreferredCurrency] = useState<string>("USDT");
  const [initialDisplayName, setInitialDisplayName] = useState<string>("");
  const [initialPreferredCurrency, setInitialPreferredCurrency] =
    useState<string>("USDT");
  const [initialPreferredChain, setInitialPreferredChain] =
    useState<string>("ETH");
  const [preferredChain, setPreferredChain] = useState<string>("ETH");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [selectedChainFilter, setSelectedChainFilter] =
    useState<string>("All Chains");

  // State for wallets
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isLoadingWallets, setIsLoadingWallets] = useState(false);

  // Blockchain chains available
  const blockchainChains = {
    Base: ["ETH", "USDC", "USDT"],
    Stellar: ["XLM"],
  };

  // Check if user has made changes to their profile
  const hasChanges =
    displayName !== initialDisplayName ||
    preferredCurrency !== initialPreferredCurrency ||
    preferredChain !== initialPreferredChain;

  // Fetch user's wallets from API - wrapped in useCallback
  const fetchUserWallets = useCallback(async () => {
    if (!user?.id) return;

    setIsLoadingWallets(true);
    try {
      const walletsData = await getUserWallets(user.id);
      setWallets(walletsData);
    } catch (error) {
      console.error("Error fetching wallets:", error);
      // Toast notification is handled in the service
    } finally {
      setIsLoadingWallets(false);
    }
  }, [user?.id]);

  // Load user data and wallets
  useEffect(() => {
    if (user) {
      const enhancedUser = asEnhancedUser(user);
      const name = enhancedUser.name || "";
      const currency = enhancedUser.currency || "USDT";
      const chain = enhancedUser.preferredChain || "ETH";

      setDisplayName(name);
      setPreferredCurrency(currency);
      setPreferredChain(chain);

      // Also store initial values for comparison
      setInitialDisplayName(name);
      setInitialPreferredCurrency(currency);
      setInitialPreferredChain(chain);

      // Fetch wallets from API
      fetchUserWallets();
    }
  }, [user, fetchUserWallets]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Handle save changes
  const handleSaveChanges = async () => {
    if (!hasChanges) return;

    setIsSaving(true);

    try {
      // Prepare update data
      const updateData: UserUpdateData = {};

      if (displayName !== initialDisplayName) {
        updateData.name = displayName;
      }

      if (preferredCurrency !== initialPreferredCurrency) {
        updateData.currency = preferredCurrency;
      }

      if (preferredChain !== initialPreferredChain) {
        updateData.preferredChain = preferredChain;
      }

      // Call update API
      updateUser(updateData, {
        onSuccess: () => {
          // Update initial values to match current values
          setInitialDisplayName(displayName);
          setInitialPreferredCurrency(preferredCurrency);
          setInitialPreferredChain(preferredChain);

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
    } finally {
      setIsSaving(false);
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

  // Set a wallet as primary
  const setAsPrimary = async (walletId: string) => {
    if (!user?.id) return;

    try {
      await apiUpdateWallet(user.id, walletId, true);

      // Update local state
      setWallets(
        wallets.map((wallet) => ({
          ...wallet,
          isPrimary: wallet.id === walletId,
        }))
      );

      toast.success("Primary wallet updated");
    } catch (error) {
      console.error("Error setting primary wallet:", error);
      // Toast notification is handled in the service
    }
  };

  // Remove a wallet
  const removeWallet = async (walletId: string) => {
    if (!user?.id) return;

    try {
      const success = await apiRemoveWallet(user.id, walletId);

      if (success) {
        // Update local state
        setWallets(wallets.filter((wallet) => wallet.id !== walletId));
        toast.success("Wallet removed successfully");
      }
    } catch (error) {
      console.error("Error removing wallet:", error);
      // Toast notification is handled in the service
    }
  };

  // Add a new wallet
  const handleAddWallet = async (walletData: Omit<Wallet, "id">) => {
    if (!user?.id) {
      toast.error("User ID is required");
      return;
    }

    setIsAddingWallet(true);

    try {
      // Call API to add wallet
      const newWallet = await apiAddWallet(user.id, walletData);

      // Update local state
      setWallets([...wallets, newWallet]);
      toast.success("Wallet added successfully");
      return newWallet;
    } catch (error) {
      console.error("Error adding wallet:", error);
      // Toast notification is handled in the service
      throw error;
    } finally {
      setIsAddingWallet(false);
    }
  };

  // Handle file upload for profile picture
  const handleImageUpload = () => {
    // This would trigger a file input in a real implementation
    toast.success("Profile picture updated");
  };

  // Filter wallets based on selected chain
  const filteredWallets =
    selectedChainFilter === "All Chains"
      ? wallets
      : wallets.filter((wallet) => wallet.chain === selectedChainFilter);

  // Available currencies
  const currencies = [
    "EUR",
    "GBP",
    "INR",
    "JPY",
    "CAD",
    "AUD",
    "CNY",
    "VND",
    "CHF",
  ];

  // Function to toggle dropdowns
  const toggleDropdown = (dropdown: string) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  // Dropdown animation variants
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
              onClick={handleSaveChanges}
              disabled={!hasChanges || isSaving}
              className={`flex items-center justify-center gap-1 sm:gap-2 rounded-full border text-white h-10 sm:h-12 px-4 sm:px-6 text-mobile-sm sm:text-base font-medium transition-all disabled:cursor-not-allowed ${
                hasChanges
                  ? "bg-black text-black border-white hover:bg-zinc-900"
                  : "bg-transparent border-white/20 text-white/40"
              }`}
            >
              {isSaving ? (
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
              </div>
            </div>

            <label
              htmlFor="profile-upload"
              className="bg-transparent border border-white/20 text-white rounded-full px-6 py-2.5 hover:bg-white/5 transition cursor-pointer"
            >
              Select Image
              <input
                id="profile-upload"
                type="file"
                accept="image/png, image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // In a real implementation, we would upload the file
                    // For now, just show success toast
                    handleImageUpload();
                  }
                }}
              />
            </label>
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

        {/* Preferred Chain */}
        <div className="mb-8">
          <label className="block text-white mb-2">Preferred Chain</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown("chain")}
              className="w-full h-12 bg-black border border-white/20 text-white rounded-lg px-4 
                flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-white/40"
            >
              <span>{preferredChain}</span>
              <ChevronDown
                className={`h-5 w-5 text-white/70 transition-transform duration-200 ${
                  activeDropdown === "chain" ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {activeDropdown === "chain" && (
                <motion.div
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute top-full left-0 right-0 mt-1 bg-[#17171A] rounded-lg py-2 z-10 max-h-[320px] overflow-y-auto shadow-xl border border-white/10"
                >
                  {Object.entries(blockchainChains).map(
                    ([category, chains]) => (
                      <div key={category} className="mb-2 last:mb-0">
                        <div className="px-4 py-1 text-sm text-white/50 font-medium">
                          {category}
                        </div>
                        <div>
                          {chains.map((chain) => (
                            <button
                              key={chain}
                              type="button"
                              className={`w-full px-4 py-2.5 text-left text-white hover:bg-white/5 flex items-center ${
                                chain === preferredChain ? "bg-white/5" : ""
                              }`}
                              onClick={() => {
                                setPreferredChain(chain);
                                setActiveDropdown(null);
                              }}
                            >
                              <div
                                className={`w-5 h-5 flex items-center justify-center rounded-md border ${
                                  chain === preferredChain
                                    ? "border-white bg-white"
                                    : "border-white/30 bg-transparent"
                                } mr-3`}
                              >
                                {chain === preferredChain && (
                                  <Check className="h-3.5 w-3.5 text-black" />
                                )}
                              </div>
                              <span className="font-medium">{chain}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Preferred Currency */}
        <div className="mb-8">
          <label className="block text-white mb-2">Preferred Currency</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown("currency")}
              className="w-full h-12 bg-black border border-white/20 text-white rounded-lg px-4 
                flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-white/40"
            >
              <span>{preferredCurrency}</span>
              <ChevronDown
                className={`h-5 w-5 text-white/70 transition-transform duration-200 ${
                  activeDropdown === "currency" ? "rotate-180" : ""
                }`}
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
                  <div>
                    {currencies.map((currency) => (
                      <button
                        key={currency}
                        type="button"
                        className={`w-full px-4 py-2.5 text-left text-white hover:bg-white/5 flex items-center ${
                          currency === preferredCurrency ? "bg-white/5" : ""
                        }`}
                        onClick={() => {
                          setPreferredCurrency(currency);
                          setActiveDropdown(null);
                        }}
                      >
                        <div
                          className={`w-5 h-5 flex items-center justify-center rounded-md border ${
                            currency === preferredCurrency
                              ? "border-white bg-white"
                              : "border-white/30 bg-transparent"
                          } mr-3`}
                        >
                          {currency === preferredCurrency && (
                            <Check className="h-3.5 w-3.5 text-black" />
                          )}
                        </div>
                        <span className="font-medium">{currency}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

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

          <div className="mt-2 mb-6">
            <Select
              value={selectedChainFilter}
              onValueChange={setSelectedChainFilter}
            >
              <SelectTrigger className="w-full bg-black border border-white/20 text-white h-12 rounded-full focus:ring-1 focus:ring-white/40">
                <SelectValue placeholder="All Chains" />
              </SelectTrigger>
              <SelectContent className="bg-[#101012] border border-white/10 p-2 rounded-xl shadow-xl w-[var(--radix-select-trigger-width)]">
                <SelectItem
                  value="All Chains"
                  className="text-white hover:bg-white/90 rounded-lg px-4 py-2.5 my-1 focus:bg-white/90"
                >
                  All Chains
                </SelectItem>
                {CHAINS.map((chain) => (
                  <SelectItem
                    key={chain}
                    value={chain}
                    className="text-white hover:bg-white/90 rounded-lg px-4 py-2.5 my-1 focus:bg-white/90"
                  >
                    {chain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Wallet List */}
          <div className="space-y-6">
            {isLoadingWallets ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-white/50" />
              </div>
            ) : filteredWallets.length > 0 ? (
              filteredWallets.map((wallet) => (
                <div key={wallet.id} className="pb-6 mb-2">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-mono">{wallet.address}</p>
                    {!wallet.isPrimary ? (
                      <div className="flex items-center">
                        <button
                          onClick={() => setAsPrimary(wallet.id)}
                          className="border border-white/80 text-white text-sm rounded-full px-4 py-1.5 hover:bg-white/5 transition"
                        >
                          Set as primary
                        </button>
                        <button
                          onClick={() => removeWallet(wallet.id)}
                          className="text-white/70 p-1.5 rounded-full hover:bg-white/5 transition ml-2"
                        >
                          <Minus className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="text-white/60 text-sm">
                          Primary Wallet
                        </div>
                        <button
                          onClick={() => removeWallet(wallet.id)}
                          className="text-white/70 p-1.5 rounded-full hover:bg-white/5 transition ml-2"
                        >
                          <Minus className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <p className="text-white/60 text-sm">
                      {wallet.chain} {wallet.chain === "ETH" && "(Base)"}
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
        onClose={() => setIsWalletModalOpen(false)}
        onAddWallet={handleAddWallet}
      />
    </motion.div>
  );
}
