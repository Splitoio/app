"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { useCreateOrganization } from "@/features/business/hooks/use-organizations";
import { useAddMembersToGroup } from "@/features/groups/hooks/use-create-group";
import { useAddFriend } from "@/features/friends/hooks/use-add-friend";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { fadeIn } from "@/utils/animations";
import { useAuthStore } from "@/stores/authStore";
import { apiClient } from "@/api-helpers/client";
import Image from "next/image";
import ResolverSelector, { Option as ResolverOption } from "./ResolverSelector";

interface CreateOrganizationFormProps {
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
function useAllChainsTokens() {
  const [options, setOptions] = useState<ResolverOption[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/multichain/all-chains-tokens`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load tokens"))))
      .then((data: any) => {
        if (cancelled) return;
        const chains = Array.isArray(data) ? data : data.chainsWithTokens || [];
        const opts: ResolverOption[] = [];
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
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return options;
}

export function CreateOrganizationForm({ isOpen, onClose }: CreateOrganizationFormProps) {
  const { user } = useAuthStore();
  const createOrganizationMutation = useCreateOrganization();
  const addMembersMutation = useAddMembersToGroup();
  const addFriendMutation = useAddFriend();
  const router = useRouter();
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [formData, setFormData] = useState({ name: "", memberEmail: "", currency: "" });
  const [members, setMembers] = useState<Member[]>([]);
  const allChainTokenOptions = useAllChainsTokens();
  const [resolver, setResolver] = useState<ResolverOption | undefined>(undefined);

  const checkUserExists = async (email: string): Promise<Member | null> => {
    try {
      setIsCheckingEmail(true);
      const response = await apiClient.post("/users/friends/invite", { email, sendInviteEmail: false });
      const userData = response.data || response;
      return {
        id: userData.id || Date.now().toString(),
        email: userData.email || email,
        name: userData.name || email.split("@")[0],
        image: userData.image,
        exists: !!userData.emailVerified,
      };
    } catch {
      return {
        id: Date.now().toString(),
        email: email,
        name: email.split("@")[0],
        exists: false,
      };
    } finally {
      setIsCheckingEmail(false);
    }
  };


  const inviteMembers = async (organizationId: string) => {
    const invitationPromises = members.map((member) =>
      addMembersMutation.mutateAsync({ groupId: organizationId, memberIdentifier: member.email }).catch(() => null)
    );
    const friendPromises = members.map((member) =>
      addFriendMutation.mutateAsync(member.email).catch(() => null)
    );
    await Promise.all([...invitationPromises, ...friendPromises]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please enter an organization name");
      return;
    }
    const payload: Record<string, unknown> = { name: formData.name, type: "BUSINESS" };
    if (resolver?.chainId) {
      payload.tokenId = resolver.id;
      payload.chainId = resolver.chainId;
    }
    createOrganizationMutation.mutate(payload as { name: string; type: "BUSINESS"; tokenId?: string; chainId?: string }, {
      onSuccess: async (data: { id: string }) => {
        if (resolver && data?.id) {
          try {
            await apiClient.post(`/groups/${data.id}/accepted-tokens`, {
              tokenId: resolver.id,
              chainId: resolver.chainId,
              isDefault: true,
            });
          } catch {
            toast.error("Failed to set accepted token for this organization");
          }
        }
        if (members.length > 0) await inviteMembers(data.id);
        setFormData({ name: "", memberEmail: "", currency: "" });
        setMembers([]);
        toast.success("Organization created successfully!");
        onClose();
        router.push(`/organization/organizations/${data.id}`);
      },
      onError: () => {
        toast.error("Failed to create organization");
      },
    });
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = formData.memberEmail.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (members.some((m) => m.email.toLowerCase() === email)) {
      toast.error("This member has already been added");
      return;
    }
    const userCheck = await checkUserExists(email);
    if (userCheck) {
      setMembers([...members, { ...userCheck, id: userCheck.id || Date.now().toString() }]);
    }

    setFormData((prev) => ({ ...prev, memberEmail: "" }));
  };

  const removeMember = (memberId: string) => {
    setMembers((m) => m.filter((member) => member.id !== memberId));
  };

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
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" {...fadeIn}>
        <div className="fixed inset-0 bg-black/70 brightness-50" onClick={onClose} />
        <div
          className="relative z-10 bg-black rounded-3xl w-full max-w-md border border-white/70"
          onClick={(e) => e.stopPropagation()}
          style={{ overflow: "visible" }}
        >
          <div className="p-8">
            <h2 className="text-xl font-semibold text-white mb-6">Create Organization</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-base text-white">Organization Name</label>
                <input
                  id="org-name-input"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full h-12 bg-transparent rounded-lg px-4 text-base text-white border border-white/10"
                  placeholder="New Organization"
                />
              </div>
              <div style={{ overflow: "visible" }}>
                <label className="block text-base text-white mb-2">Choose Payment Token</label>
                <ResolverSelector value={resolver} onChange={handleResolverChange} />
              </div>
              <div className="space-y-2">
                <label className="block text-base text-white">Invite members</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={formData.memberEmail}
                    onChange={(e) => setFormData((prev) => ({ ...prev, memberEmail: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddMember(e))}
                    className="flex-1 h-12 bg-transparent rounded-lg px-4 text-base text-white border border-white/10"
                    placeholder="me@email.com"
                    disabled={isCheckingEmail}
                  />
                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center"
                    disabled={isCheckingEmail || !formData.memberEmail.trim()}
                  >
                    <Plus className="h-5 w-5 text-black" />
                  </button>
                </div>
                {members.length > 0 && (
                  <div className="mt-4 max-h-[140px] overflow-y-auto pr-1 space-y-2">
                    <AnimatePresence>
                      {members.map((member) => (
                        <motion.div
                          key={member.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                        >
                          <div className="flex items-center overflow-hidden">
                            {member.image ? (
                              <div className="w-8 h-8 rounded-full mr-3 flex-shrink-0 overflow-hidden">
                                <Image src={member.image} alt={member.name || member.email} width={32} height={32} className="h-full w-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mr-3 flex-shrink-0">
                                {(member.name || member.email).charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="overflow-hidden">
                              {member.name && <p className="text-white text-sm font-medium truncate">{member.name}</p>}
                              <p className="text-white/60 text-xs truncate">{member.email}</p>
                            </div>
                          </div>
                          <button type="button" onClick={() => removeMember(member.id)} className="text-white/70 hover:text-white p-1 ml-2 flex-shrink-0">
                            <X className="h-4 w-4" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
              <button
                id="org-create-button"
                type="submit"
                className="w-full h-12 bg-white text-black rounded-full font-medium hover:bg-white/90 transition-colors mt-8"
                disabled={createOrganizationMutation.isPending}
              >
                {createOrganizationMutation.isPending ? "Creating..." : "Create Organization"}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
