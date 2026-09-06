import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Customer, Order } from '@/lib/types';
import { formatCurrency, initials, formatRelative } from '@/lib/format';
import { Card, Button, Input, Textarea, FAB, EmptyState, Badge, PageHeader, Modal, Select } from '@/components/ui';
import { Users, UserPlus, Phone, MessageCircle, Plus, ArrowLeft } from 'lucide-react';

const TAG_OPTIONS = ['VIP', 'Regular', 'Wholesale', 'New', 'Credit', 'Returning'];

export function CustomersScreen() {
  const { business } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [selected, setSelected] = useState<Customer | null>(null);

  const fetchCustomers = useCallback(async () => {
    if (!business) return;
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });
    setCustomers((data ?? []) as Customer[]);
    setLoading(false);
  }, [business]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search)
  );

  if (selected) {
    return <CustomerDetail customer={selected} onBack={() => { setSelected(null); fetchCustomers(); }} />;
  }

  return (
    <div className="px-4 py-6 pb-28 max-w-lg mx-auto">
      <PageHeader title="Customers" subtitle={`${customers.length} total`} />

      <div className="mb-4">
        <Input value={search} onChange={setSearch} placeholder="Search by name or phone..." />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No customers yet"
          subtitle="Add your first customer to start tracking orders and payments."
          action={<Button onClick={() => { setEditing(null); setShowForm(true); }}><UserPlus className="w-4 h-4 mr-2" /> Add Customer</Button>}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((customer) => (
            <Card key={customer.id} className="p-4 active:scale-[0.99] transition-transform cursor-pointer" >
              <div onClick={() => setSelected(customer)} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-emerald-700 font-bold text-sm">{initials(customer.name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-neutral-900 truncate">{customer.name}</p>
                    {customer.tags.includes('VIP') && <Badge color="amber">VIP</Badge>}
                  </div>
                  <p className="text-sm text-neutral-500 truncate">{customer.phone ?? 'No phone'}</p>
                </div>
                <ArrowLeft className="w-4 h-4 text-neutral-300 rotate-180" />
              </div>
            </Card>
          ))}
        </div>
      )}

      <FAB onClick={() => { setEditing(null); setShowForm(true); }} icon={<Plus className="w-6 h-6" />} />

      {showForm && (
        <CustomerForm
          customer={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchCustomers(); }}
        />
      )}
    </div>
  );
}

function CustomerDetail({ customer, onBack }: { customer: Customer; onBack: () => void }) {
  const { business } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });
      setOrders((data ?? []) as Order[]);
      setLoading(false);
    };
    fetchOrders();
  }, [customer.id]);

  const totalSpent = orders.reduce((sum, o) => sum + o.amount_paid, 0);
  const outstanding = orders.reduce((sum, o) => sum + (o.total - o.amount_paid), 0);
  const currency = business?.currency ?? '₦';

  const whatsappNumber = (customer.whatsapp ?? customer.phone ?? '').replace(/[^0-9]/g, '');

  return (
    <div className="px-4 py-6 pb-28 max-w-lg mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </button>

      <Card className="p-6 mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <span className="text-emerald-700 font-bold text-lg">{initials(customer.name)}</span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-neutral-900">{customer.name}</h2>
            <div className="flex flex-wrap gap-1 mt-1">
              {customer.tags.map((tag) => (
                <Badge key={tag} color={tag === 'VIP' ? 'amber' : 'neutral'}>{tag}</Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {customer.phone && (
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Phone className="w-4 h-4 text-neutral-400" /> {customer.phone}
            </div>
          )}
          {customer.address && (
            <div className="text-sm text-neutral-600">{customer.address}</div>
          )}
          {customer.notes && (
            <div className="text-sm text-neutral-500 bg-neutral-50 rounded-xl p-3">{customer.notes}</div>
          )}
        </div>

        {whatsappNumber && (
          <a
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-50 text-green-700 font-semibold text-sm hover:bg-green-100 transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> Message on WhatsApp
          </a>
        )}

        <button onClick={() => setShowEdit(true)} className="w-full text-center text-sm text-neutral-400 mt-3">
          Edit customer
        </button>
      </Card>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="p-3 text-center">
          <p className="text-xs text-neutral-500">Orders</p>
          <p className="text-xl font-bold text-neutral-900">{orders.length}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-neutral-500">Total Spent</p>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalSpent, currency)}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-neutral-500">Outstanding</p>
          <p className="text-xl font-bold text-amber-600">{formatCurrency(outstanding, currency)}</p>
        </Card>
      </div>

      <h3 className="text-sm font-semibold text-neutral-700 mb-3">Order History</h3>
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <Card className="p-8 text-center text-sm text-neutral-400">No orders yet for this customer.</Card>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <Card key={order.id} className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-neutral-900">{order.order_number}</span>
                <Badge color={order.status === 'paid' || order.status === 'delivered' ? 'green' : order.status === 'cancelled' ? 'red' : 'amber'}>
                  {order.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">{formatRelative(order.created_at)}</span>
                <span className="font-semibold text-neutral-700">{formatCurrency(order.total, currency)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showEdit && (
        <CustomerForm
          customer={customer}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); onBack(); }}
        />
      )}
    </div>
  );
}

function CustomerForm({ customer, onClose, onSaved }: { customer: Customer | null; onClose: () => void; onSaved: () => void }) {
  const { business } = useAuth();
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [whatsapp, setWhatsapp] = useState(customer?.whatsapp ?? '');
  const [address, setAddress] = useState(customer?.address ?? '');
  const [notes, setNotes] = useState(customer?.notes ?? '');
  const [tags, setTags] = useState<string[]>(customer?.tags ?? []);
  const [status, setStatus] = useState(customer?.status ?? 'active');
  const [saving, setSaving] = useState(false);

  const toggleTag = (tag: string) => {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const handleSave = async () => {
    if (!business || !name) return;
    setSaving(true);
    const payload = {
      business_id: business.id,
      name,
      phone: phone || null,
      whatsapp: whatsapp || null,
      address: address || null,
      notes: notes || null,
      tags,
      status,
    };

    if (customer) {
      await supabase.from('customers').update(payload).eq('id', customer.id);
    } else {
      await supabase.from('customers').insert(payload);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Modal open={true} onClose={onClose} title={customer ? 'Edit Customer' : 'New Customer'}>
      <div className="space-y-4">
        <Input label="Name" value={name} onChange={setName} placeholder="Customer name" />
        <Input label="Phone" value={phone} onChange={setPhone} placeholder="+234..." type="tel" />
        <Input label="WhatsApp" value={whatsapp} onChange={setWhatsapp} placeholder="+234..." type="tel" />
        <Textarea label="Address" value={address} onChange={setAddress} placeholder="Delivery address" rows={2} />
        <Textarea label="Notes" value={notes} onChange={setNotes} placeholder="Any notes about this customer" rows={2} />

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Tags</label>
          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  tags.includes(tag) ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <Select
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'blocked', label: 'Blocked' },
          ]}
        />

        <Button onClick={handleSave} disabled={saving || !name} className="w-full">
          {saving ? 'Saving...' : 'Save Customer'}
        </Button>
      </div>
    </Modal>
  );
}
