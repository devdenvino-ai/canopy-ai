import { motion, AnimatePresence } from "framer-motion";
import { Clock, AlertTriangle, CheckCircle, ChefHat } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { usePOSStore, type OrderStatus } from "../../lib/store";
import { formatCurrency, formatRelativeTime } from "../../lib/utils";

const priorityColors = {
  normal: "border-l-blue-500",
  urgent: "border-l-orange-500",
  vip: "border-l-purple-500",
};

const statusColors: Record<OrderStatus, string> = {
  pending: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  preparing: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  ready: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  served: "bg-gray-500/10 text-gray-600 border-gray-500/30",
  paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
};

export function KitchenView() {
  const { orders, updateOrderStatus } = usePOSStore();

  const activeOrders = orders.filter((o) => o.status !== "paid" && o.status !== "served");
  const completedToday = orders.filter((o) => o.status === "paid").length;

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "preparing": return <ChefHat className="h-4 w-4" />;
      case "ready": return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getNextStatus = (status: OrderStatus): OrderStatus | null => {
    switch (status) {
      case "pending": return "preparing";
      case "preparing": return "ready";
      case "ready": return "served";
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 sm:grid-cols-4"
      >
        {[
          { label: "Active Orders", value: activeOrders.length, icon: Clock, color: "text-orange-500" },
          { label: "Preparing", value: orders.filter((o) => o.status === "preparing").length, icon: ChefHat, color: "text-blue-500" },
          { label: "Ready to Serve", value: orders.filter((o) => o.status === "ready").length, icon: CheckCircle, color: "text-emerald-500" },
          { label: "Completed Today", value: completedToday, icon: AlertTriangle, color: "text-purple-500" },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} padding="md">
              <CardContent className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl bg-secondary flex items-center justify-center`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Kitchen Tickets Grid */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence>
          {activeOrders.map((order, index) => {
            const nextStatus = getNextStatus(order.status);
            
            return (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  padding="none"
                  className={`overflow-hidden border-l-4 ${priorityColors.normal as string} ${
                    order.status === "ready" ? "ring-2 ring-emerald-500/50" : ""
                  }`}
                >
                  <CardContent className="p-0">
                    {/* Header */}
                    <div className="p-4 border-b border-line bg-gradient-to-r from-secondary/50 to-transparent">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold text-foreground">#{order.id.split("-")[1]}</span>
                          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border bg-card">
                            Table {order.tableId.replace("t", "")}
                          </span>
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${statusColors[order.status]}`}>
                          {getStatusIcon(order.status)}
                          {order.status}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(order.createdAt)}
                        </span>
                        <span>•</span>
                        <span>{order.items.length} items</span>
                        <span>•</span>
                        <span className="font-semibold text-foreground">{formatCurrency(order.total)}</span>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="p-4 space-y-3">
                      {order.items.map((item, i) => (
                        <div key={item.id} className="flex items-start gap-3">
                          <span className="flex-shrink-0 h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                            {item.quantity}x
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-foreground">{item.name}</p>
                            {item.notes && (
                              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {item.notes}
                              </p>
                            )}
                          </div>
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                            item.status === "ready" ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/30"
                          }`}>
                            {item.status === "ready" && <CheckCircle className="h-3 w-3 text-white" />}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    {nextStatus && (
                      <div className="p-4 pt-0">
                        <Button
                          className="w-full"
                          onClick={() => updateOrderStatus(order.id, nextStatus!)}
                          variant={order.status === "ready" ? "primary" : "secondary"}
                        >
                          {order.status === "pending" && <>Mark as Preparing</>}
                          {order.status === "preparing" && <>Mark as Ready</>}
                          {order.status === "ready" && <>Mark as Served</>}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {activeOrders.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center mx-auto mb-6">
            <ChefHat className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">All Caught Up!</h3>
          <p className="text-muted-foreground">No active orders in the kitchen</p>
        </motion.div>
      )}
    </div>
  );
}
