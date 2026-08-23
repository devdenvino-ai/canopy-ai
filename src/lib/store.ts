import { create } from "zustand";
import type { ReactNode } from "react";

export type UserRole = "admin" | "store" | "kitchen" | "table" | "server";
export type OrderStatus = "pending" | "preparing" | "ready" | "served" | "paid";
export type TableStatus = "available" | "occupied" | "reserved" | "cleaning";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  available: boolean;
  prepTime: number;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  status: OrderStatus;
}

export interface Order {
  id: string;
  tableId: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  serverId?: string;
  total: number;
}

export interface Table {
  id: string;
  number: number;
  capacity: number;
  status: TableStatus;
  currentOrder?: Order;
  x: number;
  y: number;
}

export interface Server {
  id: string;
  name: string;
  avatar?: string;
  activeTables: number;
}

export interface KitchenTicket {
  id: string;
  orderId: string;
  tableNumber: number;
  items: OrderItem[];
  createdAt: Date;
  priority: "normal" | "urgent" | "vip";
}

interface POSState {
  currentRole: UserRole;
  currentPage: string;
  menuItems: MenuItem[];
  tables: Table[];
  orders: Order[];
  servers: Server[];
  selectedTable: Table | null;
  selectedOrder: Order | null;
  isCreatingOrder: boolean;
  cart: OrderItem[];
  setCurrentRole: (role: UserRole) => void;
  setCurrentPage: (page: string) => void;
  setSelectedTable: (table: Table | null) => void;
  setSelectedOrder: (order: Order | null) => void;
  setIsCreatingOrder: (creating: boolean) => void;
  addToCart: (item: MenuItem) => void;
  removeFromCart: (itemId: string) => void;
  updateCartQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  createOrder: (tableId: string) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateTableStatus: (tableId: string, status: TableStatus) => void;
}

const mockMenuItems: MenuItem[] = [
  { id: "1", name: "Truffle Burger", description: "Wagyu beef, truffle aioli, aged cheddar", price: 24, category: "Mains", available: true, prepTime: 15 },
  { id: "2", name: "Lobster Risotto", description: "Maine lobster, saffron, parmesan crisp", price: 38, category: "Mains", available: true, prepTime: 20 },
  { id: "3", name: "Caesar Salad", description: "Romaine hearts, anchovy dressing, sourdough croutons", price: 16, category: "Starters", available: true, prepTime: 8 },
  { id: "4", name: "Tuna Tartare", description: "Yellowfin tuna, avocado, sesame crisps", price: 22, category: "Starters", available: true, prepTime: 10 },
  { id: "5", name: "Chocolate Soufflé", description: "70% dark chocolate, vanilla bean ice cream", price: 14, category: "Desserts", available: true, prepTime: 18 },
  { id: "6", name: "Crème Brûlée", description: "Madagascar vanilla, caramelized sugar", price: 12, category: "Desserts", available: true, prepTime: 5 },
  { id: "7", name: "Old Fashioned", description: "Bourbon, angostura bitters, orange peel", price: 16, category: "Drinks", available: true, prepTime: 5 },
  { id: "8", name: "Negroni", description: "Gin, campari, sweet vermouth", price: 15, category: "Drinks", available: true, prepTime: 5 },
  { id: "9", name: "Sparkling Water", description: "San Pellegrino, 750ml", price: 8, category: "Drinks", available: true, prepTime: 2 },
  { id: "10", name: "Foie Gras", description: "Pan-seared, fig compote, brioche", price: 28, category: "Starters", available: false, prepTime: 12 },
];

const mockTables: Table[] = [
  { id: "t1", number: 1, capacity: 2, status: "available", x: 100, y: 100 },
  { id: "t2", number: 2, capacity: 4, status: "occupied", x: 250, y: 100, currentOrder: { id: "o1", tableId: "t2", items: [], status: "preparing", createdAt: new Date(), updatedAt: new Date(), total: 85 } },
  { id: "t3", number: 3, capacity: 4, status: "available", x: 400, y: 100 },
  { id: "t4", number: 4, capacity: 6, status: "reserved", x: 100, y: 250 },
  { id: "t5", number: 5, capacity: 8, status: "occupied", x: 300, y: 250, currentOrder: { id: "o2", tableId: "t5", items: [], status: "ready", createdAt: new Date(), updatedAt: new Date(), total: 245 } },
  { id: "t6", number: 6, capacity: 2, status: "cleaning", x: 500, y: 250 },
  { id: "t7", number: 7, capacity: 4, status: "available", x: 150, y: 400 },
  { id: "t8", number: 8, capacity: 10, status: "available", x: 350, y: 400 },
];

const mockServers: Server[] = [
  { id: "s1", name: "Emma Wilson", avatar: "EW", activeTables: 3 },
  { id: "s2", name: "Marcus Chen", avatar: "MC", activeTables: 2 },
  { id: "s3", name: "Sofia Rodriguez", avatar: "SR", activeTables: 4 },
  { id: "s4", name: "James Park", avatar: "JP", activeTables: 1 },
];

export const usePOSStore = create<POSState>((set, get) => ({
  currentRole: "admin",
  currentPage: "dashboard",
  menuItems: mockMenuItems,
  tables: mockTables,
  orders: [],
  servers: mockServers,
  selectedTable: null,
  selectedOrder: null,
  isCreatingOrder: false,
  cart: [],
  
  setCurrentRole: (role) => set({ currentRole: role }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setSelectedTable: (table) => set({ selectedTable: table }),
  setSelectedOrder: (order) => set({ selectedOrder: order }),
  setIsCreatingOrder: (creating) => set({ isCreatingOrder: creating }),
  
  addToCart: (item) => {
    const { cart } = get();
    const existing = cart.find((i) => i.menuItemId === item.id);
    if (existing) {
      set({
        cart: cart.map((i) =>
          i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
      });
    } else {
      set({
        cart: [
          ...cart,
          {
            id: `cart-${Date.now()}`,
            menuItemId: item.id,
            name: item.name,
            quantity: 1,
            price: item.price,
            status: "pending",
          },
        ],
      });
    }
  },
  
  removeFromCart: (itemId) => {
    set({ cart: get().cart.filter((i) => i.id !== itemId) });
  },
  
  updateCartQuantity: (itemId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(itemId);
      return;
    }
    set({
      cart: get().cart.map((i) =>
        i.id === itemId ? { ...i, quantity } : i
      ),
    });
  },
  
  clearCart: () => set({ cart: [] }),
  
  createOrder: (tableId) => {
    const { cart, tables } = get();
    const table = tables.find((t) => t.id === tableId);
    if (!table || cart.length === 0) return;
    
    const newOrder: Order = {
      id: `order-${Date.now()}`,
      tableId,
      items: [...cart],
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
      total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    };
    
    set({
      orders: [...get().orders, newOrder],
      tables: tables.map((t) =>
        t.id === tableId ? { ...t, status: "occupied" as TableStatus, currentOrder: newOrder } : t
      ),
      cart: [],
      isCreatingOrder: false,
    });
  },
  
  updateOrderStatus: (orderId, status) => {
    const { orders, tables } = get();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    
    set({
      orders: orders.map((o) =>
        o.id === orderId ? { ...o, status, updatedAt: new Date() } : o
      ),
      tables: order.status === "paid" 
        ? tables.map((t) =>
            t.currentOrder?.id === orderId ? { ...t, status: "cleaning" as TableStatus, currentOrder: undefined } : t
          )
        : tables,
    });
  },
  
  updateTableStatus: (tableId, status) => {
    set({
      tables: get().tables.map((t) =>
        t.id === tableId ? { ...t, status } : t
      ),
    });
  },
}));
