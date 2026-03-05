"use client";

import { motion } from "framer-motion";
import { staggerContainer, slideUp } from "@/utils/animations";
import { useGetFriends } from "@/features/friends/hooks/use-get-friends";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { toast } from "sonner";
import { useEffect } from "react";
import { ApiError } from "@/types/api-error";
import { UserPlus } from "lucide-react";
import { Card, Avatar, Icons, T, fmt, G } from "@/lib/splito-design";

const AVATAR_COLORS = [
  "#A78BFA",
  "#34D399",
  "#FB923C",
  "#F472B6",
  "#FBBF24",
  "#22D3EE",
  "#F87171",
  "#818CF8",
];

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

export function FriendsList({ search = "" }: { search?: string }) {
  const { data: friends, isLoading, error } = useGetFriends();
  const router = useRouter();

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
          onClick={() =>
            document.dispatchEvent(new CustomEvent("open-add-friend-modal"))
          }
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
            />
          ))}
        </motion.div>
      )}
    </Card>
  );
}

function FriendRow({
  friend,
  index,
  isLast,
}: {
  friend: {
    id: string;
    name: string;
    email?: string | null;
    balances?: Array<{ currency: string; amount: number }>;
  };
  index: number;
  isLast: boolean;
}) {
  const balance = getFriendBalance(friend.balances);
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const init = getInitials(friend.name);

  return (
    <motion.div
      variants={slideUp}
      className="rw"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "15px 24px",
        borderBottom: isLast
          ? "none"
          : "1px solid rgba(255,255,255,0.06)",
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
          className="sbtn shrink-0"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.11)",
            borderRadius: 12,
            padding: "8px 10px",
            color: T.body,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.11)",
            borderRadius: 12,
            padding: "8px 10px",
            color: T.body,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {Icons.bell({})} Remind
        </button>
      )}
      <div
        className="shrink-0 text-right"
        style={{ minWidth: 64 }}
      >
        {balance === 0 ? (
          <p style={{ color: T.dim, fontSize: 12, fontWeight: 600 }}>Settled</p>
        ) : balance > 0 ? (
          <>
            <p
              style={{
                color: G,
                fontSize: 14,
                fontWeight: 800,
                fontFamily: "'DM Mono',monospace",
              }}
            >
              +{fmt(balance)}
            </p>
            <p
              style={{
                color: "rgba(52,211,153,0.6)",
                fontSize: 11,
                marginTop: 2,
                fontWeight: 600,
              }}
            >
              owes you
            </p>
          </>
        ) : (
          <>
            <p
              style={{
                color: "#F87171",
                fontSize: 14,
                fontWeight: 800,
                fontFamily: "'DM Mono',monospace",
              }}
            >
              -{fmt(Math.abs(balance))}
            </p>
            <p
              style={{
                color: "rgba(248,113,113,0.6)",
                fontSize: 11,
                marginTop: 2,
                fontWeight: 600,
              }}
            >
              you owe
            </p>
          </>
        )}
      </div>
    </motion.div>
  );
}
