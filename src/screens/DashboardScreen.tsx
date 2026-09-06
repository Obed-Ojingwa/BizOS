import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Order } from '@/lib/types';
import { formatCurrency, getGreeting, formatRelative } from '@/lib/format';
import { Card, Button } from '@/components/ui';
import { Plus, UserPlus, PackagePlus, CreditCard, TrendingUp, AlertTriangle, Truck, ArrowRight } from 'lucide-react';

interface DashboardData {
  todaySales: number;
  todayOrders: number;
  pendingPayments: number;
  pendingDeliveries: number;
  lowStockCount: number;
  recentOrders: Order[];
  recentPayments: Payment[];
}

interface QuickAction {
  label: string;
  icon: typeof Plus;
  color: string;
  onClick: () => void;
}

export function DashboardScreen({ onNavigate, onNewOrder, onNewCustomer, onNewProduct }: {
  onNavigate: (tab: string) => void;
  onNewOrder: () => void;
  onNewCustomer: () => void;
  onNewProduct: () => void;
}) {
  const { business } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    if (!business) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const [ordersRes, productsRes, recentOrdersRes] = await Promise.all([
      supabase.from('orders').select('total, amount_paid, delivery_status, status, created_at').eq('business_id', business.id).gte('created_at', todayIso),
      supabase.from('products').select('stock, low_stock_threshold, name').eq('business_id', business.id),
      supabase.from('orders').select('*, order_items(*), customer:customers(id,name,phone,whatsapp)').eq('business_id', business.id).order('created_at', { ascending: false }).limit(5),
    ]);

    const todayOrders = ordersRes.data ?? [];
    const todaySales = todayOrders.reduce((sum, o) => sum + (o.amount_paid || 0), 0);
    const pendingPayments = todayOrders.reduce((sum, o) => sum + (o.total - o.amount_paid), 0);
    const pendingDeliveries = todayOrders.filter((o) =>
      o.delivery_status && !['delivered', 'failed', 'returned'].includes(o.delivery_status)
    ).length;

    const products = productsRes.data ?? [];
    const lowStockCount = products.filter((p) => p.stock <= p.low_stock_threshold).length;

    setData({
      todaySales,
      todayOrders: todayOrders.length,
      pendingPayments,
      pendingDeliveries,
      lowStockCount,
      recentOrders: (recentOrdersRes.data ?? []) as Order[],
    });
    setLoading(false);
  }, [business]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const quickActions: QuickAction[] = [
    { label: 'New Order', icon: Plus, color: 'bg-emerald-600', onClick: onNewOrder },
    { label: 'Customer', icon: UserPlus, color: 'bg-blue-600', onClick: onNewCustomer },
    { label: 'Product', icon: PackagePlus, color: 'bg-amber-600', onClick: onNewProduct },
    { label: 'Payment', icon: CreditCard, color: 'bg-purple-600', onClick: () => onNavigate('orders') },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currency = business?.currency ?? '₦';

  return (
    <div className="px-4 py-6 pb-28 max-w-lg mx-auto">
      <div className="mb-6">
        <p className="text-sm text-neutral-500">{getGreeting()},</p>
        <h1 className="text-2xl font-bold text-neutral-900">{business?.name ?? 'Business'}</h1>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="p-4 bg-gradient-to-br from-emerald-600 to-emerald-700 border-none">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-100" />
            <span className="text-emerald-100 text-xs font-medium">Today's Sales</span>
          </div>
          <p className="text-white text-2xl font-bold">{formatCurrency(data?.todaySales ?? 0, currency)}</p>
        </Card>

        <Card className="p-4">
          <span className="text-neutral-500 text-xs font-medium">Orders Today</span>
          <p className="text-neutral-900 text-2xl font-bold mt-2">{data?.todayOrders ?? 0}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-amber-500" />
            <span className="text-neutral-500 text-xs font-medium">Pending Payments</span>
          </div>
          <p className="text-amber-600 text-xl font-bold">{formatCurrency(data?.pendingPayments ?? 0, currency)}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-4 h-4 text-blue-500" />
            <span className="text-neutral-500 text-xs font-medium">Pending Deliveries</span>
          </div>
          <p className="text-blue-600 text-xl font-bold">{data?.pendingDeliveries ?? 0}</p>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {(data?.lowStockCount ?? 0) > 0 && (
        <Card className="p-4 mb-6 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">Low Stock Alert</p>
              <p className="text-xs text-amber-700">{data?.lowStockCount} products need restocking</p>
            </div>
            <button onClick={() => onNavigate('products')} className="text-amber-600">
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <h2 className="text-sm font-semibold text-neutral-700 mb-3">Quick Actions</h2>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {quickActions.map((action) => (
          <button key={action.label} onClick={action.onClick} className="flex flex-col items-center gap-2">
            <div className={`w-12 h-12 rounded-2xl ${action.color} flex items-center justify-center shadow-md active:scale-95 transition-transform`}>
              <action.icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs text-neutral-600 font-medium">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Recent Activity */}
      <h2 className="text-sm font-semibold text-neutral-700 mb-3">Recent Activity</h2>
      <Card className="divide-y divide-neutral-50">
        {data?.recentOrders.length === 0 && (
          <div className="p-8 text-center text-sm text-neutral-400">
            No activity yet. Create your first order to get started.
          </div>
        )}
        {data?.recentOrders.map((order) => (
          <div key={order.id} className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Plus className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate">
                New order {order.order_number} — {order.customer?.name ?? 'Walk-in'}
              </p>
              <p className="text-xs text-neutral-500">{formatRelative(order.created_at)}</p>
            </div>
            <span className="text-sm font-semibold text-neutral-700">{formatCurrency(order.total, currency)}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
