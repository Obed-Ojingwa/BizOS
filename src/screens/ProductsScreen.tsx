import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/types';
import { formatCurrency } from '@/lib/format';
import { Card, Button, Input, Textarea, FAB, EmptyState, Badge, PageHeader, Modal } from '@/components/ui';
import { Package, Plus, ArrowLeft, AlertTriangle, Trash2 } from 'lucide-react';

export function ProductsScreen() {
  const { business } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!business) return;
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });
    setProducts((data ?? []) as Product[]);
    setLoading(false);
  }, [business]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (selected) {
    return <ProductDetail product={selected} onBack={() => { setSelected(null); fetchProducts(); }} />;
  }

  return (
    <div className="px-4 py-6 pb-28 max-w-lg mx-auto">
      <PageHeader title="Products" subtitle={`${products.length} total`} />

      <div className="mb-4">
        <Input value={search} onChange={setSearch} placeholder="Search products..." />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="w-8 h-8" />}
          title="No products yet"
          subtitle="Add your first product to start creating orders."
          action={<Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="w-4 h-4 mr-2" /> Add Product</Button>}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((product) => {
            const lowStock = product.stock <= product.low_stock_threshold;
            return (
              <Card key={product.id} className="p-4 cursor-pointer active:scale-[0.99] transition-transform" >
                <div onClick={() => setSelected(product)} className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-neutral-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-900 truncate">{product.name}</p>
                    <p className="text-sm text-neutral-500">{formatCurrency(product.price, business?.currency ?? '₦')}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${lowStock ? 'text-amber-600' : 'text-neutral-900'}`}>{product.stock}</p>
                    <p className="text-xs text-neutral-400">in stock</p>
                  </div>
                </div>
                {lowStock && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                    <AlertTriangle className="w-3 h-3" /> Low stock
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <FAB onClick={() => { setEditing(null); setShowForm(true); }} icon={<Plus className="w-6 h-6" />} />

      {showForm && (
        <ProductForm
          product={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchProducts(); }}
        />
      )}
    </div>
  );
}

function ProductDetail({ product, onBack }: { product: Product; onBack: () => void }) {
  const { business } = useAuth();
  const [showEdit, setShowEdit] = useState(false);
  const currency = business?.currency ?? '₦';

  const handleDelete = async () => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    await supabase.from('products').delete().eq('id', product.id);
    onBack();
  };

  return (
    <div className="px-4 py-6 pb-28 max-w-lg mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Products
      </button>

      <Card className="p-6 mb-4">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-20 h-20 rounded-2xl bg-neutral-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <Package className="w-10 h-10 text-neutral-400" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-neutral-900">{product.name}</h2>
            {product.sku && <p className="text-sm text-neutral-500">SKU: {product.sku}</p>}
            <p className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(product.price, currency)}</p>
          </div>
        </div>

        {product.description && (
          <p className="text-sm text-neutral-600 mb-4">{product.description}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-neutral-50 rounded-xl p-3 text-center">
            <p className="text-xs text-neutral-500">Stock</p>
            <p className={`text-2xl font-bold ${product.stock <= product.low_stock_threshold ? 'text-amber-600' : 'text-neutral-900'}`}>{product.stock}</p>
          </div>
          <div className="bg-neutral-50 rounded-xl p-3 text-center">
            <p className="text-xs text-neutral-500">Low Stock Alert</p>
            <p className="text-2xl font-bold text-neutral-900">{product.low_stock_threshold}</p>
          </div>
        </div>

        {product.variations && product.variations.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-neutral-700 mb-2">Variations</p>
            <div className="flex flex-wrap gap-2">
              {product.variations.map((v, i) => (
                <Badge key={i} color="blue">{v.name}: {v.value} ({v.stock})</Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" className="flex-1" onClick={() => setShowEdit(true)}>Edit</Button>
          <Button variant="danger" onClick={handleDelete}><Trash2 className="w-4 h-4" /></Button>
        </div>
      </Card>

      {showEdit && (
        <ProductForm
          product={product}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); onBack(); }}
        />
      )}
    </div>
  );
}

function ProductForm({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => void }) {
  const { business } = useAuth();
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [stock, setStock] = useState(product ? String(product.stock) : '0');
  const [lowStockThreshold, setLowStockThreshold] = useState(product ? String(product.low_stock_threshold) : '5');
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!business || !name) return;
    setSaving(true);
    const payload = {
      business_id: business.id,
      name,
      description: description || null,
      price: parseFloat(price) || 0,
      sku: sku || null,
      stock: parseInt(stock) || 0,
      low_stock_threshold: parseInt(lowStockThreshold) || 5,
      image_url: imageUrl || null,
    };

    if (product) {
      await supabase.from('products').update(payload).eq('id', product.id);
    } else {
      await supabase.from('products').insert(payload);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Modal open={true} onClose={onClose} title={product ? 'Edit Product' : 'New Product'}>
      <div className="space-y-4">
        <Input label="Product Name" value={name} onChange={setName} placeholder="e.g. Black Dress" />
        <Textarea label="Description" value={description} onChange={setDescription} placeholder="Product description" rows={2} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Price" value={price} onChange={setPrice} placeholder="0" type="number" />
          <Input label="SKU" value={sku} onChange={setSku} placeholder="Optional" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Stock Quantity" value={stock} onChange={setStock} placeholder="0" type="number" />
          <Input label="Low Stock Alert At" value={lowStockThreshold} onChange={setLowStockThreshold} placeholder="5" type="number" />
        </div>
        <Input label="Image URL" value={imageUrl} onChange={setImageUrl} placeholder="https://..." />

        <Button onClick={handleSave} disabled={saving || !name} className="w-full">
          {saving ? 'Saving...' : 'Save Product'}
        </Button>
      </div>
    </Modal>
  );
}
