"use client";

import { GroupsList } from "@/components/groups-list";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CreateGroupForm } from "@/components/create-group-form";
import { Icons, T } from "@/lib/splito-design";

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
          style={{
            display: "flex",
            alignItems: "center",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: "11px 16px",
            marginBottom: 24,
            gap: 8
          }}
        >
          <span style={{ color: T.muted, display: "flex" }}>{Icons.search()}</span>
          <input
            placeholder="Search groups…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: 14,
              outline: "none",
              width: "100%",
              fontFamily: "inherit",
              fontWeight: 500
            }}
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
