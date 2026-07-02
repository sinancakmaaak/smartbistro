import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  UtensilsCrossed, 
  ShoppingCart, 
  Settings,
  ChefHat,
  ChevronRight,
  LayoutGrid,
  Tag,
  Building2,
  Truck,
  LogOut,
  BarChart2,
  Trash2,
  Database
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: BarChart2, label: 'Analizler', path: '/analytics' },
  { icon: LayoutGrid, label: 'Masalar', path: '/tables' },
  { icon: ShoppingCart, label: 'Siparişler', path: '/orders' },
  { icon: UtensilsCrossed, label: 'Menü', path: '/products' },
  { icon: Tag, label: 'Kategoriler', path: '/categories' },
  { icon: Trash2, label: 'Zayiat Takibi', path: '/waste' },
  { icon: Package, label: 'Envanter', path: '/ingredients' },
  { icon: Truck, label: 'Mal Kabul', path: '/purchases' },
  { icon: Building2, label: 'Tedarikçiler', path: '/suppliers' },
];

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const [seeding, setSeeding] = useState(false);

  const handleSeedDemo = async () => {
    if (seeding) return;
    if (!window.confirm('Demo verileri yüklemek istediğinize emin misiniz? Bu işlem mevcut verileri bozmadan eksik demo verileri ve geçmiş siparişleri ekleyecektir.')) return;
    
    setSeeding(true);
    const toastId = toast.loading('Demo verileri yükleniyor...');
    try {
      await api.post('/system/seed-demo');
      toast.dismiss(toastId);
      toast.success('Demo verileri başarıyla yüklendi!');
      window.location.reload();
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error('Demo verileri yüklenemedi: ' + (error.response?.data || error.message));
    } finally {
      setSeeding(false);
    }
  };

  const filteredMenuItems = menuItems
    .filter(item => {
      if (user?.role === 'KITCHEN') {
        return item.path === '/orders' || item.path === '/waste';
      }
      return true;
    })
    .map(item => {
      if (user?.role === 'KITCHEN' && item.path === '/orders') {
        return { ...item, label: 'Mutfak Paneli' };
      }
      return item;
    });
  
  return (
    <aside className="fixed left-6 top-6 bottom-6 w-64 glass-card flex flex-col z-50">
      <div className="p-8 flex items-center gap-4">
        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/30 rotate-3 group-hover:rotate-0 transition-transform">
          <ChefHat className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">
            SMART <span className="text-indigo-600">BISTRO</span>
          </h1>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {filteredMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => clsx(
              "sidebar-link",
              isActive ? "sidebar-link-active" : "sidebar-link-inactive"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} className={clsx(
                  "transition-all duration-300",
                  isActive ? "scale-110" : "group-hover:translate-x-1"
                )} />
                <span className="font-semibold text-sm flex-1">{item.label}</span>
                {isActive && <ChevronRight size={14} className="animate-pulse" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200 space-y-2 mt-auto">
        <div className="flex items-center gap-3 px-4 py-2 w-full text-slate-700 bg-slate-50 rounded-xl mb-4">
          <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold leading-none">{user?.firstName} {user?.lastName}</span>
            <span className="text-[10px] text-slate-500">{user?.role}</span>
          </div>
        </div>
        <button 
          onClick={handleSeedDemo}
          disabled={seeding}
          className={clsx(
            "flex items-center gap-3 px-4 py-2 w-full transition-all rounded-lg",
            seeding ? "text-indigo-400 bg-indigo-50/50 cursor-not-allowed" : "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 active:scale-95"
          )}
        >
          <Database size={18} className={clsx(seeding && "animate-spin")} />
          <span className="text-sm font-semibold">Demo Verileri Yükle</span>
        </button>
        <button onClick={logout} className="flex items-center gap-3 px-4 py-2 w-full text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
          <LogOut size={18} />
          <span className="text-sm font-semibold">Çıkış Yap</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
