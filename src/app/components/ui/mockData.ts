import {
  Product, Supplier, PurchaseOrder, SaleRecord,
  StockMovement, Customer, Invoice, Payment, ActivityEntry,
} from "./types";

// ─── INVOICES ─────────────────────────────────────────────────────────────────
export const INVOICES: Invoice[] = [
  {
    id: "INV-001", date: "2026-06-13T09:14:00", customerId: "c1", customerName: "Épicerie Benali",
    items: [
      { productId: "p1", productName: "Eau Minérale Sidi Ali 1,5L", qty: 6,  unitPrice: 4.50 },
      { productId: "p3", productName: "Pain de mie Bäcker 500g",    qty: 2,  unitPrice: 12.00 },
    ],
    total: 51.00, paid: 51.00, status: "paid", posRef: "VT001",
  },
  {
    id: "INV-002", date: "2026-06-13T09:45:00", customerId: "c2", customerName: "Superette Alaoui",
    items: [
      { productId: "p2",  productName: "Lait Centrale 1L",          qty: 2,  unitPrice: 7.20 },
      { productId: "p7",  productName: "Œufs Frais (plateau 30)",   qty: 1,  unitPrice: 42.00 },
    ],
    total: 56.40, paid: 0, status: "unpaid", posRef: "VT002",
  },
  {
    id: "INV-003", date: "2026-06-13T11:05:00", customerId: "c3", customerName: "Alimentation Raji",
    items: [
      { productId: "p10", productName: "Jus d'Orange Joker 1L",     qty: 3,  unitPrice: 18.50 },
      { productId: "p9",  productName: "Fromage Kiri 200g",          qty: 1,  unitPrice: 22.00 },
    ],
    total: 77.50, paid: 77.50, status: "paid", posRef: "VT004",
  },
  {
    id: "INV-004", date: "2026-06-13T11:48:00", customerId: "c4", customerName: "Grossiste Tazi & Fils",
    items: [
      { productId: "p15", productName: "Coca-Cola 1,5L",             qty: 24, unitPrice: 14.00 },
      { productId: "p11", productName: "Pâtes Torti Barilla 500g",   qty: 12, unitPrice: 11.00 },
    ],
    total: 468.00, paid: 200.00, status: "partial", posRef: "VT005",
  },
  {
    id: "INV-005", date: "2026-06-12T14:30:00", customerId: "c1", customerName: "Épicerie Benali",
    items: [
      { productId: "p4",  productName: "Huile de Tournesol Lesieur 2L", qty: 2, unitPrice: 55.00 },
    ],
    total: 110.00, paid: 0, status: "unpaid", posRef: "VT006",
  },
  {
    id: "INV-006", date: "2026-06-11T10:00:00", customerId: "c6", customerName: "Bazar Chaoui",
    items: [
      { productId: "p1",  productName: "Eau Minérale Sidi Ali 1,5L",    qty: 100, unitPrice: 4.50 },
      { productId: "p5",  productName: "Sucre Raffiné Cosumar 1kg",      qty: 50,  unitPrice: 10.00 },
      { productId: "p15", productName: "Coca-Cola 1,5L",                 qty: 48,  unitPrice: 14.00 },
    ],
    total: 1622.00, paid: 500.00, status: "partial",
  },
  {
    id: "INV-007", date: "2026-06-10T08:30:00", customerId: "c6", customerName: "Bazar Chaoui",
    items: [
      { productId: "p4",  productName: "Huile de Tournesol Lesieur 2L",  qty: 30,  unitPrice: 55.00 },
      { productId: "p6",  productName: "Riz Uncle Ben's 5kg",            qty: 20,  unitPrice: 75.00 },
    ],
    total: 3150.00, paid: 0, status: "unpaid",
  },
];

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────
export const PAYMENTS: Payment[] = [
  { id: "PAY-001", date: "2026-06-13T09:14:00", customerId: "c1", amount: 51.00,  method: "cash",          invoiceId: "INV-001" },
  { id: "PAY-002", date: "2026-06-13T11:05:00", customerId: "c3", amount: 77.50,  method: "card",          invoiceId: "INV-003" },
  { id: "PAY-003", date: "2026-06-13T14:00:00", customerId: "c4", amount: 200.00, method: "cheque",        invoiceId: "INV-004", note: "Chèque n° 0045821" },
  { id: "PAY-004", date: "2026-06-11T16:00:00", customerId: "c6", amount: 500.00, method: "bank_transfer", invoiceId: "INV-006", note: "Virement CCP" },
];

// ─── ACTIVITY (per customer) ───────────────────────────────────────────────────
const activityC1: ActivityEntry[] = [
  { id: "a1-1", date: "2026-06-12T14:30:00", type: "invoice", label: "Facture INV-005 — Huile ×2",         amount: 110.00,  invoiceId: "INV-005" },
  { id: "a1-2", date: "2026-06-13T09:14:00", type: "invoice", label: "Facture INV-001 — Eau + Pain",       amount: 51.00,   invoiceId: "INV-001" },
  { id: "a1-3", date: "2026-06-13T09:14:00", type: "payment", label: "Paiement reçu — Espèces",            amount: 51.00,   paymentId: "PAY-001" },
];

const activityC4: ActivityEntry[] = [
  { id: "a4-1", date: "2026-06-13T11:48:00", type: "invoice", label: "Facture INV-004 — Coca + Pâtes",     amount: 468.00,  invoiceId: "INV-004" },
  { id: "a4-2", date: "2026-06-13T14:00:00", type: "payment", label: "Paiement partiel — Chèque",          amount: 200.00,  paymentId: "PAY-003" },
];

const activityC6: ActivityEntry[] = [
  { id: "a6-1", date: "2026-06-10T08:30:00", type: "invoice", label: "Facture INV-007 — Huile + Riz",      amount: 3150.00, invoiceId: "INV-007" },
  { id: "a6-2", date: "2026-06-11T10:00:00", type: "invoice", label: "Facture INV-006 — Eau + Sucre + Cola",amount: 1622.00, invoiceId: "INV-006" },
  { id: "a6-3", date: "2026-06-11T16:00:00", type: "payment", label: "Virement reçu — CCP",                amount: 500.00,  paymentId: "PAY-004" },
];

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────
export const CUSTOMERS: Customer[] = [
  {
    id: "c0", name: "Client Comptoir", phone: "—", address: "Vente directe",
    customerType: "retail", openingBalance: 0, balance: 0, creditLimit: 0,
  },
  {
    id: "c1", name: "Épicerie Benali",
    phone: "+212 661 234 567", address: "12 Rue du Marché, Casablanca",
    email: "benali@epicerie.ma",
    customerType: "retail", openingBalance: 1500, openingBalanceDate: "2026-01-01",
    balance: 110.00, creditLimit: 5000,
    notes: "Client fidèle depuis 3 ans. Livraison chaque lundi.",
    invoices: INVOICES.filter(i => i.customerId === "c1"),
    payments: PAYMENTS.filter(p => p.customerId === "c1"),
    activity: activityC1,
  },
  {
    id: "c2", name: "Superette Alaoui",
    phone: "+212 662 345 678", address: "45 Bd Hassan II, Rabat",
    email: "alaoui@superette.ma",
    customerType: "retail", openingBalance: 0, openingBalanceDate: "2026-01-01",
    balance: 56.40, creditLimit: 8000,
    invoices: INVOICES.filter(i => i.customerId === "c2"),
    payments: PAYMENTS.filter(p => p.customerId === "c2"),
    activity: [],
  },
  {
    id: "c3", name: "Alimentation Raji",
    phone: "+212 663 456 789", address: "7 Av. Mohammed V, Fès",
    customerType: "retail", openingBalance: 0,
    balance: 0, creditLimit: 3000,
    invoices: INVOICES.filter(i => i.customerId === "c3"),
    payments: PAYMENTS.filter(p => p.customerId === "c3"),
    activity: [],
  },
  {
    id: "c4", name: "Grossiste Tazi & Fils",
    phone: "+212 664 567 890", phone2: "+212 664 567 891",
    address: "88 Zone Industrielle, Tanger",
    email: "tazi@grossiste.ma", taxId: "NIF-45782361",
    customerType: "wholesale", openingBalance: 2000, openingBalanceDate: "2026-01-01",
    balance: 268.00, creditLimit: 10000,
    notes: "Grossiste principal zone Nord. Paiement par chèque uniquement.",
    invoices: INVOICES.filter(i => i.customerId === "c4"),
    payments: PAYMENTS.filter(p => p.customerId === "c4"),
    activity: activityC4,
  },
  {
    id: "c5", name: "Mini Market Idrissi",
    phone: "+212 665 678 901", address: "3 Rue Ibn Battouta, Marrakech",
    customerType: "retail", openingBalance: 0,
    balance: 0, creditLimit: 4000,
    invoices: [], payments: [], activity: [],
  },
  {
    id: "c6", name: "Bazar Chaoui",
    phone: "+212 666 789 012", address: "22 Quartier Industriel, Agadir",
    email: "chaoui@bazar.ma", taxId: "NIS-78123456",
    customerType: "business", openingBalance: 5000, openingBalanceDate: "2026-01-01",
    balance: 4272.00, creditLimit: 8000,
    notes: "Dépasse régulièrement le plafond. À surveiller.",
    coordinates: { lat: 30.4278, lng: -9.5981 },
    invoices: INVOICES.filter(i => i.customerId === "c6"),
    payments: PAYMENTS.filter(p => p.customerId === "c6"),
    activity: activityC6,
  },
];

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
export const PRODUCTS: Product[] = [
  { id: "p1",  name: "Eau Minérale Sidi Ali 1,5L",       category: "Boissons",         barcode: "6111162200015", sellingPrice: 4.50,  purchasePrice: 2.80,  stock: 240, minStock: 50, supplier: "Nestlé Maroc",         unit: "bouteille" },
  { id: "p2",  name: "Lait Centrale 1L",                 category: "Produits laitiers", barcode: "6111162200022", sellingPrice: 7.20,  purchasePrice: 4.50,  stock: 12,  minStock: 30, supplier: "Centrale Danone",       unit: "carton"    },
  { id: "p3",  name: "Pain de mie Bäcker 500g",          category: "Boulangerie",       barcode: "6111162200039", sellingPrice: 12.00, purchasePrice: 7.00,  stock: 8,   minStock: 20, supplier: "Bäcker Maroc",          unit: "sachet"    },
  { id: "p4",  name: "Huile de Tournesol Lesieur 2L",    category: "Épicerie",          barcode: "6111162200046", sellingPrice: 55.00, purchasePrice: 38.00, stock: 85,  minStock: 20, supplier: "Lesieur Cristal",       unit: "bouteille" },
  { id: "p5",  name: "Sucre Raffiné Cosumar 1kg",        category: "Épicerie",          barcode: "6111162200053", sellingPrice: 10.00, purchasePrice: 7.50,  stock: 150, minStock: 40, supplier: "Cosumar",               unit: "sachet"    },
  { id: "p6",  name: "Riz Uncle Ben's 5kg",              category: "Épicerie",          barcode: "6111162200060", sellingPrice: 75.00, purchasePrice: 55.00, stock: 60,  minStock: 25, supplier: "Mars Food",             unit: "sac"       },
  { id: "p7",  name: "Œufs Frais (plateau 30)",          category: "Produits laitiers", barcode: "6111162200077", sellingPrice: 42.00, purchasePrice: 30.00, stock: 6,   minStock: 15, supplier: "Ferme Laraqui",         unit: "plateau"   },
  { id: "p8",  name: "Tomates en conserve Aicha 400g",   category: "Conserves",         barcode: "6111162200084", sellingPrice: 9.50,  purchasePrice: 5.80,  stock: 45,  minStock: 20, supplier: "Aicha Maroc",           unit: "boîte"     },
  { id: "p9",  name: "Fromage Kiri 200g",                category: "Produits laitiers", barcode: "6111162200091", sellingPrice: 22.00, purchasePrice: 15.00, stock: 22,  minStock: 15, supplier: "Fromagerie Bel",        unit: "boîte"     },
  { id: "p10", name: "Jus d'Orange Joker 1L",            category: "Boissons",          barcode: "6111162200108", sellingPrice: 18.50, purchasePrice: 12.00, stock: 55,  minStock: 20, supplier: "Brasseries du Maroc",   unit: "carton"    },
  { id: "p11", name: "Pâtes Torti Barilla 500g",         category: "Épicerie",          barcode: "6111162200115", sellingPrice: 11.00, purchasePrice: 7.00,  stock: 110, minStock: 30, supplier: "Barilla Group",         unit: "paquet"    },
  { id: "p12", name: "Thon en conserve Mahalia 180g",    category: "Conserves",         barcode: "6111162200122", sellingPrice: 15.00, purchasePrice: 9.50,  stock: 18,  minStock: 10, supplier: "Mahalia Foods",         unit: "boîte"     },
  { id: "p13", name: "Café Nescafé Classic 200g",        category: "Boissons",          barcode: "6111162200139", sellingPrice: 68.00, purchasePrice: 48.00, stock: 35,  minStock: 15, supplier: "Nestlé Maroc",          unit: "bocal"     },
  { id: "p14", name: "Savon Lux 125g",                   category: "Hygiène",           barcode: "6111162200146", sellingPrice: 6.50,  purchasePrice: 4.00,  stock: 3,   minStock: 30, supplier: "Unilever Maroc",        unit: "barre"     },
  { id: "p15", name: "Coca-Cola 1,5L",                   category: "Boissons",          barcode: "6111162200153", sellingPrice: 14.00, purchasePrice: 9.00,  stock: 72,  minStock: 24, supplier: "Coca-Cola Maroc",       unit: "bouteille" },
];

// ─── SUPPLIERS ────────────────────────────────────────────────────────────────
export const SUPPLIERS: Supplier[] = [
  { id: "s1", name: "Nestlé Maroc",      phone: "+212 522 234 567", email: "commandes@nestle.ma",    address: "Route de Rabat, Casablanca 20250" },
  { id: "s2", name: "Centrale Danone",   phone: "+212 522 345 678", email: "supply@danone.ma",       address: "Zone Industrielle Aïn Sebaâ, Casablanca" },
  { id: "s3", name: "Bäcker Maroc",      phone: "+212 522 456 789", email: "boulangerie@backer.ma",  address: "7 Rue de la Farine, Mohammedia" },
  { id: "s4", name: "Lesieur Cristal",   phone: "+212 522 567 890", email: "commandes@lesieur.ma",   address: "22 Bd Zerktouni, Casablanca" },
  { id: "s5", name: "Cosumar",           phone: "+212 522 678 901", email: "ventes@cosumar.ma",      address: "8 Rue El Mouatamid Ibnou Abbad, Casablanca" },
  { id: "s6", name: "Unilever Maroc",    phone: "+212 522 789 012", email: "orders@unilever.ma",     address: "Zone Franche, Tanger" },
  { id: "s7", name: "Ferme Laraqui",     phone: "+212 661 890 123", email: "ferme.laraqui@gmail.com",address: "Route de Meknès, km 12, Fès" },
  { id: "s8", name: "Aicha Maroc",       phone: "+212 528 901 234", email: "export@aicha.ma",        address: "Route de Safi, Agadir" },
];

// ─── PURCHASE ORDERS ─────────────────────────────────────────────────────────
export const PURCHASE_ORDERS: PurchaseOrder[] = [
  { id: "BC001", supplierId: "s2", supplierName: "Centrale Danone",  date: "2026-06-12", items: [{ productId: "p2", productName: "Lait Centrale 1L", qty: 120, unitCost: 4.50 }, { productId: "p7", productName: "Œufs Frais (plateau 30)", qty: 40, unitCost: 30.00 }], total: 1740.00, status: "received" },
  { id: "BC002", supplierId: "s1", supplierName: "Nestlé Maroc",     date: "2026-06-11", items: [{ productId: "p1", productName: "Eau Minérale Sidi Ali 1,5L", qty: 200, unitCost: 2.80 }], total: 560.00, status: "received" },
  { id: "BC003", supplierId: "s5", supplierName: "Cosumar",          date: "2026-06-10", items: [{ productId: "p5", productName: "Sucre Raffiné Cosumar 1kg", qty: 100, unitCost: 7.50 }, { productId: "p6", productName: "Riz Uncle Ben's 5kg", qty: 20, unitCost: 55.00 }], total: 1850.00, status: "received" },
  { id: "BC004", supplierId: "s3", supplierName: "Bäcker Maroc",     date: "2026-06-13", items: [{ productId: "p3", productName: "Pain de mie Bäcker 500g", qty: 60, unitCost: 7.00 }], total: 420.00, status: "pending" },
  { id: "BC005", supplierId: "s6", supplierName: "Unilever Maroc",   date: "2026-06-13", items: [{ productId: "p14", productName: "Savon Lux 125g", qty: 200, unitCost: 4.00 }], total: 800.00, status: "pending" },
];

// ─── SALES (legacy POS log) ───────────────────────────────────────────────────
export const SALES: SaleRecord[] = [
  { id: "VT001", date: "2026-06-13 09:14", customerId: "c1", customerName: "Épicerie Benali",       items: [{ name: "Eau Minérale Sidi Ali 1,5L", qty: 6, price: 4.50 }, { name: "Pain de mie Bäcker 500g", qty: 2, price: 12.00 }], total: 51.00,  payment: "cash"   },
  { id: "VT002", date: "2026-06-13 09:45", customerId: "c2", customerName: "Superette Alaoui",      items: [{ name: "Lait Centrale 1L", qty: 2, price: 7.20 }, { name: "Œufs Frais (plateau 30)", qty: 1, price: 42.00 }],           total: 56.40,  payment: "credit" },
  { id: "VT003", date: "2026-06-13 10:22", customerId: "c0", customerName: "Client Comptoir",       items: [{ name: "Riz Uncle Ben's 5kg", qty: 2, price: 75.00 }, { name: "Sucre Raffiné Cosumar 1kg", qty: 3, price: 10.00 }],      total: 180.00, payment: "cash"   },
  { id: "VT004", date: "2026-06-13 11:05", customerId: "c3", customerName: "Alimentation Raji",     items: [{ name: "Jus d'Orange Joker 1L", qty: 3, price: 18.50 }, { name: "Fromage Kiri 200g", qty: 1, price: 22.00 }],           total: 77.50,  payment: "card"   },
  { id: "VT005", date: "2026-06-13 11:48", customerId: "c4", customerName: "Grossiste Tazi & Fils", items: [{ name: "Coca-Cola 1,5L", qty: 24, price: 14.00 }, { name: "Pâtes Torti Barilla 500g", qty: 12, price: 11.00 }],        total: 468.00, payment: "credit" },
  { id: "VT006", date: "2026-06-12 14:30", customerId: "c1", customerName: "Épicerie Benali",       items: [{ name: "Huile de Tournesol Lesieur 2L", qty: 2, price: 55.00 }],                                                        total: 110.00, payment: "credit" },
  { id: "VT007", date: "2026-06-12 15:55", customerId: "c0", customerName: "Client Comptoir",       items: [{ name: "Tomates en conserve Aicha 400g", qty: 4, price: 9.50 }],                                                        total: 38.00,  payment: "cash"   },
];

// ─── STOCK MOVEMENTS ──────────────────────────────────────────────────────────
export const STOCK_MOVEMENTS: StockMovement[] = [
  { id: "sm1", productId: "p1",  productName: "Eau Minérale Sidi Ali 1,5L",    type: "in",  qty: 200, date: "2026-06-11", reason: "Achat BC002"  },
  { id: "sm2", productId: "p2",  productName: "Lait Centrale 1L",              type: "in",  qty: 120, date: "2026-06-12", reason: "Achat BC001"  },
  { id: "sm3", productId: "p7",  productName: "Œufs Frais (plateau 30)",       type: "in",  qty: 40,  date: "2026-06-12", reason: "Achat BC001"  },
  { id: "sm4", productId: "p2",  productName: "Lait Centrale 1L",              type: "out", qty: 2,   date: "2026-06-13", reason: "Vente VT002"  },
  { id: "sm5", productId: "p1",  productName: "Eau Minérale Sidi Ali 1,5L",    type: "out", qty: 6,   date: "2026-06-13", reason: "Vente VT001"  },
  { id: "sm6", productId: "p3",  productName: "Pain de mie Bäcker 500g",       type: "out", qty: 2,   date: "2026-06-13", reason: "Vente VT001"  },
  { id: "sm7", productId: "p6",  productName: "Riz Uncle Ben's 5kg",           type: "in",  qty: 20,  date: "2026-06-10", reason: "Achat BC003"  },
  { id: "sm8", productId: "p15", productName: "Coca-Cola 1,5L",                type: "out", qty: 24,  date: "2026-06-13", reason: "Vente VT005"  },
  { id: "sm9", productId: "p14", productName: "Savon Lux 125g",                type: "out", qty: 3,   date: "2026-06-12", reason: "Vente VT006"  },
];
