"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CURSIVE_FONT = "Dancing Script";

export interface ContractSignatureCaptureProps {
  onSign: (payload: { signatureDataUrl: string; signerName: string }) => void;
  isPending?: boolean;
  disabled?: boolean;
  bare?: boolean;
}

type Mode = "type" | "draw";

export function ContractSignatureCapture({
  onSign,
  isPending = false,
  disabled = false,
  bare = false,
}: ContractSignatureCaptureProps) {
  const [mode, setMode] = useState<Mode>("type");
  const [signerName, setSignerName] = useState("");
  const [drawing, setDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load cursive font
  useEffect(() => {
    const link = document.createElement("link");
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(CURSIVE_FONT)}:wght@400;700&display=swap`;
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => link.remove();
  }, []);

  const getSignatureDataUrl = useCallback(async (): Promise<string | null> => {
    if (mode === "type") {
      if (!signerName.trim()) return null;
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 120;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 400, 120);
      ctx.fillStyle = "#000";
      try {
        await document.fonts.load(`28px "${CURSIVE_FONT}"`);
        ctx.font = `28px "${CURSIVE_FONT}"`;
        ctx.fillText(signerName.trim(), 20, 75);
      } catch {
        ctx.font = "28px cursive";
        ctx.fillText(signerName.trim(), 20, 75);
      }
      return canvas.toDataURL("image/png");
    }

    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    return canvas.toDataURL("image/png");
  }, [mode, signerName]);

  const handleStartDraw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (mode !== "draw") return;
      setDrawing(true);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
      const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;
      ctx.beginPath();
      ctx.moveTo(x, y);
    },
    [mode]
  );

  const handleMoveDraw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!drawing || mode !== "draw") return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
      const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;
      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [drawing, mode]
  );

  const handleEndDraw = useCallback(() => setDrawing(false), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mode !== "draw") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, [mode]);

  const handleSubmit = useCallback(async () => {
    const name = signerName.trim();
    if (!name) return;
    const dataUrl = await getSignatureDataUrl();
    if (!dataUrl) return;
    onSign({ signatureDataUrl: dataUrl, signerName: name });
  }, [signerName, getSignatureDataUrl, onSign]);

  const canSubmit = signerName.trim().length > 0 && (mode === "type" || true);

  return (
    <div className={bare ? "" : "rounded-xl border border-white/20 bg-white/[0.03] p-5 mb-6"}>
      <p className="text-white/80 text-sm font-medium mb-3">Your full name (for the audit trail)</p>
      <input
        type="text"
        value={signerName}
        onChange={(e) => setSignerName(e.target.value)}
        placeholder="Type your full name"
        className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-white/40 outline-none focus:border-white/40 mb-4"
      />

      <p className="text-white/80 text-sm font-medium mb-2">Signature</p>
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setMode("type")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            mode === "type"
              ? "bg-white/20 text-white"
              : "bg-white/5 text-white/70 hover:text-white"
          }`}
        >
          Type (cursive)
        </button>
        <button
          type="button"
          onClick={() => setMode("draw")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            mode === "draw"
              ? "bg-white/20 text-white"
              : "bg-white/5 text-white/70 hover:text-white"
          }`}
        >
          Draw
        </button>
      </div>

      {mode === "type" && (
        <div
          className="mb-4 min-h-[80px] rounded-lg border border-white/10 bg-white/5 flex items-center px-4 py-3"
          style={{ fontFamily: `"${CURSIVE_FONT}", cursive`, fontSize: "1.75rem" }}
        >
          {signerName.trim() || (
            <span className="text-white/40">Your signature will appear here</span>
          )}
        </div>
      )}

      {mode === "draw" && (
        <canvas
          ref={canvasRef}
          width={340}
          height={120}
          className="w-full max-w-full h-[120px] rounded-lg border border-white/20 bg-white touch-none block"
          style={{ width: "100%", maxWidth: 340, height: 120 }}
          onMouseDown={handleStartDraw}
          onMouseMove={handleMoveDraw}
          onMouseUp={handleEndDraw}
          onMouseLeave={handleEndDraw}
          onTouchStart={handleStartDraw}
          onTouchMove={handleMoveDraw}
          onTouchEnd={handleEndDraw}
        />
      )}

      <p className="text-white/50 text-xs mb-4">
        By signing you agree to the contract. Timestamp and IP will be recorded.
      </p>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || isPending || !canSubmit}
        className="w-full flex items-center justify-center gap-2 rounded-full bg-white text-black px-6 py-3 font-semibold hover:bg-white/90 disabled:opacity-50 disabled:pointer-events-none"
      >
        {isPending ? (
          <>Signing…</>
        ) : (
          <>I agree & sign</>
        )}
      </button>
    </div>
  );
}
