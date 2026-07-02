import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Grid, List as ListIcon, LayoutGrid, Layers, Users, Circle, CheckCircle2, Trash2, ArrowRightLeft, Info } from 'lucide-react';
import { TableService, ZoneService, OrderService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import clsx from 'clsx';

interface Zone {
  id: number;
  name: string;
}

interface Table {
  id: number;
  tableNumber: string;
  capacity: number;
  status: string;
  zoneId: number;
  zoneName: string;
  activeOrderAmount?: number;
}

const Tables = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeZone, setActiveZone] = useState<number | 'all'>('all');
  const navigate = useNavigate();

  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [zoneFormData, setZoneFormData] = useState({ name: '', description: '' });

  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [tableFormData, setTableFormData] = useState({ tableNumber: '', capacity: 4, zoneId: 0 });

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [fromTable, setFromTable] = useState<Table | null>(null);
  const [toTableId, setToTableId] = useState<number | ''>('');

  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [infoTable, setInfoTable] = useState<Table | null>(null);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [loadingInfo, setLoadingInfo] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [zonesData, tablesData] = await Promise.all([
        ZoneService.getAll(),
        TableService.getAll()
      ]);
      setZones(zonesData);
      setTables(tablesData);
    } catch (error) {
      toast.error('Veriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ZoneService.create(zoneFormData);
      toast.success('Bölge oluşturuldu!');
      setIsZoneModalOpen(false);
      setZoneFormData({ name: '', description: '' });
      fetchData();
    } catch (error) {
      toast.error('Bölge oluşturulamadı.');
    }
  };

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (tableFormData.zoneId === 0) {
        toast.error('Lütfen bir bölge seçin.');
        return;
      }
      await TableService.create(tableFormData);
      toast.success('Masa eklendi!');
      setIsTableModalOpen(false);
      setTableFormData({ tableNumber: '', capacity: 4, zoneId: 0 });
      fetchData();
    } catch (error) {
      toast.error('Masa eklenemedi.');
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await TableService.updateStatus(id, status);
      fetchData();
    } catch (error) {
      toast.error('Durum güncellenemedi.');
    }
  };

  const handleDeleteTable = async (id: number) => {
    if (!window.confirm('Bu masayı silmek istediğinize emin misiniz?')) return;
    try {
      await TableService.delete(id);
      toast.success('Masa silindi.');
      fetchData();
    } catch (error) {
      toast.error('Masa silinemedi.');
    }
  };

  const handleTransferTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromTable || toTableId === '') {
      toast.error('Lütfen hedef masayı seçiniz.');
      return;
    }

    try {
      const toastId = toast.loading('Masa taşınıyor...');
      await OrderService.transferTable(fromTable.id, toTableId);
      toast.dismiss(toastId);
      toast.success(`${fromTable.tableNumber} numaralı masa siparişleri başarıyla taşındı!`);
      setIsTransferModalOpen(false);
      setFromTable(null);
      setToTableId('');
      fetchData();
    } catch (error: any) {
      toast.dismiss();
      const errorMsg = error.response?.data || 'Taşıma işlemi gerçekleştirilemedi.';
      toast.error(errorMsg);
    }
  };

  const handleOpenInfoModal = async (table: Table) => {
    setInfoTable(table);
    setIsInfoModalOpen(true);
    setLoadingInfo(true);
    setActiveOrders([]);
    try {
      const orders = await OrderService.getActiveOrdersByTable(table.id);
      setActiveOrders(orders);
    } catch (error) {
      toast.error('Aktif sipariş bilgileri yüklenemedi.');
    } finally {
      setLoadingInfo(false);
    }
  };

  const filteredTables = activeZone === 'all' 
    ? tables 
    : tables.filter(t => t.zoneId === activeZone);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'EMPTY': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'OCCUPIED': return 'bg-rose-50 text-rose-600 border-rose-200';
      case 'RESERVED': return 'bg-sky-50 text-sky-600 border-sky-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getStatusDot = (status: string) => {
    switch(status) {
      case 'EMPTY': return 'bg-emerald-500';
      case 'OCCUPIED': return 'bg-rose-500 animate-pulse';
      case 'RESERVED': return 'bg-sky-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="space-y-10 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-500 font-bold text-sm mb-2 uppercase tracking-[0.2em]">
            <LayoutGrid size={16} />
            <span>Adisyon & Yerleşim</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Masa Haritası</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsZoneModalOpen(true)} className="btn-secondary">
            <Layers size={18} />
            Bölge Ekle
          </button>
          <button onClick={() => setIsTableModalOpen(true)} className="btn-primary">
            <Plus size={20} />
            Yeni Masa
          </button>
        </div>
      </header>

      {/* Zone Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button 
          onClick={() => setActiveZone('all')}
          className={clsx(
            "px-6 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all whitespace-nowrap border",
            activeZone === 'all' 
              ? "bg-slate-900 text-white border-slate-900 shadow-md" 
              : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-800"
          )}
        >
          Tüm Alanlar
        </button>
        {zones.map(zone => (
          <button 
            key={zone.id}
            onClick={() => setActiveZone(zone.id)}
            className={clsx(
              "px-6 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all whitespace-nowrap border",
              activeZone === zone.id 
                ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-800"
            )}
          >
            {zone.name}
          </button>
        ))}
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-6">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="col-span-full py-20 text-center text-slate-600 font-bold uppercase tracking-widest animate-pulse">
              Harita yükleniyor...
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="col-span-full py-20 glass-card flex flex-col items-center justify-center gap-4 text-slate-500">
              <LayoutGrid size={64} className="opacity-10" />
              <p className="font-bold">Bu alanda hiç masa bulunmuyor.</p>
            </div>
          ) : (
            filteredTables.map((table, i) => (
              <motion.div
                key={table.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05 }}
                className={clsx(
                  "relative p-6 rounded-3xl border-2 transition-all cursor-pointer hover:shadow-lg group overflow-hidden",
                  getStatusColor(table.status)
                )}
              >
                {/* Status indicator dot & Info Button */}
                <div className="absolute top-4 right-4 flex items-center gap-3">
                  {table.status === 'OCCUPIED' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenInfoModal(table);
                      }}
                      className="p-1 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800 transition-colors shadow-sm"
                      title="Sipariş Detayı"
                    >
                      <Info size={14} />
                    </button>
                  )}
                  <div className={clsx("w-3 h-3 rounded-full shadow-sm", getStatusDot(table.status))} />
                </div>
                
                <div className="mt-2 mb-6">
                  <h3 className="text-3xl font-black mb-1">{table.tableNumber}</h3>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-60">{table.zoneName}</p>
                </div>
                
                <div className="flex justify-between items-center text-sm font-bold opacity-80 mb-6">
                  <div className="flex items-center gap-2">
                    <Users size={16} />
                    <span>{table.capacity} Kişilik</span>
                  </div>
                  {table.status === 'OCCUPIED' && table.activeOrderAmount !== undefined && table.activeOrderAmount > 0 && (
                    <span className="px-3 py-1 bg-rose-600 text-white rounded-xl text-xs font-black shadow-md tracking-tight">
                      ₺{table.activeOrderAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>

                {/* Quick actions reveal on hover */}
                <div className="absolute inset-x-0 bottom-0 bg-white/90 backdrop-blur p-3 border-t border-white/20 translate-y-full group-hover:translate-y-0 transition-transform flex justify-center gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTable(table.id);
                    }} 
                    className="p-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors" 
                    title="Masayı Sil"
                  >
                    <Trash2 size={16} />
                  </button>
                  {table.status !== 'EMPTY' && (
                    <>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenInfoModal(table);
                        }} 
                        className="p-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors" 
                        title="Sipariş Detayı"
                      >
                        <Info size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setFromTable(table);
                          setIsTransferModalOpen(true);
                        }} 
                        className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors" 
                        title="Masayı Başka Masaya Taşı"
                      >
                        <ArrowRightLeft size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(table.id, 'EMPTY');
                        }} 
                        className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors" 
                        title="Masayı Boşalt"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    </>
                  )}
                  {table.status === 'EMPTY' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/orders?tableId=${table.id}`);
                      }} 
                      className="px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex-1"
                    >
                      Sipariş Aç
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <Modal 
        isOpen={isZoneModalOpen} 
        onClose={() => setIsZoneModalOpen(false)} 
        title="Yeni Bölge Oluştur"
        icon={<Layers size={24} />}
      >
        <form onSubmit={handleSaveZone} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bölge Adı</label>
            <input 
              type="text" 
              required 
              className="input-field" 
              value={zoneFormData.name}
              onChange={e => setZoneFormData({...zoneFormData, name: e.target.value})}
              placeholder="Örn: Teras, Arka Bahçe..."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Açıklama (Opsiyonel)</label>
            <input 
              type="text" 
              className="input-field" 
              value={zoneFormData.description}
              onChange={e => setZoneFormData({...zoneFormData, description: e.target.value})}
            />
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
            <button type="button" onClick={() => setIsZoneModalOpen(false)} className="btn-secondary">İptal</button>
            <button type="submit" className="btn-primary">Kaydet</button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isTableModalOpen} 
        onClose={() => setIsTableModalOpen(false)} 
        title="Yeni Masa Ekle"
        icon={<LayoutGrid size={24} />}
      >
        <form onSubmit={handleSaveTable} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Masa Adı / No</label>
            <input 
              type="text" 
              required 
              className="input-field" 
              value={tableFormData.tableNumber}
              onChange={e => setTableFormData({...tableFormData, tableNumber: e.target.value})}
              placeholder="Örn: M-101, Teras-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kapasite</label>
              <input 
                type="number" 
                required 
                min="1"
                className="input-field" 
                value={tableFormData.capacity}
                onChange={e => setTableFormData({...tableFormData, capacity: parseInt(e.target.value) || 4})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bulunduğu Bölge</label>
              <select 
                required
                className="input-field appearance-none cursor-pointer"
                value={tableFormData.zoneId}
                onChange={e => setTableFormData({...tableFormData, zoneId: parseInt(e.target.value)})}
              >
                <option value={0} disabled>Bölge Seçiniz</option>
                {zones.map(z => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
            <button type="button" onClick={() => setIsTableModalOpen(false)} className="btn-secondary">İptal</button>
            <button type="submit" className="btn-primary">Kaydet</button>
          </div>
        </form>
      </Modal>

      {/* Table Transfer Modal */}
      <Modal 
        isOpen={isTransferModalOpen} 
        onClose={() => {
          setIsTransferModalOpen(false);
          setFromTable(null);
          setToTableId('');
        }} 
        title={`${fromTable?.tableNumber} Masasını Taşı`}
        icon={<ArrowRightLeft size={24} />}
      >
        <form onSubmit={handleTransferTable} className="space-y-4">
          <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
            <p className="text-xs text-indigo-700 font-bold leading-relaxed">
              Bu işlem, <strong>{fromTable?.tableNumber}</strong> masasındaki tüm aktif siparişleri ve adisyon detaylarını seçtiğiniz hedef masaya aktaracaktır.
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Hedef Masa Seçin</label>
            <select 
              required
              className="input-field appearance-none cursor-pointer"
              value={toTableId}
              onChange={e => setToTableId(parseInt(e.target.value) || '')}
            >
              <option value="" disabled>Hedef Masa Seçiniz</option>
              {tables
                .filter(t => t.id !== fromTable?.id && t.status === 'EMPTY')
                .map(t => (
                  <option key={t.id} value={t.id}>
                    {t.zoneName} - {t.tableNumber} (Kapasite: {t.capacity})
                  </option>
                ))}
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
            <button 
              type="button" 
              onClick={() => {
                setIsTransferModalOpen(false);
                setFromTable(null);
                setToTableId('');
              }} 
              className="btn-secondary"
            >
              İptal
            </button>
            <button type="submit" className="btn-primary flex items-center gap-2">
              <ArrowRightLeft size={16} /> Masayı Taşı
            </button>
          </div>
        </form>
      </Modal>

      {/* Active Order Info Modal */}
      <Modal
        isOpen={isInfoModalOpen}
        onClose={() => {
          setIsInfoModalOpen(false);
          setInfoTable(null);
          setActiveOrders([]);
        }}
        title={`${infoTable?.tableNumber} - Aktif Sipariş Detayı`}
        icon={<Info size={24} className="text-indigo-600" />}
      >
        {loadingInfo ? (
          <div className="py-12 text-center text-slate-500 font-bold uppercase tracking-widest animate-pulse">
            Sipariş bilgileri yükleniyor...
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-medium">
            Bu masada kayıtlı aktif sipariş bulunamadı.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="max-h-[350px] overflow-y-auto pr-1 space-y-4 divide-y divide-slate-100">
              {activeOrders.map((order, idx) => (
                <div key={order.id} className={clsx("pt-4 first:pt-0", idx > 0 && "mt-4")}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-slate-400">
                      Sipariş #{order.id} - {new Date(order.orderDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                      {order.paymentMethod === 'KART' ? '💳 Kart' : '💵 Nakit'}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {order.items.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-indigo-600 bg-indigo-50 w-6 h-6 flex items-center justify-center rounded-lg text-xs">
                            {item.quantity}x
                          </span>
                          <span className="font-semibold text-slate-700">{item.productName}</span>
                        </div>
                        <div className="text-slate-900 font-bold">
                          ₺{item.subTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end mt-3 text-xs font-bold text-slate-500">
                    Sipariş Toplamı: <span className="ml-1 text-slate-950 font-black">₺{order.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Masa Toplam Adisyon</p>
                <p className="text-2xl font-black text-rose-600">
                  ₺{activeOrders.reduce((sum, order) => sum + order.totalAmount, 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsInfoModalOpen(false);
                  setInfoTable(null);
                  setActiveOrders([]);
                }}
                className="btn-primary"
              >
                Kapat
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Tables;
