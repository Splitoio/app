"use client";

import { FriendsList } from "@/components/friends-list";
import { useState } from "react";
import { Card, Icons } from "@/lib/splito-design";
import { toast } from "sonner";
import { useGetAllGroups } from "@/features/groups/hooks/use-create-group";
import { createGroupInviteLink } from "@/features/groups/api/client";
import { useAddFriend } from "@/features/friends/hooks/use-add-friend";
import { isValidEmail } from "@/utils/validation";
import { Loader2 } from "lucide-react";

export default function FriendsPage() {
  const [inviteLinkModalOpen, setInviteLinkModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [search, setSearch] = useState("");
  const { data: groups = [], isLoading: groupsLoading } = useGetAllGroups({ type: "PERSONAL" });
  const { mutate: addFriend, isPending: isInviting } = useAddFriend();

  const handleInviteClick = () => {
    const value = inviteEmail.trim();
    if (!value) {
      toast.error("Please enter an email address");
      return;
    }
    if (!isValidEmail(value)) {
      toast.error("Please enter a valid email address (e.g. name@example.com)");
      return;
    }
    addFriend(value, {
      onSuccess: (data: { message?: string }) => {
        setInviteEmail("");
        toast.success(data?.message || "Friend invited successfully");
      },
      onError: (error: { message?: string }) => {
        toast.error(error?.message || "Failed to invite friend");
      },
    });
  };

  const handleCopyInviteLinkClick = () => {
    setInviteLinkModalOpen(true);
  };

  const handleSelectGroupForInvite = async (groupId: string) => {
    try {
      const res = await createGroupInviteLink(groupId);
      const link = res?.inviteLink;
      if (!link) throw new Error("No link returned");
      await navigator.clipboard.writeText(link);
      toast.success("Invite link copied. Anyone who opens it will join the group.");
      setInviteLinkModalOpen(false);
    } catch {
      toast.error("Could not create or copy invite link");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Desktop header (unchanged) */}
      <div
        className="border-b border-white/[0.07] px-7 sticky top-0 bg-[#0b0b0b]/95 backdrop-blur-xl z-10 hidden sm:flex items-center h-[70px]"
      >
        <h1 className="text-[18px] sm:text-[20px] font-extrabold tracking-[-0.02em] text-white">
          Friends
        </h1>
      </div>
      <div className="flex-1 p-4 sm:p-7 overflow-y-auto">
        {/* Mobile status bar + header */}
        <div className="sm:hidden mb-3">
          
          <div className="pb-2 px-0">
            <p className="text-[13px] font-medium text-white/60">Friends & balances</p>
            <h1 className="text-[26px] font-black tracking-[-0.04em] text-white mt-1">
              Friends
            </h1>
          </div>
        </div>
        {/* Mobile invite card (cyan-tinted) */}
        {/* <div
          id="invite-friends-section"
          className="sm:hidden rounded-[20px] p-4 mb-5"
          style={{
            background: "linear-gradient(135deg,rgba(34,211,238,0.08),rgba(34,211,238,0.03))",
            border: "1px solid rgba(34,211,238,0.15)",
          }}
        >
          <p className="text-[15px] font-extrabold mb-0.5 tracking-[-0.01em]" style={{ color: "#fff" }}>
            Invite Friends
          </p>
          <p className="text-[12px] font-medium mb-4" style={{ color: "rgba(34,211,238,0.6)" }}>
            Split expenses with anyone in seconds
          </p>
          <div className="flex gap-2">
            <input
              placeholder="Email address…"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInviteClick()}
              disabled={isInviting}
              className="flex-1 rounded-xl py-3 px-3.5 text-[13px] font-medium text-white outline-none border border-white/[0.09] bg-[#0A0F12] disabled:opacity-70"
            />
            <button
              onClick={handleInviteClick}
              disabled={isInviting || !inviteEmail.trim()}
              className="rounded-xl py-2.5 px-4 text-[13px] font-extrabold text-[#0a0a0a] transition-all hover:opacity-90 disabled:opacity-70 flex items-center justify-center gap-1.5 min-w-[80px]"
              style={{ background: "#22D3EE" }}
            >
              {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3.5">
            <div className="flex-1 h-px" style={{ background: "rgba(34,211,238,0.15)" }} />
            <span className="text-[11px] font-semibold" style={{ color: "rgba(34,211,238,0.5)" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "rgba(34,211,238,0.15)" }} />
          </div>
          <button
            type="button"
            onClick={handleCopyInviteLinkClick}
            className="w-full mt-3.5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-all"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#d4d4d4",
            }}
          >
            <Icons.link /> Copy invite link
          </button>
        </div> */}

        {/* Desktop invite card (original) */}
        {/* <div id="invite-friends-section-desktop" className="hidden sm:block mb-6">
          <Card className="p-[22px]">
            <p className="text-[15px] font-extrabold text-[#f5f5f5] mb-1 tracking-[-0.01em]">
              Invite a Friend
            </p>
            <p className="text-[12px] font-medium mb-4" style={{ color: "#999" }}>
              Share a link or invite by email
            </p>
            <div className="flex gap-2">
              <input
                placeholder="friend@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInviteClick()}
                disabled={isInviting}
                className="flex-1 rounded-xl py-2.5 px-3.5 text-[13px] font-medium text-white outline-none border border-white/[0.09] bg-white/[0.05] disabled:opacity-70"
              />
              <button
                onClick={handleInviteClick}
                disabled={isInviting || !inviteEmail.trim()}
                className="rounded-xl py-2.5 px-4 text-[13px] font-extrabold text-[#0a0a0a] transition-all hover:opacity-90 disabled:opacity-70 flex items-center justify-center gap-1.5 min-w-[80px]"
                style={{ background: "#22D3EE" }}
              >
                {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-3.5">
              <div className="flex-1 h-px bg-white/[0.07]" />
              <span className="text-[11px] font-semibold" style={{ color: "#888" }}>or</span>
              <div className="flex-1 h-px bg-white/[0.07]" />
            </div>
            <button
              type="button"
              onClick={handleCopyInviteLinkClick}
              className="splito-abtn w-full mt-3.5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-1.5 border border-white/[0.09] bg-white/[0.05] text-[#d4d4d4] transition-all"
            >
              <Icons.link /> Copy invite link
            </button>
          </Card>
        </div> */}

        {/* YOUR FRIENDS label — mobile only */}
        <p
          className="sm:hidden mb-3"
          style={{ color: "#666", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
        >
          YOUR FRIENDS
        </p>
        <div
          className="flex items-center gap-2 rounded-[14px] py-2.5 px-4 mb-4 sm:mb-5 border border-white/[0.08] bg-white/[0.04]"
        >
          <span className="text-[#999]">{Icons.search({})}</span>
          <input
            placeholder="Search friends…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none text-white text-[14px] outline-none font-medium"
          />
        </div>
        <FriendsList
          search={search}
          onAddFriendClick={() =>
            document.getElementById("invite-friends-section")?.scrollIntoView({ behavior: "smooth" }) ||
            document.getElementById("invite-friends-section-desktop")?.scrollIntoView({ behavior: "smooth" })
          }
        />
      </div>
      {/* Modal: pick group for invite link */}
      {inviteLinkModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setInviteLinkModalOpen(false)}
        >
          <div
            className="rounded-2xl border border-white/[0.09] bg-[#141416] p-5 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[15px] font-extrabold text-white mb-1">Copy invite link</p>
            <p className="text-[12px] font-medium mb-4" style={{ color: "#999" }}>
              Choose a group. The link will add people to that group when they open it.
            </p>
            {groupsLoading ? (
              <p className="text-white/60 text-sm py-4">Loading groups…</p>
            ) : groups.length === 0 ? (
              <p className="text-white/60 text-sm py-4">Create a group first to share an invite link.</p>
            ) : (
              <ul className="space-y-1.5 max-h-56 overflow-y-auto">
                {groups.map((g: { id: string; name: string }) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectGroupForInvite(g.id)}
                      className="w-full text-left py-2.5 px-3 rounded-xl text-[13px] font-medium text-white border border-white/[0.09] bg-white/[0.05] hover:bg-white/[0.08] transition-colors"
                    >
                      {g.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setInviteLinkModalOpen(false)}
              className="mt-4 w-full py-2 rounded-xl text-[13px] font-semibold text-white/70 hover:text-white border border-white/[0.09]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
