import { Screen } from "./types";
import {
  LayoutDashboard, Package, ShoppingCart,
  Truck, BarChart3, ScanLine, Settings, Users, MapPin,Building2
} from "lucide-react";

interface Props {
  current   : Screen;
  onNavigate: (s: Screen) => void;
}

const TABS: { id: Screen; label: string; icon: React.FC<{ size?: number; strokeWidth?: number }> }[] = [
  { id: "dashboard", label: "Tableau",    icon: LayoutDashboard },
  { id: "pos",       label: "Vente",      icon: ShoppingCart    },
  { id: "products",  label: "Produits",   icon: Package         },
  { id: "customers", label: "Clients",    icon: Users           },
  { id: "tournee",   label: "Tournées",   icon: MapPin          }, // ✅ أضيفت هنا
  { id: "purchases", label: "Achats",     icon: Truck           },
  { id: "stock",     label: "Stock",      icon: BarChart3       },
  { id: "fournisseur", label: "Fournisseurs",icon: Building2       }, // ← أضف هذا السطر

  { id: "scanner",   label: "Scanner",    icon: ScanLine        },
  { id: "settings",  label: "Paramètres", icon: Settings        },
];

export function BottomNav({ current, onNavigate }: Props) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 border-t border-border z-50"
      style={{
        background: "var(--card)",
        maxWidth: 480, margin: "0 auto",
        left: "50%", transform: "translateX(-50%)", width: "100%",
      }}
    >
      {/* Scrollable tab row — fits all tabs without crowding */}
      <div
        className="flex items-center h-16 overflow-x-auto scrollbar-hide"
        style={{ paddingLeft: 4, paddingRight: 4 }}
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = current === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className="flex flex-col items-center gap-0.5 flex-shrink-0 h-full justify-center transition-colors relative"
              style={{
                color    : active ? "var(--primary)" : "var(--muted-foreground)",
                minWidth : 60,
                flex     : "1 0 60px",
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{
                fontSize  : "9px",
                fontWeight: active ? 600 : 400,
                lineHeight: 1.2,
                textAlign : "center",
              }}>
                {label}
              </span>
              {active && (
                <span
                  className="absolute bottom-0 h-0.5 w-10 rounded-t-full"
                  style={{ background: "var(--primary)" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}