import { useState, useRef } from "react";
import {
  Search, Plus, X, ChevronRight, Phone, Mail, MapPin,
  User, CreditCard, FileText, Clock, AlertTriangle,
  CheckCircle, Circle, Banknote, Building2,
  Edit2, SlidersHorizontal, ArrowDownLeft, ArrowUpRight,
  Hash, MessageSquare, Star, Camera, Navigation, Locate,
} from "lucide-react";
import { Customer, ActivityEntry, CustomerType, PaymentMethod } from "./types";
import { CUSTOMERS } from "./mockData";

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) +
    " · " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

const STATUS_META = {
  paid    : { label: "Payée",     color: "var(--accent)",      bg: "var(--green-light)", Icon: CheckCircle   },
  partial : { label: "Partielle", color: "#f57c00",            bg: "#fff3e0",            Icon: Circle        },
  unpaid  : { label: "Impayée",   color: "var(--destructive)", bg: "var(--red-light)",   Icon: AlertTriangle },
};

const METHOD_META: Record<PaymentMethod, { label: string; Icon: React.FC<{ size?: number }> }> = {
  cash          : { label: "Espèces",  Icon: Banknote   },
  card          : { label: "Carte",    Icon: CreditCard },
  bank_transfer : { label: "Virement", Icon: Building2  },
  cheque        : { label: "Chèque",   Icon: FileText   },
};

const TYPE_META: Record<CustomerType, { label: string; color: string; bg: string }> = {
  retail    : { label: "Détail",  color: "var(--primary)", bg: "var(--blue-light)" },
  wholesale : { label: "Gros",    color: "#7b1fa2",        bg: "#f3e5f5"           },
  business  : { label: "Société", color: "#e65100",        bg: "#fff3e0"           },
};

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, sub }: {
  icon: React.FC<{ size?: number }>; title: string; sub: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--muted)" }}>
        <Icon size={24} />
      </div>
      <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }}>{title}</p>
      <p style={{ fontSize: "12px", color: "var(--muted-foreground)", textAlign: "center", maxWidth: 220 }}>{sub}</p>
    </div>
  );
}

// ─── OpenStreetMap iframe component ───────────────────────────────────────────
function OSMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  // Leaflet-based embed via openstreetmap.org — no API key needed
  const bbox = 0.003;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - bbox}%2C${lat - bbox}%2C${lng + bbox}%2C${lat + bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  const fullMapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;

  return (
    <div className="rounded-2xl overflow-hidden border border-border" style={{ background: "var(--card)" }}>
      {/* Section header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MapPin size={14} style={{ color: "var(--primary)" }} />
          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--foreground)" }}>
            Localisation
          </span>
        </div>
        {/* Opens full OSM in browser — works on any device, no app needed */}
        <a
          href={fullMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all active:scale-95"
          style={{ background: "var(--blue-light)", color: "var(--primary)", fontSize: "12px", fontWeight: 600,
            textDecoration: "none" }}
        >
          <Navigation size={13} /> Itinéraire
        </a>
      </div>

      {/* Map iframe — Leaflet/OSM, works in any browser, zero cost */}
      <div style={{ position: "relative", height: 200 }}>
        <iframe
          src={src}
          title={`Localisation de ${name}`}
          width="100%"
          height="200"
          style={{ border: 0, display: "block" }}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        {/* Coordinates badge */}
        <div
          className="absolute bottom-2 left-2 px-2 py-1 rounded-lg"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
        >
          <span style={{ fontSize: "10px", color: "white", fontFamily: "monospace" }}>
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: "info",     label: "Infos",     Icon: User     },
  { id: "invoices", label: "Factures",  Icon: FileText },
  { id: "payments", label: "Paiements", Icon: Banknote },
  { id: "activity", label: "Activité",  Icon: Clock    },
] as const;
type TabId = typeof TABS[number]["id"];

// ══════════════════════════════════════════════════════════════════════════════
// CUSTOMER DETAIL
// ══════════════════════════════════════════════════════════════════════════════
function CustomerDetail({
  customer, onBack, onEdit,
}: {
  customer: Customer; onBack: () => void; onEdit: (c: Customer) => void;
}) {
  const [tab,           setTab          ] = useState<TabId>("info");
  const [invoiceFilter, setInvoiceFilter] = useState<"all"|"paid"|"partial"|"unpaid">("all");
  const [showPayForm,   setShowPayForm  ] = useState(false);
  const [payAmount,     setPayAmount    ] = useState("");
  const [payMethod,     setPayMethod    ] = useState<PaymentMethod>("cash");
  const [payNote,       setPayNote      ] = useState("");

  const invoices = customer.invoices ?? [];
  const payments = customer.payments ?? [];
  const activity = customer.activity ?? [];

  const totalInvoiced = invoices.reduce((a, i) => a + i.total, 0);
  const totalPaid     = invoices.reduce((a, i) => a + i.paid,  0);
  const totalDue      = totalInvoiced - totalPaid;

  const filteredInvoices = invoiceFilter === "all"
    ? invoices
    : invoices.filter(i => i.status === invoiceFilter);

  const isOverLimit = customer.balance > customer.creditLimit;
  const creditPct   = customer.creditLimit > 0
    ? Math.min(100, (customer.balance / customer.creditLimit) * 100) : 0;
  const typeMeta    = TYPE_META[customer.customerType ?? "retail"];

  // ── Tab: Info ──────────────────────────────────────────────────────────────
  function TabInfo() {
    return (
      <div className="space-y-4 pb-6">

        {/* ── Customer photo ── */}
        {customer.imageUri && (
          <div className="rounded-2xl overflow-hidden border border-border" style={{ maxHeight: 160 }}>
            <img src={customer.imageUri} alt={customer.name}
              className="w-full object-cover" style={{ maxHeight: 160 }} />
          </div>
        )}

        {/* Balance card */}
        <div className="rounded-2xl p-4 border border-border"
          style={{ background: isOverLimit ? "var(--red-light)" : "var(--card)" }}>
          <div className="flex justify-between items-start mb-3">
            <div>
              <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginBottom: 2 }}>Solde actuel</p>
              <p style={{ fontSize: "28px", fontWeight: 800, lineHeight: 1,
                color: customer.balance > 0 ? "var(--destructive)" : "var(--accent)" }}>
                {fmt(customer.balance)}
                <span style={{ fontSize: "13px", fontWeight: 400, marginLeft: 4 }}>MAD</span>
              </p>
            </div>
            {isOverLimit && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-xl"
                style={{ background: "var(--destructive)", color: "white", fontSize: "10px", fontWeight: 700 }}>
                <AlertTriangle size={10} /> Plafond dépassé
              </span>
            )}
          </div>
          {customer.creditLimit > 0 && (
            <>
              <div className="flex justify-between mb-1.5"
                style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                <span>Utilisé : {fmt(customer.balance)} MAD</span>
                <span>Plafond : {fmt(customer.creditLimit)} MAD</span>
              </div>
              <div className="rounded-full overflow-hidden" style={{ height: 6, background: "var(--muted)" }}>
                <div style={{ width: `${creditPct}%`, height: "100%", borderRadius: 999,
                  background: isOverLimit ? "var(--destructive)" : "#f57c00", transition: "width 0.4s ease" }} />
              </div>
              <p style={{ fontSize: "11px", fontWeight: 600, marginTop: 6,
                color: isOverLimit ? "var(--destructive)" : "var(--accent)" }}>
                {isOverLimit
                  ? `Dépassement de ${fmt(customer.balance - customer.creditLimit)} MAD`
                  : `Disponible : ${fmt(customer.creditLimit - customer.balance)} MAD`}
              </p>
            </>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Facturé", value: fmt(totalInvoiced), color: "var(--foreground)" },
            { label: "Payé",    value: fmt(totalPaid),     color: "var(--accent)"     },
            { label: "Reste",   value: fmt(totalDue),
              color: totalDue > 0 ? "var(--destructive)" : "var(--accent)" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl p-3 border border-border" style={{ background: "var(--card)" }}>
              <p style={{ fontSize: "10px", color: "var(--muted-foreground)", marginBottom: 2 }}>{label}</p>
              <p style={{ fontSize: "13px", fontWeight: 700, color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="rounded-2xl border border-border overflow-hidden" style={{ background: "var(--card)" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)",
            padding: "10px 14px 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Contact
          </p>
          {[
            { Icon: Phone,  value: customer.phone,  show: !!customer.phone  && customer.phone !== "—" },
            { Icon: Phone,  value: customer.phone2, show: !!customer.phone2 },
            { Icon: Mail,   value: customer.email,  show: !!customer.email  },
            { Icon: MapPin, value: customer.address,show: !!customer.address },
          ].filter(r => r.show).map(({ Icon, value }, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-t border-border">
              <Icon size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
              <span style={{ fontSize: "13px", color: "var(--foreground)" }}>{value}</span>
            </div>
          ))}
        </div>

        {/* ── OpenStreetMap — shown only when coordinates exist ── */}
        {customer.coordinates && (
          <OSMap
            lat={customer.coordinates.lat}
            lng={customer.coordinates.lng}
            name={customer.name}
          />
        )}

        {/* Business info */}
        {(customer.taxId || customer.customerType !== "retail") && (
          <div className="rounded-2xl border border-border overflow-hidden" style={{ background: "var(--card)" }}>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)",
              padding: "10px 14px 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Informations
            </p>
            <div className="flex items-center gap-3 px-4 py-3 border-t border-border">
              <Star size={14} style={{ color: "var(--muted-foreground)" }} />
              <span style={{ fontSize: "13px", color: "var(--foreground)" }}>Type : </span>
              <span className="px-2 py-0.5 rounded-full ml-1"
                style={{ fontSize: "11px", fontWeight: 600, background: typeMeta.bg, color: typeMeta.color }}>
                {typeMeta.label}
              </span>
            </div>
            {customer.taxId && (
              <div className="flex items-center gap-3 px-4 py-3 border-t border-border">
                <Hash size={14} style={{ color: "var(--muted-foreground)" }} />
                <span style={{ fontSize: "13px", color: "var(--foreground)" }}>NIF/NIS : {customer.taxId}</span>
              </div>
            )}
            {customer.openingBalanceDate && (
              <div className="flex items-center gap-3 px-4 py-3 border-t border-border">
                <FileText size={14} style={{ color: "var(--muted-foreground)" }} />
                <span style={{ fontSize: "13px", color: "var(--foreground)" }}>
                  Solde initial : {fmt(customer.openingBalance)} MAD
                  <span style={{ color: "var(--muted-foreground)", marginLeft: 6, fontSize: "12px" }}>
                    ({fmtDate(customer.openingBalanceDate)})
                  </span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {customer.notes && (
          <div className="rounded-2xl border border-border p-4" style={{ background: "var(--card)" }}>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={13} style={{ color: "var(--muted-foreground)" }} />
              <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)",
                textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes</p>
            </div>
            <p style={{ fontSize: "13px", color: "var(--foreground)", lineHeight: 1.6 }}>{customer.notes}</p>
          </div>
        )}
      </div>
    );
  }

  // ── Tab: Invoices ──────────────────────────────────────────────────────────
  function TabInvoices() {
    return (
      <div className="pb-6">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {(["all","paid","partial","unpaid"] as const).map(f => {
            const active = invoiceFilter === f;
            const meta   = f !== "all" ? STATUS_META[f] : null;
            return (
              <button key={f} onClick={() => setInvoiceFilter(f)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors"
                style={{
                  background : active ? (meta?.bg  ?? "var(--primary)") : "var(--card)",
                  borderColor: active ? (meta?.color ?? "var(--primary)") : "var(--border)",
                  color      : active ? (meta?.color ?? "white") : "var(--muted-foreground)",
                }}>
                {f === "all" ? "Toutes" : meta!.label}
              </button>
            );
          })}
        </div>

        {filteredInvoices.length === 0 ? (
          <EmptyState icon={FileText} title="Aucune facture" sub="Les ventes depuis le POS apparaîtront ici." />
        ) : (
          <div className="space-y-2">
            {filteredInvoices.map(inv => {
              const meta      = STATUS_META[inv.status];
              const remaining = inv.total - inv.paid;
              return (
                <div key={inv.id} className="rounded-2xl border border-border p-4"
                  style={{ background: "var(--card)" }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p style={{ fontWeight: 700, fontSize: "14px", color: "var(--foreground)" }}>{inv.id}</p>
                      <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{fmtDateTime(inv.date)}</p>
                    </div>
                    <span className="flex items-center gap-1 px-2 py-1 rounded-xl"
                      style={{ background: meta.bg, color: meta.color, fontSize: "11px", fontWeight: 600 }}>
                      <meta.Icon size={11} /> {meta.label}
                    </span>
                  </div>
                  <div className="space-y-1 mb-3">
                    {inv.items.map((item, i) => (
                      <div key={i} className="flex justify-between"
                        style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                        <span>{item.productName} × {item.qty}</span>
                        <span>{fmt(item.unitPrice * item.qty)} MAD</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border pt-3 space-y-1">
                    <div className="flex justify-between">
                      <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Total</span>
                      <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--foreground)" }}>
                        {fmt(inv.total)} MAD
                      </span>
                    </div>
                    {inv.paid > 0 && (
                      <div className="flex justify-between">
                        <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Payé</span>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent)" }}>
                          {fmt(inv.paid)} MAD
                        </span>
                      </div>
                    )}
                    {remaining > 0 && (
                      <div className="flex justify-between">
                        <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Reste</span>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--destructive)" }}>
                          {fmt(remaining)} MAD
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Tab: Payments ──────────────────────────────────────────────────────────
  function TabPayments() {
    const totalReceived = payments.reduce((a, p) => a + p.amount, 0);
    return (
      <div className="pb-6">
        {payments.length > 0 && (
          <div className="rounded-2xl p-4 mb-4 flex justify-between items-center"
            style={{ background: "var(--green-light)", border: "1px solid var(--accent)" }}>
            <div>
              <p style={{ fontSize: "11px", color: "var(--accent)", fontWeight: 600 }}>Total reçu</p>
              <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--accent)" }}>
                {fmt(totalReceived)} <span style={{ fontSize: "13px", fontWeight: 400 }}>MAD</span>
              </p>
            </div>
            <CheckCircle size={28} style={{ color: "var(--accent)", opacity: 0.6 }} />
          </div>
        )}

        {/* New payment form */}
        {showPayForm ? (
          <div className="rounded-2xl border border-border p-4 mb-4 space-y-3" style={{ background: "var(--card)" }}>
            <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }}>
              Enregistrer un paiement
            </p>
            <div>
              <label style={{ fontSize: "12px", color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>
                Montant (MAD)
              </label>
              <input type="number" min={0} value={payAmount} onChange={e => setPayAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-border px-3 py-2.5 outline-none focus:ring-2"
                style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "16px",
                  fontWeight: 700, "--tw-ring-color": "var(--primary)" } as React.CSSProperties} />
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "var(--muted-foreground)", display: "block", marginBottom: 6 }}>
                Mode de règlement
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["cash","card","bank_transfer","cheque"] as PaymentMethod[]).map(m => {
                  const meta   = METHOD_META[m];
                  const active = payMethod === m;
                  return (
                    <button key={m} onClick={() => setPayMethod(m)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all"
                      style={{
                        background : active ? "var(--blue-light)" : "var(--input-background)",
                        borderColor: active ? "var(--primary)"    : "var(--border)",
                        color      : active ? "var(--primary)"    : "var(--foreground)",
                        fontSize: "12px", fontWeight: active ? 600 : 400,
                      }}>
                      <meta.Icon size={14} /> {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>
                Note (optionnelle)
              </label>
              <input type="text" value={payNote} onChange={e => setPayNote(e.target.value)}
                placeholder="Ex. Chèque n° 004582..."
                className="w-full rounded-xl border border-border px-3 py-2.5 outline-none"
                style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "13px" }} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowPayForm(false)} className="flex-1 py-2.5 rounded-xl"
                style={{ background: "var(--muted)", color: "var(--foreground)", fontWeight: 500 }}>
                Annuler
              </button>
              <button disabled={!payAmount || parseFloat(payAmount) <= 0}
                className="flex-1 py-2.5 rounded-xl disabled:opacity-40"
                style={{ background: "var(--accent)", color: "white", fontWeight: 600 }}>
                Valider
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowPayForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl mb-4 transition-all active:scale-95"
            style={{ background: "var(--green-light)", color: "var(--accent)", fontWeight: 600, fontSize: "14px",
              border: "1px dashed var(--accent)" }}>
            <Plus size={16} /> Enregistrer un paiement
          </button>
        )}

        {payments.length === 0 ? (
          <EmptyState icon={Banknote} title="Aucun paiement" sub="Les paiements enregistrés apparaîtront ici." />
        ) : (
          <div className="space-y-2">
            {payments.map(pay => {
              const meta = METHOD_META[pay.method];
              return (
                <div key={pay.id} className="rounded-2xl border border-border p-4" style={{ background: "var(--card)" }}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "var(--green-light)" }}>
                        <meta.Icon size={16} />
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: "13px", color: "var(--foreground)" }}>{meta.label}</p>
                        <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{fmtDateTime(pay.date)}</p>
                        {pay.note && (
                          <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: 1 }}>{pay.note}</p>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: "16px", fontWeight: 800, color: "var(--accent)" }}>
                      +{fmt(pay.amount)}
                      <span style={{ fontSize: "11px", fontWeight: 400, marginLeft: 2 }}>MAD</span>
                    </p>
                  </div>
                  {pay.invoiceId && (
                    <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: 8,
                      paddingTop: 8, borderTop: "0.5px solid var(--border)" }}>
                      Lié à la facture {pay.invoiceId}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Tab: Activity ──────────────────────────────────────────────────────────
  function TabActivity() {
    const sorted = [...activity].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return (
      <div className="pb-6">
        {sorted.length === 0 ? (
          <EmptyState icon={Clock} title="Aucune activité" sub="L'historique des opérations s'affichera ici." />
        ) : (
          <div className="relative">
            <div className="absolute left-[19px] top-0 bottom-0 w-[1.5px]"
              style={{ background: "var(--border)", zIndex: 0 }} />
            <div className="space-y-1">
              {sorted.map(entry => {
                const isPayment = entry.type === "payment";
                const isInvoice = entry.type === "invoice";
                return (
                  <div key={entry.id} className="flex items-start gap-3 relative" style={{ paddingLeft: 2 }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2"
                      style={{
                        background : isPayment ? "var(--green-light)"  : isInvoice ? "var(--blue-light)" : "var(--muted)",
                        borderColor: isPayment ? "var(--accent)"        : isInvoice ? "var(--primary)"    : "var(--border)",
                      }}>
                      {isPayment
                        ? <ArrowDownLeft size={15} style={{ color: "var(--accent)"  }} />
                        : isInvoice
                        ? <ArrowUpRight  size={15} style={{ color: "var(--primary)" }} />
                        : <Clock         size={15} style={{ color: "var(--muted-foreground)" }} />
                      }
                    </div>
                    <div className="flex-1 rounded-2xl border border-border p-3 mb-2"
                      style={{ background: "var(--card)" }}>
                      <div className="flex justify-between items-start">
                        <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)", lineHeight: 1.4 }}>
                          {entry.label}
                        </p>
                        {entry.amount !== undefined && (
                          <p style={{ fontSize: "13px", fontWeight: 700, flexShrink: 0, marginLeft: 8,
                            color: isPayment ? "var(--accent)" : "var(--foreground)" }}>
                            {isPayment ? "+" : ""}{fmt(entry.amount)}
                          </p>
                        )}
                      </div>
                      <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: 3 }}>
                        {fmtDateTime(entry.date)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "100%" }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack}
              className="w-8 h-8 flex items-center justify-center rounded-full"
              style={{ background: "var(--muted)" }}>
              <X size={18} />
            </button>
            <div className="flex items-center gap-3">
              {/* Avatar or photo */}
              {customer.imageUri ? (
                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border border-border">
                  <img src={customer.imageUri} alt={customer.name}
                    className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: typeMeta.bg }}>
                  <User size={18} style={{ color: typeMeta.color }} />
                </div>
              )}
              <div>
                <h1 style={{ color: "var(--foreground)", fontSize: "16px", fontWeight: 700, lineHeight: 1.2 }}>
                  {customer.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full"
                  style={{ fontSize: "10px", fontWeight: 600, background: typeMeta.bg, color: typeMeta.color }}>
                  {typeMeta.label}
                </span>
              </div>
            </div>
          </div>
          <button onClick={() => onEdit(customer)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{ background: "var(--blue-light)", color: "var(--primary)" }}>
            <Edit2 size={14} />
            <span style={{ fontSize: "13px", fontWeight: 500 }}>Modifier</span>
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all"
              style={{
                background: tab === id ? "var(--primary)" : "transparent",
                color     : tab === id ? "white"          : "var(--muted-foreground)",
              }}>
              <Icon size={14} />
              <span style={{ fontSize: "10px", fontWeight: tab === id ? 600 : 400 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4">
        {tab === "info"     && <TabInfo     />}
        {tab === "invoices" && <TabInvoices />}
        {tab === "payments" && <TabPayments />}
        {tab === "activity" && <TabActivity />}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CUSTOMER FORM
// ══════════════════════════════════════════════════════════════════════════════
function CustomerForm({
  initial, onSave, onCancel,
}: {
  initial?: Customer; onSave: (c: Customer) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<Customer>>(
    initial ?? {
      name: "", phone: "", phone2: "", address: "", email: "",
      customerType: "retail", openingBalance: 0,
      openingBalanceDate: new Date().toISOString().slice(0, 10),
      balance: 0, creditLimit: 5000, notes: "", taxId: "",
      imageUri: undefined, coordinates: undefined,
    }
  );
  const [gpsStatus, setGpsStatus] = useState<"idle"|"loading"|"done"|"error">("idle");
  const [hasCreditLimit, setHasCreditLimit] = useState<boolean>(
  (initial?.creditLimit ?? 0) > 0
);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof Customer, val: unknown) =>
    setForm(prev => ({ ...prev, [key]: val }));

  // ── GPS capture ──────────────────────────────────────────────────────────
  function captureGPS() {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      return;
    }
    setGpsStatus("loading");
    navigator.geolocation.getCurrentPosition(
      pos => {
        set("coordinates", { lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus("done");
      },
      () => setGpsStatus("error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // ── Image upload ─────────────────────────────────────────────────────────
  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set("imageUri", ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function save() {
    if (!form.name?.trim()) return;
    const c: Customer = {
      id                : initial?.id ?? `c${Date.now()}`,
      name              : form.name!.trim(),
      phone             : form.phone             ?? "",
      phone2            : form.phone2            || undefined,
      address           : form.address           ?? "",
      email             : form.email             || undefined,
      customerType      : form.customerType      ?? "retail",
      taxId             : form.taxId             || undefined,
      openingBalance    : Number(form.openingBalance)  || 0,
      openingBalanceDate: form.openingBalanceDate,
      balance           : Number(form.balance)         || 0,
      creditLimit       : Number(form.creditLimit)     || 0,
      notes             : form.notes             || undefined,
      imageUri          : form.imageUri          || undefined,
      coordinates       : form.coordinates       || undefined,
      invoices          : initial?.invoices      ?? [],
      payments          : initial?.payments      ?? [],
      activity          : initial?.activity      ?? [],
    };
    onSave(c);
  }

  const gpsColor   = gpsStatus === "done"    ? "var(--accent)"
                   : gpsStatus === "error"   ? "var(--destructive)"
                   : gpsStatus === "loading" ? "#f57c00"
                   : "var(--primary)";
  const gpsBg      = gpsStatus === "done"    ? "var(--green-light)"
                   : gpsStatus === "error"   ? "var(--red-light)"
                   : "var(--blue-light)";
  const gpsLabel   = gpsStatus === "loading" ? "Localisation…"
                   : gpsStatus === "done"    ? `✓ ${form.coordinates?.lat.toFixed(4)}, ${form.coordinates?.lng.toFixed(4)}`
                   : gpsStatus === "error"   ? "GPS indisponible"
                   : "Enregistrer la position GPS";

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel}
          className="w-8 h-8 flex items-center justify-center rounded-full"
          style={{ background: "var(--muted)" }}>
          <X size={18} />
        </button>
        <h1 style={{ color: "var(--foreground)" }}>
          {initial ? "Modifier le client" : "Nouveau client"}
        </h1>
      </div>

      <div className="space-y-4">

        {/* ── Photo du client ── */}
        <div>
          <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 6, display: "block" }}>
            Photo du client (optionnel)
          </label>
          <div
            onClick={() => fileRef.current?.click()}
            className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer overflow-hidden"
            style={{ borderColor: "var(--border)", background: "var(--muted)",
              minHeight: form.imageUri ? "auto" : 90 }}
          >
            {form.imageUri ? (
              <>
                <img src={form.imageUri} alt="Client"
                  className="w-full object-cover" style={{ maxHeight: 140, borderRadius: 14 }} />
                <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-xl"
                  style={{ background: "rgba(0,0,0,0.45)" }}>
                  <Camera size={12} color="white" />
                  <span style={{ fontSize: "11px", color: "white" }}>Changer</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: "var(--blue-light)" }}>
                  <Camera size={18} style={{ color: "var(--primary)" }} />
                </div>
                <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                  Ajouter une photo
                </span>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
          </div>
        </div>

        {/* Customer type */}
        <div>
          <label style={{ fontSize: "13px", color: "var(--muted-foreground)", display: "block", marginBottom: 6 }}>
            Type de client
          </label>
          <div className="flex gap-2">
            {(["retail","wholesale","business"] as CustomerType[]).map(t => {
              const m      = TYPE_META[t];
              const active = form.customerType === t;
              return (
                <button key={t} onClick={() => set("customerType", t)}
                  className="flex-1 py-2.5 rounded-xl border transition-all text-xs font-semibold"
                  style={{
                    background : active ? m.bg    : "var(--input-background)",
                    borderColor: active ? m.color : "var(--border)",
                    color      : active ? m.color : "var(--muted-foreground)",
                  }}>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Name */}
        <div>
          <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 4, display: "block" }}>
            Nom *
          </label>
          <input value={form.name ?? ""} onChange={e => set("name", e.target.value)}
            placeholder="Nom du client ou de l'entreprise"
            className="w-full rounded-xl border border-border px-3 py-2.5 outline-none focus:ring-2"
            style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "14px",
              "--tw-ring-color": "var(--primary)" } as React.CSSProperties} />
        </div>

        {/* Phones */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 4, display: "block" }}>
              Téléphone
            </label>
            <input value={form.phone ?? ""} onChange={e => set("phone", e.target.value)}
              placeholder="+213 6xx xxx xxx"
              className="w-full rounded-xl border border-border px-3 py-2.5 outline-none"
              style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "14px" }} />
          </div>
          <div>
            <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 4, display: "block" }}>
              Tél. 2 (optionnel)
            </label>
            <input value={form.phone2 ?? ""} onChange={e => set("phone2", e.target.value)}
              placeholder="+213 6xx xxx xxx"
              className="w-full rounded-xl border border-border px-3 py-2.5 outline-none"
              style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "14px" }} />
          </div>
        </div>

        {/* Email */}
        <div>
          <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 4, display: "block" }}>
            Email (optionnel)
          </label>
          <input value={form.email ?? ""} onChange={e => set("email", e.target.value)}
            placeholder="client@exemple.dz" type="email"
            className="w-full rounded-xl border border-border px-3 py-2.5 outline-none"
            style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "14px" }} />
        </div>

        {/* Address */}
        <div>
          <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 4, display: "block" }}>
            Adresse
          </label>
          <input value={form.address ?? ""} onChange={e => set("address", e.target.value)}
            placeholder="Rue, Ville, Wilaya"
            className="w-full rounded-xl border border-border px-3 py-2.5 outline-none"
            style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "14px" }} />
        </div>

        {/* ── GPS location ── */}
        <div>
          <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 6, display: "block" }}>
            Localisation GPS
          </label>
          <button
            onClick={captureGPS}
            disabled={gpsStatus === "loading"}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border transition-all active:scale-95 disabled:opacity-60"
            style={{ background: gpsBg, borderColor: gpsColor, color: gpsColor,
              fontSize: "13px", fontWeight: 600 }}
          >
            <Locate size={15} />
            {gpsLabel}
          </button>

          {/* Preview map if coords already captured */}
          {form.coordinates && gpsStatus === "done" && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-border" style={{ height: 140 }}>
              <iframe
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${form.coordinates.lng - 0.003}%2C${form.coordinates.lat - 0.003}%2C${form.coordinates.lng + 0.003}%2C${form.coordinates.lat + 0.003}&layer=mapnik&marker=${form.coordinates.lat}%2C${form.coordinates.lng}`}
                width="100%" height="140"
                style={{ border: 0, display: "block" }}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          {/* Manual coord input as fallback */}
          {(form.coordinates || gpsStatus === "error") && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label style={{ fontSize: "11px", color: "var(--muted-foreground)", display: "block", marginBottom: 3 }}>
                  Latitude
                </label>
                <input type="number" step="0.00001"
                  value={form.coordinates?.lat ?? ""}
                  onChange={e => set("coordinates", {
                    lat: parseFloat(e.target.value) || 0,
                    lng: form.coordinates?.lng ?? 0,
                  })}
                  placeholder="36.36722"
                  className="w-full rounded-xl border border-border px-3 py-2 outline-none"
                  style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "12px" }} />
              </div>
              <div>
                <label style={{ fontSize: "11px", color: "var(--muted-foreground)", display: "block", marginBottom: 3 }}>
                  Longitude
                </label>
                <input type="number" step="0.00001"
                  value={form.coordinates?.lng ?? ""}
                  onChange={e => set("coordinates", {
                    lat: form.coordinates?.lat ?? 0,
                    lng: parseFloat(e.target.value) || 0,
                  })}
                  placeholder="7.95111"
                  className="w-full rounded-xl border border-border px-3 py-2 outline-none"
                  style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "12px" }} />
              </div>
            </div>
          )}
        </div>

        {/* Tax ID */}
        {form.customerType === "business" && (
          <div>
            <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 4, display: "block" }}>
              NIF / NIS
            </label>
            <input value={form.taxId ?? ""} onChange={e => set("taxId", e.target.value)}
              placeholder="Ex. NIF-45782361"
              className="w-full rounded-xl border border-border px-3 py-2.5 outline-none"
              style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "14px" }} />
          </div>
        )}

        {/* Financial */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 4, display: "block" }}>
              Solde initial (MAD)
            </label>
            <input type="number" value={form.openingBalance ?? 0}
              onChange={e => set("openingBalance", parseFloat(e.target.value) || 0)}
              className="w-full rounded-xl border border-border px-3 py-2.5 outline-none"
              style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "14px" }} />
          </div>
          <div>
            <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 4, display: "block" }}>
              Date solde initial
            </label>
            <input type="date" value={form.openingBalanceDate ?? ""}
              onChange={e => set("openingBalanceDate", e.target.value)}
              className="w-full rounded-xl border border-border px-3 py-2.5 outline-none"
              style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "13px" }} />
          </div>
        </div>
      {/* Plafond de crédit */}
        <div className="rounded-2xl border border-border p-4"
          style={{ background: "var(--muted)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CreditCard size={16} style={{ color: hasCreditLimit ? "var(--primary)" : "var(--muted-foreground)" }} />
              <div>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)", marginBottom: 1 }}>
                  Plafond de crédit
                </p>
                <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                  Limite maximale autorisée
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setHasCreditLimit(v => !v);
                if (hasCreditLimit) set("creditLimit", 0);
              }}
              style={{ width: 44, height: 24, position: "relative", flexShrink: 0 }}
              aria-pressed={hasCreditLimit}
            >
              <div className="absolute inset-0 rounded-full transition-colors duration-200"
                style={{ background: hasCreditLimit ? "var(--primary)" : "var(--border)" }} />
              <div className="absolute top-1 rounded-full transition-all duration-200"
                style={{
                  width: 16, height: 16, background: "white",
                  left: hasCreditLimit ? 24 : 4,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                }} />
            </button>
          </div>
          {hasCreditLimit && (
            <div className="mt-3 pt-3 border-t border-border">
              <label style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: 6, display: "block" }}>
                Montant (MAD)
              </label>
              <input
                type="number" min={0}
                value={form.creditLimit ?? 0}
                onChange={e => set("creditLimit", parseFloat(e.target.value) || 0)}
                autoFocus
                className="w-full rounded-xl border border-border px-3 py-2.5 outline-none focus:ring-2"
                style={{
                  background: "var(--input-background)", color: "var(--foreground)", fontSize: "14px",
                  "--tw-ring-color": "var(--primary)",
                } as React.CSSProperties}
              />
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 4, display: "block" }}>
            Notes (optionnel)
          </label>
          <textarea value={form.notes ?? ""} onChange={e => set("notes", e.target.value)}
            rows={3} placeholder="Remarques, habitudes de paiement..."
            className="w-full rounded-xl border border-border px-3 py-2.5 outline-none resize-none"
            style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "13px" }} />
        </div>
        <button onClick={save}
          className="w-full py-3 rounded-2xl transition-all active:scale-95"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontWeight: 600, fontSize: "15px" }}>
          {initial ? "Enregistrer les modifications" : "Ajouter le client"}
        </button>
      </div>
    </div>
  );
}
// ══════════════════════════════════════════════════════════════════════════════
// CUSTOMERS LIST
// ══════════════════════════════════════════════════════════════════════════════
export function Customers() {
  const [customers,  setCustomers ] = useState<Customer[]>(CUSTOMERS);
  const [search,     setSearch    ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | CustomerType>("all");
  const [debtOnly,   setDebtOnly  ] = useState(false);
  const [selected,   setSelected  ] = useState<Customer | null>(null);
  const [showForm,   setShowForm  ] = useState(false);
  const [editTarget, setEditTarget] = useState<Customer | undefined>(undefined);

  const filtered = customers
    .filter(c => c.id !== "c0")
    .filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search);
      const matchType = typeFilter === "all" || c.customerType === typeFilter;
      const matchDebt = !debtOnly || c.balance > 0;
      return matchSearch && matchType && matchDebt;
    });

  const totalDebt   = customers.filter(c => c.id !== "c0").reduce((a, c) => a + c.balance, 0);
  const debtorCount = customers.filter(c => c.id !== "c0" && c.balance > 0).length;

  function openAdd() { setEditTarget(undefined); setShowForm(true); setSelected(null); }
  function openEdit(c: Customer) { setEditTarget(c); setShowForm(true); setSelected(null); }

  function saveCustomer(c: Customer) {
    setCustomers(prev => prev.some(p => p.id === c.id)
      ? prev.map(p => p.id === c.id ? c : p)
      : [...prev, c]
    );
    setShowForm(false);
    setSelected(c);
  }

  if (showForm) {
    return (
      <div className="overflow-y-auto" style={{ maxHeight: "100%" }}>
        <CustomerForm initial={editTarget} onSave={saveCustomer} onCancel={() => setShowForm(false)} />
      </div>
    );
  }

  if (selected) {
    return (
      <div style={{ height: "100%" }}>
        <CustomerDetail customer={selected} onBack={() => setSelected(null)} onEdit={openEdit} />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex justify-between items-center mb-4">
        <h1 style={{ color: "var(--foreground)" }}>Clients</h1>
        <button onClick={openAdd}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "var(--primary)", color: "white" }}>
          <Plus size={20} />
        </button>
      </div>

      {/* Debt banner */}
      {totalDebt > 0 && (
        <div className="rounded-2xl p-4 mb-4 flex justify-between items-center"
          style={{ background: "var(--red-light)", border: "1px solid rgba(198,40,40,0.25)" }}>
          <div>
            <p style={{ fontSize: "11px", color: "var(--destructive)", fontWeight: 600 }}>
              Dettes en cours · {debtorCount} client{debtorCount > 1 ? "s" : ""}
            </p>
            <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--destructive)" }}>
              {fmt(totalDebt)} <span style={{ fontSize: "13px", fontWeight: 400 }}>MAD</span>
            </p>
          </div>
          <AlertTriangle size={28} style={{ color: "var(--destructive)", opacity: 0.5 }} />
        </div>
      )}

      {/* Search */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--muted-foreground)" }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou téléphone…"
          className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-border outline-none"
          style={{ background: "var(--card)", fontSize: "14px", color: "var(--foreground)" }} />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
        <button onClick={() => setDebtOnly(!debtOnly)}
          className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full border transition-colors"
          style={{
            background : debtOnly ? "var(--red-light)" : "var(--card)",
            borderColor: debtOnly ? "var(--destructive)" : "var(--border)",
            color      : debtOnly ? "var(--destructive)" : "var(--muted-foreground)",
            fontSize: "12px", fontWeight: 500,
          }}>
          <SlidersHorizontal size={12} /> Avec dettes
        </button>
        {(["all","retail","wholesale","business"] as const).map(t => {
          const active = typeFilter === t;
          const meta   = t !== "all" ? TYPE_META[t] : null;
          return (
            <button key={t} onClick={() => setTypeFilter(t)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full border transition-colors"
              style={{
                background : active ? (meta?.bg    ?? "var(--primary)") : "var(--card)",
                borderColor: active ? (meta?.color ?? "var(--primary)") : "var(--border)",
                color      : active ? (meta?.color ?? "white") : "var(--muted-foreground)",
                fontSize: "12px", fontWeight: 500,
              }}>
              {t === "all" ? "Tous" : meta!.label}
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: 10 }}>
        {filtered.length} client{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState icon={User} title="Aucun client trouvé"
          sub="Modifiez les filtres ou ajoutez un nouveau client." />
      ) : (
        <div className="space-y-2">
          {filtered.map(c => {
            const isOver   = c.balance > c.creditLimit && c.creditLimit > 0;
            const hasDebt  = c.balance > 0;
            const typeMeta = TYPE_META[c.customerType ?? "retail"];
            return (
              <button key={c.id} onClick={() => setSelected(c)}
                className="w-full bg-card rounded-2xl p-3.5 shadow-sm border border-border flex items-center gap-3 active:scale-98 transition-transform text-left"
                style={{ borderColor: isOver ? "rgba(198,40,40,0.4)" : undefined }}>

                {/* Avatar or photo thumbnail */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ background: typeMeta.bg }}>
                  {c.imageUri
                    ? <img src={c.imageUri} alt={c.name} className="w-full h-full object-cover" />
                    : <User size={18} style={{ color: typeMeta.color }} />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }}
                      className="truncate">{c.name}</span>
                    {isOver && <AlertTriangle size={12} color="var(--destructive)" className="flex-shrink-0" />}
                    {/* Map pin badge if location saved */}
                    {c.coordinates && (
                      <MapPin size={11} style={{ color: "var(--primary)", flexShrink: 0 }} />
                    )}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                    {c.phone !== "—" ? c.phone : c.address}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  {hasDebt ? (
                    <>
                      <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--destructive)" }}>
                        {fmt(c.balance)}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>MAD dû</div>
                    </>
                  ) : (
                    <div style={{ fontSize: "11px", color: "var(--accent)", fontWeight: 600 }}>✓ Soldé</div>
                  )}
                </div>

                <ChevronRight size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
