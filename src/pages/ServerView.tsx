import { motion } from "framer-motion";
import { Users, Clock, DollarSign, Plus, CheckCircle } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { usePOSStore } from "../../lib/store";
import { formatCurrency, formatRelativeTime } from "../../lib/utils";

export function ServerView() {
  const { tables, servers, orders, updateOrderStatus } = usePOSStore();

  const myTables = tables.filter((t) => t.status === "occupied" || t.status === "reserved");
  const pendingOrders = orders.filter((o) => o.status === "ready");

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 sm:grid-cols-4"
      >
        <Card padding="md">
          <CardContent className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">My Tables</p>
              <p className="text-2xl font-bold text-foreground">{myTables.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card padding="md">
          <CardContent className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Sales</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(myTables.reduce((sum, t) => sum + (t.currentOrder?.total || 0), 0))}</p>
            </div>
          </CardContent>
        </Card>

        <Card padding="md">
          <CardContent className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ready Orders</p>
              <p className="text-2xl font-bold text-foreground">{pendingOrders.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card padding="md">
          <CardContent className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-foreground">{orders.filter((o) => o.status === "paid").length}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* My Tables */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">My Tables</h2>
              <p className="text-sm text-muted-foreground">Manage your assigned tables</p>
            </div>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              New Order
            </Button>
          </div>

          <div className="space-y-3">
            {myTables.map((table, index) => (
              <motion.div
                key={table.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card hover padding="md" className="cursor-pointer">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${
                          table.status === "occupied" 
                            ? "from-orange-500 to-red-600 shadow-lg shadow-orange-500/30"
                            : "from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30"
                        } flex items-center justify-center`}>
                          <span className="text-white font-bold text-xl">{table.number}</span>
                        </div>
                        <div>
                          <p className="font-bold text-foreground">Table {table.number}</p>
                          <p className="text-sm text-muted-foreground capitalize">{table.status}</p>
                          {table.currentOrder && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {table.currentOrder.items.length} items • {formatCurrency(table.currentOrder.total)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {table.currentOrder && (
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                            table.currentOrder.status === "ready"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                          }`}>
                            {table.currentOrder.status}
                          </span>
                        )}
                        <Button size="sm" variant="outline">
                          Manage
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Ready to Serve */}
        <Card padding="lg">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-foreground">Ready to Serve</h2>
            <p className="text-sm text-muted-foreground">Orders ready for delivery</p>
          </div>

          {pendingOrders.length > 0 ? (
            <div className="space-y-3">
              {pendingOrders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border-l-4 border-l-emerald-500" padding="md">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold text-foreground">#{order.id.split("-")[1]}</span>
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                            READY
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Table {order.tableId.replace("t", "")}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        {order.items.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex items-center gap-3 text-sm">
                            <span className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {item.quantity}x
                            </span>
                            <span className="text-foreground">{item.name}</span>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <p className="text-xs text-muted-foreground pl-9">+{order.items.length - 3} more items</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-line">
                        <div>
                          <p className="text-xs text-muted-foreground">Ready {formatRelativeTime(order.updatedAt)}</p>
                          <p className="text-lg font-bold text-primary">{formatCurrency(order.total)}</p>
                        </div>
                        <Button onClick={() => updateOrderStatus(order.id, "served")}>
                          Mark as Served
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500/10 to-green-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">All Caught Up!</h3>
              <p className="text-muted-foreground">No orders waiting to be served</p>
            </div>
          )}
        </Card>
      </div>

      {/* Team Section */}
      <Card padding="lg">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-foreground">Team Members</h2>
          <p className="text-sm text-muted-foreground">Active servers on shift</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {servers.map((server, index) => (
            <motion.div
              key={server.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card hover padding="md">
                <CardContent className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold">{server.avatar}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{server.name}</p>
                    <p className="text-xs text-muted-foreground">{server.activeTables} active tables</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}
