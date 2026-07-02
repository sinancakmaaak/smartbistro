import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, Utensils, Info, ArrowRight, Grid, List as ListIcon, Scale, Percent, CheckCircle, X } from 'lucide-react';
import { ProductService, IngredientService } from '../services/api';
import api from '../services/api'; // direct import for categories
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import axios from 'axios';

interface ProductIngredient {
  ingredientId: number;
  ingredientName: string;
  amountUsed: number;
  unit: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  active: boolean;
  categoryId: number | null;
  categoryName: string | null;
  ingredients: ProductIngredient[];
  discountPercentage?: number;
  discountedPrice?: number;
  imageUrl?: string;
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ name: '', price: 0, active: true, categoryId: 0, discountPercentage: 0, imageUrl: '' });
  const [categories, setCategories] = useState<any[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  
  // Recipe management states
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [recipeIngredients, setRecipeIngredients] = useState<any[]>([]);
  const [selectedIngredientId, setSelectedIngredientId] = useState<string>('');
  const [ingredientAmount, setIngredientAmount] = useState<string>('');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await ProductService.getAllActive();
      setProducts(data);
    } catch (error) {
      toast.error('Ürünler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const fetchIngredients = async () => {
    try {
      const data = await IngredientService.getAllActive();
      setIngredients(data || []);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
    }
  };

  const fetchAiSuggestions = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/analytics/dynamic-menu-suggestions');
      setAiSuggestions(response.data || []);
    } catch (error) {
      console.error('Error fetching AI suggestions:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchIngredients();
    fetchAiSuggestions();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {}
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({ 
        name: product.name, 
        price: product.price, 
        active: product.active, 
        categoryId: product.categoryId || 0,
        discountPercentage: product.discountPercentage || 0,
        imageUrl: product.imageUrl || ''
      });
      setRecipeIngredients(
        (product.ingredients || []).map((ing: any) => ({
          ingredientId: ing.ingredientId,
          ingredientName: ing.ingredientName,
          amountUsed: ing.amountUsed,
          unit: ing.unit
        }))
      );
    } else {
      setEditingProduct(null);
      setFormData({ name: '', price: 0, active: true, categoryId: 0, discountPercentage: 0, imageUrl: '' });
      setRecipeIngredients([]);
    }
    setSelectedIngredientId('');
    setIngredientAmount('');
    setIsModalOpen(true);
  };

  const handleOpenRecipeModal = (product: Product) => {
    setSelectedProduct(product);
    setIsRecipeModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const toastId = toast.loading('Kaydediliyor...');
      
      const payload = {
        ...formData,
        ingredients: recipeIngredients.map(ri => ({
          ingredientId: ri.ingredientId,
          amountUsed: ri.amountUsed
        }))
      };

      if (editingProduct) {
        await ProductService.update(editingProduct.id, payload);
      } else {
        await ProductService.create(payload);
      }
      toast.dismiss(toastId);
      toast.success('Ürün başarıyla kaydedildi!');
      setIsModalOpen(false);
      fetchProducts();
    } catch (error) {
      toast.dismiss();
      toast.error('Kayıt işlemi başarısız oldu.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
    try {
      await ProductService.delete(id);
      toast.success('Ürün silindi!');
      fetchProducts();
    } catch (error) {
      toast.error('Silme işlemi başarısız.');
    }
  };

  const filteredProducts = products.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-500 font-bold text-sm mb-2 uppercase tracking-[0.2em]">
            <Utensils size={16} />
            <span>Katalog Yönetimi</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Menü & Ürünler</h1>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <Plus size={20} />
          Yeni Ürün Ekle
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Menüde ara..."
            className="input-field pl-12 py-3"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button 
            onClick={() => setViewMode('grid')}
            className={clsx("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-800")}
          >
            <Grid size={18} />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={clsx("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-800")}
          >
            <ListIcon size={18} />
          </button>
        </div>
      </div>

      <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6" : "space-y-3"}>
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="col-span-full py-20 text-center text-slate-600 font-bold uppercase tracking-widest animate-pulse">Menü öğeleri hazırlanıyor...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full py-20 glass-card flex flex-col items-center justify-center gap-4 text-slate-500">
              <Utensils size={64} className="opacity-10" />
              <p className="font-bold">Henüz ürün eklenmemiş.</p>
            </div>
          ) : (
            filteredProducts.map((product, i) => {
              const suggestion = aiSuggestions.find((s: any) => s.productId === product.id);
              const hasActiveDiscount = product.discountPercentage && product.discountPercentage > 0;

              return (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={clsx(
                    "glass-card group overflow-hidden transition-all duration-300 relative",
                    hasActiveDiscount 
                      ? "border-emerald-500/30 bg-emerald-50/10 shadow-md shadow-emerald-500/5 hover:border-emerald-500/60"
                      : suggestion && "border-amber-500/20 bg-amber-50/5 hover:border-amber-500/40",
                    viewMode === 'grid' ? "p-0" : "p-4 flex items-center justify-between"
                  )}
                >
                  {viewMode === 'grid' ? (
                    <>
                      <div className="h-40 bg-slate-200 relative overflow-hidden">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name} 
                            className="w-full h-full object-contain bg-white group-hover:scale-102 transition-transform duration-500" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                            <Utensils size={32} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/20 to-transparent opacity-60"></div>
                        <div className="absolute bottom-4 left-4">
                           <span className="status-badge bg-indigo-500/10 text-indigo-400 border-indigo-500/20">Aktif</span>
                        </div>
                        {hasActiveDiscount ? (
                          <span className="absolute top-4 left-4 bg-emerald-500 text-white font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full z-10">
                            🔥 -%{product.discountPercentage} Kampanya
                          </span>
                        ) : suggestion ? (
                          <span className="absolute top-4 left-4 bg-amber-500/90 backdrop-blur-sm text-white font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full z-10">
                            💡 AI Önerisi: -%{suggestion.discountPercentage}
                          </span>
                        ) : (
                          <span className="absolute top-4 left-4 bg-emerald-500/10 backdrop-blur-sm text-emerald-600 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full z-10 border border-emerald-200/50">
                            🛡️ Risk Yok (Normal)
                          </span>
                        )}
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                           <button onClick={() => handleOpenModal(product)} className="p-2 bg-white/90 backdrop-blur-md rounded-lg text-slate-700 hover:bg-indigo-600 hover:text-white transition-colors"><Edit2 size={14}/></button>
                           <button onClick={() => handleDelete(product.id)} className="p-2 bg-white/90 backdrop-blur-md rounded-lg text-slate-700 hover:bg-rose-600 hover:text-white transition-colors"><Trash2 size={14}/></button>
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-black text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">{product.name}</h3>
                        {hasActiveDiscount ? (
                          <div className="flex items-center gap-2 mb-6">
                            <span className="text-sm font-bold text-slate-400 line-through">₺{product.price}</span>
                            <span className="text-2xl font-black text-emerald-600">₺{product.discountedPrice}</span>
                          </div>
                        ) : (
                          <p className="text-2xl font-black text-indigo-600 mb-6">₺{product.price}</p>
                        )}
                        <button 
                          onClick={() => handleOpenRecipeModal(product)}
                          className="w-full py-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                        >
                          <Info size={14} />
                          Reçete Detayları
                          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-6">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name} 
                            className="w-12 h-12 rounded-xl object-cover shrink-0" 
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <Utensils size={20}/>
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            {product.name}
                            {suggestion && !hasActiveDiscount ? (
                              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px] font-bold border border-amber-200">💡 AI Önerisi: -%{suggestion.discountPercentage}</span>
                            ) : !hasActiveDiscount ? (
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold border border-emerald-200/50">🛡️ Risk Yok</span>
                            ) : null}
                          </h3>
                          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Kategori: {product.categoryName || 'Kategorisiz'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-12">
                        {hasActiveDiscount ? (
                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400 line-through">₺{product.price}</span>
                              <span className="text-xl font-black text-emerald-600">₺{product.discountedPrice}</span>
                            </div>
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">-%{product.discountPercentage} Kampanyada</span>
                          </div>
                        ) : (
                          <p className="text-xl font-black text-indigo-600">₺{product.price}</p>
                        )}
                        <div className="flex gap-2">
                           <button onClick={() => handleOpenRecipeModal(product)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"><Info size={16}/></button>
                           <button onClick={() => handleOpenModal(product)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"><Edit2 size={16}/></button>
                           <button onClick={() => handleDelete(product.id)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Product Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingProduct ? "Ürün Düzenle" : "Yeni Ürün Ekle"}
        icon={<Utensils size={24} />}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {(() => {
            const modalSuggestion = editingProduct ? aiSuggestions.find((s: any) => s.productId === editingProduct.id) : null;
            if (!modalSuggestion) {
              return (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col gap-1 text-slate-800 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/10 rounded-full blur-lg"></div>
                  <div className="flex gap-2 items-start">
                    <CheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-emerald-800 uppercase tracking-wider">Yapay Zeka Risk Analizi</p>
                      <p className="text-xs font-bold leading-relaxed text-emerald-700">
                        Bu ürünün hammadde stoklarında herhangi bir israf riski tespit edilmemiştir.
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold italic leading-normal">
                        🛡️ Fiyatlandırma normal standartlarında (%0 indirim) tutulabilir.
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col gap-2 text-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/10 rounded-full blur-lg"></div>
                <div className="flex gap-2 items-start">
                  <Percent size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-amber-800 uppercase tracking-wider">Yapay Zeka Kampanya Önerisi</p>
                    <p className="text-xs font-semibold leading-relaxed">
                      Zayiatı engellemek amacıyla bu üründe <span className="font-black">-%{modalSuggestion.discountPercentage}</span> indirim uygulanması öneriliyor!
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold italic leading-normal">
                      💡 Gerekçe: {modalSuggestion.recommendation}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, discountPercentage: modalSuggestion.discountPercentage })}
                  className="mt-1.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all w-full shadow-sm active:scale-95"
                >
                  Önerilen İndirim Oranını Seç (-%{modalSuggestion.discountPercentage})
                </button>
              </div>
            );
          })()}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ürün Görseli</label>
            <div className="flex items-center gap-4">
              {formData.imageUrl ? (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
                  <img src={formData.imageUrl} alt="Önizleme" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, imageUrl: '' })}
                    className="absolute -top-1 -right-1 p-0.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 bg-slate-50 shrink-0">
                  <Utensils size={20} />
                </div>
              )}
              <label className="flex-1 cursor-pointer bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold text-center transition-all shadow-sm">
                <span>Görsel Seç ve Yükle</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    const uploadToast = toast.loading('Görsel yükleniyor...');
                    try {
                      const uploadFormData = new FormData();
                      uploadFormData.append('file', file);
                      
                      const response = await api.post('/products/upload', uploadFormData, {
                        headers: {
                          'Content-Type': 'multipart/form-data'
                        }
                      });
                      
                      setFormData({ ...formData, imageUrl: response.data.url });
                      toast.dismiss(uploadToast);
                      toast.success('Görsel başarıyla yüklendi!');
                    } catch (error) {
                      toast.dismiss(uploadToast);
                      toast.error('Görsel yüklenirken hata oluştu.');
                    }
                  }} 
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ürün Adı</label>
            <input 
              type="text" 
              required 
              className="input-field" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Örn: Klasik Burger..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Satış Fiyatı (₺)</label>
              <input 
                type="number" 
                required 
                min="0"
                step="0.01"
                className="input-field" 
                value={formData.price}
                onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Aktif Kampanya İndirimi (%)</label>
              <select 
                className="input-field appearance-none cursor-pointer"
                value={formData.discountPercentage}
                onChange={e => setFormData({...formData, discountPercentage: parseInt(e.target.value)})}
              >
                <option value={0}>İndirim Yok (%0)</option>
                <option value={10}>%10 İndirim</option>
                <option value={15}>%15 İndirim</option>
                <option value={20}>%20 İndirim</option>
                <option value={25}>%25 İndirim</option>
                <option value={30}>%30 İndirim</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kategori</label>
            <select 
              required
              className="input-field appearance-none cursor-pointer"
              value={formData.categoryId}
              onChange={e => setFormData({...formData, categoryId: parseInt(e.target.value)})}
            >
              <option value={0} disabled>Kategori Seçiniz</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Reçete Düzenleme Alanı */}
          <div className="border-t border-slate-100 pt-4 mt-4 space-y-4">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Scale size={14} className="text-indigo-500" /> Yemek Reçetesi (Kullanılan Hammaddeler)
            </h4>
            
            {/* Ekli Malzeme Listesi */}
            {recipeIngredients.length > 0 ? (
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                {recipeIngredients.map((item) => (
                  <div key={item.ingredientId} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                    <span className="text-xs font-bold text-slate-700">{item.ingredientName}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                        {item.amountUsed} {item.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => setRecipeIngredients(recipeIngredients.filter(ri => ri.ingredientId !== item.ingredientId))}
                        className="p-1 hover:bg-rose-50 rounded-lg text-rose-500 transition-colors active:scale-95"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 font-medium italic py-2">
                Henüz reçete tanımlanmamış. Reçetesiz siparişlerde stok düşümü yapılmaz.
              </p>
            )}

            {/* Yeni Malzeme Ekleme Kontrolleri */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reçeteye Hammadde Ekle</p>
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-6">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Hammadde</label>
                  <select
                    className="input-field text-xs py-2 h-9"
                    value={selectedIngredientId}
                    onChange={(e) => setSelectedIngredientId(e.target.value)}
                  >
                    <option value="">Seçiniz...</option>
                    {ingredients
                      .filter(ing => !recipeIngredients.some(ri => ri.ingredientId === ing.id))
                      .map(ing => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} ({ing.unit})
                        </option>
                      ))
                    }
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Miktar</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    className="input-field text-xs py-2 h-9"
                    placeholder="Miktar"
                    value={ingredientAmount}
                    onChange={(e) => setIngredientAmount(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedIngredientId || !ingredientAmount) {
                      toast.error('Lütfen hammadde ve geçerli bir miktar seçin.');
                      return;
                    }
                    const ing = ingredients.find(i => i.id === parseInt(selectedIngredientId));
                    const amt = parseFloat(ingredientAmount);
                    if (ing && amt > 0) {
                      setRecipeIngredients([
                        ...recipeIngredients,
                        {
                          ingredientId: ing.id,
                          ingredientName: ing.name,
                          amountUsed: amt,
                          unit: ing.unit
                        }
                      ]);
                      setSelectedIngredientId('');
                      setIngredientAmount('');
                    } else {
                      toast.error('Miktar sıfırdan büyük olmalıdır.');
                    }
                  }}
                  className="col-span-3 h-9 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 active:scale-95 shadow-sm shadow-indigo-500/10"
                >
                  <Plus size={14} /> Ekle
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">İptal</button>
            <button type="submit" className="btn-primary">{editingProduct ? 'Güncelle' : 'Kaydet'}</button>
          </div>
        </form>
      </Modal>

      {/* Recipe Detail Modal */}
      <Modal
        isOpen={isRecipeModalOpen}
        onClose={() => setIsRecipeModalOpen(false)}
        title={`${selectedProduct?.name} - Reçete Detayı`}
        icon={<Scale size={24} />}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">
          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
            <p className="text-sm text-indigo-700 font-medium italic">
              "Bu yemek sipariş edildiğinde, aşağıdaki malzemeler FEFO (İlk SKT'li İlk Çıkar) mantığıyla otomatik olarak stoktan düşülecektir."
            </p>
          </div>
          
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Kullanılan Malzemeler</h4>
            {selectedProduct?.ingredients && selectedProduct.ingredients.length > 0 ? (
              <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {selectedProduct.ingredients.map((ing, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                        <Scale size={14} />
                      </div>
                      <span className="font-bold text-slate-700">{ing.ingredientName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-indigo-600">{ing.amountUsed}</span>
                      <span className="ml-1 text-xs font-bold text-slate-400 uppercase">{ing.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-500 text-sm">Bu ürün için henüz reçete tanımlanmamış.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100">
             <button 
              onClick={() => setIsRecipeModalOpen(false)}
              className="w-full btn-secondary"
            >
              Kapat
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Simple utility to match the class names
function clsx(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

export default Products;
