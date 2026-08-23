import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "sonner";
import { AppProviders } from "./lib/store";
import { Topbar } from "./components/layout";
import { usePOSStore } from "./lib/store";
import { AdminDashboard } from "./pages/AdminDashboard";
import { StoreView } from "./pages/StoreView";
import { KitchenView } from "./pages/KitchenView";
import { TableView } from "./pages/TableView";
import { ServerView } from "./pages/ServerView";

function Shell() {
  const { currentRole } = usePOSStore();

  const renderView = () => {
    switch (currentRole) {
      case "admin":
        return <AdminDashboard />;
      case "store":
        return <StoreView />;
      case "kitchen":
        return <KitchenView />;
      case "table":
        return <TableView />;
      case "server":
        return <ServerView />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-0 bg-wash" aria-hidden />
      <div className="relative z-10 flex w-full flex-col">
        <Topbar />
        <main className="bg-dotgrid flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentRole}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
            <footer className="flex items-center justify-between py-6 text-[11px] font-medium text-muted-foreground/80">
              <span>Nexus POS · Next-Gen Restaurant Management System</span>
              <span className="font-mono">v2.0.0</span>
            </footer>
          </div>
        </main>
      </div>
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
