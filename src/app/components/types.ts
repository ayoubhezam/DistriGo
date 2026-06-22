// ─── Navigation ───────────────────────────────────────────────────────────────
export type Screen =
  | "dashboard"
  | "products"
  | "pos"
  | "purchases"
  | "stock"
  | "scanner"
  | "settings"
  | "customers"
  | "tournee"
  | "fournisseur";


// ─── Product ──────────────────────────────────────────────────────────────────
export interface Product {
  id            : string;
  name          : string;
  category      : string;
  barcode       : string;
  sellingPrice  : number;
  purchasePrice : number;
  stock         : number;   // = stockEntrepot + Σ stockCamion (total)
  stockEntrepot : number;   // ce qui est dans l'entrepôt
  minStock      : number;
  supplier      : string;
  unit          : string;
}

// ─── Cart ─────────────────────────────────────────────────────────────────────
export interface CartItem {
  product : Product;
  qty     : number;
}

// ─── Invoice ──────────────────────────────────────────────────────────────────
export type InvoiceStatus = "paid" | "partial" | "unpaid";

export interface InvoiceItem {
  productId   : string;
  productName : string;
  qty         : number;
  unitPrice   : number;
}

export interface Invoice {
  id           : string;
  date         : string;
  customerId   : string;
  customerName : string;
  items        : InvoiceItem[];
  total        : number;
  paid         : number;
  status       : InvoiceStatus;
  posRef?      : string;
  tourneeId?   : string;   // lien vers la tournée si vente en tournée
  notes?       : string;
}

// ─── Payment ──────────────────────────────────────────────────────────────────
export type PaymentMethod = "cash" | "card" | "bank_transfer" | "cheque";

export interface Payment {
  id          : string;
  date        : string;
  customerId  : string;
  amount      : number;
  method      : PaymentMethod;
  invoiceId?  : string;
  note?       : string;
}

// ─── Activity ─────────────────────────────────────────────────────────────────
export type ActivityType = "invoice" | "payment" | "credit_update" | "note";

export interface ActivityEntry {
  id         : string;
  date       : string;
  type       : ActivityType;
  label      : string;
  amount?    : number;
  invoiceId? : string;
  paymentId? : string;
}

// ─── Customer ─────────────────────────────────────────────────────────────────
export type CustomerType = "retail" | "wholesale" | "business";

export interface Customer {
  id                 : string;
  name               : string;
  phone              : string;
  phone2?            : string;
  address            : string;
  email?             : string;
  coordinates?       : { lat: number; lng: number };
  customerType       : CustomerType;
  taxId?             : string;
  openingBalance     : number;
  openingBalanceDate?: string;
  balance            : number;
  creditLimit        : number;
  notes?             : string;
  imageUri?          : string;
  invoices?          : Invoice[];
  payments?          : Payment[];
  activity?          : ActivityEntry[];
}

// ─── Supplier ─────────────────────────────────────────────────────────────────
export interface Supplier {
  id      : string;
  name    : string;
  phone   : string;
  email   : string;
  address : string;
}

// ─── Purchase Order ───────────────────────────────────────────────────────────
export interface PurchaseOrder {
  id           : string;
  supplierId   : string;
  supplierName : string;
  date         : string;
  items        : { productId: string; productName: string; qty: number; unitCost: number }[];
  total        : number;
  status       : "pending" | "received";
}

// ─── Sale Record ──────────────────────────────────────────────────────────────
export interface SaleRecord {
  id           : string;
  date         : string;
  customerId   : string;
  customerName : string;
  items        : { name: string; qty: number; price: number }[];
  total        : number;
  payment      : "cash" | "card" | "credit";
}

// ─── Stock Movement ───────────────────────────────────────────────────────────
export interface StockMovement {
  id          : string;
  productId   : string;
  productName : string;
  type        : "in" | "out" | "chargement" | "retour";
  qty         : number;
  date        : string;
  reason      : string;
  camionId?   : string;
  tourneeId?  : string;
}

// ══════════════════════════════════════════════════════════════════════════════
// TOURNÉE — nouveaux types
// ══════════════════════════════════════════════════════════════════════════════

// ─── Camion ───────────────────────────────────────────────────────────────────
export interface Camion {
  id       : string;
  nom      : string;        // ex: "Camion 01"
  immat?   : string;        // numéro d'immatriculation
  marque?  : string;        // ex: "Mercedes", "Renault"
  actif    : boolean;       // disponible ou en panne
}

// ─── Chauffeur ────────────────────────────────────────────────────────────────
export interface Chauffeur {
  id      : string;
  nom     : string;
  prenom  : string;
  phone?  : string;
  actif   : boolean;
}

// ─── Chargement item — ce qu'on charge dans le camion ────────────────────────
export interface ChargementItem {
  productId   : string;
  productName : string;
  qty         : number;     // quantité chargée (en unité stockée: pièce ou carton)
  unitPrice   : number;     // prix de vente unitaire au moment du chargement
}

// ─── Vente tournée — une vente faite pendant la tournée ──────────────────────
export type TourneePayment = "cash" | "credit";  // pendant la tournée: cash ou à crédit

export interface TourneeVente {
  id           : string;
  customerId   : string;
  customerName : string;
  items        : { productId: string; productName: string; qty: number; unitPrice: number }[];
  total        : number;
  paiement     : TourneePayment;
  heure        : string;   // ex: "10:35"
}

// ─── Retour item — ce qui revient au dépôt en fin de journée ─────────────────
export interface RetourItem {
  productId   : string;
  productName : string;
  qtyCharge   : number;   // quantité chargée le matin
  qtyVendu    : number;   // quantité vendue pendant la tournée
  qtyRetour   : number;   // = qtyCharge - qtyVendu (calculé ou saisi manuellement)
}

// ─── Stock Camion — snapshot du stock dans chaque camion ─────────────────────
export interface StockCamionItem {
  camionId  : string;
  productId : string;
  qty       : number;
}

// ─── Tournée ──────────────────────────────────────────────────────────────────
export type TourneeStatut =
  | "planifiee"    // créée mais pas encore démarrée
  | "en_cours"     // chargement fait, en route
  | "terminee";    // clôturée, retours enregistrés

export interface Tournee {
  id           : string;
  date         : string;           // ex: "2026-06-20"
  camionId     : string;
  camionNom    : string;
  chauffeurId? : string;
  chauffeurNom?: string;
  statut       : TourneeStatut;

  // Étape 1 — chargement
  chargement   : ChargementItem[];
  heureDepart? : string;           // ex: "07:30"

  // Étape 2 — ventes pendant la tournée
  ventes       : TourneeVente[];

  // Étape 3 — retour & clôture
  retours      : RetourItem[];
  heureRetour? : string;           // ex: "18:00"

  // Résumé financier (calculé à la clôture)
  totalVentes?     : number;
  totalCash?       : number;       // encaissé en cash
  totalCredit?     : number;       // laissé à crédit
  nbClients?       : number;       // nombre de clients visités

  notes?       : string;
}