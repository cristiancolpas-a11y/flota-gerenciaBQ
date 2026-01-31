
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Vehicle, Driver, Report, MileageLog, FiveSReport, Calibration } from './types';
import DocumentCard from './components/DocumentCard';
import DriverCard from './components/DriverCard';
import ReportCard from './components/ReportCard';
import FiveSCard from './components/FiveSCard';
import CalibrationCard from './components/CalibrationCard';
import CalibrationForm from './components/CalibrationForm';
import DocumentViewer from './components/DocumentViewer';
import MileageEntryForm from './components/MileageEntryForm';
import ReportForm from './components/ReportForm';
import ClosureForm from './components/ClosureForm';
import FiveSForm from './components/FiveSForm';
import FiveSClosureForm from './components/FiveSClosureForm';
import { 
  fetchVehiclesFromSheet, 
  fetchDriversFromSheet, 
  fetchReportsFromSheet, 
  fetchMileageLogsFromSheet,
  fetchFiveSReportsFromSheet,
  fetchCalibrationsFromSheet,
  submitReportToSheet, 
  submitMileageToSheet,
  submitFiveSToSheet,
  submitCalibrationToSheet
} from './services/sheetService';
import { formatDate, getWeekNumber, normalizePlate, extractNumber, normalizeStr } from './utils';
import { 
  RefreshCw,
  Menu,
  Users,
  ClipboardList,
  Truck,
  X,
  Car,
  Gauge,
  Database,
  Calendar,
  Plus,
  Search,
  UserCircle,
  ShieldCheck,
  LayoutDashboard,
  Building2,
  MapPin,
  Briefcase,
  Scale,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Settings2,
  Clock,
  CheckCircle,
  Shield,
  Zap,
  FileText,
  Flame,
  Stethoscope,
  CreditCard,
  ListChecks,
  Target,
  History,
  Activity,
  AlertCircle,
  ChevronUp,
  ArrowRight,
  Construction,
  LogOut
} from 'lucide-react';

type ActiveView = 'vehiculos' | 'conductores' | 'novedades' | 'kilometrajes' | '5s_camiones' | 'calibraciones';
type StatusFilter = 'all' | 'completed' | 'pending';
type VehicleStatusFilter = 'all' | 'soat' | 'rtm' | 'plc' | 'ext';
type DriverStatusFilter = 'all' | 'license' | 'driving' | 'medical';
type CalibrationStatusFilter = 'all' | 'done' | 'pending';
type MainModule = 'camiones' | 'montacargas' | null;

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<MainModule>(null);
  const [activeView, setActiveView] = useState<ActiveView>('vehiculos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [openSectionId, setOpenSectionId] = useState<string | null>('DOCUMENTOS');
  const [selectedCd, setSelectedCd] = useState<string>('all');
  const [selectedContractor, setSelectedContractor] = useState<string>('all');
  
  const [mileageStatusFilter, setMileageStatusFilter] = useState<StatusFilter>('all');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<VehicleStatusFilter>('all');
  const [driverStatusFilter, setDriverStatusFilter] = useState<DriverStatusFilter>('all');
  const [calibrationStatusFilter, setCalibrationStatusFilter] = useState<CalibrationStatusFilter>('all');
  const [selectedWeek, setSelectedWeek] = useState<number>(getWeekNumber(new Date()));
  const [selectedReportMonth, setSelectedReportMonth] = useState<number>(new Date().getMonth());
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);
  const [fiveSReports, setFiveSReports] = useState<FiveSReport[]>([]);
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [viewerDoc, setViewerDoc] = useState<{url: string, title: string} | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showFiveSForm, setShowFiveSForm] = useState(false);
  const [showCalibrationForm, setShowCalibrationForm] = useState(false);
  const [selectedPlateForFiveS, setSelectedPlateForFiveS] = useState<string | undefined>(undefined);
  const [closureReport, setClosureReport] = useState<Report | null>(null);
  const [fiveSClosureReport, setFiveSClosureReport] = useState<FiveSReport | null>(null);

  const vehicleRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    handleSyncData();
    if (window.innerWidth >= 1280) setIsSidebarOpen(true);
  }, []);

  const toggleSection = (section: string) => {
    setOpenSectionId(prev => (prev === section ? null : section));
  };

  const handleSyncData = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const [vRes, dRes, rRes, mRes, fRes, cRes] = await Promise.all([
        fetchVehiclesFromSheet(),
        fetchDriversFromSheet(),
        fetchReportsFromSheet(),
        fetchMileageLogsFromSheet(),
        fetchFiveSReportsFromSheet(),
        fetchCalibrationsFromSheet()
      ]);
      setVehicles(vRes || []);
      setDrivers(dRes || []);
      setReports(rRes || []);
      setMileageLogs(mRes || []);
      setFiveSReports(fRes || []);
      setCalibrations(cRes || []);
    } catch (error) {
      console.error('Error sincronizando datos');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReportClosure = async (reportId: string, closureData: any) => {
    try {
      await submitReportToSheet({ id: reportId, ...closureData });
      await handleSyncData();
    } catch (error) { throw error; }
  };

  const handleFiveSClosure = async (reportId: string, closureData: any) => {
    try {
      await submitFiveSToSheet({ id: reportId, ...closureData });
      await handleSyncData();
    } catch (error) { throw error; }
  };

  const handleFiveSSubmit = async (fiveSData: any) => {
    try {
      await submitFiveSToSheet(fiveSData);
      await handleSyncData();
    } catch (error) { throw error; }
  };

  const handleReportSubmit = async (reportData: any) => {
    try {
      await submitReportToSheet(reportData);
      await handleSyncData();
    } catch (error) { throw error; }
  };

  const handleCalibrationSubmit = async (calData: any) => {
    try {
      await submitCalibrationToSheet(calData);
      await handleSyncData();
    } catch (error) { throw error; }
  };

  const handleMileageSubmit = async (data: any) => {
    try {
      await submitMileageToSheet(data);
      await handleSyncData();
    } catch (error) { throw error; }
  };

  const cds = useMemo(() => Array.from(new Set((vehicles || []).map(v => v.cd || 'GENERAL'))).sort(), [vehicles]);
  const contractors = useMemo(() => Array.from(new Set((vehicles || []).map(v => v.contractor || 'GENERAL'))).sort(), [vehicles]);

  const vehiclesInGlobalContext = useMemo(() => {
    return (vehicles || []).filter(v => {
      const matchCd = selectedCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(selectedCd);
      const matchContractor = selectedContractor === 'all' || normalizeStr(v.contractor || "") === normalizeStr(selectedContractor);
      return matchCd && matchContractor;
    });
  }, [vehicles, selectedCd, selectedContractor]);

  const vehicleStats = useMemo(() => {
    const total = vehiclesInGlobalContext.length;
    return {
      total,
      soat: vehiclesInGlobalContext.filter(v => v.soat.status === 'expired').length,
      rtm: vehiclesInGlobalContext.filter(v => v.rtm.status === 'expired').length,
      plc: vehiclesInGlobalContext.filter(v => v.plc.status === 'expired').length,
      ext: vehiclesInGlobalContext.filter(v => v.extinguisher.status === 'expired').length,
    };
  }, [vehiclesInGlobalContext]);

  const driversInGlobalContext = useMemo(() => {
    return (drivers || []).filter(d => {
      const matchCd = selectedCd === 'all' || normalizeStr(d.cd || "") === normalizeStr(selectedCd);
      const matchContractor = selectedContractor === 'all' || normalizeStr(d.contractor || "") === normalizeStr(selectedContractor);
      return matchCd && matchContractor;
    });
  }, [drivers, selectedCd, selectedContractor]);

  const driverStats = useMemo(() => {
    const total = driversInGlobalContext.length;
    return {
      total,
      license: driversInGlobalContext.filter(d => d.license.status === 'expired').length,
      driving: driversInGlobalContext.filter(d => d.defensiveDriving.status === 'expired').length,
      medical: driversInGlobalContext.filter(d => d.medicalExam.status === 'expired').length
    };
  }, [driversInGlobalContext]);

  const filteredVehicles = useMemo(() => {
    const nSearch = normalizePlate(searchTerm);
    return vehiclesInGlobalContext.filter(v => {
      const matchSearch = nSearch === '' || normalizePlate(v.plate).includes(nSearch);
      let matchStatus = true;
      if (vehicleStatusFilter === 'soat') matchStatus = v.soat.status === 'expired';
      else if (vehicleStatusFilter === 'rtm') matchStatus = v.rtm.status === 'expired';
      else if (vehicleStatusFilter === 'plc') matchStatus = v.plc.status === 'expired';
      else if (vehicleStatusFilter === 'ext') matchStatus = v.extinguisher.status === 'expired';
      return matchSearch && matchStatus;
    });
  }, [vehiclesInGlobalContext, searchTerm, vehicleStatusFilter]);

  const filteredDrivers = useMemo(() => {
    const s = searchTerm.toUpperCase().trim();
    return driversInGlobalContext.filter(d => {
      const matchSearch = s === '' || d.name.toUpperCase().includes(s) || d.identification.includes(s);
      let matchStatus = true;
      if (driverStatusFilter === 'license') matchStatus = d.license.status === 'expired';
      else if (driverStatusFilter === 'driving') matchStatus = d.defensiveDriving.status === 'expired';
      else if (driverStatusFilter === 'medical') matchStatus = d.medicalExam.status === 'expired';
      return matchSearch && matchStatus;
    });
  }, [driversInGlobalContext, searchTerm, driverStatusFilter]);

  const calibrationStats = useMemo(() => {
    const totalFleet = vehiclesInGlobalContext.length;
    const nSearch = normalizePlate(searchTerm);
    const calsByPlate: Record<string, Calibration[]> = {};
    (calibrations || []).forEach(c => {
      const plate = normalizePlate(c.plate);
      if (!calsByPlate[plate]) calsByPlate[plate] = [];
      calsByPlate[plate].push(c);
    });
    let doneCount = 0;
    const fleetStatus = vehiclesInGlobalContext.map(v => {
      const plate = normalizePlate(v.plate);
      const vehicleCals = calsByPlate[plate] || [];
      const isDone = vehicleCals.length > 0 && vehicleCals.every(c => c.status !== 'expired');
      if (isDone) doneCount++;
      return { ...v, isCalibrationDone: isDone, calibrations: vehicleCals };
    });
    const percentage = totalFleet > 0 ? Math.round((doneCount / totalFleet) * 100) : 0;
    const filteredFleet = fleetStatus.filter(v => {
      const matchSearch = nSearch === '' || normalizePlate(v.plate).includes(nSearch);
      if (calibrationStatusFilter === 'done') return v.isCalibrationDone && matchSearch;
      if (calibrationStatusFilter === 'pending') return !v.isCalibrationDone && matchSearch;
      return matchSearch;
    });
    return { totalFleet, doneCount, pendingCount: totalFleet - doneCount, percentage, filteredFleet };
  }, [vehiclesInGlobalContext, calibrations, calibrationStatusFilter, searchTerm]);

  const filteredReports = useMemo(() => {
    const nSearch = normalizePlate(searchTerm);
    return (reports || []).filter(r => {
      const reportDate = new Date(r.date + 'T12:00:00');
      return reportDate.getMonth() === selectedReportMonth && (nSearch === '' || normalizePlate(r.plate).includes(nSearch)) && (selectedCd === 'all' || normalizeStr(r.cd || "") === normalizeStr(selectedCd));
    }).sort((a, b) => new Date(b.date + 'T12:00:00').getTime() - new Date(a.date + 'T12:00:00').getTime());
  }, [reports, selectedReportMonth, searchTerm, selectedCd]);

  const reportStats = useMemo(() => {
    const total = filteredReports.length;
    const closed = filteredReports.filter(r => r.status === 'CERRADO').length;
    return { total, closed, open: total - closed, percentage: total > 0 ? Math.round((closed / total) * 100) : 0 };
  }, [filteredReports]);

  const mileageCompliance = useMemo(() => {
    const total = vehiclesInGlobalContext.length;
    const doneCount = vehiclesInGlobalContext.filter(v => {
      const vPlate = normalizePlate(v.plate);
      return (mileageLogs || []).some(log => normalizePlate(log.plate) === vPlate && extractNumber(log.week) === selectedWeek);
    }).length;
    return { total, done: doneCount, percentage: total > 0 ? Math.round((doneCount / total) * 100) : 0 };
  }, [vehiclesInGlobalContext, mileageLogs, selectedWeek]);

  const filteredFiveS = useMemo(() => {
    return (fiveSReports || []).filter(f => (selectedCd === 'all' || normalizeStr(f.cd || "") === normalizeStr(selectedCd)) && (searchTerm === '' || normalizePlate(f.plate).includes(normalizePlate(searchTerm))));
  }, [fiveSReports, selectedCd, searchTerm]);

  const fiveSCompliance = useMemo(() => {
    const totalVehiclesInSection = (vehicles || []).filter(v => selectedCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(selectedCd)).length;
    const uniqueAuditedPlates = new Set((filteredFiveS || []).map(f => normalizePlate(f.plate))).size;
    return { total: totalVehiclesInSection, audited: uniqueAuditedPlates, percentage: totalVehiclesInSection > 0 ? Math.round((uniqueAuditedPlates / totalVehiclesInSection) * 100) : 0 };
  }, [vehicles, filteredFiveS, selectedCd]);

  const truckMenuSections = [
    {
      id: 'DOCUMENTOS',
      icon: <FolderOpen size={16} />,
      items: [
        { id: 'vehiculos', icon: <Truck size={14} />, label: 'Camiones' },
        { id: 'conductores', icon: <Users size={14} />, label: 'Conductores' }
      ]
    },
    {
      id: 'NEUMATICOS',
      icon: <Scale size={16} />,
      items: [
        { id: 'calibraciones', icon: <Settings2 size={14} />, label: 'Calibraciones' }
      ]
    },
    {
      id: 'GESTION',
      icon: <LayoutDashboard size={16} />,
      items: [
        { id: 'novedades', icon: <ClipboardList size={14} />, label: 'Novedades' },
        { id: 'kilometrajes', icon: <Gauge size={14} />, label: 'Kilometrajes' },
        { id: '5s_camiones', icon: <ShieldCheck size={14} />, label: '5S Camiones' }
      ]
    }
  ];

  // LANDING PAGE
  if (activeModule === null) {
    return (
      <div className="fixed inset-0 bg-[#0f172a] z-[100] flex flex-col items-center justify-center p-6 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-1000">
           <div className="mb-12 flex flex-col items-center">
              <div className="p-6 bg-indigo-600 rounded-[2.5rem] shadow-[0_0_50px_rgba(79,70,229,0.4)] text-white mb-8">
                 <Truck size={64} className="animate-in slide-in-from-bottom-8 duration-700" />
              </div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-tight mb-2 text-center">FLOTA GERENCIA BQA</h1>
              <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.5em] opacity-80 text-center">SISTEMA INTEGRAL DE CONTROL</p>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
             <button onClick={() => setActiveModule('camiones')} className="group relative flex items-center gap-8 bg-[#1e293b]/50 backdrop-blur-xl border-2 border-white/10 p-6 rounded-[2.5rem] transition-all hover:bg-white/5 hover:border-indigo-500/50 hover:shadow-[0_0_80px_rgba(79,70,229,0.15)] active:scale-95 pr-12">
                <div className="p-5 bg-indigo-600 rounded-[1.8rem] shadow-xl text-white transition-transform group-hover:scale-110"><Truck size={32} /></div>
                <div className="flex items-center gap-4"><span className="text-3xl font-black text-white uppercase tracking-[0.2em] leading-none">CAMIONES</span><ChevronRight size={24} className="text-indigo-400 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all" /></div>
             </button>
             <button onClick={() => setActiveModule('montacargas')} className="group relative flex items-center gap-8 bg-[#1e293b]/50 backdrop-blur-xl border-2 border-white/10 p-6 rounded-[2.5rem] transition-all hover:bg-white/5 hover:border-emerald-500/50 hover:shadow-[0_0_80px_rgba(16,185,129,0.15)] active:scale-95 pr-12">
                <div className="p-5 bg-emerald-600 rounded-[1.8rem] shadow-xl text-white transition-transform group-hover:scale-110"><Construction size={32} /></div>
                <div className="flex items-center gap-4"><span className="text-3xl font-black text-white uppercase tracking-[0.2em] leading-none">FLT MONTACARGAS</span><ChevronRight size={24} className="text-emerald-400 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all" /></div>
             </button>
           </div>
           <div className="mt-16 flex items-center gap-4 text-slate-500 text-[9px] font-black uppercase tracking-widest animate-pulse">
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Sincronizando flota...' : 'Sistema Listo - Seleccione un módulo'}
           </div>
        </div>
        <div className="absolute bottom-10 text-slate-600 text-[8px] font-black uppercase tracking-[0.3em]">Versión 3.5.0 • © 2025 Logística Barranquilla</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans text-slate-900 overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0f172a] transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 xl:relative xl:translate-x-0 shadow-2xl flex flex-col border-r border-white/5`}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-8 px-2 group cursor-pointer" onClick={() => setActiveModule(null)}>
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-xl text-white flex shrink-0 ring-4 ring-white/5 group-hover:bg-rose-500 transition-colors">
              <LogOut size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tighter uppercase leading-tight">FLOTA BQA</h1>
              <p className="text-[8px] text-indigo-400 font-black uppercase tracking-[0.2em] opacity-70 group-hover:text-rose-400">SALIR AL INICIO</p>
            </div>
          </div>
          
          <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar space-y-4">
            {activeModule === 'camiones' ? (
              <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-[2rem] p-3 transition-all">
                <div className="w-full flex items-center gap-4 px-4 py-4 text-white">
                   <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg text-white"><Truck size={18} /></div>
                   <span className="text-[11px] font-black uppercase tracking-[0.25em]">CAMIONES</span>
                </div>
                <div className="space-y-3 mt-4">
                  {truckMenuSections.map((section) => (
                    <div key={section.id} className="bg-white/5 rounded-2xl overflow-hidden border border-white/5 transition-all">
                      <button onClick={() => toggleSection(section.id)} className="w-full flex items-center justify-between px-4 py-4 text-white/70 hover:text-white transition-all group">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg transition-colors ${openSectionId === section.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-slate-500 group-hover:text-indigo-400'}`}>{section.icon}</div>
                          <span className="text-[9px] font-black uppercase tracking-[0.2em]">{section.id}</span>
                        </div>
                        {openSectionId === section.id ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                      </button>
                      <div className={`transition-all duration-300 ${openSectionId === section.id ? 'max-h-96 opacity-100 py-2' : 'max-h-0 opacity-0 overflow-hidden py-0'}`}>
                        <nav className="space-y-1 px-3 pb-2">
                          {section.items.map((item) => (
                            <button key={item.id} onClick={() => { setActiveView(item.id as ActiveView); if (window.innerWidth < 1280) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[9px] font-black transition-all ${activeView === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                              {item.icon}<span className="uppercase tracking-widest leading-none">{item.label}</span>
                            </button>
                          ))}
                        </nav>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-[2rem] p-3 transition-all">
                <div className="w-full flex items-center gap-4 px-4 py-4 text-white">
                   <div className="p-2.5 bg-emerald-600 rounded-2xl shadow-lg text-white"><Construction size={18} /></div>
                   <span className="text-[11px] font-black uppercase tracking-[0.25em]">FLT MONTACARGAS</span>
                </div>
                <div className="mt-8 px-4 py-12 text-center border-2 border-dashed border-white/10 rounded-3xl">
                   <Construction size={40} className="mx-auto text-emerald-500/30 mb-4" />
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Gestión Específica en Desarrollo</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-grow flex flex-col min-w-0 h-screen">
        <header className="z-30 bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="xl:hidden p-2 bg-slate-50 text-slate-600 rounded-lg"><Menu size={20} /></button>
            <div className="bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200 flex items-center gap-3 shadow-sm w-64 md:w-80">
              <Search size={16} className="text-slate-400" />
              <input type="text" placeholder="BUSCAR..." className="bg-transparent border-none text-[10px] font-black uppercase outline-none flex-grow tracking-widest" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value.toUpperCase())} />
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={handleSyncData} className={`p-2.5 ${isSyncing ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600 border border-slate-200'} rounded-xl transition-all`}><RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} /></button>
          </div>
        </header>

        <div className="flex-grow p-8 overflow-y-auto bg-[#f8fafc] custom-scrollbar">
          {activeModule === 'montacargas' ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
               <div className="p-12 bg-emerald-50 rounded-[4rem] text-emerald-600 border-4 border-dashed border-emerald-200 shadow-inner"><Construction size={120} className="animate-pulse" /></div>
               <div className="space-y-2"><h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">MÓDULO MONTACARGAS</h2><p className="text-[12px] font-black text-emerald-600 uppercase tracking-[0.4em]">Próximamente disponible para gestión integral</p></div>
               <button onClick={() => setActiveModule(null)} className="px-12 py-5 bg-[#0f172a] text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-rose-600 transition-all flex items-center gap-4"><ArrowRight className="rotate-180" /> REGRESAR AL INICIO</button>
            </div>
          ) : (
            <>
              <div className="max-w-[1600px] mx-auto mb-8 bg-white p-4 rounded-3xl border border-slate-200 shadow-lg flex flex-wrap items-center gap-4">
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 cursor-pointer"><Building2 className="text-indigo-500 mr-2" size={16} /><select className="bg-transparent text-[10px] font-black uppercase outline-none cursor-pointer" value={selectedCd} onChange={(e) => setSelectedCd(e.target.value)}><option value="all">TODOS LOS C.D.</option>{cds.map(cd => <option key={cd} value={cd}>{cd}</option>)}</select></div>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 cursor-pointer"><UserCircle className="text-indigo-500 mr-2" size={16} /><select className="bg-transparent text-[10px] font-black uppercase outline-none cursor-pointer" value={selectedContractor} onChange={(e) => setSelectedContractor(e.target.value)}><option value="all">TODOS LOS CONTRATISTAS</option>{contractors.map(cnt => <option key={cnt} value={cnt}>{cnt}</option>)}</select></div>
              </div>

              {activeView === 'vehiculos' && (
                <div className="space-y-12 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <button onClick={() => setVehicleStatusFilter('all')} className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border transition-all ${vehicleStatusFilter === 'all' ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xl' : 'bg-white border-slate-200 hover:border-indigo-300'}`}><div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${vehicleStatusFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}><Truck size={24} /></div><div className="text-center"><h4 className="text-3xl font-black tracking-tighter leading-none">{vehicleStats.total}</h4><p className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 ${vehicleStatusFilter === 'all' ? 'text-indigo-400' : 'text-slate-400'}`}>FLOTA TOTAL</p></div></button>
                    <button onClick={() => setVehicleStatusFilter('soat')} className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border transition-all ${vehicleStatusFilter === 'soat' ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xl' : 'bg-white border-slate-200 hover:border-blue-300'}`}><div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${vehicleStatusFilter === 'soat' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}><Shield size={24} /></div><div className="text-center"><h4 className="text-3xl font-black tracking-tighter leading-none">{vehicleStats.soat}</h4><p className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 ${vehicleStatusFilter === 'soat' ? 'text-blue-400' : 'text-slate-400'}`}>SOAT VENCIDO</p></div></button>
                    <button onClick={() => setVehicleStatusFilter('rtm')} className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border transition-all ${vehicleStatusFilter === 'rtm' ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xl' : 'bg-white border-slate-200 hover:border-purple-300'}`}><div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${vehicleStatusFilter === 'rtm' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-600'}`}><Zap size={24} /></div><div className="text-center"><h4 className="text-3xl font-black tracking-tighter leading-none">{vehicleStats.rtm}</h4><p className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 ${vehicleStatusFilter === 'rtm' ? 'text-purple-400' : 'text-slate-400'}`}>RTM VENCIDA</p></div></button>
                    <button onClick={() => setVehicleStatusFilter('plc')} className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border transition-all ${vehicleStatusFilter === 'plc' ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xl' : 'bg-white border-slate-200 hover:border-amber-300'}`}><div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${vehicleStatusFilter === 'plc' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600'}`}><FileText size={24} /></div><div className="text-center"><h4 className="text-3xl font-black tracking-tighter leading-none">{vehicleStats.plc}</h4><p className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 ${vehicleStatusFilter === 'plc' ? 'text-amber-400' : 'text-slate-400'}`}>PLC VENCIDA</p></div></button>
                    <button onClick={() => setVehicleStatusFilter('ext')} className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border transition-all ${vehicleStatusFilter === 'ext' ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xl' : 'bg-white border-slate-200 hover:border-orange-300'}`}><div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${vehicleStatusFilter === 'ext' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-600'}`}><Flame size={24} /></div><div className="text-center"><h4 className="text-3xl font-black tracking-tighter leading-none">{vehicleStats.ext}</h4><p className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 ${vehicleStatusFilter === 'ext' ? 'text-orange-400' : 'text-slate-400'}`}>EXTINTOR</p></div></button>
                  </div>
                  {filteredVehicles.map((vehicle) => (
                    <div key={vehicle.id} ref={el => { vehicleRefs.current[vehicle.plate] = el; }} className="bg-white rounded-[3.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col xl:flex-row p-2"><div className="xl:w-[400px] bg-[#f8fafc] rounded-[3rem] p-10 flex flex-col items-center shrink-0"><div className="w-full bg-[#0f172a] p-10 rounded-[2.5rem] flex items-center justify-center shadow-2xl border-[10px] border-white mb-10"><h2 className="text-5xl md:text-6xl font-mono font-black text-white tracking-tighter uppercase leading-none">{vehicle.plate}</h2></div><div className="space-y-4 w-full px-2"><div className="flex items-center gap-5 bg-white p-5 rounded-3xl shadow-sm border border-slate-100"><div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600"><MapPin size={22}/></div><div className="flex flex-col leading-none"><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">C.D.</span><span className="text-sm font-black text-slate-800 uppercase">{vehicle.cd || 'GENERAL'}</span></div></div><div className="flex items-center gap-5 bg-white p-5 rounded-3xl shadow-sm border border-slate-100"><div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600"><Briefcase size={22}/></div><div className="flex flex-col leading-none"><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Contratista</span><span className="text-sm font-black text-slate-800 uppercase truncate max-w-[180px]">{vehicle.contractor || 'GENERAL'}</span></div></div></div></div><div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-6 flex-grow bg-white items-stretch"><DocumentCard title="Propiedad" doc={{ expiryDate: '', lastRenewalDate: '', status: 'active', url: vehicle.propertyCardUrl }} icon={<Database />} onViewDoc={(url, title) => setViewerDoc({url, title})} /><DocumentCard title="PLC" doc={vehicle.plc} icon={<ClipboardList />} onViewDoc={(url, title) => setViewerDoc({url, title})} /><DocumentCard title="SOAT" doc={vehicle.soat} icon={<ShieldCheck />} onViewDoc={(url, title) => setViewerDoc({url, title})} /><DocumentCard title="RTM" doc={vehicle.rtm} icon={<Gauge />} onViewDoc={(url, title) => setViewerDoc({url, title})} /><DocumentCard title="Extintor" doc={vehicle.extinguisher} icon={<Plus />} onViewDoc={(url, title) => setViewerDoc({url, title})} /></div></div>
                  ))}
                </div>
              )}
              {activeView === 'conductores' && (
                <div className="space-y-8 animate-in fade-in duration-500 max-w-[1400px] mx-auto">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button onClick={() => setDriverStatusFilter('all')} className="p-6 rounded-3xl border bg-white flex flex-col items-center"><Users size={24} className="text-indigo-600 mb-2"/><h4 className="text-3xl font-black">{driverStats.total}</h4><p className="text-[8px] font-black text-slate-400">TOTAL</p></button>
                    <button onClick={() => setDriverStatusFilter('license')} className="p-6 rounded-3xl border bg-white flex flex-col items-center"><CreditCard size={24} className="text-blue-600 mb-2"/><h4 className="text-3xl font-black">{driverStats.license}</h4><p className="text-[8px] font-black text-slate-400">LICENCIA VENCIDA</p></button>
                  </div>
                  {filteredDrivers.map(driver => (<DriverCard key={driver.id} driver={driver} onViewDoc={(url, title) => setViewerDoc({url, title})} />))}
                </div>
              )}
              {activeView === 'kilometrajes' && (<MileageEntryForm vehicles={vehicles} mileageLogs={mileageLogs} onSubmit={handleMileageSubmit} externalCd={selectedCd} setExternalCd={setSelectedCd} externalContractor={selectedContractor} setExternalContractor={setSelectedContractor} searchTerm={searchTerm} setSearchTerm={setSearchTerm} statusFilter={mileageStatusFilter} setStatusFilter={setMileageStatusFilter} selectedWeek={selectedWeek} onWeekChange={setSelectedWeek} />)}
              {activeView === 'novedades' && (
                <div className="space-y-8 max-w-[1600px] mx-auto">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-lg flex justify-between items-center"><h2 className="text-xl font-black">GESTIÓN DE NOVEDADES</h2><button onClick={() => setShowReportForm(true)} className="py-4 px-8 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-3"><Plus size={20} /> NUEVO REPORTE</button></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-16">{filteredReports.map(report => (<ReportCard key={report.id} report={report} onViewDoc={(url, title) => setViewerDoc({url, title})} onManageClosure={(r) => setClosureReport(r)} />))}</div>
                </div>
              )}
              {activeView === '5s_camiones' && (
                <div className="space-y-8 max-w-[1400px] mx-auto pb-24">
                  <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-lg flex justify-between items-center"><h2 className="text-xl font-black">AUDITORÍA 5S</h2><button onClick={() => setShowFiveSForm(true)} className="py-4 px-8 bg-[#0f172a] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-3"><Plus size={20} /> NUEVA AUDITORÍA</button></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{filteredFiveS.map(report => (<FiveSCard key={report.id} report={report} onViewDoc={(url, title) => setViewerDoc({url, title})} onManageClosure={(r) => setFiveSClosureReport(r)} />))}</div>
                </div>
              )}
              {activeView === 'calibraciones' && (
                <div className="space-y-12 max-w-[1600px] mx-auto pb-24">
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-lg flex justify-between items-center"><h2 className="text-xl font-black">CALIBRACIONES DE NEUMÁTICOS</h2><button onClick={() => setShowCalibrationForm(true)} className="py-4 px-8 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3"><Plus size={20} /> NUEVA CALIBRACIÓN</button></div>
                  <div className="space-y-6">{calibrationStats.filteredFleet.map((vehicle) => (
                    <div key={vehicle.id} className="bg-white rounded-[3.5rem] border border-slate-200 shadow-xl flex flex-col xl:flex-row p-2"><div className="xl:w-[320px] bg-[#f8fafc] rounded-[3rem] p-8 flex flex-col items-center shrink-0 justify-center"><div className="bg-[#0f172a] px-10 py-8 rounded-[2rem] border-[8px] border-white shadow-xl mb-4"><h2 className="text-3xl font-mono font-black text-white tracking-tighter uppercase leading-none">{vehicle.plate}</h2></div></div><div className="p-8 flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-white">{vehicle.calibrations.map(cal => (<CalibrationCard key={cal.id} calibration={cal} onViewDoc={(url, title) => setViewerDoc({url, title})} />))}</div></div>
                  ))}</div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {viewerDoc && <DocumentViewer url={viewerDoc.url} title={viewerDoc.title} onClose={() => setViewerDoc(null)} />}
      {showReportForm && <ReportForm vehicles={vehicles} onClose={() => setShowReportForm(false)} onSubmit={handleReportSubmit} />}
      {showFiveSForm && <FiveSForm vehicles={vehicles} preSelectedPlate={selectedPlateForFiveS} onClose={() => { setShowFiveSForm(false); setSelectedPlateForFiveS(undefined); }} onSubmit={handleFiveSSubmit} />}
      {showCalibrationForm && <CalibrationForm vehicles={vehicles} onClose={() => setShowCalibrationForm(false)} onSubmit={handleCalibrationSubmit} />}
      {closureReport && <ClosureForm report={closureReport} onClose={() => setClosureReport(null)} onSubmit={handleReportClosure} />}
      {fiveSClosureReport && <FiveSClosureForm report={fiveSClosureReport} onClose={() => setFiveSClosureReport(null)} onSubmit={handleFiveSClosure} />}
    </div>
  );
};

export default App;
