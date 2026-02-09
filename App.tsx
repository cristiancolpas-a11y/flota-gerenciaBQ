
import React, { useState, useEffect, useMemo } from 'react';
import { Vehicle, Driver, Report, MileageLog, FiveSReport, Calibration, WashReport } from './types';
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

import { 
  fetchVehiclesFromSheet, 
  fetchDriversFromSheet, 
  fetchReportsFromSheet, 
  fetchFiveSReportsFromSheet, 
  fetchWashReportsFromSheet, 
  fetchCalibrationsFromSheet,
  fetchMileageLogsFromSheet,
  submitDocumentUpdateToSheet,
  submitReportToSheet,
  submitMileageToSheet,
  submitFiveSToSheet,
  submitCalibrationToSheet,
  submitWashToSheet
} from './services/sheetService';

import { formatDate, getWeekNumber, normalizePlate, calculateStatus, normalizeStr, extractNumber, getDaysDiff } from './utils';
import { 
  RefreshCw, Users, ClipboardList, Truck, X, Gauge, ShieldCheck, Search, Shield, Settings2, LogOut, FileText, Flame, Plus, Clock, Wrench, Key, Scale, LayoutDashboard, Menu, Disc, ChevronDown, ChevronRight, Briefcase, FilterX, Package, Box, AlertTriangle, Loader2, Info, Database, Percent, TrendingUp, CheckCircle2, Activity, Sparkles, Filter, Building2, UserCircle, CalendarDays, Droplets, Calendar, ShieldAlert, BarChart3, FileBadge, History, IdCard, ExternalLink, Hash, Eye, MapPin, Image as ImageIcon, CircleDot
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

type ActiveView = 'vehiculos' | 'conductores' | 'kilometrajes' | 'novedades' | 'fives' | 'lavados' | 'calibraciones';
type LegalFilterType = 'all' | 'healthy' | 'warning' | 'expired';

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<'camiones' | 'montacargas' | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('vehiculos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [legalStatusFilter, setLegalStatusFilter] = useState<LegalFilterType>('all');
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
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [viewDoc, setViewDoc] = useState<{ url: string, title: string } | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showFiveSForm, setShowFiveSForm] = useState(false);
  const [showWashForm, setShowWashForm] = useState(false);
  const [showCalibrationForm, setShowCalibrationForm] = useState(false);
  const [closingReport, setClosingReport] = useState<Report | null>(null);
  const [closingFiveS, setClosingFiveS] = useState<FiveSReport | null>(null);

  const [mileageStatusFilter, setMileageStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [selectedWeek, setSelectedWeek] = useState(getWeekNumber(new Date()));

  // Estados para Dashboard de Calibraciones
  const [calViewMode, setCalViewMode] = useState<'semanal' | 'mensual'>('mensual');
  const [selectedCalMonth, setSelectedCalMonth] = useState(new Date().getMonth());
  const [selectedCalWeek, setSelectedCalWeek] = useState(getWeekNumber(new Date()));
  const [calStatusFilter, setCalStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [preSelectedCalPlate, setPreSelectedCalPlate] = useState<string | null>(null);

  // Estados para Dashboard de Novedades
  const [reportSelectedMonth, setReportSelectedMonth] = useState(new Date().getMonth());
  const [reportStatusFilter, setReportStatusFilter] = useState<'all' | 'ABIERTO' | 'CERRADO'>('all');

  // Estados para Dashboard de Lavados
  const [washSelectedMonth, setWashSelectedMonth] = useState(new Date().getMonth());
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
        fetchMileageLogsFromSheet()
      ]);
      
      setRawVehicles(results[0].status === 'fulfilled' ? results[0].value : []);
      setDrivers(results[1].status === 'fulfilled' ? results[1].value : []);
      setReports(results[2].status === 'fulfilled' ? results[2].value : []);
      setFiveSReports(results[3].status === 'fulfilled' ? results[3].value : []);
      setWashReports(results[4].status === 'fulfilled' ? results[4].value : []);
      setCalibrations(results[5].status === 'fulfilled' ? results[5].value : []);
      setMileageLogs(results[6].status === 'fulfilled' ? results[6].value : []);
      
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

  // Lógica de Auditoría Novedades Mensual
  const reportStats = useMemo(() => {
    const monthReports = reports.filter(r => {
      const rDate = new Date(r.date);
      return rDate.getMonth() === reportSelectedMonth;
    });
    const total = monthReports.length;
    const closed = monthReports.filter(r => r.status === 'CERRADO').length;
    const open = total - closed;
    const percentage = total > 0 ? Math.round((closed / total) * 100) : 0;
    return { total, closed, open, percentage, monthReports };
  }, [reports, reportSelectedMonth]);

  const filteredReports = useMemo(() => {
    return reportStats.monthReports.filter(r => {
      const matchesStatus = reportStatusFilter === 'all' || r.status === reportStatusFilter;
      const matchesSearch = normalizePlate(r.plate).includes(normalizePlate(searchTerm));
      return matchesStatus && matchesSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [reportStats, reportStatusFilter, searchTerm]);

  // Lógica de Auditoría Lavados Mensual
  const washStats = useMemo(() => {
    const monthWashReports = washReports.filter(w => {
      const wDate = new Date(w.date);
      return wDate.getMonth() === washSelectedMonth;
    });

    const vehiclesWithWash = new Set(monthWashReports.map(w => normalizePlate(w.plate)));
    
    const totalFleet = baseFilteredVehicles.length;
    const washedInFleet = baseFilteredVehicles.filter(v => vehiclesWithWash.has(normalizePlate(v.plate))).length;
    
    const percentage = totalFleet > 0 ? Math.round((washedInFleet / totalFleet) * 100) : 0;
    
    return { totalFleet, washedInFleet, pending: totalFleet - washedInFleet, percentage, monthWashReports, vehiclesWithWash };
  }, [washReports, washSelectedMonth, baseFilteredVehicles]);

  const pendingWashVehicles = useMemo(() => {
    return baseFilteredVehicles.filter(v => !washStats.vehiclesWithWash.has(normalizePlate(v.plate)));
  }, [baseFilteredVehicles, washStats.vehiclesWithWash]);

  const filteredWashReports = useMemo(() => {
    return washStats.monthWashReports.filter(w => {
      return normalizePlate(w.plate).includes(normalizePlate(searchTerm));
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [washStats, searchTerm]);

  // LÓGICA DE AUDITORÍA DE CALIBRACIÓN POR VEHÍCULO
  const calComplianceData = useMemo(() => {
    return baseFilteredVehicles.map(v => {
      const p = normalizePlate(v.plate);
      // Buscar si este vehículo tiene una calibración en el periodo seleccionado
      const calibrationRecord = calibrations.find(c => {
        const cPlate = normalizePlate(c.plate);
        const cDate = new Date(c.calibrationDate);
        const matchesTime = calViewMode === 'semanal' 
          ? getWeekNumber(cDate) === selectedCalWeek 
          : cDate.getMonth() === selectedCalMonth;
        return cPlate === p && matchesTime;
      });

      return {
        vehicle: v,
        calibration: calibrationRecord || null,
        isCompleted: !!calibrationRecord
      };
    });
  }, [baseFilteredVehicles, calibrations, calViewMode, selectedCalMonth, selectedCalWeek]);

  const calStats = useMemo(() => {
    const total = calComplianceData.length;
    const completed = calComplianceData.filter(d => d.isCompleted).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending: total - completed, percentage };
  }, [calComplianceData]);

  const filteredCalCompliance = useMemo(() => {
    return calComplianceData.filter(d => {
      if (calStatusFilter === 'completed') return d.isCompleted;
      if (calStatusFilter === 'pending') return !d.isCompleted;
      return true;
    }).sort((a, b) => {
      // Mostrar primero los completados si estamos en vista 'all'
      if (calStatusFilter === 'all') {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? -1 : 1;
      }
      return a.vehicle.plate.localeCompare(b.vehicle.plate);
    });
  }, [calComplianceData, calStatusFilter]);

  const fleetStats = useMemo(() => {
    const list = baseFilteredVehicles;
    const total = list.length;
    let expiredCount = 0;
    let warningCount = 0;
    
    list.forEach(v => {
      const statuses = [v.soat?.status, v.rtm?.status, v.extinguisher?.status, v.plc?.status];
      if (statuses.some(s => s === 'expired')) expiredCount++;
      else if (statuses.some(s => s === 'warning')) warningCount++;
    });

    return { total, expiredCount, warningCount, healthyCount: total - expiredCount - warningCount };
  }, [baseFilteredVehicles]);

  const masterFleetFiltered = useMemo(() => {
    return baseFilteredVehicles.filter(v => {
      let matchesLegal = true;
      const statuses = [v.soat?.status, v.rtm?.status, v.extinguisher?.status, v.plc?.status];
      if (legalStatusFilter === 'expired') {
        matchesLegal = statuses.some(s => s === 'expired');
      } else if (legalStatusFilter === 'warning') {
        matchesLegal = !statuses.some(s => s === 'expired') && statuses.some(s => s === 'warning');
      } else if (legalStatusFilter === 'healthy') {
        matchesLegal = statuses.every(s => s === 'active');
      }
      return matchesLegal;
    });
  }, [baseFilteredVehicles, legalStatusFilter]);

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
            <div className="p-3 bg-rose-500 rounded-xl text-white group-hover:bg-rose-600 transition-colors"><LogOut size={20}/></div>
            <span className="text-white font-black uppercase text-[10px] tracking-widest">SALIR</span>
          </div>
          <nav className="flex-grow space-y-4">
            {[
              { id: 'vehiculos', label: 'Vehículos', icon: <Shield size={18}/> },
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
          
          {activeView === 'vehiculos' && (
            <div className="max-w-7xl mx-auto space-y-10 pb-20">
              {/* Estadísticas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                {[
                  { id: 'all', label: 'Total Flota', count: fleetStats.total, icon: <Truck size={24}/>, color: 'indigo' },
                  { id: 'healthy', label: 'Al Día', count: fleetStats.healthyCount, icon: <CheckCircle2 size={24}/>, color: 'emerald' },
                  { id: 'warning', label: 'Por Vencer', count: fleetStats.warningCount, icon: <AlertTriangle size={24}/>, color: 'amber' },
                  { id: 'expired', label: 'Vencidos', count: fleetStats.expiredCount, icon: <ShieldAlert size={24}/>, color: 'rose' }
                ].map(stat => (
                  <button 
                    key={stat.id}
                    onClick={() => setLegalStatusFilter(stat.id as LegalFilterType)}
                    className={`p-8 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 group relative overflow-hidden ${legalStatusFilter === stat.id ? `bg-${stat.color}-600 text-white border-${stat.color}-600 shadow-xl shadow-${stat.color}-600/20` : `bg-white border-slate-100 hover:border-${stat.color}-200`}`}
                  >
                    <div className={`p-4 rounded-2xl ${legalStatusFilter === stat.id ? 'bg-white/20' : `bg-${stat.color}-50 text-${stat.color}-600`}`}>
                       {stat.icon}
                    </div>
                    <div className="text-center">
                       <p className={`text-[10px] font-black uppercase tracking-widest ${legalStatusFilter === stat.id ? 'text-white/70' : 'text-slate-400'}`}>{stat.label}</p>
                       <p className="text-4xl font-black tracking-tighter">{stat.count}</p>
                    </div>
                    {legalStatusFilter === stat.id && <div className="absolute top-2 right-4"><CheckCircle2 size={16} /></div>}
                  </button>
                ))}
              </div>

              {/* Filtros */}
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                 <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                       <Building2 size={12} className="text-indigo-600" /> Centro de Distribución
                    </label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-[11px] font-black uppercase outline-none focus:border-indigo-500 appearance-none" value={filterCd} onChange={e => setFilterCd(e.target.value)}>
                      <option value="all">TODOS LOS CD</option>
                      {uniqueCds.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
                 <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                       <UserCircle size={12} className="text-indigo-600" /> Contratista / Operador
                    </label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-[11px] font-black uppercase outline-none focus:border-indigo-500 appearance-none" value={filterContractor} onChange={e => setFilterContractor(e.target.value)}>
                      <option value="all">TODOS LOS OPERADORES</option>
                      {uniqueContractors.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
              </div>

              {/* Grid de Vehículos tipo 'Expediente' */}
              <div className="space-y-12">
                {masterFleetFiltered.length > 0 ? masterFleetFiltered.map(v => {
                  const isCriticallyExpired = [v.soat?.status, v.rtm?.status, v.extinguisher?.status, v.plc?.status].some(s => s === 'expired');
                  return (
                    <div key={v.id} className="bg-white rounded-[3.5rem] border border-slate-200 shadow-2xl overflow-hidden transition-all hover:shadow-indigo-500/10 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
                      <div className="flex flex-col lg:flex-row min-h-[500px]">
                        <div className="lg:w-[400px] bg-[#0f172a] p-12 flex flex-col items-center shrink-0 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                          <div className="relative z-10">
                            <div className="w-56 h-56 rounded-[3.5rem] border-[10px] border-white/10 shadow-2xl overflow-hidden bg-slate-800 flex items-center justify-center relative group">
                              <Truck size={100} className="text-slate-600 group-hover:scale-110 transition-transform duration-500" />
                              <div className={`absolute bottom-4 right-4 p-2 rounded-xl shadow-lg border-2 border-white ${isCriticallyExpired ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                                 {isCriticallyExpired ? <ShieldAlert size={16} className="text-white" /> : <CheckCircle2 size={16} className="text-white" />}
                              </div>
                            </div>
                          </div>
                          <div className="text-center mt-10 w-full z-10">
                            <div className="bg-white/5 px-8 py-5 rounded-[2rem] border border-white/10 shadow-2xl mb-8 relative">
                                <h2 className="text-5xl font-mono font-black text-white tracking-tighter drop-shadow-md">{v.plate}</h2>
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-indigo-500 rounded-full"></div>
                            </div>
                            <div className="space-y-6 text-left">
                               {[
                                 { label: 'Centro de Distribución', value: v.cd || 'GENERAL', icon: <Building2 className="text-indigo-400" /> },
                                 { label: 'Contratista / Operador', value: v.contractor || 'GENERAL', icon: <UserCircle className="text-indigo-400" /> },
                                 { label: 'Kilometraje Actual', value: `${v.currentMileage?.toLocaleString() || '---'} KM`, icon: <Gauge className="text-indigo-400" />, isHighlight: true }
                               ].map((item, i) => (
                                 <div key={i} className="group/item p-4 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md transition-all hover:bg-white/10">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{item.icon} {item.label}</p>
                                    <p className={`text-xl font-black uppercase tracking-tight ${item.isHighlight ? 'text-indigo-400' : 'text-white'}`}>{item.value}</p>
                                    <div className="w-8 h-1 bg-white/10 mt-3 group-hover/item:w-full group-hover/item:bg-indigo-500 transition-all duration-500"></div>
                                 </div>
                               ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex-grow p-12 bg-white flex flex-col">
                           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-slate-100 pb-8">
                              <div>
                                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-3 mb-2">
                                   <History size={18} className="text-indigo-600" /> Expediente Vehicular
                                </h3>
                                <p className="text-xs font-bold text-slate-500">Sincronización: {formatDate(v.lastUpdate)}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                 {isCriticallyExpired ? (
                                   <span className="px-5 py-2 bg-rose-100 text-rose-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-200 shadow-sm flex items-center gap-2 animate-pulse">
                                      <AlertTriangle size={14} /> ATENCIÓN REQUERIDA
                                   </span>
                                 ) : (
                                   <span className="px-5 py-2 bg-emerald-100 text-emerald-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-200 shadow-sm flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div> DOCUMENTACIÓN AL DÍA
                                   </span>
                                 )}
                              </div>
                           </div>

                           <div className="mt-4">
                              <div className="flex items-center gap-4 mb-8">
                                <div className="h-[2px] flex-grow bg-slate-100"></div>
                                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.4em] flex items-center gap-3">
                                   <FileBadge size={20} className="text-indigo-600" /> Soportes Digitales (Legal / Seguimiento)
                                </h4>
                                <div className="h-[2px] flex-grow bg-slate-100"></div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <DocumentCard title="SOAT" doc={v.soat} icon={<Shield/>} onViewDoc={(url, t) => setViewDoc({url, title: `${v.plate} - ${t}`})} />
                                <DocumentCard title="RTM" doc={v.rtm} icon={<Settings2/>} onViewDoc={(url, t) => setViewDoc({url, title: `${v.plate} - ${t}`})} />
                                <DocumentCard title="PLC" doc={v.plc} icon={<IdCard/>} onViewDoc={(url, t) => setViewDoc({url, title: `${v.plate} - ${t}`})} />
                                <DocumentCard title="EXTINTOR" doc={v.extinguisher} icon={<Flame/>} onViewDoc={(url, t) => setViewDoc({url, title: `${v.plate} - ${t}`})} />
                              </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="col-span-full py-40 flex flex-col items-center justify-center text-slate-300">
                     <div className="p-10 bg-slate-50 rounded-full mb-6 border-2 border-dashed border-slate-100">
                        <FilterX size={64} className="opacity-20" />
                     </div>
                     <p className="text-[12px] font-black uppercase tracking-[0.4em]">Sin resultados para estos filtros</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeView === 'conductores' && <div className="space-y-8">{drivers.map(d => <DriverCard key={d.id} driver={d} onViewDoc={(url, t) => setViewDoc({url, title: t})} />)}</div>}
          
          {activeView === 'lavados' && (
             <div className="max-w-7xl mx-auto space-y-8 pb-20">
               {/* HEADER Y CONTROL DE LAVADOS */}
               <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                 <div>
                   <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                     <Droplets size={32} className="text-cyan-600" /> Historial de Lavados
                   </h2>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Cumplimiento de Higiene y Limpieza</p>
                 </div>
                 
                 <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-4 bg-white px-6 py-2.5 rounded-2xl border border-slate-200 shadow-sm group hover:border-cyan-300 transition-all">
                        <Calendar size={18} className="text-cyan-600" />
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">PERIODO MENSUAL</span>
                            <select 
                                className="bg-transparent font-black text-slate-800 text-xs outline-none cursor-pointer uppercase"
                                value={washSelectedMonth}
                                onChange={(e) => setWashSelectedMonth(parseInt(e.target.value))}
                            >
                                {months.map((m, idx) => (
                                    <option key={idx} value={idx}>{m} - 2025</option>
                                ))}
                            </select>
                        </div>
                        <ChevronDown size={14} className="text-slate-400 ml-1" />
                    </div>
                    
                    <button onClick={() => { setPreSelectedWashPlate(null); setShowWashForm(true); }} className="px-8 py-4 bg-cyan-600 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-cyan-700 transition-all flex items-center gap-3 active:scale-95 group">
                        <Plus size={20} className="group-hover:rotate-90 transition-transform" /> REGISTRAR LAVADO
                    </button>
                 </div>
               </div>

               {/* DASHBOARD COMPACTO DE LAVADOS INTERACTIVO */}
               <div className="bg-[#0f172a] rounded-[3rem] p-6 text-white shadow-2xl relative overflow-hidden mb-10 border-b-[8px] border-cyan-500/20">
                <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                  
                  {/* Porcentaje Circular */}
                  <div className="lg:col-span-3 flex items-center gap-5 border-r border-white/10 pr-6">
                    <div 
                        onClick={() => setWashStatusFilter('all')}
                        className="relative flex items-center justify-center shrink-0 cursor-pointer group"
                    >
                       <svg className="w-24 h-24 transform -rotate-90 group-hover:scale-105 transition-transform">
                          <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
                          <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="6" fill="transparent" 
                                  strokeDasharray={263.89} 
                                  strokeDashoffset={263.89 - (263.89 * washStats.percentage) / 100}
                                  className="text-cyan-400 transition-all duration-1000 ease-out" 
                                  strokeLinecap="round" />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-xl font-black tracking-tighter leading-none">{washStats.percentage}%</span>
                       </div>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">CUMPLIMIENTO</p>
                        <p className="text-[10px] font-bold text-white/50">{months[washSelectedMonth]}</p>
                    </div>
                  </div>

                  {/* Burbujas de Estadísticas Pequeñas */}
                  <div className="lg:col-span-9 grid grid-cols-2 md:grid-cols-4 gap-3">
                     {[
                       { id: 'all', label: 'TOTAL FLOTA', count: washStats.totalFleet, icon: <Truck size={14}/>, color: 'indigo' },
                       { id: 'washed', label: 'LAVADOS', count: washStats.washedInFleet, icon: <CheckCircle2 size={14}/>, color: 'emerald' },
                       { id: 'pending', label: 'PENDIENTES', count: washStats.pending, icon: <Clock size={14}/>, color: 'rose' },
                       { id: 'search', label: 'BÚSQUEDA', count: washStatusFilter === 'pending' ? pendingWashVehicles.length : filteredWashReports.length, icon: <Search size={14}/>, color: 'slate' }
                     ].map(stat => (
                       <button 
                         key={stat.id}
                         onClick={() => { if(stat.id !== 'search' && stat.id !== 'all') setWashStatusFilter(stat.id as any); else if(stat.id === 'all') setWashStatusFilter('all'); }}
                         className={`p-3 rounded-2xl border transition-all flex items-center gap-3 text-left ${washStatusFilter === stat.id ? `bg-${stat.color}-600/90 border-${stat.color}-400 text-white shadow-lg` : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                       >
                         <div className={`p-2 rounded-xl shrink-0 ${washStatusFilter === stat.id ? 'bg-white/20' : `bg-${stat.color}-500/10 text-${stat.color}-400`}`}>
                            {stat.icon}
                         </div>
                         <div className="truncate">
                            <p className={`text-[7px] font-black uppercase tracking-widest truncate ${washStatusFilter === stat.id ? 'text-white/70' : 'text-slate-400'}`}>{stat.label}</p>
                            <p className="text-lg font-black leading-none mt-0.5">{stat.count}</p>
                         </div>
                       </button>
                     ))}
                  </div>
                </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {/* SI EL FILTRO ES PENDIENTES, MOSTRAR VEHÍCULOS QUE FALTAN */}
                 {washStatusFilter === 'pending' ? (
                    pendingWashVehicles.length > 0 ? pendingWashVehicles.map(v => (
                        <div key={v.id} className="bg-white rounded-[2.5rem] border-2 border-dashed border-rose-200 p-8 flex flex-col items-center text-center shadow-xl animate-in zoom-in duration-300">
                           <div className="p-5 bg-rose-50 rounded-full text-rose-500 mb-6">
                              <AlertTriangle size={32} />
                           </div>
                           <h3 className="text-4xl font-mono font-black text-slate-800 mb-2">{v.plate}</h3>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Falta Lavado Mes {months[washSelectedMonth]}</p>
                           
                           <div className="w-full space-y-3 mb-8">
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 px-2 uppercase">
                                 <span>CD:</span>
                                 <span className="text-slate-800">{v.cd || 'GENERAL'}</span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 px-2 uppercase">
                                 <span>Operador:</span>
                                 <span className="text-slate-800 truncate max-w-[150px]">{v.contractor || 'GENERAL'}</span>
                              </div>
                           </div>

                           <button 
                             onClick={() => {
                                setPreSelectedWashPlate(v.plate);
                                setShowWashForm(true);
                             }}
                             className="w-full py-4 bg-[#0f172a] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-cyan-600 transition-all flex items-center justify-center gap-2"
                           >
                             <Plus size={16} /> REGISTRAR AHORA
                           </button>
                        </div>
                    )) : (
                        <div className="col-span-full py-40 flex flex-col items-center justify-center text-slate-300">
                            <div className="p-10 bg-emerald-50 rounded-full mb-6 border-2 border-dashed border-emerald-100">
                                <CheckCircle2 size={64} className="text-emerald-500" />
                            </div>
                            <p className="text-[12px] font-black uppercase tracking-[0.4em]">¡Flota completa al 100%!</p>
                        </div>
                    )
                 ) : (
                    /* VISTA NORMAL DE REPORTES (LAVADOS REALIZADOS) */
                    filteredWashReports.length > 0 ? filteredWashReports.map(w => (
                      <WashCard key={w.id} report={w} onViewDoc={(url, t) => setViewDoc({url, title: t})} />
                    )) : (
                      <div className="col-span-full py-40 flex flex-col items-center justify-center text-slate-300">
                         <div className="p-10 bg-slate-50 rounded-full mb-6 border-2 border-dashed border-slate-100">
                            <FilterX size={64} className="opacity-20" />
                         </div>
                         <p className="text-[12px] font-black uppercase tracking-[0.4em]">Sin registros de lavado este mes</p>
                         <button onClick={() => setWashStatusFilter('pending')} className="mt-4 text-rose-500 text-[10px] font-black uppercase underline tracking-widest">Ver vehículos pendientes</button>
                      </div>
                    )
                 )}
               </div>
             </div>
          )}

          {activeView === 'fives' && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
               <div className="col-span-full flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Auditorías 5S Camiones</h2>
                 <button onClick={() => setShowFiveSForm(true)} className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2">
                   <Plus size={16} /> NUEVA AUDITORÍA
                 </button>
               </div>
               {fiveSReports.filter(f => normalizePlate(f.plate).includes(normalizePlate(searchTerm))).map(f => (
                 <FiveSCard key={f.id} report={f} onViewDoc={(url, t) => setViewDoc({url, title: t})} onManageClosure={setClosingFiveS} />
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
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
              {/* HEADER Y CONTROL DE NOVEDADES */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                 <div>
                   <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                     <ClipboardList size={32} className="text-indigo-600" /> Gestión de Novedades
                   </h2>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Control Mensual de Operaciones de Taller</p>
                 </div>
                 
                 <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-4 bg-white px-6 py-2.5 rounded-2xl border border-slate-200 shadow-sm group hover:border-indigo-300 transition-all">
                        <Calendar size={18} className="text-indigo-600" />
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">PERIODO MENSUAL</span>
                            <select 
                                className="bg-transparent font-black text-slate-800 text-xs outline-none cursor-pointer uppercase"
                                value={reportSelectedMonth}
                                onChange={(e) => setReportSelectedMonth(parseInt(e.target.value))}
                            >
                                {months.map((m, idx) => (
                                    <option key={idx} value={idx}>{m} - 2025</option>
                                ))}
                            </select>
                        </div>
                        <ChevronDown size={14} className="text-slate-400 ml-1" />
                    </div>
                    
                    <button onClick={() => setShowReportForm(true)} className="px-8 py-4 bg-indigo-600 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3 active:scale-95 group">
                        <Plus size={20} className="group-hover:rotate-90 transition-transform" /> CREAR NOVEDAD
                    </button>
                 </div>
              </div>

              {/* DASHBOARD COMPACTO DE NOVEDADES */}
              <div className="bg-[#0f172a] rounded-[3rem] p-6 text-white shadow-2xl relative overflow-hidden mb-10 border-b-[8px] border-indigo-500/20">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                  
                  {/* Porcentaje Circular Pequeño */}
                  <div className="lg:col-span-3 flex items-center gap-5 border-r border-white/10 pr-6">
                    <div 
                        onClick={() => setReportStatusFilter('all')}
                        className="relative flex items-center justify-center shrink-0 cursor-pointer group"
                    >
                       <svg className="w-20 h-20 transform -rotate-90 group-hover:scale-105 transition-transform">
                          <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
                          <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="6" fill="transparent" 
                                  strokeDasharray={213.63} 
                                  strokeDashoffset={213.63 - (213.63 * reportStats.percentage) / 100}
                                  className="text-emerald-500 transition-all duration-1000 ease-out" 
                                  strokeLinecap="round" />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-xl font-black tracking-tighter leading-none">{reportStats.percentage}%</span>
                       </div>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">CUMPLIMIENTO</p>
                        <p className="text-[10px] font-bold text-white/50">{months[reportSelectedMonth]}</p>
                    </div>
                  </div>

                  {/* Burbujas de Estadísticas Pequeñas */}
                  <div className="lg:col-span-9 grid grid-cols-2 md:grid-cols-4 gap-3">
                     {[
                       { id: 'all', label: 'TOTAL MES', count: reportStats.total, icon: <ClipboardList size={14}/>, color: 'indigo' },
                       { id: 'CERRADO', label: 'GESTIONADOS', count: reportStats.closed, icon: <CheckCircle2 size={14}/>, color: 'emerald' },
                       { id: 'ABIERTO', label: 'EN TALLER', count: reportStats.open, icon: <Clock size={14}/>, color: 'amber' },
                       { id: 'filtered', label: 'BÚSQUEDA', count: filteredReports.length, icon: <Search size={14}/>, color: 'slate' }
                     ].map(stat => (
                       <button 
                         key={stat.id}
                         onClick={() => { if(stat.id !== 'filtered') setReportStatusFilter(stat.id as any); }}
                         className={`p-3 rounded-2xl border transition-all flex items-center gap-3 text-left ${reportStatusFilter === stat.id ? `bg-${stat.color}-600/90 border-${stat.color}-400 text-white shadow-lg` : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                       >
                         <div className={`p-2 rounded-xl shrink-0 ${reportStatusFilter === stat.id ? 'bg-white/20' : `bg-${stat.color}-50/10 text-${stat.color}-400`}`}>
                            {stat.icon}
                         </div>
                         <div className="truncate">
                            <p className={`text-[7px] font-black uppercase tracking-widest truncate ${reportStatusFilter === stat.id ? 'text-white/70' : 'text-slate-400'}`}>{stat.label}</p>
                            <p className="text-lg font-black leading-none mt-0.5">{stat.count}</p>
                         </div>
                       </button>
                     ))}
                  </div>
                </div>
              </div>

              {/* LISTA DE NOVEDADES FILTRADA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredReports.length > 0 ? filteredReports.map(r => (
                  <ReportCard 
                    key={r.id} 
                    report={r} 
                    onViewDoc={(url, t) => setViewDoc({url, title: t})} 
                    onManageClosure={setClosingReport} 
                  />
                )) : (
                  <div className="col-span-full py-40 flex flex-col items-center justify-center text-slate-300">
                     <div className="p-10 bg-slate-50 rounded-full mb-6 border-2 border-dashed border-slate-100">
                        <FilterX size={64} className="opacity-20" />
                     </div>
                     <p className="text-[12px] font-black uppercase tracking-[0.4em]">Sin novedades para este periodo</p>
                     <button onClick={() => setReportStatusFilter('all')} className="mt-4 text-indigo-600 text-[10px] font-black uppercase underline tracking-widest">Ver todo el mes</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'calibraciones' && (
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
              {/* HEADER DE CONTROL */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
                 <div>
                   <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                     <Disc size={32} className="text-indigo-600" /> Auditoría de Calibraciones
                   </h2>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Cumplimiento de Mantenimiento de Neumáticos</p>
                 </div>
                 
                 <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-4 bg-white px-6 py-2.5 rounded-2xl border border-slate-200 shadow-sm group hover:border-indigo-300 transition-all">
                        <CalendarDays size={18} className="text-indigo-600" />
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">PERIODO DE AUDITORÍA</span>
                            <div className="flex items-center gap-2">
                                <select 
                                    className="bg-transparent font-black text-slate-800 text-xs outline-none cursor-pointer uppercase"
                                    value={calViewMode}
                                    onChange={(e) => setCalViewMode(e.target.value as any)}
                                >
                                    <option value="semanal">SEMANA</option>
                                    <option value="mensual">MES</option>
                                </select>
                                <span className="text-slate-300 text-xs">|</span>
                                {calViewMode === 'semanal' ? (
                                    <select 
                                        className="bg-transparent font-black text-slate-800 text-xs outline-none cursor-pointer uppercase"
                                        value={selectedCalWeek}
                                        onChange={(e) => setSelectedCalWeek(parseInt(e.target.value))}
                                    >
                                        {Array.from({length: 52}, (_, i) => i + 1).map(w => (
                                            <option key={w} value={w}>{w} - 2025</option>
                                        ))}
                                    </select>
                                ) : (
                                    <select 
                                        className="bg-transparent font-black text-slate-800 text-xs outline-none cursor-pointer uppercase"
                                        value={selectedCalMonth}
                                        onChange={(e) => setSelectedCalMonth(parseInt(e.target.value))}
                                    >
                                        {months.map((m, idx) => (
                                            <option key={idx} value={idx}>{m}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>
                        <ChevronDown size={14} className="text-slate-400 ml-1" />
                    </div>
                    
                    <button onClick={() => { setPreSelectedCalPlate(null); setShowCalibrationForm(true); }} className="px-8 py-4 bg-indigo-600 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3 active:scale-95 group">
                        <Plus size={20} className="group-hover:rotate-90 transition-transform" /> REGISTRAR CALIBRACIÓN
                    </button>
                 </div>
              </div>

              {/* DASHBOARD DE CUMPLIMIENTO INTERACTIVO */}
              <div className="bg-[#0f172a] rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border-b-[12px] border-indigo-600/30 mb-10">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-40 -mt-40"></div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
                  
                  {/* PORCENTAJE (Botón Reset) */}
                  <div className="lg:col-span-4 flex flex-col items-center justify-center border-r border-white/10 pr-10">
                    <button 
                        onClick={() => setCalStatusFilter('all')}
                        className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-8 text-center flex items-center gap-2 hover:text-white transition-colors"
                    >
                       <TrendingUp size={14}/> CUMPLIMIENTO {calViewMode === 'semanal' ? `W${selectedCalWeek}` : months[selectedCalMonth]}
                    </button>
                    
                    <div 
                        onClick={() => setCalStatusFilter('all')}
                        className="relative flex items-center justify-center mb-8 cursor-pointer group"
                    >
                       <svg className="w-48 h-48 transform -rotate-90 group-hover:scale-105 transition-transform">
                          <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
                          <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" 
                                  strokeDasharray={552.92} 
                                  strokeDashoffset={552.92 - (552.92 * calStats.percentage) / 100}
                                  className="text-indigo-500 transition-all duration-1000 ease-out" 
                                  strokeLinecap="round" />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-7xl font-black tracking-tighter leading-none">{calStats.percentage}</span>
                          <span className="text-xl font-black text-indigo-400 mt-1">%</span>
                       </div>
                    </div>

                    <div className="w-full flex justify-between gap-4">
                        <button 
                            onClick={() => setCalStatusFilter('completed')}
                            className={`flex-1 p-4 rounded-[1.5rem] border transition-all text-center ${calStatusFilter === 'completed' ? 'bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/20' : 'bg-white/5 border-white/5 hover:border-emerald-500/30'}`}
                        >
                            <p className={`text-[8px] font-black uppercase tracking-widest ${calStatusFilter === 'completed' ? 'text-white' : 'text-emerald-400'}`}>CALIBRADOS</p>
                            <p className="text-2xl font-black mt-1">{calStats.completed}</p>
                        </button>
                        <button 
                            onClick={() => setCalStatusFilter('pending')}
                            className={`flex-1 p-4 rounded-[1.5rem] border transition-all text-center ${calStatusFilter === 'pending' ? 'bg-rose-500 border-rose-400 shadow-lg shadow-rose-500/20' : 'bg-white/5 border-white/5 hover:border-rose-500/30'}`}
                        >
                            <p className={`text-[8px] font-black uppercase tracking-widest ${calStatusFilter === 'pending' ? 'text-white' : 'text-rose-400'}`}>PENDIENTES</p>
                            <p className="text-2xl font-black mt-1">{calStats.pending}</p>
                        </button>
                    </div>
                  </div>

                  <div className="lg:col-span-8 flex flex-col justify-center gap-8">
                     <div className="flex items-center gap-3">
                        <Filter size={18} className="text-indigo-400" />
                        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/50">Panel de Auditoría de Neumáticos</span>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 backdrop-blur-md">
                           <p className="text-[9px] font-black text-indigo-400 uppercase mb-4 flex items-center gap-2"><Building2 size={14}/> FILTRADO POR C.D.</p>
                           <div className="relative">
                                <select className="bg-[#1e293b] text-white text-[11px] font-black w-full px-5 py-3.5 rounded-2xl outline-none appearance-none border border-white/10" value={filterCd} onChange={e => setFilterCd(e.target.value)}>
                                    <option value="all">TODOS LOS CD</option>
                                    {uniqueCds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" size={16} />
                           </div>
                        </div>
                        <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 backdrop-blur-md">
                           <p className="text-[9px] font-black text-indigo-400 uppercase mb-4 flex items-center gap-2"><UserCircle size={14}/> OPERADOR RESPONSABLE</p>
                           <div className="relative">
                                <select className="bg-[#1e293b] text-white text-[11px] font-black w-full px-5 py-3.5 rounded-2xl outline-none appearance-none border border-white/10" value={filterContractor} onChange={e => setFilterContractor(e.target.value)}>
                                    <option value="all">TODOS LOS OPERADORES</option>
                                    {uniqueContractors.map(cnt => <option key={cnt} value={cnt}>{cnt}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" size={16} />
                           </div>
                        </div>
                     </div>
                  </div>
                </div>
              </div>

              {/* TABLA DE AUDITORÍA FLOTA */}
              <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
                <div className="hidden lg:grid grid-cols-7 gap-6 px-10 py-6 bg-slate-50 border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">
                  <span className="col-span-1">MES / FECHA</span>
                  <span className="col-span-1 text-center">SEMANA</span>
                  <span className="col-span-1 text-center">PLACA</span>
                  <span className="col-span-1 text-center">C.D.</span>
                  <span className="col-span-1">TALLER / ENTIDAD</span>
                  <span className="col-span-1 text-center">ESTADO</span>
                  <span className="col-span-1 text-right">EVIDENCIA</span>
                </div>

                <div className="divide-y divide-slate-50">
                  {filteredCalCompliance.length > 0 ? 
                   filteredCalCompliance.map((item, idx) => {
                    const { vehicle, calibration, isCompleted } = item;
                    const cDate = calibration ? new Date(calibration.calibrationDate) : null;
                    
                    return (
                      <div key={idx} className={`grid grid-cols-2 lg:grid-cols-7 items-center gap-6 px-10 py-8 transition-colors group ${!isCompleted ? 'bg-rose-50/20' : 'hover:bg-slate-50/50'}`}>
                        
                        <div className="col-span-1 flex items-center gap-4">
                           <div className={`w-1.5 h-10 rounded-full transition-colors ${isCompleted ? 'bg-emerald-100 group-hover:bg-emerald-500' : 'bg-rose-200 group-hover:bg-rose-500'}`}></div>
                           <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                                {cDate ? months[cDate.getMonth()] : months[selectedCalMonth]}
                              </p>
                              <p className={`text-sm font-black uppercase ${isCompleted ? 'text-slate-800' : 'text-rose-400'}`}>
                                {cDate ? formatDate(calibration!.calibrationDate) : 'SIN REPORTE'}
                              </p>
                           </div>
                        </div>

                        <div className="col-span-1 text-center hidden lg:block">
                           <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black border transition-all ${isCompleted ? 'bg-white text-slate-600 border-slate-200' : 'bg-rose-50 text-rose-300 border-rose-100'}`}>
                             SEMANA {cDate ? getWeekNumber(cDate) : '--'}
                           </span>
                        </div>

                        <div className="col-span-1 flex justify-center">
                           {isCompleted ? (
                             <div className="bg-[#0f172a] px-6 py-2.5 rounded-2xl text-white font-mono font-black text-xl tracking-wider shadow-lg group-hover:bg-indigo-600 transition-all">
                                {vehicle.plate}
                             </div>
                           ) : (
                             <button 
                               onClick={() => {
                                 setPreSelectedCalPlate(vehicle.plate);
                                 setShowCalibrationForm(true);
                               }}
                               className="bg-white text-slate-400 border-2 border-slate-200 border-dashed px-6 py-2.5 rounded-2xl font-mono font-black text-xl tracking-wider shadow-sm hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95 group/btn relative"
                             >
                                {vehicle.plate}
                                <div className="absolute -top-2 -right-2 bg-indigo-600 text-white p-1 rounded-full opacity-0 group-hover/btn:opacity-100 transition-opacity">
                                  <Plus size={10} />
                                </div>
                             </button>
                           )}
                        </div>

                        <div className="col-span-1 text-center hidden lg:block">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                              <MapPin size={12} className="text-indigo-400" /> {vehicle.cd || 'BQA'}
                           </span>
                        </div>

                        <div className="col-span-1 hidden lg:block">
                           <p className={`text-[10px] font-black uppercase truncate leading-none ${isCompleted ? 'text-slate-800' : 'text-slate-300 italic'}`}>
                              {calibration?.equipment || 'PENDIENTE DE ASIGNACIÓN'}
                           </p>
                        </div>

                        <div className="col-span-1 flex justify-center">
                           <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border shadow-sm ${isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-100 text-rose-700 border-rose-200 animate-pulse'}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                              {isCompleted ? 'CALIBRADO' : 'FALTANTE'}
                           </div>
                        </div>

                        <div className="col-span-1 flex justify-end">
                          {calibration?.certificateUrl ? (
                            <button 
                              onClick={() => setViewDoc({ url: calibration.certificateUrl!, title: `${vehicle.plate} - Calibración` })}
                              className="p-3 bg-white text-indigo-600 rounded-2xl border-2 border-slate-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm active:scale-90"
                              title="Ver Certificado de Calibración"
                            >
                               <Eye size={20} />
                            </button>
                          ) : (
                            <div className="p-3 bg-slate-50 text-slate-200 rounded-2xl border-2 border-dashed border-slate-100">
                               <ImageIcon size={20} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="py-40 text-center flex flex-col items-center">
                       <div className="p-10 bg-slate-50 rounded-full mb-8 border-4 border-dashed border-slate-100">
                          <FilterX size={64} className="text-slate-200" />
                       </div>
                       <p className="text-sm font-black text-slate-300 uppercase tracking-[0.4em]">Sin registros que coincidan con el filtro</p>
                       <button onClick={() => setCalStatusFilter('all')} className="mt-6 text-indigo-600 text-[10px] font-black uppercase underline tracking-widest">Ver toda la flota</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {showReportForm && <ReportForm vehicles={vehicles} onClose={() => { setShowReportForm(false); handleSyncData(); }} onSubmit={submitReportToSheet} />}
      {showFiveSForm && <FiveSForm vehicles={vehicles} onClose={() => { setShowFiveSForm(false); handleSyncData(); }} onSubmit={submitFiveSToSheet} />}
      {showWashForm && (
        <WashForm 
          vehicles={vehicles} 
          onClose={() => { 
            setShowWashForm(false); 
            setPreSelectedWashPlate(null);
            handleSyncData(); 
          }} 
          onSubmit={submitWashToSheet} 
          preSelectedPlate={preSelectedWashPlate || undefined}
        />
      )}
      {showCalibrationForm && (
        <CalibrationForm 
          vehicles={vehicles} 
          preSelectedPlate={preSelectedCalPlate || undefined}
          onClose={() => { 
            setShowCalibrationForm(false); 
            setPreSelectedCalPlate(null);
            handleSyncData(); 
          }} 
          onSubmit={submitCalibrationToSheet} 
        />
      )}
      {closingReport && <ClosureForm report={closingReport} onClose={() => { setClosingReport(null); handleSyncData(); }} onSubmit={(id, data) => submitReportToSheet({...closingReport, ...data} as any)} />}
      {closingFiveS && <FiveSClosureForm report={closingFiveS} onClose={() => { setClosingFiveS(null); handleSyncData(); }} onSubmit={(id, data) => submitFiveSToSheet({...closingFiveS, ...data} as any)} />}
      {viewDoc && <DocumentViewer url={viewDoc.url} title={viewDoc.title} onClose={() => setViewDoc(null)} />}
    </div>
  );
};

export default App;
