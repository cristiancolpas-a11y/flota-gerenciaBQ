
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
  RefreshCw, Users, ClipboardList, Truck, X, Gauge, ShieldCheck, Search, Shield, Settings2, LogOut, FileText, Flame, Plus, Clock, Wrench, Key, Scale, LayoutDashboard, Menu, Disc, ChevronDown, ChevronRight, Briefcase, FilterX, Package, Box, AlertTriangle, Loader2, Info, Database, Percent, TrendingUp, CheckCircle2, Activity, Sparkles, Filter, Building2, UserCircle, CalendarDays, Droplets, Calendar, ShieldAlert, BarChart3, FileBadge, History
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

  /**
   * UNIÓN DE FLOTA DEFINITIVA:
   * Priorizamos siempre los datos que vengan de ALERTA_CAMIONES (rawVehicles).
   * Se añade cruce de información con Calibraciones para cada vehículo.
   */
  const vehicles = useMemo(() => {
    const combinedMap = new Map<string, Vehicle>();

    // 1. Agregar vehículos de la hoja Alerta Camiones (Tienen datos legales)
    rawVehicles.forEach(v => {
      const p = normalizePlate(v.plate);
      if (p) {
        // Buscar calibración más reciente para este vehículo
        const vCalibrations = calibrations
          .filter(c => normalizePlate(c.plate) === p)
          .sort((a, b) => new Date(b.calibrationDate).getTime() - new Date(a.calibrationDate).getTime());
        
        const latestCal = vCalibrations[0];
        const calibrationDoc = latestCal ? {
          expiryDate: latestCal.expiryDate,
          lastRenewalDate: latestCal.calibrationDate,
          status: latestCal.status,
          url: latestCal.certificateUrl,
          daysPending: latestCal.daysPending
        } : {
          expiryDate: '',
          lastRenewalDate: '',
          status: 'expired' as const,
          daysPending: 0
        };

        combinedMap.set(v.id || p, { ...v, calibration: calibrationDoc });
      }
    });

    // 2. Agregar vehículos descubiertos en el historial de Kilometraje (Fallback)
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
          plc: { expiryDate: '', lastRenewalDate: '', status: 'active' },
          extinguisher: { expiryDate: '', lastRenewalDate: '', status: 'expired' },
          calibration: { expiryDate: '', lastRenewalDate: '', status: 'expired' },
          lastUpdate: new Date().toISOString()
        });
      }
    });

    return Array.from(combinedMap.values());
  }, [rawVehicles, mileageLogs, calibrations]);

  const baseFilteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchesCd = filterCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(filterCd);
      const matchesContractor = filterContractor === 'all' || normalizeStr(v.contractor || "") === normalizeStr(filterContractor);
      const matchesSearch = normalizePlate(v.plate).includes(normalizePlate(searchTerm));
      return matchesCd && matchesContractor && matchesSearch;
    });
  }, [vehicles, filterCd, filterContractor, searchTerm]);

  const fleetStats = useMemo(() => {
    const list = baseFilteredVehicles;
    const total = list.length;
    let expiredCount = 0;
    let warningCount = 0;
    
    list.forEach(v => {
      const statuses = [v.soat?.status, v.rtm?.status, v.extinguisher?.status, v.plc?.status, v.calibration?.status];
      if (statuses.some(s => s === 'expired')) expiredCount++;
      else if (statuses.some(s => s === 'warning')) warningCount++;
    });

    return { total, expiredCount, warningCount, healthyCount: total - expiredCount - warningCount };
  }, [baseFilteredVehicles]);

  const masterFleetFiltered = useMemo(() => {
    return baseFilteredVehicles.filter(v => {
      let matchesLegal = true;
      const statuses = [v.soat?.status, v.rtm?.status, v.extinguisher?.status, v.plc?.status, v.calibration?.status];
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
                  const isCriticallyExpired = [v.soat?.status, v.rtm?.status, v.extinguisher?.status, v.plc?.status, v.calibration?.status].some(s => s === 'expired');
                  
                  return (
                    <div key={v.id} className="bg-white rounded-[3.5rem] border border-slate-200 shadow-2xl overflow-hidden transition-all hover:shadow-indigo-500/10 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
                      <div className="flex flex-col lg:flex-row min-h-[500px]">
                        
                        {/* COLUMNA 1: PERFIL DEL VEHÍCULO (OSCURO) */}
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
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">{item.icon} {item.label}</p>
                                    <p className={`text-xl font-black uppercase tracking-tight ${item.isHighlight ? 'text-indigo-400' : 'text-white'}`}>{item.value}</p>
                                    <div className="w-8 h-1 bg-white/10 mt-3 group-hover/item:w-full group-hover/item:bg-indigo-500 transition-all duration-500"></div>
                                 </div>
                               ))}
                            </div>
                          </div>
                        </div>

                        {/* COLUMNA 2: EXPEDIENTE TÉCNICO Y LEGAL (CLARO) */}
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
                                <DocumentCard title="SOAT" doc={v.soat} icon={<Shield/>} onViewDoc={(u, t) => setViewDoc({url: u, title: `${v.plate} - ${t}`})} />
                                <DocumentCard title="RTM" doc={v.rtm} icon={<Settings2/>} onViewDoc={(u, t) => setViewDoc({url: u, title: `${v.plate} - ${t}`})} />
                                <DocumentCard title="CALIBRACIÓN" doc={v.calibration || { expiryDate: '', lastRenewalDate: '', status: 'expired' }} icon={<Disc/>} onViewDoc={(u, t) => setViewDoc({url: u, title: `${v.plate} - ${t}`})} />
                                <DocumentCard title="EXTINTOR" doc={v.extinguisher} icon={<Flame/>} onViewDoc={(u, t) => setViewDoc({url: u, title: `${v.plate} - ${t}`})} />
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
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
               <div className="col-span-full flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Historial de Lavados</h2>
                 <button onClick={() => setShowWashForm(true)} className="px-6 py-3 bg-cyan-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-cyan-700 transition-all flex items-center gap-2">
                   <Plus size={16} /> REGISTRAR LAVADO
                 </button>
               </div>
               {washReports.filter(w => normalizePlate(w.plate).includes(normalizePlate(searchTerm))).map(w => (
                 <WashCard key={w.id} report={w} onViewDoc={(u, t) => setViewDoc({url: u, title: t})} />
               ))}
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
                 <FiveSCard key={f.id} report={f} onViewDoc={(u, t) => setViewDoc({url: u, title: t})} onManageClosure={setClosingFiveS} />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
              <div className="col-span-full flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Gestión de Novedades</h2>
                 <button onClick={() => setShowReportForm(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">
                   <Plus size={16} /> CREAR NOVEDAD
                 </button>
               </div>
              {reports.filter(r => normalizePlate(r.plate).includes(normalizePlate(searchTerm))).map(r => (
                <ReportCard key={r.id} report={r} onViewDoc={(url, t) => setViewDoc({url, title: t})} onManageClosure={setClosingReport} />
              ))}
            </div>
          )}

          {activeView === 'calibraciones' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
              <div className="col-span-full flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Calibración de Neumáticos</h2>
                 <button onClick={() => setShowCalibrationForm(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-3">
                   <Plus size={16} /> REGISTRAR CALIBRACIÓN
                 </button>
              </div>
              {calibrations.filter(c => normalizePlate(c.plate).includes(normalizePlate(searchTerm))).map(c => (
                <CalibrationCard key={c.id} calibration={c} onViewDoc={(url, t) => setViewDoc({url, title: t})} />
              ))}
            </div>
          )}
        </div>
      </main>

      {showReportForm && <ReportForm vehicles={vehicles} onClose={() => { setShowReportForm(false); handleSyncData(); }} onSubmit={submitReportToSheet} />}
      {showFiveSForm && <FiveSForm vehicles={vehicles} onClose={() => { setShowFiveSForm(false); handleSyncData(); }} onSubmit={submitFiveSToSheet} />}
      {showWashForm && <WashForm vehicles={vehicles} onClose={() => { setShowWashForm(false); handleSyncData(); }} onSubmit={submitWashToSheet} />}
      {showCalibrationForm && <CalibrationForm vehicles={vehicles} onClose={() => { setShowCalibrationForm(false); handleSyncData(); }} onSubmit={submitCalibrationToSheet} />}
      {closingReport && <ClosureForm report={closingReport} onClose={() => { setClosingReport(null); handleSyncData(); }} onSubmit={(id, data) => submitReportToSheet({...closingReport, ...data} as any)} />}
      {closingFiveS && <FiveSClosureForm report={closingFiveS} onClose={() => { setClosingFiveS(null); handleSyncData(); }} onSubmit={(id, data) => submitFiveSToSheet({...closingFiveS, ...data} as any)} />}
      {viewDoc && <DocumentViewer url={viewDoc.url} title={viewDoc.title} onClose={() => setViewDoc(null)} />}
    </div>
  );
};

export default App;
