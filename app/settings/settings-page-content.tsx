"use client";

import React from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Currency } from "@/features/currencies/api/client";
import type { Wallet } from "@/features/wallets/api/client";
import CurrencyDropdown from "@/components/currency-dropdown";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AddWalletModal } from "@/components/add-wallet-modal";
import type { User } from "@/api-helpers/modelSchema/UserSchema";
import { Card, Btn, T, Icons, A, getUserColor } from "@/lib/splito-design";

export interface SettingsPageContentProps {
  user: User;
  displayName: string;
  setDisplayName: (v: string) => void;
  preferredCurrency: string;
  setPreferredCurrency: (v: string) => void;
  hasChanges: boolean;
  handleSaveChanges: () => void;
  isUpdatatingUser: boolean;
  wallets: Wallet[];
  handleRemoveWallet: (walletId: string) => void;
  handleSetAsPrimary?: (walletId: string) => void;
  getChainName: (chainId: string) => string;
  isAddingWallet: boolean;
  isWalletModalOpen: boolean;
  setIsWalletModalOpen: (v: boolean) => void;
  isRemovingWallet: boolean;
  isRemoveConfirmOpen: boolean;
  confirmRemoveWallet: () => void;
  cancelRemoveWallet: () => void;
  isUploadingImage: boolean;
  uploadProgress: number;
  uploadError: string;
  handleImageUpload: (file: File) => void;
  selectedCurrencies: string[];
  setSelectedCurrencies: (v: string[]) => void;
  isLoadingWallets: boolean;
  onLogout?: () => void;
  isLoggingOut?: boolean;
}

export function SettingsPageContent(props: SettingsPageContentProps) {
  const {
    user,
    displayName,
    setDisplayName,
    preferredCurrency,
    setPreferredCurrency,
    hasChanges,
    handleSaveChanges,
    isUpdatatingUser,
    wallets,
    handleRemoveWallet,
    handleSetAsPrimary,
    getChainName,
    isAddingWallet,
    isWalletModalOpen,
    setIsWalletModalOpen,
    isRemovingWallet,
    isRemoveConfirmOpen,
    confirmRemoveWallet,
    cancelRemoveWallet,
    isUploadingImage,
    uploadProgress,
    uploadError,
    handleImageUpload,
    selectedCurrencies,
    setSelectedCurrencies,
    isLoadingWallets,
    onLogout,
    isLoggingOut = false,
  } = props;

  const [notificationsOn, setNotificationsOn] = React.useState(true);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const set = () => setIsMobile(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  const SLabel = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <div
      style={{
        color: T.soft,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        marginBottom: 14,
        marginTop: 28,
        paddingBottom: 10,
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        ...style,
      }}
    >
      {children}
    </div>
  );

  const Row = ({
    children,
    style = {},
    onClick,
  }: {
    children: React.ReactNode;
    style?: React.CSSProperties;
    onClick?: () => void;
  }) => (
    <div
      role={onClick ? "button" : undefined}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "17px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );

  const Toggle = ({
    on,
    onChange,
  }: {
    on: boolean;
    onChange: () => void;
  }) => (
    <div
      onClick={onChange}
      role="switch"
      aria-checked={on}
      style={{
        width: 44,
        height: 26,
        borderRadius: 99,
        background: on ? A : "rgba(255,255,255,0.1)",
        cursor: "pointer",
        position: "relative",
        transition: "all 0.25s",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          position: "absolute",
          top: 3,
          left: on ? 21 : 3,
          transition: "left 0.25s",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
      />
    </div>
  );

  const userEmail = user?.email ?? "";
  const userInitial = (displayName || user?.name || "Y").charAt(0).toUpperCase();

  // Chain metadata (matching design artifact)
  const CHAIN_META: Record<string, { color: string; icon: string }> = {
    Aptos: { color: "#22D3EE", icon: "⬡" },
    Ethereum: { color: "#818CF8", icon: "◆" },
    Base: { color: "#3B82F6", icon: "🔵" },
    Solana: { color: "#A78BFA", icon: "◎" },
    Stellar: { color: "#34D399", icon: "✦" },
    Polygon: { color: "#A855F7", icon: "⬟" },
  };

  const getChainMeta = (chainName: string) => {
    return CHAIN_META[chainName] || { color: "#666", icon: "◆" };
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 28px", display: "flex", alignItems: "center", height: 70, position: "sticky", top: 0, background: "rgba(11,11,11,0.95)", backdropFilter: "blur(20px)", zIndex: 40 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>Settings</h1>
      </div>
      <div style={{ flex: 1, padding: "26px 28px", overflowY: "auto", maxWidth: 660 }}>
          <SLabel>Profile</SLabel>
          <Card style={{ padding: "22px", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22, paddingBottom: 22, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ position: "relative" }}>
                <label htmlFor="profile-upload" style={{ cursor: isUploadingImage ? "not-allowed" : "pointer", display: "block" }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: `${getUserColor(user?.name || "You")}1a`,
                      border: `2px solid ${getUserColor(user?.name || "You")}44`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      fontWeight: 800,
                      color: getUserColor(user?.name || "You"),
                      overflow: "hidden",
                    }}
                  >
                    {user.image ? (
                      <Image src={user.image} alt="Profile" width={64} height={64} className="h-full w-full object-cover" />
                    ) : (
                      <span>{userInitial}</span>
                    )}
                  </div>
                  {isUploadingImage && (
                    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.7)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                      <span style={{ fontSize: 10, color: "#fff" }}>{uploadProgress}%</span>
                    </div>
                  )}
                  <button
                    type="button"
                    style={{
                      position: "absolute",
                      bottom: -2,
                      right: -2,
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "#222",
                      border: "1.5px solid rgba(255,255,255,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: isUploadingImage ? "not-allowed" : "pointer",
                      color: T.body,
                    }}
                    onClick={(e) => { e.preventDefault(); document.getElementById("profile-upload")?.click(); }}
                  >
                    {Icons.camera({ size: 12 })}
                  </button>
                  <input
                    id="profile-upload"
                    type="file"
                    accept="image/png, image/jpeg"
                    className="hidden"
                    disabled={isUploadingImage}
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); }}
                  />
                </label>
                {uploadError && <p style={{ fontSize: 11, color: "#F87171", margin: "4px 0 0 0" }}>{uploadError}</p>}
              </div>
              <div>
                <p style={{ color: T.bright, fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em" }}>{displayName || "You"}</p>
                <p style={{ color: T.muted, fontSize: 12, fontWeight: 500, marginTop: 2 }}>{userEmail || "you@email.com"}</p>
              </div>
            </div>
            <Row>
              <span style={{ color: T.body, fontSize: 14, fontWeight: 600 }}>Display Name</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.09)", borderRadius: 12, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit", width: 220, fontWeight: 500 }}
              />
            </Row>
            <Row style={{ borderBottom: "none" }}>
              <span style={{ color: T.body, fontSize: 14, fontWeight: 600 }}>Email</span>
              <input
                value={userEmail}
                onChange={(e) => {}}
                style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.09)", borderRadius: 12, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit", width: 220, fontWeight: 500 }}
              />
            </Row>
            <div style={{ paddingTop: 18, display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={handleSaveChanges}
                disabled={isUpdatatingUser}
                style={{ background: A, border: "none", borderRadius: 12, padding: "10px 22px", color: "#0a0a0a", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
              >
                Save Changes
              </button>
            </div>
          </Card>

          <SLabel>Preferences</SLabel>
          <Card style={{ padding: "0 22px" }}>
            <Row>
              <div>
                <p style={{ color: T.bright, fontSize: 14, fontWeight: 600 }}>Notifications</p>
                <p style={{ color: T.muted, fontSize: 12, marginTop: 2, fontWeight: 500 }}>Email reminders and updates</p>
              </div>
              <Toggle on={notificationsOn} onChange={() => setNotificationsOn((p) => !p)} />
            </Row>
            <Row style={{ borderBottom: "none", alignItems: "center" }}>
              <p style={{ color: T.bright, fontSize: 14, fontWeight: 600 }}>Default Currency</p>
              <div style={{ minWidth: 220 }}>
                <CurrencyDropdown
                  selectedCurrencies={preferredCurrency ? [preferredCurrency] : []}
                  setSelectedCurrencies={(currencies) => setPreferredCurrency(currencies[0] || "")}
                  mode="single"
                  showFiatCurrencies={true}
                  filterCurrencies={(currency: Currency) => currency.symbol !== "ETH" && currency.symbol !== "USDC"}
                  disableChainCurrencies={true}
                />
              </div>
            </Row>
          </Card>

          {wallets.length > 0 && !isMobile && (
            <>
              <SLabel>Accept Payments in</SLabel>
              <Card className="p-[22px] mb-4" id="settings-accept-payments-tokens">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p style={{ color: T.muted, fontSize: 12, marginBottom: 12 }}>Select the tokens you want to accept payments in</p>
                    </TooltipTrigger>
                    <TooltipContent><p>Based on your connected wallets</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <CurrencyDropdown
                  selectedCurrencies={selectedCurrencies}
                  setSelectedCurrencies={setSelectedCurrencies}
                  filterCurrencies={(currency: Currency) =>
                    currency.symbol !== "ETH" &&
                    currency.symbol !== "USDC" &&
                    wallets.some((w) => w.chainId === currency.chainId)
                  }
                  showFiatCurrencies={false}
                />
              </Card>
            </>
          )}

          <SLabel>Security</SLabel>
          <Card style={{ padding: "0 22px" }}>
            <Row
              style={{ borderBottom: "none", cursor: "pointer" }}
              onClick={() => { if (typeof window !== "undefined") window.location.href = "/settings/change-password"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: T.body, display: "flex" }}>{Icons.shield({})}</span>
                <p style={{ color: T.bright, fontSize: 14, fontWeight: 600 }}>Change Password</p>
              </div>
              <span style={{ color: T.dim, display: "flex" }}>{Icons.chevR({})}</span>
            </Row>
          </Card>

          <SLabel>Connected Wallets</SLabel>
          <Card style={{ marginBottom: 4 }}>
            {isLoadingWallets ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "28px" }}>
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: T.muted }} />
              </div>
            ) : wallets.length > 0 ? (
              wallets.map((wallet, idx) => {
                const chainName = getChainName(wallet.chainId);
                const meta = getChainMeta(chainName);
                const addr = wallet.address || "";
                const truncatedAddress = addr.length > 14 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
                return (
                  <div
                    key={wallet.id}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "17px 22px", borderBottom: idx < wallets.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", minWidth: 0 }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: `${meta.color}18`, border: `1.5px solid ${meta.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, color: "#fff" }}>
                      {meta.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: T.bright }}>{chainName}</p>
                        {(wallet.isDefault || wallets.length === 1) && (
                          <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 99, fontWeight: 700, background: `${A}1a`, color: A, border: `1px solid ${A}2a` }}>Primary</span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: T.muted, fontFamily: "monospace", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={addr}>
                        {truncatedAddress}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
                      {!wallet.isDefault && wallets.length > 1 && handleSetAsPrimary && (
                        <button
                          onClick={() => handleSetAsPrimary(wallet.id)}
                          className="abtn"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.11)", borderRadius: 10, padding: "7px 14px", color: T.body, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}
                        >
                          Set Primary
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveWallet(wallet.id)}
                        style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: 10, padding: "7px 12px", color: "#F87171", fontSize: 11, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}
                      >
                        {Icons.trash({})} Remove
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: "24px 22px", color: T.body, fontSize: 13 }}>You don&apos;t have any wallets yet.</div>
            )}
          </Card>
          <button
            id="settings-add-wallet-button"
            onClick={() => setIsWalletModalOpen(true)}
            disabled={isAddingWallet}
            className="abtn"
            style={{ width: "100%", padding: "14px", background: "rgba(255,255,255,0.03)", border: "1.5px dashed rgba(255,255,255,0.12)", borderRadius: 18, color: T.muted, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s", marginTop: 10 }}
          >
            {Icons.plus({})} Add Wallet
          </button>

          <SLabel>Account</SLabel>
          <Card style={{ padding: "0 22px" }}>
            <Row
              style={{
                borderBottom: "none",
                cursor: onLogout && !isLoggingOut ? "pointer" : undefined,
                opacity: isLoggingOut ? 0.7 : 1,
              }}
              onClick={() => !isLoggingOut && onLogout?.()}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "#F87171", display: "flex" }}>{Icons.logout({})}</span>
                <p style={{ color: "#F87171", fontSize: 14, fontWeight: 700 }}>Sign Out</p>
              </div>
              <span style={{ color: T.dim, display: "flex" }}>{Icons.chevR({})}</span>
            </Row>
          </Card>
          <div style={{ height: 40 }} />
        </div>

        {/* Add Wallet Modal */}
        <AddWalletModal
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
        />

        {/* Remove Wallet Confirmation Modal – design */}
        <AnimatePresence>
          {isRemoveConfirmOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={cancelRemoveWallet}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
                style={{
                  background: "linear-gradient(145deg, #111 0%, #0d0d0d 100%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow:
                    "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
              >
                <div className="text-center">
                  <h3
                    className="text-xl font-semibold mb-2"
                    style={{ color: T.bright }}
                  >
                    Remove Wallet
                  </h3>
                  <p className="mb-6" style={{ color: T.body, fontSize: 14 }}>
                    Are you sure you want to remove this wallet? This action
                    cannot be undone.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Btn variant="ghost" onClick={cancelRemoveWallet}>
                      Cancel
                    </Btn>
                    <Btn
                      variant="danger"
                      onClick={confirmRemoveWallet}
                      style={{
                        opacity: isRemovingWallet ? 0.7 : 1,
                        cursor: isRemovingWallet ? "not-allowed" : "pointer",
                      }}
                    >
                      {isRemovingWallet ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Removing...</span>
                        </>
                      ) : (
                        <>
                          {Icons.trash({ size: 14 })}
                          <span>Remove Wallet</span>
                        </>
                      )}
                    </Btn>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
    </div>
  );
}
