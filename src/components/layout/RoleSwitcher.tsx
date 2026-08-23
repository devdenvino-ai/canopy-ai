import { BadgeCheck, ChefHat, LayoutGrid, Monitor, Users, type LucideIcon } from "lucide-react";
import { usePOSStore, type UserRole } from "../lib/store";
import { cn } from "../lib/utils";

const roles: { id: UserRole; label: string; icon: LucideIcon; color: string }[] = [
  { id: "admin", label: "Admin", icon: Monitor, color: "bg-primary text-primary-foreground" },
  { id: "store", label: "Store", icon: LayoutGrid, color: "bg-accent text-accent-foreground" },
  { id: "kitchen", label: "Kitchen", icon: ChefHat, color: "bg-orange-500 text-white" },
  { id: "server", label: "Server", icon: Users, color: "bg-blue-500 text-white" },
  { id: "table", label: "Table", icon: BadgeCheck, color: "bg-emerald-500 text-white" },
];

export function RoleSwitcher() {
  const { currentRole, setCurrentRole } = usePOSStore();

  return (
    <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-1.5">
      {roles.map((role) => {
        const Icon = role.icon;
        const isActive = currentRole === role.id;
        
        return (
          <button
            key={role.id}
            onClick={() => setCurrentRole(role.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
              isActive 
                ? `${role.color} shadow-lg` 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{role.label}</span>
          </button>
        );
      })}
    </div>
  );
}
