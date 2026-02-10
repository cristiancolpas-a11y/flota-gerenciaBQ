
import React, { useState, useEffect, useMemo } from 'react';
import { Vehicle, Driver, Report, MileageLog, FiveSReport, Calibration, WashReport, DocumentStatus } from './types';
import DocumentCard from './components/DocumentCard';
import DocumentUpdateForm from './components/DocumentUpdateForm';
import DocumentViewer from './components/DocumentViewer';
import DriverCard from './components/DriverCard';
import ReportCard from './components/ReportCard';
import ReportForm from './components/ReportForm';
import ClosureForm from './components/ClosureForm';
import FiveSForm from './components/FiveSForm';
import FiveSCard from './components/FiveSCard';
import FiveSClosureForm from './components/FiveSClosureForm';
import CalibrationCard from './components/CalibrationCard';
import CalibrationForm from './components/CalibrationForm';
import MileageEntryForm from './components/MileageEntryForm';
import WashCard from './components/WashCard';
import WashForm from './components/WashForm';
import WorkshopVisitClosureForm from './components/WorkshopVisitClosureForm';

import { 
  fetchVehiclesFromSheet, 
  fetchDriversFromSheet, 
  fetchReportsFromSheet, 
  fetchFiveSReportsFromSheet, 
  fetchWashReportsFromSheet, 
  fetchCalibrationsFromSheet,
  fetchMileageLogsFromSheet,
  fetchWorkshopVisitsFromSheet,
  submitDocumentUpdateToSheet,
  submitReportToSheet,
  submitMileageToSheet,
  submitFiveSToSheet,
  submitCalibrationToSheet,
  submitWashToSheet,
  submitWorkshopVisitUpdateToSheet
} from './services/sheetService';

import { formatDate, getWeekNumber, normalizePlate, calculateStatus, normalizeStr, extractNumber, getDaysDiff } from './utils';
import { 
  RefreshCw, Users, ClipboardList, Truck, X, Gauge, ShieldCheck, Search, Shield, Settings2, LogOut, FileText, Flame, Plus, Clock, Wrench, Key, Scale, LayoutDashboard, Menu, Disc, ChevronDown, ChevronRight, Briefcase, FilterX, Package, Box, AlertTriangle, Loader2, Info, Database, Percent, TrendingUp, CheckCircle2, Activity, Sparkles, Filter, Building2, UserCircle, CalendarDays, Droplets, Calendar, ShieldAlert, BarChart3, FileBadge, History, IdCard, ExternalLink, Hash, Eye, MapPin, Image as ImageIcon, CircleDot, Store, Timer, UserCheck
} from 'lucide-react';

const ManagementReportIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="15" y="10" width="60" height="80" rx="8" fill="#F8FAFC" stroke="#1E293B" strokeWidth="4"/>
    <rect x="35" y="5" width="20" height="8" rx="2" fill="#FBBF24" stroke="#1E293B" strokeWidth="3"/>
    <rect x="25" y="35" width="8" height="5" fill="#F87171" stroke="#1E293B" strokeWidth="2"/>
    <rect x="35" y="30" width="8" height="10" fill="#FBBF24" stroke="#1E293B" strokeWidth="2"/>
    <rect x="45" y="25" width="8" height="15" fill="#34D399" stroke="#1E293B" strokeWidth="2"/>
    <rect x="55" y="20" width="8" height="20" fill="#60A5FA" stroke="#1E293B" strokeWidth="4"/>
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

type ActiveView = 'vehiculos' | 'conductores' | 'kilometrajes' | 'novedades' | 'fives' | 'lavados' | 'calibraciones' | 'visitas';
type DocFilterType = 'all' | 'SOAT' | 'RTM' | 'EXTINTOR' | 'PLC';

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<'camiones' | 'montacargas' | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('vehiculos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [selectedDocFilter, setSelectedDocFilter] = useState<DocFilterType>('all');
  const [filterCd, setFilterCd] = useState('all');
  const [filterContractor, setFilterContractor] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [rawVehicles, setRawVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [fiveSReports, setFiveSReports] = useState<FiveSReport[]>([]);
  const [washReports, setWashReports] = useState<WashReport[]>([]);
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);
  const [workshopVisits, setWorkshopVisits] = useState<Report[]>([]);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [viewDoc, setViewDoc] = useState<{ url: string, title: string } | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showFiveSForm, setShowFiveSForm] = useState(false);
  const [showWashForm, setShowWashForm] = useState(false);
  const [showCalibrationForm, setShowCalibrationForm] = useState(false);
  const [closingReport, setClosingReport] = useState<Report | null>(null);
  const [closingFiveS, setClosingFiveS] = useState<FiveSReport | null>(null);
  const [closingWorkshopVisit, setClosingWorkshopVisit] = useState<Report | null>(null);

  const [mileageStatusFilter, setMileageStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [selectedWeek, setSelectedWeek] = useState(getWeekNumber(new Date()));

  const [calViewMode, setCalViewMode] = useState<'semanal' | 'mensual'>('mensual');
  const [selectedCalMonth, setSelectedCalMonth] = useState(new Date().getMonth());
  const [selectedCalWeek, setSelectedCalWeek] = useState(getWeekNumber(new Date()));
  const [calStatusFilter, setCalStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [preSelectedCalPlate, setPreSelectedCalPlate] = useState<string | null>(null);

  const [workshopViewMode, setWorkshopViewMode] = useState<'semanal' | 'mensual'>('semanal');
  const [reportSelectedMonth, setReportSelectedMonth] = useState(new Date().getMonth());
  const [reportSelectedWeek, setReportSelectedWeek] = useState(getWeekNumber(new Date()));
  const [reportStatusFilter, setReportStatusFilter] = useState<'all' | 'ABIERTO' | 'CERRADO'>('all');

  const [washViewMode, setWashViewMode] = useState<'mensual' | 'semanal'>('mensual');
  const [washSelectedMonth, setWashSelectedMonth] = useState(new Date().getMonth());
  const [washSelectedWeek, setWashSelectedWeek] = useState(getWeekNumber(new Date()));
  const [washStatusFilter, setWashStatusFilter] = useState<'all' | 'washed' | 'pending'>('all');
  const [preSelectedWashPlate, setPreSelectedWashPlate] = useState<string | null>(null);

  const months = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
  ];

  useEffect(() => { 
    if (activeModule) handleSyncData(); 
  }, [activeModule]);

  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      const results = await Promise.allSettled([
        fetchVehiclesFromSheet(), 
        fetchDriversFromSheet(), 
        fetchReportsFromSheet(),
        fetchFiveSReportsFromSheet(), 
        fetchWashReportsFromSheet(), 
        fetchCalibrationsFromSheet(),
        fetchMileageLogsFromSheet(),
        fetchWorkshopVisitsFromSheet()
      ]);
      
      setRawVehicles(results[0].status === 'fulfilled' ? results[0].value : []);
      setDrivers(results[1].status === 'fulfilled' ? results[1].value : []);
      setReports(results[2].status === 'fulfilled' ? results[2].value : []);
      setFiveSReports(results[3].status === 'fulfilled' ? results[3].value : []);
      setWashReports(results[4].status === 'fulfilled' ? results[4].value : []);
      setCalibrations(results[5].status === 'fulfilled' ? results[5].value : []);
      setMileageLogs(results[6].status === 'fulfilled' ? results[6].value : []);
      setWorkshopVisits(results[7].status === 'fulfilled' ? results[7].value : []);
      
    } catch (err) {
      console.error("Critical Sync Error:", err);
    } finally { setIsSyncing(false); }
  };

  const vehicles = useMemo(() => {
    const combinedMap = new Map<string, Vehicle>();
    rawVehicles.forEach(v => {
      const p = normalizePlate(v.plate);
      if (p) combinedMap.set(v.id || p, { ...v });
    });

    mileageLogs.forEach(log => {
      const p = normalizePlate(log.plate);
      const existsInMaster = Array.from(combinedMap.values()).some(v => normalizePlate(v.plate) === p);
      if (p && !existsInMaster) {
        combinedMap.set(`disc-${p}`, {
          id: `disc-${p}`,
          plate: p,
          brand: 'Vehículo',
          model: 'Unidad',
          cd: log.cd || 'GENERAL',
          contractor: log.contractor || 'GENERAL',
          soat: { expiryDate: '', lastRenewalDate: '', status: 'expired' },
          rtm: { expiryDate: '', lastRenewalDate: '', status: 'expired' },
          plc: { expiryDate: '', lastRenewalDate: '', status: 'expired' },
          extinguisher: { expiryDate: '', lastRenewalDate: '', status: 'expired' },
          lastUpdate: new Date().toISOString()
        });
      }
    });

    return Array.from(combinedMap.values());
  }, [rawVehicles, mileageLogs]);

  const baseFilteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchesCd = filterCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(filterCd);
      const matchesContractor = filterContractor === 'all' || normalizeStr(v.contractor || "") === normalizeStr(filterContractor);
      const matchesSearch = normalizePlate(v.plate).includes(normalizePlate(searchTerm));
      return matchesCd && matchesContractor && matchesSearch;
    });
  }, [vehicles, filterCd, filterContractor, searchTerm]);

  const masterFleetFiltered = useMemo(() => {
    return baseFilteredVehicles.filter(v => {
      if (selectedDocFilter === 'all') return true;
      if (selectedDocFilter === 'SOAT') return v.soat.status !== 'active';
      if (selectedDocFilter === 'RTM') return v.rtm.status !== 'active';
      if (selectedDocFilter === 'EXTINTOR') return v.extinguisher.status !== 'active';
      if (selectedDocFilter === 'PLC') return v.plc.status !== 'active';
      return true;
    });
  }, [baseFilteredVehicles, selectedDocFilter]);

  // Auditoría Calibraciones
  const calStats = useMemo(() => {
    const periodCalibrations = calibrations.filter(c => {
      const cDate = new Date(c.calibrationDate);
      if (calViewMode === 'mensual') {
        return cDate.getMonth() === selectedCalMonth;
      } else {
        return extractNumber(getWeekNumber(cDate)) === selectedCalWeek;
      }
    });
    const vehiclesWithCal = new Set(periodCalibrations.map(c => normalizePlate(c.plate)));
    const totalFleet = baseFilteredVehicles.length;
    const calInFleet = baseFilteredVehicles.filter(v => vehiclesWithCal.has(normalizePlate(v.plate))).length;
    const percentage = totalFleet > 0 ? Math.round((calInFleet / totalFleet) * 100) : 0;
    return { totalFleet, calInFleet, pending: totalFleet - calInFleet, percentage, periodCalibrations, vehiclesWithCal };
  }, [calibrations, calViewMode, selectedCalMonth, selectedCalWeek, baseFilteredVehicles]);

  const pendingCalVehicles = useMemo(() => {
    return baseFilteredVehicles.filter(v => !calStats.vehiclesWithCal.has(normalizePlate(v.plate)));
  }, [baseFilteredVehicles, calStats.vehiclesWithCal]);

  const filteredCalibrations = useMemo(() => {
    return calStats.periodCalibrations.filter(c => {
      return normalizePlate(c.plate).includes(normalizePlate(searchTerm));
    }).sort((a, b) => new Date(b.calibrationDate).getTime() - new Date(a.calibrationDate).getTime());
  }, [calStats, searchTerm]);

  // Nueva lógica: Visitas a Taller con Revisión Semanal
  const workshopVisitsStats = useMemo(() => {
    const filteredVisits = workshopVisits.filter(v => {
      const vDate = new Date(v.date);
      const matchPeriod = workshopViewMode === 'mensual' 
        ? vDate.getMonth() === reportSelectedMonth 
        : extractNumber(v.week) === reportSelectedWeek;
      
      const matchCd = filterCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(filterCd);
      const matchStatus = reportStatusFilter === 'all' || v.status === reportStatusFilter;
      
      return matchPeriod && matchCd && matchStatus;
    });

    const totalVisits = filteredVisits.length;
    const doneVisits = filteredVisits.filter(v => v.status === 'CERRADO').length;
    const pendingVisits = totalVisits - doneVisits;
    const percentage = totalVisits > 0 ? Math.round((doneVisits / totalVisits) * 100) : 0;

    const workshopCounts: Record<string, number> = {};
    filteredVisits.forEach(v => {
      const ws = v.workshop || 'DESCONOCIDO';
      workshopCounts[ws] = (workshopCounts[ws] || 0) + 1;
    });

    const topWorkshop = Object.entries(workshopCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return { totalVisits, doneVisits, pendingVisits, percentage, topWorkshop, filteredVisits };
  }, [workshopVisits, reportSelectedMonth, reportSelectedWeek, workshopViewMode, filterCd, reportStatusFilter]);

  const finalFilteredVisits = useMemo(() => {
    return workshopVisitsStats.filteredVisits.filter(v => {
      return normalizePlate(v.plate).includes(normalizePlate(searchTerm));
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [workshopVisitsStats, searchTerm]);

  // Lógica DASHBOARD DE LAVADOS
  const washStats = useMemo(() => {
    const periodReports = washReports.filter(w => {
      const wDate = new Date(w.date);
      if (washViewMode === 'mensual') {
        return wDate.getMonth() === washSelectedMonth;
      } else {
        return extractNumber(w.week) === washSelectedWeek;
      }
    });

    const washedPlatesSet = new Set(periodReports.map(w => normalizePlate(w.plate)));
    const totalFleet = baseFilteredVehicles.length;
    const washedCountInFleet = baseFilteredVehicles.filter(v => washedPlatesSet.has(normalizePlate(v.plate))).length;
    const pendingCount = totalFleet - washedCountInFleet;
    const percentage = totalFleet > 0 ? Math.round((washedCountInFleet / totalFleet) * 100) : 0;

    return { totalFleet, washedCountInFleet, pendingCount, percentage, periodReports, washedPlatesSet };
  }, [washReports, baseFilteredVehicles, washViewMode, washSelectedMonth, washSelectedWeek]);

  const pendingWashVehicles = useMemo(() => {
    return baseFilteredVehicles.filter(v => !washStats.washedPlatesSet.has(normalizePlate(v.plate)));
  }, [baseFilteredVehicles, washStats.washedPlatesSet]);

  const finalFilteredWashes = useMemo(() => {
    if (washStatusFilter === 'pending') return [];
    return washStats.periodReports.filter(w => {
       return normalizePlate(w.plate).includes(normalizePlate(searchTerm));
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [washStats, washStatusFilter, searchTerm]);

  // NUEVA LÓGICA DASHBOARD DE NOVEDADES OPERATIVAS
  const reportStats = useMemo(() => {
    const periodReports = reports.filter(r => {
      const rDate = new Date(r.date);
      const matchPeriod = workshopViewMode === 'mensual' 
        ? rDate.getMonth() === reportSelectedMonth 
        : extractNumber(r.week || getWeekNumber(rDate)) === reportSelectedWeek;
      
      const matchCd = filterCd === 'all' || normalizeStr(r.cd || "") === normalizeStr(filterCd);
      return matchPeriod && matchCd;
    });

    const total = periodReports.length;
    const closed = periodReports.filter(r => r.status === 'CERRADO').length;
    const open = total - closed;
    const percentage = total > 0 ? Math.round((closed / total) * 100) : 0;

    return { total, closed, open, percentage, periodReports };
  }, [reports, workshopViewMode, reportSelectedMonth, reportSelectedWeek, filterCd]);

  const finalFilteredReports = useMemo(() => {
    return reportStats.periodReports.filter(r => {
      const matchStatus = reportStatusFilter === 'all' || r.status === reportStatusFilter;
      const matchSearch = normalizePlate(r.plate).includes(normalizePlate(searchTerm));
      return matchStatus && matchSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [reportStats, reportStatusFilter, searchTerm]);

  const uniqueCds = useMemo(() => Array.from(new Set(vehicles.map(v => v.cd || 'GENERAL'))).sort(), [vehicles]);
  const uniqueContractors = useMemo(() => {
    const filtered = filterCd === 'all' ? vehicles : vehicles.filter(v => normalizeStr(v.cd || "") === normalizeStr(filterCd));
    return Array.from(new Set(filtered.map(v => v.contractor || 'GENERAL'))).sort();
  }, [vehicles, filterCd]);

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
            <div className="p-3 bg-rose-50 rounded-xl text-white group-hover:bg-rose-600 transition-colors"><LogOut size={20}/></div>
            <span className="text-white font-black uppercase text-[10px] tracking-widest">SALIR</span>
          </div>
          <nav className="flex-grow space-y-4">
            {[
              { id: 'vehiculos', label: 'Vehículos', icon: <Shield size={18}/> },
              { id: 'conductores', label: 'Conductores', icon: <Users size={18}/> },
              { id: 'visitas', label: 'Visitas Taller', icon: <Store size={18}/> },
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
          
          {activeView === 'calibraciones' && (
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
                 <div>
                   <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                     <Disc size={32} className="text-indigo-600" /> Cumplimiento Calibración
                   </h2>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Monitoreo de presión y desgaste</p>
                 </div>
                 <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-4 bg-white px-6 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
                        <CalendarDays size={18} className="text-indigo-600" />
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">PERIODO</span>
                            <div className="flex items-center gap-2">
                                <select className="bg-transparent font-black text-slate-800 text-xs outline-none uppercase" value={calViewMode} onChange={(e) => setCalViewMode(e.target.value as any)}>
                                    <option value="semanal">SEMANA</option>
                                    <option value="mensual">MES</option>
                                </select>
                                <span className="text-slate-300 text-xs">|</span>
                                {calViewMode === 'semanal' ? (
                                    <select className="bg-transparent font-black text-slate-800 text-xs outline-none uppercase" value={selectedCalWeek} onChange={(e) => setSelectedCalWeek(parseInt(e.target.value))}>
                                        {Array.from({length: 52}, (_, i) => i + 1).map(w => <option key={w} value={w}>SEM {w}</option>)}
                                    </select>
                                ) : (
                                    <select className="bg-transparent font-black text-slate-800 text-xs outline-none uppercase" value={selectedCalMonth} onChange={(e) => setSelectedCalMonth(parseInt(e.target.value))}>
                                        {months.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}
                                    </select>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={() => { setPreSelectedCalPlate(null); setShowCalibrationForm(true); }} className="px-8 py-4 bg-indigo-600 text-white rounded-[2rem] text-[11px] font-black uppercase shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3">
                        <Plus size={20} /> REGISTRAR
                    </button>
                 </div>
              </div>

              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 items-center mb-8">
                 <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                       <Building2 size={12} className="text-indigo-600" /> Filtrar por CD
                    </label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-[11px] font-black uppercase outline-none appearance-none" value={filterCd} onChange={e => setFilterCd(e.target.value)}>
                      <option value="all">TODOS LOS CENTROS</option>
                      {uniqueCds.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
                 <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                       <UserCircle size={12} className="text-indigo-600" /> Filtrar por Contratista
                    </label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-[11px] font-black uppercase outline-none appearance-none" value={filterContractor} onChange={e => setFilterContractor(e.target.value)}>
                      <option value="all">TODOS LOS OPERADORES</option>
                      {uniqueContractors.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
              </div>

              {/* DASHBOARD CALIBRACIÓN */}
              <div className="bg-[#0f172a] rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden mb-10 border-b-[8px] border-indigo-500/20">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                  <div className="lg:col-span-3 flex items-center gap-5 border-r border-white/10 pr-6">
                    <div onClick={() => setCalStatusFilter('all')} className="relative flex items-center justify-center shrink-0 cursor-pointer group">
                       <svg className="w-24 h-24 transform -rotate-90 group-hover:scale-105 transition-transform">
                          <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
                          <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="6" fill="transparent" 
                                  strokeDasharray={263.89} 
                                  strokeDashoffset={263.89 - (263.89 * calStats.percentage) / 100}
                                  className="text-indigo-400 transition-all duration-1000 ease-out" 
                                  strokeLinecap="round" />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-xl font-black tracking-tighter leading-none">{calStats.percentage}%</span>
                       </div>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">EJECUCIÓN</p>
                        <p className="text-[10px] font-bold text-white/50">{calViewMode === 'semanal' ? `SEM ${selectedCalWeek}` : months[selectedCalMonth]}</p>
                    </div>
                  </div>

                  <div className="lg:col-span-9 grid grid-cols-2 md:grid-cols-4 gap-3">
                     {[
                       { id: 'all', label: 'TOTAL FILTRADO', count: calStats.totalFleet, icon: <Truck size={14}/>, color: 'indigo' },
                       { id: 'completed', label: 'CALIBRADOS', count: calStats.calInFleet, icon: <CheckCircle2 size={14}/>, color: 'emerald' },
                       { id: 'pending', label: 'PENDIENTES', count: calStats.pending, icon: <Clock size={14}/>, color: 'rose' },
                       { id: 'search', label: 'VER RESULTADOS', count: calStatusFilter === 'pending' ? pendingCalVehicles.length : filteredCalibrations.length, icon: <Search size={14}/>, color: 'slate' }
                     ].map(stat => (
                       <button key={stat.id} onClick={() => { if(stat.id !== 'search' && stat.id !== 'all') setCalStatusFilter(stat.id as any); else if(stat.id === 'all') setCalStatusFilter('all'); }} className={`p-4 rounded-2xl border transition-all flex items-center gap-3 text-left ${calStatusFilter === stat.id ? `bg-${stat.color}-600/90 border-${stat.color}-400 text-white shadow-lg` : 'bg-white/5 border-white/5 hover:border-white/20'}`}>
                         <div className={`p-2 rounded-xl shrink-0 ${calStatusFilter === stat.id ? 'bg-white/20' : `bg-${stat.color}-50/10 text-${stat.color}-400`}`}>
                            {stat.icon}
                         </div>
                         <div className="truncate">
                            <p className={`text-[7px] font-black uppercase tracking-widest truncate ${calStatusFilter === stat.id ? 'text-white/70' : 'text-slate-400'}`}>{stat.label}</p>
                            <p className="text-xl font-black leading-none mt-0.5">{stat.count}</p>
                         </div>
                       </button>
                     ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {calStatusFilter === 'pending' ? (
                    pendingCalVehicles.map(v => (
                        <div key={v.id} className="bg-white rounded-[2.5rem] border-2 border-dashed border-rose-200 p-8 flex flex-col items-center text-center shadow-xl">
                           <div className="p-5 bg-rose-50 rounded-full text-rose-500 mb-6"><AlertTriangle size={32} /></div>
                           <h3 className="text-4xl font-mono font-black text-slate-800 mb-2">{v.plate}</h3>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sin Calibración</p>
                           <p className="text-[9px] font-bold text-slate-300 uppercase mb-6">{v.cd} | {v.contractor}</p>
                           <button onClick={() => { setPreSelectedCalPlate(v.plate); setShowCalibrationForm(true); }} className="w-full py-4 bg-[#0f172a] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-2">
                             <Plus size={16} /> CALIBRAR AHORA
                           </button>
                        </div>
                    ))
                 ) : (
                    filteredCalibrations.map(c => <CalibrationCard key={c.id} calibration={c} onViewDoc={(url, t) => setViewDoc({url, title: t})} />)
                 )}
              </div>
            </div>
          )}

          {activeView === 'visitas' && (
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
                 <div>
                   <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                     <Store size={32} className="text-indigo-600" /> Visitas a Taller
                   </h2>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Gestión de Trámites Semanales (SOAT/RTM/EXT)</p>
                 </div>
                 <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-4 bg-white px-6 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
                        <Calendar size={18} className="text-indigo-600" />
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">PERIODO DE REVISIÓN</span>
                            <div className="flex items-center gap-2">
                                <select className="bg-transparent font-black text-slate-800 text-xs outline-none cursor-pointer uppercase" value={workshopViewMode} onChange={(e) => setWorkshopViewMode(e.target.value as any)}>
                                    <option value="semanal">SEMANA</option>
                                    <option value="mensual">MES</option>
                                </select>
                                <span className="text-slate-300 text-xs">|</span>
                                {workshopViewMode === 'semanal' ? (
                                    <select className="bg-transparent font-black text-slate-800 text-xs outline-none cursor-pointer uppercase" value={reportSelectedWeek} onChange={(e) => setReportSelectedWeek(parseInt(e.target.value))}>
                                        {Array.from({length: 52}, (_, i) => i + 1).map(w => <option key={w} value={w}>SEM {w}</option>)}
                                    </select>
                                ) : (
                                    <select className="bg-transparent font-black text-slate-800 text-xs outline-none cursor-pointer uppercase" value={reportSelectedMonth} onChange={(e) => setReportSelectedMonth(parseInt(e.target.value))}>
                                        {months.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}
                                    </select>
                                )}
                            </div>
                        </div>
                    </div>
                 </div>
              </div>

              {/* DASHBOARD DE CUMPLIMIENTO VISITAS - BOTOES DE FILTRO */}
              <div className="bg-[#0f172a] rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden mb-10 border-b-[8px] border-indigo-600/30">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                  <div className="lg:col-span-3 flex items-center gap-6 border-r border-white/10 pr-6">
                    <div className="relative flex items-center justify-center shrink-0">
                       <svg className="w-24 h-24 transform -rotate-90">
                          <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                          <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" 
                                  strokeDasharray={263.89} 
                                  strokeDashoffset={263.89 - (263.89 * workshopVisitsStats.percentage) / 100}
                                  className="text-emerald-400 transition-all duration-1000 ease-out" 
                                  strokeLinecap="round" />
                       </svg>
                       <div className="absolute inset-0 flex items-center justify-center font-black text-xl">
                          {workshopVisitsStats.percentage}%
                       </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">AVANCE TOTAL</p>
                        <p className="text-xs font-bold text-white/50">{workshopViewMode === 'semanal' ? `SEMANA ${reportSelectedWeek}` : months[reportSelectedMonth]}</p>
                    </div>
                  </div>

                  <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-3 gap-6">
                     <button 
                       onClick={() => setReportStatusFilter('all')}
                       className={`p-6 rounded-3xl border transition-all flex items-center gap-5 text-left group ${reportStatusFilter === 'all' ? 'bg-indigo-600 border-indigo-400 shadow-xl' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                     >
                        <div className={`p-4 rounded-2xl transition-colors ${reportStatusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-indigo-600/20 text-indigo-400 group-hover:bg-indigo-600/30'}`}><ClipboardList size={24} /></div>
                        <div>
                           <p className={`text-[9px] font-black uppercase tracking-widest ${reportStatusFilter === 'all' ? 'text-indigo-100' : 'text-indigo-300'}`}>PROGRAMADOS</p>
                           <p className="text-3xl font-black">{workshopVisitsStats.totalVisits}</p>
                        </div>
                     </button>
                     <button 
                       onClick={() => setReportStatusFilter('CERRADO')}
                       className={`p-6 rounded-3xl border transition-all flex items-center gap-5 text-left group ${reportStatusFilter === 'CERRADO' ? 'bg-emerald-600 border-emerald-400 shadow-xl' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                     >
                        <div className={`p-4 rounded-2xl transition-colors ${reportStatusFilter === 'CERRADO' ? 'bg-white/20 text-white' : 'bg-emerald-600/20 text-emerald-400 group-hover:bg-emerald-600/30'}`}><CheckCircle2 size={24} /></div>
                        <div>
                           <p className={`text-[9px] font-black uppercase tracking-widest ${reportStatusFilter === 'CERRADO' ? 'text-emerald-100' : 'text-emerald-300'}`}>COMPLETADOS</p>
                           <p className="text-3xl font-black">{workshopVisitsStats.doneVisits}</p>
                        </div>
                     </button>
                     <button 
                       onClick={() => setReportStatusFilter('ABIERTO')}
                       className={`p-6 rounded-3xl border transition-all flex items-center gap-5 text-left group ${reportStatusFilter === 'ABIERTO' ? 'bg-rose-600 border-rose-400 shadow-xl' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                     >
                        <div className={`p-4 rounded-2xl transition-colors ${reportStatusFilter === 'ABIERTO' ? 'bg-white/20 text-white' : 'bg-rose-600/20 text-rose-400 group-hover:bg-rose-600/30'}`}><Timer size={24} /></div>
                        <div>
                           <p className={`text-[9px] font-black uppercase tracking-widest ${reportStatusFilter === 'ABIERTO' ? 'text-rose-100' : 'text-rose-300'}`}>PENDIENTES</p>
                           <p className="text-3xl font-black">{workshopVisitsStats.pendingVisits}</p>
                        </div>
                     </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {finalFilteredVisits.length > 0 ? finalFilteredVisits.map((visit) => (
                  <div key={visit.id} className={`bg-white rounded-[2rem] border p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm hover:shadow-md transition-all group ${visit.status === 'CERRADO' ? 'border-emerald-100' : 'border-slate-100 border-l-[8px] border-l-rose-500'}`}>
                     <div className="flex items-center gap-6">
                        <div className={`px-6 py-4 rounded-2xl font-mono font-black text-2xl shadow-lg transition-colors ${visit.status === 'CERRADO' ? 'bg-emerald-600 text-white' : 'bg-[#0f172a] text-white'}`}>
                           {visit.plate}
                        </div>
                        <div>
                           <div className="flex items-center gap-2 text-indigo-600 mb-1">
                              <Store size={14} />
                              <p className="text-sm font-black uppercase tracking-tight">{visit.workshop || 'PENDIENTE TALLER'}</p>
                           </div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                              <Calendar size={12} /> PROGRAMADO: {formatDate(visit.date)} <span className="text-slate-300">|</span> SEMANA {visit.week}
                           </p>
                        </div>
                     </div>
                     <div className="flex items-center gap-8">
                        <div className="text-right">
                           <p className="text-[8px] font-black text-slate-300 uppercase mb-1">ESTADO REVISIÓN</p>
                           <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${visit.status === 'CERRADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700 animate-pulse'}`}>
                              {visit.status === 'CERRADO' ? 'COMPLETADO' : 'PENDIENTE'}
                           </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => visit.initialEvidence && setViewDoc({url: visit.initialEvidence, title: `Visita ${visit.plate}`})} className={`p-3 rounded-xl transition-all shadow-sm ${visit.initialEvidence ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white' : 'bg-slate-50 text-slate-300 cursor-not-allowed'}`} disabled={!visit.initialEvidence}>
                            <Eye size={20} />
                          </button>
                          {visit.status !== 'CERRADO' && (
                            <button onClick={() => setClosingWorkshopVisit(visit)} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm" title="Cerrar Programación">
                              <UserCheck size={20} />
                            </button>
                          )}
                        </div>
                     </div>
                  </div>
                )) : (
                  <div className="py-32 text-center flex flex-col items-center border-4 border-dashed border-slate-100 rounded-[3rem]">
                     <Box size={64} className="text-slate-200 mb-6" />
                     <p className="text-lg font-black text-slate-300 uppercase tracking-widest">Sin programaciones para este periodo</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'lavados' && (
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
                 <div>
                   <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
                     <Droplets size={40} className="text-cyan-500 fill-cyan-500/20" /> HISTORIAL DE LAVADOS
                   </h2>
                   <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">CUMPLIMIENTO DE HIGIENE Y LIMPIEZA</p>
                 </div>
                 <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm">
                        <CalendarDays size={20} className="text-cyan-600" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PERIODO SELECCIONADO</span>
                            <div className="flex items-center gap-2">
                                <select className="bg-transparent font-black text-slate-800 text-xs outline-none cursor-pointer uppercase" value={washViewMode} onChange={(e) => setWashViewMode(e.target.value as any)}>
                                    <option value="mensual">MENSUAL</option>
                                    <option value="semanal">SEMANAL</option>
                                </select>
                                <span className="text-slate-300 text-xs">|</span>
                                {washViewMode === 'semanal' ? (
                                    <select className="bg-transparent font-black text-slate-800 text-xs outline-none cursor-pointer uppercase" value={washSelectedWeek} onChange={(e) => setWashSelectedWeek(parseInt(e.target.value))}>
                                        {Array.from({length: 52}, (_, i) => i + 1).map(w => <option key={w} value={w}>SEM {w}</option>)}
                                    </select>
                                ) : (
                                    /* Fix: Updated setSelectedMonth to setWashSelectedMonth to resolve reference error */
                                    <select className="bg-transparent font-black text-slate-800 text-xs outline-none cursor-pointer uppercase" value={washSelectedMonth} onChange={(e) => setWashSelectedMonth(parseInt(e.target.value))}>
                                        {months.map((m, idx) => <option key={idx} value={idx}>{m} - 2025</option>)}
                                    </select>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={() => { setPreSelectedWashPlate(null); setShowWashForm(true); }} className="px-8 py-4 bg-cyan-600 text-white rounded-[2rem] text-[11px] font-black uppercase shadow-xl hover:bg-cyan-700 transition-all flex items-center gap-3 active:scale-95">
                        <Plus size={22} /> REGISTRAR LAVADO
                    </button>
                 </div>
              </div>

              <div className="bg-[#0f172a] rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden mb-12 border-b-[12px] border-cyan-500/20">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] -mr-48 -mt-48"></div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
                  <div className="lg:col-span-3 flex items-center gap-8 border-r border-white/10 pr-8">
                    <div className="relative flex items-center justify-center shrink-0">
                       <svg className="w-28 h-28 transform -rotate-90">
                          <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                          <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="8" fill="transparent" 
                                  strokeDasharray={301.59} 
                                  strokeDashoffset={301.59 - (301.59 * washStats.percentage) / 100}
                                  className="text-cyan-400 transition-all duration-1000 ease-out" 
                                  strokeLinecap="round" />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-black tracking-tighter leading-none">{washStats.percentage}%</span>
                       </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em] mb-1">CUMPLIMIENTO</p>
                        <p className="text-xs font-bold text-white/40 uppercase">{washViewMode === 'semanal' ? `SEMANA ${washSelectedWeek}` : months[washSelectedMonth]}</p>
                    </div>
                  </div>

                  <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-4 gap-4">
                     <button 
                       onClick={() => setWashStatusFilter('all')}
                       className={`p-6 rounded-[2.5rem] border transition-all flex items-center gap-4 text-left group ${washStatusFilter === 'all' ? 'bg-indigo-600 border-indigo-400 shadow-xl' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                     >
                        <div className={`p-3 rounded-xl transition-colors ${washStatusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/30'}`}><Truck size={20} /></div>
                        <div>
                           <p className={`text-[8px] font-black uppercase tracking-widest ${washStatusFilter === 'all' ? 'text-indigo-100' : 'text-slate-400'}`}>TOTAL FLOTA</p>
                           <p className="text-2xl font-black leading-none">{washStats.totalFleet}</p>
                        </div>
                     </button>
                     <button 
                       onClick={() => setWashStatusFilter('washed')}
                       className={`p-6 rounded-[2.5rem] border transition-all flex items-center gap-4 text-left group ${washStatusFilter === 'washed' ? 'bg-emerald-600 border-emerald-400 shadow-xl' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                     >
                        <div className={`p-3 rounded-xl transition-colors ${washStatusFilter === 'washed' ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30'}`}><CheckCircle2 size={20} /></div>
                        <div>
                           <p className={`text-[8px] font-black uppercase tracking-widest ${washStatusFilter === 'washed' ? 'text-emerald-100' : 'text-slate-400'}`}>LAVADOS</p>
                           <p className="text-2xl font-black leading-none">{washStats.washedCountInFleet}</p>
                        </div>
                     </button>
                     <button 
                       onClick={() => setWashStatusFilter('pending')}
                       className={`p-6 rounded-[2.5rem] border transition-all flex items-center gap-4 text-left group ${washStatusFilter === 'pending' ? 'bg-rose-600 border-rose-400 shadow-xl' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                     >
                        <div className={`p-3 rounded-xl transition-colors ${washStatusFilter === 'pending' ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-400 group-hover:bg-rose-500/30'}`}><Clock size={20} /></div>
                        <div>
                           <p className={`text-[8px] font-black uppercase tracking-widest ${washStatusFilter === 'pending' ? 'text-rose-100' : 'text-slate-400'}`}>PENDIENTES</p>
                           <p className="text-2xl font-black leading-none">{washStats.pendingCount}</p>
                        </div>
                     </button>
                     <div 
                       className={`p-6 rounded-[2.5rem] border bg-white/5 border-white/5 flex items-center gap-4 text-left`}
                     >
                        <div className={`p-3 rounded-xl bg-slate-500/20 text-slate-400`}><Search size={20} /></div>
                        <div>
                           <p className={`text-[8px] font-black uppercase tracking-widest text-slate-400`}>BÚSQUEDA</p>
                           <p className="text-2xl font-black leading-none">{washStatusFilter === 'pending' ? pendingWashVehicles.length : finalFilteredWashes.length}</p>
                        </div>
                     </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                 {washStatusFilter === 'pending' ? (
                    pendingWashVehicles.map(v => (
                       <div key={v.id} className="bg-white rounded-[3.5rem] border-2 border-dashed border-rose-200 p-10 flex flex-col items-center text-center shadow-xl animate-in zoom-in duration-500">
                          <div className="p-6 bg-rose-50 rounded-[2rem] text-rose-500 mb-8 border border-rose-100 shadow-inner">
                            <Droplets size={44} className="fill-rose-500/20" />
                          </div>
                          <h3 className="text-5xl font-mono font-black text-slate-900 mb-2 tracking-tighter">{v.plate}</h3>
                          <div className="space-y-1 mb-8">
                             <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em]">REQUERIDO LAVADO</p>
                             <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{v.cd} | {v.contractor}</p>
                          </div>
                          <button onClick={() => { setPreSelectedWashPlate(v.plate); setShowWashForm(true); }} className="w-full py-5 bg-[#0f172a] text-white rounded-[2rem] text-[11px] font-black uppercase tracking-widest hover:bg-cyan-600 transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95 group">
                             <Sparkles size={20} className="group-hover:rotate-12 transition-transform" /> REGISTRAR AHORA
                          </button>
                       </div>
                    ))
                 ) : (
                    finalFilteredWashes.length > 0 ? (
                        finalFilteredWashes.map(w => <WashCard key={w.id} report={w} onViewDoc={(url, t) => setViewDoc({url, title: t})} />)
                    ) : (
                        <div className="col-span-full py-40 text-center flex flex-col items-center border-[8px] border-dashed border-slate-50 rounded-[5rem]">
                           <div className="p-16 bg-slate-50 rounded-full mb-8 text-slate-200 shadow-inner">
                              <Droplets size={80} />
                           </div>
                           <h3 className="text-3xl font-black text-slate-300 uppercase tracking-tighter">SIN REGISTROS EN ESTE FILTRO</h3>
                           <p className="text-xs font-bold text-slate-400 uppercase mt-4 tracking-[0.4em]">Inicie un registro o cambie los parámetros del dashboard</p>
                        </div>
                    )
                 )}
              </div>
            </div>
          )}

          {activeView === 'novedades' && (
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
              {/* TITULO Y BOTON DE REGISTRO */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
                 <div>
                   <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
                     <ClipboardList size={40} className="text-indigo-600" /> GESTIÓN DE NOVEDADES
                   </h2>
                   <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">CONTROL MENSUAL DE OPERACIONES DE TALLER</p>
                 </div>
                 <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm">
                        <CalendarDays size={20} className="text-indigo-600" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PERIODO MENSUAL</span>
                            <div className="flex items-center gap-2">
                                <select className="bg-transparent font-black text-slate-800 text-xs outline-none cursor-pointer uppercase" value={workshopViewMode} onChange={(e) => setWorkshopViewMode(e.target.value as any)}>
                                    <option value="mensual">MENSUAL</option>
                                    <option value="semanal">SEMANAL</option>
                                </select>
                                <span className="text-slate-300 text-xs">|</span>
                                {workshopViewMode === 'semanal' ? (
                                    <select className="bg-transparent font-black text-slate-800 text-xs outline-none cursor-pointer uppercase" value={reportSelectedWeek} onChange={(e) => setReportSelectedWeek(parseInt(e.target.value))}>
                                        {Array.from({length: 52}, (_, i) => i + 1).map(w => <option key={w} value={w}>SEM {w}</option>)}
                                    </select>
                                ) : (
                                    <select className="bg-transparent font-black text-slate-800 text-xs outline-none cursor-pointer uppercase" value={reportSelectedMonth} onChange={(e) => setReportSelectedMonth(parseInt(e.target.value))}>
                                        {months.map((m, idx) => <option key={idx} value={idx}>{m} - 2025</option>)}
                                    </select>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setShowReportForm(true)} className="px-8 py-4 bg-indigo-600 text-white rounded-[2rem] text-[11px] font-black uppercase shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3 active:scale-95">
                        <Plus size={22} /> CREAR NOVEDAD
                    </button>
                 </div>
              </div>

              {/* DASHBOARD DE NOVEDADES - ESTILO REFERENCIA SOLICITADA */}
              <div className="bg-[#0f172a] rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden mb-12 border-b-[12px] border-indigo-500/20">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] -mr-48 -mt-48"></div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
                  
                  {/* PORCENTAJE CIRCULAR */}
                  <div className="lg:col-span-3 flex items-center gap-8 border-r border-white/10 pr-8">
                    <div className="relative flex items-center justify-center shrink-0">
                       <svg className="w-28 h-28 transform -rotate-90">
                          <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                          <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="8" fill="transparent" 
                                  strokeDasharray={301.59} 
                                  strokeDashoffset={301.59 - (301.59 * reportStats.percentage) / 100}
                                  className="text-emerald-400 duration-1000 ease-out" 
                                  strokeLinecap="round" />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-black tracking-tighter leading-none">{reportStats.percentage}%</span>
                       </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">CUMPLIMIENTO</p>
                        <p className="text-xs font-bold text-white/40 uppercase">{workshopViewMode === 'semanal' ? `SEMANA ${reportSelectedWeek}` : months[reportSelectedMonth]}</p>
                    </div>
                  </div>

                  {/* BOTOES DE FILTRO (BURBUJAS) */}
                  <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-4 gap-4">
                     <button 
                       onClick={() => setReportStatusFilter('all')}
                       className={`p-6 rounded-[2.5rem] border transition-all flex items-center gap-4 text-left group ${reportStatusFilter === 'all' ? 'bg-indigo-600 border-indigo-400 shadow-xl' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                     >
                        <div className={`p-3 rounded-xl transition-colors ${reportStatusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/30'}`}><ClipboardList size={20} /></div>
                        <div>
                           <p className={`text-[8px] font-black uppercase tracking-widest ${reportStatusFilter === 'all' ? 'text-indigo-100' : 'text-slate-400'}`}>TOTAL MES</p>
                           <p className="text-2xl font-black leading-none">{reportStats.total}</p>
                        </div>
                     </button>
                     <button 
                       onClick={() => setReportStatusFilter('CERRADO')}
                       className={`p-6 rounded-[2.5rem] border transition-all flex items-center gap-4 text-left group ${reportStatusFilter === 'CERRADO' ? 'bg-emerald-600 border-emerald-400 shadow-xl' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                     >
                        <div className={`p-3 rounded-xl transition-colors ${reportStatusFilter === 'CERRADO' ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30'}`}><CheckCircle2 size={20} /></div>
                        <div>
                           <p className={`text-[8px] font-black uppercase tracking-widest ${reportStatusFilter === 'CERRADO' ? 'text-emerald-100' : 'text-slate-400'}`}>GESTIONADOS</p>
                           <p className="text-2xl font-black leading-none">{reportStats.closed}</p>
                        </div>
                     </button>
                     <button 
                       onClick={() => setReportStatusFilter('ABIERTO')}
                       className={`p-6 rounded-[2.5rem] border transition-all flex items-center gap-4 text-left group ${reportStatusFilter === 'ABIERTO' ? 'bg-rose-600 border-rose-400 shadow-xl' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                     >
                        <div className={`p-3 rounded-xl transition-colors ${reportStatusFilter === 'ABIERTO' ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-400 group-hover:bg-rose-500/30'}`}><Wrench size={20} /></div>
                        <div>
                           <p className={`text-[8px] font-black uppercase tracking-widest ${reportStatusFilter === 'ABIERTO' ? 'text-rose-100' : 'text-slate-400'}`}>EN TALLER</p>
                           <p className="text-2xl font-black leading-none">{reportStats.open}</p>
                        </div>
                     </button>
                     <div 
                       className={`p-6 rounded-[2.5rem] border bg-white/5 border-white/5 flex items-center gap-4 text-left`}
                     >
                        <div className={`p-3 rounded-xl bg-slate-500/20 text-slate-400`}><Search size={20} /></div>
                        <div>
                           <p className={`text-[8px] font-black uppercase tracking-widest text-slate-400`}>BÚSQUEDA</p>
                           <p className="text-2xl font-black leading-none">{finalFilteredReports.length}</p>
                        </div>
                     </div>
                  </div>
                </div>
              </div>

              {/* LISTADO DE REPORTES - GRID ACTUALIZADO A 3 COLUMNAS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {finalFilteredReports.length > 0 ? (
                  finalFilteredReports.map(r => (
                    <ReportCard 
                      key={r.id} 
                      report={r} 
                      onViewDoc={(url, t) => setViewDoc({url, title: t})} 
                      onManageClosure={setClosingReport} 
                    />
                  ))
                ) : (
                  <div className="col-span-full py-40 text-center flex flex-col items-center border-[8px] border-dashed border-slate-50 rounded-[5rem]">
                     <div className="p-16 bg-slate-50 rounded-full mb-8 text-slate-200 shadow-inner">
                        <ClipboardList size={80} />
                     </div>
                     <h3 className="text-3xl font-black text-slate-300 uppercase tracking-tighter">SIN REGISTROS EN ESTE FILTRO</h3>
                     <p className="text-xs font-bold text-slate-400 uppercase mt-4 tracking-[0.4em]">Inicie un registro o cambie los parámetros del dashboard</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'vehiculos' && (
            <div className="max-w-7xl mx-auto space-y-10 pb-20">
              {/* BURBUJAS DE DOCUMENTOS */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-10">
                <button 
                  onClick={() => setSelectedDocFilter('all')}
                  className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-2 group relative overflow-hidden ${selectedDocFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
                >
                    <Truck size={20} className={selectedDocFilter === 'all' ? 'text-white' : 'text-indigo-600'} />
                    <div className="text-center">
                       <p className={`text-[9px] font-black uppercase tracking-widest ${selectedDocFilter === 'all' ? 'text-indigo-100' : 'text-slate-400'}`}>TOTAL FLOTA</p>
                       <p className="text-3xl font-black">{baseFilteredVehicles.length}</p>
                    </div>
                </button>
                <button 
                  onClick={() => setSelectedDocFilter('SOAT')}
                  className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-2 group relative overflow-hidden ${selectedDocFilter === 'SOAT' ? 'bg-rose-600 text-white border-rose-600 shadow-xl' : 'bg-white border-slate-100 hover:border-rose-200'}`}
                >
                    <Shield size={20} className={selectedDocFilter === 'SOAT' ? 'text-white' : 'text-rose-600'} />
                    <div className="text-center">
                       <p className={`text-[9px] font-black uppercase tracking-widest ${selectedDocFilter === 'SOAT' ? 'text-rose-100' : 'text-slate-400'}`}>VENCE SOAT</p>
                       <p className="text-3xl font-black">{baseFilteredVehicles.filter(v => v.soat.status !== 'active').length}</p>
                    </div>
                </button>
                <button 
                  onClick={() => setSelectedDocFilter('RTM')}
                  className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-2 group relative overflow-hidden ${selectedDocFilter === 'RTM' ? 'bg-amber-600 text-white border-amber-600 shadow-xl' : 'bg-white border-slate-100 hover:border-amber-200'}`}
                >
                    <Settings2 size={20} className={selectedDocFilter === 'RTM' ? 'text-white' : 'text-amber-600'} />
                    <div className="text-center">
                       <p className={`text-[9px] font-black uppercase tracking-widest ${selectedDocFilter === 'RTM' ? 'text-amber-100' : 'text-slate-400'}`}>VENCE RTM</p>
                       <p className="text-3xl font-black">{baseFilteredVehicles.filter(v => v.rtm.status !== 'active').length}</p>
                    </div>
                </button>
                <button 
                  onClick={() => setSelectedDocFilter('PLC')}
                  className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-2 group relative overflow-hidden ${selectedDocFilter === 'PLC' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
                >
                    <IdCard size={20} className={selectedDocFilter === 'PLC' ? 'text-white' : 'text-indigo-600'} />
                    <div className="text-center">
                       <p className={`text-[9px] font-black uppercase tracking-widest ${selectedDocFilter === 'PLC' ? 'text-indigo-100' : 'text-slate-400'}`}>VENCE PLC</p>
                       <p className="text-3xl font-black">{baseFilteredVehicles.filter(v => v.plc.status !== 'active').length}</p>
                    </div>
                </button>
                <button 
                  onClick={() => setSelectedDocFilter('EXTINTOR')}
                  className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-2 group relative overflow-hidden ${selectedDocFilter === 'EXTINTOR' ? 'bg-orange-600 text-white border-orange-600 shadow-xl' : 'bg-white border-slate-100 hover:border-orange-200'}`}
                >
                    <Flame size={20} className={selectedDocFilter === 'EXTINTOR' ? 'text-white' : 'text-orange-600'} />
                    <div className="text-center">
                       <p className={`text-[9px] font-black uppercase tracking-widest ${selectedDocFilter === 'EXTINTOR' ? 'text-orange-100' : 'text-slate-400'}`}>VENCE EXT</p>
                       <p className="text-3xl font-black">{baseFilteredVehicles.filter(v => v.extinguisher.status !== 'active').length}</p>
                    </div>
                </button>
              </div>

              {/* LISTA VEHICULOS */}
              <div className="space-y-12">
                {masterFleetFiltered.map(v => (
                  <div key={v.id} className="bg-white rounded-[3.5rem] border border-slate-200 shadow-2xl overflow-hidden transition-all hover:shadow-indigo-500/10">
                    <div className="flex flex-col lg:flex-row min-h-[500px]">
                      <div className="lg:w-[400px] bg-[#0f172a] p-12 flex flex-col items-center shrink-0 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        <div className="w-56 h-56 rounded-[3.5rem] border-[10px] border-white/10 shadow-2xl bg-slate-800 flex items-center justify-center">
                          <Truck size={100} className="text-slate-600" />
                        </div>
                        <div className="text-center mt-10 w-full z-10">
                          <div className="bg-white/5 px-8 py-5 rounded-[2rem] border border-white/10 shadow-2xl mb-8">
                              <h2 className="text-5xl font-mono font-black text-white tracking-tighter">{v.plate}</h2>
                          </div>
                          <div className="space-y-4 text-left">
                              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md transition-all hover:bg-white/10">
                                 <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Centro de Distribución</p>
                                 <p className="text-sm font-black text-white">{v.cd}</p>
                              </div>
                              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md transition-all hover:bg-white/10">
                                 <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Operador / Contratista</p>
                                 <p className="text-sm font-black text-white">{v.contractor}</p>
                              </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex-grow p-12 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <DocumentCard title="SOAT" doc={v.soat} icon={<Shield/>} onViewDoc={(url, t) => setViewDoc({url, title: `${v.plate} - ${t}`})} />
                           <DocumentCard title="RTM" doc={v.rtm} icon={<Settings2/>} onViewDoc={(url, t) => setViewDoc({url, title: `${v.plate} - ${t}`})} />
                           <DocumentCard title="PLC" doc={v.plc} icon={<IdCard/>} onViewDoc={(url, t) => setViewDoc({url, title: `${v.plate} - ${t}`})} />
                           <DocumentCard title="EXTINTOR" doc={v.extinguisher} icon={<Flame/>} onViewDoc={(url, t) => setViewDoc({url, title: `${v.plate} - ${t}`})} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === 'conductores' && <div className="space-y-8">{drivers.map(d => <DriverCard key={d.id} driver={d} onViewDoc={(url, t) => setViewDoc({url, title: t})} />)}</div>}
          {activeView === 'kilometrajes' && <MileageEntryForm vehicles={vehicles} mileageLogs={mileageLogs} onSubmit={submitMileageToSheet} externalCd={filterCd} setExternalCd={setFilterCd} externalContractor={filterContractor} setExternalContractor={setFilterContractor} searchTerm={searchTerm} setSearchTerm={setSearchTerm} statusFilter={mileageStatusFilter} setStatusFilter={setMileageStatusFilter} selectedWeek={selectedWeek} onWeekChange={setSelectedWeek} />}
          {activeView === 'fives' && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{fiveSReports.map(f => <FiveSCard key={f.id} report={f} onViewDoc={(url, t) => setViewDoc({url, title: t})} onManageClosure={setClosingFiveS} />)}</div>}
        </div>
      </main>

      {showReportForm && <ReportForm vehicles={vehicles} onClose={() => { setShowReportForm(false); handleSyncData(); }} onSubmit={submitReportToSheet} />}
      {showFiveSForm && <FiveSForm vehicles={vehicles} onClose={() => { setShowFiveSForm(false); handleSyncData(); }} onSubmit={submitFiveSToSheet} />}
      {showWashForm && <WashForm vehicles={vehicles} onClose={() => { setShowWashForm(false); handleSyncData(); }} onSubmit={submitWashToSheet} preSelectedPlate={preSelectedWashPlate || undefined} />}
      {showCalibrationForm && <CalibrationForm vehicles={vehicles} preSelectedPlate={preSelectedCalPlate || undefined} onClose={() => { setShowCalibrationForm(false); setPreSelectedCalPlate(null); handleSyncData(); }} onSubmit={submitCalibrationToSheet} />}
      {closingReport && <ClosureForm report={closingReport} onClose={() => { setClosingReport(null); handleSyncData(); }} onSubmit={(id, data) => submitReportToSheet({...closingReport, ...data} as any)} />}
      {closingFiveS && <FiveSClosureForm report={closingFiveS} onClose={() => { setClosingFiveS(null); handleSyncData(); }} onSubmit={(id, data) => submitFiveSToSheet({...closingFiveS, ...data} as any)} />}
      {closingWorkshopVisit && <WorkshopVisitClosureForm visit={closingWorkshopVisit} onClose={() => { setClosingWorkshopVisit(null); handleSyncData(); }} onSubmit={submitWorkshopVisitUpdateToSheet} />}
      {viewDoc && <DocumentViewer url={viewDoc.url} title={viewDoc.title} onClose={() => setViewDoc(null)} />}
    </div>
  );
};

export default App;
