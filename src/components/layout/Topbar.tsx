import { motion } from "framer-motion";
import { Bell, Clock, Settings, User } from "lucide-react";
import { Button } from "../ui/button";
import { RoleSwitcher } from "./RoleSwitcher";

export function Topbar() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 border-b border-line bg-card/80 backdrop-blur-xl"
    >
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight">Nexus POS</h1>
              <p className="text-xs text-muted-foreground">Restaurant Management</p>
            </div>
          </div>
        </div>

        <div className="hidden md:block">
          <RoleSwitcher />
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive animate-pulse" />
          </Button>
          
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
          
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent to-orange-600 flex items-center justify-center cursor-pointer shadow-md">
            <User className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>

      {/* Mobile Role Switcher */}
      <div className="md:hidden px-4 pb-3">
        <RoleSwitcher />
      </div>
    </motion.header>
  );
}
