import { useState, useEffect, useRef } from "react";
import {
  Plus, ChevronRight, X, Truck, Check, Package,
  Phone, MapPin, AlertTriangle, Search,
  LayoutList, LayoutGrid, Filter, Camera, Box,
  Shuffle, ChevronDown, Calendar, ShoppingCart,
  Minus, Trash2,
} from "lucide-react";
import { PURCHASE_ORDERS } from "./mockData";
import { PurchaseOrder } from "./types";
import { useFournisseurStore, Fournisseur } from "./fournisseur";
import { useProductsStore, ExtendedProduct, UnitType } from "./productsStore";

type Supplier  = { id: string; name: string; phone: string; address: string };
type OrderItem = { productId: string; productName: string; qty: number; unitCost: number };
type View      = "list" | "suppliers" | "newOrder" | "cart" | "detail" | "addSupplier" | "addProduct";
type ViewMode  = "list" | "grid";

function fmt(n: number) {
  return n.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function generateEAN13() {
  const d = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  const c = (10 - (d.reduce((s, v, i) => s + v * (i % 2 === 0 ? 1 : 3), 0) % 10)) % 10;
  return [...d, c].join("");
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const colors = ["#1565C0","#2E7D32","#6A1B9A","#C62828","#E65100","#00695C"];
  const color  = colors[name.charCodeAt(0) % colors.length];
  const ini    = name.split(" ").slice(0,2).map(w => w[0]?.toUpperCase() ?? "").join("");
  return (
    <div className="flex items-center justify-center rounded-full flex-shrink-0"
      style={{ width: size, height: size, background: color+"22", border:`1.5px solid ${color}33` }}>
      <span style={{ fontSize: size*0.36, fontWeight: 700, color }}>{ini}</span>
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-1.5 mt-1.5 px-1">
      <AlertTriangle size={12} style={{ color:"var(--destructive)", flexShrink:0 }} />
      <span style={{ fontSize:"11px", color:"var(--destructive)", fontWeight:500 }}>{msg}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: "pending"|"received" }) {
  return (
    <span className="px-2 py-0.5 rounded-full" style={{
      fontSize:"11px", fontWeight:600,
      background: status==="received" ? "var(--green-light)" : "var(--orange-light)",
      color:      status==="received" ? "var(--accent)"      : "#e65100",
    }}>
      {status==="received" ? "Reçu" : "En attente"}
    </span>
  );
}

export function Purchases() {
  const { suppliers, setSuppliers }                          = useFournisseurStore();
  const { products, categories, setProducts, setCategories } = useProductsStore();

  const [view,             setView            ] = useState<View>("list");
  const [orders,           setOrders          ] = useState<PurchaseOrder[]>(PURCHASE_ORDERS);
  const [selectedOrder,    setSelectedOrder   ] = useState<PurchaseOrder | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [orderItems,       setOrderItems      ] = useState<OrderItem[]>([]);

  // supplier picker
  const [supplierSearch, setSupplierSearch] = useState("");

  // product picker
  const [prodSearch,   setProdSearch  ] = useState("");
  const [prodCategory, setProdCategory] = useState("Tous");
  const [prodViewMode, setProdViewMode] = useState<ViewMode>("list");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // add supplier form
  const [newSupName,    setNewSupName   ] = useState("");
  const [newSupPhone,   setNewSupPhone  ] = useState("");
  const [newSupAddress, setNewSupAddress] = useState("");
  const [supErrors,     setSupErrors    ] = useState<Record<string,string>>({});
  const [supSubmitted,  setSupSubmitted ] = useState(false);

  // add product form
  const [editProd,       setEditProd      ] = useState<Partial<ExtendedProduct>>({});
  const [packages,       setPackages      ] = useState<number|"">(0);
  const [packSize,       setPackSize      ] = useState<number|"">(0);
  const [unitType,       setUnitType      ] = useState<UnitType>("pièce");
  const [hasExpiry,      setHasExpiry     ] = useState(false);
  const [expiryDate,     setExpiryDate    ] = useState("");
  const [showAddCat,     setShowAddCat    ] = useState(false);
  const [newCatName,     setNewCatName    ] = useState("");
  const [prodErrors,     setProdErrors    ] = useState<Record<string,string>>({});
  const [prodSubmitted,  setProdSubmitted ] = useState(false);
  const [showMarginWarn, setShowMarginWarn] = useState(false);
  const [supOpen,        setSupOpen       ] = useState(false);
  const [supSearch,      setSupSearch     ] = useState("");
  const supDropRef = useRef<HTMLDivElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);

  const computedStock = unitType === "pièce"
    ? (Number(packages)||0) * (Number(packSize)||0)
    : (Number(packages)||0);

  useEffect(() => {
    setEditProd(prev => ({
      ...prev, stock: computedStock,
      packages: Number(packages)||0, packSize: Number(packSize)||0, unitType,
    }));
  }, [packages, packSize, unitType]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (supDropRef.current && !supDropRef.current.contains(e.target as Node)) setSupOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filteredProds = products.filter(p => {
    const ms = p.name.toLowerCase().includes(prodSearch.toLowerCase()) || p.barcode.includes(prodSearch);
    const mc = prodCategory === "Tous" || p.category === prodCategory;
    const ml = !lowStockOnly || p.stock < p.minStock;
    return ms && mc && ml;
  });

  const filteredSuppliers = suppliers.filter(f =>
    f.name.toLowerCase().includes(supplierSearch.toLowerCase()) || f.phone.includes(supplierSearch)
  );

  function startNewOrder(f: Fournisseur) {
    setSelectedSupplier({ id:f.id, name:f.name, phone:f.phone, address:f.address });
    setOrderItems([]); setProdSearch(""); setProdCategory("Tous"); setLowStockOnly(false);
    setView("newOrder");
  }

  function toggleProduct(p: ExtendedProduct) {
    setOrderItems(prev => prev.find(i => i.productId===p.id)
      ? prev.filter(i => i.productId!==p.id)
      : [...prev, { productId:p.id, productName:p.name, qty:1, unitCost:p.purchasePrice }]
    );
  }

  function confirmOrder() {
    if (!selectedSupplier || orderItems.length===0) return;
    const total = orderItems.reduce((a,i) => a+i.qty*i.unitCost, 0);
    setOrders(prev => [{
      id:`BC${String(Date.now()).slice(-3)}`, supplierId:selectedSupplier.id,
      supplierName:selectedSupplier.name, date:new Date().toISOString().split("T")[0],
      items:orderItems, total, status:"pending",
    }, ...prev]);
    setView("list");
  }

  function receiveOrder(id: string) {
    setOrders(prev => prev.map(o => o.id===id ? {...o,status:"received"} : o));
    setSelectedOrder(null); setView("list");
  }

  // ── Add supplier ──────────────────────────────────────────────────────────
  function validateSupplier(): boolean {
    const errs: Record<string,string> = {};
    if (!newSupName.trim()) errs.name = "Le nom est obligatoire.";
    else if (suppliers.find(f => f.name.trim().toLowerCase()===newSupName.trim().toLowerCase()))
      errs.name = "Ce fournisseur existe déjà.";
    if (!newSupPhone.trim()) errs.phone = "Le numéro est obligatoire.";
    setSupErrors(errs); return Object.keys(errs).length===0;
  }

  function saveSupplier() {
    setSupSubmitted(true);
    if (!validateSupplier()) return;
    const newF: Fournisseur = {
      id:`f${Date.now()}`, name:newSupName.trim(), phone:newSupPhone.trim(),
      address:newSupAddress.trim(), balance:0, productIds:[], payments:[],
    };
    setSuppliers([...suppliers, newF]);
    startNewOrder(newF);
    setNewSupName(""); setNewSupPhone(""); setNewSupAddress(""); setSupErrors({}); setSupSubmitted(false);
  }

  function openAddSupplier() {
    setNewSupName(""); setNewSupPhone(""); setNewSupAddress("");
    setSupErrors({}); setSupSubmitted(false); setView("addSupplier");
  }

  // ── Add product ───────────────────────────────────────────────────────────
  function validateProduct(): boolean {
    const errs: Record<string,string> = {};
    const name = (editProd.name??"").trim();
    const bc   = (editProd.barcode??"").trim();
    if (!name) errs.name = "Le nom est obligatoire.";
    else if (products.find(p => p.id!==editProd.id && p.name.trim().toLowerCase()===name.toLowerCase()))
      errs.name = "Ce nom est déjà enregistré.";
    if (bc && products.find(p => p.id!==editProd.id && p.barcode.trim()===bc))
      errs.barcode = "Ce code-barres est déjà enregistré.";
    if (!editProd.sellingPrice  || editProd.sellingPrice <=0) errs.sellingPrice  = "Obligatoire.";
    if (!editProd.purchasePrice || editProd.purchasePrice<=0) errs.purchasePrice = "Obligatoire.";
    if (!packages || Number(packages)<=0) errs.packages = "Obligatoire.";
    if (!packSize  || Number(packSize) <=0) errs.packSize  = "Obligatoire.";
    setProdErrors(errs); return Object.keys(errs).length===0;
  }

  function commitSaveProduct() {
    const final: ExtendedProduct = {
      ...(editProd as ExtendedProduct),
      id:editProd.id??`p${Date.now()}`, unitType,
      packages:Number(packages)||0, packSize:Number(packSize)||0,
      stock:computedStock, unit:unitType, hasExpiry,
      expiryDate: hasExpiry ? expiryDate : "",
    };
    setProducts([...products, final]);
    setOrderItems(prev => [...prev, { productId:final.id, productName:final.name, qty:1, unitCost:final.purchasePrice }]);
    setShowMarginWarn(false); setView("newOrder");
  }

  function saveProduct() {
    setProdSubmitted(true);
    if (!validateProduct()) return;
    if ((editProd.purchasePrice??0) >= (editProd.sellingPrice??0)) { setShowMarginWarn(true); return; }
    commitSaveProduct();
  }

  function openAddProduct() {
    setEditProd({ name:"", category:categories.find(c=>c!=="Tous")??"Boissons",
      barcode:"", sellingPrice:0, purchasePrice:0, stock:0, minStock:10,
      supplier:selectedSupplier?.name??"", unit:"pièce", hasExpiry:false, expiryDate:"" });
    setUnitType("pièce"); setPackages(0); setPackSize(0); setHasExpiry(false); setExpiryDate("");
    setProdErrors({}); setProdSubmitted(false); setShowMarginWarn(false); setView("addProduct");
  }

  function addCategory() {
    const n = newCatName.trim();
    if (!n || categories.includes(n)) return;
    setCategories([...categories, n]);
    setEditProd(p => ({...p, category:n}));
    setNewCatName(""); setShowAddCat(false);
  }

  const filteredSupForProd = suppliers.map(f=>f.name)
    .filter(n => n.toLowerCase().includes(supSearch.toLowerCase()));

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW: SUPPLIER PICKER
  // ══════════════════════════════════════════════════════════════════════════
  if (view === "suppliers") return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => { setView("list"); setSupplierSearch(""); }}
            className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background:"var(--muted)" }}>
            <X size={18} />
          </button>
          <h1 style={{ color:"var(--foreground)" }}>Choisir un fournisseur</h1>
        </div>
        <button onClick={openAddSupplier}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl active:scale-95"
          style={{ background:"var(--primary)", color:"white", fontSize:"13px", fontWeight:600 }}>
          <Plus size={15} /> Nouveau
        </button>
      </div>
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:"var(--muted-foreground)" }} />
        <input value={supplierSearch} onChange={e => setSupplierSearch(e.target.value)}
          placeholder="Rechercher un fournisseur…"
          className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-border outline-none"
          style={{ background:"var(--card)", fontSize:"14px", color:"var(--foreground)" }} />
      </div>
      {filteredSuppliers.length === 0 ? (
        <div className="py-12 flex flex-col items-center gap-3">
          <Truck size={32} style={{ color:"var(--primary)", opacity:0.3 }} />
          <p style={{ fontSize:"13px", color:"var(--muted-foreground)" }}>Aucun fournisseur trouvé.</p>
          <button onClick={openAddSupplier} className="px-4 py-2 rounded-xl"
            style={{ background:"var(--primary)", color:"white", fontSize:"13px", fontWeight:600 }}>
            Ajouter un fournisseur
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSuppliers.map(f => (
            <button key={f.id} onClick={() => startNewOrder(f)}
              className="w-full bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center gap-3 text-left active:scale-98 transition-transform"
              style={{ borderColor: f.balance>0 ? "rgba(198,40,40,0.2)" : undefined }}>
              <Avatar name={f.name} size={42} />
              <div className="flex-1 min-w-0">
                <div style={{ fontWeight:600, fontSize:"14px", color:"var(--foreground)" }} className="truncate">{f.name}</div>
                <div className="flex items-center gap-1 mt-0.5" style={{ fontSize:"12px", color:"var(--muted-foreground)" }}>
                  <Phone size={11} /><span>{f.phone}</span>
                </div>
                {f.address && (
                  <div className="flex items-center gap-1 mt-0.5" style={{ fontSize:"11px", color:"var(--muted-foreground)" }}>
                    <MapPin size={10} /><span className="truncate">{f.address}</span>
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                {f.balance > 0
                  ? <span style={{ fontSize:"11px", fontWeight:700, color:"var(--destructive)" }}>{f.balance.toLocaleString("fr-DZ")} DZD</span>
                  : <Check size={14} style={{ color:"var(--accent)" }} />}
              </div>
              <ChevronRight size={14} style={{ color:"var(--muted-foreground)", flexShrink:0 }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW: ADD SUPPLIER
  // ══════════════════════════════════════════════════════════════════════════
  if (view === "addSupplier") return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setView("suppliers")}
          className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background:"var(--muted)" }}>
          <X size={18} />
        </button>
        <div>
          <h1 style={{ color:"var(--foreground)" }}>Nouveau fournisseur</h1>
          <p style={{ fontSize:"12px", color:"var(--muted-foreground)" }}>Sera ajouté à la liste des fournisseurs</p>
        </div>
      </div>
      <div className="space-y-4">
        {newSupName.trim() && <div className="flex justify-center py-2"><Avatar name={newSupName} size={64} /></div>}
        <div>
          <label style={{ fontSize:"13px", color:"var(--muted-foreground)", marginBottom:4, display:"block" }}>
            Nom <span style={{ color:"var(--destructive)" }}>*</span>
          </label>
          <input type="text" value={newSupName} autoFocus
            onChange={e => { setNewSupName(e.target.value); if (supSubmitted) validateSupplier(); }}
            placeholder="Ex : Société Al Baraka"
            className="w-full rounded-xl border px-3 py-2.5 outline-none focus:ring-2"
            style={{ background:"var(--input-background)", color:"var(--foreground)", fontSize:"14px",
              borderColor:supErrors.name?"var(--destructive)":"var(--border)",
              "--tw-ring-color":"var(--primary)" } as React.CSSProperties} />
          {supErrors.name && <FieldError msg={supErrors.name} />}
        </div>
        <div>
          <label style={{ fontSize:"13px", color:"var(--muted-foreground)", marginBottom:4, display:"block" }}>
            Téléphone <span style={{ color:"var(--destructive)" }}>*</span>
          </label>
          <input type="tel" value={newSupPhone}
            onChange={e => { setNewSupPhone(e.target.value); if (supSubmitted) validateSupplier(); }}
            placeholder="05XX XXX XXX"
            className="w-full rounded-xl border px-3 py-2.5 outline-none focus:ring-2"
            style={{ background:"var(--input-background)", color:"var(--foreground)", fontSize:"14px",
              borderColor:supErrors.phone?"var(--destructive)":"var(--border)",
              "--tw-ring-color":"var(--primary)" } as React.CSSProperties} />
          {supErrors.phone && <FieldError msg={supErrors.phone} />}
        </div>
        <div>
          <label style={{ fontSize:"13px", color:"var(--muted-foreground)", marginBottom:4, display:"block" }}>Adresse (optionnel)</label>
          <input type="text" value={newSupAddress} onChange={e => setNewSupAddress(e.target.value)}
            placeholder="Rue, ville…"
            className="w-full rounded-xl border border-border px-3 py-2.5 outline-none"
            style={{ background:"var(--input-background)", color:"var(--foreground)", fontSize:"14px" }} />
        </div>
        <div className="rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ background:"var(--blue-light)" }}>
          <Truck size={14} style={{ color:"var(--primary)", flexShrink:0 }} />
          <p style={{ fontSize:"12px", color:"var(--primary)", lineHeight:1.4 }}>
            Après l'ajout, vous serez redirigé vers la création du bon de commande.
          </p>
        </div>
        <button onClick={saveSupplier} className="w-full py-3 rounded-2xl transition-all active:scale-95"
          style={{ background:"var(--primary)", color:"var(--primary-foreground)", fontWeight:600, fontSize:"15px" }}>
          Ajouter et créer un bon de commande
        </button>
        <button onClick={() => setView("suppliers")}
          className="w-full py-2.5 rounded-2xl border border-border"
          style={{ color:"var(--muted-foreground)", fontSize:"14px" }}>Annuler</button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW: NEW ORDER — full product picker
  // ══════════════════════════════════════════════════════════════════════════
  if (view === "newOrder" && selectedSupplier) {
    const total = orderItems.reduce((a,i) => a+i.qty*i.unitCost, 0);
    return (
      <div className="px-4 pt-4 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setView("suppliers")}
              className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background:"var(--muted)" }}>
              <X size={18} />
            </button>
            <div>
              <h1 style={{ color:"var(--foreground)" }}>Nouveau bon</h1>
              <p style={{ fontSize:"13px", color:"var(--primary)", fontWeight:600 }}>{selectedSupplier.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Cart button with badge */}
            <button
              onClick={() => setView("cart")}
              className="relative w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95"
              style={{ background: orderItems.length > 0 ? "var(--accent)" : "var(--muted)" }}>
              <ShoppingCart size={18} style={{ color: orderItems.length > 0 ? "white" : "var(--muted-foreground)" }} />
              {orderItems.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background:"var(--destructive)", fontSize:"10px", fontWeight:800, color:"white" }}>
                  {orderItems.length}
                </span>
              )}
            </button>
            <div className="flex rounded-xl border border-border overflow-hidden" style={{ background:"var(--card)" }}>
              <button onClick={() => setProdViewMode("list")}
                className="w-8 h-8 flex items-center justify-center transition-colors"
                style={{ background:prodViewMode==="list"?"var(--primary)":"transparent",
                  color:prodViewMode==="list"?"white":"var(--muted-foreground)" }}>
                <LayoutList size={15} />
              </button>
              <button onClick={() => setProdViewMode("grid")}
                className="w-8 h-8 flex items-center justify-center transition-colors"
                style={{ background:prodViewMode==="grid"?"var(--primary)":"transparent",
                  color:prodViewMode==="grid"?"white":"var(--muted-foreground)" }}>
                <LayoutGrid size={15} />
              </button>
            </div>
            <button onClick={openAddProduct}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background:"var(--primary)", color:"white" }}>
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:"var(--muted-foreground)" }} />
          <input value={prodSearch} onChange={e => setProdSearch(e.target.value)}
            placeholder="Rechercher par nom ou code-barres…"
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-border outline-none"
            style={{ background:"var(--card)", fontSize:"14px", color:"var(--foreground)" }} />
        </div>

        {/* Category filters */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          <button onClick={() => setLowStockOnly(!lowStockOnly)}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full border transition-colors"
            style={{ background:lowStockOnly?"var(--red-light)":"var(--card)",
              borderColor:lowStockOnly?"var(--destructive)":"var(--border)",
              color:lowStockOnly?"var(--destructive)":"var(--muted-foreground)",
              fontSize:"12px", fontWeight:500 }}>
            <Filter size={12} /> Stock faible
          </button>
          {categories.map(c => (
            <button key={c} onClick={() => setProdCategory(c)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full border transition-colors"
              style={{ background:prodCategory===c?"var(--primary)":"var(--card)",
                borderColor:prodCategory===c?"var(--primary)":"var(--border)",
                color:prodCategory===c?"white":"var(--muted-foreground)",
                fontSize:"12px", fontWeight:500 }}>
              {c}
            </button>
          ))}
        </div>

        <p style={{ fontSize:"12px", color:"var(--muted-foreground)", marginBottom:10 }}>
          {filteredProds.length} produit(s)
        </p>

        {/* LIST */}
        {prodViewMode === "list" && (
          <div className="space-y-2">
            {filteredProds.map(p => {
              const inOrder = orderItems.find(i => i.productId===p.id);
              const isLow   = p.stock < p.minStock;
              const ut      = (p.unitType??"pièce") as UnitType;
              return (
                <div key={p.id}
                  className="w-full bg-card rounded-2xl p-3.5 shadow-sm border border-border flex items-center gap-3"
                  style={{ borderColor:inOrder?"var(--primary)":isLow?"rgba(198,40,40,0.25)":undefined }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={{ background:"var(--blue-light)" }}>
                    {p.imageUri
                      ? <img src={p.imageUri} alt={p.name} className="w-full h-full object-cover" />
                      : <Package size={18} style={{ color:"var(--primary)" }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span style={{ fontWeight:600, fontSize:"14px", color:"var(--foreground)" }} className="truncate">{p.name}</span>
                      {isLow && <AlertTriangle size={12} color="var(--destructive)" className="flex-shrink-0" />}
                    </div>
                    <div style={{ fontSize:"12px", color:"var(--muted-foreground)" }}>{p.category} · {fmt(p.purchasePrice)} MAD</div>
                    <div style={{ fontSize:"11px", color:isLow?"var(--destructive)":"var(--muted-foreground)" }}>
                      Stock : {p.stock} {ut}
                    </div>
                  </div>
                  {inOrder ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <input type="number" min={1} value={inOrder.qty}
                        onChange={e => setOrderItems(prev => prev.map(i => i.productId===p.id ? {...i,qty:parseInt(e.target.value)||1} : i))}
                        className="w-14 text-center rounded-lg border py-1.5 outline-none"
                        style={{ background:"var(--input-background)", fontSize:"13px", fontWeight:600,
                          color:"var(--primary)", borderColor:"var(--primary)" }} />
                      <button onClick={() => setOrderItems(prev => prev.filter(i => i.productId!==p.id))}
                        className="w-7 h-7 flex items-center justify-center rounded-lg"
                        style={{ background:"var(--red-light)" }}>
                        <X size={13} style={{ color:"var(--destructive)" }} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => toggleProduct(p)}
                      className="flex-shrink-0 px-3 py-1.5 rounded-xl active:scale-95"
                      style={{ background:"var(--blue-light)", color:"var(--primary)", fontWeight:600, fontSize:"12px" }}>
                      + Ajouter
                    </button>
                  )}
                </div>
              );
            })}
            {filteredProds.length===0 && (
              <div className="py-10 flex flex-col items-center gap-3">
                <Package size={28} style={{ color:"var(--primary)", opacity:0.3 }} />
                <p style={{ fontSize:"13px", color:"var(--muted-foreground)" }}>Aucun produit trouvé.</p>
                <button onClick={openAddProduct} className="px-4 py-2 rounded-xl"
                  style={{ background:"var(--primary)", color:"white", fontSize:"13px", fontWeight:600 }}>
                  Ajouter un produit
                </button>
              </div>
            )}
          </div>
        )}

        {/* GRID */}
        {prodViewMode === "grid" && (
          <div className="grid grid-cols-2 gap-3">
            {filteredProds.map(p => {
              const inOrder = orderItems.find(i => i.productId===p.id);
              const isLow   = p.stock < p.minStock;
              const ut      = (p.unitType??"pièce") as UnitType;
              return (
                <div key={p.id}
                  className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col"
                  style={{ borderColor:inOrder?"var(--primary)":isLow?"rgba(198,40,40,0.3)":undefined }}>
                  <div className="w-full flex items-center justify-center overflow-hidden"
                    style={{ height:80, background:"var(--blue-light)", position:"relative" }}>
                    {p.imageUri ? <img src={p.imageUri} alt={p.name} className="w-full h-full object-cover" />
                      : <Package size={26} style={{ color:"var(--primary)", opacity:0.6 }} />}
                    {inOrder && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background:"var(--primary)" }}>
                        <Check size={11} color="white" />
                      </div>
                    )}
                  </div>
                  <div className="p-2.5 flex flex-col gap-1 flex-1">
                    <span style={{ fontWeight:600, fontSize:"12px", color:"var(--foreground)", lineHeight:1.3 }}
                      className="line-clamp-2">{p.name}</span>
                    <span style={{ fontSize:"10px", color:"var(--muted-foreground)" }}>{p.category}</span>
                    <span style={{ fontWeight:700, fontSize:"13px", color:"var(--primary)" }}>{fmt(p.purchasePrice)} MAD</span>
                    <span style={{ fontSize:"10px", color:isLow?"var(--destructive)":"var(--muted-foreground)" }}>
                      Stock : {p.stock} {ut}
                    </span>
                    {inOrder ? (
                      <div className="flex items-center gap-1 mt-1">
                        <input type="number" min={1} value={inOrder.qty}
                          onChange={e => setOrderItems(prev => prev.map(i => i.productId===p.id ? {...i,qty:parseInt(e.target.value)||1} : i))}
                          className="flex-1 text-center rounded-lg border py-1 outline-none"
                          style={{ background:"var(--input-background)", fontSize:"12px", fontWeight:600,
                            color:"var(--primary)", borderColor:"var(--primary)" }} />
                        <button onClick={() => setOrderItems(prev => prev.filter(i => i.productId!==p.id))}
                          className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0"
                          style={{ background:"var(--red-light)" }}>
                          <X size={12} style={{ color:"var(--destructive)" }} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => toggleProduct(p)}
                        className="mt-1 w-full py-1.5 rounded-lg active:scale-95"
                        style={{ background:"var(--blue-light)", color:"var(--primary)", fontWeight:600, fontSize:"11px" }}>
                        + Ajouter
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Recap + confirm */}
        {orderItems.length > 0 && (
          <div className="mt-4">
            <div className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-3">
              <p style={{ fontWeight:600, fontSize:"12px", color:"var(--muted-foreground)", marginBottom:8 }}>RÉCAPITULATIF</p>
              {orderItems.map(i => (
                <div key={i.productId} className="flex justify-between py-1" style={{ fontSize:"13px", color:"var(--foreground)" }}>
                  <span>{i.productName} × {i.qty}</span>
                  <span>{fmt(i.qty*i.unitCost)} MAD</span>
                </div>
              ))}
              <div className="border-t border-border mt-2 pt-2 flex justify-between" style={{ fontWeight:700, color:"var(--foreground)" }}>
                <span>Total</span><span>{fmt(total)} MAD</span>
              </div>
            </div>
            <button onClick={confirmOrder}
              className="w-full py-3 rounded-2xl transition-all active:scale-95"
              style={{ background:"var(--accent)", color:"white", fontWeight:700, fontSize:"15px" }}>
              Confirmer · {fmt(total)} MAD
            </button>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW: CART
  // ══════════════════════════════════════════════════════════════════════════
  if (view === "cart") {
    const total = orderItems.reduce((a, i) => a + i.qty * i.unitCost, 0);
    return (
      <div className="px-4 pt-4 pb-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setView("newOrder")}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background:"var(--muted)" }}>
              <X size={18} />
            </button>
            <div>
              <h1 style={{ color:"var(--foreground)" }}>Ma sélection</h1>
              <p style={{ fontSize:"12px", color:"var(--muted-foreground)" }}>{selectedSupplier?.name}</p>
            </div>
          </div>
          {orderItems.length > 0 && (
            <button onClick={() => setOrderItems([])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{ background:"var(--red-light)", color:"var(--destructive)", fontSize:"12px", fontWeight:600 }}>
              <Trash2 size={13} /> Vider
            </button>
          )}
        </div>

        {orderItems.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background:"var(--muted)" }}>
              <ShoppingCart size={28} style={{ color:"var(--muted-foreground)", opacity:0.5 }} />
            </div>
            <p style={{ fontSize:"14px", fontWeight:600, color:"var(--foreground)" }}>Sélection vide</p>
            <p style={{ fontSize:"13px", color:"var(--muted-foreground)", textAlign:"center" }}>
              Ajoutez des produits depuis la liste
            </p>
            <button onClick={() => setView("newOrder")}
              className="px-5 py-2.5 rounded-xl active:scale-95"
              style={{ background:"var(--primary)", color:"white", fontWeight:600, fontSize:"14px" }}>
              Parcourir les produits
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              {orderItems.map(item => {
                const product = products.find(p => p.id === item.productId);
                const lineTotal = item.qty * item.unitCost;
                return (
                  <div key={item.productId} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    {/* Product row */}
                    <div className="flex items-center gap-3 p-3.5">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                        style={{ background:"var(--blue-light)" }}>
                        {product?.imageUri
                          ? <img src={product.imageUri} alt={item.productName} className="w-full h-full object-cover" />
                          : <Package size={20} style={{ color:"var(--primary)" }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontWeight:600, fontSize:"14px", color:"var(--foreground)" }} className="truncate">
                          {item.productName}
                        </p>
                        <p style={{ fontSize:"12px", color:"var(--muted-foreground)" }}>
                          {fmt(item.unitCost)} MAD / unité
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p style={{ fontWeight:700, fontSize:"15px", color:"var(--primary)" }}>
                          {fmt(lineTotal)} MAD
                        </p>
                      </div>
                    </div>

                    {/* Qty controls */}
                    <div className="flex items-center justify-between px-3.5 pb-3">
                      <div className="flex items-center rounded-xl border border-border overflow-hidden"
                        style={{ background:"var(--muted)" }}>
                        <button
                          onClick={() => {
                            if (item.qty <= 1) setOrderItems(prev => prev.filter(i => i.productId !== item.productId));
                            else setOrderItems(prev => prev.map(i => i.productId === item.productId ? {...i, qty:i.qty-1} : i));
                          }}
                          className="w-9 h-9 flex items-center justify-center active:scale-95"
                          style={{ color:item.qty <= 1 ? "var(--destructive)" : "var(--foreground)" }}>
                          {item.qty <= 1 ? <Trash2 size={14} /> : <Minus size={14} />}
                        </button>
                        <input type="number" min={1} value={item.qty}
                          onChange={e => setOrderItems(prev =>
                            prev.map(i => i.productId === item.productId ? {...i, qty:parseInt(e.target.value)||1} : i)
                          )}
                          className="w-12 text-center outline-none border-x border-border"
                          style={{ background:"var(--input-background)", fontSize:"14px", fontWeight:700,
                            color:"var(--primary)", height:36 }} />
                        <button
                          onClick={() => setOrderItems(prev => prev.map(i => i.productId === item.productId ? {...i, qty:i.qty+1} : i))}
                          className="w-9 h-9 flex items-center justify-center active:scale-95"
                          style={{ color:"var(--foreground)" }}>
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        onClick={() => setOrderItems(prev => prev.filter(i => i.productId !== item.productId))}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl active:scale-95"
                        style={{ background:"var(--red-light)", color:"var(--destructive)", fontSize:"12px", fontWeight:500 }}>
                        <Trash2 size={13} /> Retirer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="bg-card rounded-2xl border border-border p-4 mb-4 space-y-2">
              <p style={{ fontWeight:600, fontSize:"12px", color:"var(--muted-foreground)" }}>RÉCAPITULATIF</p>
              {orderItems.map(i => (
                <div key={i.productId} className="flex justify-between" style={{ fontSize:"13px", color:"var(--foreground)" }}>
                  <span className="truncate flex-1 mr-2">{i.productName} × {i.qty}</span>
                  <span style={{ fontWeight:500, flexShrink:0 }}>{fmt(i.qty*i.unitCost)} MAD</span>
                </div>
              ))}
              <div className="flex justify-between pt-3 mt-1 border-t border-border"
                style={{ fontWeight:700, fontSize:"16px", color:"var(--foreground)" }}>
                <span>Total</span>
                <span style={{ color:"var(--accent)" }}>{fmt(total)} MAD</span>
              </div>
            </div>

            <button onClick={confirmOrder}
              className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ background:"var(--accent)", color:"white", fontWeight:700, fontSize:"15px" }}>
              <Check size={18} /> Confirmer la commande · {fmt(total)} MAD
            </button>

            <button onClick={() => setView("newOrder")}
              className="w-full py-2.5 mt-2 rounded-2xl border border-border"
              style={{ color:"var(--muted-foreground)", fontSize:"13px" }}>
              ← Continuer les achats
            </button>
          </>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW: ADD PRODUCT
  // ══════════════════════════════════════════════════════════════════════════
  if (view === "addProduct") {
    const totalUnits = (Number(packages)||0) * (Number(packSize)||0);
    return (
      <div className="px-4 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView("newOrder")}
            className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background:"var(--muted)" }}>
            <X size={18} />
          </button>
          <div>
            <h1 style={{ color:"var(--foreground)" }}>Nouveau produit</h1>
            <p style={{ fontSize:"12px", color:"var(--muted-foreground)" }}>Ajouté au catalogue et au bon</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Photo */}
          <div>
            <label style={{ fontSize:"13px", color:"var(--muted-foreground)", marginBottom:6, display:"block" }}>Photo</label>
            <div onClick={() => fileRef.current?.click()}
              className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer overflow-hidden"
              style={{ borderColor:"var(--border)", background:"var(--muted)", minHeight:editProd.imageUri?"auto":90 }}>
              {editProd.imageUri ? (
                <>
                  <img src={editProd.imageUri} alt="P" className="w-full object-cover" style={{ maxHeight:140, borderRadius:14 }} />
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-xl"
                    style={{ background:"rgba(0,0,0,0.45)" }}>
                    <Camera size={12} color="white" />
                    <span style={{ fontSize:"11px", color:"white" }}>Changer</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background:"var(--blue-light)" }}>
                    <Camera size={16} style={{ color:"var(--primary)" }} />
                  </div>
                  <span style={{ fontSize:"12px", color:"var(--muted-foreground)" }}>Ajouter une photo</span>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const r = new FileReader();
                  r.onload = ev => setEditProd(p => ({...p, imageUri:ev.target?.result as string}));
                  r.readAsDataURL(f);
                }} />
            </div>
          </div>

          {/* Nom */}
          <div>
            <label style={{ fontSize:"13px", color:"var(--muted-foreground)", marginBottom:4, display:"block" }}>
              Nom <span style={{ color:"var(--destructive)" }}>*</span>
            </label>
            <input type="text" value={editProd.name??""} autoFocus
              onChange={e => setEditProd(p => ({...p, name:e.target.value}))}
              className="w-full rounded-xl border px-3 py-2.5 outline-none focus:ring-2"
              style={{ background:"var(--input-background)", color:"var(--foreground)", fontSize:"14px",
                borderColor:prodErrors.name?"var(--destructive)":"var(--border)",
                "--tw-ring-color":"var(--primary)" } as React.CSSProperties} />
            {prodErrors.name && <FieldError msg={prodErrors.name} />}
          </div>

          {/* Code-barres */}
          <div>
            <label style={{ fontSize:"13px", color:"var(--muted-foreground)", marginBottom:4, display:"block" }}>Code-barres</label>
            <div className="flex gap-2">
              <input type="text" value={editProd.barcode??""}
                onChange={e => setEditProd(p => ({...p, barcode:e.target.value}))}
                className="flex-1 rounded-xl border px-3 py-2.5 outline-none focus:ring-2"
                style={{ background:"var(--input-background)", color:"var(--foreground)", fontSize:"14px",
                  fontFamily:"monospace",
                  borderColor:prodErrors.barcode?"var(--destructive)":"var(--border)",
                  "--tw-ring-color":"var(--primary)" } as React.CSSProperties} />
              <button type="button" onClick={() => setEditProd(p => ({...p, barcode:generateEAN13()}))}
                className="w-11 h-11 rounded-xl border border-border flex items-center justify-center active:scale-95 flex-shrink-0"
                style={{ background:"var(--blue-light)", color:"var(--primary)" }}>
                <Shuffle size={17} />
              </button>
            </div>
            {prodErrors.barcode && <FieldError msg={prodErrors.barcode} />}
          </div>

          {/* Fournisseur */}
          <div>
            <label style={{ fontSize:"13px", color:"var(--muted-foreground)", marginBottom:4, display:"block" }}>Fournisseur</label>
            <div ref={supDropRef} style={{ position:"relative" }}>
              <button type="button" onClick={() => setSupOpen(v => !v)}
                className="w-full rounded-xl border border-border px-3 py-2.5 outline-none flex items-center justify-between"
                style={{ background:"var(--input-background)", color:"var(--foreground)", fontSize:"14px", textAlign:"left" }}>
                <span style={{ color:editProd.supplier?"var(--foreground)":"var(--muted-foreground)" }}>
                  {editProd.supplier||"Sélectionner…"}
                </span>
                <ChevronDown size={15} style={{ color:"var(--muted-foreground)" }} />
              </button>
              {supOpen && (
                <div className="absolute left-0 right-0 z-50 rounded-xl border border-border shadow-lg mt-1 overflow-hidden"
                  style={{ background:"var(--card)", maxHeight:200 }}>
                  <div className="px-3 pt-2.5 pb-2 border-b border-border">
                    <input autoFocus type="text" placeholder="Rechercher…" value={supSearch}
                      onChange={e => setSupSearch(e.target.value)}
                      className="w-full rounded-lg border border-border px-2.5 py-1.5 outline-none"
                      style={{ background:"var(--input-background)", color:"var(--foreground)", fontSize:"13px" }} />
                  </div>
                  <div style={{ overflowY:"auto", maxHeight:150 }}>
                    <button type="button"
                      onClick={() => { setEditProd(p => ({...p,supplier:""})); setSupOpen(false); }}
                      className="w-full px-3 py-2.5 text-left flex items-center gap-2"
                      style={{ fontSize:"13px", color:"var(--muted-foreground)", borderBottom:"1px solid var(--border)" }}>
                      <X size={12} /> Aucun
                    </button>
                    {filteredSupForProd.map(s => (
                      <button key={s} type="button"
                        onClick={() => { setEditProd(p => ({...p,supplier:s})); setSupOpen(false); setSupSearch(""); }}
                        className="w-full px-3 py-2.5 text-left flex items-center justify-between"
                        style={{ fontSize:"13px", color:"var(--foreground)" }}>
                        {s}{editProd.supplier===s && <Check size={13} style={{ color:"var(--primary)" }} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Catégorie */}
          <div>
            <label style={{ fontSize:"13px", color:"var(--muted-foreground)", marginBottom:4, display:"block" }}>Catégorie</label>
            <div className="flex gap-2 items-center">
              <select value={editProd.category||categories.find(c=>c!=="Tous")}
                onChange={e => setEditProd(p => ({...p, category:e.target.value}))}
                className="flex-1 rounded-xl border border-border px-3 py-2.5 outline-none"
                style={{ background:"var(--input-background)", color:"var(--foreground)", fontSize:"14px" }}>
                {categories.filter(c=>c!=="Tous").map(c => <option key={c}>{c}</option>)}
              </select>
              <button type="button" onClick={() => setShowAddCat(true)}
                className="w-10 h-10 rounded-xl border border-border flex items-center justify-center flex-shrink-0"
                style={{ background:"var(--blue-light)", color:"var(--primary)" }}>
                <Plus size={18} />
              </button>
            </div>
            {showAddCat && (
              <div className="mt-2 rounded-xl border border-border p-3 space-y-2" style={{ background:"var(--muted)" }}>
                <div className="flex gap-2">
                  <input autoFocus type="text" value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    onKeyDown={e => { if(e.key==="Enter") addCategory(); if(e.key==="Escape") setShowAddCat(false); }}
                    placeholder="Nouvelle catégorie"
                    className="flex-1 rounded-lg border border-border px-2.5 py-2 outline-none"
                    style={{ background:"var(--input-background)", color:"var(--foreground)", fontSize:"13px" }} />
                  <button type="button" onClick={addCategory} className="px-3 py-2 rounded-lg"
                    style={{ background:"var(--primary)", color:"white", fontSize:"13px", fontWeight:600 }}>OK</button>
                  <button type="button" onClick={() => { setShowAddCat(false); setNewCatName(""); }}
                    className="w-9 flex items-center justify-center rounded-lg border border-border"
                    style={{ background:"var(--card)" }}>
                    <X size={14} style={{ color:"var(--muted-foreground)" }} />
                  </button>
                </div>
                {categories.includes(newCatName.trim()) && newCatName.trim()!=="" && <FieldError msg="Cette catégorie existe déjà." />}
              </div>
            )}
          </div>

          {/* Prix */}
          <div className="grid grid-cols-2 gap-3">
            {([
              { label:"Prix de vente (MAD)", key:"sellingPrice"  as const, err:prodErrors.sellingPrice  },
              { label:"Prix d'achat (MAD)",  key:"purchasePrice" as const, err:prodErrors.purchasePrice },
            ]).map(({label,key,err}) => (
              <div key={key}>
                <label style={{ fontSize:"13px", color:"var(--muted-foreground)", marginBottom:4, display:"block" }}>
                  {label} <span style={{ color:"var(--destructive)" }}>*</span>
                </label>
                <input type="number" min={0} value={(editProd as Record<string,number>)[key]??""}
                  onChange={e => setEditProd(p => ({...p,[key]:parseFloat(e.target.value)||0}))}
                  className="w-full rounded-xl border px-3 py-2.5 outline-none focus:ring-2"
                  style={{ background:"var(--input-background)", color:"var(--foreground)", fontSize:"14px",
                    borderColor:err?"var(--destructive)":"var(--border)",
                    "--tw-ring-color":"var(--primary)" } as React.CSSProperties} />
                {err && <FieldError msg={err} />}
              </div>
            ))}
          </div>

          {/* Min stock */}
          <div>
            <label style={{ fontSize:"13px", color:"var(--muted-foreground)", marginBottom:4, display:"block" }}>Stock minimum</label>
            <input type="number" min={0} value={editProd.minStock??""}
              onChange={e => setEditProd(p => ({...p, minStock:parseFloat(e.target.value)||0}))}
              className="w-full rounded-xl border border-border px-3 py-2.5 outline-none"
              style={{ background:"var(--input-background)", color:"var(--foreground)", fontSize:"14px" }} />
          </div>

          {/* Stock & conditionnement */}
          <div className="rounded-2xl border border-border p-4 space-y-4" style={{ background:"var(--muted)" }}>
            <p style={{ fontWeight:600, fontSize:"14px", color:"var(--foreground)" }}>Stock & conditionnement</p>
            <div className="flex items-end gap-3">
              {([
                { label:"Nombre de colis",  val:packages, set:setPackages, err:prodErrors.packages },
                { label:"Unités par colis", val:packSize,  set:setPackSize,  err:prodErrors.packSize  },
              ]).map(({label,val,set,err},idx) => (
                <div className="flex-1" key={idx}>
                  <label style={{ fontSize:"12px", color:"var(--muted-foreground)", marginBottom:4, display:"block" }}>
                    {label} <span style={{ color:"var(--destructive)" }}>*</span>
                  </label>
                  <input type="number" min={0} value={val===""?"":val}
                    onChange={e => (set as (v:number|"")=>void)(e.target.value===""?"":parseFloat(e.target.value)||0)}
                    placeholder="0"
                    className="w-full rounded-xl border px-3 py-2.5 outline-none focus:ring-2"
                    style={{ background:"var(--input-background)", color:"var(--foreground)", fontSize:"14px",
                      borderColor:err?"var(--destructive)":"var(--border)",
                      "--tw-ring-color":"var(--primary)" } as React.CSSProperties} />
                  {err && <FieldError msg={err} />}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              {([
                { value:"pièce"  as UnitType, title:"Pièce",  desc:"Stock = unités totales",  Icon:Package },
                { value:"carton" as UnitType, title:"Carton", desc:"Stock = nombre de colis", Icon:Box     },
              ]).map(({value,title,desc,Icon}) => {
                const active = unitType===value;
                return (
                  <button key={value} onClick={() => setUnitType(value)}
                    className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-left"
                    style={{ background:active?"var(--blue-light)":"var(--input-background)",
                      borderColor:active?"var(--primary)":"var(--border)" }}>
                    <Icon size={15} style={{ color:active?"var(--primary)":"var(--muted-foreground)", flexShrink:0 }} />
                    <div>
                      <div style={{ fontSize:"12px", fontWeight:600, color:active?"var(--primary)":"var(--foreground)" }}>{title}</div>
                      <div style={{ fontSize:"10px", color:"var(--muted-foreground)", lineHeight:1.3 }}>{desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            {(Number(packages)>0||Number(packSize)>0) && (
              <div className="rounded-xl px-4 py-3" style={{ background:"var(--blue-light)", border:"1px solid var(--primary)" }}>
                <div className="flex justify-between items-center">
                  <span style={{ fontSize:"12px", color:"var(--primary)" }}>
                    {unitType==="pièce" ? "Unités totales" : "Colis en stock"}
                  </span>
                  <span style={{ fontSize:"18px", fontWeight:800, color:"var(--primary)" }}>
                    {unitType==="pièce" ? totalUnits : Number(packages)}
                    <span style={{ fontSize:"12px", fontWeight:400, marginLeft:4 }}>
                      {unitType==="pièce" ? "pièces" : "cartons"}
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Expiry */}
          <div className="rounded-2xl border border-border p-4" style={{ background:"var(--muted)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calendar size={16} style={{ color:hasExpiry?"var(--primary)":"var(--muted-foreground)" }} />
                <div>
                  <p style={{ fontSize:"14px", fontWeight:600, color:"var(--foreground)", marginBottom:1 }}>Date d'expiration</p>
                  <p style={{ fontSize:"11px", color:"var(--muted-foreground)" }}>Produit soumis à une date de péremption</p>
                </div>
              </div>
              <button type="button" onClick={() => setHasExpiry(v => !v)}
                style={{ width:44, height:24, position:"relative", flexShrink:0 }}>
                <div className="absolute inset-0 rounded-full transition-colors duration-200"
                  style={{ background:hasExpiry?"var(--primary)":"var(--border)" }} />
                <div className="absolute top-1 rounded-full transition-all duration-200"
                  style={{ width:16, height:16, background:"white", left:hasExpiry?24:4,
                    boxShadow:"0 1px 3px rgba(0,0,0,0.25)" }} />
              </button>
            </div>
            {hasExpiry && (
              <div className="mt-3 pt-3 border-t border-border">
                <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-xl border border-border px-3 py-2.5 outline-none focus:ring-2"
                  style={{ background:"var(--input-background)", color:"var(--foreground)", fontSize:"14px",
                    "--tw-ring-color":"var(--primary)" } as React.CSSProperties} />
              </div>
            )}
          </div>

          <button onClick={saveProduct} className="w-full py-3 rounded-2xl transition-all active:scale-95"
            style={{ background:"var(--primary)", color:"var(--primary-foreground)", fontWeight:600, fontSize:"15px" }}>
            Ajouter au catalogue et au bon
          </button>
        </div>

        {/* Margin warning */}
        {showMarginWarn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6"
            style={{ background:"rgba(0,0,0,0.5)" }}
            onClick={e => { if(e.target===e.currentTarget) setShowMarginWarn(false); }}>
            <div className="w-full rounded-3xl p-5 space-y-4" style={{ background:"var(--card)", maxWidth:360 }}>
              <div className="flex flex-col items-center gap-3 pt-1">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background:"var(--red-light)" }}>
                  <AlertTriangle size={28} style={{ color:"var(--destructive)" }} />
                </div>
                <h2 style={{ fontSize:"16px", fontWeight:700, color:"var(--foreground)", textAlign:"center" }}>
                  Prix d'achat ≥ Prix de vente
                </h2>
              </div>
              <div className="rounded-2xl p-3 space-y-1.5" style={{ background:"var(--red-light)" }}>
                <div className="flex justify-between">
                  <span style={{ fontSize:"13px", color:"var(--muted-foreground)" }}>Prix de vente</span>
                  <span style={{ fontSize:"14px", fontWeight:700, color:"var(--foreground)" }}>{fmt(editProd.sellingPrice??0)} MAD</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ fontSize:"13px", color:"var(--muted-foreground)" }}>Prix d'achat</span>
                  <span style={{ fontSize:"14px", fontWeight:700, color:"var(--destructive)" }}>{fmt(editProd.purchasePrice??0)} MAD</span>
                </div>
              </div>
              <p style={{ fontSize:"13px", color:"var(--muted-foreground)", textAlign:"center" }}>
                Voulez-vous continuer malgré la perte ?
              </p>
              <div className="flex gap-2">
                <button onClick={() => setShowMarginWarn(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border"
                  style={{ background:"var(--muted)", color:"var(--foreground)", fontWeight:600, fontSize:"14px" }}>
                  Corriger
                </button>
                <button onClick={commitSaveProduct}
                  className="flex-1 py-2.5 rounded-xl"
                  style={{ background:"var(--destructive)", color:"white", fontWeight:600, fontSize:"14px" }}>
                  Continuer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW: ORDER DETAIL
  // ══════════════════════════════════════════════════════════════════════════
  if (view === "detail" && selectedOrder) return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => { setView("list"); setSelectedOrder(null); }}
          className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background:"var(--muted)" }}>
          <X size={18} />
        </button>
        <h1 style={{ color:"var(--foreground)" }}>Bon #{selectedOrder.id}</h1>
      </div>
      <div className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <div style={{ fontWeight:600, fontSize:"15px", color:"var(--foreground)" }}>{selectedOrder.supplierName}</div>
            <div style={{ fontSize:"12px", color:"var(--muted-foreground)" }}>{selectedOrder.date}</div>
          </div>
          <StatusBadge status={selectedOrder.status} />
        </div>
        {selectedOrder.items.map(i => (
          <div key={i.productId} className="flex justify-between py-2 border-b border-border last:border-0"
            style={{ fontSize:"13px", color:"var(--foreground)" }}>
            <div>
              <div>{i.productName}</div>
              <div style={{ color:"var(--muted-foreground)", fontSize:"11px" }}>Qté : {i.qty} · {i.unitCost.toFixed(2)} MAD/u</div>
            </div>
            <span style={{ fontWeight:600 }}>{(i.qty*i.unitCost).toFixed(2)} MAD</span>
          </div>
        ))}
        <div className="flex justify-between pt-3 border-t border-border mt-1"
          style={{ fontWeight:700, fontSize:"16px", color:"var(--foreground)" }}>
          <span>Total</span><span>{selectedOrder.total.toFixed(2)} MAD</span>
        </div>
      </div>
      {selectedOrder.status==="pending" && (
        <button onClick={() => receiveOrder(selectedOrder.id)}
          className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 active:scale-95"
          style={{ background:"var(--accent)", color:"white", fontWeight:700, fontSize:"15px" }}>
          <Check size={18} /> Marquer comme reçu
        </button>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW: LIST
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex justify-between items-center mb-4">
        <h1 style={{ color:"var(--foreground)" }}>Achats</h1>
        <button onClick={() => { setSupplierSearch(""); setView("suppliers"); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl"
          style={{ background:"var(--primary)", color:"white", fontWeight:600, fontSize:"13px" }}>
          <Plus size={16} /> Nouveau bon
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label:"Total bons", value:orders.length, color:"var(--primary)" },
          { label:"En attente", value:orders.filter(o=>o.status==="pending").length, color:"#f57c00" },
          { label:"Reçus",      value:orders.filter(o=>o.status==="received").length, color:"var(--accent)" },
        ].map(({label,value,color}) => (
          <div key={label} className="bg-card rounded-2xl p-3 border border-border shadow-sm text-center">
            <div style={{ fontWeight:700, fontSize:"20px", color }}>{value}</div>
            <div style={{ fontSize:"11px", color:"var(--muted-foreground)" }}>{label}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize:"12px", color:"var(--muted-foreground)", marginBottom:10 }}>Historique des achats</p>
      <div className="space-y-2">
        {orders.map(o => (
          <button key={o.id} onClick={() => { setSelectedOrder(o); setView("detail"); }}
            className="w-full bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center gap-3 text-left active:scale-98 transition-transform">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background:o.status==="received"?"var(--green-light)":"var(--orange-light)" }}>
              <Package size={18} style={{ color:o.status==="received"?"var(--accent)":"#f57c00" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontWeight:600, fontSize:"14px", color:"var(--foreground)" }}>{o.supplierName}</div>
              <div style={{ fontSize:"12px", color:"var(--muted-foreground)" }}>{o.date} · {o.items.length} article(s)</div>
            </div>
            <div className="text-right">
              <div style={{ fontWeight:700, fontSize:"14px", color:"var(--foreground)" }}>{o.total.toFixed(2)} MAD</div>
              <StatusBadge status={o.status} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
