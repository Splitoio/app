"use client";

import { useState, useEffect } from "react";
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
import ResolverSelector, { Option as ResolverOption } from "./ResolverSelector";
import CurrencyDropdown from "./currency-dropdown";

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

type Option = import("./ResolverSelector").Option;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
function useAllChainsTokens() {
  const [options, setOptions] = useState<Option[]>([]);
  useEffect(() => {
    fetch(`${API_URL}/api/multichain/all-chains-tokens`, { credentials: "include" })
      .then(res => res.json())
      .then((data: any) => {
        const chains = Array.isArray(data) ? data : data.chainsWithTokens || [];
        const opts: Option[] = [];
        chains.forEach((chain: any) => {
          (chain.tokens || []).forEach((token: any) => {
            opts.push({
              chainId: chain.chainId,
              id: token.id || token.symbol,
              symbol: token.symbol,
              name: token.name,
              type: token.type,
            });
          });
        });
        setOptions(opts);
      });
  }, []);
  return options;
}

export function CreateGroupForm({ isOpen, onClose }: CreateGroupFormProps) {
  const { address } = useWallet();
  const { user } = useAuthStore();
  const createGroupMutation = useCreateGroup();
  const addMembersMutation = useAddMembersToGroup();
  const uploadFileMutation = useUploadFile();
  const router = useRouter();
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    memberEmail: "",
    currency: "",
  });

  // State for tracking added members
  const [members, setMembers] = useState<Member[]>([]);

  const allChainTokenOptions = useAllChainsTokens();
  const [resolver, setResolver] = useState<ResolverOption | undefined>(undefined);

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

    // Debug: Log the selected resolver before any API call
    console.log("[DEBUG] Selected resolver:", resolver);

    if (!formData.name.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    const payload: any = {
      name: formData.name,
    };
    if (resolver) {
      if (resolver.chainId) {
        payload.tokenId = resolver.id;
        payload.chainId = resolver.chainId;
      } else {
        payload.tokenId = resolver.id;
      }
    }
    // Debug: Log the group creation payload
    console.log("[DEBUG] Group creation payload:", payload);
    createGroupMutation.mutate(
      payload,
      {
        onSuccess: async (data) => {
          // Debug: Log the group creation response
          console.log("[DEBUG] Group created, response:", data);
          if (resolver && data?.id) {
            if (!resolver.id || !resolver.chainId) {
              toast.error("Please select a valid token resolver (not fiat)");
              return;
            }
            const acceptedTokenPayload = {
              tokenId: resolver.id,
              chainId: resolver.chainId,
              isDefault: true,
            };
            console.log("[DEBUG] Accepted token payload:", acceptedTokenPayload);
            try {
              const resp = await apiClient.post(`/groups/${data.id}/accepted-tokens`, acceptedTokenPayload);
              console.log("[DEBUG] Accepted token API response:", resp);
            } catch (err) {
              toast.error("Failed to set accepted token for this group");
              console.error("[DEBUG] Error setting accepted token:", err);
            }
          }
          if (members.length > 0) {
            await inviteMembers(data.id);
          }
          setFormData({
            name: "",
            memberEmail: "",
            currency: "",
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

  // Only allow tokens (with chainId) as resolver
  const handleResolverChange = (option: ResolverOption | undefined) => {
    if (option && !option.chainId) {
      toast.error("Please select a blockchain token as resolver (not fiat)");
      setResolver(undefined);
      return;
    }
    setResolver(option);
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
          className="relative z-10 bg-black rounded-3xl w-full max-w-md border border-white/70"
          onClick={(e) => e.stopPropagation()}
          style={{ overflow: 'visible' }}
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

              {/* Choose Payment Token (Resolver) */}
              <div style={{ overflow: 'visible' }}>
                <label className="block text-base text-white mb-2">Choose Payment Token</label>
                <ResolverSelector value={resolver} onChange={handleResolverChange} />
              </div>

              {/* Currency Dropdown */}
              <div style={{ overflow: 'visible' }}>
                <label className="block text-base text-white mb-2">Choose Currency</label>
                <CurrencyDropdown
                  selectedCurrencies={formData.currency ? [formData.currency] : []}
                  setSelectedCurrencies={(currencies) => {
                    setFormData((prev) => ({
                      ...prev,
                      currency: currencies[0] || "",
                    }));
                  }}
                  showFiatCurrencies={true}
                />
              </div>

              {/* Invite Members (moved to bottom) */}
              <div className="space-y-2">
                <label className="block text-base text-white">Invite members</label>
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
