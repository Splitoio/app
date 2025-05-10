"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { ChevronDown, Plus, Check, X } from "lucide-react";
import {
  useCreateGroup,
  useAddMembersToGroup,
} from "@/features/groups/hooks/use-create-group";
import { useRouter } from "next/navigation";
import { useUploadFile } from "@/features/files/hooks/use-balances";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { fadeIn } from "@/utils/animations";
import { useAuthStore } from "@/stores/authStore";
import { apiClient } from "@/api-helpers/client";
import Image from "next/image";

interface CreateGroupFormProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Member {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  exists: boolean;
}

export function CreateGroupForm({ isOpen, onClose }: CreateGroupFormProps) {
  const { address } = useWallet();
  const { user } = useAuthStore();
  const [selectedToken, setSelectedToken] = useState("USDT");
  const [lockPrice, setLockPrice] = useState(false);
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);
  const createGroupMutation = useCreateGroup();
  const addMembersMutation = useAddMembersToGroup();
  const uploadFileMutation = useUploadFile();
  const router = useRouter();
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    memberEmail: "",
  });

  // State for tracking added members
  const [members, setMembers] = useState<Member[]>([]);

  // Updated token structure to group by chain
  const tokensByChain = {
    Base: ["ETH", "USDC", "USDT"],
    Stellar: ["XLM"],
  };

  // Flattened list of all tokens for selection
  const allTokens = Object.values(tokensByChain).flat();

  // Check if user exists by email
  const checkUserExists = async (email: string): Promise<Member | null> => {
    try {
      setIsCheckingEmail(true);

      // Using the invite friend endpoint which checks if a user exists
      const response = await apiClient.post("/users/friends/invite", {
        email,
        sendInviteEmail: false, // Don't actually send an invite, just check if user exists
      });

      const userData = response.data || response;

      // Check if the response indicates a newly created user (not already registered)
      // If emailVerified is false and there's no name or it equals the email prefix,
      // it's likely a newly created user by the API and not an existing one
      const isNewlyCreated =
        !userData.emailVerified &&
        (!userData.name || userData.name === email.split("@")[0]);

      if (isNewlyCreated) {
        return null; // Return null to indicate user doesn't exist yet
      }

      // User exists
      return {
        id: userData.id || Date.now().toString(),
        email: userData.email || email,
        name: userData.name,
        image: userData.image,
        exists: true,
      };
    } catch (error) {
      console.error("Error checking user:", error);
      return null;
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Add members to a group after creation
  const inviteMembers = async (groupId: string) => {
    const invitationPromises = members.map((member) =>
      addMembersMutation
        .mutateAsync({
          groupId,
          memberIdentifier: member.email,
        })
        .catch((error) => {
          console.error(`Failed to add member ${member.email}:`, error);
          return null;
        })
    );

    try {
      await Promise.all(invitationPromises);
      console.log(`Successfully invited members to group ${groupId}`);
    } catch (error) {
      console.error("Error inviting members:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // // Check if user has a connected wallet in their profile
    // if (!user?.stellarAccount) {
    //   toast.error("You need to connect a wallet before creating a group", {
    //     description: "Add a wallet in your settings to continue",
    //     action: {
    //       label: "Add Wallet",
    //       onClick: () => router.push("/settings"),
    //     },
    //     duration: 8000,
    //   });
    //   return;
    // }

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
        onSuccess: async (data) => {
          // If we have members to invite, do that after group creation
          if (members.length > 0) {
            await inviteMembers(data.id);
          }

          // Reset form state
          setFormData({
            name: "",
            memberEmail: "",
          });
          setMembers([]);

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

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = formData.memberEmail.trim().toLowerCase();
    if (!email) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Check if email already exists in members list (case insensitive)
    if (members.some((member) => member.email.toLowerCase() === email)) {
      toast.error("This member has already been added");
      return;
    }

    // Check if user exists in system
    const userCheck = await checkUserExists(email);

    if (!userCheck) {
      toast.error("User not found", {
        description: "This email is not registered on Splito",
      });
      return;
    }

    // Add the user to the members list
    setMembers([
      ...members,
      {
        ...userCheck,
        id: userCheck.id || Date.now().toString(),
      },
    ]);

    // Clear the input
    setFormData((prev) => ({
      ...prev,
      memberEmail: "",
    }));
  };

  const removeMember = (memberId: string) => {
    setMembers(members.filter((member) => member.id !== memberId));
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
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#17171A] rounded-lg py-2 z-10 max-h-[320px] overflow-y-auto">
                      {Object.entries(tokensByChain).map(([chain, tokens]) => (
                        <div key={chain} className="mb-2 last:mb-0">
                          <div className="px-4 py-1 text-sm text-white/50 font-medium">
                            {chain}
                          </div>
                          <div>
                            {tokens.map((token) => (
                              <button
                                key={token}
                                type="button"
                                className={`w-full px-4 py-2.5 text-left text-white hover:bg-white/5 flex items-center ${
                                  token === selectedToken ? "bg-white/5" : ""
                                }`}
                                onClick={() => {
                                  setSelectedToken(token);
                                  setShowTokenDropdown(false);
                                }}
                              >
                                <div
                                  className={`w-5 h-5 flex items-center justify-center rounded-md border ${
                                    token === selectedToken
                                      ? "border-white bg-white"
                                      : "border-white/30 bg-transparent"
                                  } mr-3`}
                                >
                                  {token === selectedToken && (
                                    <Check className="h-3.5 w-3.5 text-black" />
                                  )}
                                </div>
                                <span className="font-medium">{token}</span>
                              </button>
                            ))}
                          </div>
                        </div>
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
                    value={formData.memberEmail}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        memberEmail: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddMember(e);
                      }
                    }}
                    className="flex-1 h-12 bg-transparent rounded-lg px-4 
                      text-base text-white border border-white/10"
                    placeholder="me@email.com"
                    disabled={isCheckingEmail}
                  />
                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center"
                    disabled={isCheckingEmail || !formData.memberEmail.trim()}
                  >
                    {isCheckingEmail ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <svg
                          className="h-5 w-5 text-black"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      </motion.div>
                    ) : (
                      <Plus className="h-5 w-5 text-black" />
                    )}
                  </button>
                </div>

                {/* Display added members list */}
                {members.length > 0 && (
                  <div className="mt-4">
                    <div
                      className="max-h-[140px] overflow-y-auto pr-1 space-y-2"
                      style={{
                        scrollbarWidth: "thin",
                        scrollbarColor: "rgba(255, 255, 255, 0.1) transparent",
                      }}
                    >
                      <AnimatePresence>
                        {members.map((member) => (
                          <motion.div
                            key={member.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                          >
                            <div className="flex items-center overflow-hidden">
                              {member.image ? (
                                <div className="w-8 h-8 rounded-full mr-3 flex-shrink-0 overflow-hidden">
                                  <Image
                                    src={member.image}
                                    alt={member.name || member.email}
                                    width={32}
                                    height={32}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mr-3 flex-shrink-0">
                                  {(member.name || member.email)
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                              )}
                              <div className="overflow-hidden">
                                {member.name && (
                                  <p className="text-white text-sm font-medium truncate">
                                    {member.name}
                                  </p>
                                )}
                                <p className="text-white/60 text-xs truncate">
                                  {member.email}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeMember(member.id)}
                              className="text-white/70 hover:text-white p-1 ml-2 flex-shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
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
