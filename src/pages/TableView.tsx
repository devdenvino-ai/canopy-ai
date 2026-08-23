import { motion } from "framer-motion";
import { Users, Clock, DollarSign, Wifi } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { usePOSStore } from "../../lib/store";
import { formatCurrency } from "../../lib/utils";

export function TableView() {
  const { tables, setSelectedTable, selectedTable } = usePOSStore();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "from-emerald-500 to-green-600 shadow-emerald-500/30";
      case "occupied": return "from-orange-500 to-red-600 shadow-orange-500/30";
      case "reserved": return "from-blue-500 to-indigo-600 shadow-blue-500/30";
      case "cleaning": return "from-gray-400 to-gray-500 shadow-gray-500/30";
      default: return "from-gray-400 to-gray-500";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "available": return "bg-emerald-500/10 border-emerald-500/30";
      case "occupied": return "bg-orange-500/10 border-orange-500/30";
      case "reserved": return "bg-blue-500/10 border-blue-500/30";
      case "cleaning": return "bg-gray-500/10 border-gray-500/30";
      default: return "bg-secondary";
    }
  };

  const availableTables = tables.filter((t) => t.status === "available").length;
  const occupiedTables = tables.filter((t) => t.status === "occupied").length;
  const totalRevenue = tables.reduce((sum, t) => sum + (t.currentOrder?.total || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 sm:grid-cols-4"
      >
        <Card padding="md">
          <CardContent className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Available</p>
              <p className="text-2xl font-bold text-foreground">{availableTables}</p>
            </div>
          </CardContent>
        </Card>

        <Card padding="md">
          <CardContent className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Occupied</p>
              <p className="text-2xl font-bold text-foreground">{occupiedTables}</p>
            </div>
          </CardContent>
        </Card>

        <Card padding="md">
          <CardContent className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Revenue</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>

        <Card padding="md">
          <CardContent className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Wifi className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">WiFi Code</p>
              <p className="text-lg font-bold text-foreground">NEXUS2024</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Floor Plan */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Interactive Floor Map */}
        <div className="lg:col-span-2">
          <Card padding="lg">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-foreground">Floor Plan</h2>
              <p className="text-sm text-muted-foreground">Tap a table to view details</p>
            </div>

            <div className="relative aspect-video bg-gradient-to-br from-secondary/30 to-muted/30 rounded-xl border-2 border-dashed border-line overflow-hidden">
              {/* Restaurant Layout Decorations */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-16 w-32 bg-gradient-to-b from-line/50 to-transparent rounded-b-full" />
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-line/30 to-transparent" />
              
              {/* Tables Grid */}
              <div className="absolute inset-8 grid grid-cols-4 gap-6">
                {tables.map((table, index) => (
                  <motion.button
                    key={table.id}
                    layout
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedTable(table)}
                    className={`relative rounded-2xl border-2 transition-all duration-300 ${getStatusBg(table.status)} ${
                      selectedTable?.id === table.id ? "ring-4 ring-primary ring-offset-2" : "hover:scale-105"
                    }`}
                  >
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${getStatusColor(table.status)} opacity-10`} />
                    
                    <div className="relative p-4 text-center">
                      <div className={`mx-auto mb-2 h-12 w-12 rounded-full bg-gradient-to-br ${getStatusColor(table.status)} shadow-lg flex items-center justify-center`}>
                        <span className="text-white font-bold text-lg">{table.number}</span>
                      </div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">{table.status}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{table.capacity} seats</p>
                      
                      {table.currentOrder && (
                        <div className="mt-2 pt-2 border-t border-line/50">
                          <p className="text-xs font-bold text-primary">{formatCurrency(table.currentOrder.total)}</p>
                        </div>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Legend */}
              <div className="absolute bottom-4 left-4 flex gap-3">
                {[
                  { status: "available", label: "Available" },
                  { status: "occupied", label: "Occupied" },
                  { status: "reserved", label: "Reserved" },
                  { status: "cleaning", label: "Cleaning" },
                ].map((item) => (
                  <div key={item.status} className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${getStatusColor(item.status).split(" ")[0].replace("from-", "bg-")}`} />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Selected Table Details */}
        <div>
          <Card padding="lg" className="h-full">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-foreground">Table Details</h2>
            </div>

            {selectedTable ? (
              <motion.div
                key={selectedTable.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className={`p-4 rounded-xl bg-gradient-to-br ${getStatusColor(selectedTable.status)} text-white`}>
                  <p className="text-sm opacity-80">Table {selectedTable.number}</p>
                  <p className="text-2xl font-bold capitalize">{selectedTable.status}</p>
                  <p className="text-sm opacity-80 mt-1">{selectedTable.capacity} person capacity</p>
                </div>

                {selectedTable.currentOrder ? (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Current Order</h3>
                    <div className="p-3 rounded-lg bg-secondary/50 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Order ID</span>
                        <span className="font-semibold text-foreground">#{selectedTable.currentOrder.id.split("-")[1]}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Items</span>
                        <span className="font-semibold text-foreground">{selectedTable.currentOrder.items.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-bold text-primary">{formatCurrency(selectedTable.currentOrder.total)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary capitalize">
                          {selectedTable.currentOrder.status}
                        </span>
                      </div>
                    </div>
                    <Button className="w-full" variant="outline">
                      View Full Order
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium">No active order</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Table is {selectedTable.status}</p>
                    {selectedTable.status === "available" && (
                      <Button className="w-full mt-4">Start New Order</Button>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="text-center py-12">
                <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">Select a table</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Tap on any table to view details</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
