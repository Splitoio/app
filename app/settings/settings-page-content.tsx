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
import { ChangePasswordModal } from "@/components/change-password-modal";
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
  groupCount?: number;
  friendCount?: number;
  settledCount?: number;
}

// Simple currency → flag emoji map
const CURRENCY_FLAG: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵",
  INR: "🇮🇳", CNY: "🇨🇳", AUD: "🇦🇺", CAD: "🇨🇦", CHF: "🇨🇭",
};

// Desktop Row component
function Row({
  children,
  style = {},
  onClick,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
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
}

// Section label
function SLabel({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
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
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      role="switch"
      aria-checked={on}
      style={{
        width: 50,
        height: 30,
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
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "#fff",
          position: "absolute",
          top: 3,
          left: on ? 23 : 3,
          transition: "left 0.25s",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
      />
    </div>
  );
}

// Mobile section card wrapper
function MobileCard({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Mobile row inside a card
function MobileRow({
  children,
  last = false,
  onClick,
}: {
  children: React.ReactNode;
  last?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 20px",
        borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.06)",
        cursor: onClick ? "pointer" : undefined,
      }}
    >
      {children}
    </div>
  );
}

// Section label for mobile
function MSLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        color: "#666",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        marginBottom: 10,
        marginTop: 28,
      }}
    >
      {children}
    </p>
  );
}

interface AvatarUploadProps {
  id: string;
  size: number;
  isUploadingImage: boolean;
  uploadProgress: number;
  uploadError: string;
  handleImageUpload: (file: File) => void;
  userColor: string;
  userInitial: string;
  userImage?: string | null;
}

function AvatarUpload({ id, size, isUploadingImage, uploadProgress, uploadError, handleImageUpload, userColor, userInitial, userImage }: AvatarUploadProps) {
  return (
    <div style={{ position: "relative" }}>
      <label htmlFor={id} style={{ cursor: isUploadingImage ? "not-allowed" : "pointer", display: "block" }}>
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: `${userColor}1a`,
            border: `2.5px solid ${userColor}55`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: size * 0.32,
            fontWeight: 800,
            color: userColor,
            overflow: "hidden",
          }}
        >
          {userImage ? (
            <Image src={userImage} alt="Profile" width={size} height={size} className="h-full w-full object-cover" />
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
            bottom: 0,
            right: 0,
            width: size * 0.3,
            height: size * 0.3,
            borderRadius: "50%",
            background: "#1e1e1e",
            border: "2px solid rgba(255,255,255,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: isUploadingImage ? "not-allowed" : "pointer",
            color: T.body,
          }}
          onClick={(e) => { e.preventDefault(); document.getElementById(id)?.click(); }}
        >
          {Icons.camera({ size: Math.round(size * 0.15) })}
        </button>
        <input
          id={id}
          type="file"
          accept="image/png, image/jpeg"
          className="hidden"
          disabled={isUploadingImage}
          onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); }}
        />
      </label>
      {uploadError && <p style={{ fontSize: 11, color: "#F87171", marginTop: 4, textAlign: "center" }}>{uploadError}</p>}
    </div>
  );
}

const CHAIN_META: Record<string, { color: string; icon: string }> = {
  Aptos: { color: "#22D3EE", icon: "⬡" },
  Ethereum: { color: "#818CF8", icon: "◆" },
  Base: { color: "#3B82F6", icon: "🔵" },
  Solana: { color: "#A78BFA", icon: "◎" },
  Stellar: { color: "#34D399", icon: "✦" },
  Polygon: { color: "#A855F7", icon: "⬟" },
};

function getChainMeta(chainName: string) {
  return CHAIN_META[chainName] || { color: "#666", icon: "◆" };
}

export function SettingsPageContent(props: SettingsPageContentProps) {
  const {
    user,
    displayName,
    setDisplayName,
    preferredCurrency,
    setPreferredCurrency,
    hasChanges: _hasChanges,
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
    groupCount = 0,
    friendCount = 0,
    settledCount = 0,
  } = props;

  const [notificationsOn, setNotificationsOn] = React.useState(true);
  const [isMobile, setIsMobile] = React.useState(false);
  const [editingProfile, setEditingProfile] = React.useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const set = () => setIsMobile(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  const userEmail = user?.email ?? "";
  const userInitial = (displayName || user?.name || "Y").charAt(0).toUpperCase();
  const userColor = getUserColor(user?.name || "You");
  const currencyFlag = CURRENCY_FLAG[preferredCurrency] ?? "💱";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
      {/* Sticky header */}
      <div className="hidden sm:block" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", position: "sticky", top: 0, background: "rgba(11,11,11,0.95)", backdropFilter: "blur(20px)", zIndex: 40 }}>
        <div className="flex items-center" style={{ padding: "0 28px", height: 70 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>Settings</h1>
        </div>
      </div>

      {/* ── MOBILE LAYOUT ── */}
      <div className="sm:hidden flex-1 overflow-y-auto px-4 pb-10">
        {/* Hero */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 28, paddingBottom: 24 }}>
          <AvatarUpload id="profile-upload-mobile" size={90} isUploadingImage={isUploadingImage} uploadProgress={uploadProgress} uploadError={uploadError} handleImageUpload={handleImageUpload} userColor={userColor} userInitial={userInitial} userImage={user.image} />
          <p style={{ color: "#fff", fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 16, marginBottom: 3 }}>
            {displayName || "You"}
          </p>
          <p style={{ color: T.muted, fontSize: 14, fontWeight: 500, marginBottom: 18 }}>
            {userEmail || "you@email.com"}
          </p>
          {editingProfile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 260, marginBottom: 4 }}>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.13)", borderRadius: 12, padding: "11px 14px", color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit", width: "100%", fontWeight: 500 }}
              />
              <button
                onClick={() => { handleSaveChanges(); setEditingProfile(false); }}
                disabled={isUpdatatingUser}
                style={{ background: A, border: "none", borderRadius: 12, padding: "12px", color: "#0a0a0a", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
              >
                {isUpdatatingUser ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setEditingProfile(false)}
                style={{ background: "none", border: "none", color: T.muted, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingProfile(true)}
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 14,
                padding: "10px 25px",
                color: "#fff",
                fontWeight: 500,
                fontSize: 15,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Edit Profile
            </button>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, textAlign: "center", paddingBottom: 16, paddingInline: 80 }}>
          {[
            [String(groupCount), "Groups"],
            [String(friendCount), "Friends"],
            [String(settledCount), "Settled"],
          ].map(([num, label]) => (
            <div key={label}>
              <p style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{num}</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginTop: 1 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Separator */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 4 }} />

        {/* PREFERENCES */}
        <MSLabel>Preferences</MSLabel>
        <MobileCard>
          <MobileRow>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Notifications</p>
              <p style={{ fontSize: 13, color: T.muted, marginTop: 2, fontWeight: 500 }}>Email &amp; push reminders</p>
            </div>
            <Toggle on={notificationsOn} onChange={() => setNotificationsOn((p) => !p)} />
          </MobileRow>
          <MobileRow>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Default Currency</p>
              <p style={{ fontSize: 13, color: T.muted, marginTop: 2, fontWeight: 500 }}>{preferredCurrency || "USD"}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.muted }}>
              <span style={{ fontSize: 20 }}>{currencyFlag}</span>
              <span style={{ fontSize: 16 }}>›</span>
            </div>
          </MobileRow>
          <MobileRow last>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Language</p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.muted }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>English</span>
              <span style={{ fontSize: 16 }}>›</span>
            </div>
          </MobileRow>
        </MobileCard>

        {/* ACCEPT PAYMENTS IN */}
        {wallets.length > 0 && (
          <>
            <MSLabel>Accept Payments in</MSLabel>
            <MobileCard style={{ padding: 16 }}>
              <p style={{ color: T.muted, fontSize: 12, marginBottom: 12 }}>Select the tokens you want to accept payments in</p>
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
            </MobileCard>
          </>
        )}

        {/* SECURITY */}
        <MSLabel>Security</MSLabel>
        <MobileCard>
          <MobileRow last onClick={() => setIsChangePasswordOpen(true)}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Change Password</p>
            <span style={{ color: T.muted, fontSize: 18 }}>›</span>
          </MobileRow>
        </MobileCard>

        {/* CONNECTED WALLETS */}
        <MSLabel>Connected Wallets</MSLabel>
        <MobileCard style={{ marginBottom: 10 }}>
          {isLoadingWallets ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "28px" }}>
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: T.muted }} />
            </div>
          ) : wallets.length === 0 ? (
            <div style={{ padding: "20px", color: T.muted, fontSize: 13, textAlign: "center" }}>
              No wallets connected yet.
            </div>
          ) : (
            wallets.map((wallet, idx) => {
              const chainName = getChainName(wallet.chainId);
              const meta = getChainMeta(chainName);
              const addr = wallet.address || "";
              const truncatedAddress = addr.length > 14 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
              return (
                <MobileRow key={wallet.id} last={idx === wallets.length - 1}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: `${meta.color}18`, border: `1.5px solid ${meta.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, color: "#fff" }}>
                      {meta.icon}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <p style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{chainName}</p>
                        {(wallet.isDefault || wallets.length === 1) && (
                          <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 99, fontWeight: 700, background: `${A}1a`, color: A, border: `1px solid ${A}33` }}>Primary</span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: T.muted, fontFamily: "monospace", marginTop: 2 }}>{truncatedAddress}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {!wallet.isDefault && wallets.length > 1 && handleSetAsPrimary && (
                      <button
                        onClick={() => handleSetAsPrimary(wallet.id)}
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.11)", borderRadius: 10, padding: "8px 12px", color: T.body, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Set Primary
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveWallet(wallet.id)}
                      style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: 10, padding: "8px 10px", color: "#F87171", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center" }}
                    >
                      {Icons.trash({})}
                    </button>
                  </div>
                </MobileRow>
              );
            })
          )}
        </MobileCard>
        <button
          id="settings-add-wallet-button"
          onClick={() => setIsWalletModalOpen(true)}
          disabled={isAddingWallet}
          style={{ width: "100%", padding: "16px", background: "rgba(255,255,255,0.03)", border: "1.5px dashed rgba(255,255,255,0.13)", borderRadius: 18, color: T.muted, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          {Icons.plus({})} Add Wallet
        </button>

        {/* Sign Out */}
        <button
          type="button"
          onClick={() => !isLoggingOut && onLogout?.()}
          disabled={isLoggingOut}
          style={{
            width: "100%",
            marginTop: 24,
            padding: "18px",
            borderRadius: 20,
            background: "rgba(200,40,40,0.15)",
            border: "1px solid rgba(248,113,113,0.2)",
            color: "#F87171",
            fontSize: 17,
            fontWeight: 800,
            cursor: "pointer",
            fontFamily: "inherit",
            opacity: isLoggingOut ? 0.7 : 1,
          }}
        >
          Sign Out
        </button>
        <div style={{ height: 40 }} />
      </div>

      {/* ── DESKTOP LAYOUT ── */}
      <div className="hidden sm:block flex-1 overflow-y-auto px-7 pt-6 pb-10" style={{ maxWidth: 660 }}>
        <SLabel>Profile</SLabel>
        <Card style={{ padding: "22px", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22, paddingBottom: 22, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <AvatarUpload id="profile-upload" size={64} isUploadingImage={isUploadingImage} uploadProgress={uploadProgress} uploadError={uploadError} handleImageUpload={handleImageUpload} userColor={userColor} userInitial={userInitial} userImage={user.image} />
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
              onChange={() => {}}
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
            onClick={() => setIsChangePasswordOpen(true)}
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

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {/* Add Wallet Modal */}
      <AddWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />

      {/* Remove Wallet Confirmation Modal */}
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
                boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2" style={{ color: T.bright }}>Remove Wallet</h3>
                <p className="mb-6" style={{ color: T.body, fontSize: 14 }}>
                  Are you sure you want to remove this wallet? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-center">
                  <Btn variant="ghost" onClick={cancelRemoveWallet}>Cancel</Btn>
                  <Btn
                    variant="danger"
                    onClick={confirmRemoveWallet}
                    style={{ opacity: isRemovingWallet ? 0.7 : 1, cursor: isRemovingWallet ? "not-allowed" : "pointer" }}
                  >
                    {isRemovingWallet ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /><span>Removing...</span></>
                    ) : (
                      <>{Icons.trash({ size: 14 })}<span>Remove Wallet</span></>
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
