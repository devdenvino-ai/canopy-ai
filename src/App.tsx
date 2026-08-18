import { AnimatePresence, motion } from "framer-motion";
import { GraduationCap, Network, Share2, SlidersHorizontal, Users, type LucideIcon } from "lucide-react";
import { Toaster } from "sonner";
import { PersonDialog } from "./components/PersonDialog";
import { Sidebar, Topbar } from "./components/layout";
import { AppProviders, useUI, type Page } from "./lib/store";
import { cn } from "./lib/utils";
import { OverviewPage } from "./pages/Overview";
import { MembersPage } from "./pages/Members";
import { RelationshipsPage } from "./pages/Relationships";
import { MentorsPage } from "./pages/Mentors";
import { RulesPage } from "./pages/Rules";

const MOBILE_NAV: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Org", icon: Network },
  { id: "members", label: "Members", icon: Users },
  { id: "relationships", label: "Links", icon: Share2 },
  { id: "mentors", label: "Mentors", icon: GraduationCap },
  { id: "rules", label: "Rules", icon: SlidersHorizontal },
];

function Shell() {
  const { page, setPage } = useUI();

  return (
    <div className="relative flex h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-0 bg-wash" aria-hidden />
      <div className="relative z-10 hidden h-full md:block">
        <Sidebar />
      </div>
      <div className="relative z-[1] flex min-w-0 flex-1 flex-col">
        <Topbar />
        <nav className="flex items-center gap-1 border-b border-line bg-card/70 px-3 py-1.5 backdrop-blur md:hidden">
          {MOBILE_NAV.map((n) => {
            const Icon = n.icon;
            const active = page === n.id;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setPage(n.id)}
                className={cn(
                  "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-bold transition-all",
                  active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {n.label}
              </button>
            );
          })}
        </nav>
        <main className="bg-dotgrid flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1160px] px-4 py-5 sm:px-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={page}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              >
                {page === "overview" && <OverviewPage />}
                {page === "members" && <MembersPage />}
                {page === "relationships" && <RelationshipsPage />}
                {page === "mentors" && <MentorsPage />}
                {page === "rules" && <RulesPage />}
              </motion.div>
            </AnimatePresence>
            <footer className="flex items-center justify-between py-6 text-[11px] font-medium text-muted-foreground/80">
              <span>Canopy · mentorship operations for department &amp; tribe leads</span>
              <span className="font-mono">dept → tribe → member</span>
            </footer>
          </div>
        </main>
      </div>
      <PersonDialog />
      <Toaster
        position="bottom-right"
        closeButton
        toastOptions={{ style: { fontFamily: "Instrument Sans, sans-serif", fontSize: "13px" } }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProviders>
      <Shell />
    </AppProviders>
  );
}
