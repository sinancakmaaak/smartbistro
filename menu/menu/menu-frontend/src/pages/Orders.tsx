import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Minus, X, CheckCircle2, History, CreditCard, DollarSign, Clock, Search, LayoutGrid, Zap, ChefHat, Utensils } from 'lucide-react';
import api, { ProductService, OrderService, TableService } from '../services/api';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Orders = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<number | 'all'>('all');
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<number | ''>('');
  const [searchParams] = useSearchParams();
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'KART' | 'NAKİT'>('KART');

  const { user } = useAuth();
  const [unpreparedOrders, setUnpreparedOrders] = useState<any[]>([]);
  const [kdsLoading, setKdsLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'KITCHEN') {
      fetchKdsOrders();
      const interval = setInterval(fetchKdsOrders, 10000); // 10 saniyede bir otomatik yenileme (polling)
      return () => clearInterval(interval);
    } else {
      fetchProducts();
      fetchOrders();
      fetchTables();
      fetchCategories();
      fetchAiSuggestions();
    }
  }, [user]);

  const fetchAiSuggestions = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/analytics/dynamic-menu-suggestions');
      setAiSuggestions(response.data || []);
    } catch (error) {
      console.error('Error fetching AI suggestions:', error);
    }
  };

  const fetchKdsOrders = async () => {
    try {
      setKdsLoading(true);
      const data = await OrderService.getActiveUnprepared();
      setUnpreparedOrders(data);
    } catch (error) {
      console.error('Error fetching KDS orders:', error);
    } finally {
      setKdsLoading(false);
    }
  };

  const handlePrepareOrder = async (orderId: number) => {
    try {
      const loadingToast = toast.loading('Sipariş hazırlanıyor...');
      await OrderService.markAsPrepared(orderId);
      toast.dismiss(loadingToast);
      toast.success('Sipariş başarıyla hazırlandı olarak işaretlendi!');
      fetchKdsOrders();
    } catch (error) {
      toast.dismiss();
      toast.error('Hata: Sipariş hazırlandı olarak işaretlenemedi.');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {}
  };

  const fetchProducts = async () => {
    try {
      const data = await ProductService.getAllActive();
      setProducts(data);
    } catch (error) {
      toast.error('Ürünler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const data = await OrderService.getAll();
      setOrders(data.sort((a: any, b: any) => b.id - a.id));
    } catch (error) {}
  };

  const fetchTables = async () => {
    try {
      const data = await TableService.getAll();
      setTables(data);
      const urlTableId = searchParams.get('tableId');
      if (urlTableId) {
        setSelectedTableId(parseInt(urlTableId));
      }
    } catch (error) {}
  };

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      const finalPrice = product.discountPercentage > 0 ? product.discountedPrice : product.price;
      return [...prev, { 
        productId: product.id, 
        name: product.name, 
        price: finalPrice, 
        originalPrice: product.price,
        quantity: 1 
      }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    const orderData = { 
      tableId: selectedTableId !== '' ? selectedTableId : null,
      paymentMethod: paymentMethod,
      items: cart.map(item => ({ 
        productId: item.productId, 
        quantity: item.quantity,
        priceOverride: item.price !== item.originalPrice ? item.price : null
      })) 
    };
    try {
      const loadingToast = toast.loading('İşlem yapılıyor...');
      await OrderService.placeOrder(orderData);
      toast.dismiss(loadingToast);
      toast.success('Sipariş başarıyla gönderildi!');
      setCart([]);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data || 'Hata: Stok yetersiz olabilir.');
    }
  };

  const filteredProducts = products.map(p => {
    const suggestion = aiSuggestions.find((s: any) => s.productId === p.id);
    return {
      ...p,
      aiSuggestionPercentage: suggestion?.discountPercentage || null,
      aiSuggestionPrice: suggestion?.discountedPrice || null,
      riskIngredient: suggestion?.riskIngredient || null,
      recommendation: suggestion?.recommendation || null
    };
  }).filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategoryId === 'all' || p.categoryId === activeCategoryId;
    return matchesSearch && matchesCategory;
  });

  if (user?.role === 'KITCHEN') {
    return (
      <div className="space-y-8 h-[calc(100vh-6rem)] flex flex-col animate-in fade-in duration-500">
        <header className="flex justify-between items-end flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 text-rose-500 font-bold text-sm mb-2 uppercase tracking-[0.2em]">
              <ChefHat size={16} className="animate-spin-slow" />
              <span>KDS - MUTFAK EKRANI</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Hazırlanacak Siparişler</h1>
          </div>
          <button 
            onClick={fetchKdsOrders}
            disabled={kdsLoading}
            className="btn-secondary flex items-center gap-2"
          >
            <Clock size={16} className={clsx(kdsLoading && "animate-spin")} /> Mutfak Yenile
          </button>
        </header>

        {kdsLoading ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest animate-pulse">
            Mutfak siparişleri yükleniyor...
          </div>
        ) : unpreparedOrders.length === 0 ? (
          <div className="flex-1 glass-card flex flex-col items-center justify-center text-slate-600 gap-4">
            <CheckCircle2 size={64} className="text-emerald-500 animate-bounce" />
            <h2 className="text-xl font-black uppercase tracking-widest text-slate-800">Tüm Siparişler Teslim Edildi!</h2>
            <p className="text-xs font-bold text-slate-400">Yeni bir sipariş girildiğinde mutfak fişi otomatik olarak buraya düşecektir.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto pr-2 custom-scrollbar pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {unpreparedOrders.map((order) => {
                const diffMin = Math.floor((Date.now() - new Date(order.orderDate).getTime()) / 60000);
                const isUrgent = diffMin >= 10; // 10 dakikadan fazla bekleyenler kırmızı uyarı

                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={clsx(
                      "bg-white border-2 rounded-[2rem] p-6 shadow-xl flex flex-col relative overflow-hidden transition-all duration-300",
                      isUrgent 
                        ? "border-rose-400 shadow-rose-100 hover:shadow-rose-200" 
                        : "border-indigo-100 shadow-slate-100 hover:shadow-slate-200"
                    )}
                  >
                    {/* Header: Table and Time */}
                    <div className="flex justify-between items-start border-b border-dashed border-slate-200 pb-4 mb-4">
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                          {order.tableName ? `MASA ${order.tableName}` : 'PAKET SERVİS'}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                          Sipariş #{order.id}
                        </p>
                      </div>
                      <span className={clsx(
                        "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider",
                        isUrgent 
                          ? "bg-rose-500 text-white animate-pulse" 
                          : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                      )}>
                        {diffMin < 1 ? 'YENİ 🆕' : `${diffMin} dk önce`}
                      </span>
                    </div>

                    {/* Monospace receipt items list */}
                    <div className="flex-1 space-y-3 mb-6">
                      {order.items?.map((item: any) => (
                        <div key={item.id} className="flex items-start gap-3">
                          <span className="font-black text-rose-600 bg-rose-50 w-7 h-7 flex items-center justify-center rounded-lg text-xs border border-rose-100 shrink-0">
                            {item.quantity}x
                          </span>
                          <span className="font-semibold text-slate-800 text-sm tracking-wide mt-0.5 uppercase">
                            {item.productName}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Preparing Time Badge */}
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-wider mb-4">
                      <Clock size={12} />
                      <span>Giriş Saat: {new Date(order.orderDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Action button */}
                    <button
                      type="button"
                      onClick={() => handlePrepareOrder(order.id)}
                      className={clsx(
                        "w-full py-4 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg transition-all flex items-center justify-center gap-2",
                        isUrgent 
                          ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/25" 
                          : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25"
                      )}
                    >
                      <CheckCircle2 size={16} /> Hazırlandı (Tamamla)
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 h-[calc(100vh-6rem)] flex flex-col">
      <header className="flex justify-between items-end flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 text-indigo-500 font-bold text-sm mb-2 uppercase tracking-[0.2em]">
            <ShoppingCart size={16} />
            <span>Satış Noktası (POS)</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Sipariş İşleme</h1>
        </div>
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="btn-secondary group"
        >
          {showHistory ? <Plus size={20} /> : <History size={20} className="group-hover:rotate-12 transition-transform" />}
          {showHistory ? 'Yeni Sipariş Paneli' : 'Geçmiş Siparişler'}
        </button>
      </header>

      {showHistory ? (
        <div className="glass-card overflow-hidden flex-1">
          <div className="overflow-auto h-full">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-white/90 backdrop-blur-md">
                <tr className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  <th className="px-8 py-6 border-b border-slate-200">ID</th>
                  <th className="px-8 py-6 border-b border-slate-200">Zaman</th>
                  <th className="px-8 py-6 border-b border-slate-200">Ürün Detayları</th>
                  <th className="px-8 py-6 border-b border-slate-200 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody className="font-semibold">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                    <td className="px-8 py-6 text-slate-900 font-black">#{order.id}</td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock size={14} />
                        {new Date(order.orderDate).toLocaleString('tr-TR')}
                        {order.tableName && (
                          <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                            Masa: {order.tableName}
                          </span>
                        )}
                        {order.paymentMethod && (
                          <span className={clsx(
                            "ml-2 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border",
                            order.paymentMethod === 'NAKİT'
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                          )}>
                            {order.paymentMethod === 'NAKİT' ? '💵 Nakit' : '💳 Kart'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-2">
                        {order.items?.map((item: any) => (
                          <span key={item.id} className="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-md text-[10px] font-black uppercase">
                            {item.productName} x{item.quantity}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right font-black text-lg text-emerald-400">₺{order.totalAmount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 overflow-hidden">
          <div className="lg:col-span-8 flex flex-col gap-6 overflow-hidden">
            {/* AI CAMPAIGN RECOMMENDATIONS ALERT */}
            {aiSuggestions.length > 0 && (
              <div className="flex items-center gap-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-slate-700 text-xs shrink-0 relative overflow-hidden">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl shrink-0">
                  <Zap size={16} className="fill-indigo-600 animate-pulse" />
                </div>
                <div className="flex-1">
                  <span className="font-black text-[10px] text-indigo-600 uppercase tracking-wider block mb-0.5">Yapay Zeka Akıllı Önerisi</span>
                  <p className="font-semibold leading-relaxed">
                    Zayiat riskini azaltmak için <span className="font-extrabold text-slate-900">{aiSuggestions.map(s => s.productName).join(', ')}</span> için indirim önerilmektedir. Kampanyayı aktif etmek için lütfen <a href="/analytics" className="text-indigo-600 underline font-black hover:text-indigo-500">Analizler</a> panelini kullanın.
                  </p>
                </div>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Hızlı ürün ara (Köfte, İçecek...)" 
                className="input-field pl-12 py-4"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button 
                onClick={() => setActiveCategoryId('all')}
                className={clsx(
                  "px-5 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all whitespace-nowrap border",
                  activeCategoryId === 'all' 
                    ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-800"
                )}
              >
                Tümü
              </button>
              {categories.map(cat => (
                <button 
                  key={cat.id}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={clsx(
                    "px-5 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all whitespace-nowrap border",
                    activeCategoryId === cat.id 
                      ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-800"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-auto pr-2 custom-scrollbar">
              <AnimatePresence>
                {loading ? (
                   <p className="col-span-full text-center py-12 text-slate-600 font-bold uppercase tracking-widest animate-pulse">Menü yükleniyor...</p>
                ) : filteredProducts.map(product => (
                  <motion.button
                    key={product.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => addToCart(product)}
                    className={clsx(
                      "glass-card p-4 flex flex-col text-left group relative overflow-hidden transition-all duration-300",
                      product.discountPercentage > 0 
                        ? "border-emerald-500/30 bg-emerald-50/20 shadow-md shadow-emerald-500/5 hover:border-emerald-500/60"
                        : product.aiSuggestionPercentage && "border-amber-500/20 bg-amber-50/10 hover:border-amber-500/40"
                    )}
                  >
                    {product.discountPercentage > 0 ? (
                      <span className="absolute top-3 right-3 bg-emerald-500 text-white font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full z-10">
                        🔥 Kampanya -%{product.discountPercentage}
                      </span>
                    ) : product.aiSuggestionPercentage ? (
                      <span className="absolute top-3 right-3 bg-amber-500/10 text-amber-600 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full z-10 border border-amber-200">
                        💡 AI Önerisi: -%{product.aiSuggestionPercentage}
                      </span>
                    ) : null}
                    <div className="mb-4 w-full h-32 rounded-2xl bg-slate-100 relative overflow-hidden transition-all group-hover:shadow-md">
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name} 
                          className="w-full h-full object-contain bg-white group-hover:scale-102 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100">
                          <Utensils size={24} />
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2 bg-indigo-600 text-white p-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus size={16} />
                      </div>
                    </div>
                    <p className="font-black text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight mb-1">{product.name}</p>
                    {product.discountPercentage > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-400 line-through">₺{product.price}</span>
                        <span className="text-lg font-black text-emerald-600">₺{product.discountedPrice}</span>
                      </div>
                    ) : (
                      <p className="text-lg font-black text-slate-500">₺{product.price}</p>
                    )}
                    {product.riskIngredient && (
                      <p className={clsx(
                        "text-[9px] font-bold leading-tight mt-1 truncate w-full",
                        product.discountPercentage > 0 ? "text-emerald-600" : "text-amber-600"
                      )} title={product.recommendation}>
                        💡 İsraf Riski: {product.riskIngredient}
                      </p>
                    )}
                    <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 rounded-full -mr-8 -mt-8"></div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="lg:col-span-4 h-full overflow-hidden">
            <div className="glass-card flex flex-col h-full border-indigo-500/20 shadow-[0_0_40px_rgba(79,70,229,0.1)]">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-600/20">
                    <ShoppingCart size={20} />
                  </div>
                  <h2 className="font-black text-slate-900 uppercase tracking-wider text-sm">Aktif Sepet</h2>
                </div>
                <span className="px-2 py-1 bg-slate-100 rounded-md text-[10px] font-black text-slate-500">{cart.length} Ürün</span>
              </div>
              
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <LayoutGrid size={14} className="text-slate-400" />
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Siparişin Açılacağı Masa</label>
                </div>
                <select 
                  className="input-field appearance-none cursor-pointer py-2.5 text-sm"
                  value={selectedTableId}
                  onChange={(e) => setSelectedTableId(e.target.value === '' ? '' : parseInt(e.target.value))}
                >
                  <option value="">Paket Sipariş (Masa Yok)</option>
                  {tables.map(table => (
                    <option key={table.id} value={table.id}>
                      {table.zoneName} - {table.tableNumber} {table.status === 'OCCUPIED' ? '(Dolu)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-3 custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4 opacity-30">
                    <ShoppingCart size={64} />
                    <p className="font-black uppercase tracking-widest text-xs text-center">Sepet Boş<br/>Ürün Ekleyin</p>
                  </div>
                ) : cart.map(item => (
                  <motion.div 
                    key={item.productId}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 group hover:border-indigo-500/30 transition-all shadow-sm"
                  >
                    <div className="flex-1">
                      <p className="font-black text-slate-800 text-xs uppercase tracking-wide group-hover:text-indigo-600 transition-colors">{item.name}</p>
                      <p className="text-[10px] font-black text-slate-500">₺{item.price}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-1.5 border border-slate-200">
                        <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 hover:text-indigo-600 transition-colors"><Minus size={14} /></button>
                        <span className="text-xs font-black text-slate-900 w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 hover:text-indigo-400 transition-colors"><Plus size={14} /></button>
                      </div>
                      <button onClick={() => removeFromCart(item.productId)} className="text-slate-600 hover:text-rose-500 transition-colors"><X size={18} /></button>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <span>Ara Toplam</span>
                    <span>₺{(total * 0.8).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <span>Vergi (20%)</span>
                    <span>₺{(total * 0.2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Genel Toplam</span>
                    <span className="text-3xl font-black text-slate-900 tracking-tight">₺{total}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setPaymentMethod('KART')}
                    className={clsx(
                      "flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border",
                      paymentMethod === 'KART'
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700"
                    )}
                  >
                    <CreditCard size={14} /> Kart
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('NAKİT')}
                    className={clsx(
                      "flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border",
                      paymentMethod === 'NAKİT'
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700"
                    )}
                  >
                    <DollarSign size={14} /> Nakit
                  </button>
                </div>

                <button
                  disabled={cart.length === 0}
                  onClick={handlePlaceOrder}
                  className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-2xl shadow-indigo-600/30 flex items-center justify-center gap-3 active:scale-95"
                >
                  <CheckCircle2 size={20} />
                  Siparişi Tamamla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
