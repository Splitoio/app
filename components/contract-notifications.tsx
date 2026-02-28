"use client";

import { useRef, useState, useEffect } from "react";
import { Bell, FileText, ChevronRight } from "lucide-react";
import { useGetMyContracts, useGetContractById } from "@/features/business/hooks/use-contracts";
import { ContractGateModal } from "@/components/contract-gate-modal";
import type { Contract } from "@/features/business/api/client";

export function ContractNotifications() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: myContracts = [] } = useGetMyContracts();
  const pendingContracts = myContracts.filter(
    (c) => !c.signedAt && c.status !== "REJECTED"
  ) as Contract[];

  const { data: selectedContract, isLoading: selectedLoading } = useGetContractById(
    selectedContractId
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openContractGate = (contractId: string) => {
    setSelectedContractId(contractId);
    setDropdownOpen(false);
  };

  const closeModal = () => {
    setSelectedContractId(null);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors border border-white/10"
          aria-label="Contract notifications"
        >
          <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
          {pendingContracts.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 min-w-4 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center">
              {pendingContracts.length > 9 ? "9+" : pendingContracts.length}
            </span>
          )}
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-xl bg-[#101012] border border-white/20 shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white">Contract notifications</h3>
              <p className="text-white/50 text-xs mt-0.5">
                {pendingContracts.length === 0
                  ? "No pending contracts"
                  : `${pendingContracts.length} contract${pendingContracts.length !== 1 ? "s" : ""} to review`}
              </p>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {pendingContracts.length === 0 ? (
                <div className="p-4 text-center text-white/50 text-sm">
                  When you receive a contract, it will appear here.
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {pendingContracts.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => openContractGate(c.id)}
                        className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/5 transition-colors"
                      >
                        <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-white/70" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">
                            {c.title || "Contract"}
                          </p>
                          <p className="text-xs text-white/50 truncate">
                            {c.organization?.name ?? "Organization"}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-white/40 shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      <ContractGateModal
        isOpen={!!selectedContractId}
        onClose={closeModal}
        contract={selectedContract ?? null}
        isLoading={!!selectedContractId && selectedLoading}
      />
    </>
  );
}
