import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Filter, X } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { usePOSStore, type MenuItem } from "../../lib/store";
import { formatCurrency } from "../../lib/utils";

const categories = ["All", "Starters", "Mains", "Desserts", "Drinks"];

export function StoreView() {
  const { menuItems, addToCart, cart, removeFromCart, updateCartQuantity, clearCart, createOrder, selectedTable, setSelectedTable, tables, isCreatingOrder, setIsCreatingOrder } = usePOSStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCreateOrder = () => {
    if (selectedTable) {
      createOrder(selectedTable.id);
    }
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Menu Section */}
      <div className="flex-1 overflow-y-auto">
        {/* Search and Filter */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Categories */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                activeCategory === category
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Card hover padding="none" className="overflow-hidden group">
                  <div className="aspect-video bg-gradient-to-br from-secondary to-muted relative overflow-hidden">
                    {!item.available && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                        <span className="text-white font-bold text-lg">Unavailable</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-white text-xs font-medium mb-1">{item.category}</p>
                      <h3 className="text-white font-bold text-lg">{item.name}</h3>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">{formatCurrency(item.price)}</span>
                      <Button
                        size="sm"
                        onClick={() => addToCart(item)}
                        disabled={!item.available}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Cart Section */}
      <div className="w-96 flex-shrink-0">
        <Card padding="lg" className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Current Order</h2>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart}>
                Clear
              </Button>
            )}
          </div>

          {/* Table Selection */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">Select Table</label>
            <div className="grid grid-cols-4 gap-2">
              {tables.slice(0, 8).map((table) => (
                <button
                  key={table.id}
                  onClick={() => setSelectedTable(table)}
                  className={`h-10 rounded-lg text-sm font-semibold transition-all ${
                    selectedTable?.id === table.id
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : table.status === "occupied"
                      ? "bg-orange-500/10 text-orange-600 border border-orange-500/30"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  T{table.number}
                </button>
              ))}
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No items in cart</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Add items from the menu</p>
              </div>
            ) : (
              cart.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                      className="h-7 w-7 rounded-md bg-card flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      -
                    </button>
                    <span className="text-sm font-semibold w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                      className="h-7 w-7 rounded-md bg-card flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Total and Checkout */}
          <div className="pt-4 border-t border-line mt-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-2xl font-bold text-foreground">{formatCurrency(cartTotal)}</span>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={handleCreateOrder}
              disabled={!selectedTable || cart.length === 0}
            >
              Send to Kitchen
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
