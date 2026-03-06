"use client";

import { FriendsList } from "@/components/friends-list";
import { useState, useEffect } from "react";
import { AddFriendsModal } from "@/components/add-friends-modal";
import { Card, Icons } from "@/lib/splito-design";

export default function FriendsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handleOpenModal = () => setIsModalOpen(true);
    document.addEventListener("open-add-friend-modal", handleOpenModal);
    return () => document.removeEventListener("open-add-friend-modal", handleOpenModal);
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div
        className="border-b border-white/[0.07] px-4 sm:px-7 flex items-center h-14 sm:h-[70px] sticky top-0 bg-[#0b0b0b]/95 backdrop-blur-xl z-10"
      >
        <h1 className="text-[18px] sm:text-[20px] font-extrabold tracking-[-0.02em] text-white">
          Friends
        </h1>
      </div>
      <div className="flex-1 p-4 sm:p-7 overflow-y-auto">
        <div
          className="grid gap-4 sm:gap-5 mb-5 sm:mb-6"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
        >
          <Card className="p-4 sm:p-[22px]">
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
                className="flex-1 rounded-xl py-2.5 px-3.5 text-[13px] font-medium text-white outline-none border border-white/[0.09] bg-white/[0.05]"
              />
              <button
                onClick={() => setIsModalOpen(true)}
                className="rounded-xl py-2.5 px-4 text-[13px] font-extrabold text-[#0a0a0a] transition-all hover:opacity-90"
                style={{ background: "#22D3EE" }}
              >
                Invite
              </button>
            </div>
            <div className="flex items-center gap-2 mt-3.5">
              <div className="flex-1 h-px bg-white/[0.07]" />
              <span className="text-[11px] font-semibold" style={{ color: "#888" }}>or</span>
              <div className="flex-1 h-px bg-white/[0.07]" />
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="splito-abtn w-full mt-3.5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-1.5 border border-white/[0.09] bg-white/[0.05] text-[#d4d4d4] transition-all"
            >
              <Icons.link /> Copy invite link
            </button>
          </Card>
        </div>
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
        <FriendsList search={search} />
      </div>
      <AddFriendsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
