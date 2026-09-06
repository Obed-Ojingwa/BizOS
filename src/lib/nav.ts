import { Home, Users, ShoppingBag, Package, Settings } from 'lucide-react';

export type Tab = 'dashboard' | 'customers' | 'orders' | 'products' | 'settings';

export const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'settings', label: 'Settings', icon: Settings },
];
