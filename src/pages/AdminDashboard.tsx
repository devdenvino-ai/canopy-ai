import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Users, ShoppingCart, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { usePOSStore } from "../../lib/store";
import { formatCurrency } from "../../lib/utils";

const statsCards = [
  { title: "Today's Revenue", value: "$4,285", change: "+12.5%", icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { title: "Active Orders", value: "24", change: "+3", icon: ShoppingCart, color: "text-blue-500", bg: "bg-blue-500/10" },
  { title: "Tables Occupied", value: "12/20", change: "60%", icon: Users, color: "text-purple-500", bg: "bg-purple-500/10" },
  { title: "Avg Wait Time", value: "18 min", change: "-2 min", icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
];

const recentOrders = [
  { id: "#ORD-001", table: "Table 5", items: 4, total: 125, status: "completed", time: "2 min ago" },
  { id: "#ORD-002", table: "Table 3", items: 2, total: 85, status: "preparing", time: "5 min ago" },
  { id: "#ORD-003", table: "Table 8", items: 6, total: 245, status: "pending", time: "8 min ago" },
  { id: "#ORD-004", table: "Table 2", items: 3, total: 95, status: "served", time: "12 min ago" },
];

const statusColors: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-600",
  preparing: "bg-blue-500/10 text-blue-600",
  pending: "bg-orange-500/10 text-orange-600",
  served: "bg-purple-500/10 text-purple-600",
};

export function AdminDashboard() {
  const { tables, orders } = usePOSStore();

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card hover className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                      <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                      <p className="text-xs text-emerald-600 font-semibold mt-1">{stat.change}</p>
                    </div>
                    <div className={`h-12 w-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Charts and Activity Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart Placeholder */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-lg flex items-center justify-center border-2 border-dashed border-line">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Revenue chart visualization</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Alerts */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Alerts & Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { type: "warning", message: "Table 12 waiting for cleaning", time: "5m" },
                { type: "info", message: "Low stock: Truffle Oil", time: "15m" },
                { type: "success", message: "Staff shift completed", time: "1h" },
              ].map((alert, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                  <AlertCircle className={`h-5 w-5 ${alert.type === "warning" ? "text-orange-500" : alert.type === "success" ? "text-emerald-500" : "text-blue-500"}`} />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.time} ago</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order ID</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Table</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Items</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-line/50 hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-4 text-sm font-semibold text-foreground">{order.id}</td>
                      <td className="py-3 px-4 text-sm text-foreground">{order.table}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{order.items} items</td>
                      <td className="py-3 px-4 text-sm font-semibold text-foreground">{formatCurrency(order.total)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[order.status]}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{order.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
