"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { ChevronDown, Plus, Check } from "lucide-react";
import { useCreateGroup } from "@/features/groups/hooks/use-create-group";
import { useRouter } from "next/navigation";
import { useUploadFile } from "@/features/files/hooks/use-balances";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { fadeIn } from "@/utils/animations";

interface CreateGroupFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateGroupForm({ isOpen, onClose }: CreateGroupFormProps) {
  const { address } = useWallet();
  const [selectedToken, setSelectedToken] = useState("USDT");
  const [lockPrice, setLockPrice] = useState(false);
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);
  const createGroupMutation = useCreateGroup();
  const uploadFileMutation = useUploadFile();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    members: "",
  });

  const tokens = ["USDT", "USDC", "XLM"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) {
      toast.error("Please connect your wallet first!");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    createGroupMutation.mutate(
      {
        name: formData.name,
        currency: selectedToken,
      },
      {
        onSuccess: (data) => {
          setFormData({
            name: "",
            members: "",
          });

          toast.success("Group created successfully!");
          onClose();
          router.push(`/groups/${data.id}`);
        },
        onError: (error) => {
          toast.error("Failed to create group");
          console.error(error);
        },
      }
    );
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.members.trim()) return;

    // Here you would typically add the member to a list
    // For now, just clear the input as a placeholder
    setFormData((prev) => ({
      ...prev,
      members: "",
    }));

    toast.success("Invitation sent!");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        {...fadeIn}
      >
        {/* Backdrop with brightness reduction */}
        <div
          className="fixed inset-0 bg-black/70 brightness-50"
          onClick={onClose}
        />

        {/* Modal content with normal brightness */}
        <div
          className="relative z-10 bg-black rounded-3xl w-full max-w-md overflow-hidden border border-white/70"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8">
            <h2 className="text-xl font-semibold text-white mb-6">
              Create Group
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Group Name */}
              <div className="space-y-2">
                <label className="block text-base text-white">Group Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full h-12 bg-transparent rounded-lg px-4 
                    text-base text-white border border-white/10"
                  placeholder="New Split Group"
                />
              </div>

              {/* Token Selection */}
              <div className="space-y-2">
                <label className="block text-base text-white">
                  Choose Payment Token
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTokenDropdown(!showTokenDropdown)}
                    className="w-full h-12 bg-transparent rounded-lg px-4 
                      text-base text-white border border-white/10 flex items-center justify-between"
                  >
                    <span>{selectedToken}</span>
                    <ChevronDown className="h-5 w-5 text-white/70" />
                  </button>

                  {showTokenDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#17171A] border border-white/10 rounded-lg py-2 z-10">
                      {tokens.map((token) => (
                        <button
                          key={token}
                          type="button"
                          className="w-full px-4 py-2 text-left text-white hover:bg-white/5 flex items-center"
                          onClick={() => {
                            setSelectedToken(token);
                            setShowTokenDropdown(false);
                          }}
                        >
                          {token === selectedToken && (
                            <Check className="h-4 w-4 mr-2 text-white" />
                          )}
                          <span
                            className={
                              token === selectedToken ? "ml-0" : "ml-6"
                            }
                          >
                            {token}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Lock Price Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-white text-sm">
                  Lock price at $1 = 1 USDT
                </span>
                <button
                  type="button"
                  onClick={() => setLockPrice(!lockPrice)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${
                    lockPrice ? "bg-blue-500" : "bg-white/10"
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-white transform transition-transform ${
                      lockPrice ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/10 my-4"></div>

              {/* Invite Members */}
              <div className="space-y-2">
                <label className="block text-base text-white">
                  Invite members
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={formData.members}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        members: e.target.value,
                      }))
                    }
                    className="flex-1 h-12 bg-transparent rounded-lg px-4 
                      text-base text-white border border-white/10"
                    placeholder="me@email.com"
                  />
                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center"
                  >
                    <Plus className="h-5 w-5 text-black" />
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full h-12 bg-white text-black rounded-full font-medium hover:bg-white/90 transition-colors mt-8"
                disabled={createGroupMutation.isPending}
              >
                {createGroupMutation.isPending ? "Creating..." : "Create Group"}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
