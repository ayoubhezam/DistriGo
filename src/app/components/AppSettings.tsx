import { useState } from "react";
import { ChevronRight, DollarSign, Percent, Database, Users, Bell, Shield, Globe } from "lucide-react";

export function AppSettings() {
  const [currency, setCurrency] = useState("MAD");
  const [taxRate, setTaxRate] = useState("20");
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [role, setRole] = useState<"admin" | "caissier">("admin");

  const CURRENCIES = ["MAD", "EUR", "USD", "DZD", "TND", "XOF", "SAR", "AED"];

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      <h1 style={{ color: "var(--foreground)" }}>Paramètres</h1>

      {/* User Role Card */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border" style={{ background: "var(--primary)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
              <Users size={18} style={{ color: "white" }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: "white", fontSize: "15px" }}>Ahmed Benali</div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)" }}>
                Gérant · {role === "admin" ? "Administrateur" : "Caissier"}
              </div>
            </div>
          </div>
        </div>
        <div className="p-4">
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 10 }}>Rôle utilisateur</p>
          <div className="flex gap-2">
            {([["admin", "🔑 Administrateur"], ["caissier", "💳 Caissier"]] as const).map(([r, label]) => (
              <button
                key={r}
                onClick={() => setRole(r as "admin" | "caissier")}
                className="flex-1 py-2 rounded-xl transition-colors"
                style={{
                  background: role === r ? "var(--primary)" : "var(--muted)",
                  color: role === r ? "white" : "var(--muted-foreground)",
                  fontWeight: 600, fontSize: "12px"
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Currency & Tax */}
      <div className="bg-card rounded-2xl border border-border shadow-sm">
        <div className="px-4 py-3 border-b border-border">
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.05em" }}>PARAMÈTRES FINANCIERS</span>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label style={{ fontSize: "13px", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <DollarSign size={14} /> Devise
            </label>
            <div className="flex flex-wrap gap-2">
              {CURRENCIES.map(c => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className="px-3 py-1.5 rounded-xl border transition-colors"
                  style={{
                    background: currency === c ? "var(--primary)" : "var(--muted)",
                    color: currency === c ? "white" : "var(--foreground)",
                    borderColor: currency === c ? "var(--primary)" : "var(--border)",
                    fontWeight: currency === c ? 700 : 400, fontSize: "13px"
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: "13px", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Percent size={14} /> Taux de TVA
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={taxRate}
                onChange={e => setTaxRate(e.target.value)}
                className="w-24 px-3 py-2 rounded-xl border border-border outline-none text-center"
                style={{ background: "var(--input-background)", fontSize: "16px", fontWeight: 700, color: "var(--foreground)" }}
                min={0} max={100}
              />
              <span style={{ color: "var(--muted-foreground)", fontSize: "16px" }}>%</span>
              <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>appliqué à toutes les ventes</span>
            </div>
          </div>
        </div>
      </div>

      {/* App Preferences */}
      <div className="bg-card rounded-2xl border border-border shadow-sm">
        <div className="px-4 py-3 border-b border-border">
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.05em" }}>PRÉFÉRENCES</span>
        </div>
        {[
          {
            icon: "🌙", label: "Mode sombre", sub: "Changer l'apparence de l'application",
            control: (
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="w-11 h-6 rounded-full transition-colors relative flex-shrink-0"
                style={{ background: darkMode ? "var(--primary)" : "var(--muted)" }}
              >
                <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: darkMode ? "calc(100% - 22px)" : 2 }} />
              </button>
            )
          },
          {
            icon: "🔔", label: "Alertes stock faible", sub: "Recevoir des notifications de réapprovisionnement",
            control: (
              <button
                onClick={() => setNotifications(!notifications)}
                className="w-11 h-6 rounded-full transition-colors relative flex-shrink-0"
                style={{ background: notifications ? "var(--accent)" : "var(--muted)" }}
              >
                <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: notifications ? "calc(100% - 22px)" : 2 }} />
              </button>
            )
          },
        ].map(({ icon, label, sub, control }) => (
          <div key={label} className="flex items-center justify-between px-4 py-3.5 border-b border-border last:border-0">
            <div className="flex items-center gap-3">
              <span style={{ fontSize: "18px" }}>{icon}</span>
              <div>
                <div style={{ fontWeight: 500, fontSize: "14px", color: "var(--foreground)" }}>{label}</div>
                <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{sub}</div>
              </div>
            </div>
            {control}
          </div>
        ))}
      </div>

      {/* Data & Security */}
      <div className="bg-card rounded-2xl border border-border shadow-sm">
        <div className="px-4 py-3 border-b border-border">
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.05em" }}>DONNÉES & SÉCURITÉ</span>
        </div>
        {[
          { icon: <Database size={16} />, label: "Sauvegarder les données", sub: "Exporter toutes les données en JSON" },
          { icon: <Shield size={16} />, label: "Changer le code PIN", sub: "Mettre à jour votre code de sécurité" },
          { icon: <Globe size={16} />, label: "Langue", sub: "Français (Maroc)" },
          { icon: <Bell size={16} />, label: "Gestion des clients", sub: "Plafonds de crédit et historique" },
        ].map(({ icon, label, sub }) => (
          <button key={label} className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border last:border-0 text-left">
            <div className="flex items-center gap-3">
              <span style={{ color: "var(--primary)" }}>{icon}</span>
              <div>
                <div style={{ fontWeight: 500, fontSize: "14px", color: "var(--foreground)" }}>{label}</div>
                <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{sub}</div>
              </div>
            </div>
            <ChevronRight size={16} style={{ color: "var(--muted-foreground)" }} />
          </button>
        ))}
      </div>

      <div className="text-center pt-2">
        <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>DistriGo v1.0.0 · © 2026 — Tous droits réservés</p>
      </div>
    </div>
  );
}
