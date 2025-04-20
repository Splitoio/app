"use client";

import { X, ChevronDown, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeIn, scaleIn } from "@/utils/animations";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  getAvailableChains,
  addMultichainAccount,
} from "@/services/walletService";

// Define wallet interface
interface Wallet {
  id: string;
  address: string;
  chain: string;
  isPrimary: boolean;
}

interface Chain {
  id: string;
  name: string;
  enabled: boolean;
}

interface ChainResponse {
  chains: Chain[];
}

interface AddWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWallet: (wallet: Omit<Wallet, "id">) => void;
}

// Fallback chains in case API fails
const FALLBACK_CHAINS = [
  { id: "ethereum", name: "Ethereum", enabled: true },
  { id: "stellar", name: "Stellar", enabled: true },
  { id: "solana", name: "Solana", enabled: true },
  { id: "polygon", name: "Polygon", enabled: true },
  { id: "binance", name: "Binance", enabled: true },
];

export function AddWalletModal({
  isOpen,
  onClose,
  onAddWallet,
}: AddWalletModalProps) {
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedChain, setSelectedChain] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chains, setChains] = useState<Chain[]>([]);
  const [isLoadingChains, setIsLoadingChains] = useState(false);

  // Fetch chains from API when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchChains();
    }
  }, [isOpen]);

  // Clear wallet address when chain changes
  useEffect(() => {
    setWalletAddress("");
  }, [selectedChain]);

  // Fetch available chains from the API
  const fetchChains = async () => {
    setIsLoadingChains(true);
    try {
      const response = (await getAvailableChains()) as ChainResponse;
      if (
        response &&
        response.chains &&
        Array.isArray(response.chains) &&
        response.chains.length > 0
      ) {
        setChains(response.chains);
        setSelectedChain(response.chains[0].id);
      } else {
        // Use fallback chains if the API returns empty data
        setChains(FALLBACK_CHAINS);
        setSelectedChain(FALLBACK_CHAINS[0].id);
      }
    } catch (error) {
      console.error("Error fetching chains:", error);
      // Use fallback chains if the API fails
      setChains(FALLBACK_CHAINS);
      setSelectedChain(FALLBACK_CHAINS[0].id);
    } finally {
      setIsLoadingChains(false);
    }
  };

  const handleSubmit = async () => {
    if (!walletAddress.trim()) {
      toast.error("Please enter a wallet address");
      return;
    }

    if (!selectedChain) {
      toast.error("Please select a blockchain");
      return;
    }

    setIsSubmitting(true);

    try {
      // Add via the multichain API
      await addMultichainAccount(selectedChain, walletAddress, false);

      // Create the new wallet object for the UI
      const newWallet = {
        address: walletAddress,
        chain: selectedChain,
        isPrimary: false,
      };

      // Call the callback function
      await onAddWallet(newWallet);

      // Reset form
      setWalletAddress("");

      // Close modal
      onClose();
    } catch (error) {
      console.error("Error adding wallet:", error);
      toast.error("Failed to add wallet. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to handle chain selection
  const handleChainSelect = (chainId: string) => {
    setSelectedChain(chainId);
    setIsDropdownOpen(false);
  };

  // Get placeholder with the selected chain name
  const getPlaceholder = (): string => {
    const chainName =
      chains.find((c) => c.id === selectedChain)?.name || "blockchain";
    return `Enter ${chainName} wallet address`;
  };

  // Find the currently selected chain
  const selectedChainObject = chains.find((c) => c.id === selectedChain);

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
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[500px]">
            <motion.div
              className="relative z-10 rounded-3xl overflow-hidden"
              {...scaleIn}
            >
              <div className="flex flex-col bg-black rounded-3xl p-6 border border-white/80">
                {/* Modal Header */}
                <div className="w-full mb-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold text-white">
                      Wallet
                    </h2>
                    <button
                      onClick={onClose}
                      className="rounded-full p-1.5 hover:bg-white/10 transition-colors"
                    >
                      <X className="h-5 w-5 text-white/70" />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="space-y-6 mb-8">
                  {/* Wallet Address Input */}
                  <div className="space-y-2">
                    <label
                      htmlFor="wallet-address"
                      className="block text-white text-base"
                    >
                      Wallet Address
                    </label>
                    <input
                      id="wallet-address"
                      type="text"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      className="w-full bg-black border border-white/20 text-white p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-white/30"
                      placeholder={getPlaceholder()}
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Wallet Chain Dropdown */}
                  <div className="space-y-2">
                    <label className="block text-white text-base">
                      Wallet Chain
                    </label>

                    {isLoadingChains ? (
                      <div className="flex items-center p-3 text-white/70">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        <span>Loading blockchains...</span>
                      </div>
                    ) : (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="w-full bg-black border border-[#2e2e31] text-white p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-white/30 flex items-center justify-between"
                          disabled={isSubmitting}
                        >
                          <span>
                            {selectedChainObject?.name || "Select blockchain"}
                          </span>
                          <ChevronDown
                            className={`h-5 w-5 text-white/70 transition-transform duration-200 ${
                              isDropdownOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {/* Dropdown */}
                        <AnimatePresence>
                          {isDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.15 }}
                              className="absolute left-0 right-0 mt-1 bg-black border border-[#2e2e31] rounded-lg overflow-hidden z-10 max-h-[250px] overflow-y-auto"
                            >
                              {chains.map((chain) => (
                                <button
                                  key={chain.id}
                                  type="button"
                                  onClick={() => handleChainSelect(chain.id)}
                                  className="w-full text-left px-4 py-3 text-white hover:bg-white/5 transition-colors flex items-center"
                                >
                                  <div className="w-5 h-5 flex items-center justify-center border border-white/30 rounded mr-3">
                                    {selectedChain === chain.id && (
                                      <Check className="h-3.5 w-3.5 text-white" />
                                    )}
                                  </div>
                                  {chain.name}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>

                {/* Add Wallet Button */}
                <motion.button
                  onClick={handleSubmit}
                  disabled={isSubmitting || isLoadingChains}
                  whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                  whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                  className="w-full h-[58px] flex items-center justify-center
                  bg-white rounded-full
                  text-lg font-semibold text-black
                  transition-all duration-200 hover:bg-white/90 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                      <span>Adding...</span>
                    </div>
                  ) : (
                    "Add Wallet"
                  )}
                </motion.button>

                {/* Connect Wallet Link */}
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    className="text-white hover:text-white/80 transition-colors text-base"
                    onClick={onClose}
                  >
                    or Connect Wallet
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
