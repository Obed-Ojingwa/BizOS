import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { MessageCircle, ArrowRight } from 'lucide-react';

export function BusinessSetupScreen() {
  const { user, refreshBusiness } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [currency, setCurrency] = useState('₦');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setLoading(true);

    const { error: insertError } = await supabase.from('businesses').insert({
      user_id: user.id,
      name,
      phone: phone || null,
      whatsapp: whatsapp || null,
      currency,
    });

    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    await refreshBusiness();
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center mb-3">
            <MessageCircle className="w-8 h-8 text-white" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Set up your business</h1>
          <p className="text-sm text-neutral-500 mt-1 text-center">
            Tell us about your business so we can get you started.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Business Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ada's Fashion Store"
                required
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234..."
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">WhatsApp Number</label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+234..."
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Currency Symbol</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              >
                <option value="₦">₦ (Naira)</option>
                <option value="$">$ (Dollar)</option>
                <option value="£">£ (Pound)</option>
                <option value="€">€ (Euro)</option>
                <option value="₵">₵ (Cedi)</option>
                <option value="KSh">KSh (Shilling)</option>
              </select>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name}
              className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Setting up...' : 'Get Started'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
