import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus, Customer, Product, PaymentMethod } from '@/lib/types';
import { formatCurrency, formatRelative } from '@/lib/format';
import { Card, Button, Input, Textarea, Select, FAB, EmptyState, Badge, PageHeader, Modal } from '@/components/ui';
import { ShoppingBag, Plus, ArrowLeft, CreditCard, Truck, MessageCircle } from 'lucide-react';

const STATUS_FLOW: OrderStatus[] = ['new', 'confirmed', 'processing', 'ready', 'dispatched', 'delivered'];
const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'New',
  confirmed: 'Confirmed',
  paid: 'Paid',
  partially_paid: 'Partially Paid',
  processing: 'Processing',
  ready: 'Ready',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<OrderStatus, 'neutral' | 'blue' | 'amber' | 'green' | 'red'> = {
  new: 'neutral',
  confirmed: 'blue',
  paid: 'green',
  partially_paid: 'amber',
  processing: 'blue',
  ready: 'amber',
  dispatched: 'blue',
  delivered: 'green',
  cancelled: 'red',
};

export function OrdersScreen() {
  const { business } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'pending_payment'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!business) return;
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*), customer:customers(id,name,phone,whatsapp)')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });
    setOrders((data ?? []) as Order[]);
    setLoading(false);
  }, [business]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filtered = orders.filter((o) => {
    if (filter === 'active') return !['delivered', 'cancelled'].includes(o.status);
    if (filter === 'pending_payment') return o.total - o.amount_paid > 0 && o.status !== 'cancelled';
    return true;
  });

  if (selected) {
    return <OrderDetail order={selected} onBack={() => { setSelected(null); fetchOrders(); }} />;
  }

  const currency = business?.currency ?? '₦';

  return (
    <div className="px-4 py-6 pb-28 max-w-lg mx-auto">
      <PageHeader title="Orders" subtitle={`${orders.length} total`} />

      <div className="flex gap-2 mb-4">
        {(['all', 'active', 'pending_payment'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Unpaid'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-8 h-8" />}
          title="No orders yet"
          subtitle="Create your first order to start tracking sales and payments."
          action={<Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> New Order</Button>}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((order) => (
            <Card key={order.id} className="p-4 cursor-pointer active:scale-[0.99] transition-transform" >
              <div onClick={() => setSelected(order)}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-neutral-900">{order.order_number}</span>
                  <Badge color={STATUS_COLORS[order.status]}>{STATUS_LABELS[order.status]}</Badge>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm text-neutral-600 truncate">{order.customer?.name ?? 'Walk-in customer'}</p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">{formatRelative(order.created_at)}</span>
                  <div className="text-right">
                    <span className="font-bold text-neutral-900">{formatCurrency(order.total, currency)}</span>
                    {order.total - order.amount_paid > 0 && (
                      <span className="block text-xs text-amber-600">
                        {formatCurrency(order.total - order.amount_paid, currency)} unpaid
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <FAB onClick={() => setShowCreate(true)} icon={<Plus className="w-6 h-6" />} />

      {showCreate && (
        <OrderForm onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); fetchOrders(); }} />
      )}
    </div>
  );
}

function OrderForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { business } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<{ product: Product; quantity: number }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('0');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!business) return;
    supabase.from('customers').select('*').eq('business_id', business.id).order('name').then(({ data }) => {
      setCustomers((data ?? []) as Customer[]);
    });
    supabase.from('products').select('*').eq('business_id', business.id).order('name').then(({ data }) => {
      setProducts((data ?? []) as Product[]);
    });
  }, [business]);

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const total = subtotal + (parseFloat(deliveryFee) || 0);
  const currency = business?.currency ?? '₦';

  const addProduct = () => {
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
    setSelectedProduct('');
  };

  const updateQty = (productId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => i.product.id === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
        .filter((i) => i.quantity > 0)
    );
  };

  const handleSave = async () => {
    if (!business || items.length === 0) return;
    setSaving(true);

    const { data: orderNumberResult } = await supabase.rpc('generate_order_number');
    const orderNumber = orderNumberResult as string;

    const { data: orderData, error: orderError } = await supabase.from('orders').insert({
      business_id: business.id,
      customer_id: customerId || null,
      order_number: orderNumber,
      status: 'new',
      subtotal,
      delivery_fee: parseFloat(deliveryFee) || 0,
      total,
      amount_paid: 0,
      delivery_address: deliveryAddress || null,
      notes: notes || null,
    }).select().single();

    if (orderError) {
      setSaving(false);
      alert('Error creating order: ' + orderError.message);
      return;
    }

    const orderItems = items.map((item) => ({
      order_id: orderData.id,
      product_id: item.product.id,
      product_name: item.product.name,
      quantity: item.quantity,
      unit_price: item.product.price,
    }));

    await supabase.from('order_items').insert(orderItems);

    // Deduct stock
    for (const item of items) {
      await supabase.from('products').update({
        stock: item.product.stock - item.quantity
      }).eq('id', item.product.id);
    }

    setSaving(false);
    onSaved();
  };

  return (
    <Modal open={true} onClose={onClose} title="New Order">
      <div className="space-y-4">
        <Select
          label="Customer"
          value={customerId}
          onChange={setCustomerId}
          options={[
            { value: '', label: 'Walk-in customer' },
            ...customers.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Add Products</label>
          <div className="flex gap-2">
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select a product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price, currency)}</option>
              ))}
            </select>
            <Button onClick={addProduct} disabled={!selectedProduct} size="md"><Plus className="w-4 h-4" /></Button>
          </div>
        </div>

        {items.length > 0 && (
          <div className="space-y-2 bg-neutral-50 rounded-xl p-3">
            {items.map((item) => (
              <div key={item.product.id} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">{item.product.name}</p>
                  <p className="text-xs text-neutral-500">{formatCurrency(item.product.price, currency)} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item.product.id, -1)} className="w-7 h-7 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-600">-</button>
                  <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                  <button onClick={() => updateQty(item.product.id, 1)} className="w-7 h-7 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-600">+</button>
                  <span className="text-sm font-bold text-neutral-900 ml-2">{formatCurrency(item.product.price * item.quantity, currency)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <Input label="Delivery Fee" value={deliveryFee} onChange={setDeliveryFee} placeholder="0" type="number" />
        <Textarea label="Delivery Address" value={deliveryAddress} onChange={setDeliveryAddress} placeholder="Customer address" rows={2} />
        <Textarea label="Notes" value={notes} onChange={setNotes} placeholder="Order notes" rows={2} />

        <div className="bg-emerald-50 rounded-xl p-4 space-y-1">
          <div className="flex justify-between text-sm text-neutral-600">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-sm text-neutral-600">
            <span>Delivery</span>
            <span>{formatCurrency(parseFloat(deliveryFee) || 0, currency)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-neutral-900 pt-1 border-t border-emerald-200">
            <span>Total</span>
            <span>{formatCurrency(total, currency)}</span>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving || items.length === 0} className="w-full">
          {saving ? 'Creating...' : 'Create Order'}
        </Button>
      </div>
    </Modal>
  );
}

function OrderDetail({ order, onBack }: { order: Order; onBack: () => void }) {
  const { business } = useAuth();
  const [showPayment, setShowPayment] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(order);
  const currency = business?.currency ?? '₦';
  const balance = currentOrder.total - currentOrder.amount_paid;

  const refreshOrder = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*), customer:customers(id,name,phone,whatsapp)')
      .eq('id', order.id)
      .single();
    if (data) setCurrentOrder(data as Order);
  };

  const updateStatus = async (newStatus: OrderStatus) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
    await refreshOrder();
  };

  const updateDeliveryStatus = async (newStatus: string) => {
    await supabase.from('orders').update({ delivery_status: newStatus }).eq('id', order.id);
    await refreshOrder();
  };

  const whatsappNumber = (currentOrder.customer?.whatsapp ?? currentOrder.customer?.phone ?? '').replace(/[^0-9]/g, '');

  return (
    <div className="px-4 py-6 pb-28 max-w-lg mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Orders
      </button>

      {/* Order Header */}
      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">{currentOrder.order_number}</h2>
            <p className="text-sm text-neutral-500">{currentOrder.customer?.name ?? 'Walk-in customer'}</p>
          </div>
          <Badge color={STATUS_COLORS[currentOrder.status]}>{STATUS_LABELS[currentOrder.status]}</Badge>
        </div>

        {/* Status Flow */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STATUS_FLOW.map((status, i) => {
            const currentIndex = STATUS_FLOW.indexOf(currentOrder.status);
            const isActive = status === currentOrder.status;
            const isDone = currentIndex > i;
            return (
              <div key={status} className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => updateStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive ? 'bg-emerald-600 text-white' : isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-400'
                  }`}
                >
                  {STATUS_LABELS[status]}
                </button>
                {i < STATUS_FLOW.length - 1 && <span className="text-neutral-300">→</span>}
              </div>
            );
          })}
        </div>
        <button onClick={() => updateStatus('cancelled')} className="text-xs text-red-500 mt-2">Cancel order</button>
      </Card>

      {/* Order Items */}
      <Card className="p-4 mb-4">
        <h3 className="text-sm font-semibold text-neutral-700 mb-3">Items</h3>
        <div className="space-y-2">
          {currentOrder.order_items?.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium text-neutral-900">{item.product_name}</span>
                <span className="text-neutral-400"> × {item.quantity}</span>
              </div>
              <span className="font-semibold text-neutral-700">{formatCurrency(item.unit_price * item.quantity, currency)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-neutral-100 mt-3 pt-3 space-y-1">
          <div className="flex justify-between text-sm text-neutral-500">
            <span>Subtotal</span>
            <span>{formatCurrency(currentOrder.subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-sm text-neutral-500">
            <span>Delivery</span>
            <span>{formatCurrency(currentOrder.delivery_fee, currency)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-neutral-900 pt-1">
            <span>Total</span>
            <span>{formatCurrency(currentOrder.total, currency)}</span>
          </div>
        </div>
      </Card>

      {/* Payment Summary */}
      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-neutral-700">Payment</h3>
          <CreditCard className="w-4 h-4 text-neutral-400" />
        </div>
        <div className="space-y-1 text-sm mb-3">
          <div className="flex justify-between text-neutral-500">
            <span>Paid</span>
            <span className="text-emerald-600 font-semibold">{formatCurrency(currentOrder.amount_paid, currency)}</span>
          </div>
          <div className="flex justify-between text-neutral-500">
            <span>Balance</span>
            <span className={`font-semibold ${balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{formatCurrency(balance, currency)}</span>
          </div>
        </div>
        {balance > 0 && (
          <Button onClick={() => setShowPayment(true)} className="w-full" size="sm">
            <CreditCard className="w-4 h-4 mr-2" /> Record Payment
          </Button>
        )}
      </Card>

      {/* Delivery */}
      {currentOrder.delivery_fee > 0 && (
        <Card className="p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-neutral-700">Delivery</h3>
            <Truck className="w-4 h-4 text-neutral-400" />
          </div>
          {currentOrder.delivery_address && (
            <p className="text-sm text-neutral-600 mb-2">{currentOrder.delivery_address}</p>
          )}
          <select
            value={currentOrder.delivery_status ?? 'pending'}
            onChange={(e) => updateDeliveryStatus(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="picked_up">Picked Up</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="returned">Returned</option>
          </select>
        </Card>
      )}

      {/* WhatsApp Actions */}
      {whatsappNumber && (
        <Button variant="secondary" className="w-full mb-4" onClick={() => setShowWhatsApp(true)}>
          <MessageCircle className="w-4 h-4 mr-2" /> Send WhatsApp Message
        </Button>
      )}

      {showPayment && (
        <PaymentForm
          orderId={order.id}
          balance={balance}
          currency={currency}
          onClose={() => setShowPayment(false)}
          onSaved={() => { setShowPayment(false); refreshOrder(); }}
        />
      )}

      {showWhatsApp && (
        <WhatsAppTemplates
          order={currentOrder}
          whatsappNumber={whatsappNumber}
          currency={currency}
          onClose={() => setShowWhatsApp(false)}
        />
      )}
    </div>
  );
}

function PaymentForm({ orderId, balance, currency, onClose, onSaved }: {
  orderId: string;
  balance: number;
  currency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(String(balance));
  const [method, setMethod] = useState<PaymentMethod>('bank_transfer');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) { setSaving(false); return; }

    await supabase.from('payments').insert({
      order_id: orderId,
      amount: amt,
      method,
      reference: reference || null,
    });

    // Update order amount_paid
    const { data: order } = await supabase.from('orders').select('amount_paid, total').eq('id', orderId).single();
    if (order) {
      const newPaid = (order.amount_paid ?? 0) + amt;
      const newStatus = newPaid >= order.total ? 'paid' : 'partially_paid';
      await supabase.from('orders').update({ amount_paid: newPaid, status: newStatus }).eq('id', orderId);
    }

    setSaving(false);
    onSaved();
  };

  return (
    <Modal open={true} onClose={onClose} title="Record Payment">
      <div className="space-y-4">
        <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-700">
          Outstanding balance: {formatCurrency(balance, currency)}
        </div>
        <Input label="Amount" value={amount} onChange={setAmount} type="number" placeholder="0" />
        <Select
          label="Payment Method"
          value={method}
          onChange={(v) => setMethod(v as PaymentMethod)}
          options={[
            { value: 'bank_transfer', label: 'Bank Transfer' },
            { value: 'cash', label: 'Cash' },
            { value: 'pos', label: 'POS' },
            { value: 'card', label: 'Card' },
            { value: 'other', label: 'Other' },
          ]}
        />
        <Input label="Reference (optional)" value={reference} onChange={setReference} placeholder="Transaction ref" />
        <Button onClick={handleSave} disabled={saving || !amount} className="w-full">
          {saving ? 'Saving...' : 'Record Payment'}
        </Button>
      </div>
    </Modal>
  );
}

function WhatsAppTemplates({ order, whatsappNumber, currency, onClose }: {
  order: Order;
  whatsappNumber: string;
  currency: string;
  onClose: () => void;
}) {
  const balance = order.total - order.amount_paid;
  const itemsList = order.order_items?.map((i) => `• ${i.quantity}× ${i.product_name} — ${formatCurrency(i.unit_price * i.quantity, currency)}`).join('\n') ?? '';

  const templates = [
    {
      name: 'Order Confirmation',
      message: `Hello ${order.customer?.name ?? 'there'}, your order ${order.order_number} has been confirmed.\n\nItems:\n${itemsList}\n\nTotal: ${formatCurrency(order.total, currency)}\nThank you for shopping with us!`,
    },
    {
      name: 'Payment Reminder',
      message: `Hello ${order.customer?.name ?? 'there'}, this is a friendly reminder that your outstanding balance for order ${order.order_number} is ${formatCurrency(balance, currency)}.\n\nPlease make payment to complete your order. Thank you!`,
    },
    {
      name: 'Dispatch Notification',
      message: `Good news! Your order ${order.order_number} has been dispatched and is on the way to you.\n\nExpected delivery: Today\n\nThank you for shopping with us!`,
    },
    {
      name: 'Delivery Confirmation',
      message: `Your order ${order.order_number} has been delivered. Thank you for shopping with us!\n\nWe'd love to hear your feedback. Please don't hesitate to reach out if you have any questions.`,
    },
  ];

  const sendMessage = (message: string) => {
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${whatsappNumber}?text=${encoded}`, '_blank');
    onClose();
  };

  return (
    <Modal open={true} onClose={onClose} title="Send WhatsApp Message">
      <div className="space-y-3">
        {templates.map((tmpl) => (
          <button
            key={tmpl.name}
            onClick={() => sendMessage(tmpl.message)}
            className="w-full text-left p-4 rounded-xl border border-neutral-200 hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-neutral-900">{tmpl.name}</span>
            </div>
            <p className="text-xs text-neutral-500 line-clamp-2">{tmpl.message}</p>
          </button>
        ))}
      </div>
    </Modal>
  );
}
