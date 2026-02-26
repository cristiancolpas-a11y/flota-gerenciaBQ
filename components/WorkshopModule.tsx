
import React, { useState } from 'react';
import { 
  ChevronLeft, 
  Cpu, 
  Settings, 
  Zap, 
  Activity, 
  ShieldAlert,
  Wrench,
  LayoutGrid,
  Hammer,
  ClipboardCheck,
  Clock,
  Truck,
  ShieldCheck,
  BarChart3
} from 'lucide-react';
import { motion } from 'motion/react';

interface WorkshopModuleProps {
  onBack: () => void;
}

type WorkshopView = 'menu' | 'electronic_system' | 'todoibras' | 'vehipesa';

const WorkshopModule: React.FC<WorkshopModuleProps> = ({ onBack }) => {
  const [activeView, setActiveView] = useState<WorkshopView>('menu');

  const renderMenu = () => (
    <div className="max-w-6xl mx-auto w-full p-8">
      <div className="flex items-center justify-between mb-16">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Módulo Talleres</h1>
          <p className="text-amber-500 font-bold uppercase tracking-widest text-xs mt-2">Control de Mantenimiento Especializado</p>
        </div>
        <button 
          onClick={onBack}
          className="px-6 py-3 bg-white/5 text-white rounded-xl font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2 border border-white/10"
        >
          <ChevronLeft size={18} /> Volver al Menú
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* ELECTRONIC SISTEM Section */}
        <button 
          onClick={() => setActiveView('electronic_system')}
          className="group relative bg-[#1e293b] rounded-[2.5rem] p-10 border border-white/5 hover:border-amber-500/50 transition-all duration-500 text-left overflow-hidden shadow-2xl hover:-translate-y-2"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors"></div>
          
          <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mb-8 group-hover:scale-110 transition-transform border border-amber-500/20">
            <Cpu size={32} />
          </div>
          
          <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-2">ELECTRONIC SISTEM</h3>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed">Diagnóstico y reparación de sistemas electrónicos avanzados</p>
          
          <div className="mt-8 flex items-center gap-2 text-amber-500 font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Ingresar al sistema</span>
            <Zap size={12} className="animate-pulse" />
          </div>
        </button>

        {/* TODOIBRAS Section */}
        <button 
          onClick={() => setActiveView('todoibras')}
          className="group relative bg-[#1e293b] rounded-[2.5rem] p-10 border border-white/5 hover:border-emerald-500/50 transition-all duration-500 text-left overflow-hidden shadow-2xl hover:-translate-y-2"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors"></div>
          
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-8 group-hover:scale-110 transition-transform border border-emerald-500/20">
            <Hammer size={32} />
          </div>
          
          <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-2">TODOIBRAS</h3>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed">Gestión integral de obras y proyectos de infraestructura</p>
          
          <div className="mt-8 flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Ver proyectos</span>
            <Zap size={12} className="animate-pulse" />
          </div>
        </button>

        {/* VEHIPESA Section */}
        <button 
          onClick={() => setActiveView('vehipesa')}
          className="group relative bg-[#1e293b] rounded-[2.5rem] p-10 border border-white/5 hover:border-indigo-500/50 transition-all duration-500 text-left overflow-hidden shadow-2xl hover:-translate-y-2"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors"></div>
          
          <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 mb-8 group-hover:scale-110 transition-transform border border-indigo-500/20">
            <Truck size={32} />
          </div>
          
          <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-2">VEHIPESA</h3>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed">Mantenimiento preventivo y correctivo de vehículos pesados</p>
          
          <div className="mt-8 flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Gestión de flota pesada</span>
            <Zap size={12} className="animate-pulse" />
          </div>
        </button>

        {/* Placeholder for other sections */}
        <div className="bg-white/5 rounded-[2.5rem] p-10 border border-dashed border-white/10 flex flex-col items-center justify-center text-center opacity-40">
          <Settings size={40} className="text-slate-500 mb-4" />
          <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Próximas Secciones</p>
        </div>
      </div>
    </div>
  );

  const renderElectronicSystem = () => (
    <div className="flex flex-col h-full bg-[#0f172a]">
      {/* Header */}
      <header className="bg-[#1e293b] border-b border-white/5 p-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setActiveView('menu')}
            className="p-3 bg-white/5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <Cpu className="text-amber-500" /> ELECTRONIC SISTEM
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Panel de Control Electrónico</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Sistema Online</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-grow p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats / Overview */}
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#1e293b] p-8 rounded-[2rem] border border-white/5 shadow-xl">
                <Activity size={24} className="text-indigo-500 mb-4" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Diagnósticos Activos</p>
                <p className="text-4xl font-black text-white">12</p>
              </div>
              <div className="bg-[#1e293b] p-8 rounded-[2rem] border border-white/5 shadow-xl">
                <ShieldAlert size={24} className="text-rose-500 mb-4" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Alertas Críticas</p>
                <p className="text-4xl font-black text-white">03</p>
              </div>
            </div>

            {/* Placeholder for Main Content */}
            <div className="bg-[#1e293b] rounded-[2.5rem] border border-white/5 p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
              <div className="w-24 h-24 bg-amber-500/10 rounded-3xl flex items-center justify-center text-amber-500 mb-6 border border-amber-500/20">
                <Cpu size={48} className="animate-pulse" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-4">Interfaz de Diagnóstico</h3>
              <p className="text-slate-400 max-w-md mx-auto text-sm font-medium leading-relaxed">
                El sistema de gestión electrónica está siendo configurado para la lectura de sensores y telemetría en tiempo real.
              </p>
            </div>
          </div>

          {/* Sidebar / Actions */}
          <div className="space-y-6">
            <div className="bg-[#1e293b] p-8 rounded-[2rem] border border-white/5 shadow-xl">
              <h4 className="text-xs font-black text-white uppercase tracking-widest mb-6 border-b border-white/5 pb-4">Acciones Rápidas</h4>
              <div className="space-y-3">
                <button className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20">
                  Nuevo Diagnóstico
                </button>
                <button className="w-full py-4 bg-white/5 text-slate-300 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all border border-white/10">
                  Ver Historial
                </button>
              </div>
            </div>

            <div className="bg-amber-600/10 p-8 rounded-[2rem] border border-amber-500/20 shadow-xl">
              <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-4">Estado del Servidor</h4>
              <div className="flex items-center justify-between text-[10px] font-bold text-amber-500/70 uppercase tracking-widest">
                <span>Latencia</span>
                <span>24ms</span>
              </div>
              <div className="w-full bg-amber-500/10 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-amber-500 h-full w-[85%]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTodoibras = () => (
    <div className="flex flex-col h-full bg-[#0f172a]">
      {/* Header */}
      <header className="bg-[#1e293b] border-b border-white/5 p-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setActiveView('menu')}
            className="p-3 bg-white/5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <Hammer className="text-emerald-500" /> TODOIBRAS
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gestión de Obras y Proyectos</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
            <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest text-center">Proyectos en Curso</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-grow p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#1e293b] p-8 rounded-[2rem] border border-white/5 shadow-xl flex items-center gap-6">
              <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500">
                <ClipboardCheck size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Finalizados</p>
                <p className="text-3xl font-black text-white">42</p>
              </div>
            </div>
            <div className="bg-[#1e293b] p-8 rounded-[2rem] border border-white/5 shadow-xl flex items-center gap-6">
              <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-500">
                <Clock size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">En Ejecución</p>
                <p className="text-3xl font-black text-white">08</p>
              </div>
            </div>
            <div className="bg-[#1e293b] p-8 rounded-[2rem] border border-white/5 shadow-xl flex items-center gap-6">
              <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-500">
                <LayoutGrid size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Proyectos</p>
                <p className="text-3xl font-black text-white">50</p>
              </div>
            </div>
          </div>

          {/* Main Display */}
          <div className="bg-[#1e293b] rounded-[2.5rem] border border-white/5 p-12 flex flex-col items-center justify-center text-center min-h-[400px] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-indigo-500"></div>
            <div className="w-24 h-24 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-emerald-500 mb-6 border border-emerald-500/20">
              <Hammer size={48} className="animate-bounce-slow" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-4">Módulo TODOIBRAS</h3>
            <p className="text-slate-400 max-w-md mx-auto text-sm font-medium leading-relaxed mb-8">
              Plataforma centralizada para el seguimiento de hitos, presupuestos y recursos de infraestructura.
            </p>
            <button className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20">
              Explorar Proyectos
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderVehipesa = () => (
    <div className="flex flex-col h-full bg-[#0f172a]">
      {/* Header */}
      <header className="bg-[#1e293b] border-b border-white/5 p-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setActiveView('menu')}
            className="p-3 bg-white/5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <Truck className="text-indigo-500" /> VEHIPESA
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gestión de Flota Pesada</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20">
            <span className="text-[10px] text-indigo-500 font-black uppercase tracking-widest text-center">Mantenimiento Activo</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-grow p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#1e293b] p-8 rounded-[2rem] border border-white/5 shadow-xl flex items-center gap-6">
              <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-500">
                <Truck size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vehículos</p>
                <p className="text-3xl font-black text-white">24</p>
              </div>
            </div>
            <div className="bg-[#1e293b] p-8 rounded-[2rem] border border-white/5 shadow-xl flex items-center gap-6">
              <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500">
                <ShieldCheck size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Operativos</p>
                <p className="text-3xl font-black text-white">21</p>
              </div>
            </div>
            <div className="bg-[#1e293b] p-8 rounded-[2rem] border border-white/5 shadow-xl flex items-center gap-6">
              <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-500">
                <BarChart3 size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Eficiencia</p>
                <p className="text-3xl font-black text-white">92%</p>
              </div>
            </div>
          </div>

          {/* Main Display */}
          <div className="bg-[#1e293b] rounded-[2.5rem] border border-white/5 p-12 flex flex-col items-center justify-center text-center min-h-[400px] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-emerald-500"></div>
            <div className="w-24 h-24 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-500 mb-6 border border-indigo-500/20">
              <Truck size={48} className="animate-pulse" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-4">Módulo VEHIPESA</h3>
            <p className="text-slate-400 max-w-md mx-auto text-sm font-medium leading-relaxed mb-8">
              Gestión especializada para el mantenimiento preventivo, correctivo y control de disponibilidad de la flota pesada.
            </p>
            <div className="flex gap-4">
              <button className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20">
                Nueva Orden
              </button>
              <button className="px-10 py-4 bg-white/5 text-slate-300 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all border border-white/10">
                Inventario
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-grow bg-[#0f172a] flex flex-col h-full overflow-hidden">
      {activeView === 'menu' ? renderMenu() : activeView === 'electronic_system' ? renderElectronicSystem() : activeView === 'todoibras' ? renderTodoibras() : renderVehipesa()}
    </div>
  );
};

export default WorkshopModule;
