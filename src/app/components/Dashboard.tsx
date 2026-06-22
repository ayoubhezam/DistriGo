import { TrendingUp, ShoppingBag, Package, AlertTriangle, Plus, Truck, QrCode, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { PRODUCTS, SALES, PURCHASE_ORDERS } from "./mockData";
import { Screen } from "./types";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";

const salesChart = [
  { jour: "Lun", ventes: 1420 },
  { jour: "Mar", ventes: 1980 },
  { jour: "Mer", ventes: 1650 },
  { jour: "Jeu", ventes: 2200 },
  { jour: "Ven", ventes: 3100 },
  { jour: "Sam", ventes: 2850 },
  { jour: "Dim", ventes: 730 },
];

export function Dashboard({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const todaySales = SALES.filter(s => s.date.startsWith("2026-06-13"));
  const totalSalesToday = todaySales.reduce((a, b) => a + b.total, 0);
  const todayPurchases = PURCHASE_ORDERS.filter(p => p.date === "2026-06-13");
  const totalPurchasesToday = todayPurchases.reduce((a, b) => a + b.total, 0);
  const stockValue = PRODUCTS.reduce((a, p) => a + p.stock * p.purchasePrice, 0);
  const lowStockItems = PRODUCTS.filter(p => p.stock < p.minStock);

  const recentActivity = [
    ...SALES.slice(0, 4).map(s => ({ type: "vente" as const, label: `Vente — ${s.customerName}`, amount: s.total, time: s.date.split(" ")[1] || s.date, id: s.id })),
    ...PURCHASE_ORDERS.slice(0, 2).map(p => ({ type: "achat" as const, label: `Achat — ${p.supplierName}`, amount: p.total, time: p.date, id: p.id })),
  ].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 6);

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      {/* Header */}
      <div>
        <p style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>Samedi, 13 juin 2026</p>
        <h1 style={{ color: "var(--foreground)" }}>Bonjour, Ahmed 👋</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label="Ventes du jour"
          value={`${totalSalesToday.toFixed(2)} MAD`}
          sub={`${todaySales.length} transactions`}
          icon={<TrendingUp size={18} />}
          color="var(--primary)"
          bg="var(--blue-light)"
          trend={+12}
        />
        <KpiCard
          label="Achats du jour"
          value={`${totalPurchasesToday.toFixed(2)} MAD`}
          sub={`${todayPurchases.length} bons`}
          icon={<ShoppingBag size={18} />}
          color="var(--accent)"
          bg="var(--green-light)"
          trend={0}
        />
        <KpiCard
          label="Valeur du stock"
          value={`${stockValue.toFixed(0)} MAD`}
          sub={`${PRODUCTS.length} produits`}
          icon={<Package size={18} />}
          color="#f57c00"
          bg="var(--orange-light)"
          trend={+3}
        />
        <KpiCard
          label="Alertes stock"
          value={String(lowStockItems.length)}
          sub="articles à réapprovisionner"
          icon={<AlertTriangle size={18} />}
          color="var(--destructive)"
          bg="var(--red-light)"
          trend={-2}
          urgent={lowStockItems.length > 0}
        />
      </div>

      {/* Sales Chart */}
      <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
        <div className="flex justify-between items-center mb-3">
          <span style={{ fontWeight: 600, color: "var(--foreground)" }}>Ventes hebdomadaires</span>
          <span style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 500 }}>Cette semaine</span>
        </div>
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={salesChart} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1565c0" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#1565c0" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="jour" tick={{ fontSize: 11, fill: "#546e7a" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "white", border: "1px solid rgba(21,101,192,0.15)", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [`${v} MAD`, "Ventes"]}
            />
            <Area type="monotone" dataKey="ventes" stroke="#1565c0" strokeWidth={2} fill="url(#salesGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 style={{ marginBottom: 10, color: "var(--foreground)" }}>Actions rapides</h2>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Nouvelle vente", icon: <TrendingUp size={20} />, screen: "pos" as Screen, color: "var(--primary)", bg: "var(--blue-light)" },
            { label: "Nouvel achat", icon: <Truck size={20} />, screen: "purchases" as Screen, color: "var(--accent)", bg: "var(--green-light)" },
            { label: "Ajouter produit", icon: <Plus size={20} />, screen: "products" as Screen, color: "#f57c00", bg: "var(--orange-light)" },
            { label: "Scanner", icon: <QrCode size={20} />, screen: "scanner" as Screen, color: "#6a1b9a", bg: "#f3e5f5" },
          ].map(({ label, icon, screen, color, bg }) => (
            <button
              key={label}
              onClick={() => onNavigate(screen)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all active:scale-95"
              style={{ background: bg }}
            >
              <span style={{ color }}>{icon}</span>
              <span style={{ fontSize: "10px", fontWeight: 500, color, textAlign: "center", lineHeight: 1.3 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
          <div className="flex justify-between items-center mb-3">
            <span style={{ fontWeight: 600, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={16} color="var(--destructive)" />
              Stock faible
            </span>
            <button onClick={() => onNavigate("stock")} style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 500 }}>Voir tout</button>
          </div>
          <div className="space-y-2">
            {lowStockItems.slice(0, 3).map(p => (
              <div key={p.id} className="flex justify-between items-center py-1.5">
                <div>
                  <div style={{ fontWeight: 500, fontSize: "14px", color: "var(--foreground)" }}>{p.name}</div>
                  <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Min : {p.minStock} {p.unit}s</div>
                </div>
                <div className="text-right">
                  <div style={{ fontWeight: 600, color: "var(--destructive)", fontSize: "14px" }}>{p.stock}</div>
                  <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{p.unit}s restant</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
        <div className="flex justify-between items-center mb-3">
          <span style={{ fontWeight: 600, color: "var(--foreground)" }}>Activité récente</span>
        </div>
        <div className="space-y-3">
          {recentActivity.map(a => (
            <div key={a.id} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: a.type === "vente" ? "var(--blue-light)" : "var(--green-light)" }}
              >
                {a.type === "vente"
                  ? <ArrowUpRight size={14} color="var(--primary)" />
                  : <ArrowDownRight size={14} color="var(--accent)" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }} className="truncate">{a.label}</div>
                <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{a.time}</div>
              </div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: a.type === "vente" ? "var(--primary)" : "var(--accent)", flexShrink: 0 }}>
                {a.amount.toFixed(2)} MAD
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon, color, bg, trend, urgent }: {
  label: string; value: string; sub: string; icon: React.ReactNode;
  color: string; bg: string; trend: number; urgent?: boolean;
}) {
  return (
    <div
      className="bg-card rounded-2xl p-3.5 shadow-sm border border-border"
      style={{ borderColor: urgent ? "rgba(198,40,40,0.3)" : undefined }}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg, color }}>
          {icon}
        </div>
        {trend !== 0 && (
          <span style={{ fontSize: "11px", fontWeight: 600, color: trend > 0 ? "var(--accent)" : "var(--destructive)" }}>
            {trend > 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <div style={{ fontWeight: 700, fontSize: "15px", color: urgent ? "var(--destructive)" : "var(--foreground)", lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: 2 }}>{label}</div>
      <div style={{ fontSize: "11px", color: "var(--muted-foreground)", opacity: 0.75 }}>{sub}</div>
    </div>
  );
}
