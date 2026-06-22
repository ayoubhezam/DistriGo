import { useState } from "react";
import {
  Search, Plus, Minus, Trash2, CreditCard, Banknote, CheckCircle,
  ShoppingCart, X, ScanLine, User, UserPlus, ChevronDown, AlertCircle,
  Phone, LayoutGrid, ChevronRight, Package,
} from "lucide-react";
import { PRODUCTS, CUSTOMERS, CATEGORIES } from "./mockData";
import { CartItem, Customer, Product } from "./types";

type PaymentMethod = "cash" | "card" | "credit";

const CLIENT_COMPTOIR = CUSTOMERS[0];

export function POS({ onScanRequest }: { onScanRequest: () => void }) {

  // ── customer ──────────────────────────────────────────────────────────────
  const [customer,          setCustomer         ] = useState<Customer>(CLIENT_COMPTOIR);
  const [showCustomerPicker,setShowCustomerPicker] = useState(false);
  const [customerSearch,    setCustomerSearch   ] = useState("");
  const [showNewCustomer,   setShowNewCustomer  ] = useState(false);
  const [newCustName,       setNewCustName      ] = useState("");
  const [newCustPhone,      setNewCustPhone     ] = useState("");

  // ── cart ──────────────────────────────────────────────────────────────────
  const [cart,         setCart        ] = useState<CartItem[]>([]);
  const [productSearch,setProductSearch] = useState("");

  // ── category browser (bottom sheet) ───────────────────────────────────────
  const [showCatSheet,  setShowCatSheet ] = useState(false);
  const [activeCat,     setActiveCat   ] = useState<string | null>(null);

  // ── checkout ──────────────────────────────────────────────────────────────
  const [showCheckout,  setShowCheckout ] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashInput,     setCashInput   ] = useState("");
  const [showReceipt,   setShowReceipt ] = useState(false);

  // ── derived ───────────────────────────────────────────────────────────────
  const subtotal        = cart.reduce((a, c) => a + c.product.sellingPrice * c.qty, 0);
  const total           = subtotal;
  const change          = parseFloat(cashInput || "0") - total;
  const creditRemaining = customer.creditLimit - customer.balance;
  const wouldExceedCredit = paymentMethod === "credit" && total > creditRemaining;

  const filteredProducts  = PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.barcode.includes(productSearch)
  );
  const filteredCustomers = CUSTOMERS.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  // products shown in the bottom sheet for the active category
  const sheetProducts = activeCat
    ? PRODUCTS.filter(p => p.category === activeCat)
    : [];

  // ── cart helpers ──────────────────────────────────────────────────────────
  function addToCart(p: Product) {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === p.id);
      if (existing) return prev.map(c => c.product.id === p.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { product: p, qty: 1 }];
    });
  }

  function updateQty(id: string, delta: number) {
    setCart(prev =>
      prev.map(c => c.product.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c)
          .filter(c => c.qty > 0)
    );
  }

  // ── customer helpers ──────────────────────────────────────────────────────
  function selectCustomer(c: Customer) {
    setCustomer(c);
    setShowCustomerPicker(false);
    setCustomerSearch("");
    if (c.id === CLIENT_COMPTOIR.id) setPaymentMethod("cash");
  }

  function addNewCustomer() {
    if (!newCustName.trim()) return;
    const newC: Customer = {
      id: `c${Date.now()}`,
      name: newCustName.trim(),
      phone: newCustPhone.trim() || "—",
      address: "",
      balance: 0,
      creditLimit: 3000,
      customerType: "retail",
      openingBalance: 0,
    };
    CUSTOMERS.push(newC);
    selectCustomer(newC);
    setShowNewCustomer(false);
    setNewCustName("");
    setNewCustPhone("");
  }

  function completeSale() { setShowReceipt(true); setShowCheckout(false); }

  function newSale() {
    setCart([]); setShowReceipt(false); setCashInput("");
    setCustomer(CLIENT_COMPTOIR); setPaymentMethod("cash"); setProductSearch("");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RECEIPT
  // ══════════════════════════════════════════════════════════════════════════
  if (showReceipt) {
    const now      = new Date();
    const payLabel = paymentMethod === "cash" ? "Espèces"
                   : paymentMethod === "card" ? "Carte bancaire" : "Crédit";
    return (
      <div className="px-4 pt-6 pb-6 flex flex-col items-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: "var(--green-light)" }}>
          <CheckCircle size={36} style={{ color: "var(--accent)" }} />
        </div>
        <h1 style={{ color: "var(--foreground)", marginBottom: 2 }}>Vente enregistrée !</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "13px", marginBottom: 20 }}>
          {now.toLocaleDateString("fr-FR")} à {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <div className="w-full bg-card rounded-2xl p-4 border border-border shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
            <User size={14} style={{ color: "var(--muted-foreground)" }} />
            <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }}>{customer.name}</span>
            {paymentMethod === "credit" && (
              <span className="ml-auto px-2 py-0.5 rounded-full"
                style={{ background: "#fff3e0", color: "#e65100", fontSize: "11px", fontWeight: 600 }}>
                Crédit
              </span>
            )}
          </div>
          <div style={{ fontWeight: 600, fontSize: "12px", color: "var(--muted-foreground)", marginBottom: 8 }}>
            ARTICLES
          </div>
          {cart.map(c => (
            <div key={c.product.id} className="flex justify-between py-1"
              style={{ fontSize: "13px", color: "var(--foreground)" }}>
              <span>{c.product.name} × {c.qty}</span>
              <span>{(c.product.sellingPrice * c.qty).toFixed(2)} MAD</span>
            </div>
          ))}
          <div className="border-t border-border mt-3 pt-3 space-y-1">
            <div className="flex justify-between"
              style={{ fontWeight: 700, fontSize: "17px", color: "var(--foreground)" }}>
              <span>Total</span><span>{total.toFixed(2)} MAD</span>
            </div>
            {paymentMethod === "cash" && parseFloat(cashInput) > 0 && (
              <>
                <div className="flex justify-between"
                  style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
                  <span>Reçu</span><span>{parseFloat(cashInput).toFixed(2)} MAD</span>
                </div>
                <div className="flex justify-between"
                  style={{ fontSize: "13px", color: "var(--accent)", fontWeight: 600 }}>
                  <span>Monnaie</span><span>{change.toFixed(2)} MAD</span>
                </div>
              </>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-border text-center"
            style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
            Règlement : {payLabel} · Merci pour votre confiance !
          </div>
        </div>
        <button onClick={newSale} className="w-full py-3 rounded-2xl"
          style={{ background: "var(--primary)", color: "white", fontWeight: 700, fontSize: "15px" }}>
          Nouvelle vente
        </button>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CHECKOUT
  // ══════════════════════════════════════════════════════════════════════════
  if (showCheckout) {
    return (
      <div className="px-4 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setShowCheckout(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "var(--muted)" }}>
            <X size={18} />
          </button>
          <h1 style={{ color: "var(--foreground)" }}>Encaissement</h1>
        </div>

        {/* Customer recap */}
        <div className="bg-card rounded-2xl p-3.5 border border-border shadow-sm mb-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--blue-light)" }}>
            <User size={16} style={{ color: "var(--primary)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }}>{customer.name}</div>
            {customer.id !== CLIENT_COMPTOIR.id && (
              <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                Solde : {customer.balance.toFixed(2)} MAD
              </div>
            )}
          </div>
        </div>

        {/* Order recap */}
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-4">
          {cart.map(c => (
            <div key={c.product.id}
              className="flex justify-between items-center py-2 border-b border-border last:border-0">
              <div>
                <div style={{ fontWeight: 500, fontSize: "13px", color: "var(--foreground)" }}>
                  {c.product.name}
                </div>
                <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                  {c.qty} × {c.product.sellingPrice.toFixed(2)} MAD
                </div>
              </div>
              <span style={{ fontWeight: 600, color: "var(--foreground)", fontSize: "13px" }}>
                {(c.product.sellingPrice * c.qty).toFixed(2)}
              </span>
            </div>
          ))}
          <div className="flex justify-between pt-3 mt-1"
            style={{ fontWeight: 700, fontSize: "18px", color: "var(--foreground)" }}>
            <span>Total</span><span>{total.toFixed(2)} MAD</span>
          </div>
        </div>

        {/* Payment method */}
        <div className="mb-4">
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 10 }}>
            Mode de règlement
          </p>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: "cash"   as PaymentMethod, label: "Espèces", icon: <Banknote size={18} /> },
              { id: "card"   as PaymentMethod, label: "Carte",   icon: <CreditCard size={18} /> },
              { id: "credit" as PaymentMethod, label: "Crédit",  icon: <User size={18} />,
                disabled: customer.id === CLIENT_COMPTOIR.id },
            ]).map(({ id, label, icon, disabled }) => (
              <button key={id} onClick={() => !disabled && setPaymentMethod(id)}
                className="flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all"
                style={{
                  background : paymentMethod === id ? "var(--primary)" : "var(--card)",
                  borderColor: paymentMethod === id ? "var(--primary)" : "var(--border)",
                  color      : paymentMethod === id ? "white" : disabled ? "var(--muted-foreground)" : "var(--foreground)",
                  opacity: disabled ? 0.4 : 1,
                  cursor : disabled ? "not-allowed" : "pointer",
                  fontWeight: 600, fontSize: "12px",
                }}>
                {icon}{label}
              </button>
            ))}
          </div>
        </div>

        {/* Cash input */}
        {paymentMethod === "cash" && (
          <div className="mb-4">
            <label style={{ fontSize: "13px", color: "var(--muted-foreground)", display: "block", marginBottom: 6 }}>
              Montant reçu (MAD)
            </label>
            <input type="number" value={cashInput} onChange={e => setCashInput(e.target.value)}
              placeholder={`${Math.ceil(total)}.00`}
              className="w-full px-4 py-3 rounded-2xl border border-border outline-none text-center"
              style={{ fontSize: "24px", fontWeight: 700, color: "var(--foreground)",
                background: "var(--input-background)" }} />
            {parseFloat(cashInput) >= total && (
              <div className="mt-2 text-center p-2 rounded-xl"
                style={{ background: "var(--green-light)", color: "var(--accent)", fontWeight: 700, fontSize: "16px" }}>
                Monnaie : {change.toFixed(2)} MAD
              </div>
            )}
          </div>
        )}

        {/* Credit info */}
        {paymentMethod === "credit" && customer.id !== CLIENT_COMPTOIR.id && (
          <div className="mb-4 rounded-2xl border p-4 space-y-2"
            style={{
              borderColor: wouldExceedCredit ? "rgba(198,40,40,0.4)" : "var(--border)",
              background : wouldExceedCredit ? "var(--red-light)" : "var(--card)",
            }}>
            <div className="flex justify-between" style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
              <span>Solde actuel</span>
              <span style={{ fontWeight: 600, color: customer.balance > 0 ? "var(--destructive)" : "var(--foreground)" }}>
                {customer.balance.toFixed(2)} MAD
              </span>
            </div>
            <div className="flex justify-between" style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
              <span>Plafond crédit</span>
              <span style={{ fontWeight: 600, color: "var(--foreground)" }}>
                {customer.creditLimit.toFixed(2)} MAD
              </span>
            </div>
            <div className="flex justify-between" style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
              <span>Disponible</span>
              <span style={{ fontWeight: 700, color: creditRemaining < total ? "var(--destructive)" : "var(--accent)" }}>
                {creditRemaining.toFixed(2)} MAD
              </span>
            </div>
            <div className="rounded-full overflow-hidden" style={{ height: 5, background: "var(--muted)", marginTop: 4 }}>
              <div style={{
                width: `${Math.min(100, (customer.balance / customer.creditLimit) * 100)}%`,
                height: "100%", background: creditRemaining < 0 ? "var(--destructive)" : "#f57c00", borderRadius: 999,
              }} />
            </div>
            {wouldExceedCredit && (
              <div className="flex items-center gap-2 mt-1"
                style={{ color: "var(--destructive)", fontSize: "12px", fontWeight: 600 }}>
                <AlertCircle size={14} />
                Plafond dépassé de {(total - creditRemaining).toFixed(2)} MAD
              </div>
            )}
          </div>
        )}

        <button onClick={completeSale}
          disabled={(paymentMethod === "cash" && parseFloat(cashInput || "0") < total) ||
                    (paymentMethod === "credit" && wouldExceedCredit)}
          className="w-full py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-40"
          style={{ background: "var(--accent)", color: "white", fontWeight: 700, fontSize: "16px" }}>
          Valider la vente · {total.toFixed(2)} MAD
        </button>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CUSTOMER PICKER
  // ══════════════════════════════════════════════════════════════════════════
  if (showCustomerPicker) {
    return (
      <div className="px-4 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setShowCustomerPicker(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "var(--muted)" }}>
            <X size={18} />
          </button>
          <h1 style={{ color: "var(--foreground)" }}>Sélectionner un client</h1>
        </div>

        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--muted-foreground)" }} />
          <input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
            placeholder="Rechercher par nom ou téléphone…"
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-border outline-none"
            style={{ background: "var(--card)", fontSize: "14px", color: "var(--foreground)" }}
            autoFocus />
        </div>

        {showNewCustomer ? (
          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-3 space-y-3">
            <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }}>Nouveau client</p>
            <input value={newCustName} onChange={e => setNewCustName(e.target.value)}
              placeholder="Nom du client *"
              className="w-full px-3 py-2.5 rounded-xl border border-border outline-none"
              style={{ background: "var(--input-background)", fontSize: "14px", color: "var(--foreground)" }} />
            <input value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)}
              placeholder="Téléphone (optionnel)"
              className="w-full px-3 py-2.5 rounded-xl border border-border outline-none"
              style={{ background: "var(--input-background)", fontSize: "14px", color: "var(--foreground)" }} />
            <div className="flex gap-2">
              <button onClick={() => setShowNewCustomer(false)} className="flex-1 py-2.5 rounded-xl"
                style={{ background: "var(--muted)", color: "var(--foreground)", fontWeight: 500 }}>
                Annuler
              </button>
              <button onClick={addNewCustomer} className="flex-1 py-2.5 rounded-xl"
                style={{ background: "var(--primary)", color: "white", fontWeight: 600 }}>
                Ajouter
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowNewCustomer(true)}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl mb-3 transition-all active:scale-95"
            style={{ background: "var(--green-light)", color: "var(--accent)", fontWeight: 600, fontSize: "14px" }}>
            <UserPlus size={16} /> Nouveau client
          </button>
        )}

        <div className="space-y-2">
          {filteredCustomers.map(c => (
            <button key={c.id} onClick={() => selectCustomer(c)}
              className="w-full bg-card rounded-2xl p-3.5 border border-border shadow-sm flex items-center gap-3 text-left active:scale-98 transition-transform"
              style={{ borderColor: customer.id === c.id ? "var(--primary)" : undefined }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: c.id === "c0" ? "var(--muted)" : "var(--blue-light)" }}>
                <User size={18} style={{ color: c.id === "c0" ? "var(--muted-foreground)" : "var(--primary)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }}>{c.name}</div>
                {c.id !== "c0" && (
                  <div className="flex items-center gap-1"
                    style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                    <Phone size={10} /> {c.phone}
                  </div>
                )}
              </div>
              {c.id !== "c0" && (
                <div className="text-right flex-shrink-0">
                  <div style={{ fontSize: "11px",
                    color: c.balance > c.creditLimit ? "var(--destructive)" : "var(--muted-foreground)" }}>
                    Solde : {c.balance.toFixed(0)} MAD
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
                    Plafond : {c.creditLimit.toFixed(0)}
                  </div>
                </div>
              )}
              {customer.id === c.id && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "var(--primary)" }}>
                  <CheckCircle size={12} color="white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN POS
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 112px)", position: "relative" }}>

      {/* ① Top bar: title + category icon */}
      <div className="px-4 pt-2 pb-2 flex items-center justify-between"
        style={{ background: "var(--primary)" }}>
        <span style={{ fontWeight: 700, fontSize: "15px", color: "white" }}>Vente</span>
        <button
          onClick={() => { setShowCatSheet(true); setActiveCat(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all active:scale-95"
          style={{ background: "rgba(255,255,255,0.18)", color: "white" }}
        >
          <LayoutGrid size={16} />
          <span style={{ fontSize: "12px", fontWeight: 600 }}>Catégories</span>
        </button>
      </div>

      {/* ② Customer strip */}
      <div className="px-4 pt-2 pb-2"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        <button
          onClick={() => setShowCustomerPicker(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-all active:scale-98"
          style={{
            background  : customer.id === CLIENT_COMPTOIR.id ? "var(--muted)" : "var(--blue-light)",
            borderColor : customer.id === CLIENT_COMPTOIR.id ? "var(--border)" : "var(--primary)",
          }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: customer.id === CLIENT_COMPTOIR.id ? "var(--card)" : "var(--primary)" }}>
            <User size={16}
              style={{ color: customer.id === CLIENT_COMPTOIR.id ? "var(--muted-foreground)" : "white" }} />
          </div>
          <div className="flex-1 text-left min-w-0">
            <div style={{ fontWeight: 600, fontSize: "14px",
              color: customer.id === CLIENT_COMPTOIR.id ? "var(--muted-foreground)" : "var(--primary)" }}
              className="truncate">
              {customer.name}
            </div>
            {customer.id !== CLIENT_COMPTOIR.id && (
              <div className="flex gap-3" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                <span>Solde : <strong style={{ color: customer.balance > 0 ? "var(--destructive)" : "var(--accent)" }}>
                  {customer.balance.toFixed(2)} MAD
                </strong></span>
                <span>Plafond : {customer.creditLimit.toFixed(0)} MAD</span>
              </div>
            )}
          </div>
          <ChevronDown size={16} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
        </button>
      </div>

      {/* ③ Search + scan */}
      <div className="px-4 py-2"
        style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--muted-foreground)" }} />
            <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
              placeholder="Rechercher un produit…"
              className="w-full pl-9 pr-3 py-2 rounded-2xl border border-border outline-none"
              style={{ background: "var(--card)", fontSize: "13px", color: "var(--foreground)" }} />
          </div>
          <button onClick={onScanRequest}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl flex-shrink-0"
            style={{ background: "var(--primary)", color: "white", fontWeight: 600, fontSize: "12px" }}>
            <ScanLine size={15} /> Scanner
          </button>
        </div>

        {/* Search results dropdown */}
        {productSearch.length > 0 && (
          <div className="mt-2 rounded-2xl border border-border overflow-hidden"
            style={{ background: "var(--card)", maxHeight: 180, overflowY: "auto" }}>
            {filteredProducts.length === 0 ? (
              <p style={{ padding: "10px 12px", color: "var(--muted-foreground)", fontSize: "13px" }}>
                Aucun produit trouvé
              </p>
            ) : filteredProducts.map(p => (
              <button key={p.id}
                onClick={() => { addToCart(p); setProductSearch(""); }}
                className="w-full flex items-center justify-between px-3 py-2.5 border-b border-border last:border-0 text-left">
                <div>
                  <div style={{ fontWeight: 500, fontSize: "13px", color: "var(--foreground)" }}>{p.name}</div>
                  <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{p.stock} en stock</div>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--primary)" }}>
                    {p.sellingPrice.toFixed(2)} MAD
                  </span>
                  <Plus size={16} style={{ color: "var(--primary)" }} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ④ Cart — takes all remaining space */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full"
            style={{ color: "var(--muted-foreground)", opacity: 0.5 }}>
            <ShoppingCart size={40} style={{ marginBottom: 10 }} />
            <p style={{ fontSize: "14px" }}>Panier vide</p>
            <p style={{ fontSize: "12px" }}>Recherchez ou parcourez les catégories</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map(c => (
              <div key={c.product.id}
                className="bg-card rounded-2xl px-3 py-3 border border-border shadow-sm flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div style={{ fontWeight: 500, fontSize: "13px", color: "var(--foreground)" }}
                    className="truncate">{c.product.name}</div>
                  <div style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 600 }}>
                    {c.product.sellingPrice.toFixed(2)} MAD/u
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => updateQty(c.product.id, -1)}
                    className="w-7 h-7 rounded-full border border-border flex items-center justify-center">
                    <Minus size={13} />
                  </button>
                  <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--foreground)",
                    minWidth: 22, textAlign: "center" }}>{c.qty}</span>
                  <button onClick={() => updateQty(c.product.id, 1)}
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: "var(--primary)", color: "white" }}>
                    <Plus size={13} />
                  </button>
                </div>
                <div className="text-right flex-shrink-0 min-w-[70px]">
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--foreground)" }}>
                    {(c.product.sellingPrice * c.qty).toFixed(2)}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>MAD</div>
                </div>
                <button onClick={() => setCart(prev => prev.filter(i => i.product.id !== c.product.id))}
                  className="flex-shrink-0 ml-1">
                  <Trash2 size={14} style={{ color: "var(--destructive)" }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ⑤ Payment bar */}
      <div className="px-4 pb-3 pt-2"
        style={{ background: "var(--card)", borderTop: "1px solid var(--border)" }}>
        <div className="flex justify-between items-center mb-3">
          <div>
            <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
              {cart.reduce((a, c) => a + c.qty, 0)} article(s)
            </div>
            <div style={{ fontWeight: 800, fontSize: "22px", color: "var(--foreground)", lineHeight: 1.1 }}>
              {total.toFixed(2)} MAD
            </div>
          </div>
          {cart.length > 0 && (
            <button onClick={() => setCart([])}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl"
              style={{ background: "var(--red-light)", color: "var(--destructive)", fontSize: "12px", fontWeight: 500 }}>
              <Trash2 size={12} /> Vider
            </button>
          )}
        </div>
        <button onClick={() => cart.length > 0 && setShowCheckout(true)} disabled={cart.length === 0}
          className="w-full py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-35"
          style={{
            background: cart.length > 0 ? "var(--accent)" : "var(--muted)",
            color     : cart.length > 0 ? "white" : "var(--muted-foreground)",
            fontWeight: 700, fontSize: "16px",
          }}>
          {cart.length === 0 ? "Ajouter des produits" : `Valider la vente · ${total.toFixed(2)} MAD`}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          CATEGORY BOTTOM SHEET — overlay, slides up from bottom
          ════════════════════════════════════════════════════════════════════ */}
      {showCatSheet && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => { setShowCatSheet(false); setActiveCat(null); }}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
              zIndex: 50, backdropFilter: "blur(2px)",
            }}
          />

          {/* Sheet panel */}
          <div style={{
            position: "fixed", bottom: 64, left: "50%", transform: "translateX(-50%)",
            width: "100%", maxWidth: 480, zIndex: 51,
            background: "var(--card)",
            borderRadius: "20px 20px 0 0",
            boxShadow: "0 -4px 32px rgba(0,0,0,0.18)",
            maxHeight: "72vh",
            display: "flex", flexDirection: "column",
          }}>

            {/* Sheet header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3"
              style={{ borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              <div className="flex items-center gap-2">
                {activeCat && (
                  <button
                    onClick={() => setActiveCat(null)}
                    className="w-7 h-7 rounded-full flex items-center justify-center mr-1"
                    style={{ background: "var(--muted)" }}>
                    <ChevronRight size={14} style={{ transform: "rotate(180deg)" }} />
                  </button>
                )}
                <LayoutGrid size={16} style={{ color: "var(--primary)" }} />
                <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--foreground)" }}>
                  {activeCat ?? "Catégories"}
                </span>
                {activeCat && (
                  <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                    · {sheetProducts.length} produit{sheetProducts.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <button
                onClick={() => { setShowCatSheet(false); setActiveCat(null); }}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "var(--muted)" }}>
                <X size={16} />
              </button>
            </div>

            {/* Sheet body */}
            <div className="overflow-y-auto flex-1 p-4">

              {/* ── Category grid ── */}
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
                          <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--foreground)" }}
                            className="truncate">{cat}</div>
                          <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                            {count} produit{count !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── Products in selected category ── */}
              {activeCat && (
                <div className="space-y-2">
                  {sheetProducts.length === 0 ? (
                    <p style={{ textAlign: "center", color: "var(--muted-foreground)", fontSize: "13px",
                      padding: "24px 0" }}>
                      Aucun produit dans cette catégorie
                    </p>
                  ) : sheetProducts.map(p => {
                    const inCart = cart.find(c => c.product.id === p.id);
                    return (
                      <div key={p.id}
                        className="flex items-center gap-3 p-3 rounded-2xl border border-border"
                        style={{ background: inCart ? "var(--blue-light)" : "var(--background)",
                          borderColor: inCart ? "var(--primary)" : "var(--border)" }}>

                        {/* Thumbnail */}
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                          style={{ background: "var(--muted)" }}>
                          {(p as any).imageUri
                            ? <img src={(p as any).imageUri} alt={p.name}
                                className="w-full h-full object-cover" />
                            : <Package size={16} style={{ color: "var(--muted-foreground)" }} />
                          }
                        </div>

                        <div className="flex-1 min-w-0">
                          <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--foreground)" }}
                            className="truncate">{p.name}</div>
                          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)" }}>
                            {p.sellingPrice.toFixed(2)} MAD
                          </div>
                        </div>

                        {/* Qty controls if in cart, else add button */}
                        {inCart ? (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={() => updateQty(p.id, -1)}
                              className="w-7 h-7 rounded-full border border-border flex items-center justify-center"
                              style={{ background: "var(--card)" }}>
                              <Minus size={12} />
                            </button>
                            <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--primary)",
                              minWidth: 18, textAlign: "center" }}>{inCart.qty}</span>
                            <button onClick={() => updateQty(p.id, 1)}
                              className="w-7 h-7 rounded-full flex items-center justify-center"
                              style={{ background: "var(--primary)", color: "white" }}>
                              <Plus size={12} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(p)}
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
                            style={{ background: "var(--primary)", color: "white" }}>
                            <Plus size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sheet footer — shows cart summary */}
            {cart.length > 0 && (
              <div className="px-4 py-3 flex items-center justify-between"
                style={{ borderTop: "1px solid var(--border)", flexShrink: 0 }}>
                <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
                  {cart.reduce((a, c) => a + c.qty, 0)} article(s) dans le panier
                </span>
                <button
                  onClick={() => { setShowCatSheet(false); setActiveCat(null); }}
                  className="px-4 py-2 rounded-xl transition-all active:scale-95"
                  style={{ background: "var(--accent)", color: "white", fontWeight: 600, fontSize: "13px" }}>
                  Voir panier · {total.toFixed(2)} MAD
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
