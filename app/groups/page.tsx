"use client";

import { GroupsList } from "@/components/groups-list";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CreateGroupForm } from "@/components/create-group-form";
import { Icons } from "@/lib/splito-design";

export default function GroupsPage() {
  const searchParams = useSearchParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handleOpenModal = () => setIsCreateModalOpen(true);
    document.addEventListener("open-create-group-modal", handleOpenModal);
    return () => document.removeEventListener("open-create-group-modal", handleOpenModal);
  }, []);

  useEffect(() => {
    if (searchParams.get("openCreate") === "1") {
      setIsCreateModalOpen(true);
      window.history.replaceState(null, "", "/groups");
    }
  }, [searchParams]);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div
        className="flex items-center justify-between sticky top-0 z-10 px-4 sm:px-7 h-14 sm:h-[70px] border-b border-white/[0.07] bg-[#0b0b0b]/95 backdrop-blur-xl"
      >
        <h1 className="text-[18px] sm:text-[20px] font-extrabold tracking-[-0.02em] text-white">
          My Groups
        </h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl text-[12px] sm:text-[13px] font-extrabold text-[#0a0a0a] transition-all hover:opacity-90 shrink-0 py-2.5 px-3 sm:py-2.5 sm:px-[18px]"
          style={{ background: "#22D3EE", gap: 6 }}
        >
          <Icons.plus /> New Group
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-7">
        <div
          className="flex items-center rounded-[14px] mb-5 sm:mb-6 py-2.5 px-4 gap-2 bg-white/[0.04] border border-white/[0.08]"
        >
          <span className="text-[#999] shrink-0">{Icons.search({ size: 18 })}</span>
          <input
            type="text"
            placeholder="Search groups…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-[14px] text-white placeholder:text-white/50 focus:outline-none font-medium"
          />
        </div>
        <GroupsList searchQuery={searchQuery} />
      </div>
      <CreateGroupForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
