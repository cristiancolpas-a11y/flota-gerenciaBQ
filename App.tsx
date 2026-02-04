
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

import { formatDate, getWeekNumber, normalizePlate, calculateStatus, normalizeStr, extractNumber } from './utils';
import { 
  RefreshCw, Users, ClipboardList, Truck, X, Gauge, ShieldCheck, Search, Shield, Settings2, LogOut, FileText, Flame, Plus, Clock, Wrench, Key, Scale, LayoutDashboard, Menu, Disc, ChevronDown, ChevronRight, Briefcase, FilterX, Package, Box, AlertTriangle, Loader2, Info, Database, Percent, TrendingUp, CheckCircle2, Activity, Sparkles, Filter, Building2, UserCircle, CalendarDays
} from 'lucide-react';

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

type ActiveView = 'vehiculos' | 'conductores' | 'kilometrajes' | 'novedades' | 'fives' | 'calibraciones';
type StatsFilterType = 'all' | 'soat_expired' | 'rtm_warning' | 'extinguisher_alert';

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<'camiones' | 'montacargas' | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('vehiculos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [statsFilter, setStatsFilter] = useState<StatsFilterType>('all');
  const [reportStatusFilter, setReportStatusFilter] = useState<'TODOS' | 'ABIERTO' | 'CERRADO'>('ABIERTO');

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [fiveSReports, setFiveSReports] = useState<FiveSReport[]>([]);
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewDoc, setViewDoc] = useState<{ url: string, title: string } | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showFiveSForm, setShowFiveSForm] = useState(false);
  const [showCalibrationForm, setShowCalibrationForm] = useState(false);
  const [closingReport, setClosingReport] = useState<Report | null>(null);
  const [closingFiveS, setClosingFiveS] = useState<FiveSReport | null>(null);

  // Filtros compartidos
  const [filterCd, setFilterCd] = useState('all');
  const [filterContractor, setFilterContractor] = useState('all');
  const [mileageStatusFilter, setMileageStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [selectedWeek, setSelectedWeek] = useState(getWeekNumber(new Date()));

  // Filtro específico de semana para 5S (Inicia en la semana actual)
  const [filterFiveSWeek, setFilterFiveSWeek] = useState<number | 'all'>(getWeekNumber(new Date()));

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

  const cds = useMemo(() => Array.from(new Set(vehicles.map(v => v.cd || 'GENERAL'))).sort(), [vehicles]);
  const contractors = useMemo(() => {
    const filteredByCd = filterCd === 'all' ? vehicles : vehicles.filter(v => normalizeStr(v.cd || "") === normalizeStr(filterCd));
    return Array.from(new Set(filteredByCd.map(v => v.contractor || 'GENERAL'))).sort();
  }, [vehicles, filterCd]);

  const noveltyCompliance = useMemo(() => {
    if (reports.length === 0) return { percentage: 0, color: 'text-slate-400', bg: 'bg-slate-400', label: 'Sin Datos' };
    const closed = reports.filter(r => r.status === 'CERRADO').length;
    const percentage = Math.round((closed / reports.length) * 100);
    
    let color = 'text-emerald-500';
    let bg = 'bg-emerald-500';
    let label = 'ALTA EFICIENCIA';
    
    if (percentage < 50) {
      color = 'text-rose-500';
      bg = 'bg-rose-500';
      label = 'GESTIÓN CRÍTICA';
    } else if (percentage < 85) {
      color = 'text-amber-500';
      bg = 'bg-amber-500';
      label = 'GESTIÓN EN PROCESO';
    }
    
    return { percentage, color, bg, label, total: reports.length, closed, open: reports.length - closed };
  }, [reports]);

  // CÁLCULO DE CUMPLIMIENTO 5S BASADO EN FLOTA FILTRADA (CD, CONTRATISTA Y SEMANA)
  const fiveSCompliance = useMemo(() => {
    if (vehicles.length === 0) return { percentage: 0, color: 'text-slate-400', bg: 'bg-slate-400', label: 'Sin Flota' };
    
    const filteredFlota = vehicles.filter(v => {
      const matchCd = filterCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(filterCd);
      const matchContractor = filterContractor === 'all' || normalizeStr(v.contractor || "") === normalizeStr(filterContractor);
      return matchCd && matchContractor;
    });

    if (filteredFlota.length === 0) return { percentage: 0, color: 'text-slate-400', bg: 'bg-slate-400', label: 'Sin Vehículos' };

    // Hallazgos abiertos (independientemente de la semana, si está abierto es crítico)
    const platesWithOpenFindings = new Set(
      fiveSReports
        .filter(f => f.status === 'ABIERTO')
        .map(f => normalizePlate(f.plate))
    );

    // Auditorías realizadas en la semana seleccionada
    const platesAuditedInWeek = new Set(
      fiveSReports
        .filter(f => filterFiveSWeek === 'all' || extractNumber(f.week) === filterFiveSWeek)
        .map(f => normalizePlate(f.plate))
    );

    let compliantCount = 0;
    let pendingCount = 0;

    filteredFlota.forEach(v => {
      const p = normalizePlate(v.plate);
      // "Al Día" solo si tiene auditoría en LA SEMANA Y no tiene hallazgos abiertos
      if (platesAuditedInWeek.has(p) && !platesWithOpenFindings.has(p)) {
        compliantCount++;
      } else {
        pendingCount++;
      }
    });

    const totalFiltered = filteredFlota.length;
    const percentage = Math.round((compliantCount / totalFiltered) * 100);
    
    let color = 'text-emerald-500';
    let bg = 'bg-emerald-500';
    let label = 'FLOTA EN ESTÁNDAR';
    
    if (percentage < 50) {
      color = 'text-rose-500';
      bg = 'bg-rose-500';
      label = 'CRÍTICO';
    } else if (percentage < 85) {
      color = 'text-amber-500';
      bg = 'bg-amber-500';
      label = 'EN EJECUCIÓN';
    }
    
    return { 
      percentage, 
      color, 
      bg, 
      label, 
      total: totalFiltered, 
      compliant: compliantCount, 
      pending: pendingCount 
    };
  }, [vehicles, fiveSReports, filterCd, filterContractor, filterFiveSWeek]);

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchesSearch = normalizePlate(r.plate).includes(normalizePlate(searchTerm));
      const matchesStatus = reportStatusFilter === 'TODOS' || r.status === reportStatusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  }, [reports, searchTerm, reportStatusFilter]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchesSearch = normalizePlate(v.plate).includes(normalizePlate(searchTerm));
      const matchesCd = filterCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(filterCd);
      if (statsFilter === 'soat_expired') return matchesSearch && matchesCd && calculateStatus(v.soat.expiryDate) === 'expired';
      if (statsFilter === 'rtm_warning') return matchesSearch && matchesCd && calculateStatus(v.rtm.expiryDate) !== 'active';
      return matchesSearch && matchesCd;
    });
  }, [vehicles, searchTerm, filterCd, statsFilter]);

  // Hallazgos 5S filtrados por todos los parámetros (incluyendo semana)
  const filteredFiveSList = useMemo(() => {
    return fiveSReports.filter(f => {
      const plateMatch = normalizePlate(f.plate).includes(normalizePlate(searchTerm));
      const weekMatch = filterFiveSWeek === 'all' || extractNumber(f.week) === filterFiveSWeek;
      
      const vehicle = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(f.plate));
      const cdMatch = filterCd === 'all' || (vehicle && normalizeStr(vehicle.cd || "") === normalizeStr(filterCd));
      const contractorMatch = filterContractor === 'all' || (vehicle && normalizeStr(vehicle.contractor || "") === normalizeStr(filterContractor));
      
      return plateMatch && weekMatch && cdMatch && contractorMatch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [fiveSReports, vehicles, searchTerm, filterCd, filterContractor, filterFiveSWeek]);

  const EmptyState = ({ title, icon: Icon }: { title: string, icon: any }) => (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-700">
      <div className="p-10 bg-white rounded-full shadow-xl mb-6 text-slate-200">
        <Icon size={64} />
      </div>
      <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter">{title}</h3>
      <p className="text-sm text-slate-300 font-bold uppercase mt-2">No se encontraron registros activos para mostrar</p>
    </div>
  );

  const LoadingOverlay = () => (
    <div className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-md z-[100] flex flex-col items-center justify-center text-white p-10">
      <div className="p-8 bg-white rounded-[3rem] shadow-2xl mb-8">
        <RefreshCw size={80} className="text-indigo-600 animate-spin" />
      </div>
      <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">Sincronizando Datos</h2>
      <p className="text-indigo-300 font-bold uppercase text-[10px] tracking-[0.5em] animate-pulse">Obteniendo información de Google Sheets...</p>
    </div>
  );

  if (activeModule === null) {
    return (
      <div className="fixed inset-0 bg-[#0f172a] flex flex-col items-center justify-center p-6">
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="p-10 bg-white rounded-[4rem] shadow-2xl mb-8"><ManagementReportIcon size={160} /></div>
          <h1 className="text-4xl font-black text-white uppercase">FLOTA BARRANQUILLA</h1>
          <p className="text-indigo-400 font-bold uppercase tracking-widest mt-4">Gestión y Control</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          <button onClick={() => setActiveModule('camiones')} className="bg-[#1e293b] p-10 rounded-[3rem] text-white flex items-center gap-6 hover:bg-indigo-600/20 border border-white/10 transition-all">
            <Truck size={40} className="text-indigo-500"/><span className="text-2xl font-black uppercase">CAMIONES</span>
          </button>
          <button onClick={() => setActiveModule('montacargas')} className="bg-[#1e293b] p-10 rounded-[3rem] text-white flex items-center gap-6 hover:bg-emerald-600/20 border border-white/10 transition-all">
            <ForkliftIcon size={40} className="text-emerald-500" isMoving/><span className="text-2xl font-black uppercase">MONTACARGAS</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {isSyncing && <LoadingOverlay />}
      
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0f172a] transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform xl:relative xl:translate-x-0`}>
        <div className="p-8 flex flex-col h-full space-y-8">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveModule(null)}>
            <div className="p-3 bg-rose-500 rounded-xl text-white group-hover:bg-rose-600 transition-colors"><LogOut size={20}/></div>
            <span className="text-white font-black uppercase text-sm">SALIR</span>
          </div>
          <nav className="flex-grow space-y-4">
            {[
              { id: 'vehiculos', label: 'Vehículos', icon: <LayoutDashboard size={18}/> },
              { id: 'conductores', label: 'Conductores', icon: <Users size={18}/> },
              { id: 'calibraciones', label: 'Calibraciones', icon: <Disc size={18}/> },
              { id: 'kilometrajes', label: 'Kilometrajes', icon: <Gauge size={18}/> },
              { id: 'novedades', label: 'Novedades', icon: <ClipboardList size={18}/> },
              { id: 'fives', label: '5S', icon: <Sparkles size={18}/> }
            ].map(v => (
              <button key={v.id} onClick={() => { setActiveView(v.id as ActiveView); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === v.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                {v.icon} {v.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <main className="flex-grow flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b p-6 flex justify-between items-center relative z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="xl:hidden p-2"><Menu/></button>
            <div className="bg-slate-50 border rounded-xl px-4 py-3 flex items-center gap-3 w-64 md:w-96 shadow-inner">
              <Search size={18} className="text-slate-400" />
              <input type="text" placeholder="BUSCAR PLACA..." className="bg-transparent font-black uppercase text-xs outline-none flex-grow" value={searchTerm} onChange={e => setSearchTerm(e.target.value.toUpperCase())} />
            </div>
          </div>
          <button onClick={handleSyncData} className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
            <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </header>

        <div className="flex-grow p-6 md:p-10 overflow-y-auto bg-[#f8fafc] custom-scrollbar">
          {activeView === 'vehiculos' && (
            <div className="space-y-8 max-w-7xl mx-auto">
              <div className="flex flex-wrap gap-4 mb-8">
                 <div className="bg-white px-4 py-2 rounded-xl border flex items-center gap-3">
                    <Filter size={14} className="text-slate-400" />
                    <select className="bg-transparent text-[10px] font-black uppercase outline-none" value={filterCd} onChange={e => setFilterCd(e.target.value)}>
                       <option value="all">TODOS LOS CD</option>
                       {cds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                    </select>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                 <button onClick={() => setStatsFilter('all')} className={`p-8 rounded-[3rem] border text-left shadow-sm transition-all group overflow-hidden ${statsFilter === 'all' ? 'bg-[#0f172a] text-white border-[#0f172a]' : 'bg-white border-slate-100 hover:border-indigo-200'}`}>
                    <div className="flex justify-between items-start mb-4">
                       <Truck size={24} className={statsFilter === 'all' ? 'text-indigo-400' : 'text-slate-300'} />
                       <TrendingUp size={16} className="text-emerald-500" />
                    </div>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${statsFilter === 'all' ? 'text-indigo-300' : 'text-slate-400'}`}>Total Vehículos</p>
                    <p className="text-4xl font-black">{filteredVehicles.length}</p>
                 </button>

                 <button onClick={() => setStatsFilter('soat_expired')} className={`p-8 rounded-[3rem] border text-left shadow-sm transition-all overflow-hidden ${statsFilter === 'soat_expired' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white border-rose-50 hover:border-rose-200'}`}>
                    <ShieldCheck size={24} className={statsFilter === 'soat_expired' ? 'text-rose-200' : 'text-rose-500'} />
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 mt-4 ${statsFilter === 'soat_expired' ? 'text-rose-100' : 'text-rose-400'}`}>SOAT Vencidos</p>
                    <p className="text-4xl font-black">{filteredVehicles.filter(v => calculateStatus(v.soat.expiryDate) === 'expired').length}</p>
                 </button>

                 <button onClick={() => setStatsFilter('rtm_warning')} className={`p-8 rounded-[3rem] border text-left shadow-sm transition-all overflow-hidden ${statsFilter === 'rtm_warning' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-indigo-50 hover:border-indigo-200'}`}>
                    <Gauge size={24} className={statsFilter === 'rtm_warning' ? 'text-indigo-200' : 'text-indigo-500'} />
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 mt-4 ${statsFilter === 'rtm_warning' ? 'text-indigo-100' : 'text-indigo-400'}`}>Trámites Próximos</p>
                    <p className="text-4xl font-black">{filteredVehicles.filter(v => calculateStatus(v.rtm.expiryDate) !== 'active').length}</p>
                 </button>
              </div>

              {filteredVehicles.length > 0 ? (
                <div className="grid grid-cols-1 gap-8">
                  {filteredVehicles.map(v => (
                    <div key={v.id} className="bg-white p-8 rounded-[3.5rem] border shadow-xl grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4">
                      <div className="flex flex-col items-center justify-center bg-slate-50 rounded-[2.5rem] p-6 border">
                        <div className="bg-[#0f172a] px-8 py-6 rounded-2xl text-white font-mono text-3xl font-black mb-4 shadow-2xl">{v.plate}</div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{v.cd}</span>
                      </div>
                      <DocumentCard title="SOAT" doc={v.soat} icon={<ShieldCheck />} onViewDoc={(url, t) => setViewDoc({url, title: t})} />
                      <DocumentCard title="RTM" doc={v.rtm} icon={<Gauge />} onViewDoc={(url, t) => setViewDoc({url, title: t})} />
                      <DocumentCard title="EXTINTOR" doc={v.extinguisher} icon={<Flame />} onViewDoc={(url, t) => setViewDoc({url, title: t})} />
                    </div>
                  ))}
                </div>
              ) : <EmptyState title="Sin Vehículos" icon={Truck} />}
            </div>
          )}

          {activeView === 'conductores' && (
            <div className="space-y-8 max-w-7xl mx-auto">
              {drivers.length > 0 ? drivers.filter(d => d.name.toUpperCase().includes(searchTerm)).map(d => (
                <DriverCard key={d.id} driver={d} onViewDoc={(url, t) => setViewDoc({url, title: t})} />
              )) : <EmptyState title="Sin Conductores" icon={Users} />}
            </div>
          )}

          {activeView === 'kilometrajes' && (
            <MileageEntryForm 
              vehicles={vehicles} 
              mileageLogs={mileageLogs} 
              onSubmit={submitMileageToSheet}
              externalCd={filterCd} setExternalCd={setFilterCd}
              externalContractor={filterContractor} setExternalContractor={setFilterContractor}
              searchTerm={searchTerm} setSearchTerm={setSearchTerm}
              statusFilter={mileageStatusFilter} setStatusFilter={setMileageStatusFilter}
              selectedWeek={selectedWeek} onWeekChange={setSelectedWeek}
            />
          )}

          {activeView === 'novedades' && (
            <div className="space-y-8 max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                 <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-full h-2 ${noveltyCompliance.bg}`}></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <Percent size={14} className="text-indigo-500" /> CUMPLIMIENTO CIERRE
                    </p>
                    <span className={`text-6xl font-black tracking-tighter ${noveltyCompliance.color}`}>
                       {noveltyCompliance.percentage}%
                    </span>
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mt-3">{noveltyCompliance.label}</span>
                 </div>
                 <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col justify-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Reportes</p>
                    <p className="text-4xl font-black text-slate-800">{noveltyCompliance.total}</p>
                 </div>
                 <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col justify-center">
                    <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-2">Casos Pendientes</p>
                    <p className="text-4xl font-black text-rose-600">{noveltyCompliance.open}</p>
                 </div>
                 <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col justify-center">
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">Casos Resueltos</p>
                    <p className="text-4xl font-black text-emerald-600">{noveltyCompliance.closed}</p>
                 </div>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-center bg-[#0f172a] p-10 rounded-[3rem] text-white gap-6">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Control de Taller</h2>
                <button onClick={() => setShowReportForm(true)} className="px-8 py-5 bg-indigo-600 rounded-2xl font-black text-xs tracking-widest flex items-center gap-3 hover:bg-indigo-700 transition-all shadow-xl"><Plus /> NUEVO REPORTE</button>
              </div>
              
              {filteredReports.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {filteredReports.map(r => (
                    <ReportCard key={r.id} report={r} onViewDoc={(url, t) => setViewDoc({url, title: t})} onManageClosure={setClosingReport} />
                  ))}
                </div>
              ) : <EmptyState title={`Sin reportes ${reportStatusFilter}`} icon={ClipboardList} />}
            </div>
          )}

          {activeView === 'calibraciones' && (
            <div className="space-y-8 max-w-7xl mx-auto">
              <div className="flex justify-between items-center bg-indigo-900 p-10 rounded-[3rem] text-white">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Calibración Neumáticos</h2>
                <button onClick={() => setShowCalibrationForm(true)} className="px-8 py-5 bg-indigo-600 rounded-2xl font-black text-xs tracking-widest flex items-center gap-3 hover:bg-indigo-700 shadow-xl transition-all"><Plus /> REGISTRAR</button>
              </div>
              {calibrations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {calibrations.filter(c => normalizePlate(c.plate).includes(searchTerm)).map(c => (
                    <CalibrationCard key={c.id} calibration={c} onViewDoc={(url, t) => setViewDoc({url, title: t})} />
                  ))}
                </div>
              ) : <EmptyState title="Sin Calibraciones" icon={Disc} />}
            </div>
          )}

          {activeView === 'fives' && (
            <div className="space-y-8 max-w-7xl mx-auto">
              
              {/* BARRA DE FILTROS 5S MULTI-SEGMENTO */}
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-wrap items-center gap-6 mb-8">
                <div className="flex items-center gap-3 px-2">
                   <Filter size={18} className="text-indigo-600" />
                   <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Segmentar por:</span>
                </div>
                
                {/* Filtro CD */}
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
                   <Building2 size={16} className="text-slate-400" />
                   <select className="bg-transparent text-[10px] font-black uppercase outline-none min-w-[120px]" value={filterCd} onChange={e => { setFilterCd(e.target.value); setFilterContractor('all'); }}>
                      <option value="all">TODOS LOS CD</option>
                      {cds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                   </select>
                </div>

                {/* Filtro Contratista */}
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
                   <UserCircle size={16} className="text-slate-400" />
                   <select className="bg-transparent text-[10px] font-black uppercase outline-none min-w-[120px]" value={filterContractor} onChange={e => setFilterContractor(e.target.value)}>
                      <option value="all">TODOS LOS OP</option>
                      {contractors.map(cnt => <option key={cnt} value={cnt}>{cnt}</option>)}
                   </select>
                </div>

                {/* NUEVO: Filtro de Semana */}
                <div className="flex items-center gap-3 bg-[#0f172a] text-white px-5 py-2.5 rounded-xl shadow-lg">
                   <CalendarDays size={16} className="text-indigo-400" />
                   <select className="bg-transparent text-[10px] font-black uppercase outline-none min-w-[100px]" value={filterFiveSWeek} onChange={e => setFilterFiveSWeek(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}>
                      <option value="all" className="text-slate-900">TODAS LAS SEMANAS</option>
                      {Array.from({length: 52}, (_, i) => i + 1).map(w => (
                        <option key={w} value={w} className="text-slate-900">Semana {w}</option>
                      ))}
                   </select>
                </div>

                <button 
                  onClick={() => { setFilterCd('all'); setFilterContractor('all'); setFilterFiveSWeek(getWeekNumber(new Date())); setSearchTerm(''); }}
                  className="p-2.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all ml-auto"
                  title="Restablecer Filtros"
                >
                  <FilterX size={18} />
                </button>
              </div>

              {/* DASHBOARD DE CUMPLIMIENTO 5S FILTRADO POR SEMANA */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                 <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-full h-2 ${fiveSCompliance.bg}`}></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center px-4">
                       <Percent size={14} className="inline text-emerald-500 mr-1" /> Cumplimiento W{filterFiveSWeek}
                    </p>
                    <span className={`text-6xl font-black tracking-tighter ${fiveSCompliance.color}`}>
                       {fiveSCompliance.percentage}%
                    </span>
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mt-3">{fiveSCompliance.label}</span>
                 </div>
                 
                 <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col justify-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Flota Seleccionada</p>
                    <p className="text-4xl font-black text-slate-800">{fiveSCompliance.total}</p>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full mt-4 overflow-hidden">
                       <div className="h-full bg-indigo-500 w-full"></div>
                    </div>
                 </div>

                 <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col justify-center">
                    <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-2">Pendientes en Semana</p>
                    <p className="text-4xl font-black text-rose-600">{fiveSCompliance.pending}</p>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full mt-4 overflow-hidden">
                       <div className="h-full bg-rose-500" style={{ width: `${(fiveSCompliance.pending / (fiveSCompliance.total || 1)) * 100}%` }}></div>
                    </div>
                 </div>

                 <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col justify-center">
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">Al Día (Auditados)</p>
                    <p className="text-4xl font-black text-emerald-600">{fiveSCompliance.compliant}</p>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full mt-4 overflow-hidden">
                       <div className="h-full bg-emerald-500" style={{ width: `${fiveSCompliance.percentage}%` }}></div>
                    </div>
                 </div>
              </div>

              <div className="flex justify-between items-center bg-emerald-900 p-10 rounded-[3rem] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="relative z-10">
                  <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                    <Sparkles size={32} className="text-emerald-400" /> 5S
                  </h2>
                  <p className="text-emerald-300 font-bold uppercase text-[10px] tracking-widest mt-2">
                    {filterFiveSWeek === 'all' ? 'VISIÓN HISTÓRICA TOTAL' : `CONTROL ESTRICTO SEMANA ${filterFiveSWeek}`}
                  </p>
                </div>
                <button onClick={() => setShowFiveSForm(true)} className="relative z-10 px-8 py-5 bg-emerald-600 rounded-2xl font-black text-xs tracking-widest flex items-center gap-3 hover:bg-emerald-700 shadow-xl transition-all border border-emerald-500/30">
                  <Plus /> REGISTRAR HALLAZGO
                </button>
              </div>

              {filteredFiveSList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {filteredFiveSList.map(f => (
                    <FiveSCard key={f.id} report={f} onViewDoc={(url, t) => setViewDoc({url, title: t})} onManageClosure={setClosingFiveS} />
                  ))}
                </div>
              ) : <EmptyState title={`Sin Auditorías W${filterFiveSWeek}`} icon={Shield} />}
            </div>
          )}
        </div>
      </main>

      {showReportForm && <ReportForm vehicles={vehicles} onClose={() => { setShowReportForm(false); handleSyncData(); }} onSubmit={submitReportToSheet} />}
      {showFiveSForm && <FiveSForm vehicles={vehicles} onClose={() => { setShowFiveSForm(false); handleSyncData(); }} onSubmit={submitFiveSToSheet} />}
      {showCalibrationForm && <CalibrationForm vehicles={vehicles} onClose={() => { setShowCalibrationForm(false); handleSyncData(); }} onSubmit={submitCalibrationToSheet} />}
      {closingReport && <ClosureForm report={closingReport} onClose={() => { setClosingReport(null); handleSyncData(); }} onSubmit={(id, data) => submitReportToSheet({...closingReport, ...data} as any)} />}
      {closingFiveS && <FiveSClosureForm report={closingFiveS} onClose={() => { setClosingFiveS(null); handleSyncData(); }} onSubmit={(id, data) => submitFiveSToSheet({...closingFiveS, ...data} as any)} />}
      {viewDoc && <DocumentViewer url={viewDoc.url} title={viewDoc.title} onClose={() => setViewDoc(null)} />}
    </div>
  );
};

export default App;
