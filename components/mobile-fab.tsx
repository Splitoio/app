"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MobileSheet } from "./mobile-sheet";
import { A, G } from "@/lib/splito-design";

type FabAction = (opts: {
  router: ReturnType<typeof useRouter>;
  pathname: string;
}) => void;

const FAB_ITEMS: {
  icon: string;
  label: string;
  sub: string;
  color: string;
  action: FabAction;
}[] = [
  {
    icon: "💸",
    label: "Add Expense",
    sub: "Split a cost with your group",
    color: A,
    action: ({ router }) => {
      // Route to groups so user can pick a group and add an expense
      router.push("/groups");
    },
  },
  {
    icon: "👥",
    label: "Create Group",
    sub: "Start a new split group",
    color: "#A78BFA",
    action: ({ router, pathname }) => {
      if (pathname.startsWith("/groups")) {
        // Groups list is already mounted – open the modal directly
        document.dispatchEvent(new CustomEvent("open-create-group-modal"));
      } else {
        // Navigate to groups and auto-open create modal there
        router.push("/groups?openCreate=1");
      }
    },
  },
  {
    icon: "🤝",
    label: "Add Friend",
    sub: "Invite someone to Splito",
    color: G,
    action: ({ router }) => {
      // Go to Friends page – invite is done via the inline email field + Invite button
      router.push("/friends");
    },
  },
];

export function MobileFAB() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Hide on settings/profile page and on group detail pages
  const isHidden =
    pathname.startsWith("/settings") ||
    (pathname.startsWith("/groups/") && pathname !== "/groups");

  if (isHidden) return null;

  return (
    <>
      {/* FAB button — mobile only */}
      <button
        onClick={() => setOpen(true)}
        className="sm:!hidden  !flex"
        style={{
          position: "fixed",
          bottom: 70,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: A,
          border: "none",
          color: "#0a0a0a",
          fontSize: 26,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 6px 28px ${A}55, 0 2px 8px rgba(0,0,0,0.5)`,
          zIndex: 50,
          fontWeight: 900,
          lineHeight: 1,
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        aria-label="Quick add"
      >
        +
      </button>

      {/* Quick-add bottom sheet */}
      <MobileSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Quick Add"
        height="55%"
      >
        <div
          style={{
            padding: "16px 20px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {FAB_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setOpen(false);
                setTimeout(
                  () => item.action({ router, pathname }),
                  100
                );
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "16px",
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${item.color}22`,
                borderRadius: 18,
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                fontFamily: "inherit",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 15,
                  background: `${item.color}18`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>
              <div>
                <p style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>
                  {item.label}
                </p>
                <p style={{ color: "#999", fontSize: 12, marginTop: 2 }}>
                  {item.sub}
                </p>
              </div>
            </button>
          ))}
        </div>
      </MobileSheet>
    </>
  );
}
