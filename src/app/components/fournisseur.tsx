import { useState, useRef } from "react";
import {
  Search, Plus, X, ChevronRight, Edit2, Phone, MapPin,
  Package, CreditCard, AlertTriangle, Check, Share2,
  ArrowDownLeft, Building2, Wallet, FileText, ChevronDown,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type Fournisseur = {
  id          : string;
  name        : string;
  phone       : string;
  address     : string;
  note?       : string;
  balance     : number;   // positif = nous lui devons | négatif = il nous doit
  productIds  : string[]; // IDs des produits liés
  payments    : Payment[];
};

export type Payment = {
  id     : string;
  date   : string;
  amount : number;
  note   : string;
};

// ─── Initial data ─────────────────────────────────────────────────────────────
const INITIAL_SUPPLIERS: Fournisseur[] = [
  {
    id: "f1", name: "Fournisseur A", phone: "0550 000 001",
    address: "Zone industrielle, Alger",
    balance: 15000, productIds: ["p1", "p2"],
    payments: [
      { id: "py1", date: "2025-06-01", amount: 5000, note: "Règlement partiel" },
    ],
  },
  {
    id: "f2", name: "Fournisseur B", phone: "0660 000 002",
    address: "Rue Didouche, Oran",
    balance: 0, productIds: ["p3"],
    payments: [],
  },
  {
    id: "f3", name: "Fournisseur C", phone: "0770 000 003",
    address: "Bld Zighoud, Constantine",
    balance: 3200, productIds: [],
    payments: [],
  },
];

// ─── Exported store (used by Products.tsx dropdown) ──────────────────────────
// Import this in Products.tsx:
//   import { useFournisseurStore } from "./fournisseur";
// Then replace the SUPPLIERS array with:
//   const { suppliers } = useFournisseurStore();
//   const supplierNames = suppliers.map(f => f.name);
//
// For now we use a module-level singleton so both screens share state.
// بعد
function loadSuppliers(): Fournisseur[] {
  try {
    const raw = localStorage.getItem("distrigo_suppliers");
    if (raw) return JSON.parse(raw) as Fournisseur[];
  } catch { /* ignore */ }
  return []; // يبدأ فارغاً
}
let _suppliers: Fournisseur[] = loadSuppliers();
let _listeners: (() => void)[] = [];
export function useFournisseurStore() {
  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate(n => n + 1);

  function subscribe() {
    _listeners.push(rerender);
    return () => { _listeners = _listeners.filter(l => l !== rerender); };
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useState(subscribe);

  function notify() { _listeners.forEach(l => l()); }

  function setSuppliers(next: Fournisseur[]) {
    _suppliers = next;
      try { localStorage.setItem("distrigo_suppliers", JSON.stringify(next)); } catch { /* ignore */ }
    notify();
  }
  return {
  get suppliers()  { return _suppliers; },
  setSuppliers,
};
  }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-DZ", { day: "2-digit", month: "short", year: "numeric" });
}
function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const colors = ["#1565C0","#2E7D32","#6A1B9A","#C62828","#E65100","#00695C"];
  const color  = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className="flex items-center justify-center rounded-full flex-shrink-0"
      style={{ width: size, height: size, background: color + "22", border: `1.5px solid ${color}33` }}>
      <span style={{ fontSize: size * 0.36, fontWeight: 700, color }}>{initials(name)}</span>
    </div>
  );
}

// ─── FieldError ───────────────────────────────────────────────────────────────
function FieldError({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-1.5 mt-1.5 px-1">
      <AlertTriangle size={12} style={{ color: "var(--destructive)", flexShrink: 0 }} />
      <span style={{ fontSize: "11px", color: "var(--destructive)", fontWeight: 500 }}>{msg}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FOURNISSEURS COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export function Fournisseurs() {
  const { suppliers, setSuppliers } = useFournisseurStore();

  const [search,     setSearch    ] = useState("");
  const [selected,   setSelected  ] = useState<Fournisseur | null>(null);
  const [showForm,   setShowForm  ] = useState(false);
  const [editF,      setEditF     ] = useState<Partial<Fournisseur>>({});
  const [errors,     setErrors    ] = useState<Record<string, string>>({});
  const [submitted,  setSubmitted ] = useState(false);

  // Payment modal
  const [showPayment, setShowPayment ] = useState(false);
  const [payAmount,   setPayAmount   ] = useState<number | "">("");
  const [payNote,     setPayNote     ] = useState("");
  const [payError,    setPayError    ] = useState("");

  // Detail tab
  const [detailTab, setDetailTab] = useState<"info" | "products" | "payments">("info");

  const filtered = suppliers.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.phone.includes(search)
  );

  const totalDebt = suppliers.reduce((sum, f) => sum + (f.balance > 0 ? f.balance : 0), 0);

  // ── Validation ──────────────────────────────────────────────────────────
  function validate(data: Partial<Fournisseur>): boolean {
    const errs: Record<string, string> = {};
    if (!data.name?.trim()) errs.name = "Le nom est obligatoire.";
    else {
      const dup = suppliers.find(
        f => f.id !== data.id && f.name.trim().toLowerCase() === data.name!.trim().toLowerCase()
      );
      if (dup) errs.name = "Ce fournisseur existe déjà.";
    }
    if (!data.phone?.trim()) errs.phone = "Le numéro de téléphone est obligatoire.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Open form ───────────────────────────────────────────────────────────
  function openEdit(f?: Fournisseur) {
    setEditF(f ? { ...f } : {
      name: "", phone: "", address: "", note: "",
      balance: 0, productIds: [], payments: [],
    });
    setErrors({});
    setSubmitted(false);
    setShowForm(true);
    setSelected(null);
  }

  function saveF() {
    setSubmitted(true);
    if (!validate(editF)) return;
    const final: Fournisseur = {
      id        : editF.id ?? `f${Date.now()}`,
      name      : editF.name!.trim(),
      phone     : editF.phone!.trim(),
      address   : (editF.address ?? "").trim(),
      note      : (editF.note ?? "").trim(),
      balance   : editF.balance ?? 0,
      productIds: editF.productIds ?? [],
      payments  : editF.payments  ?? [],
    };
    if (editF.id) {
      setSuppliers(suppliers.map(f => f.id === editF.id ? final : f));
      setSelected(final);
    } else {
      setSuppliers([...suppliers, final]);
    }
    setShowForm(false);
  }

  function deleteF(id: string) {
    if (!window.confirm("Supprimer ce fournisseur ?")) return;
    setSuppliers(suppliers.filter(f => f.id !== id));
    setSelected(null);
  }

  // ── Add payment ─────────────────────────────────────────────────────────
  function addPayment() {
    if (!selected) return;
    if (!payAmount || Number(payAmount) <= 0) {
      setPayError("Montant invalide."); return;
    }
    const payment: Payment = {
      id    : `py${Date.now()}`,
      date  : new Date().toISOString().split("T")[0],
      amount: Number(payAmount),
      note  : payNote.trim(),
    };
    const updated: Fournisseur = {
      ...selected,
      balance : Math.max(0, selected.balance - Number(payAmount)),
      payments: [payment, ...selected.payments],
    };
    setSuppliers(suppliers.map(f => f.id === selected.id ? updated : f));
    setSelected(updated);
    setShowPayment(false);
    setPayAmount("");
    setPayNote("");
    setPayError("");
  }

  // ── Share ────────────────────────────────────────────────────────────────
  function shareF(f: Fournisseur) {
    const text =
      `Fournisseur : ${f.name}\n` +
      `Tél : ${f.phone}\n` +
      (f.address ? `Adresse : ${f.address}\n` : "") +
      `Solde : ${fmt(f.balance)} DZD`;
    if (navigator.share) navigator.share({ title: f.name, text });
    else navigator.clipboard?.writeText(text);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FORM VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (showForm) {
    return (
      <div className="px-4 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setShowForm(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: "var(--muted)" }}>
            <X size={18} />
          </button>
          <h1 style={{ color: "var(--foreground)" }}>
            {editF.id ? "Modifier le fournisseur" : "Nouveau fournisseur"}
          </h1>
        </div>

        <div className="space-y-4">

          {/* Avatar preview */}
          {editF.name?.trim() && (
            <div className="flex justify-center py-2">
              <Avatar name={editF.name} size={64} />
            </div>
          )}

          {/* Nom */}
          <div>
            <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 4, display: "block" }}>
              Nom du fournisseur <span style={{ color: "var(--destructive)" }}>*</span>
            </label>
            <input type="text"
              value={editF.name ?? ""}
              onChange={e => { setEditF(p => ({ ...p, name: e.target.value })); if (submitted) validate({ ...editF, name: e.target.value }); }}
              placeholder="Ex : Société Al Baraka"
              className="w-full rounded-xl border px-3 py-2.5 outline-none focus:ring-2"
              style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "14px",
                borderColor: errors.name ? "var(--destructive)" : "var(--border)",
                "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
            />
            {errors.name && <FieldError msg={errors.name} />}
          </div>

          {/* Téléphone */}
          <div>
            <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 4, display: "block" }}>
              Numéro de téléphone <span style={{ color: "var(--destructive)" }}>*</span>
            </label>
            <input type="tel"
              value={editF.phone ?? ""}
              onChange={e => { setEditF(p => ({ ...p, phone: e.target.value })); if (submitted) validate({ ...editF, phone: e.target.value }); }}
              placeholder="05XX XXX XXX"
              className="w-full rounded-xl border px-3 py-2.5 outline-none focus:ring-2"
              style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "14px",
                borderColor: errors.phone ? "var(--destructive)" : "var(--border)",
                "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
            />
            {errors.phone && <FieldError msg={errors.phone} />}
          </div>

          {/* Adresse */}
          <div>
            <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 4, display: "block" }}>
              Adresse
            </label>
            <input type="text"
              value={editF.address ?? ""}
              onChange={e => setEditF(p => ({ ...p, address: e.target.value }))}
              placeholder="Rue, ville…"
              className="w-full rounded-xl border border-border px-3 py-2.5 outline-none focus:ring-2"
              style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "14px",
                "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
            />
          </div>

          {/* Solde initial */}
          <div>
            <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 4, display: "block" }}>
              Solde initial (DZD)
            </label>
            <input type="number" min={0}
              value={editF.balance ?? 0}
              onChange={e => setEditF(p => ({ ...p, balance: parseFloat(e.target.value) || 0 }))}
              className="w-full rounded-xl border border-border px-3 py-2.5 outline-none focus:ring-2"
              style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "14px",
                "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
            />
            <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: 4 }}>
              Montant que vous devez à ce fournisseur au départ
            </p>
          </div>

          {/* Note */}
          <div>
            <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 4, display: "block" }}>
              Note (optionnel)
            </label>
            <textarea
              value={editF.note ?? ""}
              onChange={e => setEditF(p => ({ ...p, note: e.target.value }))}
              rows={2}
              placeholder="Informations supplémentaires…"
              className="w-full rounded-xl border border-border px-3 py-2.5 outline-none resize-none focus:ring-2"
              style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "14px",
                "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
            />
          </div>

          {/* Save */}
          <button onClick={saveF}
            className="w-full py-3 rounded-2xl transition-all active:scale-95"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontWeight: 600, fontSize: "15px" }}>
            {editF.id ? "Enregistrer les modifications" : "Ajouter le fournisseur"}
          </button>

          {/* Delete */}
          {editF.id && (
            <button onClick={() => deleteF(editF.id!)}
              className="w-full py-3 rounded-2xl border transition-all active:scale-95"
              style={{ borderColor: "var(--destructive)", color: "var(--destructive)", fontWeight: 500, fontSize: "14px" }}>
              Supprimer ce fournisseur
            </button>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (selected) {
    const isDebt = selected.balance > 0;

    return (
      <div className="px-4 pt-4 pb-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button onClick={() => { setSelected(null); setDetailTab("info"); }}
              className="w-8 h-8 flex items-center justify-center rounded-full"
              style={{ background: "var(--muted)" }}>
              <X size={18} />
            </button>
            <h1 style={{ color: "var(--foreground)" }}>Fournisseur</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => shareF(selected)}
              className="w-8 h-8 flex items-center justify-center rounded-full"
              style={{ background: "var(--muted)" }}>
              <Share2 size={15} style={{ color: "var(--muted-foreground)" }} />
            </button>
            <button onClick={() => openEdit(selected)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{ background: "var(--blue-light)", color: "var(--primary)" }}>
              <Edit2 size={14} />
              <span style={{ fontSize: "13px", fontWeight: 500 }}>Modifier</span>
            </button>
          </div>
        </div>

        {/* Identity card */}
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-4 flex items-center gap-4">
          <Avatar name={selected.name} size={52} />
          <div className="flex-1 min-w-0">
            <h2 style={{ color: "var(--foreground)", fontSize: "17px", fontWeight: 700 }} className="truncate">
              {selected.name}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5"
              style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>
              <Phone size={12} />
              <span>{selected.phone}</span>
            </div>
            {selected.address && (
              <div className="flex items-center gap-1.5 mt-0.5"
                style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>
                <MapPin size={11} />
                <span className="truncate">{selected.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Balance card */}
        <div className="rounded-2xl p-4 mb-4 flex items-center justify-between"
          style={{
            background : isDebt ? "var(--red-light)"   : "var(--green-light)",
            border     : `1px solid ${isDebt ? "rgba(198,40,40,0.25)" : "rgba(27,94,32,0.2)"}`,
          }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: isDebt ? "rgba(198,40,40,0.12)" : "rgba(27,94,32,0.12)" }}>
              <Wallet size={16} style={{ color: isDebt ? "var(--destructive)" : "var(--accent)" }} />
            </div>
            <div>
              <p style={{ fontSize: "11px", color: isDebt ? "var(--destructive)" : "var(--accent)", fontWeight: 500 }}>
                {isDebt ? "Montant dû" : "Solde réglé"}
              </p>
              <p style={{ fontSize: "22px", fontWeight: 800, color: isDebt ? "var(--destructive)" : "var(--accent)", lineHeight: 1.1 }}>
                {fmt(selected.balance)} <span style={{ fontSize: "12px", fontWeight: 400 }}>DZD</span>
              </p>
            </div>
          </div>
          {isDebt && (
            <button
              onClick={() => { setShowPayment(true); setPayAmount(""); setPayNote(""); setPayError(""); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl active:scale-95 transition-transform"
              style={{ background: "var(--destructive)", color: "white", fontSize: "13px", fontWeight: 600 }}>
              <ArrowDownLeft size={14} />
              Payer
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl border border-border overflow-hidden mb-4"
          style={{ background: "var(--muted)" }}>
          {([
            { key: "info"     as const, label: "Infos",      Icon: Building2  },
            { key: "products" as const, label: "Produits",   Icon: Package    },
            { key: "payments" as const, label: "Paiements",  Icon: CreditCard },
          ]).map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setDetailTab(key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 transition-colors"
              style={{
                background : detailTab === key ? "var(--primary)" : "transparent",
                color      : detailTab === key ? "white" : "var(--muted-foreground)",
                fontSize   : "12px", fontWeight: 500,
              }}>
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab: Info ── */}
        {detailTab === "info" && (
          <div className="space-y-3">
            {[
              { icon: Phone,    label: "Téléphone", value: selected.phone   },
              { icon: MapPin,   label: "Adresse",   value: selected.address || "Non renseignée" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-card rounded-2xl p-3.5 border border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--blue-light)" }}>
                  <Icon size={15} style={{ color: "var(--primary)" }} />
                </div>
                <div>
                  <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{label}</p>
                  <p style={{ fontSize: "14px", color: "var(--foreground)", fontWeight: 500 }}>{value}</p>
                </div>
              </div>
            ))}

            {selected.note && (
              <div className="bg-card rounded-2xl p-3.5 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={13} style={{ color: "var(--muted-foreground)" }} />
                  <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Note</span>
                </div>
                <p style={{ fontSize: "13px", color: "var(--foreground)", lineHeight: 1.5 }}>{selected.note}</p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-2xl p-3 border border-border text-center">
                <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Produits liés</p>
                <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--primary)" }}>
                  {selected.productIds.length}
                </p>
              </div>
              <div className="bg-card rounded-2xl p-3 border border-border text-center">
                <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Paiements</p>
                <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--accent)" }}>
                  {selected.payments.length}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Products ── */}
        {detailTab === "products" && (
          <div className="space-y-2">
            {selected.productIds.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: "var(--blue-light)" }}>
                  <Package size={22} style={{ color: "var(--primary)", opacity: 0.5 }} />
                </div>
                <p style={{ fontSize: "13px", color: "var(--muted-foreground)", textAlign: "center" }}>
                  Aucun produit lié à ce fournisseur.{"\n"}
                  Associez-les depuis la fiche produit.
                </p>
              </div>
            ) : (
              selected.productIds.map(id => (
                <div key={id} className="bg-card rounded-2xl p-3.5 border border-border flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "var(--blue-light)" }}>
                    <Package size={16} style={{ color: "var(--primary)" }} />
                  </div>
                  <span style={{ fontSize: "14px", color: "var(--foreground)", fontWeight: 500 }}>
                    Produit #{id}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Tab: Payments ── */}
        {detailTab === "payments" && (
          <div className="space-y-2">
            {selected.payments.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: "var(--green-light)" }}>
                  <CreditCard size={22} style={{ color: "var(--accent)", opacity: 0.5 }} />
                </div>
                <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
                  Aucun paiement enregistré.
                </p>
              </div>
            ) : (
              selected.payments.map(p => (
                <div key={p.id} className="bg-card rounded-2xl p-3.5 border border-border flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--green-light)" }}>
                    <ArrowDownLeft size={15} style={{ color: "var(--accent)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)" }}>
                      {fmt(p.amount)} DZD
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                      {fmtDate(p.date)}{p.note ? ` · ${p.note}` : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Payment modal ── */}
        {showPayment && (
          <div className="fixed inset-0 z-50 flex items-end"
            style={{ background: "rgba(0,0,0,0.45)" }}
            onClick={e => { if (e.target === e.currentTarget) setShowPayment(false); }}>
            <div className="w-full rounded-t-3xl p-5 space-y-4"
              style={{ background: "var(--card)", maxHeight: "70vh", overflowY: "auto" }}>
              <div className="flex items-center justify-between">
                <h2 style={{ color: "var(--foreground)", fontSize: "16px", fontWeight: 700 }}>
                  Enregistrer un paiement
                </h2>
                <button onClick={() => setShowPayment(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full"
                  style={{ background: "var(--muted)" }}>
                  <X size={16} />
                </button>
              </div>

              {/* Remaining balance reminder */}
              <div className="rounded-xl px-3 py-2.5 flex items-center justify-between"
                style={{ background: "var(--red-light)" }}>
                <span style={{ fontSize: "12px", color: "var(--destructive)" }}>Solde restant</span>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--destructive)" }}>
                  {fmt(selected.balance)} DZD
                </span>
              </div>

              {/* Amount */}
              <div>
                <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 4, display: "block" }}>
                  Montant payé (DZD)
                </label>
                <input
                  autoFocus
                  type="number" min={1}
                  value={payAmount}
                  onChange={e => { setPayAmount(parseFloat(e.target.value) || ""); setPayError(""); }}
                  placeholder="0"
                  className="w-full rounded-xl border border-border px-3 py-2.5 outline-none focus:ring-2"
                  style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "16px", fontWeight: 600,
                    "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
                />
                {payError && <FieldError msg={payError} />}
              </div>

              {/* Quick amount buttons */}
              <div className="flex gap-2 flex-wrap">
                {[1000, 2000, 5000, selected.balance].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map(v => (
                  <button key={v} onClick={() => setPayAmount(v)}
                    className="px-3 py-1.5 rounded-xl border border-border transition-colors"
                    style={{
                      background : payAmount === v ? "var(--primary)" : "var(--muted)",
                      color      : payAmount === v ? "white" : "var(--foreground)",
                      fontSize   : "12px", fontWeight: 500,
                    }}>
                    {v === selected.balance ? "Tout régler" : `${fmt(v)} DZD`}
                  </button>
                ))}
              </div>

              {/* Note */}
              <div>
                <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 4, display: "block" }}>
                  Note (optionnel)
                </label>
                <input type="text"
                  value={payNote}
                  onChange={e => setPayNote(e.target.value)}
                  placeholder="Ex : Règlement partiel BL n°42"
                  className="w-full rounded-xl border border-border px-3 py-2.5 outline-none focus:ring-2"
                  style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "14px",
                    "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
                />
              </div>

              <button onClick={addPayment}
                className="w-full py-3 rounded-2xl transition-all active:scale-95"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontWeight: 600, fontSize: "15px" }}>
                Confirmer le paiement
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="px-4 pt-4 pb-6">

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 style={{ color: "var(--foreground)" }}>Fournisseurs</h1>
        <button onClick={() => openEdit()}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "var(--primary)", color: "white" }}>
          <Plus size={20} />
        </button>
      </div>

      {/* Total debt summary */}
      {totalDebt > 0 && (
        <div className="rounded-2xl px-4 py-3 mb-4 flex items-center justify-between"
          style={{ background: "var(--red-light)", border: "1px solid rgba(198,40,40,0.2)" }}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} style={{ color: "var(--destructive)" }} />
            <span style={{ fontSize: "13px", color: "var(--destructive)", fontWeight: 500 }}>
              Total des dettes
            </span>
          </div>
          <span style={{ fontSize: "16px", fontWeight: 800, color: "var(--destructive)" }}>
            {fmt(totalDebt)} DZD
          </span>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--muted-foreground)" }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou téléphone…"
          className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-border outline-none"
          style={{ background: "var(--card)", fontSize: "14px", color: "var(--foreground)" }} />
      </div>

      <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: 10 }}>
        {filtered.length} fournisseur(s)
      </p>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "var(--blue-light)" }}>
              <Building2 size={26} style={{ color: "var(--primary)", opacity: 0.5 }} />
            </div>
            <p style={{ fontSize: "14px", color: "var(--muted-foreground)", fontWeight: 500 }}>
              Aucun fournisseur trouvé
            </p>
            <button onClick={() => openEdit()}
              className="px-4 py-2 rounded-xl"
              style={{ background: "var(--primary)", color: "white", fontSize: "13px", fontWeight: 600 }}>
              Ajouter un fournisseur
            </button>
          </div>
        ) : filtered.map(f => {
          const isDebt = f.balance > 0;
          return (
            <button key={f.id} onClick={() => { setSelected(f); setDetailTab("info"); }}
              className="w-full bg-card rounded-2xl p-3.5 border border-border shadow-sm flex items-center gap-3 active:scale-98 transition-transform text-left"
              style={{ borderColor: isDebt ? "rgba(198,40,40,0.2)" : undefined }}>

              <Avatar name={f.name} size={42} />

              <div className="flex-1 min-w-0">
                <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }}
                  className="truncate">{f.name}</div>
                <div className="flex items-center gap-1 mt-0.5"
                  style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                  <Phone size={11} />
                  <span>{f.phone}</span>
                </div>
                {f.productIds.length > 0 && (
                  <div className="flex items-center gap-1 mt-0.5"
                    style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                    <Package size={10} />
                    <span>{f.productIds.length} produit(s)</span>
                  </div>
                )}
              </div>

              <div className="text-right flex-shrink-0">
                {isDebt ? (
                  <>
                    <div style={{ fontSize: "10px", color: "var(--destructive)", fontWeight: 500 }}>Doit</div>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--destructive)" }}>
                      {fmt(f.balance)} DZD
                    </div>
                  </>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full"
                    style={{ background: "var(--green-light)", color: "var(--accent)", fontSize: "11px", fontWeight: 600 }}>
                    <Check size={11} /> Réglé
                  </span>
                )}
              </div>

              <ChevronRight size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
