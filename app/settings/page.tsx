"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2, Trash2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { fadeIn } from "@/utils/animations";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const router = useRouter();

  // State for user settings
  const [displayName, setDisplayName] = useState<string>("Andrew Joe");
  const [preferredCurrency, setPreferredCurrency] = useState<string>("USDT");
  const [selectedChainFilter, setSelectedChainFilter] =
    useState<string>("All Chains");

  // State for wallets
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isAddingWallet, setIsAddingWallet] = useState(false);

  // Initialize with sample data
  useEffect(() => {
    if (user) {
      setDisplayName(user.name || "Andrew Joe");
      setPreferredCurrency(user.currency || "USDT");

      // Sample wallets for demonstration
      setWallets([
        {
          id: "1",
          address: "0xe2d3A739EFFCd3A99387d015...",
          chain: "BNB",
          isPrimary: true,
        },
        {
          id: "2",
          address: "0xe2d3A739EFFCd3A99387d015...",
          chain: "ETH",
          isPrimary: true,
        },
        {
          id: "3",
          address: "0xe2d3A739EFFCd3A99387d015...",
          chain: "SOL",
          isPrimary: false,
        },
      ]);
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Set a wallet as primary
  const setAsPrimary = (walletId: string) => {
    setWallets(
      wallets.map((wallet) => ({
        ...wallet,
        isPrimary: wallet.id === walletId,
      }))
    );
    toast.success("Primary wallet updated");
  };

  // Remove a wallet
  const removeWallet = (walletId: string) => {
    setWallets(wallets.filter((wallet) => wallet.id !== walletId));
    toast.success("Wallet removed");
  };

  // Add a new wallet (mock function)
  const handleAddWallet = () => {
    setIsAddingWallet(true);

    // Simulate async operation
    setTimeout(() => {
      const newWallet = {
        id: String(Date.now()),
        address: "0xe2d3A739EFFCd3A99387d015...",
        chain: CHAINS[Math.floor(Math.random() * CHAINS.length)],
        isPrimary: false,
      };

      setWallets([...wallets, newWallet]);
      setIsAddingWallet(false);
      toast.success("Wallet added successfully");
    }, 1500);
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
    <div className="flex w-full min-h-screen bg-black">
      <div className="w-[750px] pl-10 pt-10 pr-4 pb-24">
        <h1 className="text-2xl font-semibold text-white mb-8">Settings</h1>

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
            <SelectContent className="bg-black border-white/10">
              <SelectItem value="USDT" className="text-white hover:bg-white/10">
                USDT
              </SelectItem>
              <SelectItem value="USD" className="text-white hover:bg-white/10">
                USD
              </SelectItem>
              <SelectItem value="ETH" className="text-white hover:bg-white/10">
                ETH
              </SelectItem>
              <SelectItem value="BNB" className="text-white hover:bg-white/10">
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
            onClick={handleAddWallet}
            disabled={isAddingWallet}
            className="w-full flex items-center justify-center h-12 bg-white text-black rounded-full mb-6 hover:bg-white/90 transition-colors font-medium disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isAddingWallet ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Adding Wallet...
              </>
            ) : (
              <>Add Wallet</>
            )}
          </button>

          <div className="mb-6">
            <Select
              value={selectedChainFilter}
              onValueChange={setSelectedChainFilter}
            >
              <SelectTrigger className="w-full bg-black border border-white/20 text-white h-12 rounded-full focus:ring-1 focus:ring-white/40">
                <SelectValue placeholder="All Chains" />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/10">
                <SelectItem
                  value="All Chains"
                  className="text-white hover:bg-white/10 ml-4"
                >
                  All Chains
                </SelectItem>
                {CHAINS.map((chain) => (
                  <SelectItem
                    key={chain}
                    value={chain}
                    className="text-white hover:bg-white/10"
                  >
                    {chain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Wallet List */}
          <div className="space-y-6">
            {filteredWallets.map((wallet) => (
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
                        <Trash2 className="h-5 w-5" />
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
                        <Trash2 className="h-5 w-5" />
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
