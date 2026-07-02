import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, PackageCheck, History, CheckCircle2, Clock, Truck, PlusCircle, X, Calendar, Scale } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import clsx from 'clsx';

interface PurchaseOrder {
  id: number;
  supplierId: number;
  supplierName: string;
  orderDate: string;
  totalAmount: number;
  status: string;
  notes: string;
  items: any[];
}

const Purchases = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    supplierId: 0, 
    notes: '', 
    items: [{ ingredientId: 0, ingredientName: '', quantity: 1, unit: 'kg', unitPrice: 0, expirationDate: '', isNew: false }] 
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersRes, suppliersRes, ingredientsRes] = await Promise.all([
        api.get('/purchases'),
        api.get('/suppliers'),
        api.get('/ingredients/active')
      ]);
      setOrders(ordersRes.data.sort((a: any, b: any) => b.id - a.id));
      setSuppliers(suppliersRes.data);
      setIngredients(ingredientsRes.data);
    } catch (error) {
      toast.error('Veriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = () => {
    setFormData({ 
      supplierId: 0, 
      notes: '', 
      items: [{ ingredientId: 0, ingredientName: '', quantity: 1, unit: 'kg', unitPrice: 0, expirationDate: new Date().toISOString().split('T')[0], isNew: false }] 
    });
    setIsModalOpen(true);
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { ingredientId: 0, ingredientName: '', quantity: 1, unit: 'kg', unitPrice: 0, expirationDate: new Date().toISOString().split('T')[0], isNew: false }]
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    (newItems[index] as any)[field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.supplierId === 0) {
      toast.error('Lütfen bir tedarikçi seçin');
      return;
    }
    if (formData.items.length === 0) {
      toast.error('Lütfen en az bir ürün ekleyin');
      return;
    }

    // Validate items
    for (const item of formData.items) {
        if (!item.isNew && item.ingredientId === 0) {
            toast.error('Lütfen tüm ürünleri seçin veya yeni isim girin');
            return;
        }
        if (item.isNew && !item.ingredientName) {
            toast.error('Lütfen yeni ürünün adını girin');
            return;
        }
        if (!item.expirationDate) {
            toast.error('Lütfen tüm ürünler için son kullanma tarihi seçin');
            return;
        }
    }
    
    const payload = {
      ...formData,
      status: 'COMPLETED' 
    };

    try {
      const toastId = toast.loading('İrsaliye işleniyor, stoklar güncelleniyor...');
      await api.post('/purchases', payload);
      toast.dismiss(toastId);
      toast.success('Mal kabul yapıldı ve stoklara eklendi!');
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.dismiss();
      toast.error('İşlem başarısız oldu');
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'COMPLETED': return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded-md">Tamamlandı</span>;
      case 'PENDING': return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-md">Bekliyor</span>;
      default: return <span className="px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-black uppercase rounded-md">{status}</span>;
    }
  };

  return (
    <div className="space-y-10 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-500 font-bold text-sm mb-2 uppercase tracking-[0.2em]">
            <Truck size={16} />
            <span>Tedarik Zinciri</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Mal Kabul & İrsaliyeler</h1>
        </div>
        <button onClick={handleOpenModal} className="btn-primary group">
          <Plus size={20} className="group-hover:rotate-90 transition-transform" />
          Yeni Mal Kabul
        </button>
      </header>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="bg-slate-50/50">
              <tr className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
                <th className="px-6 py-5 border-b border-slate-200">İrsaliye NO</th>
                <th className="px-6 py-5 border-b border-slate-200">Tarih</th>
                <th className="px-6 py-5 border-b border-slate-200">Tedarikçi</th>
                <th className="px-6 py-5 border-b border-slate-200">Durum</th>
                <th className="px-6 py-5 border-b border-slate-200 text-right">Toplam Tutar</th>
              </tr>
            </thead>
            <tbody className="font-semibold text-sm">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-500">Yükleniyor...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-500">Henüz mal kabul kaydı bulunmuyor.</td></tr>
              ) : orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                  <td className="px-6 py-5 text-slate-900 font-black">PO-{order.id.toString().padStart(4, '0')}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Clock size={14} />
                      {new Date(order.orderDate).toLocaleString('tr-TR')}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-slate-700 font-bold">{order.supplierName}</td>
                  <td className="px-6 py-5">{getStatusBadge(order.status)}</td>
                  <td className="px-6 py-5 text-right font-black text-lg text-emerald-500">₺{order.totalAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Yeni Mal Kabul (İrsaliye)"
        icon={<PackageCheck size={24} />}
        maxWidth="max-w-[1200px]"
      >
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-2 gap-8 bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Tedarikçi Seçimi</label>
              <select 
                required
                className="input-field appearance-none cursor-pointer bg-white"
                value={formData.supplierId}
                onChange={e => setFormData({...formData, supplierId: parseInt(e.target.value)})}
              >
                <option value={0} disabled>Lütfen Tedarikçi Seçin</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">İrsaliye Notu / Fatura No</label>
              <input 
                type="text" 
                className="input-field bg-white" 
                value={formData.notes || ''}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                placeholder="Örn: IRS-2024-001..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <PlusCircle size={16} />
                İrsaliye Kalemleri
              </h3>
              <button type="button" onClick={handleAddItem} className="btn-secondary py-2 px-4 text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                <Plus size={14} /> Yeni Satır Ekle
              </button>
            </div>
            
            {formData.items.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-400 text-sm font-medium italic">
                Henüz ürün eklemediniz. İrsaliye kalemlerini girmek için yukarıdaki "Yeni Satır Ekle" butonunu kullanın.
              </div>
            ) : (
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={index} 
                    className="flex flex-wrap lg:flex-nowrap gap-4 items-end bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative group hover:border-indigo-500/30 transition-all"
                  >
                    {/* Hammadde Seçimi */}
                    <div className="flex-[3] min-w-[250px]">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Hammadde</label>
                        <button 
                            type="button" 
                            onClick={() => handleItemChange(index, 'isNew', !item.isNew)}
                            className={clsx("text-[9px] font-black uppercase px-2 py-0.5 rounded-full transition-all", item.isNew ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" : "bg-slate-100 text-slate-500")}
                        >
                            {item.isNew ? 'Yeni Hammadde Modu' : 'Listeden Seç'}
                        </button>
                      </div>
                      {item.isNew ? (
                          <input 
                            type="text" 
                            required
                            placeholder="Yeni hammadde adı girin..."
                            className="w-full text-sm p-3 bg-indigo-50 border border-indigo-100 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold"
                            value={item.ingredientName || ''}
                            onChange={e => handleItemChange(index, 'ingredientName', e.target.value)}
                          />
                      ) : (
                          <select 
                            required
                            className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold appearance-none cursor-pointer"
                            value={item.ingredientId}
                            onChange={e => handleItemChange(index, 'ingredientId', parseInt(e.target.value))}
                          >
                            <option value={0} disabled>Hammadde Seçiniz</option>
                            {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>)}
                          </select>
                      )}
                    </div>

                    {/* Birim Seçimi (Sadece Yeni Ürün İçin veya Bilgi Amaçlı) */}
                    <div className="w-24">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Birim</label>
                        <select 
                            className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold"
                            value={item.unit}
                            onChange={e => handleItemChange(index, 'unit', e.target.value)}
                        >
                            <option value="kg">kg</option>
                            <option value="gr">gr</option>
                            <option value="lt">lt</option>
                            <option value="ADET">Adet</option>
                        </select>
                    </div>

                    {/* SKT */}
                    <div className="w-40">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <Calendar size={10} /> SKT (S. Kullanma)
                      </label>
                      <input 
                          type="date" 
                          required
                          className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold"
                          value={item.expirationDate || ''}
                          onChange={e => handleItemChange(index, 'expirationDate', e.target.value)}
                      />
                    </div>

                    {/* Miktar */}
                    <div className="w-24">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                         <Scale size={10} /> Miktar
                      </label>
                      <input 
                        type="number" required min="0.01" step="0.01"
                        className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold"
                        value={item.quantity}
                        onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    {/* Birim Fiyat */}
                    <div className="w-28">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Birim Fiyat (₺)</label>
                      <input 
                        type="number" required min="0" step="0.01"
                        className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold"
                        value={item.unitPrice}
                        onChange={e => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    {/* Ara Toplam */}
                    <div className="w-32 pb-4 text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ara Toplam</p>
                      <p className="text-lg font-black text-slate-900 tracking-tight">₺{(item.quantity * item.unitPrice).toFixed(2)}</p>
                    </div>

                    {/* Silme Butonu */}
                    <button type="button" onClick={() => handleRemoveItem(index)} className="absolute -right-3 -top-3 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg shadow-rose-500/30 z-10">
                      <X size={16} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-8 flex items-center justify-between border-t border-slate-100 mt-10">
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1">İrsaliye Genel Toplamı</span>
              <span className="text-4xl font-black text-indigo-600 tracking-tighter">
                ₺{formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)}
              </span>
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary py-4 px-8 text-sm font-black">İptal</button>
              <button type="submit" className="btn-primary py-4 px-12 flex gap-3 items-center text-sm font-black shadow-2xl shadow-indigo-600/40">
                <CheckCircle2 size={22} />
                Mal Kabulü Tamamla ve Stokları Güncelle
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Purchases;
