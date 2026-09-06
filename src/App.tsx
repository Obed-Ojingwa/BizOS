import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuthScreen } from '@/screens/AuthScreen';
import { BusinessSetupScreen } from '@/screens/BusinessSetupScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { CustomersScreen } from '@/screens/CustomersScreen';
import { ProductsScreen } from '@/screens/ProductsScreen';
import { OrdersScreen } from '@/screens/OrdersScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { TABS, Tab } from '@/lib/nav';
import { MessageCircle } from 'lucide-react';

export default function App() {
  const { user, business, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [createOrder, setCreateOrder] = useState(false);
  const [createCustomer, setCreateCustomer] = useState(false);
  const [createProduct, setCreateProduct] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-600">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-white/15 flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (!business) {
    return <BusinessSetupScreen />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 max-w-md mx-auto relative">
      <div key={tab + String(createOrder) + String(createCustomer) + String(createProduct)}>
        {tab === 'dashboard' && (
          <DashboardScreen
            onNavigate={(t) => setTab(t as Tab)}
            onNewOrder={() => { setTab('orders'); setCreateOrder(true); }}
            onNewCustomer={() => { setTab('customers'); setCreateCustomer(true); }}
            onNewProduct={() => { setTab('products'); setCreateProduct(true); }}
          />
        )}
        {tab === 'customers' && <CustomersScreen key={createCustomer ? 'c' : 'n'} />}
        {tab === 'orders' && <OrdersScreen key={createOrder ? 'c' : 'n'} />}
        {tab === 'products' && <ProductsScreen key={createProduct ? 'c' : 'n'} />}
        {tab === 'settings' && <SettingsScreen />}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-neutral-100 px-2 py-2 z-30">
        <div className="flex items-center justify-around">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                  active ? 'text-emerald-600' : 'text-neutral-400'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
