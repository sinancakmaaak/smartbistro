import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  AlertTriangle, 
  TrendingDown, 
  ShoppingCart, 
  RefreshCcw, 
  Calendar,
  BarChart2,
  Info,
  ArrowRight,
  Zap,
  Sparkles,
  TrendingUp,
  Percent
} from 'lucide-react';
import { clsx } from 'clsx';
import { WasteRecordService, ProductService } from '../services/api';
import toast from 'react-hot-toast';

interface SpoilageRisk {
  ingredient: string;
  current_stock: number;
  daily_burn_rate: number;
  predicted_waste: number;
  unit: string;
  earliest_expiry: string;
  financial_risk_tl: number;
  recommendation: string;
  seasonal_factor?: number;
  active_season?: string;
}

interface OrderOptimization {
  ingredient: string;
  current_stock: number;
  daily_burn_rate: number;
  reorder_point: number;
  status: 'REORDER_NOW' | 'WATCHING' | 'OK';
  days_left: number;
  unit: string;
  seasonal_factor?: number;
  active_season?: string;
}

const AnalyticsPage = () => {
  const [spoilageRisk, setSpoilageRisk] = useState<SpoilageRisk[]>([]);
  const [optimization, setOptimization] = useState<OrderOptimization[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [wasteSummary, setWasteSummary] = useState({ totalFinancialLoss: 0, totalRecords: 0 });
  const [products, setProducts] = useState<any[]>([]);
  const [selectedPercentages, setSelectedPercentages] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  

  const fetchData = async () => {
    setLoading(true);
    try {
      const [spoilageRes, optRes, suggestionsRes, wasteSummaryData, productsData] = await Promise.all([
        axios.get('http://localhost:8000/api/analytics/spoilage-risk'),
        axios.get('http://localhost:8000/api/analytics/order-optimization'),
        axios.get('http://localhost:8000/api/analytics/dynamic-menu-suggestions'),
        WasteRecordService.getSummary(),
        ProductService.getAllActive()
      ]);
      setSpoilageRisk(spoilageRes.data || []);
      setOptimization(optRes.data || []);
      setSuggestions(suggestionsRes.data || []);
      setWasteSummary(wasteSummaryData || { totalFinancialLoss: 0, totalRecords: 0 });
      setProducts(productsData || []);
    } catch (error) {
      console.error('Analytics Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (suggestions.length > 0 && products.length > 0) {
      const initial: Record<number, number> = {};
      suggestions.forEach(sug => {
        const prod = products.find((p: any) => p.id === sug.productId);
        initial[sug.productId] = (prod && prod.discountPercentage > 0) 
          ? prod.discountPercentage 
          : sug.discountPercentage;
      });
      setSelectedPercentages(prev => ({ ...initial, ...prev }));
    }
  }, [suggestions, products]);

  const handleUpdateDiscount = async (productId: number, discountPercentage: number) => {
    try {
      const loadingToast = toast.loading('Fiyat ve kampanya güncelleniyor...');
      await ProductService.updateDiscount(productId, discountPercentage);
      toast.dismiss(loadingToast);
      toast.success(discountPercentage > 0 ? 'Kampanya başarıyla uygulandı ve POS menüsüne yansıtıldı!' : 'Kampanya pasifleştirildi, standart fiyata geri dönüldü.');
      fetchData();
    } catch (error) {
      toast.error('İndirim güncellenirken hata oluştu.');
      console.error('Error updating discount:', error);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-br from-slate-900 to-indigo-950 p-8 rounded-[2rem] shadow-2xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full"></div>
        <div className="flex items-center gap-6 z-10">
          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
            <BarChart2 className="text-indigo-400" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">AKILLI ANALİZ</h1>
            <p className="text-indigo-300 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
              <Zap size={14} /> Karar Destek Sistemi Canlı
            </p>
          </div>
        </div>
        <button 
          onClick={fetchData}
          disabled={loading}
          className="mt-6 md:mt-0 px-8 py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl transition-all flex items-center gap-3 text-sm font-black shadow-lg shadow-indigo-500/25 disabled:opacity-50 group z-10"
        >
          <RefreshCcw size={18} className={clsx(loading && "animate-spin")} />
          {loading ? 'ANALİZ EDİLİYOR...' : 'VERİLERİ TAZELE'}
        </button>
      </div>

      {/* DSS COMPARISON WIDGET */}
      {(() => {
        const totalPredictedRisk = spoilageRisk.reduce((acc, curr) => acc + curr.financial_risk_tl, 0);
        const totalRealizedWaste = wasteSummary.totalFinancialLoss;
        const accuracy = totalPredictedRisk > 0 
          ? Math.max(0, Math.min(100, 100 - Math.abs((totalPredictedRisk - totalRealizedWaste) / totalPredictedRisk) * 100))
          : 0;

        return (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden p-8 relative animate-in fade-in duration-500">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/5 blur-[100px] rounded-full"></div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
              <div>
                <p className="text-xs text-indigo-500 font-black uppercase tracking-[0.2em] mb-1">Karar Destek Analizi </p>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Tahmini İsraf Riski vs. Gerçekleşen Zayiat</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
              {/* Predicted Risk Box */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-indigo-100 transition-all group">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <TrendingDown size={18} />
                  </div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Öngörülen İsraf Riski (AI)</p>
                </div>
                <h3 className="text-3xl font-black text-slate-900">
                  ₺{totalPredictedRisk.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <p className="text-[11px] text-slate-500 font-bold mt-1">Eldeki partilerin SKT'leri ve tüketim hızlarına göre simüle edilen risk</p>
              </div>

              {/* Realized Waste Box */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-rose-100 transition-all group">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <AlertTriangle size={18} />
                  </div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Gerçekleşen Zayiat</p>
                </div>
                <h3 className="text-3xl font-black text-slate-900">
                  ₺{totalRealizedWaste.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <p className="text-[11px] text-slate-500 font-bold mt-1">Mutfaktan girilen fiziki imha kayıtlarının toplam maliyeti</p>
              </div>
            </div>

            {/* DSS Insight Box */}
            <div className="p-4 bg-indigo-600/5 rounded-2xl border border-indigo-500/10 flex gap-3 text-slate-800 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600"></div>
              <Info size={20} className="shrink-0 mt-0.5 text-indigo-600" />
              <div className="space-y-1">
                <p className="text-sm font-semibold leading-relaxed italic">
                  {totalRealizedWaste === 0 ? (
                    <>
                      <span className="text-indigo-600 font-extrabold uppercase tracking-wide mr-1">DSS Analiz Notu:</span>
                      Henüz mutfak zayiatı sisteme girilmedi. Sol menüdeki 'Zayiat Takibi' sayfasından imha kayıtları eklendikçe, AI israf öngörülerimiz ile fiziki zayiatlarımız bu panelde dinamik olarak kıyaslanacaktır.
                    </>
                  ) : (
                    <>
                      <span className="text-indigo-600 font-extrabold uppercase tracking-wide mr-1">Sistem Öngörü Değerlendirmesi:</span>
                      Yapay zeka motorumuzun öngördüğü risk (₺{totalPredictedRisk.toFixed(0)}) ile mutfakta gerçekleşen zayiat (₺{totalRealizedWaste.toFixed(0)}) karşılaştırıldığında, DSS modelimiz %{accuracy.toFixed(0)} doğrulukla çalışmaktadır. Dinamik AI menü kampanyalarını satışı hızlandırmak için kullanarak bu zayiatı en aza indirebilirsiniz.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* BOZULMA RİSKİ ANALİZİ (SOL) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <TrendingDown className="text-rose-500" size={24} />
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Bozulma Riski & İsraf Tahmini</h2>
            </div>
            <div className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-100">
              Kritik Uyarılar
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {spoilageRisk.map((risk, i) => (
              <div key={i} className="glass-card p-6 border-l-[6px] border-l-rose-500 hover:shadow-xl transition-all duration-300 bg-white group relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-black text-slate-900 text-xl uppercase tracking-tighter leading-none mb-1">{risk.ingredient}</h3>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Calendar size={12} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">SKT: {risk.earliest_expiry}</span>
                    </div>
                  </div>
                  <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl group-hover:scale-110 transition-transform">
                    <AlertTriangle size={24} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-1 mb-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mevcut Stok</p>
                      <span title="Deponuzdaki toplam miktar">
                        <Info size={10} className="text-slate-300" />
                      </span>
                    </div>
                    <p className="text-xl font-black text-slate-900">{risk.current_stock?.toFixed(1)} <span className="text-xs font-bold text-slate-400 uppercase">{risk.unit}</span></p>
                  </div>
                  <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 text-right">
                    <div className="flex items-center justify-end gap-1 mb-1">
                      <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">İsraf Riski Altında</p>
                    </div>
                    <p className="text-xl font-black text-rose-600">{Math.ceil(risk.predicted_waste || 0)} <span className="text-xs font-bold text-rose-400 uppercase">{risk.unit}</span></p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4 px-1">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tüketim Hızı</span>
                      <span className="text-xs font-black text-slate-600">{risk.daily_burn_rate?.toFixed(3) || '0.000'} {risk.unit}/Gün</span>
                   </div>
                   <ArrowRight size={16} className="text-slate-300" />
                </div>

                 <div className="p-4 bg-indigo-600/5 rounded-2xl border border-indigo-500/10 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500"></div>
                    <p className="text-sm font-semibold text-slate-800 leading-relaxed italic">
                       <span className="text-indigo-600 font-extrabold uppercase tracking-wide mr-1">Yapay Zeka Önerisi:</span> {risk.recommendation}
                    </p>
                 </div>
              </div>
            ))}
            {spoilageRisk.length === 0 && !loading && (
              <div className="col-span-full p-20 text-center glass-card border-dashed border-2 border-slate-200">
                <p className="text-slate-400 font-bold uppercase tracking-widest">Şu an için kritik bir israf riski bulunmuyor.</p>
              </div>
            )}
          </div>

          {/* DİNAMİK AI KAMPANYA ÖNERİLERİ */}
          <div className="space-y-6 pt-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <Zap className="text-amber-500 fill-amber-500/20" size={24} />
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Dinamik AI Menü Kampanyaları</h2>
              </div>
              <div className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100">
                Aksiyon Önerileri
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {suggestions.map((sug, i) => {
                const prod = products.find((p: any) => p.id === sug.productId);
                const isActive = prod && prod.discountPercentage > 0;
                const currentPct = selectedPercentages[sug.productId] || sug.discountPercentage;
                const currentDiscountedPrice = Math.round(sug.originalPrice * (1 - currentPct / 100) * 100) / 100;

                return (
                  <div 
                    key={i} 
                    className={clsx(
                      "glass-card p-6 border-l-[6px] transition-all duration-300 bg-white group relative overflow-hidden flex flex-col justify-between hover:shadow-xl",
                      isActive ? "border-l-emerald-500 shadow-emerald-500/5" : "border-l-amber-500"
                    )}
                  >
                    <div className={clsx(
                      "absolute top-0 right-0 w-16 h-16 rounded-full -mr-8 -mt-8 animate-pulse",
                      isActive ? "bg-emerald-50 animate-pulse" : "bg-amber-50"
                    )}></div>
                    
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-black text-slate-900 text-xl uppercase tracking-tighter leading-none mb-1">{sug.productName}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                              AI Önerisi: -%{sug.discountPercentage}
                            </span>
                            {isActive && (
                              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                                Aktif: -%{prod.discountPercentage}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={clsx(
                          "px-2.5 py-1 text-white rounded-xl text-[9px] font-black uppercase tracking-wider h-fit z-10",
                          sug.priority === 'Yüksek' || sug.priority === 'CRITICAL' ? "bg-rose-500 animate-pulse" : "bg-amber-500"
                        )}>
                          {sug.priority} ÖNCELİK
                        </span>
                      </div>

                      <p className="text-sm text-slate-700 font-medium mb-4 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {sug.recommendation}
                      </p>

                      <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Taban Fiyat</p>
                          <p className="text-xs font-black text-slate-700">₺{sug.originalPrice}</p>
                        </div>
                        <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                          <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-wider">Kampanya Fiyatı</p>
                          <p className="text-xs font-black text-emerald-600">₺{currentDiscountedPrice}</p>
                        </div>
                        <div className="bg-rose-50 p-2 rounded-xl border border-rose-100">
                          <p className="text-[8px] font-bold text-rose-500 uppercase tracking-wider">Engellenen Risk</p>
                          <p className="text-xs font-black text-rose-600">₺{Math.ceil(sug.financialRisk)}</p>
                        </div>
                      </div>
                    </div>

                    {/* ML FEEDBACK LOOP METRICS */}
                    {sug.campaignSales > 0 ? (
                      <div className="mt-2 mb-4 p-4 bg-emerald-600/5 rounded-2xl border border-emerald-500/10 space-y-2 relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                            <TrendingUp size={12} /> AI Geri Bildirim Döngüsü (ML)
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase">
                            x{sug.salesLift} Satış Artışı
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-bold leading-normal">
                          Son 7 günde indirimli <span className="text-slate-800 font-black">{sug.campaignSales}</span> adet satıldı. (Normal günlük ortalama: {sug.normalSales} adet).
                        </p>
                        <div className="h-[1px] bg-slate-100 my-1"></div>
                        <p className="text-xs font-semibold text-slate-800 italic">
                          <span className="text-indigo-600 font-black mr-1">🤖 ML Kararı:</span> {sug.learningDecision.replace(/🤖 ML Kararı: |🤖 /g, '')}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-2 mb-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex gap-2 items-center relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-400"></div>
                        <Info size={12} className="text-slate-400 shrink-0" />
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider leading-relaxed">
                          Bu kampanya için henüz satış verisi yok. Satış yapıldıkça ML öğrenme döngüsü fiyatı otomatik optimize edecektir.
                        </p>
                      </div>
                    )}

                    {/* Campaign Interface controls */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 pt-4 border-t border-slate-100 z-10">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Seçili İndirim:</span>
                        <select 
                          value={currentPct}
                          onChange={(e) => setSelectedPercentages(prev => ({ ...prev, [sug.productId]: parseInt(e.target.value) }))}
                          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 focus:outline-none focus:border-indigo-500 w-full sm:w-auto"
                        >
                          <option value={10}>%10 İndirim</option>
                          <option value={15}>%15 İndirim</option>
                          <option value={20}>%20 İndirim</option>
                          <option value={25}>%25 İndirim</option>
                          <option value={30}>%30 İndirim</option>
                        </select>
                      </div>

                      <div className="flex gap-2 w-full sm:w-auto justify-end">
                        {isActive ? (
                          <>
                            {prod.discountPercentage !== currentPct && (
                              <button
                                onClick={() => handleUpdateDiscount(sug.productId, currentPct)}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                              >
                                Oranı Güncelle
                              </button>
                            )}
                            <button
                              onClick={() => handleUpdateDiscount(sug.productId, 0)}
                              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                            >
                              Kampanyayı Kapat
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleUpdateDiscount(sug.productId, currentPct)}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/10"
                          >
                            Kampanyayı Uygula
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {suggestions.length === 0 && !loading && (
                <div className="col-span-full p-12 text-center glass-card border-dashed border-2 border-slate-200">
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Aktif bir kampanya önerisi bulunmamaktadır.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SATIN ALMA & STOK DURUMU (SAĞ) */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <ShoppingCart className="text-indigo-600" size={24} />
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Akıllı Satın Alma</h2>
          </div>
          
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden divide-y divide-slate-100">
            <div className="p-6 bg-slate-50/50">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Kritik Stok Takibi</p>
               <p className="text-xs text-slate-500 font-medium leading-tight">Sistem, teslimat sürelerini ve haftalık tüketimi analiz ederek sipariş noktalarını belirler.</p>
            </div>
            {optimization.filter(x => x.status !== 'OK').map((item, i) => (
              <div key={i} className="p-6 flex items-center justify-between hover:bg-indigo-50/30 transition-all group">
                <div>
                  <p className="font-black text-slate-800 uppercase text-sm tracking-tight group-hover:text-indigo-600 transition-colors">{item.ingredient}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-1 w-24 bg-slate-100 rounded-full overflow-hidden">
                       <div 
                         className={clsx(
                           "h-full transition-all",
                           item.status === 'REORDER_NOW' ? "bg-rose-500 w-1/4" : "bg-amber-500 w-2/3"
                         )}
                       ></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.current_stock?.toFixed(1) || '0'} {item.unit}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Günlük Tüketim</span>
                      <span className="text-[11px] font-black text-slate-600">{item.daily_burn_rate?.toFixed(2) || '0'} {item.unit}</span>
                    </div>
                    <div className="h-4 w-[1px] bg-slate-100"></div>
                    {/* Mevsim çarpanı kaldırıldı */}
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-rose-300 uppercase tracking-tighter">Sipariş Eşiği</span>
                      <span className="text-[11px] font-black text-rose-500">{item.reorder_point?.toFixed(1) || '0'} {item.unit}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={clsx(
                    "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm",
                    item.status === 'REORDER_NOW' ? "bg-rose-500 text-white shadow-rose-200" : "bg-amber-100 text-amber-700"
                  )}>
                    {item.status === 'REORDER_NOW' ? 'Hemen Al' : 'İzleniyor'}
                  </span>
                  <div className="mt-2 flex items-center justify-end gap-1.5 text-slate-500">
                    <Calendar size={12} className="text-slate-300" />
                    <span className="text-[11px] font-black uppercase">~{Math.ceil(item.days_left || 0)} GÜN KALDI</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
