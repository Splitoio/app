"use client";

import { motion } from "framer-motion";
import { staggerContainer, slideUp } from "@/utils/animations";
import { useGetFriends } from "@/features/friends/hooks/use-get-friends";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { ApiError } from "@/types/api-error";
import { UserPlus } from "lucide-react";
import { Card, Avatar, Icons, T, fmt, G, getUserColor } from "@/lib/splito-design";
import { SettleDebtsModal } from "@/components/settle-debts-modal";
import { useAuthStore } from "@/stores/authStore";
import { useGetAllGroups } from "@/features/groups/hooks/use-create-group";


function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

function getFriendBalance(
  balances: Array<{ currency: string; amount: number }> | undefined
): number {
  if (!balances?.length) return 0;
  return balances.reduce((sum, b) => sum + b.amount, 0);
}

export function FriendsList({
  search = "",
  onAddFriendClick,
}: { search?: string; onAddFriendClick?: () => void }) {
  const { data: friends, isLoading, error } = useGetFriends();
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: groups = [] } = useGetAllGroups({ type: "PERSONAL" });
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      const apiError = error as ApiError;
      const statusCode =
        apiError.response?.status || apiError.status || apiError.code;

      if (statusCode === 401) {
        Cookies.remove("sessionToken");
        router.push("/login");
        toast.error("Session expired. Please log in again.");
      } else if (error) {
        toast.error("An unexpected error occurred.");
      }
    }
  }, [error, router]);

  // Find the group that has a balance with this friend
  const getGroupForFriend = (friendId: string) => {
    const sharedGroups = groups.filter((g) =>
      (g.groupUsers ?? []).some(
        (gu: { userId?: string; user?: { id: string } }) =>
          gu.userId === friendId || gu.user?.id === friendId
      )
    );
    return (
      sharedGroups.find((g) =>
        (g.groupBalances ?? []).some(
          (b) => b.firendId === friendId && b.amount !== 0
        )
      ) ?? sharedGroups[0] ?? null
    );
  };

  const handleSettleFriendClick = (friendId: string) => {
    setSelectedFriendId(friendId);
    setIsSettleModalOpen(true);
  };

  const selectedGroup = selectedFriendId ? getGroupForFriend(selectedFriendId) : null;

  const searchLower = search.trim().toLowerCase();
  const filtered =
    friends?.filter(
      (f) =>
        !searchLower ||
        f.name.toLowerCase().includes(searchLower) ||
        (f.email ?? "").toLowerCase().includes(searchLower)
    ) ?? [];

  if (isLoading) {
    return (
      <Card style={{ padding: "28px" }}>
        <p
          style={{
            color: T.body,
            fontSize: 14,
            textAlign: "center",
            margin: 0,
          }}
        >
          Loading friends...
        </p>
      </Card>
    );
  }

  if (!friends?.length) {
    return (
      <Card
        style={{
          padding: "48px 28px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <p style={{ color: T.bright, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          No friends added yet
        </p>
        <p style={{ color: T.muted, fontSize: 14, marginBottom: 24, maxWidth: 360 }}>
          Add friends to start tracking expenses and settle debts together
        </p>
        <button
          onClick={() => onAddFriendClick?.()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            borderRadius: 99,
            background: "#fff",
            color: "#0a0a0a",
            height: 44,
            paddingLeft: 20,
            paddingRight: 20,
            fontSize: 14,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <UserPlus size={18} strokeWidth={1.5} />
          Add Friend
        </button>
      </Card>
    );
  }

  return (
    <Card>
      {filtered.length === 0 ? (
        <div
          style={{
            padding: "28px 24px",
            color: T.muted,
            fontSize: 14,
            textAlign: "center",
          }}
        >
          No friends match &quot;{search}&quot;
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          style={{ overflow: "hidden" }}
        >
          {filtered.map((friend, idx) => (
            <FriendRow
              key={friend.id}
              friend={friend}
              index={idx}
              isLast={idx === filtered.length - 1}
              onSettleClick={() => handleSettleFriendClick(friend.id)}
            />
          ))}
        </motion.div>
      )}
      {selectedGroup && (
        <SettleDebtsModal
          isOpen={isSettleModalOpen}
          onClose={() => {
            setIsSettleModalOpen(false);
            setSelectedFriendId(null);
          }}
          showIndividualView={false}
          groupId={selectedGroup.id}
          balances={selectedGroup.groupBalances ?? []}
          members={(selectedGroup.groupUsers ?? []).map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (gu: any) => gu.user ?? { id: "", name: null }
          )}
          defaultCurrency={user?.currency || selectedGroup.defaultCurrency || "USD"}
          defaultExpandedMemberId={selectedFriendId}
        />
      )}
    </Card>
  );
}

function FriendRow({
  friend,
  index,
  isLast,
  onSettleClick,
}: {
  friend: {
    id: string;
    name: string;
    email?: string | null;
    balances?: Array<{ currency: string; amount: number }>;
  };
  index: number;
  isLast: boolean;
  onSettleClick: () => void;
}) {
  const balance = getFriendBalance(friend.balances);
  const color = getUserColor(friend.name);
  const init = getInitials(friend.name);

  return (
    <motion.div variants={slideUp}>
      {/* Desktop layout */}
      <div
        className="rw hidden sm:flex"
        style={{
          alignItems: "center",
          gap: 14,
          padding: "15px 24px",
          borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.06)",
          transition: "background 0.15s",
          cursor: "pointer",
        }}
      >
        <Avatar init={init} color={color} size={42} />
        <div className="min-w-0 flex-1" style={{ overflow: "hidden" }}>
          <p className="truncate" style={{ fontSize: 14, fontWeight: 700, color: T.bright }}>
            {friend.name}
          </p>
          <p
            className="truncate block"
            style={{ fontSize: 12, color: T.muted, marginTop: 2, fontWeight: 500 }}
            title={friend.email ?? undefined}
          >
            {friend.email ?? ""}
          </p>
        </div>
        {balance < 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSettleClick(); }}
            className="sbtn shrink-0"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.11)",
              borderRadius: 12, padding: "8px 10px", color: T.body, fontSize: 12,
              fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {Icons.wallet({})} Settle
          </button>
        )}
        {balance > 0 && (
          <button
            type="button"
            className="abtn shrink-0"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.11)",
              borderRadius: 12, padding: "8px 10px", color: T.body, fontSize: 12,
              fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {Icons.bell({})} Remind
          </button>
        )}
        <div className="shrink-0 text-right" style={{ minWidth: 64 }}>
          {balance === 0 ? (
            <p style={{ color: T.dim, fontSize: 12, fontWeight: 600 }}>Settled</p>
          ) : balance > 0 ? (
            <>
              <p style={{ color: G, fontSize: 14, fontWeight: 800, fontFamily: "'DM Mono',monospace" }}>
                +{fmt(balance)}
              </p>
              <p style={{ color: "rgba(52,211,153,0.6)", fontSize: 11, marginTop: 2, fontWeight: 600 }}>owes you</p>
            </>
          ) : (
            <>
              <p style={{ color: "#F87171", fontSize: 14, fontWeight: 800, fontFamily: "'DM Mono',monospace" }}>
                -{fmt(Math.abs(balance))}
              </p>
              <p style={{ color: "rgba(248,113,113,0.6)", fontSize: 11, marginTop: 2, fontWeight: 600 }}>you owe</p>
            </>
          )}
        </div>
      </div>

      {/* Mobile layout */}
      <div
        className="rw flex sm:hidden"
        style={{
          alignItems: "center",
          gap: 14,
          padding: "15px 20px",
          borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.06)",
          transition: "background 0.15s",
        }}
      >
        <Avatar init={init} color={color} size={44} />
        <div className="min-w-0 flex-1" style={{ overflow: "hidden" }}>
          <p className="truncate" style={{ fontSize: 14, fontWeight: 700, color: T.bright }}>
            {friend.name}
          </p>
          <p
            className="truncate block"
            style={{ fontSize: 12, marginTop: 2, fontWeight: 600, color: balance === 0 ? T.dim : balance > 0 ? G : "#F87171" }}
          >
            {balance === 0 ? "Settled up" : balance > 0 ? `Owes you ${fmt(balance)}` : `You owe ${fmt(Math.abs(balance))}`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {balance > 0 && (
            <button
              type="button"
              className="abtn shrink-0"
              style={{ borderRadius: 10, padding: "7px 14px", border: "1px solid rgba(52,211,153,0.3)", background: "rgba(52,211,153,0.06)", color: G, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              Remind
            </button>
          )}
          {balance < 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSettleClick(); }}
              className="sbtn shrink-0"
              style={{ borderRadius: 10, padding: "7px 14px", border: "1px solid rgba(34,211,238,0.3)", background: "rgba(34,211,238,0.06)", color: "#22D3EE", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              Settle
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
