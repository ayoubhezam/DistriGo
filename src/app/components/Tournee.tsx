import { useState, useRef } from "react";
import {
  Truck, Plus, X, ChevronRight, CheckCircle, Clock,
  User, Package, AlertTriangle, Banknote,
  CreditCard, RotateCcw, Play, Flag, Search, Minus,
  Calendar, Edit2, LayoutGrid, UserPlus, ChevronDown,
  Save, Trash2,
} from "lucide-react";
import {
  Camion, Chauffeur, Tournee as TourneeType, ChargementItem,
  TourneeVente, RetourItem, TourneeStatut, CustomerType,
} from "./types";
import { CAMIONS, CHAUFFEURS, TOURNEES, PRODUCTS, CUSTOMERS, CATEGORIES } from "./mockData";

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function heureNow()  { return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

const STATUT_META: Record<TourneeStatut, { label: string; color: string; bg: string }> = {
  planifiee : { label: "Planifiée", color: "#f57c00",            bg: "#fff3e0"            },
  en_cours  : { label: "En cours",  color: "var(--primary)",     bg: "var(--blue-light)"  },
  terminee  : { label: "Terminée",  color: "var(--accent)",      bg: "var(--green-light)" },
};

const TYPE_META: Record<CustomerType, { label: string; color: string; bg: string }> = {
  retail    : { label: "Détail",  color: "var(--primary)", bg: "var(--blue-light)" },
  wholesale : { label: "Gros",    color: "#7b1fa2",        bg: "#f3e5f5"           },
  business  : { label: "Société", color: "#e65100",        bg: "#fff3e0"           },
};

function EmptyState({ icon: Icon, title, sub }: {
  icon: React.FC<{ size?: number }>; title: string; sub: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--muted)" }}>
        <Icon size={24} />
      </div>
      <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }}>{title}</p>
      <p style={{ fontSize: "12px", color: "var(--muted-foreground)", textAlign: "center", maxWidth: 220 }}>{sub}</p>
    </div>
  );
}

// ─── shared camions/chauffeurs state (module-level so it persists) ─────────────
let camionsList: Camion[]    = [...CAMIONS];
let chauffeursList: Chauffeur[] = [...CHAUFFEURS];

// ══════════════════════════════════════════════════════════════════════════════
// CATEGORY BOTTOM SHEET (reused from POS logic)
// ══════════════════════════════════════════════════════════════════════════════
function CategorySheet({
  onClose,
  onAddProduct,
  chargement,
}: {
  onClose     : () => void;
  onAddProduct: (productId: string) => void;
  chargement  : ChargementItem[];
}) {
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const sheetProducts = activeCat ? PRODUCTS.filter(p => p.category === activeCat) : [];

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        zIndex: 50, backdropFilter: "blur(2px)",
      }} />
      <div style={{
        position: "fixed", bottom: 64, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, zIndex: 51,
        background: "var(--card)", borderRadius: "20px 20px 0 0",
        boxShadow: "0 -4px 32px rgba(0,0,0,0.18)",
        maxHeight: "75vh", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3"
          style={{ borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div className="flex items-center gap-2">
            {activeCat && (
              <button onClick={() => setActiveCat(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "var(--muted)" }}>
                <ChevronRight size={14} style={{ transform: "rotate(180deg)" }} />
              </button>
            )}
            <LayoutGrid size={15} style={{ color: "var(--primary)" }} />
            <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--foreground)" }}>
              {activeCat ?? "Catégories"}
            </span>
            {activeCat && (
              <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                · {sheetProducts.length} produit(s)
              </span>
            )}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "var(--muted)" }}>
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {/* Category grid */}
          {!activeCat && (
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.filter(c => c !== "Tous").map(cat => {
                const count = PRODUCTS.filter(p => p.category === cat).length;
                return (
                  <button key={cat} onClick={() => setActiveCat(cat)}
                    className="flex items-center gap-3 p-3.5 rounded-2xl border border-border text-left transition-all active:scale-95"
                    style={{ background: "var(--background)" }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--blue-light)" }}>
                      <Package size={16} style={{ color: "var(--primary)" }} />
                    </div>
                    <div className="min-w-0">
                      <p style={{ fontWeight: 600, fontSize: "13px", color: "var(--foreground)" }}
                        className="truncate">{cat}</p>
                      <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                        {count} produit(s)
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Products in category — multi-select, no auto-close */}
          {activeCat && (
            <div className="space-y-2">
              {sheetProducts.map(p => {
                const inCharge = chargement.find(i => i.productId === p.id);
                return (
                  <div key={p.id}
                    className="flex items-center gap-3 p-3 rounded-2xl border"
                    style={{
                      background : inCharge ? "var(--blue-light)" : "var(--background)",
                      borderColor: inCharge ? "var(--primary)"    : "var(--border)",
                    }}>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontWeight: 600, fontSize: "13px", color: "var(--foreground)" }}
                        className="truncate">{p.name}</p>
                      <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                        Stock : {p.stockEntrepot ?? p.stock} · {fmt(p.sellingPrice)} MAD
                      </p>
                    </div>
                    {/* tap adds 1 each time without closing */}
                    <button onClick={() => onAddProduct(p.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
                      style={{ background: "var(--primary)", color: "white" }}>
                      <Plus size={16} />
                    </button>
                    {inCharge && (
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)",
                        minWidth: 20, textAlign: "center" }}>
                        {inCharge.qty}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 flex items-center justify-between"
          style={{ borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
            {chargement.reduce((a, i) => a + i.qty, 0)} unités sélectionnées
          </span>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl"
            style={{ background: "var(--primary)", color: "white", fontWeight: 600, fontSize: "13px" }}>
            Valider
          </button>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CAMION FORM (add / edit)
// ══════════════════════════════════════════════════════════════════════════════
function CamionForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Camion; onSave: (c: Camion) => void; onCancel: () => void;
}) {
  const [nom,   setNom  ] = useState(initial?.nom   ?? "");
  const [immat, setImmat] = useState(initial?.immat ?? "");
  const [marque,setMarque] = useState(initial?.marque ?? "");

  return (
    <div className="rounded-2xl border border-border p-4 space-y-3 mb-3"
      style={{ background: "var(--card)" }}>
      <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }}>
        {initial ? "Modifier le camion" : "Nouveau camion"}
      </p>
      {[
        { label: "Nom *",          val: nom,    set: setNom,    ph: "ex: Camion 01"          },
        { label: "Immatriculation",val: immat,  set: setImmat,  ph: "ex: 16-001-213"         },
        { label: "Marque",         val: marque, set: setMarque, ph: "ex: Mercedes Sprinter"  },
      ].map(({ label, val, set, ph }) => (
        <div key={label}>
          <label style={{ fontSize: "12px", color: "var(--muted-foreground)", display: "block", marginBottom: 3 }}>
            {label}
          </label>
          <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
            className="w-full rounded-xl border border-border px-3 py-2 outline-none"
            style={{ background: "var(--input-background)", fontSize: "13px", color: "var(--foreground)" }} />
        </div>
      ))}
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 rounded-xl"
          style={{ background: "var(--muted)", color: "var(--foreground)", fontWeight: 500 }}>
          Annuler
        </button>
        <button
          onClick={() => {
            if (!nom.trim()) return;
            onSave({ id: initial?.id ?? `cam${Date.now()}`, nom: nom.trim(),
              immat: immat || undefined, marque: marque || undefined, actif: true });
          }}
          className="flex-1 py-2 rounded-xl"
          style={{ background: "var(--primary)", color: "white", fontWeight: 600 }}>
          {initial ? "Enregistrer" : "Ajouter"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CHAUFFEUR FORM (add / edit)
// ══════════════════════════════════════════════════════════════════════════════
function ChauffeurForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Chauffeur; onSave: (c: Chauffeur) => void; onCancel: () => void;
}) {
  const [prenom, setPrenom] = useState(initial?.prenom ?? "");
  const [nom,    setNom   ] = useState(initial?.nom    ?? "");
  const [phone,  setPhone ] = useState(initial?.phone  ?? "");

  return (
    <div className="rounded-2xl border border-border p-4 space-y-3 mb-3"
      style={{ background: "var(--card)" }}>
      <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }}>
        {initial ? "Modifier le chauffeur" : "Nouveau chauffeur"}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Prénom *", val: prenom, set: setPrenom, ph: "Prénom" },
          { label: "Nom *",    val: nom,    set: setNom,    ph: "Nom"    },
        ].map(({ label, val, set, ph }) => (
          <div key={label}>
            <label style={{ fontSize: "12px", color: "var(--muted-foreground)", display: "block", marginBottom: 3 }}>
              {label}
            </label>
            <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
              className="w-full rounded-xl border border-border px-3 py-2 outline-none"
              style={{ background: "var(--input-background)", fontSize: "13px", color: "var(--foreground)" }} />
          </div>
        ))}
      </div>
      <div>
        <label style={{ fontSize: "12px", color: "var(--muted-foreground)", display: "block", marginBottom: 3 }}>
          Téléphone
        </label>
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+213 6xx xxx xxx"
          className="w-full rounded-xl border border-border px-3 py-2 outline-none"
          style={{ background: "var(--input-background)", fontSize: "13px", color: "var(--foreground)" }} />
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 rounded-xl"
          style={{ background: "var(--muted)", color: "var(--foreground)", fontWeight: 500 }}>
          Annuler
        </button>
        <button
          onClick={() => {
            if (!prenom.trim() || !nom.trim()) return;
            onSave({ id: initial?.id ?? `ch${Date.now()}`, prenom: prenom.trim(),
              nom: nom.trim(), phone: phone || undefined, actif: true });
          }}
          className="flex-1 py-2 rounded-xl"
          style={{ background: "var(--primary)", color: "white", fontWeight: 600 }}>
          {initial ? "Enregistrer" : "Ajouter"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ÉTAPE 1 — PLANIFICATION
// ══════════════════════════════════════════════════════════════════════════════
function EtapePlanification({
  onStart, onCancel,
}: {
  onStart: (t: TourneeType) => void; onCancel: () => void;
}) {
  const [camions,    setCamions   ] = useState<Camion[]>(camionsList);
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>(chauffeursList);

  const [date,        setDate       ] = useState(todayISO());
  const [camionId,    setCamionId   ] = useState("");
  const [chauffeurId, setChauffeurId] = useState("");

  const [showCamionForm,    setShowCamionForm   ] = useState(false);
  const [editCamion,        setEditCamion        ] = useState<Camion | undefined>();
  const [showChauffeurForm, setShowChauffeurForm ] = useState(false);
  const [editChauffeur,     setEditChauffeur     ] = useState<Chauffeur | undefined>();

  const [step, setStep] = useState<"config" | "chargement">("config");

  // chargement state
  const [chargement,    setChargement   ] = useState<ChargementItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showCatSheet,  setShowCatSheet ] = useState(false);

  const canProceed = !!camionId && !!chauffeurId;

  const filteredProducts = PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.barcode.includes(productSearch)
  ).slice(0, 15);

  const totalCharge = chargement.reduce((a, i) => a + i.qty * i.unitPrice, 0);

  function saveCamion(c: Camion) {
    const updated = camions.find(x => x.id === c.id)
      ? camions.map(x => x.id === c.id ? c : x)
      : [...camions, c];
    camionsList = updated;
    setCamions(updated);
    setCamionId(c.id);
    setShowCamionForm(false);
    setEditCamion(undefined);
  }

  function saveChauffeur(c: Chauffeur) {
    const updated = chauffeurs.find(x => x.id === c.id)
      ? chauffeurs.map(x => x.id === c.id ? c : x)
      : [...chauffeurs, c];
    chauffeursList = updated;
    setChauffeurs(updated);
    setChauffeurId(c.id);
    setShowChauffeurForm(false);
    setEditChauffeur(undefined);
  }

  function addProductToCharge(productId: string) {
    const p = PRODUCTS.find(p => p.id === productId);
    if (!p) return;
    setChargement(prev => {
      const existing = prev.find(i => i.productId === productId);
      if (existing) return prev.map(i =>
        i.productId === productId ? { ...i, qty: i.qty + 1 } : i
      );
      return [...prev, { productId: p.id, productName: p.name, qty: 1, unitPrice: p.sellingPrice }];
    });
  }

  function updateQty(productId: string, val: number | "") {
    if (val === "") {
      setChargement(prev => prev.map(i => i.productId === productId ? { ...i, qty: 0 } : i));
      return;
    }
    const qty = Math.max(0, Number(val));
    setChargement(prev =>
      prev.map(i => i.productId === productId ? { ...i, qty } : i).filter(i => i.qty > 0)
    );
  }

  function handleStart() {
    if (!canProceed || chargement.length === 0) return;
    const camion    = camions.find(c => c.id === camionId)!;
    const chauffeur = chauffeurs.find(c => c.id === chauffeurId);
    onStart({
      id: `T-${Date.now()}`, date,
      camionId, camionNom: camion.nom,
      chauffeurId: chauffeur?.id,
      chauffeurNom: chauffeur ? `${chauffeur.prenom} ${chauffeur.nom}` : undefined,
      statut: "en_cours", heureDepart: heureNow(),
      chargement, ventes: [], retours: [],
      totalVentes: 0, totalCash: 0, totalCredit: 0, nbClients: 0,
    });
  }

  // ── Step: config ────────────────────────────────────────────────────────
  if (step === "config") {
    return (
      <div className="px-4 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: "var(--muted)" }}>
            <X size={18} />
          </button>
          <h1 style={{ color: "var(--foreground)" }}>Nouvelle tournée</h1>
        </div>

        <div className="space-y-5">
          {/* Date — editable */}
          <div>
            <label style={{ fontSize: "13px", color: "var(--muted-foreground)", display: "block", marginBottom: 6 }}>
              Date
            </label>
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-border"
              style={{ background: "var(--card)" }}>
              <Calendar size={16} style={{ color: "var(--primary)" }} />
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="flex-1 outline-none"
                style={{ background: "transparent", fontSize: "14px", fontWeight: 600,
                  color: "var(--foreground)" }} />
            </div>
          </div>

          {/* Camion */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Camion *</label>
              <button onClick={() => { setEditCamion(undefined); setShowCamionForm(true); }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg"
                style={{ background: "var(--blue-light)", color: "var(--primary)", fontSize: "11px", fontWeight: 600 }}>
                <Plus size={11} /> Nouveau
              </button>
            </div>

            {showCamionForm && (
              <CamionForm
                initial={editCamion}
                onSave={saveCamion}
                onCancel={() => { setShowCamionForm(false); setEditCamion(undefined); }}
              />
            )}

            <div className="space-y-2">
              {camions.filter(c => c.actif).map(c => (
                <div key={c.id} className="flex items-center gap-2">
                  <button onClick={() => setCamionId(c.id)}
                    className="flex-1 flex items-center gap-3 p-3 rounded-2xl border transition-all text-left"
                    style={{
                      background : camionId === c.id ? "var(--blue-light)" : "var(--card)",
                      borderColor: camionId === c.id ? "var(--primary)"    : "var(--border)",
                    }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: camionId === c.id ? "var(--primary)" : "var(--muted)" }}>
                      <Truck size={16} style={{ color: camionId === c.id ? "white" : "var(--muted-foreground)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontWeight: 600, fontSize: "13px",
                        color: camionId === c.id ? "var(--primary)" : "var(--foreground)" }}>{c.nom}</p>
                      {(c.marque || c.immat) && (
                        <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                          {[c.marque, c.immat].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    {camionId === c.id && <CheckCircle size={16} style={{ color: "var(--primary)" }} />}
                  </button>
                  <button onClick={() => { setEditCamion(c); setShowCamionForm(true); }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--muted)" }}>
                    <Edit2 size={13} style={{ color: "var(--muted-foreground)" }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Chauffeur */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Chauffeur *</label>
              <button onClick={() => { setEditChauffeur(undefined); setShowChauffeurForm(true); }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg"
                style={{ background: "var(--blue-light)", color: "var(--primary)", fontSize: "11px", fontWeight: 600 }}>
                <Plus size={11} /> Nouveau
              </button>
            </div>

            {showChauffeurForm && (
              <ChauffeurForm
                initial={editChauffeur}
                onSave={saveChauffeur}
                onCancel={() => { setShowChauffeurForm(false); setEditChauffeur(undefined); }}
              />
            )}

            <div className="space-y-2">
              {chauffeurs.filter(c => c.actif).map(c => (
                <div key={c.id} className="flex items-center gap-2">
                  <button onClick={() => setChauffeurId(prev => prev === c.id ? "" : c.id)}
                    className="flex-1 flex items-center gap-3 p-3 rounded-2xl border transition-all text-left"
                    style={{
                      background : chauffeurId === c.id ? "var(--blue-light)" : "var(--card)",
                      borderColor: chauffeurId === c.id ? "var(--primary)"    : "var(--border)",
                    }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: chauffeurId === c.id ? "var(--primary)" : "var(--muted)" }}>
                      <User size={16} style={{ color: chauffeurId === c.id ? "white" : "var(--muted-foreground)" }} />
                    </div>
                    <div className="flex-1">
                      <p style={{ fontWeight: 600, fontSize: "13px",
                        color: chauffeurId === c.id ? "var(--primary)" : "var(--foreground)" }}>
                        {c.prenom} {c.nom}
                      </p>
                      {c.phone && <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{c.phone}</p>}
                    </div>
                    {chauffeurId === c.id && <CheckCircle size={16} style={{ color: "var(--primary)" }} />}
                  </button>
                  <button onClick={() => { setEditChauffeur(c); setShowChauffeurForm(true); }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--muted)" }}>
                    <Edit2 size={13} style={{ color: "var(--muted-foreground)" }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStep("chargement")}
            disabled={!canProceed}
            className="w-full py-3 rounded-2xl transition-all active:scale-95 disabled:opacity-40"
            style={{ background: "var(--primary)", color: "white", fontWeight: 600, fontSize: "15px" }}>
            Suivant — Chargement →
          </button>
        </div>
      </div>
    );
  }

  // ── Step: chargement ────────────────────────────────────────────────────
  return (
    <div className="px-4 pt-4 pb-6" style={{ position: "relative" }}>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setStep("config")}
          className="w-8 h-8 flex items-center justify-center rounded-full"
          style={{ background: "var(--muted)" }}>
          <ChevronRight size={18} style={{ transform: "rotate(180deg)" }} />
        </button>
        <div>
          <h1 style={{ color: "var(--foreground)" }}>Chargement</h1>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
            {camions.find(c => c.id === camionId)?.nom}
            {chauffeurId && ` · ${chauffeurs.find(c => c.id === chauffeurId)?.prenom}`}
          </p>
        </div>
      </div>

      {/* Search + category icon */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--muted-foreground)" }} />
          <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
            placeholder="Rechercher un produit…"
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-border outline-none"
            style={{ background: "var(--card)", fontSize: "13px", color: "var(--foreground)" }} />
        </div>
        <button onClick={() => setShowCatSheet(true)}
          className="flex items-center justify-center w-11 h-11 rounded-2xl flex-shrink-0 transition-all active:scale-95"
          style={{ background: "var(--primary)", color: "white" }}>
          <LayoutGrid size={18} />
        </button>
      </div>

      {/* Search results */}
      {productSearch.length > 0 && (
        <div className="rounded-2xl border border-border overflow-hidden mb-3"
          style={{ background: "var(--card)", maxHeight: 200, overflowY: "auto" }}>
          {filteredProducts.map(p => (
            <button key={p.id} onClick={() => { addProductToCharge(p.id); setProductSearch(""); }}
              className="w-full flex items-center justify-between px-3 py-2.5 border-b border-border last:border-0 text-left">
              <div>
                <p style={{ fontWeight: 500, fontSize: "13px", color: "var(--foreground)" }}>{p.name}</p>
                <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                  Stock : {p.stockEntrepot ?? p.stock}
                </p>
              </div>
              <Plus size={16} style={{ color: "var(--primary)" }} />
            </button>
          ))}
        </div>
      )}

      {/* Chargement list with manual qty input */}
      {chargement.length === 0 ? (
        <EmptyState icon={Package} title="Chargement vide"
          sub="Recherchez ou parcourez les catégories pour ajouter des produits." />
      ) : (
        <div className="space-y-2 mb-4">
          {chargement.map(item => (
            <div key={item.productId}
              className="bg-card rounded-2xl p-3 border border-border flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p style={{ fontWeight: 600, fontSize: "13px", color: "var(--foreground)" }}
                  className="truncate">{item.productName}</p>
                <p style={{ fontSize: "11px", color: "var(--primary)", fontWeight: 600 }}>
                  {fmt(item.qty * item.unitPrice)} MAD
                </p>
              </div>
              {/* Manual qty input + stepper */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => updateQty(item.productId, item.qty - 1)}
                  className="w-7 h-7 rounded-full border border-border flex items-center justify-center">
                  <Minus size={12} />
                </button>
                <input
                  type="number" min={0}
                  value={item.qty === 0 ? "" : item.qty}
                  onChange={e => updateQty(item.productId, e.target.value === "" ? "" : parseInt(e.target.value) || 0)}
                  className="rounded-lg border border-border outline-none text-center"
                  style={{ width: 44, height: 28, fontSize: "14px", fontWeight: 700,
                    color: "var(--foreground)", background: "var(--input-background)" }}
                />
                <button onClick={() => updateQty(item.productId, item.qty + 1)}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "var(--primary)", color: "white" }}>
                  <Plus size={12} />
                </button>
              </div>
              <button onClick={() => setChargement(prev => prev.filter(i => i.productId !== item.productId))}>
                <Trash2 size={14} style={{ color: "var(--destructive)" }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      {chargement.length > 0 && (
        <div className="rounded-2xl p-4 mb-4"
          style={{ background: "var(--blue-light)", border: "1px solid var(--primary)" }}>
          <div className="flex justify-between items-center">
            <span style={{ fontSize: "13px", color: "var(--primary)" }}>
              {chargement.reduce((a, i) => a + i.qty, 0)} unités chargées
            </span>
            <span style={{ fontWeight: 800, fontSize: "18px", color: "var(--primary)" }}>
              {fmt(totalCharge)} MAD
            </span>
          </div>
        </div>
      )}

      <button onClick={handleStart} disabled={chargement.length === 0}
        className="w-full py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
        style={{ background: "var(--accent)", color: "white", fontWeight: 700, fontSize: "15px" }}>
        <Play size={18} /> Démarrer la tournée
      </button>

      {/* Category bottom sheet */}
      {showCatSheet && (
        <CategorySheet
          onClose={() => setShowCatSheet(false)}
          onAddProduct={addProductToCharge}
          chargement={chargement}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VENTE FORM (add new or edit existing)
// ══════════════════════════════════════════════════════════════════════════════
function VenteForm({
  tournee,
  initial,
  onSave,
  onCancel,
}: {
  tournee  : TourneeType;
  initial? : TourneeVente;
  onSave   : (v: TourneeVente) => void;
  onCancel : () => void;
}) {
  const [custSearch,     setCustSearch    ] = useState("");
  const [selectedCustId, setSelectedCustId] = useState(initial?.customerId ?? "");
  const [showNewCust,    setShowNewCust   ] = useState(false);
  const [newCustName,    setNewCustName   ] = useState("");
  const [newCustPhone,   setNewCustPhone  ] = useState("");
  const [newCustType,    setNewCustType   ] = useState<CustomerType>("retail");
  const [allCusts,       setAllCusts      ] = useState([...CUSTOMERS]);

  const [cart, setCart] = useState<{ productId: string; productName: string; qty: number; unitPrice: number }[]>(
    initial?.items ?? []
  );
  const [paiement, setPaiement] = useState<"cash" | "credit">(initial?.paiement ?? "cash");

  // stock restant dans camion (excluding current vente if editing)
  const stockCamion: Record<string, number> = {};
  for (const item of tournee.chargement) stockCamion[item.productId] = item.qty;
  for (const v of tournee.ventes) {
    if (v.id === initial?.id) continue; // exclude self when editing
    for (const item of v.items) {
      stockCamion[item.productId] = (stockCamion[item.productId] ?? 0) - item.qty;
    }
  }

  const cartTotal = cart.reduce((a, i) => a + i.qty * i.unitPrice, 0);
  const filteredCusts = allCusts.filter(c =>
    c.id !== "c0" &&
    (c.name.toLowerCase().includes(custSearch.toLowerCase()) || c.phone.includes(custSearch))
  );

  function addNewCust() {
    if (!newCustName.trim()) return;
    const nc = {
      id: `c${Date.now()}`, name: newCustName.trim(),
      phone: newCustPhone || "—", address: "",
      customerType: newCustType, openingBalance: 0, balance: 0, creditLimit: 5000,
    };
    CUSTOMERS.push(nc as any);
    setAllCusts([...CUSTOMERS]);
    setSelectedCustId(nc.id);
    setShowNewCust(false);
    setNewCustName(""); setNewCustPhone("");
  }

  function updateCartQty(productId: string, val: number | "") {
    if (val === "") { setCart(prev => prev.map(i => i.productId === productId ? { ...i, qty: 0 } : i)); return; }
    const remaining = stockCamion[productId] ?? 0;                          // ✅ اجلب الكمية المتبقية
    const inCartQty = cart.find(i => i.productId === productId)?.qty ?? 0;  // ✅ الكمية الحالية في السلة
    const maxAllowed = remaining + inCartQty;                                // ✅ الحد الأقصى = المتبقي + ما في السلة
    const qty = Math.max(0, Math.min(Number(val), maxAllowed));
    setCart(prev => prev.map(i => i.productId === productId ? { ...i, qty } : i).filter(i => i.qty > 0));
  }

  function addToCart(productId: string) {
    const ch = tournee.chargement.find(i => i.productId === productId);
    if (!ch) return;
    setCart(prev => {
      const existing = prev.find(i => i.productId === productId);
      if (existing) return prev.map(i => 
  i.productId === productId 
    ? { ...i, qty: Math.min(i.qty + 1, stockCamion[productId] ?? 0) }  // ✅ لا تتجاوز المتبقي
    : i
);
      return [...prev, { productId, productName: ch.productName, qty: 1, unitPrice: ch.unitPrice }];
    });
  }

  function save() {
    if (!selectedCustId || cart.length === 0) return;
    const cust = allCusts.find(c => c.id === selectedCustId)!;
    onSave({
      id          : initial?.id ?? `TV-${Date.now()}`,
      customerId  : cust.id,
      customerName: cust.name,
      items       : cart,
      total       : cartTotal,
      paiement,
      heure       : initial?.heure ?? heureNow(),
    });
  }

  const selectedCust = allCusts.find(c => c.id === selectedCustId);

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onCancel}
          className="w-8 h-8 flex items-center justify-center rounded-full"
          style={{ background: "var(--muted)" }}>
          <X size={18} />
        </button>
        <h1 style={{ color: "var(--foreground)" }}>
          {initial ? "Modifier la vente" : "Nouvelle vente"}
        </h1>
      </div>

      {/* ── Customer selection ── */}
      {!selectedCustId ? (
        <>
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--muted-foreground)" }} />
            <input value={custSearch} onChange={e => setCustSearch(e.target.value)}
              placeholder="Rechercher un client…" autoFocus
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-border outline-none"
              style={{ background: "var(--card)", fontSize: "14px", color: "var(--foreground)" }} />
          </div>

          {/* New customer inline form */}
          {showNewCust ? (
            <div className="rounded-2xl border border-border p-4 mb-3 space-y-3"
              style={{ background: "var(--card)" }}>
              <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }}>
                Nouveau client
              </p>
              <input value={newCustName} onChange={e => setNewCustName(e.target.value)}
                placeholder="Nom *"
                className="w-full rounded-xl border border-border px-3 py-2.5 outline-none"
                style={{ background: "var(--input-background)", fontSize: "14px", color: "var(--foreground)" }} />
              <input value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)}
                placeholder="Téléphone (optionnel)"
                className="w-full rounded-xl border border-border px-3 py-2.5 outline-none"
                style={{ background: "var(--input-background)", fontSize: "14px", color: "var(--foreground)" }} />
              <div className="flex gap-2">
                {(["retail","wholesale","business"] as CustomerType[]).map(t => {
                  const m = TYPE_META[t]; const active = newCustType === t;
                  return (
                    <button key={t} onClick={() => setNewCustType(t)}
                      className="flex-1 py-2 rounded-xl border text-xs font-semibold transition-all"
                      style={{
                        background : active ? m.bg    : "var(--input-background)",
                        borderColor: active ? m.color : "var(--border)",
                        color      : active ? m.color : "var(--muted-foreground)",
                      }}>{m.label}</button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowNewCust(false)} className="flex-1 py-2.5 rounded-xl"
                  style={{ background: "var(--muted)", color: "var(--foreground)", fontWeight: 500 }}>
                  Annuler
                </button>
                <button onClick={addNewCust} className="flex-1 py-2.5 rounded-xl"
                  style={{ background: "var(--primary)", color: "white", fontWeight: 600 }}>
                  Ajouter
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowNewCust(true)}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl mb-3 transition-all active:scale-95"
              style={{ background: "var(--green-light)", color: "var(--accent)", fontWeight: 600, fontSize: "14px" }}>
              <UserPlus size={16} /> Nouveau client
            </button>
          )}

          <div className="space-y-2">
            {filteredCusts.slice(0, 10).map(c => (
              <button key={c.id} onClick={() => setSelectedCustId(c.id)}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-border text-left"
                style={{ background: "var(--card)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--blue-light)" }}>
                  <User size={16} style={{ color: "var(--primary)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }}>{c.name}</p>
                  <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{c.phone}</p>
                </div>
                {c.balance > 0 && (
                  <span style={{ fontSize: "11px", color: "var(--destructive)", fontWeight: 600 }}>
                    {fmt(c.balance)} dû
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Selected customer badge */}
          <div className="flex items-center gap-3 p-3.5 rounded-2xl mb-4"
            style={{ background: "var(--blue-light)", border: "1px solid var(--primary)" }}>
            <User size={16} style={{ color: "var(--primary)" }} />
            <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--primary)", flex: 1 }}>
              {selectedCust?.name}
            </span>
            <button onClick={() => setSelectedCustId("")}>
              <X size={14} style={{ color: "var(--primary)" }} />
            </button>
          </div>

          {/* Products from chargement */}
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: 8 }}>
            Produits disponibles dans le camion
          </p>
          <div className="space-y-2 mb-4">
            {tournee.chargement.map(item => {
              const remaining = stockCamion[item.productId] ?? 0;
              const inCart    = cart.find(i => i.productId === item.productId);
              if (remaining <= 0 && !inCart) return null;
              return (
                <div key={item.productId}
                  className="flex items-center gap-3 p-3 rounded-2xl border"
                  style={{
                    background : inCart ? "var(--blue-light)" : "var(--card)",
                    borderColor: inCart ? "var(--primary)"    : "var(--border)",
                  }}>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontWeight: 600, fontSize: "13px", color: "var(--foreground)" }}
                      className="truncate">{item.productName}</p>
                    <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                      Restant : {remaining} · {fmt(item.unitPrice)} MAD/u
                    </p>
                  </div>
                  {inCart ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => updateCartQty(item.productId, inCart.qty - 1)}
                        className="w-7 h-7 rounded-full border border-border flex items-center justify-center"
                        style={{ background: "var(--card)" }}>
                        <Minus size={12} />
                      </button>
                      <input
                        type="number" min={0} max={remaining + inCart.qty}
                        value={inCart.qty === 0 ? "" : inCart.qty}
                        onChange={e => updateCartQty(item.productId,
                          e.target.value === "" ? "" : parseInt(e.target.value) || 0)}
                        className="rounded-lg border border-border outline-none text-center"
                        style={{ width: 44, height: 28, fontSize: "14px", fontWeight: 700,
                          color: "var(--primary)", background: "var(--card)" }}
                      />
                      <button
                        onClick={() => inCart.qty < remaining && updateCartQty(item.productId, inCart.qty + 1)}
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: "var(--primary)", color: "white" }}>
                        <Plus size={12} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(item.productId)}
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--primary)", color: "white" }}>
                      <Plus size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Paiement */}
          {cart.length > 0 && (
            <>
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 8 }}>
                Mode de règlement
              </p>
              <div className="flex gap-2 mb-4">
                {([
                  { val: "cash"   as const, label: "Espèces",  Icon: Banknote   },
                  { val: "credit" as const, label: "À crédit", Icon: CreditCard },
                ]).map(({ val, label, Icon }) => (
                  <button key={val} onClick={() => setPaiement(val)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all"
                    style={{
                      background : paiement === val ? "var(--blue-light)" : "var(--card)",
                      borderColor: paiement === val ? "var(--primary)"    : "var(--border)",
                      color      : paiement === val ? "var(--primary)"    : "var(--foreground)",
                      fontWeight : paiement === val ? 600 : 400, fontSize: "13px",
                    }}>
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-center mb-4 px-4 py-3 rounded-2xl"
                style={{ background: "var(--blue-light)" }}>
                <span style={{ fontSize: "13px", color: "var(--primary)" }}>Total</span>
                <span style={{ fontWeight: 800, fontSize: "20px", color: "var(--primary)" }}>
                  {fmt(cartTotal)} MAD
                </span>
              </div>

              <button onClick={save}
                className="w-full py-3 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
                style={{ background: "var(--accent)", color: "white", fontWeight: 700, fontSize: "15px" }}>
                <Save size={16} /> {initial ? "Enregistrer les modifications" : "Confirmer la vente"}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ÉTAPE 2 — EN TOURNÉE
// ══════════════════════════════════════════════════════════════════════════════
function EtapeEnTournee({
  tournee, onAddVente, onEditVente, onCloturer,
}: {
  tournee     : TourneeType;
  onAddVente  : (v: TourneeVente) => void;
  onEditVente : (v: TourneeVente) => void;
  onCloturer  : () => void;
}) {
  const [showVenteForm, setShowVenteForm] = useState(false);
  const [editVente,     setEditVente    ] = useState<TourneeVente | undefined>();

  const totalVentes = tournee.ventes.reduce((a, v) => a + v.total, 0);
  const totalCash   = tournee.ventes.filter(v => v.paiement === "cash").reduce((a, v) => a + v.total, 0);
  const totalCredit = tournee.ventes.filter(v => v.paiement === "credit").reduce((a, v) => a + v.total, 0);

  const stockCamion: Record<string, number> = {};
  for (const item of tournee.chargement) stockCamion[item.productId] = item.qty;
  for (const v of tournee.ventes) {
    for (const item of v.items) {
      stockCamion[item.productId] = (stockCamion[item.productId] ?? 0) - item.qty;
    }
  }

  if (showVenteForm) {
    return (
      <VenteForm
        tournee={tournee}
        initial={editVente}
        onSave={v => {
          if (editVente) onEditVente(v); else onAddVente(v);
          setShowVenteForm(false); setEditVente(undefined);
        }}
        onCancel={() => { setShowVenteForm(false); setEditVente(undefined); }}
      />
    );
  }

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 style={{ color: "var(--foreground)" }}>En tournée</h1>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
            {tournee.camionNom}
            {tournee.chauffeurNom && ` · ${tournee.chauffeurNom}`}
          </p>
        </div>
        <button onClick={onCloturer}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
          style={{ background: "var(--red-light)", color: "var(--destructive)", fontSize: "12px", fontWeight: 600 }}>
          <Flag size={13} /> Clôturer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "Ventes",  value: fmt(totalVentes), color: "var(--foreground)" },
          { label: "Cash",    value: fmt(totalCash),   color: "var(--accent)"     },
          { label: "Crédit",  value: fmt(totalCredit), color: "#f57c00"           },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl p-3 border border-border text-center"
            style={{ background: "var(--card)" }}>
            <p style={{ fontSize: "10px", color: "var(--muted-foreground)", marginBottom: 2 }}>{label}</p>
            <p style={{ fontSize: "13px", fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Stock camion restant */}
      <div className="rounded-2xl border border-border p-4 mb-4" style={{ background: "var(--card)" }}>
        <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted-foreground)",
          textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
          Stock camion restant
        </p>
        <div className="space-y-2">
          {tournee.chargement.map(item => {
            const remaining = stockCamion[item.productId] ?? 0;
            const pct = item.qty > 0 ? (remaining / item.qty) * 100 : 0;
            return (
              <div key={item.productId}>
                <div className="flex justify-between mb-1">
                  <span style={{ fontSize: "12px", color: "var(--foreground)" }}
                    className="truncate flex-1 mr-2">{item.productName}</span>
                  <span style={{ fontSize: "12px", fontWeight: 600,
                    color: remaining === 0 ? "var(--muted-foreground)" : "var(--foreground)" }}>
                    {remaining} / {item.qty}
                  </span>
                </div>
                <div className="rounded-full overflow-hidden" style={{ height: 4, background: "var(--muted)" }}>
                  <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999,
                    background: pct > 30 ? "var(--accent)" : pct > 0 ? "#f57c00" : "var(--muted)" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clients visités — with edit */}
      {tournee.ventes.length > 0 && (
        <div className="mb-4">
          <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted-foreground)",
            textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Clients visités ({tournee.ventes.length})
          </p>
          <div className="space-y-2">
            {tournee.ventes.map(v => (
              <div key={v.id} className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-3 p-3.5 rounded-2xl border border-border"
                  style={{ background: "var(--card)" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: v.paiement === "cash" ? "var(--green-light)" : "#fff3e0" }}>
                    {v.paiement === "cash"
                      ? <Banknote size={16} style={{ color: "var(--accent)" }} />
                      : <CreditCard size={16} style={{ color: "#e65100" }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontWeight: 600, fontSize: "13px", color: "var(--foreground)" }}
                      className="truncate">{v.customerName}</p>
                    <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                      {v.heure} · {v.items.length} article(s)
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p style={{ fontWeight: 700, fontSize: "14px",
                      color: v.paiement === "cash" ? "var(--accent)" : "#e65100" }}>
                      {fmt(v.total)} MAD
                    </p>
                  </div>
                </div>
                {/* Edit button */}
                <button
                  onClick={() => { setEditVente(v); setShowVenteForm(true); }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--blue-light)" }}>
                  <Edit2 size={14} style={{ color: "var(--primary)" }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={() => { setEditVente(undefined); setShowVenteForm(true); }}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl transition-all active:scale-95"
        style={{ background: "var(--primary)", color: "white", fontWeight: 700, fontSize: "15px" }}>
        <Plus size={18} /> Nouvelle vente
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ÉTAPE 3 — CLÔTURE
// ══════════════════════════════════════════════════════════════════════════════
function EtapeClôture({
  tournee, onConfirm, onCancel,
}: {
  tournee  : TourneeType;
  onConfirm: (retours: RetourItem[]) => void;
  onCancel : () => void;
}) {
  const stockVendu: Record<string, number> = {};
  for (const v of tournee.ventes) {
    for (const item of v.items) {
      stockVendu[item.productId] = (stockVendu[item.productId] ?? 0) + item.qty;
    }
  }

  const [retours, setRetours] = useState<RetourItem[]>(
    tournee.chargement.map(item => {
      const vendu  = stockVendu[item.productId] ?? 0;
      const retour = Math.max(0, item.qty - vendu);
      return { productId: item.productId, productName: item.productName,
        qtyCharge: item.qty, qtyVendu: vendu, qtyRetour: retour };
    })
  );

  const totalVentes = tournee.ventes.reduce((a, v) => a + v.total, 0);
  const totalCash   = tournee.ventes.filter(v => v.paiement === "cash").reduce((a, v) => a + v.total, 0);
  const totalCredit = tournee.ventes.filter(v => v.paiement === "credit").reduce((a, v) => a + v.total, 0);
  const nbClients   = new Set(tournee.ventes.map(v => v.customerId)).size;

  // max retour = chargé - vendu (can only decrease, not increase beyond that)
  function updateRetour(productId: string, val: number) {
    setRetours(prev => prev.map(r => {
      if (r.productId !== productId) return r;
      const maxRetour = r.qtyCharge - r.qtyVendu;
      return { ...r, qtyRetour: Math.max(0, Math.min(val, maxRetour)) };
    }));
  }

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel}
          className="w-8 h-8 flex items-center justify-center rounded-full"
          style={{ background: "var(--muted)" }}>
          <X size={18} />
        </button>
        <h1 style={{ color: "var(--foreground)" }}>Clôture de tournée</h1>
      </div>

      {/* Résumé */}
      <div className="rounded-2xl p-4 mb-4 space-y-3 border border-border" style={{ background: "var(--card)" }}>
        <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }}>Résumé de la journée</p>
        {[
          { label: "Clients visités",  value: `${nbClients}`,           color: "var(--foreground)" },
          { label: "Total ventes",     value: `${fmt(totalVentes)} MAD`, color: "var(--foreground)" },
          { label: "Encaissé (cash)",  value: `${fmt(totalCash)} MAD`,  color: "var(--accent)"     },
          { label: "À recouvrer",      value: `${fmt(totalCredit)} MAD`,color: "#e65100"           },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex justify-between items-center">
            <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{label}</span>
            <span style={{ fontSize: "14px", fontWeight: 700, color }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Retours — only decrease allowed */}
      <div className="rounded-2xl border border-border p-4 mb-4" style={{ background: "var(--card)" }}>
        <div className="flex items-center gap-2 mb-3">
          <RotateCcw size={14} style={{ color: "var(--primary)" }} />
          <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }}>
            Marchandises retournées
          </p>
        </div>
        <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginBottom: 12 }}>
          Le retour maximum = chargé − vendu. Diminuez si une unité est perdue ou offerte.
        </p>
        <div className="space-y-4">
          {retours.map(r => {
            const maxRetour = r.qtyCharge - r.qtyVendu;
            return (
              <div key={r.productId}>
                <p style={{ fontSize: "12px", color: "var(--foreground)", fontWeight: 500, marginBottom: 6 }}
                  className="truncate">{r.productName}</p>
                <div className="flex items-center gap-3">
                  {/* Stats */}
                  <div className="flex gap-2 flex-1">
                    {[
                      { label: "Chargé", val: r.qtyCharge, color: "var(--foreground)" },
                      { label: "Vendu",  val: r.qtyVendu,  color: "var(--accent)"     },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="flex-1 rounded-xl py-2 text-center"
                        style={{ background: "var(--muted)" }}>
                        <p style={{ fontSize: "16px", fontWeight: 700, color }}>{val}</p>
                        <p style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>{label}</p>
                      </div>
                    ))}
                  </div>
                  {/* Retour — only Minus and manual input, no Plus beyond max */}
                  <div className="flex flex-col items-center gap-1">
                    <p style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>Retour</p>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateRetour(r.productId, r.qtyRetour - 1)}
                        disabled={r.qtyRetour === 0}
                        className="w-7 h-7 rounded-full border border-border flex items-center justify-center disabled:opacity-40">
                        <Minus size={12} />
                      </button>
                      <input
                        type="number" min={0} max={maxRetour}
                        value={r.qtyRetour}
                        onChange={e => updateRetour(r.productId, parseInt(e.target.value) || 0)}
                        className="rounded-lg border border-border outline-none text-center"
                        style={{ width: 40, height: 28, fontSize: "14px", fontWeight: 700,
                          color: "var(--primary)", background: "var(--input-background)" }}
                      />
                      {/* No Plus button — can't exceed max */}
                    </div>
                    <p style={{ fontSize: "9px", color: "var(--muted-foreground)" }}>max {maxRetour}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button onClick={() => onConfirm(retours)}
        className="w-full py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
        style={{ background: "var(--accent)", color: "white", fontWeight: 700, fontSize: "15px" }}>
        <CheckCircle size={18} /> Confirmer la clôture
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TOURNÉE DETAIL (historique — avec modification des ventes)
// ══════════════════════════════════════════════════════════════════════════════
function TourneeDetail({
  tournee, onBack, onUpdate,
}: {
  tournee  : TourneeType;
  onBack   : () => void;
  onUpdate : (t: TourneeType) => void;
}) {
  const [editVente, setEditVente] = useState<TourneeVente | undefined>();
  const meta = STATUT_META[tournee.statut];

  function handleEditVente(v: TourneeVente) {
    // update vente and recompute totals
    const updatedVentes = tournee.ventes.map(x => x.id === v.id ? v : x);
    const totalVentes   = updatedVentes.reduce((a, x) => a + x.total, 0);
    const totalCash     = updatedVentes.filter(x => x.paiement === "cash").reduce((a, x) => a + x.total, 0);
    const totalCredit   = updatedVentes.filter(x => x.paiement === "credit").reduce((a, x) => a + x.total, 0);
    onUpdate({ ...tournee, ventes: updatedVentes, totalVentes, totalCash, totalCredit });
    setEditVente(undefined);
  }

  if (editVente) {
    return (
      <VenteForm
        tournee={tournee}
        initial={editVente}
        onSave={handleEditVente}
        onCancel={() => setEditVente(undefined)}
      />
    );
  }

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full"
          style={{ background: "var(--muted)" }}>
          <X size={18} />
        </button>
        <div className="flex-1">
          <h1 style={{ color: "var(--foreground)" }}>{tournee.id}</h1>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{fmtDate(tournee.date)}</p>
        </div>
        <span className="px-2 py-1 rounded-xl"
          style={{ background: meta.bg, color: meta.color, fontSize: "11px", fontWeight: 600 }}>
          {meta.label}
        </span>
      </div>

      {/* Camion info */}
      <div className="flex items-center gap-3 p-4 rounded-2xl border border-border mb-4"
        style={{ background: "var(--card)" }}>
        <Truck size={20} style={{ color: "var(--primary)" }} />
        <div className="flex-1">
          <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }}>{tournee.camionNom}</p>
          {tournee.chauffeurNom && (
            <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{tournee.chauffeurNom}</p>
          )}
        </div>
        {(tournee.heureDepart || tournee.heureRetour) && (
          <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
            {tournee.heureDepart ?? "—"} → {tournee.heureRetour ?? "—"}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { label: "Total ventes",   value: `${fmt(tournee.totalVentes ?? 0)} MAD`, color: "var(--foreground)" },
          { label: "Clients",        value: `${tournee.nbClients ?? 0}`,             color: "var(--foreground)" },
          { label: "Cash encaissé",  value: `${fmt(tournee.totalCash ?? 0)} MAD`,   color: "var(--accent)"     },
          { label: "Crédit accordé", value: `${fmt(tournee.totalCredit ?? 0)} MAD`, color: "#e65100"           },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl p-3 border border-border" style={{ background: "var(--card)" }}>
            <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginBottom: 2 }}>{label}</p>
            <p style={{ fontSize: "15px", fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Ventes — with edit button */}
      {tournee.ventes.length > 0 && (
        <div className="mb-4">
          <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted-foreground)",
            textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Ventes ({tournee.ventes.length})
          </p>
          <div className="space-y-2">
            {tournee.ventes.map(v => (
              <div key={v.id} className="flex items-start gap-2">
                <div className="flex-1 p-3.5 rounded-2xl border border-border" style={{ background: "var(--card)" }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p style={{ fontWeight: 600, fontSize: "13px", color: "var(--foreground)" }}>
                        {v.customerName}
                      </p>
                      <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                        {v.heure} · {v.paiement === "cash" ? "Espèces" : "Crédit"}
                      </p>
                    </div>
                    <p style={{ fontWeight: 700, fontSize: "14px",
                      color: v.paiement === "cash" ? "var(--accent)" : "#e65100" }}>
                      {fmt(v.total)} MAD
                    </p>
                  </div>
                  {v.items.map((item, i) => (
                    <p key={i} style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                      {item.productName} × {item.qty} = {fmt(item.qty * item.unitPrice)} MAD
                    </p>
                  ))}
                </div>
                <button onClick={() => setEditVente(v)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "var(--blue-light)" }}>
                  <Edit2 size={14} style={{ color: "var(--primary)" }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Retours */}
      {tournee.retours.length > 0 && (
        <div>
          <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted-foreground)",
            textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Retours entrepôt
          </p>
          <div className="space-y-1">
            {tournee.retours.map(r => (
              <div key={r.productId} className="flex justify-between items-center px-4 py-2.5
                rounded-xl border border-border" style={{ background: "var(--card)" }}>
                <span style={{ fontSize: "12px", color: "var(--foreground)" }}
                  className="truncate flex-1 mr-2">{r.productName}</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted-foreground)" }}>
                  {r.qtyVendu} vendus ·{" "}
                  <span style={{ color: "var(--primary)" }}>{r.qtyRetour} retournés</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN TOURNÉE SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export function Tournee() {
  const [tournees,      setTournees     ] = useState<TourneeType[]>(TOURNEES);
  const [showNew,       setShowNew      ] = useState(false);
  const [activeTournee, setActiveTournee] = useState<TourneeType | null>(
    TOURNEES.find(t => t.statut === "en_cours") ?? null
  );
  const [showClôture,   setShowClôture  ] = useState(false);
  const [selected,      setSelected     ] = useState<TourneeType | null>(null);

  const enCours    = tournees.find(t => t.statut === "en_cours");
  const historique = tournees.filter(t => t.statut === "terminee")
    .sort((a, b) => b.date.localeCompare(a.date));

  function handleStart(t: TourneeType) {
    setTournees(prev => [...prev, t]);
    setActiveTournee(t);
    setShowNew(false);
  }

  function handleAddVente(vente: TourneeVente) {
    if (!activeTournee) return;
    const updated: TourneeType = {
      ...activeTournee,
      ventes      : [...activeTournee.ventes, vente],
      totalVentes : (activeTournee.totalVentes ?? 0) + vente.total,
      totalCash   : (activeTournee.totalCash   ?? 0) + (vente.paiement === "cash"   ? vente.total : 0),
      totalCredit : (activeTournee.totalCredit ?? 0) + (vente.paiement === "credit" ? vente.total : 0),
      nbClients   : new Set([...activeTournee.ventes.map(v => v.customerId), vente.customerId]).size,
    };
    setActiveTournee(updated);
    setTournees(prev => prev.map(t => t.id === updated.id ? updated : t));
  }

  function handleEditVente(vente: TourneeVente) {
    if (!activeTournee) return;
    const updatedVentes = activeTournee.ventes.map(v => v.id === vente.id ? vente : v);
    const updated: TourneeType = {
      ...activeTournee,
      ventes      : updatedVentes,
      totalVentes : updatedVentes.reduce((a, v) => a + v.total, 0),
      totalCash   : updatedVentes.filter(v => v.paiement === "cash").reduce((a, v) => a + v.total, 0),
      totalCredit : updatedVentes.filter(v => v.paiement === "credit").reduce((a, v) => a + v.total, 0),
      nbClients   : new Set(updatedVentes.map(v => v.customerId)).size,
    };
    setActiveTournee(updated);
    setTournees(prev => prev.map(t => t.id === updated.id ? updated : t));
  }

  function handleClôture(retours: RetourItem[]) {
    if (!activeTournee) return;
    const closed: TourneeType = {
      ...activeTournee, statut: "terminee",
      retours, heureRetour: heureNow(),
    };
    setTournees(prev => prev.map(t => t.id === closed.id ? closed : t));
    setActiveTournee(null);
    setShowClôture(false);
  }

  function handleUpdateHistorique(updated: TourneeType) {
    setTournees(prev => prev.map(t => t.id === updated.id ? updated : t));
    setSelected(updated);
  }

  // ── Sub-views ──────────────────────────────────────────────────────────
  if (showNew) return <EtapePlanification onStart={handleStart} onCancel={() => setShowNew(false)} />;

  if (activeTournee && showClôture) return (
    <EtapeClôture tournee={activeTournee} onConfirm={handleClôture} onCancel={() => setShowClôture(false)} />
  );

  if (activeTournee && !showClôture) return (
    <EtapeEnTournee
      tournee={activeTournee}
      onAddVente={handleAddVente}
      onEditVente={handleEditVente}
      onCloturer={() => setShowClôture(true)}
    />
  );

  if (selected) return (
    <TourneeDetail tournee={selected} onBack={() => setSelected(null)} onUpdate={handleUpdateHistorique} />
  );

  // ── Main list ──────────────────────────────────────────────────────────
  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex justify-between items-center mb-4">
        <h1 style={{ color: "var(--foreground)" }}>Tournées</h1>
        {!enCours && (
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl transition-all active:scale-95"
            style={{ background: "var(--primary)", color: "white", fontWeight: 600, fontSize: "13px" }}>
            <Plus size={16} /> Nouvelle
          </button>
        )}
      </div>

      {/* Active tournée card */}
      {enCours && (
        <button onClick={() => setActiveTournee(enCours)}
          className="w-full mb-4 p-4 rounded-2xl border-2 text-left transition-all active:scale-98"
          style={{ background: "var(--blue-light)", borderColor: "var(--primary)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--primary)" }}>
              <Truck size={18} color="white" />
            </div>
            <div className="flex-1">
              <p style={{ fontWeight: 700, fontSize: "15px", color: "var(--primary)" }}>
                Tournée en cours
              </p>
              <p style={{ fontSize: "12px", color: "var(--primary)", opacity: 0.8 }}>
                {enCours.camionNom}{enCours.chauffeurNom && ` · ${enCours.chauffeurNom}`}
              </p>
            </div>
            {/* Pulsing dot */}
            <div style={{
              width: 10, height: 10, borderRadius: "50%", background: "var(--primary)",
              boxShadow: "0 0 0 4px rgba(21,101,192,0.25)",
            }} />
          </div>
          <div className="flex justify-between">
            <span style={{ fontSize: "13px", color: "var(--primary)", opacity: 0.8 }}>
              {enCours.ventes.length} vente(s)
            </span>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--primary)" }}>
              {fmt(enCours.totalVentes ?? 0)} MAD
            </span>
          </div>
        </button>
      )}

      {/* Historique */}
      {historique.length === 0 && !enCours ? (
        <EmptyState icon={Truck} title="Aucune tournée"
          sub="Démarrez votre première tournée en appuyant sur Nouvelle." />
      ) : historique.length > 0 && (
        <>
          <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted-foreground)",
            textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
            Historique
          </p>
          <div className="space-y-2">
            {historique.map(t => {
              const meta = STATUT_META[t.statut];
              return (
                <button key={t.id} onClick={() => setSelected(t)}
                  className="w-full bg-card rounded-2xl p-3.5 border border-border shadow-sm flex items-center gap-3 text-left active:scale-98 transition-transform">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--muted)" }}>
                    <Truck size={18} style={{ color: "var(--muted-foreground)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }}>
                        {t.camionNom}
                      </p>
                      <span className="px-2 py-0.5 rounded-full"
                        style={{ fontSize: "10px", fontWeight: 600, background: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                      {new Date(t.date).toLocaleDateString("fr-FR")}
                      {t.chauffeurNom && ` · ${t.chauffeurNom}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p style={{ fontWeight: 700, fontSize: "14px", color: "var(--foreground)" }}>
                      {fmt(t.totalVentes ?? 0)} MAD
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                      {t.nbClients ?? 0} clients
                    </p>
                  </div>
                  <ChevronRight size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}