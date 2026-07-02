import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  Plus, 
  Search, 
  AlertTriangle, 
  TrendingDown, 
  Calendar, 
  ClipboardList, 
  RefreshCcw, 
  Info,
  DollarSign
} from 'lucide-react';
import { IngredientService, WasteRecordService } from '../services/api';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

interface WasteRecord {
  id: number;
  ingredientId: number;
  ingredientName: string;
  quantity: number;
  unit: string;
  reason: string;
  wasteDate: string;
  financialLoss: number;
}

interface Ingredient {
  id: number;
  name: string;
  unit: string;
  totalQuantity: number;
}

const WasteRecords: React.FC = () => {
  const [records, setRecords] = useState<WasteRecord[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [summary, setSummary] = useState({ totalFinancialLoss: 0, totalRecords: 0 });
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expiredBatches, setExpiredBatches] = useState<any[]>([]);

  // Form State
  const [selectedIngredientId, setSelectedIngredientId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [reason, setReason] = useState<string>('Spoiled');
  const [customReason, setCustomReason] = useState<string>('');

  const reasonMeta: Record<string, { label: string; bg: string; text: string }> = {
    Expired: { label: 'SKT Aşımı ⏳', bg: 'bg-amber-50 border-amber-100', text: 'text-amber-700' },
    Spoiled: { label: 'Bozulma 🍂', bg: 'bg-rose-50 border-rose-100', text: 'text-rose-700' },
    Spilled: { label: 'Kaza/Dökülme 💧', bg: 'bg-sky-50 border-sky-100', text: 'text-sky-700' },
    Other: { label: 'Diğer ⚙️', bg: 'bg-slate-50 border-slate-100', text: 'text-slate-700' },
  };

  const getSelectedIngredientUnit = () => {
    if (!selectedIngredientId) return '';
    const ing = ingredients.find(i => i.id === Number(selectedIngredientId));
    return ing ? ing.unit : '';
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [recordsData, ingredientsData, summaryData, expiredData] = await Promise.all([
        WasteRecordService.getAll(),
        IngredientService.getAllActive(),
        WasteRecordService.getSummary(),
        IngredientService.getExpired()
      ]);
      setRecords(recordsData || []);
      setIngredients(ingredientsData || []);
      setSummary(summaryData || { totalFinancialLoss: 0, totalRecords: 0 });
      setExpiredBatches(expiredData || []);
    } catch (error) {
      console.error('Error loading waste records data:', error);
      toast.error('Zayiat verileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredientId) {
      toast.error('Lütfen bir hammadde seçin.');
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      toast.error('Lütfen sıfırdan büyük geçerli bir miktar girin.');
      return;
    }

    setSubmitLoading(true);
    try {
      const payload = {
        ingredientId: Number(selectedIngredientId),
        quantity: Number(quantity),
        reason: reason === 'Other' ? `Other: ${customReason}` : reason
      };

      const response = await WasteRecordService.create(payload);
      toast.success(`${response.ingredientName} zayiat kaydı başarıyla girildi! ₺${response.financialLoss.toFixed(2)} mali kayıp işlendi.`);
      
      // Reset form
      setSelectedIngredientId('');
      setQuantity('');
      setReason('Spoiled');
      setCustomReason('');
      
      // Refresh list and stats
      loadData();
    } catch (error: any) {
      console.error('Error creating waste record:', error);
      const errorMsg = error.response?.data?.message || 'Zayiat kaydı oluşturulurken yetersiz stok veya teknik bir hata oluştu.';
      toast.error(errorMsg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const filteredRecords = records.filter(record => 
    record.ingredientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (reasonMeta[record.reason]?.label || record.reason).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddExpiredAsWaste = async (batch: any) => {
    try {
      const toastId = toast.loading(`${batch.ingredientName} zayiat olarak ekleniyor...`);
      const payload = {
        ingredientId: batch.ingredientId,
        quantity: batch.quantity,
        reason: 'Expired'
      };
      const response = await WasteRecordService.create(payload);
      toast.dismiss(toastId);
      toast.success(`${response.ingredientName} zayiat kaydı başarıyla girildi! ₺${response.financialLoss.toFixed(2)} mali kayıp işlendi.`);
      loadData();
    } catch (error: any) {
      toast.dismiss();
      console.error('Error creating waste record from expired batch:', error);
      const errorMsg = error.response?.data?.message || 'Zayiat kaydı oluşturulurken bir hata oluştu.';
      toast.error(errorMsg);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-br from-slate-900 to-rose-950 p-8 rounded-[2rem] shadow-2xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 blur-[100px] rounded-full"></div>
        <div className="flex items-center gap-6 z-10">
          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
            <Trash2 className="text-rose-400 animate-pulse" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">MUTFAK ZAYİAT TAKİBİ</h1>
            <p className="text-rose-300 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
              <TrendingDown size={14} /> Zayiat ve Kayıp Yönetimi
            </p>
          </div>
        </div>
        <button 
          onClick={loadData}
          disabled={loading}
          className="mt-6 md:mt-0 px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl transition-all flex items-center gap-3 text-sm font-black shadow-lg shadow-rose-600/25 disabled:opacity-50 group z-10"
        >
          <RefreshCcw size={18} className={clsx(loading && "animate-spin")} />
          {loading ? 'YÜKLENİYOR...' : 'VERİLERİ YENİLE'}
        </button>
      </div>

      {/* SUMMARY WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* TOTAL REALIZED WASTE CARD */}
        <div className="glass-card p-8 bg-white border-l-[8px] border-l-rose-600 shadow-xl relative overflow-hidden group hover:scale-[1.01] transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-125 transition-transform duration-500"></div>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Toplam Gerçekleşen Zayiat</p>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                ₺{summary.totalFinancialLoss.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <p className="text-xs text-rose-500 font-bold mt-2 flex items-center gap-1.5">
                <AlertTriangle size={12} /> FEFO partilerinden düşen toplam maliyet
              </p>
            </div>
            <div className="p-5 bg-rose-50 text-rose-600 rounded-[2rem] border border-rose-100 shadow-inner group-hover:rotate-6 transition-transform">
              <DollarSign size={36} />
            </div>
          </div>
        </div>

        {/* TOTAL RECORDS CARD */}
        <div className="glass-card p-8 bg-white border-l-[8px] border-l-slate-800 shadow-xl relative overflow-hidden group hover:scale-[1.01] transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-125 transition-transform duration-500"></div>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Kayıtlı Zayiat Sayısı</p>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                {summary.totalRecords} <span className="text-sm font-bold text-slate-400 uppercase">Kayıt</span>
              </h2>
              <p className="text-xs text-slate-500 font-bold mt-2 flex items-center gap-1.5">
                <ClipboardList size={12} /> Sisteme manuel işlenen fiziki imhalar
              </p>
            </div>
            <div className="p-5 bg-slate-50 text-slate-700 rounded-[2rem] border border-slate-100 shadow-inner group-hover:rotate-6 transition-transform">
              <ClipboardList size={36} />
            </div>
          </div>
        </div>
      </div>


      {/* MAIN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: ADD WASTE FORM */}
        <div className="lg:col-span-4 space-y-6">
          <div className="px-2">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Zayiat Bildirimi</h2>
            <p className="text-xs text-slate-400 font-semibold mt-1">Mutfakta bozulan veya zayi olan malzemeyi buraya kaydedin. Depodaki partilerden otomatik eksilecektir.</p>
          </div>

          <div className="glass-card p-6 bg-white shadow-xl border border-slate-100 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-rose-50 rounded-full -mr-8 -mt-8"></div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Ingredient Selection */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Hammadde</label>
                <select
                  value={selectedIngredientId}
                  onChange={(e) => setSelectedIngredientId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-800 transition-all"
                  required
                >
                  <option value="">-- Hammadde Seçin --</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} (Mevcut: {ing.totalQuantity?.toFixed(2)} {ing.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">İmha Edilecek Miktar</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    placeholder="Örn: 1.50"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-800 transition-all pr-16"
                    required
                  />
                  {selectedIngredientId && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 uppercase">
                      {getSelectedIngredientUnit()}
                    </span>
                  )}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Zayiat Nedeni</label>
                <select
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (e.target.value !== 'Other') {
                      setCustomReason('');
                    }
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-800 transition-all"
                  required
                >
                  <option value="Spoiled">Bozulma 🍂</option>
                  <option value="Expired">SKT Aşımı ⏳</option>
                  <option value="Spilled">Kaza / Dökülme 💧</option>
                  <option value="Other">Diğer ⚙️</option>
                </select>
              </div>

              {reason === 'Other' && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Açıklama</label>
                  <input
                    type="text"
                    required
                    placeholder="Zayiat nedenini açıklayın..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-800 transition-all"
                  />
                </div>
              )}

              {/* DSS Info Box */}
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-3 text-indigo-700 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500"></div>
                <Info size={18} className="shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold leading-relaxed italic">
                  DSS Notu: FEFO algoritması sayesinde çöpe giden malzemeler ilk önce en yakın tarihli partilerden eksiltilerek sistem sağlığı korunur.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitLoading || loading}
                className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Plus size={18} />
                {submitLoading ? 'KAYDEDİLİYOR...' : 'ZAYİATI SİSTEME İŞLE'}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: WASTE HISTORY LOG */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* EXPIRED BATCHES SECTION */}
          <div className="glass-card p-6 bg-white border border-rose-100 shadow-xl rounded-[2rem] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full -mr-10 -mt-10"></div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <AlertTriangle size={20} className="animate-bounce-subtle" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Süresi Dolan Stok Partileri</h3>
                <p className="text-xs text-slate-400 font-semibold">Son kullanma tarihi geçmiş olan ama mutfakta henüz zayiat olarak işlenmemiş ürünler.</p>
              </div>
            </div>

            {expiredBatches.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-semibold bg-emerald-50/50 border border-emerald-100 rounded-2xl flex flex-col items-center justify-center gap-2">
                <span className="text-xl">🛡️</span>
                <p className="text-emerald-800 font-black text-xs uppercase tracking-wider">Mutfakta Süresi Dolan Bekleyen Ürün Bulunmuyor. Depo Taze!</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-rose-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-rose-50/50 border-b border-rose-100">
                      <th className="p-4 text-xs font-black text-rose-700 uppercase tracking-wider">Hammadde</th>
                      <th className="p-4 text-xs font-black text-rose-700 uppercase tracking-wider">Kalan Miktar</th>
                      <th className="p-4 text-xs font-black text-rose-700 uppercase tracking-wider">Birim Fiyat</th>
                      <th className="p-4 text-xs font-black text-rose-700 uppercase tracking-wider">SKT</th>
                      <th className="p-4 text-xs font-black text-rose-700 uppercase tracking-wider text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-50">
                    {expiredBatches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-rose-50/20 transition-colors">
                        <td className="p-4 font-black text-slate-800 uppercase tracking-tight text-sm">
                          {batch.ingredientName}
                        </td>
                        <td className="p-4 text-xs font-black text-slate-700">
                          {batch.quantity.toFixed(2)}
                        </td>
                        <td className="p-4 text-xs font-black text-slate-700">
                          ₺{batch.unitPrice.toFixed(2)}
                        </td>
                        <td className="p-4 text-xs font-black text-rose-600 font-semibold">
                          {new Date(batch.expirationDate).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleAddExpiredAsWaste(batch)}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 ml-auto"
                          >
                            <Trash2 size={12} /> Zayiat Olarak Ekle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Geçmiş Zayiat Logları</h2>
              <p className="text-xs text-slate-400 font-semibold mt-1">İmha edilmiş ve partilerden düşülmüş tüm malzemelerin listesi.</p>
            </div>
            
            {/* Search Bar */}
            <div className="relative max-w-xs w-full">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Malzeme veya neden ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden p-8 relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/5 blur-[80px] rounded-full"></div>
            
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Tarih</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Hammadde</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Miktar</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Zayiat Nedeni</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Mali Kayıp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-xs font-black text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-slate-300" />
                          {new Date(record.wasteDate).toLocaleString('tr-TR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="p-4 font-black text-slate-800 uppercase tracking-tight text-sm">
                        {record.ingredientName}
                      </td>
                      <td className="p-4 text-xs font-black text-slate-700">
                        {record.quantity.toFixed(2)} <span className="text-[10px] font-bold text-slate-400 uppercase">{record.unit}</span>
                      </td>
                      <td className="p-4">
                        <span className={clsx(
                          "px-3 py-1 rounded-xl text-[10px] font-black border uppercase tracking-wider",
                          reasonMeta[record.reason.startsWith('Other') ? 'Other' : record.reason]?.bg || 'bg-slate-50 border-slate-100',
                          reasonMeta[record.reason.startsWith('Other') ? 'Other' : record.reason]?.text || 'text-slate-700'
                        )}>
                          {record.reason.startsWith('Other:') 
                            ? `Diğer ⚙️ (${record.reason.substring(7)})` 
                            : (reasonMeta[record.reason]?.label || record.reason)}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="inline-block text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-xl text-xs font-black">
                          ₺{record.financialLoss.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                        Hiçbir zayiat kaydı bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
      </div>
      
    </div>
  );
};

export default WasteRecords;
