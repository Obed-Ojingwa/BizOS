export type CustomerStatus = 'active' | 'inactive' | 'blocked';

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  notes: string | null;
  tags: string[];
  status: CustomerStatus;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price: number;
  sku: string | null;
  stock: number;
  low_stock_threshold: number;
  image_url: string | null;
  variations: ProductVariation[];
  created_at: string;
  updated_at: string;
}

export interface ProductVariation {
  name: string;
  value: string;
  stock: number;
}

export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'paid'
  | 'partially_paid'
  | 'processing'
  | 'ready'
  | 'dispatched'
  | 'delivered'
  | 'cancelled';

export type DeliveryStatus =
  | 'pending'
  | 'assigned'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'failed'
  | 'returned';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface Order {
  id: string;
  business_id: string;
  customer_id: string | null;
  order_number: string | null;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  total: number;
  amount_paid: number;
  delivery_address: string | null;
  rider_name: string | null;
  rider_phone: string | null;
  delivery_status: DeliveryStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  customer?: Pick<Customer, 'id' | 'name' | 'phone' | 'whatsapp'>;
}

export type PaymentMethod = 'bank_transfer' | 'cash' | 'pos' | 'card' | 'other';

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  created_at: string;
}

export type MessageTemplateType =
  | 'order_confirmation'
  | 'payment_reminder'
  | 'dispatch_notification'
  | 'delivery_confirmation'
  | 'follow_up'
  | 'custom';

export interface MessageTemplate {
  id: string;
  business_id: string;
  name: string;
  type: MessageTemplateType;
  body: string;
  created_at: string;
}

export interface Business {
  id: string;
  user_id: string;
  name: string;
  logo_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  currency: string;
  payment_info: string | null;
  delivery_settings: string | null;
  created_at: string;
  updated_at: string;
}
