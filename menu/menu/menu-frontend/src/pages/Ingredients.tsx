import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, Package, AlertCircle, Filter, Download, MoreHorizontal, Calendar, Clock, DollarSign, ChevronRight } from 'lucide-react';
import { IngredientService } from '../services/api';
import api from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import clsx from 'clsx';

interface Ingredient {
  id: number;
  name: string;
  totalQuantity: number;
  unit: string;
  minimumStockLevel: number;
  active: boolean;
}

interface IngredientBatch {
  id: number;
  quantity: number;
  unitPrice: number;
  expirationDate: string;
  receivedDate: string;
}

const Ingredients = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [batches, setBatches] = useState<IngredientBatch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);

  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [formData, setFormData] = useState({ name: '', minimumStockLevel: 0, unit: 'kg', active: true });

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      const data = await IngredientService.getAllActive();
      setIngredients(data);
    } catch (error) {
      toast.error('Bağlantı hatası.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  const handleOpenModal = (ingredient?: Ingredient) => {
    if (ingredient) {
      setEditingIngredient(ingredient);
      setFormData({ 
        name: ingredient.name, 
        minimumStockLevel: ingredient.minimumStockLevel, 
        unit: ingredient.unit, 
        active: ingredient.active 
      });
    } else {
      setEditingIngredient(null);
      setFormData({ name: '', minimumStockLevel: 0, unit: 'kg', active: true });
    }
    setIsModalOpen(true);
  };

  const handleOpenBatchModal = async (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setIsBatchModalOpen(true);
    setBatchesLoading(true);
    try {
      const response = await api.get(`/ingredients/${ingredient.id}/batches`);
      setBatches(response.data);
    } catch (error) {
      toast.error('Parti detayları yüklenemedi.');
    } finally {
      setBatchesLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const toastId = toast.loading('Kaydediliyor...');
      if (editingIngredient) {
        await IngredientService.update(editingIngredient.id, formData);
      } else {
        await IngredientService.create(formData);
      }
      toast.dismiss(toastId);
      toast.success('Hammadde başarıyla kaydedildi!');
      setIsModalOpen(false);
      fetchIngredients();
    } catch (error) {
      toast.dismiss();
      toast.error('Kayıt işlemi başarısız oldu.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bu hammaddeyi silmek istediğinize emin misiniz?')) return;
    try {
      await IngredientService.delete(id);
      toast.success('Hammadde silindi!');
      fetchIngredients();
    } catch (error) {
      toast.error('Silme işlemi başarısız.');
    }
  };

  const handleDeleteBatch = async (batchId: number) => {
    if (!window.confirm('Bu stok partisini imha etmek (silmek) istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
    try {
      await api.delete(`/ingredients/batches/${batchId}`);
      toast.success('Stok partisi imha edildi.');
      if (selectedIngredient) {
        handleOpenBatchModal(selectedIngredient);
        fetchIngredients(); // Update total quantity in the main list
      }
    } catch (error) {
      toast.error('Silme işlemi başarısız.');
    }
  };

  const filteredIngredients = ingredients.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-500 font-bold text-sm mb-2 uppercase tracking-[0.2em]">
            <Package size={16} />
            <span>Envanter Sistemi</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Hammadde Yönetimi</h1>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary">
            <Download size={18} />
            Dışa Aktar
          </button>
          <button onClick={() => handleOpenModal()} className="btn-primary">
            <Plus size={20} />
            Yeni Hammadde
          </button>
        </div>
      </header>

      <div className="glass-card p-2">
        <div className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between border-b border-slate-200 mb-2">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Hammadde ara..."
              className="input-field pl-12 py-2.5 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors">
              <Filter size={18} />
            </button>
            <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {filteredIngredients.length} Kayıt Bulundu
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
                <th className="px-8 py-5">Hammadde Adı</th>
                <th className="px-8 py-5">Mevcut Stok (Toplam)</th>
                <th className="px-8 py-5">Kritik Seviye</th>
                <th className="px-8 py-5">Birim</th>
                <th className="px-8 py-5">Durum</th>
                <th className="px-8 py-5 text-right">Eylem</th>
              </tr>
            </thead>
            <tbody className="text-sm font-semibold">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  <tr><td colSpan={6} className="p-20 text-center text-slate-600 animate-pulse">Veriler güvenli kanaldan çekiliyor...</td></tr>
                ) : filteredIngredients.map((item, i) => {
                  const isCritical = item.totalQuantity <= item.minimumStockLevel;
                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.05 }}
                      className="group border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all cursor-pointer" onClick={() => handleOpenBatchModal(item)}>
                            <Package size={18} />
                          </div>
                          <span className="text-slate-800 group-hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => handleOpenBatchModal(item)}>{item.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <span className={clsx(
                            "text-lg font-black",
                            isCritical ? "text-rose-500" : "text-slate-900"
                          )}>
                            {item.totalQuantity.toFixed(1)}
                          </span>
                          {isCritical && (
                            <div className="p-1 rounded-md bg-rose-500/10 text-rose-500 animate-bounce">
                              <AlertCircle size={14} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-slate-400 font-bold">{item.minimumStockLevel}</td>
                      <td className="px-8 py-5 text-slate-500">{item.unit}</td>
                      <td className="px-8 py-5">
                        <span className={clsx(
                          "status-badge",
                          isCritical 
                            ? "bg-rose-500/10 text-rose-500 border-rose-500/20" 
                            : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        )}>
                          {isCritical ? 'Kritik' : 'Yeterli'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleOpenBatchModal(item)} title="Parti Detayları (SKT)" className="p-2 hover:bg-indigo-50 rounded-lg text-indigo-600 hover:text-indigo-800 transition-colors">
                            <Calendar size={18} />
                          </button>
                          <button onClick={() => handleOpenModal(item)} title="Düzenle" className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(item.id)} title="Sil" className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-rose-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingIngredient ? "Hammadde Düzenle" : "Yeni Hammadde Ekle"}
        icon={<Package size={24} />}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Hammadde Adı</label>
            <input 
              type="text" 
              required 
              className="input-field" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Örn: Un, Şeker, Süt..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kritik Stok Seviyesi</label>
              <input 
                type="number" 
                required 
                min="0"
                step="0.01"
                className="input-field" 
                value={formData.minimumStockLevel}
                onChange={e => setFormData({...formData, minimumStockLevel: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Birim</label>
              <select 
                className="input-field appearance-none cursor-pointer"
                value={formData.unit}
                onChange={e => setFormData({...formData, unit: e.target.value})}
              >
                <option value="kg">Kilogram (kg)</option>
                <option value="gr">Gram (gr)</option>
                <option value="lt">Litre (lt)</option>
                <option value="ADET">Adet</option>
              </select>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 italic mt-2">
            * Stok miktarını artırmak için lütfen "Satın Alma / Mal Kabul" modülünü kullanın. Bu ekrandan sadece hammadde tanımları ve kritik seviyeler yönetilir.
          </p>
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">İptal</button>
            <button type="submit" className="btn-primary">{editingIngredient ? 'Güncelle' : 'Kaydet'}</button>
          </div>
        </form>
      </Modal>

      {/* Batch Details Modal */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title={`${selectedIngredient?.name} - Stok Partileri (SKT Detayı)`}
        icon={<Calendar size={24} />}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Toplam Mevcut Stok</p>
              <p className="text-3xl font-black text-slate-900">{selectedIngredient?.totalQuantity.toFixed(1)} <span className="text-sm text-slate-400">{selectedIngredient?.unit}</span></p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kritik Seviye</p>
              <p className="text-xl font-black text-slate-600">{selectedIngredient?.minimumStockLevel}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Aktif Partiler (FEFO Sıralı)</h4>
            {batchesLoading ? (
               <div className="py-12 text-center text-slate-400 animate-pulse font-bold">Parti verileri okunuyor...</div>
            ) : batches.length > 0 ? (
              <div className="space-y-3">
                {batches.map((batch) => {
                  const daysLeft = Math.ceil((new Date(batch.expirationDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                  const isExpiredSoon = daysLeft <= 7;
                  
                  return (
                    <div key={batch.id} className="glass-card p-4 flex items-center justify-between hover:border-indigo-500/30 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className={clsx(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                          isExpiredSoon ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-500"
                        )}>
                          <Clock size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <span className="font-black text-slate-700 text-sm">SKT: {new Date(batch.expirationDate).toLocaleDateString('tr-TR')}</span>
                             {isExpiredSoon && <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded uppercase animate-pulse">Acil Tüket</span>}
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold">Giriş: {new Date(batch.receivedDate).toLocaleDateString('tr-TR')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-black text-slate-900">{batch.quantity.toFixed(1)} <span className="text-[10px] text-slate-400 uppercase">{selectedIngredient?.unit}</span></p>
                          <p className="text-[10px] text-indigo-600 font-bold">₺{batch.unitPrice.toFixed(2)} / birim</p>
                        </div>
                        <button 
                          onClick={() => handleDeleteBatch(batch.id)}
                          className="p-2.5 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                          title="Partiyi İmha Et / Çöpe At"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-500 text-sm font-medium">Bu ürün için aktif stok partisi bulunamadı.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-3">
             <button onClick={() => setIsBatchModalOpen(false)} className="flex-1 btn-secondary">Kapat</button>
             <button className="flex-1 btn-primary text-xs flex items-center justify-center gap-2">
                <Plus size={16} /> Mal Kabul Yap
             </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Ingredients;
