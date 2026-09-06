import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, Button, Input, Textarea, Select, PageHeader } from '@/components/ui';
import { formatCurrency } from '@/lib/format';
import { LogOut, Store, Bell, CreditCard, Truck, MessageCircle, ChevronRight } from 'lucide-react';

export function SettingsScreen() {
  const { user, business, signOut, refreshBusiness } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(business?.name ?? '');
  const [phone, setPhone] = useState(business?.phone ?? '');
  const [whatsapp, setWhatsapp] = useState(business?.whatsapp ?? '');
  const [address, setAddress] = useState(business?.address ?? '');
  const [currency, setCurrency] = useState(business?.currency ?? '₦');
  const [paymentInfo, setPaymentInfo] = useState(business?.payment_info ?? '');
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<{ customers: number; products: number; orders: number; outstanding: number } | null>(null);

  const fetchStats = async () => {
    if (!business) return;
    const [customers, products, orders] = await Promise.all([
      supabase.from('customers').select('id', { count: 'exact', head: true }).eq('business_id', business.id),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('business_id', business.id),
      supabase.from('orders').select('total, amount_paid').eq('business_id', business.id),
    ]);
    const outstanding = (orders.data ?? []).reduce((sum, o) => sum + (o.total - o.amount_paid), 0);
    setStats({
      customers: customers.count ?? 0,
      products: products.count ?? 0,
      orders: orders.data?.length ?? 0,
      outstanding,
    });
  };

  useEffect(() => {
    fetchStats();
  }, [business?.id]);

  const handleSave = async () => {
    if (!business) return;
    setSaving(true);
    await supabase.from('businesses').update({
      name,
      phone: phone || null,
      whatsapp: whatsapp || null,
      address: address || null,
      currency,
      payment_info: paymentInfo || null,
    }).eq('id', business.id);
    setSaving(false);
    setEditing(false);
    await refreshBusiness();
  };

  const currencySymbol = business?.currency ?? '₦';

  return (
    <div className="px-4 py-6 pb-28 max-w-lg mx-auto">
      <PageHeader title="Settings" />

      {/* Business Profile */}
      <Card className="p-5 mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center">
            <Store className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-neutral-900">{business?.name}</h2>
            <p className="text-sm text-neutral-500">{user?.email}</p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-neutral-50 rounded-xl p-3 text-center">
              <p className="text-xs text-neutral-500">Customers</p>
              <p className="text-xl font-bold text-neutral-900">{stats.customers}</p>
            </div>
            <div className="bg-neutral-50 rounded-xl p-3 text-center">
              <p className="text-xs text-neutral-500">Products</p>
              <p className="text-xl font-bold text-neutral-900">{stats.products}</p>
            </div>
            <div className="bg-neutral-50 rounded-xl p-3 text-center">
              <p className="text-xs text-neutral-500">Orders</p>
              <p className="text-xl font-bold text-neutral-900">{stats.orders}</p>
            </div>
            <div className="bg-neutral-50 rounded-xl p-3 text-center">
              <p className="text-xs text-neutral-500">Outstanding</p>
              <p className="text-xl font-bold text-amber-600">{formatCurrency(stats.outstanding, currencySymbol)}</p>
            </div>
          </div>
        )}

        {!editing ? (
          <Button variant="secondary" className="w-full" onClick={() => setEditing(true)}>Edit Business Profile</Button>
        ) : (
          <div className="space-y-3">
            <Input label="Business Name" value={name} onChange={setName} />
            <Input label="Phone" value={phone} onChange={setPhone} type="tel" placeholder="+234..." />
            <Input label="WhatsApp" value={whatsapp} onChange={setWhatsapp} type="tel" placeholder="+234..." />
            <Textarea label="Address" value={address} onChange={setAddress} rows={2} />
            <Select
              label="Currency"
              value={currency}
              onChange={setCurrency}
              options={[
                { value: '₦', label: '₦ (Naira)' },
                { value: '$', label: '$ (Dollar)' },
                { value: '£', label: '£ (Pound)' },
                { value: '€', label: '€ (Euro)' },
                { value: '₵', label: '₵ (Cedi)' },
                { value: 'KSh', label: 'KSh (Shilling)' },
              ]}
            />
            <Textarea label="Payment Information" value={paymentInfo} onChange={setPaymentInfo} placeholder="Bank details for customers" rows={3} />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setEditing(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Feature Settings (placeholder for future) */}
      <div className="space-y-2 mb-4">
        <SettingsRow icon={<Bell className="w-5 h-5" />} title="Notifications" subtitle="Order, payment & stock alerts" />
        <SettingsRow icon={<MessageCircle className="w-5 h-5" />} title="Message Templates" subtitle="WhatsApp message templates" />
        <SettingsRow icon={<CreditCard className="w-5 h-5" />} title="Payment Methods" subtitle="Configure accepted payments" />
        <SettingsRow icon={<Truck className="w-5 h-5" />} title="Delivery Settings" subtitle="Dispatch & delivery preferences" />
      </div>

      <Button variant="danger" className="w-full" onClick={signOut}>
        <LogOut className="w-4 h-4 mr-2" /> Sign Out
      </Button>

      <p className="text-center text-xs text-neutral-400 mt-6">BizOS v1.0 — WhatsApp Business OS</p>
    </div>
  );
}

function SettingsRow({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <Card className="p-4 flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-transform">
      <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-500">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-neutral-900">{title}</p>
        <p className="text-xs text-neutral-500">{subtitle}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-neutral-300" />
    </Card>
  );
}
