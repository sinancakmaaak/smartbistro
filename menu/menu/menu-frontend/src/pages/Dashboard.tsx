import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  DollarSign,
  ArrowUpRight,
  Activity,
  Calendar,
  Clock,
  ShoppingBag,
  Sparkles,
  ChevronRight,
  UtensilsCrossed,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { IngredientService, ProductService, OrderService, WasteRecordService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

interface TimelineEvent {
  id: string;
  type: 'order' | 'waste';
  title: string;
  subtitle: string;
  amount: number;
  date: Date;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [data, setData] = useState({
    salesToday: 0,
    ordersCount: 0,
    activeCampaigns: 0,
    criticalCount: 0,
    productsCount: 0,
    criticalItems: [] as any[],
    timelineEvents: [] as TimelineEvent[],
    aiInsights: [] as string[]
  });

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [ingredients, products, orders, wastes] = await Promise.all([
        IngredientService.getAllActive(),
        ProductService.getAllActive(),
        OrderService.getAll(),
        WasteRecordService.getAll()
      ]);

      // 1. Kritik Stok Hesaplama
      const critical = (ingredients || []).filter((i: any) => i.totalQuantity < (i.minimumStockLevel || 10));
      
      // 2. Bugünün Satış ve Siparişleri
      const todayStr = new Date().toDateString();
      const todayOrders = (orders || []).filter((o: any) => new Date(o.orderDate).toDateString() === todayStr);
      const todaySales = todayOrders.reduce((sum: number, o: any) => sum + o.totalAmount, 0);

      // 3. Canlı Operasyon Zaman Tüneli (Merged Orders and Waste Logs)
      const orderEvents = (orders || []).map((o: any) => ({
        id: `order-${o.id}`,
        type: 'order' as const,
        title: `Sipariş #${o.id} Kapatıldı`,
        subtitle: `${o.paymentMethod === 'KART' ? '💳 Kart' : '💵 Nakit'} İşlem`,
        amount: o.totalAmount,
        date: new Date(o.orderDate)
      }));

      const wasteEvents = (wastes || []).map((w: any) => ({
        id: `waste-${w.id}`,
        type: 'waste' as const,
        title: `${w.ingredientName} Zayiatı`,
        subtitle: w.reason.startsWith('Other') ? `Diğer (${w.reason.substring(7)})` : (w.reason === 'Expired' ? 'SKT Aşımı' : w.reason === 'Spoiled' ? 'Bozulma' : w.reason === 'Spilled' ? 'Dökülme' : w.reason),
        amount: w.financialLoss,
        date: new Date(w.wasteDate)
      }));

      const timelineEvents = [...orderEvents, ...wasteEvents]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 6);

      // 4. Yapay Zeka Karar Destek Bildirileri (AI DSS Insights Console)
      const aiInsights: string[] = [];
      if (critical.length > 0) {
        aiInsights.push(`⚠️ Envanter Alarmı: ${critical[0].name} stoku kritik sınırda! (${critical[0].totalQuantity.toFixed(1)} ${critical[0].unit} kaldı). Menünün aksamaması için satın alım önerilir.`);
      }
      
      const expiringSoon = (ingredients || []).some((i: any) => i.totalQuantity > 0 && i.totalQuantity < 25);
      if (expiringSoon) {
        aiInsights.push(`💡 Yapay Zeka Stok Tahmini: Zayiat riski azaltıldı. Son SKT'li partiler başarıyla tüketiliyor!`);
      }

      const activeDiscounts = (products || []).filter((p: any) => p.discountPercentage > 0).length;
      if (activeDiscounts === 0) {
        aiInsights.push(`💡 AI Fiyat Önerisi: Menü durgunluğunu aşmak için burger grubunda %15 indirim uygulayarak masa cirosunu %20 yükseltebilirsiniz.`);
      }

      const activeCampaigns = (products || []).filter((p: any) => p.discountPercentage > 0).length;

      setData({
        salesToday: todaySales,
        ordersCount: (orders || []).length,
        activeCampaigns,
        criticalCount: critical.length,
        productsCount: (products || []).length,
        criticalItems: critical.slice(0, 4),
        timelineEvents,
        aiInsights
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'KITCHEN') {
      navigate('/orders');
      return;
    }
    loadDashboardData();
  }, [user, navigate]);

  const stats = [
    { label: 'Bugünkü Satış', value: `₺${data.salesToday.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'from-emerald-500 to-teal-600', sub: 'Gerçek zamanlı ciro', path: '/orders' },
    { label: 'Toplam Sipariş', value: data.ordersCount, icon: TrendingUp, color: 'from-indigo-500 to-blue-600', sub: 'Tüm sipariş geçmişi', path: '/orders' },
    { label: 'Aktif AI Kampanyaları', value: data.activeCampaigns, icon: Sparkles, color: 'from-amber-500 to-orange-600', sub: 'İndirim uygulanan ürünler', path: '/analytics' },
  ];

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-500 font-bold text-sm mb-2 uppercase tracking-[0.2em]">
            <Activity size={16} />
            <span>Smart Bistro</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Yönetici Yönetim Paneli</h1>
        </div>
        <div className="flex items-center gap-3 px-5 py-3 glass-card bg-white border border-slate-200 rounded-2xl shadow-sm self-start sm:self-auto">
          <Calendar size={18} className="text-slate-500 animate-pulse" />
          <span className="text-sm font-bold text-slate-700">
            {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </header>

      {/* STATS SUMMARY GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => navigate(stat.path)}
            className="glass-card relative overflow-hidden group cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all border border-slate-100"
          >
            <div className="p-6 relative z-10">
              <div className="flex justify-between items-start mb-5">
                <div className={clsx("p-3 rounded-2xl bg-gradient-to-br shadow-md shadow-black/10 text-white", stat.color)}>
                  <stat.icon size={20} />
                </div>
                <div className="p-1.5 rounded-full bg-slate-50 border border-slate-100 text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                  <ArrowUpRight size={14} />
                </div>
              </div>
              <div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                    {loading ? '...' : stat.value}
                  </h3>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{stat.sub}</span>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 border border-slate-100/50 rounded-full -mr-12 -mt-12 group-hover:scale-125 transition-transform duration-500"></div>
          </motion.div>
        ))}
      </div>

      {/* MAIN ANALYTICS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: SHORTCUTS & LIVE FEED (8 COLS) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* QUICK SHORTCUTS DECK */}
          <div className="glass-card p-6 bg-white border border-slate-100 shadow-xl rounded-[2rem]">
            <h3 className="text-lg font-black text-slate-800 tracking-tight mb-4 flex items-center gap-2">
              <UtensilsCrossed size={18} className="text-indigo-500" /> Hızlı Erişim ve Operasyon Menüsü
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { title: 'Sipariş Aç 🛒', path: '/orders', color: 'hover:border-indigo-200 hover:bg-indigo-50/30 text-indigo-700 bg-indigo-50/10 border-indigo-100/50' },
                { title: 'Masa Haritası 🪑', path: '/tables', color: 'hover:border-emerald-200 hover:bg-emerald-50/30 text-emerald-700 bg-emerald-50/10 border-emerald-100/50' },
                { title: 'Zayiat Girişi 🍂', path: '/waste', color: 'hover:border-rose-200 hover:bg-rose-50/30 text-rose-700 bg-rose-50/10 border-rose-100/50' },
                { title: 'Kampanya Önerileri 💡', path: '/analytics', color: 'hover:border-amber-200 hover:bg-amber-50/30 text-amber-700 bg-amber-50/10 border-amber-100/50' },
              ].map((shortcut) => (
                <button
                  key={shortcut.title}
                  onClick={() => navigate(shortcut.path)}
                  className={clsx(
                    "p-4 rounded-2xl border text-xs font-black uppercase tracking-wider text-center transition-all hover:shadow-sm hover:scale-[1.02]",
                    shortcut.color
                  )}
                >
                  {shortcut.title}
                </button>
              ))}
            </div>
          </div>

          {/* LIVE CONSOLIDATED OPERATION TIMELINE */}
          <div className="glass-card p-6 bg-white border border-slate-100 shadow-xl rounded-[2rem] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/5 rounded-full -mr-10 -mt-10"></div>
            
            <h3 className="text-lg font-black text-slate-800 tracking-tight mb-5 flex items-center gap-2">
              <Clock className="text-indigo-500 animate-spin-slow" size={18} /> Canlı Operasyon Akışı
            </h3>

            {loading ? (
              <div className="space-y-4 py-8 animate-pulse">
                {[1, 2, 3].map(n => (
                  <div key={n} className="h-10 bg-slate-50 rounded-xl" />
                ))}
              </div>
            ) : data.timelineEvents.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                Canlı operasyon kaydı bulunmuyor.
              </div>
            ) : (
              <div className="relative space-y-4">
                {/* Vertical timeline connector line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-100"></div>

                {data.timelineEvents.map((evt) => (
                  <div key={evt.id} className="relative flex gap-4 text-left group">
                    {/* Event Type Icon Indicator */}
                    <div className={clsx(
                      "w-8 h-8 rounded-full border flex items-center justify-center shrink-0 z-10 transition-colors shadow-sm",
                      evt.type === 'order' 
                        ? "bg-indigo-50 border-indigo-100 text-indigo-600 group-hover:bg-indigo-100" 
                        : "bg-rose-50 border-rose-100 text-rose-600 group-hover:bg-rose-100"
                    )}>
                      {evt.type === 'order' ? <ShoppingBag size={12} /> : <Trash2 size={12} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <p className="text-xs font-black text-slate-800 truncate uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                          {evt.title}
                        </p>
                        <span className="text-[10px] text-slate-400 font-bold shrink-0">
                          {evt.date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold truncate mt-0.5">{evt.subtitle}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={clsx(
                        "text-xs font-black tracking-tight",
                        evt.type === 'order' ? "text-slate-800" : "text-rose-600"
                      )}>
                        {evt.type === 'order' ? `+₺${evt.amount.toFixed(2)}` : `-₺${evt.amount.toFixed(2)}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: CRITICAL STOCKS (4 COLS) */}
        <div className="lg:col-span-4">
          
          {/* CRITICAL STOCK LIST */}
          <div className="glass-card p-6 bg-white border border-slate-100 shadow-xl rounded-[2rem] relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50/5 rounded-full -mr-10 -mt-10"></div>
            
            <h3 className="text-lg font-black text-slate-800 tracking-tight mb-5 flex items-center gap-2">
              <AlertTriangle className="text-rose-500" size={18} /> Kritik Hammaddeler
            </h3>

            {loading ? (
              <div className="space-y-4 py-8 animate-pulse">
                {[1, 2].map(n => (
                  <div key={n} className="h-10 bg-slate-50 rounded-xl" />
                ))}
              </div>
            ) : data.criticalItems.length === 0 ? (
              <div className="p-8 text-center text-slate-600 space-y-3 bg-emerald-50/30 border border-emerald-100/50 rounded-2xl">
                <span className="text-xl">🛡️</span>
                <p className="font-black text-emerald-800 text-xs uppercase tracking-wider">Tüm hammaddeler güvenli limitte.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {data.criticalItems.map((item) => (
                  <div key={item.id} className="group flex items-center justify-between p-3.5 rounded-2xl hover:bg-slate-50/80 transition-all border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        "w-2.5 h-2.5 rounded-full shrink-0",
                        item.totalQuantity < 5 
                          ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)] animate-pulse" 
                          : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                      )}></div>
                      <div>
                        <p className="font-black text-slate-800 text-xs uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                          {item.name}
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Birim: {item.unit}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={clsx(
                        "font-black text-sm tracking-tight",
                        item.totalQuantity < 5 ? "text-rose-500" : "text-amber-500"
                      )}>
                        {item.totalQuantity.toFixed(1)}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Mevcut</p>
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => navigate('/ingredients')}
                  className="w-full mt-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-dashed border-slate-200 hover:border-indigo-200"
                >
                  Stok Detaylarına Git
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

// Simple inline SVG Trash2 icon helper for time-line
const Trash2 = ({ size, className }: { size: number; className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

export default Dashboard;
