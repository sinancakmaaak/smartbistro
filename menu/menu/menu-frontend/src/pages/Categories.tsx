import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Tag, Layers, CheckCircle2, X } from 'lucide-react';
import api from '../services/api'; // Temporary direct api call for Categories if not fully in api.ts
import toast from 'react-hot-toast';
import Modal from '../components/Modal';

interface Category {
  id: number;
  name: string;
  description: string;
  displayOrder: number;
}

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: 0, name: '', description: '', displayOrder: 0 });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      toast.error('Kategoriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await api.put(`/categories/${formData.id}`, formData);
        toast.success('Kategori güncellendi');
      } else {
        await api.post('/categories', formData);
        toast.success('Kategori oluşturuldu');
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (error) {
      toast.error('İşlem başarısız');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) {
      try {
        await api.delete(`/categories/${id}`);
        toast.success('Kategori silindi');
        fetchCategories();
      } catch (error) {
        toast.error('Kategori silinemedi (Ürünlere atanmış olabilir)');
      }
    }
  };

  const openModal = (category?: Category) => {
    if (category) {
      setFormData(category);
    } else {
      setFormData({ id: 0, name: '', description: '', displayOrder: categories.length + 1 });
    }
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-10 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-500 font-bold text-sm mb-2 uppercase tracking-[0.2em]">
            <Layers size={16} />
            <span>Menü & Envanter</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Kategori Yönetimi</h1>
        </div>
        <button onClick={() => openModal()} className="btn-primary group">
          <Plus size={20} className="group-hover:rotate-90 transition-transform" />
          Yeni Kategori
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence>
          {loading ? (
            <p className="col-span-full text-center py-20 text-slate-600 font-bold uppercase tracking-widest animate-pulse">Yükleniyor...</p>
          ) : categories.length === 0 ? (
             <div className="col-span-full py-20 glass-card flex flex-col items-center justify-center gap-4 text-slate-500">
               <Tag size={64} className="opacity-10" />
               <p className="font-bold">Henüz hiç kategori bulunmuyor.</p>
             </div>
          ) : categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-6 flex flex-col gap-4 relative overflow-hidden group hover:shadow-xl transition-all hover:-translate-y-1 border border-slate-200/50 hover:border-indigo-500/30"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-500"></div>
              
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase rounded-md tracking-wider">
                      Sıra: {cat.displayOrder}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors mb-1">{cat.name}</h3>
                  <p className="text-xs font-semibold text-slate-500">{cat.description || 'Açıklama yok'}</p>
                </div>
              </div>
              
              <div className="relative z-10 flex gap-2 mt-auto pt-4 border-t border-slate-100">
                <button onClick={() => openModal(cat)} className="flex-1 py-2 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">Düzenle</button>
                <button onClick={() => handleDelete(cat.id)} className="w-10 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><X size={16}/></button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={formData.id ? "Kategori Düzenle" : "Yeni Kategori"}
        icon={<Tag size={24} />}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kategori Adı</label>
            <input 
              type="text" 
              required 
              className="input-field" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Örn: Başlangıçlar"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Açıklama (Opsiyonel)</label>
            <input 
              type="text" 
              className="input-field" 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Görüntüleme Sırası</label>
            <input 
              type="number" 
              required
              className="input-field" 
              value={formData.displayOrder}
              onChange={e => setFormData({...formData, displayOrder: parseInt(e.target.value) || 0})}
            />
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">İptal</button>
            <button type="submit" className="btn-primary">Kaydet</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Categories;
