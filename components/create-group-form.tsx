"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { Plus, X } from "lucide-react";
import {
  useCreateGroup,
  useAddMembersToGroup,
} from "@/features/groups/hooks/use-create-group";
import { useAddFriend } from "@/features/friends/hooks/use-add-friend";
import { useRouter } from "next/navigation";
import { useUploadFile } from "@/features/files/hooks/use-balances";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { isValidEmail } from "@/utils/validation";
import { useAuthStore } from "@/stores/authStore";
import { apiClient } from "@/api-helpers/client";
import ResolverSelector, { Option as ResolverOption } from "./ResolverSelector";
import { Card, Avatar, GroupAvatar, A, T, Icons } from "@/lib/splito-design";

const GROUP_COLORS = [
  "#22D3EE",
  "#A78BFA",
  "#34D399",
  "#FB923C",
  "#F472B6",
  "#FBBF24",
  "#F87171",
  "#818CF8",
];
const MEMBER_COLORS = ["#22D3EE", "#A78BFA", "#34D399", "#FB923C", "#F472B6"];

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
  const addFriendMutation = useAddFriend();
  const uploadFileMutation = useUploadFile();
  const router = useRouter();
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [groupColor, setGroupColor] = useState(GROUP_COLORS[0]);
  const [formData, setFormData] = useState({
    name: "",
    memberEmail: "",
    currency: "",
  });

  // State for tracking added members
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (isOpen) setStep(1);
  }, [isOpen]);

  const allChainTokenOptions = useAllChainsTokens();
  const [resolver, setResolver] = useState<ResolverOption | undefined>(undefined);

  // Check if user exists by email
  const checkUserExists = async (email: string): Promise<Member | null> => {
    try {
      setIsCheckingEmail(true);

      const response = await apiClient.post("/users/friends/invite", {
        email,
        sendInviteEmail: false,
      });

      const userData = response.data || response;

      return {
        id: userData.id || Date.now().toString(),
        email: userData.email || email,
        name: userData.name || email.split("@")[0],
        image: userData.image,
        exists: !!userData.emailVerified,
      };
    } catch (error) {
      console.error("Error checking user:", error);
      // Even if API fails, allow adding by email as a potential shadow user
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

    // Also add members as friends
    const friendPromises = members.map((member) =>
      addFriendMutation
        .mutateAsync(member.email)
        .catch((error) => {
          console.error(`Failed to add friend ${member.email}:`, error);
          return null;
        })
    );

    try {
      await Promise.all([...invitationPromises, ...friendPromises]);
      console.log(`Successfully invited members to group ${groupId} and added as friends`);
    } catch (error) {
      console.error("Error inviting members or adding friends:", error);
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
    if (!isValidEmail(email)) {
      toast.error("Please enter a valid email address (e.g. name@example.com)");
      return;
    }

    // Check if email already exists in members list (case insensitive)
    if (members.some((member) => member.email.toLowerCase() === email)) {
      toast.error("This member has already been added");
      return;
    }

    // Check if user exists in system
    const userCheck = await checkUserExists(email);

    if (userCheck) {
      // Add the user to the members list
      setMembers([
        ...members,
        {
          ...userCheck,
          id: userCheck.id || Date.now().toString(),
        },
      ]);
    }


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

  const inp = {
    width: "100%",
    background: "rgba(255,255,255,0.05)",
    border: "1.5px solid rgba(255,255,255,0.09)",
    borderRadius: 14,
    padding: "12px 16px",
    color: "#fff",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
  };
  const lbl = {
    color: T.label,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    marginBottom: 8,
    display: "block",
  };

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.88)",
          backdropFilter: "blur(16px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 200,
          padding: 24,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "linear-gradient(160deg, #141414 0%, #0f0f0f 100%)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 28,
            width: "100%",
            maxWidth: 460,
            padding: "28px 28px 32px",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 40px 100px rgba(0,0,0,0.8)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <div>
              <p
                style={{
                  color: "#fff",
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                }}
              >
              Create Group
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 5,
                  marginTop: 12,
                }}
              >
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    style={{
                      height: 3,
                      width: 34,
                      borderRadius: 99,
                      background: step >= s ? groupColor : "#2a2a2a",
                      transition: "background 0.3s",
                      boxShadow:
                        step >= s ? `0 0 8px ${groupColor}88` : "none",
                    }}
                  />
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: T.soft,
                width: 34,
                height: 34,
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ×
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 18 }}
          >
            {/* Step 1: Name + vibe + color */}
            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <p
                  style={{
                    color: T.muted,
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                >
                  Name your group and give it a vibe.
                </p>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <div
                    style={{
                      padding: 3,
                      borderRadius: 22,
                      background: `${groupColor}22`,
                      border: `2px solid ${groupColor}44`,
                      boxShadow: `0 0 24px ${groupColor}33`,
                    }}
                  >
                    <GroupAvatar
                      items={[
                        { init: "Y", color: groupColor },
                        ...members.slice(0, 3).map((m, i) => ({
                          init: (m.name || m.email).slice(0, 2).toUpperCase(),
                          color: MEMBER_COLORS[i % MEMBER_COLORS.length],
                        })),
                      ]}
                      size={80}
                      radius={18}
                    />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Group name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                    placeholder="e.g. Japan Trip, Roommates…"
                    style={inp}
                    autoFocus
                  />
                </div>
                <div>
                  <label style={lbl}>Color</label>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {GROUP_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setGroupColor(c)}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: "50%",
                          background: c,
                          border:
                            groupColor === c
                              ? "3px solid #fff"
                              : "3px solid transparent",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          boxShadow:
                            groupColor === c ? `0 0 14px ${c}88` : "none",
                        }}
                      />
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => formData.name.trim() && setStep(2)}
                  disabled={!formData.name.trim()}
                  style={{
                    padding: 13,
                    background: formData.name.trim() ? groupColor : "rgba(255,255,255,0.05)",
                    color: formData.name.trim() ? "#0a0a0a" : "#555",
                    border: "none",
                    borderRadius: 14,
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: formData.name.trim() ? "pointer" : "default",
                    fontFamily: "inherit",
                    transition: "all 0.2s",
                  }}
                >
                  {formData.name.trim() ? "Continue →" : "Enter a group name"}
                </button>
              </div>
            )}

            {/* Step 2: Default settlement currency */}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <p
                  style={{
                    color: T.muted,
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}
                >
                  Set the default settlement currency for this group.
                </p>
                <div style={{ overflow: "visible" }}>
                  <label style={lbl}>Default settlement currency</label>
                  <ResolverSelector
                    value={resolver}
                    onChange={handleResolverChange}
                  />
                </div>
                {resolver?.chainId ? (
                  <div
                    style={{
                      background: "rgba(52,211,153,0.06)",
                      border: "1px solid rgba(52,211,153,0.15)",
                      borderRadius: 14,
                      padding: "14px 16px",
                    }}
                  >
                    <p
                      style={{
                        color: "#34D399",
                        fontSize: 12,
                        fontWeight: 700,
                        marginBottom: 5,
                      }}
                    >
                      On-chain settlement
                    </p>
                    <p
                      style={{
                        color: "#34D39977",
                        fontSize: 11,
                        lineHeight: 1.6,
                      }}
                    >
                      Members will be prompted to settle via blockchain.
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 14,
                      padding: "14px 16px",
                    }}
                  >
                    <p
                      style={{
                        color: T.body,
                        fontSize: 12,
                        fontWeight: 700,
                        marginBottom: 4,
                      }}
                    >
                      Bank / Fiat settlement
                    </p>
                    <p
                      style={{
                        color: T.sub,
                        fontSize: 11,
                        lineHeight: 1.6,
                      }}
                    >
                      Members will settle outside the app and mark as paid.
                    </p>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    style={{
                      flex: 1,
                      padding: 13,
                      background: "rgba(255,255,255,0.05)",
                      color: T.body,
                      border: "1px solid rgba(255,255,255,0.09)",
                      borderRadius: 14,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    style={{
                      flex: 2,
                      padding: 13,
                      background: groupColor,
                      color: "#0a0a0a",
                      border: "none",
                      borderRadius: 14,
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.2s",
                    }}
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Add friends */}
            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p style={{ color: T.muted, fontSize: 14 }}>
                  Add friends to this group.
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "rgba(255,255,255,0.05)",
                    border: "1.5px solid rgba(255,255,255,0.09)",
                    borderRadius: 14,
                    padding: "11px 16px",
                    gap: 8,
                  }}
                >
                  <span style={{ color: T.muted, display: "flex" }}>
                    <Icons.search />
                  </span>
                  <input
                    type="email"
                    placeholder="Invite by email (e.g. friend@email.com)"
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
                    disabled={isCheckingEmail}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#fff",
                      fontSize: 14,
                      outline: "none",
                      width: "100%",
                      fontFamily: "inherit",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddMember}
                    disabled={
                      isCheckingEmail ||
                      !formData.memberEmail.trim() ||
                      !isValidEmail(formData.memberEmail.trim())
                    }
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background:
                        formData.memberEmail.trim() &&
                        isValidEmail(formData.memberEmail.trim())
                          ? A
                          : "rgba(255,255,255,0.05)",
                      color:
                        formData.memberEmail.trim() &&
                        isValidEmail(formData.memberEmail.trim())
                          ? "#0a0a0a"
                          : T.sub,
                      border: "none",
                      cursor:
                        formData.memberEmail.trim() &&
                        isValidEmail(formData.memberEmail.trim())
                          ? "pointer"
                          : "default",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isCheckingEmail ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        style={{
                          width: 14,
                          height: 14,
                          border: "2px solid transparent",
                          borderTopColor: "currentColor",
                          borderRadius: "50%",
                        }}
                      />
                    ) : (
                      <Plus size={16} style={{ color: "inherit" }} />
                    )}
                  </button>
                </div>
                {members.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {members.map((member, i) => {
                      const init = (member.name || member.email)
                        .slice(0, 2)
                        .toUpperCase();
                      const color =
                        MEMBER_COLORS[i % MEMBER_COLORS.length];
                      return (
                        <div
                          key={member.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            background: `${color}14`,
                            border: `1px solid ${color}33`,
                            borderRadius: 99,
                            padding: "5px 10px 5px 5px",
                          }}
                        >
                          <Avatar
                            init={init}
                            color={color}
                            size={22}
                          />
                          <span
                            style={{
                              fontSize: 12,
                              color,
                              fontWeight: 700,
                            }}
                          >
                            {(member.name || member.email).split(" ")[0] ||
                              (member.name || member.email).slice(0, 8)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeMember(member.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: `${color}88`,
                              cursor: "pointer",
                              fontSize: 12,
                              display: "flex",
                              alignItems: "center",
                              marginLeft: 2,
                            }}
                          >
                            <Icons.x />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <Card style={{ maxHeight: 220, overflowY: "auto" }}>
                  {members.length === 0 ? (
                    <div
                      style={{
                        padding: 24,
                        textAlign: "center",
                        color: T.sub,
                        fontSize: 13,
                      }}
                    >
                      Add members by entering their email above.
                    </div>
                  ) : (
                    members.map((member, idx) => {
                      const init = (member.name || member.email)
                        .slice(0, 2)
                        .toUpperCase();
                      const color =
                        MEMBER_COLORS[idx % MEMBER_COLORS.length];
                      return (
                        <div
                            key={member.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "13px 18px",
                            borderBottom:
                              idx < members.length - 1
                                ? "1px solid rgba(255,255,255,0.05)"
                                : "none",
                          }}
                        >
                          <Avatar
                            init={init}
                            color={color}
                            size={36}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: T.bright,
                              }}
                            >
                              {member.name || member.email}
                            </p>
                            <p
                              style={{
                                fontSize: 12,
                                color: T.sub,
                              }}
                            >
                              {member.email}
                            </p>
                          </div>
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 8,
                              border: `1.5px solid ${color}`,
                              background: color,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: `0 0 10px ${color}44`,
                            }}
                          >
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#0a0a0a"
                              strokeWidth="3"
                              strokeLinecap="round"
                            >
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          </div>
                        </div>
                      );
                    })
                  )}
                </Card>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    style={{
                      flex: 1,
                      padding: 13,
                      background: "rgba(255,255,255,0.05)",
                      color: T.body,
                      border: "1px solid rgba(255,255,255,0.09)",
                      borderRadius: 14,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    style={{
                      flex: 2,
                      padding: 13,
                      background: groupColor,
                      color: "#0a0a0a",
                      border: "none",
                      borderRadius: 14,
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.2s",
                    }}
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <p style={{ color: T.muted, fontSize: 14 }}>
                  Review your group before creating.
                </p>
                <div
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 18,
                    padding: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      padding: 3,
                      borderRadius: 18,
                      background: `${groupColor}22`,
                      border: `2px solid ${groupColor}44`,
                      boxShadow: `0 0 20px ${groupColor}33`,
                    }}
                  >
                    <GroupAvatar
                      items={[
                        { init: "Y", color: groupColor },
                        ...members.slice(0, 3).map((m, i) => ({
                          init: (m.name || m.email).slice(0, 2).toUpperCase(),
                          color: MEMBER_COLORS[i % MEMBER_COLORS.length],
                        })),
                      ]}
                      size={58}
                      radius={14}
                                  />
                                </div>
                  <div>
                    <p
                      style={{
                        fontSize: 19,
                        fontWeight: 800,
                        color: "#fff",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {formData.name || "New Group"}
                    </p>
                    <p
                      style={{
                        fontSize: 13,
                        color: T.mid,
                        marginTop: 4,
                      }}
                    >
                      {members.length + 1} member
                      {members.length !== 0 ? "s" : ""}
                    </p>
                  </div>
                                </div>
                <div
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 16,
                    padding: "15px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div>
                    <p
                      style={{
                        color: T.sub,
                        fontSize: 11,
                        fontWeight: 700,
                        marginBottom: 4,
                        letterSpacing: "0.05em",
                      }}
                    >
                      DEFAULT SETTLEMENT
                    </p>
                    <p
                      style={{
                        color: T.bright,
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {resolver
                        ? `${resolver.symbol}${resolver.chainId ? ` · ${resolver.name}` : ""}`
                        : "USD (Fiat)"}
                                </p>
                              </div>
                            </div>
                <div>
                  <label style={lbl}>Members</label>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: `${groupColor}14`,
                        border: `1px solid ${groupColor}33`,
                        borderRadius: 99,
                        padding: "5px 12px 5px 5px",
                      }}
                    >
                      <Avatar init="Y" color={groupColor} size={24} />
                      <span
                        style={{
                          fontSize: 12,
                          color: groupColor,
                          fontWeight: 700,
                        }}
                      >
                        You
                      </span>
                    </div>
                    {members.map((m, i) => {
                      const color = MEMBER_COLORS[i % MEMBER_COLORS.length];
                      const init = (m.name || m.email)
                        .slice(0, 2)
                        .toUpperCase();
                      return (
                        <div
                          key={m.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            background: `${color}14`,
                            border: `1px solid ${color}33`,
                            borderRadius: 99,
                            padding: "5px 12px 5px 5px",
                          }}
                        >
                          <Avatar init={init} color={color} size={24} />
                          <span
                            style={{
                              fontSize: 12,
                              color,
                              fontWeight: 700,
                            }}
                          >
                            {(m.name || m.email).split(" ")[0] ||
                              (m.name || m.email).slice(0, 8)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
              </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    style={{
                      flex: 1,
                      padding: 13,
                      background: "rgba(255,255,255,0.05)",
                      color: T.body,
                      border: "1px solid rgba(255,255,255,0.09)",
                      borderRadius: 14,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    ← Back
                  </button>
              <button
                type="submit"
                disabled={createGroupMutation.isPending}
                    style={{
                      flex: 2,
                      padding: 13,
                      background: createGroupMutation.isPending
                        ? "rgba(255,255,255,0.05)"
                        : groupColor,
                      color: createGroupMutation.isPending ? "#555" : "#0a0a0a",
                      border: "none",
                      borderRadius: 14,
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: createGroupMutation.isPending
                        ? "default"
                        : "pointer",
                      fontFamily: "inherit",
                      boxShadow: `0 0 24px ${groupColor}44`,
                      transition: "all 0.2s",
                    }}
                  >
                    {createGroupMutation.isPending
                      ? "Creating…"
                      : "Create Group ✓"}
              </button>
                </div>
              </div>
            )}
            </form>
          </div>
        </div>
    </AnimatePresence>
  );
}
