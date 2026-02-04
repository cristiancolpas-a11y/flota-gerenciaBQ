
import React, { useState, useEffect, useMemo } from 'react';
import { Vehicle, Driver, Report, MileageLog, FiveSReport, Calibration, WashReport } from './types';
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
import WashCard from './components/WashCard';
import WashForm from './components/WashForm';

import { 
  fetchVehiclesFromSheet, 
  fetchDriversFromSheet, 
  fetchReportsFromSheet, 
  fetchFiveSReportsFromSheet, 
  fetchCalibrationsFromSheet,
  fetchMileageLogsFromSheet,
  fetchWashReportsFromSheet,
  submitDocumentUpdateToSheet,
  submitReportToSheet,
  submitMileageToSheet,
  submitFiveSToSheet,
  submitCalibrationToSheet,
  submitWashToSheet
} from './services/sheetService';

import { formatDate, getWeekNumber, normalizePlate, calculateStatus, normalizeStr, extractNumber } from './utils';
import { 
  RefreshCw, Users, ClipboardList, Truck, X, Gauge, ShieldCheck, Search, Shield, Settings2, LogOut, FileText, Flame, Plus, Clock, Wrench, Key, Scale, LayoutDashboard, Menu, Disc, ChevronDown, ChevronRight, Briefcase, FilterX, Package, Box, AlertTriangle, Loader2, Info, Database, Percent, TrendingUp, CheckCircle2, Activity, Sparkles, Filter, Building2, UserCircle, CalendarDays, Droplets, Calendar
} from 'lucide-react';

const MESES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

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

type ActiveView = 'vehiculos' | 'conductores' | 'kilometrajes' | 'novedades' | 'fives' | 'lavados' | 'calibraciones';
type StatsFilterType = 'all' | 'soat_expired' | 'rtm_warning' | 'extinguisher_alert';

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<'camiones' | 'montacargas' | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('vehiculos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [statsFilter, setStatsFilter] = useState<StatsFilterType>('all');
  const [activeFiveSTab, setActiveFiveSTab] = useState<'realizados' | 'pendientes'>('realizados');
  const [activeWashTab, setActiveWashTab] = useState<'realizados' | 'pendientes'>('realizados');
  const [preSelectedPlate, setPreSelectedPlate] = useState<string | undefined>(undefined);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [fiveSReports, setFiveSReports] = useState<FiveSReport[]>([]);
  const [washReports, setWashReports] = useState<WashReport[]>([]);
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewDoc, setViewDoc] = useState<{ url: string, title: string } | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showFiveSForm, setShowFiveSForm] = useState(false);
  const [showWashForm, setShowWashForm] = useState(false);
  const [showCalibrationForm, setShowCalibrationForm] = useState(false);
  const [closingReport, setClosingReport] = useState<Report | null>(null);
  const [closingFiveS, setClosingFiveS] = useState<FiveSReport | null>(null);

  const [filterCd, setFilterCd] = useState('all');
  const [filterContractor, setFilterContractor] = useState('all');
  const [mileageStatusFilter, setMileageStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [selectedWeek, setSelectedWeek] = useState(getWeekNumber(new Date()));
  
  const [filterTemporalMonth, setFilterTemporalMonth] = useState<string>(MESES[new Date().getMonth()]);

  useEffect(() => { 
    if (activeModule) handleSyncData(); 
  }, [activeModule]);

  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      const [v, d, r, f, w, c, m] = await Promise.all([
        fetchVehiclesFromSheet(),
        fetchDriversFromSheet(),
        fetchReportsFromSheet(),
        fetchFiveSReportsFromSheet(),
        fetchWashReportsFromSheet(),
        fetchCalibrationsFromSheet(),
        fetchMileageLogsFromSheet()
      ]);
      setVehicles(v || []);
      setDrivers(d || []);
      setReports(r || []);
      setFiveSReports(f || []);
      setWashReports(w || []);
      setCalibrations(c || []);
      setMileageLogs(m || []);
      
      if (w && w.length > 0) {
        const currentMonthNormalized = normalizeStr(filterTemporalMonth);
        const hasDataInCurrent = w.some(item => normalizeStr(item.month) === currentMonthNormalized);
        if (!hasDataInCurrent) {
          const lastMonthAvailable = w[w.length - 1].month;
          if (lastMonthAvailable) setFilterTemporalMonth(normalizeStr(lastMonthAvailable));
        }
      }
    } finally { setIsSyncing(false); }
  };

  // LISTA DE CDs ÚNICOS DE LA FLOTA (Columna A de la hoja)
  const cds = useMemo(() => Array.from(new Set(vehicles.map(v => (v.cd || 'GENERAL').toUpperCase()))).sort(), [vehicles]);
  
  // FILTRO DINÁMICO DE CONTRATISTAS (Columna B de la hoja)
  const contractors = useMemo(() => {
    if (filterCd === 'all') {
      return Array.from(new Set(vehicles.map(v => (v.contractor || 'GENERAL').toUpperCase()))).sort();
    }
    
    const normalizedCd = normalizeStr(filterCd);
    const filteredContractors = vehicles
      .filter(v => normalizeStr(v.cd || "") === normalizedCd)
      .map(v => (v.contractor || 'GENERAL').toUpperCase());
    
    return Array.from(new Set(filteredContractors)).sort();
  }, [vehicles, filterCd]);

  const washCompliance = useMemo(() => {
    const fleetToAnalize = vehicles.filter(v => {
      const cdMatch = filterCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(filterCd);
      const contractorMatch = filterContractor === 'all' || normalizeStr(v.contractor || "") === normalizeStr(filterContractor);
      return cdMatch && contractorMatch;
    });
    const totalFlota = fleetToAnalize.length;
    if (totalFlota === 0) return { percentage: 0, total: 0, compliant: 0, pending: 0 };
    const currentMonthNorm = normalizeStr(filterTemporalMonth);
    const platesWashedInMonth = new Set(washReports.filter(w => normalizeStr(w.month) === currentMonthNorm).map(w => normalizePlate(w.plate)));
    const compliantCount = fleetToAnalize.filter(v => platesWashedInMonth.has(normalizePlate(v.plate))).length;
    return { percentage: Math.round((compliantCount / totalFlota) * 100), total: totalFlota, compliant: compliantCount, pending: totalFlota - compliantCount };
  }, [vehicles, washReports, filterCd, filterContractor, filterTemporalMonth]);

  const fiveSCompliance = useMemo(() => {
    const fleetToAnalize = vehicles.filter(v => {
      const cdMatch = filterCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(filterCd);
      const contractorMatch = filterContractor === 'all' || normalizeStr(v.contractor || "") === normalizeStr(filterContractor);
      return cdMatch && contractorMatch;
    });
    const totalFlota = fleetToAnalize.length;
    if (totalFlota === 0) return { percentage: 0, total: 0, compliant: 0, pending: 0 };
    const platesAuditedInWeek = new Set(fiveSReports.filter(f => extractNumber(f.week) === selectedWeek).map(f => normalizePlate(f.plate)));
    const compliantCount = fleetToAnalize.filter(v => platesAuditedInWeek.has(normalizePlate(v.plate))).length;
    return { percentage: Math.round((compliantCount / totalFlota) * 100), total: totalFlota, compliant: compliantCount, pending: totalFlota - compliantCount };
  }, [vehicles, fiveSReports, filterCd, filterContractor, selectedWeek]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchesSearch = normalizePlate(v.plate).includes(normalizePlate(searchTerm));
      const matchesCd = filterCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(filterCd);
      const matchesContractor = filterContractor === 'all' || normalizeStr(v.contractor || "") === normalizeStr(filterContractor);
      
      if (statsFilter === 'soat_expired') return matchesSearch && matchesCd && matchesContractor && calculateStatus(v.soat.expiryDate) === 'expired';
      if (statsFilter === 'rtm_warning') return matchesSearch && matchesCd && matchesContractor && calculateStatus(v.rtm.expiryDate) !== 'active';
      return matchesSearch && matchesCd && matchesContractor;
    });
  }, [vehicles, searchTerm, filterCd, filterContractor, statsFilter]);

  const filteredWashList = useMemo(() => {
    const currentMonthNorm = normalizeStr(filterTemporalMonth);
    return washReports.filter(w => {
      const plateMatch = normalizePlate(w.plate).includes(normalizePlate(searchTerm));
      const monthMatch = normalizeStr(w.month) === currentMonthNorm;
      
      const vehicle = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(w.plate));
      const cdMatch = filterCd === 'all' || (vehicle && normalizeStr(vehicle.cd || "") === normalizeStr(filterCd));
      const contractorMatch = filterContractor === 'all' || (vehicle && normalizeStr(vehicle.contractor || "") === normalizeStr(filterContractor));
      
      return plateMatch && monthMatch && cdMatch && contractorMatch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [washReports, searchTerm, filterTemporalMonth, filterCd, filterContractor, vehicles]);

  const pendingWashVehicles = useMemo(() => {
    const currentMonthNorm = normalizeStr(filterTemporalMonth);
    const platesWashedInMonth = new Set(washReports.filter(w => normalizeStr(w.month) === currentMonthNorm).map(w => normalizePlate(w.plate)));
    return vehicles.filter(v => {
      const cdMatch = filterCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(filterCd);
      const contractorMatch = filterContractor === 'all' || normalizeStr(v.contractor || "") === normalizeStr(filterContractor);
      const plateMatch = normalizePlate(v.plate).includes(normalizePlate(searchTerm));
      const notWashed = !platesWashedInMonth.has(normalizePlate(v.plate));
      return cdMatch && contractorMatch && plateMatch && notWashed;
    }).sort((a, b) => a.plate.localeCompare(b.plate));
  }, [vehicles, washReports, filterTemporalMonth, filterCd, filterContractor, searchTerm]);

  const filteredFiveS = useMemo(() => {
    return fiveSReports.filter(f => {
      const plateMatch = normalizePlate(f.plate).includes(normalizePlate(searchTerm));
      const weekMatch = extractNumber(f.week) === selectedWeek;
      const cdMatch = filterCd === 'all' || normalizeStr(f.cd || "") === normalizeStr(filterCd);
      const vehicle = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(f.plate));
      const contractorMatch = filterContractor === 'all' || (vehicle && normalizeStr(vehicle.contractor || "") === normalizeStr(filterContractor));
      return plateMatch && weekMatch && cdMatch && contractorMatch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [fiveSReports, searchTerm, selectedWeek, filterCd, filterContractor, vehicles]);

  const pendingFiveSVehicles = useMemo(() => {
    const platesAuditedInWeek = new Set(fiveSReports.filter(f => extractNumber(f.week) === selectedWeek).map(f => normalizePlate(f.plate)));
    return vehicles.filter(v => {
      const cdMatch = filterCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(filterCd);
      const contractorMatch = filterContractor === 'all' || normalizeStr(v.contractor || "") === normalizeStr(filterContractor);
      const plateMatch = normalizePlate(v.plate).includes(normalizePlate(searchTerm));
      const notAudited = !platesAuditedInWeek.has(normalizePlate(v.plate));
      return cdMatch && contractorMatch && plateMatch && notAudited;
    }).sort((a, b) => a.plate.localeCompare(b.plate));
  }, [vehicles, fiveSReports, selectedWeek, filterCd, filterContractor, searchTerm]);

  const filteredReports = useMemo(() => {
    const monthIdx = MESES.indexOf(filterTemporalMonth);
    return reports.filter(r => {
      const plateMatch = normalizePlate(r.plate).includes(normalizePlate(searchTerm));
      const cdMatch = filterCd === 'all' || normalizeStr(r.cd || "") === normalizeStr(filterCd);
      const contractorMatch = filterContractor === 'all' || vehicles.some(v => normalizePlate(v.plate) === normalizePlate(r.plate) && normalizeStr(v.contractor || "") === normalizeStr(filterContractor));
      let monthMatch = true;
      if (r.date) {
        const d = new Date(r.date);
        monthMatch = d.getMonth() === monthIdx;
      }
      return plateMatch && cdMatch && contractorMatch && monthMatch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [reports, searchTerm, filterCd, filterContractor, filterTemporalMonth, vehicles]);

  const novedadesStats = useMemo(() => {
    const total = filteredReports.length;
    if (total === 0) return { total: 0, abiertos: 0, cerrados: 0, percCerrados: 0 };
    const cerrados = filteredReports.filter(r => r.status === 'CERRADO').length;
    const abiertos = total - cerrados;
    return { total, abiertos, cerrados, percCerrados: Math.round((cerrados / total) * 100) };
  }, [filteredReports]);

  if (activeModule === null) {
    return (
      <div className="fixed inset-0 bg-[#0f172a] flex flex-col items-center justify-center p-6">
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="p-10 bg-white rounded-[4rem] shadow-2xl mb-8"><ManagementReportIcon size={160} /></div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">FLOTA BARRANQUILLA</h1>
          <p className="text-indigo-400 font-bold uppercase tracking-[0.5em] mt-4">Gestión y Control de Activos</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
          <button onClick={() => setActiveModule('camiones')} className="bg-[#1e293b] p-10 rounded-[3rem] text-white flex items-center gap-6 hover:bg-indigo-600/20 border border-white/10 transition-all group">
            <Truck size={40} className="text-indigo-500 group-hover:scale-110 transition-transform"/><span className="text-2xl font-black uppercase">CAMIONES</span>
          </button>
          <button onClick={() => setActiveModule('montacargas')} className="bg-[#1e293b] p-10 rounded-[3rem] text-white flex items-center gap-6 hover:bg-emerald-600/20 border border-white/10 transition-all group">
            <ForkliftIcon size={40} className="text-emerald-500" isMoving/><span className="text-2xl font-black uppercase">MONTACARGAS</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {isSyncing && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center"><Loader2 size={64} className="text-white animate-spin" /></div>}
      
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0f172a] transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform xl:relative xl:translate-x-0`}>
        <div className="p-8 flex flex-col h-full space-y-8">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveModule(null)}>
            <div className="p-3 bg-rose-500 rounded-xl text-white group-hover:bg-rose-600 transition-colors"><LogOut size={20}/></div>
            <span className="text-white font-black uppercase text-[10px] tracking-widest">SALIR</span>
          </div>
          <nav className="flex-grow space-y-4">
            {[
              { id: 'vehiculos', label: 'Vehículos', icon: <LayoutDashboard size={18}/> },
              { id: 'conductores', label: 'Conductores', icon: <Users size={18}/> },
              { id: 'lavados', label: 'Lavados', icon: <Droplets size={18}/> },
              { id: 'kilometrajes', label: 'Kilómetros', icon: <Gauge size={18}/> },
              { id: 'novedades', label: 'Novedades', icon: <ClipboardList size={18}/> },
              { id: 'fives', label: '5S Camiones', icon: <Sparkles size={18}/> },
              { id: 'calibraciones', label: 'Calibración', icon: <Disc size={18}/> }
            ].map(v => (
              <button key={v.id} onClick={() => { setActiveView(v.id as ActiveView); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === v.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                {v.icon} {v.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <main className="flex-grow flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b p-6 flex justify-between items-center">
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
          
          {/* VISTA LAVADOS */}
          {activeView === 'lavados' && (
            <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
               {/* Dashboard */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-2 bg-cyan-500 transition-all group-hover:h-3"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <Percent size={14} className="text-cyan-500" /> 
                       CUMPLIMIENTO {filterTemporalMonth}
                    </p>
                    <span className="text-6xl font-black tracking-tighter text-cyan-600">{washCompliance.percentage}%</span>
                 </div>
                 <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col justify-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Flota Master</p>
                    <p className="text-4xl font-black text-slate-800">{washCompliance.total}</p>
                 </div>
                 <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col justify-center">
                    <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-2">Lavadados ({filterTemporalMonth})</p>
                    <p className="text-4xl font-black text-cyan-600">{washCompliance.compliant}</p>
                 </div>
                 <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col justify-center">
                    <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-2">Pendientes Mes</p>
                    <p className="text-4xl font-black text-rose-600">{washCompliance.pending}</p>
                 </div>
              </div>

              {/* PANEL DE FILTROS */}
              <div className="bg-[#eefcfd] p-8 rounded-[2.5rem] border border-cyan-100 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-cyan-100 text-cyan-600 rounded-2xl shadow-sm">
                        <Droplets size={32} />
                     </div>
                     <div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800">LOG DE LAVADOS</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Control Periódico de Higiene</p>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-3xl border border-cyan-50 shadow-lg min-w-[180px]">
                      <Calendar size={20} className="text-cyan-600" />
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-300 uppercase">PERIODO</span>
                        <select className="bg-transparent font-black text-slate-700 text-xs uppercase outline-none cursor-pointer" value={filterTemporalMonth} onChange={e => setFilterTemporalMonth(e.target.value)}>
                          {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <ChevronDown size={18} className="text-slate-300 ml-auto" />
                    </div>

                    <button onClick={() => setShowWashForm(true)} className="px-10 py-5 bg-cyan-600 rounded-[1.5rem] font-black text-xs tracking-widest text-white flex items-center gap-3 hover:bg-cyan-700 shadow-xl shadow-cyan-900/10 transition-all border-b-4 border-cyan-800/30">
                      <Plus size={20} /> REGISTRAR LAVADO
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 bg-white px-8 py-5 rounded-[1.8rem] border border-slate-100 shadow-sm transition-all hover:border-cyan-200">
                    <Building2 size={20} className="text-cyan-500" />
                    <select className="bg-transparent font-black text-slate-700 text-xs uppercase outline-none w-full cursor-pointer" 
                      value={filterCd} 
                      onChange={e => { 
                        setFilterCd(e.target.value); 
                        setFilterContractor('all'); // RESET AUTOMÁTICO DE CONTRATISTA AL CAMBIAR CD
                      }}
                    >
                       <option value="all">TODOS LOS CD</option>
                       {cds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-4 bg-white px-8 py-5 rounded-[1.8rem] border border-slate-100 shadow-sm transition-all hover:border-cyan-200">
                    <UserCircle size={20} className="text-cyan-500" />
                    <select className="bg-transparent font-black text-slate-700 text-xs uppercase outline-none w-full cursor-pointer" value={filterContractor} onChange={e => setFilterContractor(e.target.value)}>
                       <option value="all">TODOS LOS CONTRATISTAS</option>
                       {contractors.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* TABS SEGUIMIENTO */}
              <div className="flex gap-4">
                 <button onClick={() => setActiveWashTab('realizados')} className={`flex-1 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all border-2 flex items-center justify-center gap-3 ${activeWashTab === 'realizados' ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-2xl scale-[1.02]' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>
                   <CheckCircle2 size={18} /> Realizados ({filteredWashList.length})
                 </button>
                 <button onClick={() => setActiveWashTab('pendientes')} className={`flex-1 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all border-2 flex items-center justify-center gap-3 ${activeWashTab === 'pendientes' ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-2xl scale-[1.02]' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>
                   <Clock size={18} /> Pendientes ({pendingWashVehicles.length})
                 </button>
              </div>

              {activeWashTab === 'realizados' ? (
                filteredWashList.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredWashList.map(w => (
                      <WashCard key={w.id} report={w} onViewDoc={(url, t) => setViewDoc({url, title: t})} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[4rem] border-4 border-dashed border-slate-100">
                    <div className="p-10 bg-slate-50 rounded-full mb-6"><Droplets size={64} className="text-slate-200" /></div>
                    <p className="text-slate-400 font-black uppercase text-xs tracking-widest">No hay reportes de lavado en {filterTemporalMonth}</p>
                  </div>
                )
              ) : (
                pendingWashVehicles.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {pendingWashVehicles.map(v => (
                      <button key={v.id} onClick={() => { setShowWashForm(true); }} className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 flex flex-col items-center justify-center gap-4 transition-all hover:border-rose-400 hover:bg-rose-50 hover:scale-105 hover:shadow-2xl group shadow-sm">
                        <div className="bg-[#0f172a] px-6 py-3 rounded-2xl text-white font-mono font-black text-lg shadow-md group-hover:bg-rose-600 transition-colors">
                          {v.plate}
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate max-w-full">{v.cd}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[4rem] border-4 border-dashed border-emerald-100">
                    <div className="p-10 bg-emerald-50 rounded-full mb-6"><CheckCircle2 size={64} className="text-emerald-500" /></div>
                    <p className="text-emerald-600 font-black uppercase text-xs tracking-widest">¡CUMPLIMIENTO TOTAL ALCANZADO!</p>
                  </div>
                )
              )}
            </div>
          )}

          {/* VISTA 5S CAMIONES */}
          {activeView === 'fives' && (
            <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
               {/* Dashboard */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500 transition-all group-hover:h-3"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <Percent size={14} className="text-emerald-500" /> 
                       CUMPLIMIENTO W{selectedWeek}
                    </p>
                    <span className="text-6xl font-black tracking-tighter text-emerald-600">{fiveSCompliance.percentage}%</span>
                 </div>
                 <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col justify-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Flota Master</p>
                    <p className="text-4xl font-black text-slate-800">{fiveSCompliance.total}</p>
                 </div>
                 <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col justify-center">
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">Realizados (W{selectedWeek})</p>
                    <p className="text-4xl font-black text-emerald-600">{fiveSCompliance.compliant}</p>
                 </div>
                 <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col justify-center">
                    <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-2">Pendientes Semana</p>
                    <p className="text-4xl font-black text-rose-600">{fiveSCompliance.pending}</p>
                 </div>
              </div>

              {/* PANEL DE FILTROS */}
              <div className="bg-[#eef2f6] p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl shadow-sm">
                        <Sparkles size={32} />
                     </div>
                     <div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-[#1e293b]">5S CAMIONES</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Auditoría Visual de Estándares</p>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-lg min-w-[180px]">
                      <CalendarDays size={20} className="text-emerald-600" />
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-300 uppercase">W{selectedWeek}</span>
                        <select className="bg-transparent font-black text-slate-700 text-xs uppercase outline-none cursor-pointer" value={selectedWeek} onChange={e => setSelectedWeek(parseInt(e.target.value))}>
                          {Array.from({length: 52}, (_, i) => i + 1).map(w => (
                            <option key={w} value={w}>SEMANA {w}</option>
                          ))}
                        </select>
                      </div>
                      <ChevronDown size={18} className="text-slate-300 ml-auto" />
                    </div>

                    <button onClick={() => { setPreSelectedPlate(undefined); setShowFiveSForm(true); }} className="px-10 py-5 bg-[#059669] rounded-[1.5rem] font-black text-xs tracking-widest text-white flex items-center gap-3 hover:bg-emerald-700 shadow-xl shadow-emerald-900/10 transition-all border-b-4 border-emerald-800/30">
                      <Plus size={20} /> REGISTRAR 5S
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 bg-white px-8 py-5 rounded-[1.8rem] border border-slate-100 shadow-sm transition-all hover:border-emerald-200">
                    <Building2 size={20} className="text-emerald-500" />
                    <select className="bg-transparent font-black text-slate-700 text-xs uppercase outline-none w-full cursor-pointer" 
                      value={filterCd} 
                      onChange={e => { 
                        setFilterCd(e.target.value); 
                        setFilterContractor('all'); // RESET AUTOMÁTICO DE CONTRATISTA AL CAMBIAR CD
                      }}
                    >
                       <option value="all">TODOS LOS CENTROS DE DISTRIBUCIÓN</option>
                       {cds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                    </select>
                    <ChevronDown size={18} className="text-slate-300" />
                  </div>
                  <div className="flex items-center gap-4 bg-white px-8 py-5 rounded-[1.8rem] border border-slate-100 shadow-sm transition-all hover:border-emerald-200">
                    <UserCircle size={20} className="text-emerald-500" />
                    <select className="bg-transparent font-black text-slate-700 text-xs uppercase outline-none w-full cursor-pointer" value={filterContractor} onChange={e => setFilterContractor(e.target.value)}>
                       <option value="all">TODOS LOS CONTRATISTAS / OPERADORES</option>
                       {contractors.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={18} className="text-slate-300" />
                  </div>
                </div>
              </div>

              {/* TABS SEGUIMIENTO */}
              <div className="flex gap-4">
                 <button onClick={() => setActiveFiveSTab('realizados')} className={`flex-1 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all border-2 flex items-center justify-center gap-3 ${activeFiveSTab === 'realizados' ? 'bg-[#1e293b] text-white border-[#1e293b] shadow-2xl scale-[1.02]' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>
                   <CheckCircle2 size={18} /> Realizados ({filteredFiveS.length})
                 </button>
                 <button onClick={() => setActiveFiveSTab('pendientes')} className={`flex-1 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all border-2 flex items-center justify-center gap-3 ${activeFiveSTab === 'pendientes' ? 'bg-[#1e293b] text-white border-[#1e293b] shadow-2xl scale-[1.02]' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>
                   <Clock size={18} /> Pendientes ({pendingFiveSVehicles.length})
                 </button>
              </div>

              {activeFiveSTab === 'realizados' ? (
                filteredFiveS.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredFiveS.map(f => (
                      <FiveSCard key={f.id} report={f} onViewDoc={(url, t) => setViewDoc({url, title: t})} onManageClosure={setClosingFiveS} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[4rem] border-4 border-dashed border-slate-100">
                    <div className="p-10 bg-slate-50 rounded-full mb-6"><Sparkles size={64} className="text-slate-200" /></div>
                    <p className="text-slate-400 font-black uppercase text-xs tracking-widest">No hay auditorías registradas en la semana {selectedWeek}</p>
                  </div>
                )
              ) : (
                pendingFiveSVehicles.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {pendingFiveSVehicles.map(v => (
                      <button key={v.id} onClick={() => { setPreSelectedPlate(v.plate); setShowFiveSForm(true); }} className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 flex flex-col items-center justify-center gap-4 transition-all hover:border-rose-400 hover:bg-rose-50 hover:scale-105 hover:shadow-2xl group shadow-sm">
                        <div className="bg-[#0f172a] px-6 py-3 rounded-2xl text-white font-mono font-black text-lg shadow-md group-hover:bg-rose-600 transition-colors">
                          {v.plate}
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate max-w-full">{v.cd}</span>
                          <span className="text-[7px] font-bold text-slate-300 uppercase tracking-widest truncate max-w-full">{v.contractor}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[4rem] border-4 border-dashed border-emerald-100">
                    <div className="p-10 bg-emerald-50 rounded-full mb-6"><CheckCircle2 size={64} className="text-emerald-500" /></div>
                    <p className="text-emerald-600 font-black uppercase text-xs tracking-widest">¡CUMPLIMIENTO TOTAL ALCANZADO! SIN PENDIENTES.</p>
                  </div>
                )
              )}
            </div>
          )}

          {activeView === 'vehiculos' && (
            <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <button onClick={() => setStatsFilter('all')} className={`p-8 rounded-[3rem] border text-left transition-all ${statsFilter === 'all' ? 'bg-[#0f172a] text-white shadow-2xl' : 'bg-white hover:bg-slate-50'}`}>
                    <Truck size={24} className="text-indigo-400 mb-4" />
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Total Flota</p>
                    <p className="text-4xl font-black">{filteredVehicles.length}</p>
                 </button>
                 <button onClick={() => setStatsFilter('soat_expired')} className={`p-8 rounded-[3rem] border text-left transition-all ${statsFilter === 'soat_expired' ? 'bg-rose-600 text-white shadow-2xl' : 'bg-white hover:bg-slate-50'}`}>
                    <ShieldCheck size={24} className="text-rose-400 mb-4" />
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">SOAT Vencidos</p>
                    <p className="text-4xl font-black">{filteredVehicles.filter(v => calculateStatus(v.soat.expiryDate) === 'expired').length}</p>
                 </button>
                 <button onClick={() => setStatsFilter('rtm_warning')} className={`p-8 rounded-[3rem] border text-left transition-all ${statsFilter === 'rtm_warning' ? 'bg-amber-600 text-white shadow-2xl' : 'bg-white hover:bg-slate-50'}`}>
                    <Gauge size={24} className="text-amber-400 mb-4" />
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">RTM Próximos</p>
                    <p className="text-4xl font-black">{filteredVehicles.filter(v => calculateStatus(v.rtm.expiryDate) !== 'active').length}</p>
                 </button>
              </div>

              <div className="grid grid-cols-1 gap-8">
                {filteredVehicles.map(v => {
                  return (
                    <div key={v.id} className="bg-white p-8 rounded-[3.5rem] border shadow-xl grid grid-cols-1 lg:grid-cols-4 gap-6 relative group overflow-hidden transition-all hover:border-indigo-100">
                      <div className="flex flex-col items-center justify-center bg-slate-50 rounded-[2.5rem] p-6 border relative transition-all group-hover:bg-white">
                        <div className="bg-[#0f172a] px-8 py-6 rounded-2xl text-white font-mono text-3xl font-black mb-4 shadow-2xl transition-transform group-hover:scale-110">{v.plate}</div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{v.cd}</span>
                        </div>
                      </div>
                      <DocumentCard title="SOAT" doc={v.soat} icon={<ShieldCheck />} onViewDoc={(url, t) => setViewDoc({url, title: t})} />
                      <DocumentCard title="RTM" doc={v.rtm} icon={<Gauge />} onViewDoc={(url, t) => setViewDoc({url, title: t})} />
                      <DocumentCard title="EXTINTOR" doc={v.extinguisher} icon={<Flame />} onViewDoc={(url, t) => setViewDoc({url, title: t})} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeView === 'conductores' && <div className="space-y-8 max-w-7xl mx-auto">{drivers.map(d => <DriverCard key={d.id} driver={d} onViewDoc={(url, t) => setViewDoc({url, title: t})} />)}</div>}
          {activeView === 'kilometrajes' && <MileageEntryForm vehicles={vehicles} mileageLogs={mileageLogs} onSubmit={submitMileageToSheet} externalCd={filterCd} setExternalCd={setFilterCd} externalContractor={filterContractor} setExternalContractor={setFilterContractor} searchTerm={searchTerm} setSearchTerm={setSearchTerm} statusFilter={mileageStatusFilter} setStatusFilter={setMileageStatusFilter} selectedWeek={selectedWeek} onWeekChange={setSelectedWeek} />}
          
          {activeView === 'novedades' && (
            <div className="space-y-10 max-w-7xl mx-auto animate-in fade-in duration-500">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500 transition-all group-hover:h-3"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <Percent size={14} className="text-indigo-500" /> 
                       EFECTIVIDAD CIERRE
                    </p>
                    <span className="text-6xl font-black tracking-tighter text-indigo-600">{novedadesStats.percCerrados}%</span>
                 </div>
                 <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col justify-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Novedades</p>
                    <p className="text-4xl font-black text-slate-800">{novedadesStats.total}</p>
                 </div>
                 <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col justify-center">
                    <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-2">Abiertos / En Taller</p>
                    <p className="text-4xl font-black text-rose-600">{novedadesStats.abiertos}</p>
                 </div>
                 <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col justify-center">
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">Cerrados / Listos</p>
                    <p className="text-4xl font-black text-emerald-600">{novedadesStats.cerrados}</p>
                 </div>
              </div>

              <div className="bg-slate-900/5 p-8 rounded-[3rem] border border-slate-200 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
                  <div className="flex flex-col gap-2">
                     <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3 text-slate-800">
                       <ClipboardList size={32} className="text-indigo-500" /> GESTIÓN DE NOVEDADES
                     </h2>
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Órdenes de trabajo y reparaciones</p>
                  </div>
                  <button onClick={() => setShowReportForm(true)} className="px-8 py-4 bg-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white flex items-center gap-3 hover:bg-indigo-700 shadow-xl transition-all border border-indigo-500/30">
                    <Plus size={18} /> NUEVA ORDEN
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm">
                    <Calendar size={16} className="text-indigo-600" />
                    <select className="bg-transparent font-black text-[10px] uppercase outline-none w-full" value={filterTemporalMonth} onChange={e => setFilterTemporalMonth(e.target.value)}>
                       {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm">
                    <Building2 size={16} className="text-indigo-600" />
                    <select className="bg-transparent font-black text-[10px] uppercase outline-none w-full" 
                      value={filterCd} 
                      onChange={e => { 
                        setFilterCd(e.target.value); 
                        setFilterContractor('all'); // RESET AUTOMÁTICO DE CONTRATISTA AL CAMBIAR CD
                      }}
                    >
                       <option value="all">TODOS LOS CD</option>
                       {cds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm">
                    <UserCircle size={16} className="text-indigo-600" />
                    <select className="bg-transparent font-black text-[10px] uppercase outline-none w-full" value={filterContractor} onChange={e => setFilterContractor(e.target.value)}>
                       <option value="all">TODOS LOS CONTRATISTAS</option>
                       {contractors.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {filteredReports.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {filteredReports.map(r => (
                    <ReportCard key={r.id} report={r} onViewDoc={(url, t) => setViewDoc({url, title: t})} onManageClosure={setClosingReport} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-100">
                  <div className="p-10 bg-slate-50 rounded-full mb-6"><ClipboardList size={64} className="text-slate-200" /></div>
                  <p className="text-slate-400 font-black uppercase text-xs tracking-widest">No hay novedades registradas con estos filtros</p>
                </div>
              )}
            </div>
          )}

          {activeView === 'calibraciones' && <div className="space-y-8 max-w-7xl mx-auto"><div className="flex justify-between items-center bg-indigo-900 p-10 rounded-[3rem] text-white"><h2 className="text-3xl font-black uppercase tracking-tighter">CALIBRACIÓN</h2><button onClick={() => setShowCalibrationForm(true)} className="px-8 py-5 bg-indigo-600 rounded-2xl font-black text-xs tracking-widest flex items-center gap-3 shadow-xl"><Plus /> REGISTRAR</button></div><div className="grid grid-cols-1 md:grid-cols-3 gap-8">{calibrations.map(c => <CalibrationCard key={c.id} calibration={c} onViewDoc={(url, t) => setViewDoc({url, title: t})} />)}</div></div>}
        </div>
      </main>

      {showReportForm && <ReportForm vehicles={vehicles} onClose={() => { setShowReportForm(false); handleSyncData(); }} onSubmit={submitReportToSheet} />}
      {showFiveSForm && <FiveSForm vehicles={vehicles} onClose={() => { setShowFiveSForm(false); setPreSelectedPlate(undefined); handleSyncData(); }} onSubmit={submitFiveSToSheet} preSelectedPlate={preSelectedPlate} />}
      {showWashForm && <WashForm vehicles={vehicles} onClose={() => { setShowWashForm(false); handleSyncData(); }} onSubmit={submitWashToSheet} />}
      {showCalibrationForm && <CalibrationForm vehicles={vehicles} onClose={() => { setShowCalibrationForm(false); handleSyncData(); }} onSubmit={submitCalibrationToSheet} />}
      {closingReport && <ClosureForm report={closingReport} onClose={() => { setClosingReport(null); handleSyncData(); }} onSubmit={(id, data) => submitReportToSheet({...closingReport, ...data} as any)} />}
      {closingFiveS && <FiveSClosureForm report={closingFiveS} onClose={() => { setClosingFiveS(null); handleSyncData(); }} onSubmit={(id, data) => submitFiveSToSheet({...closingFiveS, ...data} as any)} />}
      {viewDoc && <DocumentViewer url={viewDoc.url} title={viewDoc.title} onClose={() => setViewDoc(null)} />}
    </div>
  );
};

export default App;
