"use client";

import { useEffect } from "react";

export function MobileSheet({
  open,
  onClose,
  children,
  title,
  height = "82%",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  height?: string;
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.78)",
        backdropFilter: "blur(10px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(180deg,#161616 0%,#111 100%)",
          borderRadius: "26px 26px 0 0",
          height,
          display: "flex",
          flexDirection: "column",
          animation: "mobileSheetUp 0.32s cubic-bezier(.34,1.2,.64,1)",
          width: "100%",
          maxWidth: 430,
        }}
      >
        {/* Handle */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "14px 0 6px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 99,
              background: "rgba(255,255,255,0.15)",
            }}
          />
        </div>

        {/* Title */}
        {title && (
          <div
            style={{
              padding: "4px 22px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              flexShrink: 0,
            }}
          >
            <p
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "-0.02em",
              }}
            >
              {title}
            </p>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  );
}
