  import { useState, useEffect, useRef } from "react";
  import {
    Search, Plus, Filter, X, ChevronRight, AlertTriangle,
    Edit2, Barcode, Package, Camera, Box, LayoutGrid, LayoutList,Shuffle,
    Calendar, ChevronDown, Check,
  } from "lucide-react";
  import { Product } from "./types";
  import { PRODUCTS, CATEGORIES } from "./mockData";
  import { useFournisseurStore } from "./fournisseur";
  import { useProductsStore } from "./productsStore";
  
  // ─── Types ────────────────────────────────────────────────────────────────────
  type UnitType = "pièce" | "carton";
  type PricingUnit = "package" | "unit";
  
  type ExtendedProduct = Product & {
    imageUri?       : string;
    packages?       : number;
    packSize?       : number;
    unitType?       : UnitType;
    pricingUnit?    : PricingUnit;
    hasExpiry?      : boolean;
    expiryDate?     : string;
  };
  
  // ─── Helpers ──────────────────────────────────────────────────────────────────
  function fmt(n: number) {
    return n.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  
  // Inline error message component
  function FieldError({ msg }: { msg: string }) {
    return (
      <div className="flex items-center gap-1.5 mt-1.5 px-1">
        <AlertTriangle size={12} style={{ color: "var(--destructive)", flexShrink: 0 }} />
        <span style={{ fontSize: "11px", color: "var(--destructive)", fontWeight: 500 }}>{msg}</span>
      </div>
    );
  }
  
  // ══════════════════════════════════════════════════════════════════════════════
  // PRODUCTS COMPONENT
  // ══════════════════════════════════════════════════════════════════════════════
  export function Products() {
    // ── Live supplier list from fournisseur.tsx ────────────────────────────
    const { suppliers } = useFournisseurStore();
    const { products, categories, setProducts, setCategories } = useProductsStore(); // ← أضف هذا

    const [search,       setSearch      ] = useState("");
    const [category,     setCategory    ] = useState("Tous");
    const [lowStockOnly, setLowStockOnly ] = useState(false);
    const [selected,     setSelected    ] = useState<ExtendedProduct | null>(null);
    const [showForm,     setShowForm    ] = useState(false);
    const [showMarginWarn, setShowMarginWarn] = useState(false);
    const [editProduct,  setEditProduct ] = useState<Partial<ExtendedProduct>>({});
    const [viewMode,     setViewMode    ] = useState<"list" | "grid">("list");
  
    // Packaging
    const [packages,  setPackages ] = useState<number | "">(0);
    const [packSize,  setPackSize ] = useState<number | "">(0);
    const [unitType,  setUnitType ] = useState<UnitType>("pièce");
  
    // Expiry
    const [hasExpiry,   setHasExpiry  ] = useState(false);
    const [expiryDate,  setExpiryDate ] = useState("");
  
    // Supplier dropdown
    const [supplierOpen,    setSupplierOpen   ] = useState(false);
    const [supplierSearch,  setSupplierSearch ] = useState("");
    const supplierRef = useRef<HTMLDivElement>(null);
  
    // Add-category modal
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName ] = useState("");
  
    // Validation errors
    const [errors, setErrors] = useState<Record<string, string>>({});
  
    // Form submission attempted
    const [submitted, setSubmitted] = useState(false);
  
    const fileInputRef = useRef<HTMLInputElement>(null);
  
    // ── computed stock ────────────────────────────────────────────────────────
    const computedStock = unitType === "pièce"
      ? (Number(packages) || 0) * (Number(packSize) || 0)
      : (Number(packages) || 0);
  
    useEffect(() => {
      setEditProduct(prev => ({
        ...prev,
        stock   : computedStock,
        packages: Number(packages) || 0,
        packSize: Number(packSize) || 0,
        unitType,
      }));
    }, [packages, packSize, unitType]);
  
    // Close supplier dropdown on outside click
    useEffect(() => {
      function handleClick(e: MouseEvent) {
        if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) {
          setSupplierOpen(false);
        }
      }
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }, []);
  
    // ── real-time validation ──────────────────────────────────────────────────
    useEffect(() => {
      if (!submitted) return;
      validate();
    }, [editProduct, packages, packSize, submitted]);
  
    function validate(): boolean {
      const errs: Record<string, string> = {};
      const trimName    = (editProduct.name    ?? "").trim();
      const trimBarcode = (editProduct.barcode ?? "").trim();
  
      if (!trimName) {
        errs.name = "Le nom du produit est obligatoire.";
      } else {
        const duplicate = products.find(
          p => p.id !== editProduct.id &&
               p.name.trim().toLowerCase() === trimName.toLowerCase()
        );
        if (duplicate) errs.name = "Ce nom de produit est déjà enregistré.";
      }
  
      if (trimBarcode) {
        const dup = products.find(
          p => p.id !== editProduct.id && p.barcode.trim() === trimBarcode
        );
        if (dup) errs.barcode = "Ce code-barres est déjà enregistré.";
      }
  
      if (!editProduct.sellingPrice || editProduct.sellingPrice <= 0)
        errs.sellingPrice = "Le prix de vente est obligatoire.";
  
      if (!editProduct.purchasePrice || editProduct.purchasePrice <= 0)
        errs.purchasePrice = "Le prix d'achat est obligatoire.";
  
      if (!packages || Number(packages) <= 0)
        errs.packages = "Le nombre de colis est obligatoire.";
  
      if (!packSize || Number(packSize) <= 0)
        errs.packSize = "Les unités par colis sont obligatoires.";
  
      setErrors(errs);
      return Object.keys(errs).length === 0;
    }
  
    // ── filter ────────────────────────────────────────────────────────────────
    const filtered = products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.includes(search);
      const matchCat = category === "Tous" || p.category === category;
      const matchLow = !lowStockOnly || p.stock < p.minStock;
      return matchSearch && matchCat && matchLow;
    });
  
    // ── open form ─────────────────────────────────────────────────────────────
    function openEdit(p?: ExtendedProduct) {
      setEditProduct(p ? { ...p } : {
        name: "", category: categories.find(c => c !== "Tous") ?? "Boissons",
        barcode: "", sellingPrice: 0, purchasePrice: 0,
        stock: 0, minStock: 10, supplier: "", unit: "pièce",
        imageUri: undefined, packages: 0, packSize: 0,
        unitType: "pièce", pricingUnit: "unit",
        hasExpiry: false, expiryDate: "",
      });
      const ut = (p?.unitType ?? "pièce") as UnitType;
      setUnitType(ut);
      setPackages(p?.packages ?? 0);
      setPackSize(p?.packSize  ?? 0);
      setHasExpiry(p?.hasExpiry ?? false);
      setExpiryDate(p?.expiryDate ?? "");
      setErrors({});
      setSubmitted(false);
      setSupplierOpen(false);
      setSupplierSearch("");
      setShowForm(true);
      setSelected(null);
    }
  
    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev =>
        setEditProduct(prev => ({ ...prev, imageUri: ev.target?.result as string }));
      reader.readAsDataURL(file);
    }
    function generateBarcode() {
    // EAN-13: 12 أرقام عشوائية + رقم تحقق
    const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
    const check  = (10 - (digits.reduce((sum, d, i) => sum + d * (i % 2 === 0 ? 1 : 3), 0) % 10)) % 10;
    const code   = [...digits, check].join("");
    setEditProduct(prev => ({ ...prev, barcode: code }));
  }
  
    function commitSave() {
      const finalProduct: ExtendedProduct = {
        ...(editProduct as ExtendedProduct),
        id      : editProduct.id ?? `p${Date.now()}`,
        unitType,
        packages: Number(packages) || 0,
        packSize: Number(packSize) || 0,
        stock   : computedStock,
        unit    : unitType,
        hasExpiry,
        expiryDate: hasExpiry ? expiryDate : "",
      };
      if (editProduct.id) {
        setProducts(prev => prev.map(p => p.id === editProduct.id ? finalProduct : p));
      } else {
        setProducts(prev => [...prev, finalProduct]);
      }
      setShowForm(false);
      setShowMarginWarn(false);
    }
  
    function saveProduct() {
      setSubmitted(true);
      if (!validate()) return;
      // Show warning if purchase price exceeds selling price
      const pa = editProduct.purchasePrice ?? 0;
      const pv = editProduct.sellingPrice  ?? 0;
      if (pa >= pv) {
        setShowMarginWarn(true);
        return;
      }
      commitSave();
    }
  
    function addCategory() {
      const name = newCategoryName.trim();
      if (!name || categories.includes(name)) return;
      setCategories(prev => [...prev, name]);
      setEditProduct(prev => ({ ...prev, category: name }));
      setNewCategoryName("");
      setShowAddCategory(false);
    }
  
    // Filtered suppliers for dropdown
    // Derives supplier names live from fournisseur store
    const filteredSuppliers = suppliers
      .map(f => f.name)
      .filter(name => name.toLowerCase().includes(supplierSearch.toLowerCase()));
  
    // ══════════════════════════════════════════════════════════════════════════
    // FORM VIEW
    // ══════════════════════════════════════════════════════════════════════════
    if (showForm) {
      const totalUnits = (Number(packages) || 0) * (Number(packSize) || 0);
  
      return (
        <div className="px-4 pt-4 pb-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setShowForm(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full"
              style={{ background: "var(--muted)" }}>
              <X size={18} />
            </button>
            <h1 style={{ color: "var(--foreground)" }}>
              {editProduct.id ? "Modifier le produit" : "Nouveau produit"}
            </h1>
          </div>
  
          <div className="space-y-4">
  
            {/* ── Photo ── */}
            <div>
              <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 6, display: "block" }}>
                Photo du produit
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer overflow-hidden"
                style={{ borderColor: "var(--border)", background: "var(--muted)",
                  minHeight: editProduct.imageUri ? "auto" : 100 }}
              >
                {editProduct.imageUri ? (
                  <>
                    <img src={editProduct.imageUri} alt="Product"
                      className="w-full object-cover" style={{ maxHeight: 160, borderRadius: 14 }} />
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-xl"
                      style={{ background: "rgba(0,0,0,0.45)" }}>
                      <Camera size={12} color="white" />
                      <span style={{ fontSize: "11px", color: "white" }}>Changer</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-5">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: "var(--blue-light)" }}>
                      <Camera size={18} style={{ color: "var(--primary)" }} />
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                      Appuyez pour ajouter une photo
                    </span>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*"
                  className="hidden" onChange={handleImageChange} />
              </div>
            </div>
  
            {/* ── Nom du produit ── */}
            <div>
              <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 4, display: "block" }}>
                Nom du produit <span style={{ color: "var(--destructive)" }}>*</span>
              </label>
              <input type="text"
                value={editProduct.name ?? ""}
                onChange={e => setEditProduct(prev => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-xl border px-3 py-2.5 outline-none focus:ring-2"
                style={{
                  background  : "var(--input-background)",
                  color       : "var(--foreground)",
                  fontSize    : "14px",
                  borderColor : errors.name ? "var(--destructive)" : "var(--border)",
                  "--tw-ring-color": "var(--primary)",
                } as React.CSSProperties}
              />
              {errors.name && <FieldError msg={errors.name} />}
            </div>
            {/* ── Code-barres ── */}
  <div>
    <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 4, display: "block" }}>
      Code-barres
    </label>
    <div className="flex gap-2">
      <input type="text"
        value={editProduct.barcode ?? ""}
        onChange={e => setEditProduct(prev => ({ ...prev, barcode: e.target.value }))}
        className="flex-1 rounded-xl border px-3 py-2.5 outline-none focus:ring-2"
        style={{
          background  : "var(--input-background)",
          color       : "var(--foreground)",
          fontSize    : "14px",
          fontFamily  : "monospace",
          borderColor : errors.barcode ? "var(--destructive)" : "var(--border)",
          "--tw-ring-color": "var(--primary)",
        } as React.CSSProperties}
      />
      <button
        type="button"
        onClick={generateBarcode}
        className="flex-shrink-0 w-11 h-11 rounded-xl border border-border flex items-center justify-center transition-all active:scale-95"
        style={{ background: "var(--blue-light)", color: "var(--primary)" }}
        title="Générer un code-barres EAN-13"
      >
        <Shuffle size={17} />
      </button>
    </div>
    {errors.barcode && <FieldError msg={errors.barcode} />}
  </div>
  
  
  
            {/* ── Fournisseur (dropdown) ── */}
            <div>
              <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 4, display: "block" }}>
                Fournisseur
              </label>
              <div ref={supplierRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setSupplierOpen(v => !v)}
                  className="w-full rounded-xl border border-border px-3 py-2.5 outline-none flex items-center justify-between"
                  style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "14px", textAlign: "left" }}
                >
                  <span style={{ color: editProduct.supplier ? "var(--foreground)" : "var(--muted-foreground)" }}>
                    {editProduct.supplier || "Sélectionner un fournisseur…"}
                  </span>
                  <ChevronDown size={15} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                </button>
  
                {supplierOpen && (
                  <div className="absolute left-0 right-0 z-50 rounded-xl border border-border shadow-lg mt-1 overflow-hidden"
                    style={{ background: "var(--card)", maxHeight: 220 }}>
                    {/* Search inside dropdown */}
                    <div className="px-3 pt-2.5 pb-2 border-b border-border">
                      <input
                        autoFocus
                        type="text"
                        placeholder="Rechercher…"
                        value={supplierSearch}
                        onChange={e => setSupplierSearch(e.target.value)}
                        className="w-full rounded-lg border border-border px-2.5 py-1.5 outline-none"
                        style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "13px" }}
                      />
                    </div>
                    <div style={{ overflowY: "auto", maxHeight: 160 }}>
                      {/* Clear option */}
                      <button
                        type="button"
                        onClick={() => { setEditProduct(prev => ({ ...prev, supplier: "" })); setSupplierOpen(false); }}
                        className="w-full px-3 py-2.5 text-left flex items-center gap-2"
                        style={{ fontSize: "13px", color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }}>
                        <X size={12} />
                        Aucun fournisseur
                      </button>
                      {filteredSuppliers.length === 0 ? (
                        <div className="px-3 py-3 text-center" style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
                          Aucun fournisseur trouvé
                        </div>
                      ) : filteredSuppliers.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => { setEditProduct(prev => ({ ...prev, supplier: s })); setSupplierOpen(false); setSupplierSearch(""); }}
                          className="w-full px-3 py-2.5 text-left flex items-center justify-between hover:bg-muted transition-colors"
                          style={{ fontSize: "13px", color: "var(--foreground)" }}>
                          {s}
                          {editProduct.supplier === s && <Check size={13} style={{ color: "var(--primary)" }} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
  
            {/* ── Catégorie ── */}
            <div>
              <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 4, display: "block" }}>
                Catégorie
              </label>
              <div className="flex gap-2 items-center">
                <select
                  value={editProduct.category || categories.find(c => c !== "Tous")}
                  onChange={e => setEditProduct(prev => ({ ...prev, category: e.target.value }))}
                  className="flex-1 rounded-xl border border-border px-3 py-2.5 outline-none"
                  style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "14px" }}
                >
                  {categories.filter(c => c !== "Tous").map(c => <option key={c}>{c}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAddCategory(true)}
                  className="flex-shrink-0 w-10 h-10 rounded-xl border border-border flex items-center justify-center transition-colors"
                  style={{ background: "var(--blue-light)", color: "var(--primary)" }}
                  title="Ajouter une catégorie"
                >
                  <Plus size={18} />
                </button>
              </div>
  
              {/* Add-category inline panel */}
              {showAddCategory && (
                <div className="mt-2 rounded-xl border border-border p-3 space-y-2"
                  style={{ background: "var(--muted)" }}>
                  <label style={{ fontSize: "12px", color: "var(--muted-foreground)", display: "block" }}>
                    Nom de la nouvelle catégorie
                  </label>
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addCategory(); if (e.key === "Escape") setShowAddCategory(false); }}
                      placeholder="Ex: Épicerie fine"
                      className="flex-1 rounded-lg border border-border px-2.5 py-2 outline-none"
                      style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "13px" }}
                    />
                    <button type="button" onClick={addCategory}
                      className="px-3 py-2 rounded-lg"
                      style={{ background: "var(--primary)", color: "white", fontSize: "13px", fontWeight: 600 }}>
                      Ajouter
                    </button>
                    <button type="button" onClick={() => { setShowAddCategory(false); setNewCategoryName(""); }}
                      className="w-9 flex items-center justify-center rounded-lg border border-border"
                      style={{ background: "var(--card)" }}>
                      <X size={14} style={{ color: "var(--muted-foreground)" }} />
                    </button>
                  </div>
                  {categories.includes(newCategoryName.trim()) && newCategoryName.trim() !== "" && (
                    <FieldError msg="Cette catégorie existe déjà." />
                  )}
                </div>
              )}
            </div>
  
            {/* ── Pricing ── */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 4, display: "block" }}>
                  Prix de vente (MAD) <span style={{ color: "var(--destructive)" }}>*</span>
                </label>
                <input type="number" min={0}
                  value={editProduct.sellingPrice ?? ""}
                  onChange={e => setEditProduct(prev => ({ ...prev, sellingPrice: parseFloat(e.target.value) || 0 }))}
                  className="w-full rounded-xl border px-3 py-2.5 outline-none focus:ring-2"
                  style={{
                    background  : "var(--input-background)",
                    color       : "var(--foreground)",
                    fontSize    : "14px",
                    borderColor : errors.sellingPrice ? "var(--destructive)" : "var(--border)",
                    "--tw-ring-color": "var(--primary)",
                  } as React.CSSProperties}
                />
                {errors.sellingPrice && <FieldError msg={errors.sellingPrice} />}
              </div>
              <div>
                <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 4, display: "block" }}>
                  Prix d'achat (MAD) <span style={{ color: "var(--destructive)" }}>*</span>
                </label>
                <input type="number" min={0}
                  value={editProduct.purchasePrice ?? ""}
                  onChange={e => setEditProduct(prev => ({ ...prev, purchasePrice: parseFloat(e.target.value) || 0 }))}
                  className="w-full rounded-xl border px-3 py-2.5 outline-none focus:ring-2"
                  style={{
                    background  : "var(--input-background)",
                    color       : "var(--foreground)",
                    fontSize    : "14px",
                    borderColor : errors.purchasePrice ? "var(--destructive)" : "var(--border)",
                    "--tw-ring-color": "var(--primary)",
                  } as React.CSSProperties}
                />
                {errors.purchasePrice && <FieldError msg={errors.purchasePrice} />}
              </div>
            </div>
  
            {/* ── Min stock ── */}
            <div>
              <label style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 4, display: "block" }}>
                Stock minimum (seuil de réapprovisionnement)
              </label>
              <input type="number" min={0}
                value={editProduct.minStock ?? ""}
                onChange={e => setEditProduct(prev => ({ ...prev, minStock: parseFloat(e.target.value) || 0 }))}
                className="w-full rounded-xl border border-border px-3 py-2.5 outline-none focus:ring-2"
                style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "14px",
                  "--tw-ring-color": "var(--primary)" } as React.CSSProperties}
              />
            </div>
  
            {/* ══ STOCK SECTION ═══════════════════════════════════════════════ */}
            <div className="rounded-2xl border border-border p-4 space-y-4"
              style={{ background: "var(--muted)" }}>
  
              <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }}>
                Stock &amp; conditionnement
              </p>
  
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: 4, display: "block" }}>
                    Nombre de colis <span style={{ color: "var(--destructive)" }}>*</span>
                  </label>
                  <input type="number" min={0}
                    value={packages === "" ? "" : packages}
                    onChange={e => setPackages(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full rounded-xl border px-3 py-2.5 outline-none focus:ring-2"
                    style={{
                      background  : "var(--input-background)",
                      color       : "var(--foreground)",
                      fontSize    : "14px",
                      borderColor : errors.packages ? "var(--destructive)" : "var(--border)",
                      "--tw-ring-color": "var(--primary)",
                    } as React.CSSProperties}
                  />
                  {errors.packages && <FieldError msg={errors.packages} />}
                </div>
  
                <div className="pb-2.5 flex-shrink-0">
                  <span style={{ fontSize: "20px", color: "var(--muted-foreground)", fontWeight: 300 }}>×</span>
                </div>
  
                <div className="flex-1">
                  <label style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: 4, display: "block" }}>
                    Unités par colis <span style={{ color: "var(--destructive)" }}>*</span>
                  </label>
                  <input type="number" min={0}
                    value={packSize === "" ? "" : packSize}
                    onChange={e => setPackSize(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full rounded-xl border px-3 py-2.5 outline-none focus:ring-2"
                    style={{
                      background  : "var(--input-background)",
                      color       : "var(--foreground)",
                      fontSize    : "14px",
                      borderColor : errors.packSize ? "var(--destructive)" : "var(--border)",
                      "--tw-ring-color": "var(--primary)",
                    } as React.CSSProperties}
                  />
                  {errors.packSize && <FieldError msg={errors.packSize} />}
                </div>
              </div>
  
              {/* ── Unit type toggle ── */}
              <div>
                <label style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: 6, display: "block" }}>
                  Unité de stockage
                </label>
                <div className="flex gap-2">
                  {([
                    { value: "pièce"  as UnitType, title: "Pièce",  desc: "Stock = unités totales",  Icon: Package },
                    { value: "carton" as UnitType, title: "Carton", desc: "Stock = nombre de colis", Icon: Box },
                  ]).map(({ value, title, desc, Icon }) => {
                    const active = unitType === value;
                    return (
                      <button key={value} onClick={() => setUnitType(value)}
                        className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left"
                        style={{
                          background : active ? "var(--blue-light)" : "var(--input-background)",
                          borderColor: active ? "var(--primary)"    : "var(--border)",
                        }}>
                        <Icon size={16} style={{ color: active ? "var(--primary)" : "var(--muted-foreground)", flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 600,
                            color: active ? "var(--primary)" : "var(--foreground)" }}>{title}</div>
                          <div style={{ fontSize: "10px", color: "var(--muted-foreground)", lineHeight: 1.3 }}>{desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
  
              {/* ── Result card ── */}
              {(Number(packages) > 0 || Number(packSize) > 0) && (
                <div className="rounded-xl px-4 py-3 space-y-1"
                  style={{ background: "var(--blue-light)", border: "1px solid var(--primary)" }}>
                  {unitType === "pièce" ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span style={{ fontSize: "12px", color: "var(--primary)" }}>Unités totales</span>
                        <span style={{ fontSize: "20px", fontWeight: 800, color: "var(--primary)" }}>
                          {totalUnits}
                          <span style={{ fontSize: "12px", fontWeight: 400, marginLeft: 4 }}>pièces</span>
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--primary)", opacity: 0.7 }}>
                        {Number(packages)} colis × {Number(packSize)} unités → stock enregistré en pièces
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <span style={{ fontSize: "12px", color: "var(--primary)" }}>Colis en stock</span>
                        <span style={{ fontSize: "20px", fontWeight: 800, color: "var(--primary)" }}>
                          {Number(packages)}
                          <span style={{ fontSize: "12px", fontWeight: 400, marginLeft: 4 }}>cartons</span>
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--primary)", opacity: 0.7 }}>
                        Soit {totalUnits} unités au total · stock enregistré en cartons
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
  
            {/* ══ DATE D'EXPIRATION ═══════════════════════════════════════════ */}
            <div className="rounded-2xl border border-border p-4"
              style={{ background: "var(--muted)" }}>
  
              {/* Toggle row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Calendar size={16} style={{ color: hasExpiry ? "var(--primary)" : "var(--muted-foreground)" }} />
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)", marginBottom: 1 }}>
                      Date d'expiration
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                      Produit soumis à une date de péremption
                    </p>
                  </div>
                </div>
  
                {/* Toggle switch */}
                <button
                  type="button"
                  onClick={() => setHasExpiry(v => !v)}
                  className="relative flex-shrink-0"
                  style={{ width: 44, height: 24 }}
                  aria-pressed={hasExpiry}
                  aria-label="Activer date d'expiration"
                >
                  <div
                    className="absolute inset-0 rounded-full transition-colors duration-200"
                    style={{ background: hasExpiry ? "var(--primary)" : "var(--border)" }}
                  />
                  <div
                    className="absolute top-1 rounded-full transition-all duration-200"
                    style={{
                      width: 16, height: 16,
                      background: "white",
                      left: hasExpiry ? 24 : 4,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                    }}
                  />
                </button>
              </div>
  
              {/* Date input (only when toggled on) */}
              {hasExpiry && (
                <div className="mt-3 pt-3 border-t border-border">
                  <label style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: 6, display: "block" }}>
                    Date de péremption
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-xl border border-border px-3 py-2.5 outline-none focus:ring-2"
                    style={{
                      background: "var(--input-background)",
                      color: "var(--foreground)",
                      fontSize: "14px",
                      "--tw-ring-color": "var(--primary)",
                    } as React.CSSProperties}
                  />
                </div>
              )}
            </div>
  
            {/* ── Save ── */}
            <button onClick={saveProduct}
              className="w-full py-3 rounded-2xl transition-all active:scale-95"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontWeight: 600, fontSize: "15px" }}>
              {editProduct.id ? "Enregistrer les modifications" : "Ajouter le produit"}
            </button>
          </div>
  
          {/* ── Margin warning modal ── */}
          {showMarginWarn && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-6"
              style={{ background: "rgba(0,0,0,0.5)" }}
              onClick={e => { if (e.target === e.currentTarget) setShowMarginWarn(false); }}>
              <div className="w-full rounded-3xl p-5 space-y-4"
                style={{ background: "var(--card)", maxWidth: 360 }}>
  
                {/* Icon + title */}
                <div className="flex flex-col items-center gap-3 pt-1">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: "var(--red-light)" }}>
                    <AlertTriangle size={28} style={{ color: "var(--destructive)" }} />
                  </div>
                  <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--foreground)", textAlign: "center" }}>
                    Prix d'achat supérieur ou égal au prix de vente
                  </h2>
                </div>
  
                {/* Detail */}
                <div className="rounded-2xl p-3 space-y-1.5"
                  style={{ background: "var(--red-light)" }}>
                  <div className="flex justify-between items-center">
                    <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Prix de vente</span>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)" }}>
                      {fmt(editProduct.sellingPrice ?? 0)} DZD
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Prix d'achat</span>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--destructive)" }}>
                      {fmt(editProduct.purchasePrice ?? 0)} DZD
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1"
                    style={{ borderTop: "1px solid rgba(198,40,40,0.2)" }}>
                    <span style={{ fontSize: "12px", color: "var(--destructive)", fontWeight: 500 }}>Perte par unité</span>
                    <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--destructive)" }}>
                      − {fmt((editProduct.purchasePrice ?? 0) - (editProduct.sellingPrice ?? 0))} DZD
                    </span>
                  </div>
                </div>
  
                <p style={{ fontSize: "13px", color: "var(--muted-foreground)", textAlign: "center", lineHeight: 1.5 }}>
                  Voulez-vous continuer malgré la perte ?
                </p>
  
                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setShowMarginWarn(false)}
                    className="flex-1 py-2.5 rounded-xl border border-border transition-all active:scale-95"
                    style={{ background: "var(--muted)", color: "var(--foreground)", fontWeight: 600, fontSize: "14px" }}>
                    Corriger
                  </button>
                  <button onClick={commitSave}
                    className="flex-1 py-2.5 rounded-xl transition-all active:scale-95"
                    style={{ background: "var(--destructive)", color: "white", fontWeight: 600, fontSize: "14px" }}>
                    Continuer quand même
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
  
    // ══════════════════════════════════════════════════════════════════════════
    // DETAIL VIEW
    // ══════════════════════════════════════════════════════════════════════════
    if (selected) {
      const margin  = selected.sellingPrice > 0
        ? ((selected.sellingPrice - selected.purchasePrice) / selected.sellingPrice * 100).toFixed(1)
        : "0.0";
      const isLow   = selected.stock < selected.minStock;
      const ut      = (selected.unitType ?? "pièce") as UnitType;
      const ps      = selected.packSize ?? 0;
      const pkgs    = selected.packages ?? 0;
  
      // Expiry status
      const today     = new Date().toISOString().split("T")[0];
      const isExpired = selected.hasExpiry && selected.expiryDate && selected.expiryDate < today;
      const nearExpiry = selected.hasExpiry && selected.expiryDate && !isExpired &&
        new Date(selected.expiryDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
  
      return (
        <div className="px-4 pt-4 pb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelected(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ background: "var(--muted)" }}>
                <X size={18} />
              </button>
              <h1 style={{ color: "var(--foreground)" }}>Détails du produit</h1>
            </div>
            <button onClick={() => openEdit(selected)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{ background: "var(--blue-light)", color: "var(--primary)" }}>
              <Edit2 size={14} />
              <span style={{ fontSize: "13px", fontWeight: 500 }}>Modifier</span>
            </button>
          </div>
  
          {/* Image */}
          {selected.imageUri && (
            <div className="mb-4 rounded-2xl overflow-hidden" style={{ maxHeight: 180 }}>
              <img src={selected.imageUri} alt={selected.name}
                className="w-full object-cover" style={{ maxHeight: 180 }} />
            </div>
          )}
  
          {/* Name + category */}
          <div className="bg-card rounded-2xl p-4 shadow-sm border border-border mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 style={{ color: "var(--foreground)" }}>{selected.name}</h2>
                <span className="px-2 py-0.5 rounded-full"
                  style={{ fontSize: "11px", background: "var(--blue-light)", color: "var(--primary)", fontWeight: 500 }}>
                  {selected.category}
                </span>
              </div>
              <div className="flex flex-col gap-1 items-end">
                {isLow && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-xl"
                    style={{ background: "var(--red-light)", color: "var(--destructive)", fontSize: "11px", fontWeight: 600 }}>
                    <AlertTriangle size={12} /> Stock faible
                  </span>
                )}
                {isExpired && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-xl"
                    style={{ background: "var(--red-light)", color: "var(--destructive)", fontSize: "11px", fontWeight: 600 }}>
                    <Calendar size={12} /> Expiré
                  </span>
                )}
                {nearExpiry && !isExpired && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-xl"
                    style={{ background: "#FFF3E0", color: "#E65100", fontSize: "11px", fontWeight: 600 }}>
                    <Calendar size={12} /> Expire bientôt
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3"
              style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>
              <Barcode size={14} />
              <span style={{ fontFamily: "monospace" }}>{selected.barcode}</span>
            </div>
          </div>
  
          {/* Price cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: "Prix de vente",  value: `${fmt(selected.sellingPrice)} MAD`,  color: "var(--primary)" },
              { label: "Prix d'achat",   value: `${fmt(selected.purchasePrice)} MAD`, color: "var(--accent)"  },
              { label: "Marge",          value: `${margin}%`,                          color: "#f57c00"        },
              { label: "Fournisseur",    value: selected.supplier || "—",              color: "var(--foreground)" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-card rounded-2xl p-3 border border-border shadow-sm">
                <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{label}</div>
                <div style={{ fontWeight: 700, fontSize: "15px", color, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
  
          {/* Stock info */}
          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-4">
            <div style={{ fontWeight: 600, marginBottom: 12, color: "var(--foreground)" }}>
              Informations de stock
            </div>
            <div className="flex items-center gap-2 mb-3">
              {ut === "carton"
                ? <Box size={14} style={{ color: "var(--primary)" }} />
                : <Package size={14} style={{ color: "var(--primary)" }} />}
              <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                Stocké en <strong style={{ color: "var(--primary)" }}>{ut}</strong>
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>Stock actuel</span>
              <span style={{ fontWeight: 700, fontSize: "22px",
                color: isLow ? "var(--destructive)" : "var(--accent)" }}>
                {selected.stock}
                <span style={{ fontSize: "13px", fontWeight: 400, marginLeft: 4 }}>{ut}</span>
              </span>
            </div>
            {pkgs > 0 && ps > 0 && (
              <div className="flex justify-between items-center mb-2">
                <span style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>Conditionnement</span>
                <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
                  {pkgs} colis × {ps} unités
                  {ut === "carton" && (
                    <span style={{ color: "var(--primary)", fontWeight: 600 }}> = {pkgs * ps} pièces</span>
                  )}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center mb-3">
              <span style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
                Seuil de réapprovisionnement
              </span>
              <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }}>
                {selected.minStock} {ut}
              </span>
            </div>
            <div className="rounded-full overflow-hidden" style={{ height: 6, background: "var(--muted)" }}>
              <div className="h-full rounded-full transition-all" style={{
                width: `${Math.min(100, (selected.stock / (selected.minStock * 3)) * 100)}%`,
                background: isLow ? "var(--destructive)" : "var(--accent)",
              }} />
            </div>
          </div>
  
          {/* Expiry date card */}
          {selected.hasExpiry && (
            <div className="bg-card rounded-2xl p-4 border border-border shadow-sm"
              style={{ borderColor: isExpired ? "var(--destructive)" : nearExpiry ? "#E65100" : undefined }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar size={16} style={{ color: isExpired ? "var(--destructive)" : nearExpiry ? "#E65100" : "var(--primary)" }} />
                  <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }}>
                    Date d'expiration
                  </span>
                </div>
                <span style={{
                  fontWeight: 700, fontSize: "14px",
                  color: isExpired ? "var(--destructive)" : nearExpiry ? "#E65100" : "var(--foreground)",
                }}>
                  {selected.expiryDate
                    ? new Date(selected.expiryDate).toLocaleDateString("fr-DZ", { day: "2-digit", month: "long", year: "numeric" })
                    : "Non définie"}
                </span>
              </div>
            </div>
          )}
        </div>
      );
    }
  
    // ══════════════════════════════════════════════════════════════════════════
    // LIST / GRID VIEW
    // ══════════════════════════════════════════════════════════════════════════
    return (
      <div className="px-4 pt-4 pb-6">
  
        {/* ── Header ── */}
        <div className="flex justify-between items-center mb-4">
          <h1 style={{ color: "var(--foreground)" }}>Produits</h1>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-border overflow-hidden"
              style={{ background: "var(--card)" }}>
              <button onClick={() => setViewMode("list")}
                className="flex items-center justify-center w-8 h-8 transition-colors"
                style={{
                  background: viewMode === "list" ? "var(--primary)" : "transparent",
                  color     : viewMode === "list" ? "white" : "var(--muted-foreground)",
                }}>
                <LayoutList size={15} />
              </button>
              <button onClick={() => setViewMode("grid")}
                className="flex items-center justify-center w-8 h-8 transition-colors"
                style={{
                  background: viewMode === "grid" ? "var(--primary)" : "transparent",
                  color     : viewMode === "grid" ? "white" : "var(--muted-foreground)",
                }}>
                <LayoutGrid size={15} />
              </button>
            </div>
            <button onClick={() => openEdit()}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "var(--primary)", color: "white" }}>
              <Plus size={20} />
            </button>
          </div>
        </div>
  
        {/* ── Search ── */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--muted-foreground)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou code-barres…"
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-border outline-none"
            style={{ background: "var(--card)", fontSize: "14px", color: "var(--foreground)" }} />
        </div>
  
        {/* ── Filters ── */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          <button onClick={() => setLowStockOnly(!lowStockOnly)}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full border transition-colors"
            style={{
              background : lowStockOnly ? "var(--red-light)" : "var(--card)",
              borderColor: lowStockOnly ? "var(--destructive)" : "var(--border)",
              color      : lowStockOnly ? "var(--destructive)" : "var(--muted-foreground)",
              fontSize: "12px", fontWeight: 500,
            }}>
            <Filter size={12} /> Stock faible
          </button>
          {categories.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full border transition-colors"
              style={{
                background : category === c ? "var(--primary)" : "var(--card)",
                borderColor: category === c ? "var(--primary)" : "var(--border)",
                color      : category === c ? "white" : "var(--muted-foreground)",
                fontSize: "12px", fontWeight: 500,
              }}>
              {c}
            </button>
          ))}
        </div>
  
        <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: 10 }}>
          {filtered.length} produit(s)
        </p>
  
        {/* ══ LIST VIEW ══════════════════════════════════════════════════════ */}
        {viewMode === "list" && (
          <div className="space-y-2">
            {filtered.map(p => {
              const isLow    = p.stock < p.minStock;
              const ut       = (p.unitType ?? "pièce") as UnitType;
              const today    = new Date().toISOString().split("T")[0];
              const isExp    = p.hasExpiry && p.expiryDate && p.expiryDate < today;
              return (
                <button key={p.id} onClick={() => setSelected(p)}
                  className="w-full bg-card rounded-2xl p-3.5 shadow-sm border border-border flex items-center gap-3 active:scale-98 transition-transform text-left"
                  style={{ borderColor: isLow || isExp ? "rgba(198,40,40,0.25)" : undefined }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={{ background: "var(--blue-light)" }}>
                    {p.imageUri
                      ? <img src={p.imageUri} alt={p.name} className="w-full h-full object-cover" />
                      : <Package size={18} style={{ color: "var(--primary)" }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }}
                        className="truncate">{p.name}</span>
                      {isLow && <AlertTriangle size={13} color="var(--destructive)" className="flex-shrink-0" />}
                      {isExp  && <Calendar    size={13} color="var(--destructive)" className="flex-shrink-0" />}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                      {p.category} · {p.supplier || "—"}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--primary)" }}>
                      {fmt(p.sellingPrice)} MAD
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: isLow ? 600 : 400,
                      color: isLow ? "var(--destructive)" : "var(--muted-foreground)" }}>
                      {p.stock} {ut}
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        )}
  
        {/* ══ GRID VIEW ══════════════════════════════════════════════════════ */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(p => {
              const isLow = p.stock < p.minStock;
              const ut    = (p.unitType ?? "pièce") as UnitType;
              const today = new Date().toISOString().split("T")[0];
              const isExp = p.hasExpiry && p.expiryDate && p.expiryDate < today;
              return (
                <button key={p.id} onClick={() => setSelected(p)}
                  className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden active:scale-95 transition-transform text-left flex flex-col"
                  style={{ borderColor: isLow || isExp ? "rgba(198,40,40,0.3)" : undefined }}>
                  <div className="w-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={{ height: 90, background: "var(--blue-light)" }}>
                    {p.imageUri
                      ? <img src={p.imageUri} alt={p.name} className="w-full h-full object-cover" />
                      : <Package size={28} style={{ color: "var(--primary)", opacity: 0.6 }} />}
                  </div>
                  <div className="p-3 flex flex-col gap-1 flex-1">
                    <div className="flex items-start gap-1">
                      <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--foreground)",
                        lineHeight: 1.3, flex: 1 }} className="line-clamp-2">{p.name}</span>
                      {isLow && <AlertTriangle size={12} color="var(--destructive)" className="flex-shrink-0 mt-0.5" />}
                      {isExp  && <Calendar    size={12} color="var(--destructive)" className="flex-shrink-0 mt-0.5" />}
                    </div>
                    <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>{p.category}</span>
                    <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--primary)", marginTop: 2 }}>
                      {fmt(p.sellingPrice)} MAD
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="px-2 py-0.5 rounded-full"
                        style={{
                          fontSize: "10px", fontWeight: 600,
                          background: isLow ? "var(--red-light)"  : "var(--green-light)",
                          color     : isLow ? "var(--destructive)" : "var(--accent)",
                        }}>
                        {p.stock} {ut}
                      </span>
                      {ut === "carton"
                        ? <Box     size={12} style={{ color: "var(--muted-foreground)" }} />
                        : <Package size={12} style={{ color: "var(--muted-foreground)" }} />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }
