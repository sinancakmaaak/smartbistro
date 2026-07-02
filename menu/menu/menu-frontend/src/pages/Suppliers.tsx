import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Building2, Trash2, Edit2, Phone, Mail, MapPin } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';

interface Supplier {
  id: number;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  isActive: boolean;
}

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Supplier>({ id: 0, name: '', contactPerson: '', phone: '', email: '', address: '', isActive: true });

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/suppliers');
      setSuppliers(response.data);
    } catch (error) {
      toast.error('Tedarikçiler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await api.put(`/suppliers/${formData.id}`, formData);
        toast.success('Tedarikçi güncellendi');
      } else {
        await api.post('/suppliers', formData);
        toast.success('Tedarikçi eklendi');
      }
      setIsModalOpen(false);
      fetchSuppliers();
    } catch (error) {
      toast.error('İşlem başarısız');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Bu tedarikçiyi silmek istediğinize emin misiniz?')) {
      try {
        await api.delete(`/suppliers/${id}`);
        toast.success('Tedarikçi silindi');
        fetchSuppliers();
      } catch (error) {
        toast.error('Tedarikçi silinemedi');
      }
    }
  };

  const openModal = (supplier?: Supplier) => {
    if (supplier) {
      setFormData(supplier);
    } else {
      setFormData({ id: 0, name: '', contactPerson: '', phone: '', email: '', address: '', isActive: true });
    }
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-10 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-500 font-bold text-sm mb-2 uppercase tracking-[0.2em]">
            <Building2 size={16} />
            <span>Tedarik Zinciri</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Tedarikçi Yönetimi</h1>
        </div>
        <button onClick={() => openModal()} className="btn-primary group">
          <Plus size={20} className="group-hover:rotate-90 transition-transform" />
          Yeni Tedarikçi
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {loading ? (
             <p className="col-span-full text-center py-20 text-slate-600 font-bold uppercase tracking-widest animate-pulse">Yükleniyor...</p>
          ) : suppliers.length === 0 ? (
             <div className="col-span-full py-20 glass-card flex flex-col items-center justify-center gap-4 text-slate-500">
               <Building2 size={64} className="opacity-10" />
               <p className="font-bold">Sistemde kayıtlı tedarikçi bulunmuyor.</p>
             </div>
          ) : suppliers.map((supplier, i) => (
            <motion.div
              key={supplier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-6 flex flex-col gap-6 relative overflow-hidden group hover:shadow-xl transition-all border border-slate-200/50 hover:border-indigo-500/30"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors mb-1">{supplier.name}</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{supplier.contactPerson || 'Kişi belirtilmemiş'}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openModal(supplier)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16}/></button>
                  <button onClick={() => handleDelete(supplier.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                  <div className="p-1.5 bg-slate-100 rounded-md text-slate-400"><Phone size={14}/></div>
                  {supplier.phone || '-'}
                </div>
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                  <div className="p-1.5 bg-slate-100 rounded-md text-slate-400"><Mail size={14}/></div>
                  {supplier.email || '-'}
                </div>
                <div className="flex items-start gap-3 text-sm font-semibold text-slate-600">
                  <div className="p-1.5 bg-slate-100 rounded-md text-slate-400 mt-0.5"><MapPin size={14}/></div>
                  <span className="flex-1 line-clamp-2">{supplier.address || '-'}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={formData.id ? "Tedarikçi Düzenle" : "Yeni Tedarikçi"}
        icon={<Building2 size={24} />}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Firma Adı</label>
            <input type="text" required className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Örn: ABC Gıda A.Ş." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Yetkili Kişi</label>
              <input type="text" className="input-field" value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} placeholder="Ad Soyad" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Telefon</label>
              <input type="text" className="input-field" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="05XX XXX XX XX" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">E-Posta</label>
            <input type="email" className="input-field" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="ornek@firma.com" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Açık Adres</label>
            <textarea className="input-field min-h-[80px]" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Firma adresi..."></textarea>
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

export default Suppliers;
