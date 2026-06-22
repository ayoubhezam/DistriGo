import { useState } from "react";
import { CATEGORIES } from "./mockData";

// ─── Types ────────────────────────────────────────────────────────────────────
export type UnitType    = "pièce" | "carton";
export type PricingUnit = "package" | "unit";

export type ExtendedProduct = {
  id            : string;
  name          : string;
  barcode       : string;
  category      : string;
  supplier      : string;
  sellingPrice  : number;
  purchasePrice : number;
  stock         : number;
  minStock      : number;
  unit          : string;
  imageUri?     : string;
  packages?     : number;
  packSize?     : number;
  unitType?     : UnitType;
  pricingUnit?  : PricingUnit;
  hasExpiry?    : boolean;
  expiryDate?   : string;
};

// ─── localStorage keys ────────────────────────────────────────────────────────
const LS_PRODUCTS   = "distrigo_products";
const LS_CATEGORIES = "distrigo_categories";

// ─── Load from localStorage (or fallback to empty) ───────────────────────────
// بعد
function loadProducts(): ExtendedProduct[] {
  try {
    const raw = localStorage.getItem(LS_PRODUCTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch { /* ignore */ }
  return [];
}

// بعد
function loadCategories(): string[] {
  try {
    const raw = localStorage.getItem(LS_CATEGORIES);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : CATEGORIES;
    }
  } catch { /* ignore */ }
  return CATEGORIES;
}

// ─── Module-level singleton ───────────────────────────────────────────────────
let _products  : ExtendedProduct[] = loadProducts();
let _categories: string[]          = loadCategories();
let _listeners : (() => void)[]    = [];

function notify() { _listeners.forEach(l => l()); }

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useProductsStore() {
  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate(n => n + 1);

  function subscribe() {
    _listeners.push(rerender);
    return () => { _listeners = _listeners.filter(l => l !== rerender); };
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useState(subscribe);

  function setProducts(next: ExtendedProduct[]) {
    _products = next;
    try { localStorage.setItem(LS_PRODUCTS, JSON.stringify(next)); } catch { /* ignore */ }
    notify();
  }

  function setCategories(next: string[]) {
    _categories = next;
    try { localStorage.setItem(LS_CATEGORIES, JSON.stringify(next)); } catch { /* ignore */ }
    notify();
  }
  // بعد — يقرأ _products من الذاكرة المشتركة دائماً
return {
  get products()    { return _products;   },
  get categories()  { return _categories; },
  setProducts,
  setCategories,
};
}
