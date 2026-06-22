import { useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, TrendingDown, TrendingUp, Package } from "lucide-react";
import { PRODUCTS, STOCK_MOVEMENTS } from "./mockData";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

type Tab = "niveaux" | "mouvements" | "alertes";

export function Stock() {
  const [tab, setTab] = useState<Tab>("niveaux");
  const [search, setSearch] = useState("");

  const lowStockItems = PRODUCTS.filter(p => p.stock < p.minStock);
  const filtered = PRODUCTS.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const chartData = PRODUCTS.slice(0, 8).map(p => ({
    name: p.name.split(" ").slice(0, 2).join(" "),
    stock: p.stock,
    min: p.minStock,
    low: p.stock < p.minStock,
  }));

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex justify-between items-center mb-4">
        <h1 style={{ color: "var(--foreground)" }}>Stock & Inventaire</h1>
        {lowStockItems.length > 0 && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-xl" style={{ background: "var(--red-light)", color: "var(--destructive)", fontSize: "12px", fontWeight: 600 }}>
            <AlertTriangle size={12} /> {lowStockItems.length} alerte(s)
          </span>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Références", value: PRODUCTS.length, color: "var(--primary)", bg: "var(--blue-light)" },
          { label: "Stock faible", value: lowStockItems.length, color: "var(--destructive)", bg: "var(--red-light)" },
          { label: "Mouvements", value: STOCK_MOVEMENTS.length, color: "var(--accent)", bg: "var(--green-light)" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="bg-card rounded-2xl p-3 border border-border shadow-sm text-center">
            <div style={{ fontWeight: 700, fontSize: "22px", color }}>{value}</div>
            <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(["niveaux", "mouvements", "alertes"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-3 py-1.5 rounded-full capitalize transition-colors"
            style={{
              background: tab === t ? "var(--primary)" : "var(--card)",
              color: tab === t ? "white" : "var(--muted-foreground)",
              fontWeight: 600, fontSize: "12px",
              border: `1px solid ${tab === t ? "var(--primary)" : "var(--border)"}`
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "niveaux" && (
        <>
          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-4">
            <p style={{ fontWeight: 600, fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 12 }}>NIVEAUX DE STOCK</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#546e7a" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#546e7a" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid rgba(21,101,192,0.15)", borderRadius: 8, fontSize: 11 }}
                />
                <Bar dataKey="stock" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.low ? "#c62828" : "#1565c0"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un produit…"
            className="w-full px-4 py-2.5 rounded-2xl border border-border outline-none mb-3"
            style={{ background: "var(--card)", fontSize: "14px", color: "var(--foreground)" }}
          />

          <div className="space-y-2">
            {filtered.map(p => {
              const isLow = p.stock < p.minStock;
              const pct = Math.min(100, (p.stock / (p.minStock * 3)) * 100);
              return (
                <div key={p.id} className="bg-card rounded-2xl p-3.5 border border-border shadow-sm" style={{ borderColor: isLow ? "rgba(198,40,40,0.25)" : undefined }}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Package size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                      <span style={{ fontWeight: 500, fontSize: "13px", color: "var(--foreground)" }} className="truncate">{p.name}</span>
                      {isLow && <AlertTriangle size={12} color="var(--destructive)" className="flex-shrink-0" />}
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <span style={{ fontWeight: 700, fontSize: "15px", color: isLow ? "var(--destructive)" : "var(--accent)" }}>{p.stock}</span>
                      <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}> / {p.minStock} min</span>
                    </div>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 5, background: "var(--muted)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: isLow ? "var(--destructive)" : "var(--accent)", transition: "width 0.3s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "mouvements" && (
        <div className="space-y-2">
          {STOCK_MOVEMENTS.slice().reverse().map(m => (
            <div key={m.id} className="bg-card rounded-2xl p-3.5 border border-border shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: m.type === "in" ? "var(--green-light)" : "var(--red-light)" }}>
                {m.type === "in" ? <ArrowDown size={16} style={{ color: "var(--accent)" }} /> : <ArrowUp size={16} style={{ color: "var(--destructive)" }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ fontWeight: 500, fontSize: "13px", color: "var(--foreground)" }} className="truncate">{m.productName}</div>
                <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{m.reason} · {m.date}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: "14px", color: m.type === "in" ? "var(--accent)" : "var(--destructive)", flexShrink: 0 }}>
                {m.type === "in" ? "+" : "-"}{m.qty}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "alertes" && (
        <div>
          {lowStockItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40" style={{ color: "var(--muted-foreground)" }}>
              <TrendingUp size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p>Tous les niveaux de stock sont normaux !</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lowStockItems.map(p => (
                <div key={p.id} className="bg-card rounded-2xl p-4 border shadow-sm" style={{ borderColor: "rgba(198,40,40,0.3)" }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }}>{p.name}</div>
                      <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{p.category} · {p.supplier}</div>
                    </div>
                    <TrendingDown size={18} style={{ color: "var(--destructive)" }} />
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Actuel</div>
                      <div style={{ fontWeight: 700, fontSize: "18px", color: "var(--destructive)" }}>{p.stock}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Minimum</div>
                      <div style={{ fontWeight: 700, fontSize: "18px", color: "var(--foreground)" }}>{p.minStock}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Manquant</div>
                      <div style={{ fontWeight: 700, fontSize: "18px", color: "#f57c00" }}>{p.minStock - p.stock}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
