import { useState, useRef, useEffect } from "react";
import { X, Search, Package, CheckCircle } from "lucide-react";
import { PRODUCTS } from "./mockData";

interface Props {
  onProductFound?: (barcode: string) => void;
}

export function Scanner({ onProductFound }: Props) {
  const [manualInput, setManualInput] = useState("");
  const [result, setResult] = useState<typeof PRODUCTS[0] | null | "notfound">(null);
  const [scanning, setScanning] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setScanning(true);
    } catch {
      setScanning(false);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  function handleManualSearch() {
    const q = manualInput.trim();
    if (!q) return;
    const found = PRODUCTS.find(p => p.barcode === q || p.name.toLowerCase().includes(q.toLowerCase()));
    setResult(found ?? "notfound");
    if (found && onProductFound) onProductFound(found.barcode);
  }

  function reset() {
    setResult(null);
    setManualInput("");
  }

  return (
    <div className="px-4 pt-4 pb-6">
      <h1 style={{ color: "var(--foreground)", marginBottom: 16 }}>Scanner de codes-barres</h1>

      {/* Camera viewfinder */}
      <div
        className="relative rounded-2xl overflow-hidden mb-4 flex items-center justify-center"
        style={{ height: 240, background: scanning ? "black" : "#0d1b2a" }}
      >
        {scanning ? (
          <>
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div style={{ width: 220, height: 80, position: "relative" }}>
                {[["top-0 left-0", "border-t-2 border-l-2"], ["top-0 right-0", "border-t-2 border-r-2"], ["bottom-0 left-0", "border-b-2 border-l-2"], ["bottom-0 right-0", "border-b-2 border-r-2"]].map(([pos, border]) => (
                  <div key={pos} className={`absolute ${pos} w-6 h-6 ${border} rounded-sm`} style={{ borderColor: "var(--primary)" }} />
                ))}
                <div className="absolute left-0 right-0" style={{ top: "50%", height: 2, background: "var(--primary)", opacity: 0.8, animation: "scanline 1.5s ease-in-out infinite" }} />
              </div>
            </div>
            <button
              onClick={() => setFlashOn(!flashOn)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: flashOn ? "rgba(255,235,59,0.9)" : "rgba(0,0,0,0.5)", fontSize: "16px" }}
            >
              {flashOn ? "🔦" : "⚡"}
            </button>
            <button
              onClick={stopCamera}
              className="absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.5)" }}
            >
              <X size={18} style={{ color: "white" }} />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div style={{ width: 80, height: 80, border: "3px solid rgba(21,101,192,0.4)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="2" y="2" width="10" height="2" fill="#1565c0" />
                <rect x="2" y="2" width="2" height="10" fill="#1565c0" />
                <rect x="28" y="2" width="10" height="2" fill="#1565c0" />
                <rect x="36" y="2" width="2" height="10" fill="#1565c0" />
                <rect x="2" y="36" width="10" height="2" fill="#1565c0" />
                <rect x="2" y="28" width="2" height="10" fill="#1565c0" />
                <rect x="28" y="36" width="10" height="2" fill="#1565c0" />
                <rect x="36" y="28" width="2" height="10" fill="#1565c0" />
                {[4, 8, 12, 16, 20, 24, 28, 32].map((x, i) => (
                  <rect key={i} x={x} y={18} width={i % 3 === 0 ? 3 : 2} height={i % 2 === 0 ? 10 : 6} fill="rgba(21,101,192,0.6)" />
                ))}
              </svg>
            </div>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px" }}>Appuyez pour activer la caméra</p>
            <button
              onClick={startCamera}
              className="px-6 py-2.5 rounded-2xl transition-all active:scale-95"
              style={{ background: "var(--primary)", color: "white", fontWeight: 600, fontSize: "14px" }}
            >
              Démarrer la caméra
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scanline {
          0%, 100% { transform: translateY(-20px); opacity: 0.4; }
          50% { transform: translateY(20px); opacity: 1; }
        }
      `}</style>

      {/* Manual Input */}
      <div className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-4">
        <p style={{ fontWeight: 600, fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 10 }}>SAISIE MANUELLE</p>
        <div className="flex gap-2">
          <input
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleManualSearch()}
            placeholder="Code-barres ou nom du produit…"
            className="flex-1 px-3 py-2.5 rounded-xl border border-border outline-none"
            style={{ background: "var(--input-background)", fontSize: "14px", color: "var(--foreground)" }}
          />
          <button
            onClick={handleManualSearch}
            className="px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all active:scale-95"
            style={{ background: "var(--primary)", color: "white", fontWeight: 600, fontSize: "13px" }}
          >
            <Search size={15} /> Chercher
          </button>
        </div>
      </div>

      {/* Result */}
      {result === "notfound" && (
        <div className="bg-card rounded-2xl p-4 border shadow-sm text-center" style={{ borderColor: "rgba(198,40,40,0.3)" }}>
          <p style={{ color: "var(--destructive)", fontWeight: 600 }}>Produit introuvable</p>
          <p style={{ color: "var(--muted-foreground)", fontSize: "13px", marginTop: 4 }}>Vérifiez le code-barres ou le nom du produit</p>
          <button onClick={reset} style={{ color: "var(--primary)", fontSize: "13px", marginTop: 8 }}>Réessayer</button>
        </div>
      )}

      {result && result !== "notfound" && (
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} style={{ color: "var(--accent)" }} />
            <span style={{ fontWeight: 600, color: "var(--accent)", fontSize: "14px" }}>Produit trouvé</span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "var(--blue-light)" }}>
              <Package size={22} style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: "15px", color: "var(--foreground)" }}>{result.name}</div>
              <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{result.category} · {result.supplier}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Prix vente", value: `${result.sellingPrice.toFixed(2)} MAD`, color: "var(--primary)" },
              { label: "Stock", value: `${result.stock}`, color: result.stock < result.minStock ? "var(--destructive)" : "var(--accent)" },
              { label: "Code-barres", value: result.barcode.slice(-6), color: "var(--foreground)" },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center p-2 rounded-xl" style={{ background: "var(--muted)" }}>
                <div style={{ fontWeight: 700, fontSize: "13px", color }}>{value}</div>
                <div style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>{label}</div>
              </div>
            ))}
          </div>
          <button onClick={reset} className="w-full mt-3 py-2 rounded-xl" style={{ background: "var(--blue-light)", color: "var(--primary)", fontWeight: 600, fontSize: "13px" }}>
            Scanner un autre produit
          </button>
        </div>
      )}

      {!result && (
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm mt-4">
          <p style={{ fontWeight: 600, fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 8 }}>CODES-BARRES DE TEST</p>
          {PRODUCTS.slice(0, 5).map(p => (
            <button
              key={p.id}
              onClick={() => setManualInput(p.barcode)}
              className="w-full flex justify-between py-1.5 text-left"
              style={{ fontSize: "13px" }}
            >
              <span style={{ color: "var(--foreground)" }}>{p.name.split(" ").slice(0, 3).join(" ")}</span>
              <span style={{ color: "var(--muted-foreground)", fontFamily: "monospace", fontSize: "11px" }}>{p.barcode}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
