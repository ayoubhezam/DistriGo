import { useState } from "react";
import { Screen } from "./components/types";
import { BottomNav } from "./components/BottomNav";
import { Dashboard } from "./components/Dashboard";
import { Products } from "./components/Products";
import { POS } from "./components/POS";
import { Purchases } from "./components/Purchases";
import { Stock } from "./components/Stock";
import { Scanner } from "./components/Scanner";
import { AppSettings } from "./components/AppSettings";
import { Customers } from "./components/Customers";
import { Tournee } from "./components/Tournee"; // ✅ تغيير الاستيراد
import { Fournisseurs } from "./components/fournisseur";


const SCREEN_TITLES: Record<Screen, string> = {
  dashboard : "DistriGo",
  products  : "Produits",
  pos       : "Vente",
  purchases : "Achats",
  stock     : "Stock",
  scanner   : "Scanner",
  settings  : "Paramètres",
  customers : "Clients",
  tournee : "Tournées",
  fournisseur : "Fournisseurs", 

};

export default function App() {
  /* MARKER-MAKE-KIT-INVOKED */
  const [screen, setScreen] = useState<Screen>("dashboard");

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: "var(--background)", maxWidth: 480, margin: "0 auto", position: "relative" }}
    >
      {/* Top App Bar */}
      <header
        className="sticky top-0 z-40 flex items-center px-4 h-14 border-b border-border"
        style={{ background: "var(--primary)", boxShadow: "0 2px 8px rgba(21,101,192,0.25)" }}
      >
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
              <rect x="1" y="1" width="6" height="6" rx="1.5" />
              <rect x="9" y="1" width="6" height="6" rx="1.5" />
              <rect x="1" y="9" width="6" height="6" rx="1.5" />
              <rect x="9" y="9" width="6" height="6" rx="1.5" opacity="0.5" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, color: "white", fontSize: "17px", letterSpacing: "-0.01em" }}>
            {SCREEN_TITLES[screen]}
          </span>
        </div>
        {screen === "dashboard" && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
            <span style={{ color: "white", fontWeight: 700, fontSize: "13px" }}>AB</span>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 80 }}>
        {screen === "dashboard" && <Dashboard onNavigate={setScreen} />}
        {screen === "products"  && <Products />}
        {screen === "pos"       && <POS onScanRequest={() => setScreen("scanner")} />}
        {screen === "purchases" && <Purchases />}
        {screen === "stock"     && <Stock />}
        {screen === "scanner"   && <Scanner />}
        {screen === "settings"  && <AppSettings />}
        {screen === "customers" && <Customers />}
        {screen === "tournee" && <Tournee />}
        {screen === "fournisseur" && <Fournisseurs />}
</main>

      <BottomNav current={screen} onNavigate={setScreen} />
    </div>
  );
}
