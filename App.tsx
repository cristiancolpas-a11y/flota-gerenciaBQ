
import React, { useState, useEffect, useMemo } from 'react';
import { Vehicle, Driver, Report, MileageLog, FiveSReport, Calibration } from './types';
import DocumentCard from './components/DocumentCard';
import DocumentUpdateForm from './components/DocumentUpdateForm';
import DocumentViewer from './components/DocumentViewer';
import DriverCard from './components/DriverCard';
import ReportCard from './components/ReportCard';
import ReportForm from './components/ReportForm';
import ClosureForm from './components/ClosureForm';
import FiveSCard from './components/FiveSCard';
import FiveSForm from './components/FiveSForm';
import FiveSClosureForm from './components/FiveSClosureForm';
import CalibrationCard from './components/CalibrationCard';
import CalibrationForm from './components/CalibrationForm';
import MileageEntryForm from './components/MileageEntryForm';
import PlateHistoryModal from './components/PlateHistoryModal';

import { 
  fetchVehiclesFromSheet, 
  fetchDriversFromSheet, 
  fetchReportsFromSheet, 
  fetchFiveSReportsFromSheet, 
  fetchCalibrationsFromSheet,
  fetchMileageLogsFromSheet,
  submitDocumentUpdateToSheet,
  submitReportToSheet,
  submitMileageToSheet,
  submitFiveSToSheet,
  submitCalibrationToSheet
} from './services/sheetService';

import { formatDate, getWeekNumber, normalizePlate, calculateStatus } from './utils';
import { 
  RefreshCw, Users, ClipboardList, Truck, X, Gauge, ShieldCheck, Search, Shield, Settings2, LogOut, FileText, Flame, Plus, Clock, Wrench, Key, Scale, LayoutDashboard, Menu, Disc, ChevronDown, ChevronRight, Briefcase, FilterX, Package, Box, AlertTriangle
} from 'lucide-react';

// Icono personalizado: Reporte con Gráfico y Engranaje
const ManagementReportIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="15" y="10" width="60" height="80" rx="8" fill="#F8FAFC" stroke="#1E293B" strokeWidth="4"/>
    <rect x="35" y="5" width="20" height="8" rx="2" fill="#FBBF24" stroke="#1E293B" strokeWidth="3"/>
    <rect x="25" y="35" width="8" height="5" fill="#F87171" stroke="#1E293B" strokeWidth="2"/>
    <rect x="35" y="30" width="8" height="10" fill="#FBBF24" stroke="#1E293B" strokeWidth="2"/>
    <rect x="45" y="25" width="8" height="15" fill="#34D399" stroke="#1E293B" strokeWidth="2"/>
    <rect x="55" y="20" width="8" height="20" fill="#60A5FA" stroke="#1E293B" strokeWidth="2"/>
    <rect x="25" y="50" width="12" height="12" rx="2" fill="#60A5FA" stroke="#1E293B" strokeWidth="2"/>
    <path d="M28 56L31 59L34 53" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="42" y1="52" x2="65" y2="52" stroke="#1E293B" strokeWidth="2" strokeLinecap="round"/>
    <line x1="42" y1="58" x2="60" y2="58" stroke="#1E293B" strokeWidth="2" strokeLinecap="round"/>
    <rect x="25" y="68" width="12" height="12" rx="2" fill="#34D399" stroke="#1E293B" strokeWidth="2"/>
    <path d="M28 74L31 77L34 71" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="42" y1="70" x2="65" y2="70" stroke="#1E293B" strokeWidth="2" strokeLinecap="round"/>
    <line x1="42" y1="76" x2="60" y2="76" stroke="#1E293B" strokeWidth="2" strokeLinecap="round"/>
    <g transform="translate(10, 5)">
      <circle cx="65" cy="70" r="14" fill="#FBBF24" stroke="#1E293B" strokeWidth="4"/>
      <circle cx="65" cy="70" r="4" fill="white" stroke="#1E293B" strokeWidth="3"/>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <rect key={angle} x="62.5" y="52" width="5" height="8" rx="1" fill="#FBBF24" stroke="#1E293B" strokeWidth="2" transform={`rotate(${angle}, 65, 70)`}/>
      ))}
    </g>
  </svg>
);

const ForkliftIcon = ({ size = 24, className = "", isMoving = false }: { size?: number, className?: string, isMoving?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`${className} ${isMoving ? 'animate-forklift-vibrate' : ''}`}>
    <path d="M12 17V7" />
    <path d="M12 7h2" />
    <path d="M5 17h12v-5l-5-1H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2z" />
    <circle cx="7" cy="19" r="2" />
    <circle cx="15" cy="19" r="2" />
    <g className={isMoving ? 'animate-forklift-lift' : ''}>
      <path d="M19 13h3" />
      <path d="M22 13V5" />
      <path d="M12 13h2" />
    </g>
  </svg>
);

type ActiveView = 'vehiculos' | 'conductores' | 'kilometrajes' | 'novedades' | 'fives' | 'calibraciones' | 'inventario';
type Category = 'DOCUMENTOS' | 'NEUMATICOS' | 'GESTION';
type StatsFilterType = 'all' | 'soat_expired' | 'rtm_warning' | 'extinguisher_alert';

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<'camiones' | 'montacargas' | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('vehiculos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Estado para acordeones del Sidebar
  const [expandedCats, setExpandedCats] = useState<Record<Category, boolean>>({
    'DOCUMENTOS': true,
    'NEUMATICOS': false,
    'GESTION': false
  });

  const [statsFilter, setStatsFilter] = useState<StatsFilterType>('all');

  const toggleCategory = (cat: Category) => {
    setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const closeAllCategories = () => {
    setExpandedCats({
      'DOCUMENTOS': false,
      'NEUMATICOS': false,
      'GESTION': false
    });
  };

  const handleNavigate = (view: ActiveView) => {
    setActiveView(view);
    closeAllCategories();
    setIsSidebarOpen(false); // Cierra el sidebar en móvil
  };

  // Data State
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [fiveSReports, setFiveSReports] = useState<FiveSReport[]>([]);
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);
  
  // UI State
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewDoc, setViewDoc] = useState<{ url: string, title: string } | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showDocUpdate, setShowDocUpdate] = useState(false);
  const [showFiveSForm, setShowFiveSForm] = useState(false);
  const [showCalibrationForm, setShowCalibrationForm] = useState(false);
  const [closingReport, setClosingReport] = useState<Report | null>(null);
  const [closingFiveS, setClosingFiveS] = useState<FiveSReport | null>(null);
  const [historyPlate, setHistoryPlate] = useState<string | null>(null);

  // Filters Globales
  const [filterCd, setFilterCd] = useState('all');
  const [filterContractor, setFilterContractor] = useState('all');
  const [mileageStatusFilter, setMileageStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [selectedWeek, setSelectedWeek] = useState(getWeekNumber(new Date()));

  useEffect(() => { 
    if (activeModule) handleSyncData(); 
  }, [activeModule]);

  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      const [v, d, r, f, c, m] = await Promise.all([
        fetchVehiclesFromSheet(),
        fetchDriversFromSheet(),
        fetchReportsFromSheet(),
        fetchFiveSReportsFromSheet(),
        fetchCalibrationsFromSheet(),
        fetchMileageLogsFromSheet()
      ]);
      setVehicles(v || []);
      setDrivers(d || []);
      setReports(r || []);
      setFiveSReports(f || []);
      setCalibrations(c || []);
      setMileageLogs(m || []);
    } finally { setIsSyncing(false); }
  };

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchesSearch = normalizePlate(v.plate).includes(normalizePlate(searchTerm));
      const matchesCd = filterCd === 'all' || v.cd === filterCd;
      
      let matchesStats = true;
      if (statsFilter === 'soat_expired') {
        matchesStats = calculateStatus(v.soat.expiryDate) === 'expired';
      } else if (statsFilter === 'rtm_warning') {
        matchesStats = calculateStatus(v.rtm.expiryDate) === 'warning' || calculateStatus(v.rtm.expiryDate) === 'expired';
      } else if (statsFilter === 'extinguisher_alert') {
        const extStatus = calculateStatus(v.extinguisher.expiryDate);
        matchesStats = extStatus === 'expired' || extStatus === 'warning';
      }

      return matchesSearch && matchesCd && matchesStats;
    });
  }, [vehicles, searchTerm, filterCd, statsFilter, fiveSReports]);

  const cds = useMemo(() => Array.from(new Set(vehicles.map(v => v.cd).filter(Boolean))), [vehicles]);

  if (activeModule === null) {
    return (
      <div className="fixed inset-0 bg-[#0f172a] flex flex-col items-center justify-center p-6 overflow-hidden">
        <div className="relative z-10 flex flex-col items-center w-full max-w-4xl">
           <div className="mb-12 flex flex-col items-center text-center">
              <div className="p-10 bg-white rounded-[4rem] shadow-2xl mb-8 animate-in zoom-in duration-700 border-4 border-white/20">
                 <ManagementReportIcon size={160} />
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase text-center">FLOTA BARRANQUILLA</h1>
              <p className="text-indigo-400 font-bold uppercase tracking-[0.3em] mt-4">Gestión de Mantenimiento y Control</p>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
             <button onClick={() => setActiveModule('camiones')} className="group bg-[#1e293b] border-2 border-white/10 p-10 rounded-[3rem] text-white flex items-center gap-6 hover:border-indigo-500 transition-all hover:bg-indigo-600/10">
                <div className="p-5 bg-indigo-500/20 rounded-2xl group-hover:bg-indigo-50 group-hover:animate-bounce transition-all">
                  <Truck size={40} className="text-indigo-500 group-hover:text-white"/>
                </div>
                <div className="text-left">
                  <span className="text-2xl font-black uppercase block">CAMIONES</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Distribución T1 y T2</span>
                </div>
             </button>
             <button onClick={() => setActiveModule('montacargas')} className="group bg-[#1e293b] border-2 border-white/10 p-10 rounded-[3rem] text-white flex items-center gap-6 hover:border-emerald-500 transition-all hover:bg-emerald-600/10">
                <div className="p-5 bg-emerald-500/20 rounded-2xl group-hover:bg-emerald-50 transition-all">
                  <ForkliftIcon size={40} className="text-emerald-500 group-hover:text-white" isMoving={true} />
                </div>
                <div className="text-left">
                  <span className="text-2xl font-black uppercase block">MONTACARGAS</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Equipos de Bodega</span>
                </div>
             </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* SIDEBAR CON ACORDEÓN AUTO-CONTRAÍBLE */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0f172a] transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform xl:relative xl:translate-x-0 border-r border-white/5`}>
        <div className="p-8 flex flex-col h-full space-y-8">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveModule(null)}>
            <div className="p-3 bg-rose-500 rounded-xl text-white group-hover:rotate-12 transition-transform"><LogOut size={20}/></div>
            <span className="text-white font-black uppercase tracking-widest text-sm">SALIR</span>
          </div>
          
          <nav className="flex-grow space-y-6 custom-scrollbar overflow-y-auto pr-2">
            
            {/* CATEGORÍA 1: DOCUMENTOS */}
            <div className="space-y-2">
               <button 
                onClick={() => toggleCategory('DOCUMENTOS')}
                className="w-full flex items-center justify-between px-4 py-2 text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-white transition-colors"
               >
                 <span className="flex items-center gap-2"><FileText size={14} /> DOCUMENTOS</span>
                 {expandedCats.DOCUMENTOS ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
               </button>
               {expandedCats.DOCUMENTOS && (
                 <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                    <button 
                      onClick={() => handleNavigate('vehiculos')} 
                      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'vehiculos' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                      <LayoutDashboard size={18}/> Vehículos
                    </button>
                    <button 
                      onClick={() => handleNavigate('conductores')} 
                      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'conductores' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                      <Users size={18}/> Conductores
                    </button>
                 </div>
               )}
            </div>

            {/* CATEGORÍA 2: NEUMÁTICOS */}
            <div className="space-y-2">
               <button 
                onClick={() => toggleCategory('NEUMATICOS')}
                className="w-full flex items-center justify-between px-4 py-2 text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-white transition-colors"
               >
                 <span className="flex items-center gap-2"><Disc size={14} /> NEUMÁTICOS</span>
                 {expandedCats.NEUMATICOS ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
               </button>
               {expandedCats.NEUMATICOS && (
                 <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                    <button 
                      onClick={() => handleNavigate('calibraciones')} 
                      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'calibraciones' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                      <Disc size={18}/> Calibraciones
                    </button>
                 </div>
               )}
            </div>

            {/* CATEGORÍA 3: GESTIÓN */}
            <div className="space-y-2">
               <button 
                onClick={() => toggleCategory('GESTION')}
                className="w-full flex items-center justify-between px-4 py-2 text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-white transition-colors"
               >
                 <span className="flex items-center gap-2"><Settings2 size={14} /> GESTIÓN</span>
                 {expandedCats.GESTION ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
               </button>
               {expandedCats.GESTION && (
                 <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                    <button 
                      onClick={() => handleNavigate('kilometrajes')} 
                      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'kilometrajes' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                      <Gauge size={18}/> Kilometrajes
                    </button>
                    <button 
                      onClick={() => handleNavigate('novedades')} 
                      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'novedades' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                      <ClipboardList size={18}/> Novedades
                    </button>
                    <button 
                      onClick={() => handleNavigate('fives')} 
                      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'fives' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                      <Shield size={18}/> 5S Auditoría
                    </button>
                    <button 
                      onClick={() => handleNavigate('inventario')} 
                      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'inventario' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                      <Package size={18}/> Inventario
                    </button>
                 </div>
               )}
            </div>

          </nav>

          <div className="pt-6 border-t border-white/5">
             <div className="bg-white/5 p-4 rounded-2xl">
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">C. Distribución</p>
                <select className="bg-transparent text-white text-[10px] font-black w-full outline-none" value={filterCd} onChange={e => setFilterCd(e.target.value)}>
                   <option value="all" className="bg-[#0f172a]">TODOS</option>
                   {cds.map(cd => <option key={cd} value={cd} className="bg-[#0f172a]">{cd}</option>)}
                </select>
             </div>
          </div>
        </div>
      </aside>

      <main className="flex-grow flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b p-6 flex justify-between items-center shadow-sm relative z-40">
           <div className="flex items-center gap-4">
             <button onClick={() => setIsSidebarOpen(true)} className="xl:hidden p-2 text-slate-600"><Menu/></button>
             <div className="bg-slate-50 border rounded-xl px-4 py-3 flex items-center gap-3 w-64 md:w-96">
               <Search size={18} className="text-slate-400" />
               <input 
                type="text" 
                placeholder={activeView === 'inventario' ? "BUSCAR ARTÍCULO..." : "BUSCAR PLACA..."} 
                className="bg-transparent font-black uppercase text-xs outline-none flex-grow" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value.toUpperCase())} 
               />
             </div>
           </div>
           
           <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Semana Actual</span>
                <span className="text-sm font-black text-indigo-600 uppercase">W{selectedWeek} - {new Date().getFullYear()}</span>
              </div>
              <button onClick={handleSyncData} className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
              </button>
           </div>
        </header>

        <div className="flex-grow p-6 md:p-10 overflow-y-auto custom-scrollbar bg-[#f8fafc]">
          {/* VISTAS DINÁMICAS */}
          {activeView === 'vehiculos' && (
            <div className="space-y-8 max-w-7xl mx-auto">
              {/* DASHBOARD CON FILTROS INTERACTIVOS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                 <button 
                  onClick={() => setStatsFilter('all')}
                  className={`bg-white p-8 rounded-[2.5rem] border text-left transition-all hover:shadow-lg ${statsFilter === 'all' ? 'border-[#0f172a] border-4 ring-4 ring-[#0f172a]/10' : 'shadow-sm'}`}
                 >
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Vehículos</p>
                    <p className="text-4xl font-black text-[#0f172a]">{vehicles.length}</p>
                 </button>
                 
                 <button 
                  onClick={() => setStatsFilter(statsFilter === 'soat_expired' ? 'all' : 'soat_expired')}
                  className={`bg-white p-8 rounded-[2.5rem] border text-left transition-all hover:shadow-lg ${statsFilter === 'soat_expired' ? 'border-rose-500 border-4 ring-4 ring-rose-500/10' : 'shadow-sm border-rose-100'}`}
                 >
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">SOAT Vencidos</p>
                    <p className="text-4xl font-black text-rose-600">{vehicles.filter(v => calculateStatus(v.soat.expiryDate) === 'expired').length}</p>
                 </button>

                 <button 
                  onClick={() => setStatsFilter(statsFilter === 'rtm_warning' ? 'all' : 'rtm_warning')}
                  className={`bg-white p-8 rounded-[2.5rem] border text-left transition-all hover:shadow-lg ${statsFilter === 'rtm_warning' ? 'border-amber-500 border-4 ring-4 ring-amber-500/10' : 'shadow-sm border-amber-100'}`}
                 >
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">RTM por Vencer</p>
                    <p className="text-4xl font-black text-amber-600">{vehicles.filter(v => calculateStatus(v.rtm.expiryDate) === 'warning').length}</p>
                 </button>

                 <button 
                  onClick={() => setStatsFilter(statsFilter === 'extinguisher_alert' ? 'all' : 'extinguisher_alert')}
                  className={`p-8 rounded-[2.5rem] text-left transition-all hover:shadow-xl ${statsFilter === 'extinguisher_alert' ? 'bg-indigo-800 border-4 border-white shadow-indigo-500/50' : 'bg-indigo-600 shadow-xl'}`}
                 >
                    <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-2">Extintores Vencidos</p>
                    <p className="text-4xl font-black text-white">{vehicles.filter(v => calculateStatus(v.extinguisher.expiryDate) === 'expired').length}</p>
                 </button>
              </div>

              {/* INDICADOR DE FILTRO ACTIVO */}
              {statsFilter !== 'all' && (
                <div className="flex items-center justify-between bg-slate-100 px-6 py-4 rounded-2xl mb-6 animate-in fade-in slide-in-from-top-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <LayoutDashboard size={16} className="text-indigo-600" />
                    </div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Mostrando: <span className="text-[#0f172a]">
                        {statsFilter === 'soat_expired' ? 'SOAT Vencidos' : 
                         statsFilter === 'rtm_warning' ? 'RTM por Vencer' : 
                         'Alerta Extintores'}
                      </span>
                    </p>
                  </div>
                  <button 
                    onClick={() => setStatsFilter('all')}
                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl text-[10px] font-black text-rose-500 uppercase tracking-widest shadow-sm hover:bg-rose-500 hover:text-white transition-all"
                  >
                    <FilterX size={14} /> Quitar Filtro
                  </button>
                </div>
              )}

              <div className="space-y-8">
                {filteredVehicles.length > 0 ? filteredVehicles.map(v => (
                  <div key={v.id} className="bg-white p-8 rounded-[3.5rem] border shadow-xl grid grid-cols-1 lg:grid-cols-4 gap-6 group hover:border-indigo-200 transition-all">
                    <div className="flex flex-col items-center justify-center bg-slate-50 rounded-[2.5rem] p-6 relative">
                      <div className="bg-[#0f172a] px-8 py-6 rounded-2xl text-white font-mono text-3xl font-black mb-4 shadow-xl">{v.plate}</div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{v.cd}</span>
                      <button onClick={() => setHistoryPlate(v.plate)} className="mt-4 text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 hover:underline">
                        <Clock size={12}/> Ver Historial KM
                      </button>
                    </div>
                    <DocumentCard title="SOAT" doc={v.soat} icon={<ShieldCheck />} onViewDoc={(url, t) => setViewDoc({url, title: t})} />
                    <DocumentCard title="RTM" doc={v.rtm} icon={<Gauge />} onViewDoc={(url, t) => setViewDoc({url, title: t})} />
                    <DocumentCard title="EXTINTOR" doc={v.extinguisher} icon={<Flame />} onViewDoc={(url, t) => setViewDoc({url, title: t})} />
                  </div>
                )) : (
                  <div className="py-40 text-center flex flex-col items-center justify-center bg-white rounded-[4rem] border-2 border-dashed border-slate-200">
                    <div className="p-10 bg-slate-50 rounded-full mb-6">
                      <Truck size={64} className="text-slate-200" />
                    </div>
                    <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter">No se encontraron vehículos</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase mt-2">Intente cambiar los filtros o el criterio de búsqueda.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'conductores' && (
            <div className="space-y-8">
              {drivers.filter(d => filterCd === 'all' || d.cd === filterCd).map(d => (
                <DriverCard key={d.id} driver={d} onViewDoc={(url, t) => setViewDoc({url, title: t})} />
              ))}
            </div>
          )}

          {activeView === 'kilometrajes' && (
            <MileageEntryForm 
              vehicles={vehicles} 
              mileageLogs={mileageLogs}
              onSubmit={submitMileageToSheet}
              externalCd={filterCd}
              setExternalCd={setFilterCd}
              externalContractor={filterContractor}
              setExternalContractor={setFilterContractor}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              statusFilter={mileageStatusFilter}
              setStatusFilter={setMileageStatusFilter}
              selectedWeek={selectedWeek}
              onWeekChange={setSelectedWeek}
            />
          )}

          {activeView === 'novedades' && (
            <div className="space-y-8 max-w-7xl mx-auto">
               <div className="flex justify-between items-center bg-[#0f172a] p-10 rounded-[3rem] text-white">
                 <h2 className="text-3xl font-black uppercase tracking-tighter">Control de Taller</h2>
                 <button onClick={() => setShowReportForm(true)} className="px-8 py-5 bg-indigo-600 rounded-2xl font-black text-xs tracking-widest flex items-center gap-3">
                   <Plus /> ABRIR REPORTE
                 </button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {reports.filter(r => (filterCd === 'all' || r.cd === filterCd) && r.plate.includes(searchTerm)).map(r => (
                   <ReportCard key={r.id} report={r} onViewDoc={(url, t) => setViewDoc({url, title: t})} onManageClosure={setClosingReport} />
                 ))}
               </div>
            </div>
          )}

          {activeView === 'fives' && (
            <div className="space-y-8 max-w-7xl mx-auto">
               <div className="flex justify-between items-center bg-emerald-600 p-10 rounded-[3rem] text-white">
                 <h2 className="text-3xl font-black uppercase tracking-tighter">Auditoría 5S</h2>
                 <button onClick={() => setShowFiveSForm(true)} className="px-8 py-5 bg-white text-emerald-700 rounded-2xl font-black text-xs tracking-widest flex items-center gap-3">
                   <Plus /> NUEVA AUDITORÍA
                 </button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {fiveSReports.filter(f => (filterCd === 'all' || f.cd === filterCd) && f.plate.includes(searchTerm)).map(f => (
                   <FiveSCard key={f.id} report={f} onViewDoc={(url, t) => setViewDoc({url, title: t})} onManageClosure={setClosingFiveS} />
                 ))}
               </div>
            </div>
          )}

          {activeView === 'calibraciones' && (
            <div className="space-y-8 max-w-7xl mx-auto">
               <div className="flex justify-between items-center bg-[#0f172a] p-10 rounded-[3rem] text-white">
                 <h2 className="text-3xl font-black uppercase tracking-tighter">🛞 Calibración Llantas</h2>
                 <button onClick={() => setShowCalibrationForm(true)} className="px-8 py-5 bg-indigo-600 rounded-2xl font-black text-xs tracking-widest flex items-center gap-3">
                   <Plus /> REGISTRAR CALIBRACIÓN
                 </button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {calibrations.filter(c => (filterCd === 'all' || c.cd === filterCd) && c.plate.includes(searchTerm)).map(c => (
                   <CalibrationCard key={c.id} calibration={c} onViewDoc={(url, t) => setViewDoc({url, title: t})} />
                 ))}
               </div>
            </div>
          )}

          {activeView === 'inventario' && (
            <div className="space-y-10 max-w-7xl mx-auto">
               <div className="flex justify-between items-center bg-indigo-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Package size={120} />
                 </div>
                 <div className="relative z-10">
                   <h2 className="text-3xl font-black uppercase tracking-tighter">Gestión de Inventario</h2>
                   <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest mt-2 flex items-center gap-2">
                      <Box size={14} /> Control de Suministros y Activos
                   </p>
                 </div>
                 <button className="px-8 py-5 bg-white text-indigo-900 rounded-2xl font-black text-xs tracking-widest flex items-center gap-3 shadow-xl hover:scale-105 transition-all">
                   <Plus /> REGISTRAR ENTRADA
                 </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { title: 'Aceite 15W40', stock: 12, unit: 'Galones', status: 'warning', icon: <Flame className="text-amber-500" /> },
                    { title: 'Llantas 295/80', stock: 4, unit: 'Unidades', status: 'critical', icon: <Disc className="text-rose-500" /> },
                    { title: 'Filtros Aire', stock: 45, unit: 'Unidades', status: 'ok', icon: <Settings2 className="text-emerald-500" /> },
                  ].map((item, idx) => (
                    <div key={idx} className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col items-center text-center">
                       <div className="p-4 bg-slate-50 rounded-2xl mb-4">{item.icon}</div>
                       <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-2">{item.title}</h3>
                       <div className="flex items-baseline gap-2">
                          <span className={`text-4xl font-black ${item.status === 'critical' ? 'text-rose-600' : item.status === 'warning' ? 'text-amber-500' : 'text-emerald-600'}`}>{item.stock}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase">{item.unit}</span>
                       </div>
                       {item.status === 'critical' && (
                         <div className="mt-4 flex items-center gap-2 px-4 py-1.5 bg-rose-50 text-rose-600 rounded-xl text-[9px] font-black uppercase border border-rose-100 animate-pulse">
                            <AlertTriangle size={12} /> Stock Crítico
                         </div>
                       )}
                    </div>
                  ))}
               </div>

               <div className="bg-white rounded-[3rem] border shadow-xl overflow-hidden">
                  <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Últimos Movimientos</span>
                     <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Ver Todo el Kardex</button>
                  </div>
                  <div className="p-0 overflow-x-auto">
                     <table className="w-full text-left">
                        <thead>
                           <tr className="bg-slate-100/50 border-b">
                              <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                              <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Artículo</th>
                              <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Tipo</th>
                              <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Cant.</th>
                              <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Saldo</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {[
                             { date: '2025-05-15', item: 'PASTILLAS FRENO DEL', type: 'SALIDA', qty: -2, balance: 8, plate: 'ABC123' },
                             { date: '2025-05-14', item: 'FILTRO COMBUSTIBLE', type: 'ENTRADA', qty: 20, balance: 45, plate: '-' },
                             { date: '2025-05-14', item: 'BATERIA 12V 90AH', type: 'SALIDA', qty: -1, balance: 2, plate: 'XYZ789' },
                           ].map((move, i) => (
                             <tr key={i} className="hover:bg-slate-50 transition-colors">
                                <td className="px-8 py-6 text-xs font-bold text-slate-500">{move.date}</td>
                                <td className="px-8 py-6">
                                   <p className="text-sm font-black text-slate-800 uppercase">{move.item}</p>
                                   <p className="text-[9px] font-black text-indigo-400 uppercase">Ref: {move.plate}</p>
                                </td>
                                <td className="px-8 py-6 text-center">
                                   <span className={`px-4 py-1 rounded-lg text-[9px] font-black uppercase ${move.type === 'SALIDA' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                      {move.type}
                                   </span>
                                </td>
                                <td className={`px-8 py-6 text-right font-black ${move.type === 'SALIDA' ? 'text-rose-600' : 'text-emerald-600'}`}>{move.qty}</td>
                                <td className="px-8 py-6 text-right font-black text-slate-800">{move.balance}</td>
                             </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
          )}
        </div>
      </main>

      {/* MODALES Y FORMULARIOS */}
      {showDocUpdate && <DocumentUpdateForm vehicles={vehicles} onClose={() => { setShowDocUpdate(false); handleSyncData(); }} onSubmit={submitDocumentUpdateToSheet} />}
      {showReportForm && <ReportForm vehicles={vehicles} onClose={() => { setShowReportForm(false); handleSyncData(); }} onSubmit={submitReportToSheet} />}
      {showFiveSForm && <FiveSForm vehicles={vehicles} onClose={() => { setShowFiveSForm(false); handleSyncData(); }} onSubmit={submitFiveSToSheet} />}
      {showCalibrationForm && <CalibrationForm vehicles={vehicles} onClose={() => { setShowCalibrationForm(false); handleSyncData(); }} onSubmit={submitCalibrationToSheet} />}
      {closingReport && <ClosureForm report={closingReport} onClose={() => { setClosingReport(null); handleSyncData(); }} onSubmit={(id, data) => submitReportToSheet({...closingReport, ...data} as any)} />}
      {closingFiveS && <FiveSClosureForm report={closingFiveS} onClose={() => { setClosingFiveS(null); handleSyncData(); }} onSubmit={(id, data) => submitFiveSToSheet({...closingFiveS, ...data} as any)} />}
      {viewDoc && <DocumentViewer url={viewDoc.url} title={viewDoc.title} onClose={() => setViewDoc(null)} />}
      {historyPlate && <PlateHistoryModal plate={historyPlate} logs={mileageLogs} onClose={() => setHistoryPlate(null)} />}
    </div>
  );
};

export default App;
