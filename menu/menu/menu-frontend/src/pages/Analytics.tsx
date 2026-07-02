import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  AlertTriangle, 
  TrendingDown, 
  ShoppingCart, 
  RefreshCcw, 
  Calendar,
  BarChart2
} from 'lucide-react';
import { clsx } from 'clsx';

interface SpoilageRisk {
  ingredient: string;
  current_stock: number;
  daily_burn_rate: number;
  predicted_waste: number;
  unit: string;
  earliest_expiry: string;
  financial_risk_tl: number;
  recommendation: string;
}

interface OrderOptimization {
  ingredient: string;
  current_stock: number;
  reorder_point: number;
  status: 'REORDER_NOW' | 'WATCHING' | 'OK';
  days_left: number;
  unit: string;
}

const Analytics = () => {
  const [spoilageRisk, setSpoilageRisk] = useState<SpoilageRisk[]>([]);
  const [optimization, setOptimization] = useState<OrderOptimization[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [spoilageRes, optRes] = await Promise.all([
        axios.get('http://localhost:8000/api/analytics/spoilage-risk'),
        axios.get('http://localhost:8000/api/analytics/order-optimization')
      ]);
      setSpoilageRisk(spoilageRes.data || []);
      setOptimization(optRes.data || []);
    } catch (error) {
      console.error('Analytics Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-600/20 rotate-2">
            <BarChart2 className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight"> ANALİZ MOTORU</h1>
            <p className="text-indigo-500 font-bold text-xs uppercase tracking-widest italic">AI Powered Decision Support</p>
          </div>
        </div>
        <button 
          onClick={fetchData}
          disabled={loading}
          className="px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all flex items-center gap-3 text-sm font-bold shadow-lg disabled:opacity-50"
        >
          <RefreshCcw size={18} className={clsx(loading && "animate-spin")} />
          {loading ? 'Analiz Ediliyor...' : 'Yenile'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3">
            <TrendingDown className="text-rose-500" size={24} />
            <h2 className="text-2xl font-black text-slate-800">İsraf Riski Analizi</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {spoilageRisk.map((risk, i) => (
              <div key={i} className="glass-card p-6 border-t-4 border-t-rose-500 group">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">{risk.ingredient}</h3>
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-lg animate-pulse">
                    <AlertTriangle size={20} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 p-3 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kayıp</p>
                    <p className="text-lg font-black text-slate-900">{risk.predicted_waste.toFixed(1)} <span className="text-xs font-bold text-slate-400">{risk.unit}</span></p>
                  </div>
                  <div className="bg-rose-50 p-3 rounded-2xl text-right">
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Risk</p>
                    <p className="text-lg font-black text-rose-600">₺{risk.financial_risk_tl.toLocaleString()}</p>
                  </div>
                </div>
                <div className="p-4 bg-indigo-600/5 rounded-2xl border border-indigo-500/10 relative overflow-hidden">
                   <p className="text-xs font-bold text-indigo-700 leading-relaxed italic">"{risk.recommendation}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <ShoppingCart className="text-indigo-600" size={24} />
            <h2 className="text-2xl font-black text-slate-800">Satın Alma</h2>
          </div>
          <div className="glass-card divide-y divide-slate-100 overflow-hidden">
            {optimization.filter(x => x.status !== 'OK').map((item, i) => (
              <div key={i} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-black text-slate-800 uppercase text-sm tracking-tight">{item.ingredient}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Stok: {item.current_stock.toFixed(0)} {item.unit}</p>
                </div>
                <div className="text-right">
                  <span className={clsx(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm",
                    item.status === 'REORDER_NOW' ? "bg-rose-500 text-white" : "bg-amber-500 text-white"
                  )}>
                    {item.status === 'REORDER_NOW' ? 'HEMEN AL' : 'KRİTİK'}
                  </span>
                  <p className="text-[10px] font-black text-slate-500 mt-2 flex items-center justify-end gap-1">
                    <Calendar size={10} />
                    {item.days_left.toFixed(1)} GÜN
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
