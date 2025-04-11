"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2, Trash2, LogOut, Minus } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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

// Define wallet interface
interface Wallet {
  id: string;
  address: string;
  chain: string;
  isPrimary: boolean;
}

// Define the available chains
const CHAINS = ["ETH", "BNB", "SOL", "XLM", "MATIC"];

export default function SettingsPage() {
  const { isAuthenticated, isLoading, user, setUser } = useAuthStore();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // State for user settings
  const [displayName, setDisplayName] = useState<string>("");
  const [preferredCurrency, setPreferredCurrency] = useState<string>("USDT");
  const [selectedChainFilter, setSelectedChainFilter] =
    useState<string>("All Chains");

  // State for wallets
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isLoadingWallets, setIsLoadingWallets] = useState(false);

  // Load user data and wallets
  useEffect(() => {
    if (user) {
      setDisplayName(user.name || "");
      setPreferredCurrency(user.currency || "USDT");

      // Fetch wallets from API
      fetchUserWallets();
    }
  }, [user]);

  // Fetch user's wallets from API
  const fetchUserWallets = async () => {
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
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

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

        {/* Preferred Currency */}
        <div className="mb-8">
          <label htmlFor="currency" className="block text-white mb-2">
            Preferred Currency
          </label>
          <Select
            value={preferredCurrency}
            onValueChange={setPreferredCurrency}
          >
            <SelectTrigger className="w-full bg-black border border-white/20 text-white h-12 focus:ring-1 focus:ring-white/40">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent className="bg-[#101012] border border-white/10 p-2 rounded-xl shadow-xl w-[var(--radix-select-trigger-width)]">
              <SelectItem
                value="USDT"
                className="text-white hover:bg-white/90 rounded-lg px-4 py-2.5 my-1 focus:bg-white/90"
              >
                USDT
              </SelectItem>
              <SelectItem
                value="USD"
                className="text-white hover:bg-white/90 rounded-lg px-4 py-2.5 my-1 focus:bg-white/90"
              >
                USD
              </SelectItem>
              <SelectItem
                value="ETH"
                className="text-white hover:bg-white/90 rounded-lg px-4 py-2.5 my-1 focus:bg-white/90"
              >
                ETH
              </SelectItem>
              <SelectItem
                value="BNB"
                className="text-white hover:bg-white/90 rounded-lg px-4 py-2.5 my-1 focus:bg-white/90"
              >
                BNB
              </SelectItem>
            </SelectContent>
          </Select>
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

        {/* Logout Section */}
        <div className="pt-8 border-t border-white/10">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-1 sm:gap-2 h-10 sm:h-12 bg-transparent border border-red-500/30 text-red-400 rounded-full px-4 sm:px-6 text-mobile-sm sm:text-base font-medium hover:bg-red-500/10 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                <span>Logging out...</span>
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Logout from Splito</span>
              </>
            )}
          </button>
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
