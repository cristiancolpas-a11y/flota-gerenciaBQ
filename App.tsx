
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Vehicle, Driver, Report, MileageLog, FiveSReport, Calibration } from './types';
import DocumentCard from './components/DocumentCard';
import DriverCard from './components/DriverCard';
import ReportCard from './components/ReportCard';
import FiveSCard from './components/FiveSCard';
import CalibrationCard from './components/CalibrationCard';
import DocumentViewer from './components/DocumentViewer';
import MileageEntryForm from './components/MileageEntryForm';
import ReportForm from './components/ReportForm';
import ClosureForm from './components/ClosureForm';
import FiveSForm from './components/FiveSForm';
import FiveSClosureForm from './components/FiveSClosureForm';
import ExportButton from './components/ExportButton';
import { 
  fetchVehiclesFromSheet, 
  fetchDriversFromSheet, 
  fetchReportsFromSheet, 
  fetchMileageLogsFromSheet,
  fetchFiveSReportsFromSheet,
  fetchCalibrationsFromSheet,
  submitReportToSheet, 
  submitMileageToSheet,
  submitFiveSToSheet
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
  Filter,
  MapPin,
  Briefcase,
  Scale,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Settings2,
  Clock,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  UserCheck,
  Shield,
  Zap,
  FileText,
  Flame,
  Stethoscope,
  CreditCard,
  ListChecks,
  Target,
  History
} from 'lucide-react';

type ActiveView = 'vehiculos' | 'conductores' | 'novedades' | 'kilometrajes' | '5s_camiones' | 'calibraciones';
type StatusFilter = 'all' | 'completed' | 'pending';
type VehicleStatusFilter = 'all' | 'soat' | 'rtm' | 'plc' | 'ext';
type DriverStatusFilter = 'all' | 'license' | 'driving' | 'medical';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    try {
      return (localStorage.getItem('activeView') as ActiveView) || 'vehiculos';
    } catch (e) {
      return 'vehiculos';
    }
  });
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Estado para controlar qué sección del acordeón está abierta (solo una a la vez)
  const [openSectionId, setOpenSectionId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('openSectionId');
      return saved || 'DOCUMENTOS';
    } catch (e) {
      return 'DOCUMENTOS';
    }
  });
  
  const [selectedCd, setSelectedCd] = useState<string>(() => {
    try { return localStorage.getItem('selectedCd') || 'all'; } catch(e) { return 'all'; }
  });
  const [selectedContractor, setSelectedContractor] = useState<string>(() => {
    try { return localStorage.getItem('selectedContractor') || 'all'; } catch(e) { return 'all'; }
  });
  
  const [mileageStatusFilter, setMileageStatusFilter] = useState<StatusFilter>('all');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<VehicleStatusFilter>('all');
  const [driverStatusFilter, setDriverStatusFilter] = useState<DriverStatusFilter>('all');
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
  const [selectedPlateForFiveS, setSelectedPlateForFiveS] = useState<string | undefined>(undefined);
  const [closureReport, setClosureReport] = useState<Report | null>(null);
  const [fiveSClosureReport, setFiveSClosureReport] = useState<FiveSReport | null>(null);

  const vehicleRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    try {
      localStorage.setItem('activeView', activeView);
      localStorage.setItem('selectedCd', selectedCd);
      localStorage.setItem('selectedContractor', selectedContractor);
      if (openSectionId) localStorage.setItem('openSectionId', openSectionId);
    } catch (e) { /* ignore localStorage errors */ }
  }, [activeView, selectedCd, selectedContractor, openSectionId]);

  useEffect(() => {
    handleSyncData();
    if (window.innerWidth >= 1280) setIsSidebarOpen(true);
  }, []);

  // Función de acordeón: cierra las demás al abrir una
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

  const handleMileageSubmit = async (data: any) => {
    try {
      await submitMileageToSheet(data);
      await handleSyncData();
    } catch (error) { throw error; }
  };

  const cds = useMemo(() => Array.from(new Set((vehicles || []).map(v => v.cd || 'GENERAL'))).sort(), [vehicles]);
  const contractors = useMemo(() => Array.from(new Set((vehicles || []).map(v => v.contractor || 'GENERAL'))).sort(), [vehicles]);

  const vehicleStats = useMemo(() => {
    const total = vehicles.length;
    return {
      total,
      soat: vehicles.filter(v => v.soat.status === 'expired').length,
      rtm: vehicles.filter(v => v.rtm.status === 'expired').length,
      plc: vehicles.filter(v => v.plc.status === 'expired').length,
      ext: vehicles.filter(v => v.extinguisher.status === 'expired').length,
    };
  }, [vehicles]);

  const driverStats = useMemo(() => {
    const total = drivers.length;
    return {
      total,
      license: drivers.filter(d => d.license.status === 'expired').length,
      driving: drivers.filter(d => d.defensiveDriving.status === 'expired').length,
      medical: drivers.filter(d => d.medicalExam.status === 'expired').length
    };
  }, [drivers]);

  const filteredVehicles = useMemo(() => {
    const nSearch = normalizePlate(searchTerm);
    return (vehicles || []).filter(v => {
      const matchCd = selectedCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(selectedCd);
      const matchContractor = selectedContractor === 'all' || normalizeStr(v.contractor || "") === normalizeStr(selectedContractor);
      const matchSearch = nSearch === '' || normalizePlate(v.plate).includes(nSearch);
      
      let matchStatus = true;
      if (vehicleStatusFilter === 'soat') matchStatus = v.soat.status === 'expired';
      else if (vehicleStatusFilter === 'rtm') matchStatus = v.rtm.status === 'expired';
      else if (vehicleStatusFilter === 'plc') matchStatus = v.plc.status === 'expired';
      else if (vehicleStatusFilter === 'ext') matchStatus = v.extinguisher.status === 'expired';
      
      return matchCd && matchContractor && matchSearch && matchStatus;
    });
  }, [vehicles, searchTerm, selectedCd, selectedContractor, vehicleStatusFilter]);

  const filteredDrivers = useMemo(() => {
    const s = searchTerm.toUpperCase().trim();
    return (drivers || []).filter(d => {
      const matchSearch = s === '' || d.name.toUpperCase().includes(s) || d.identification.includes(s);
      const matchCd = selectedCd === 'all' || normalizeStr(d.cd || "") === normalizeStr(selectedCd);
      const matchContractor = selectedContractor === 'all' || normalizeStr(d.contractor || "") === normalizeStr(selectedContractor);
      
      let matchStatus = true;
      if (driverStatusFilter === 'license') matchStatus = d.license.status === 'expired';
      else if (driverStatusFilter === 'driving') matchStatus = d.defensiveDriving.status === 'expired';
      else if (driverStatusFilter === 'medical') matchStatus = d.medicalExam.status === 'expired';
      
      return matchSearch && matchCd && matchContractor && matchStatus;
    });
  }, [drivers, searchTerm, selectedCd, selectedContractor, driverStatusFilter]);

  const filteredCalibrations = useMemo(() => {
    const nSearch = normalizePlate(searchTerm);
    return (calibrations || []).filter(c => {
      const matchCd = selectedCd === 'all' || normalizeStr(c.cd || "") === normalizeStr(selectedCd);
      const matchContractor = selectedContractor === 'all' || normalizeStr(c.contractor || "") === normalizeStr(selectedContractor);
      const matchSearch = nSearch === '' || normalizePlate(c.plate).includes(nSearch) || c.equipment.includes(nSearch);
      return matchCd && matchContractor && matchSearch;
    });
  }, [calibrations, searchTerm, selectedCd, selectedContractor]);

  const filteredReports = useMemo(() => {
    const nSearch = normalizePlate(searchTerm);
    return (reports || []).filter(r => {
      const reportDate = new Date(r.date + 'T12:00:00');
      const matchMonth = reportDate.getMonth() === selectedReportMonth;
      const matchSearch = nSearch === '' || normalizePlate(r.plate).includes(nSearch);
      const matchCd = selectedCd === 'all' || normalizeStr(r.cd || "") === normalizeStr(selectedCd);
      return matchMonth && matchSearch && matchCd;
    }).sort((a, b) => new Date(b.date + 'T12:00:00').getTime() - new Date(a.date + 'T12:00:00').getTime());
  }, [reports, selectedReportMonth, searchTerm, selectedCd]);

  const reportStats = useMemo(() => {
    const total = filteredReports.length;
    const closed = filteredReports.filter(r => r.status === 'CERRADO').length;
    const percentage = total > 0 ? Math.round((closed / total) * 100) : 0;
    return { total, closed, open: total - closed, percentage };
  }, [filteredReports]);

  const filteredMileageLogs = useMemo(() => {
    return (mileageLogs || []).filter(log => {
      const matchWeek = extractNumber(log.week) === selectedWeek;
      const matchCd = selectedCd === 'all' || normalizeStr(log.cd || "") === normalizeStr(selectedCd);
      const matchContractor = selectedContractor === 'all' || normalizeStr(log.contractor || "") === normalizeStr(selectedContractor);
      const matchSearch = searchTerm === '' || normalizePlate(log.plate).includes(normalizePlate(searchTerm));
      return matchWeek && matchCd && matchContractor && matchSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [mileageLogs, selectedWeek, selectedCd, selectedContractor, searchTerm]);

  const mileageCompliance = useMemo(() => {
    const totalVehiclesInSection = (vehicles || []).filter(v => 
      selectedCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(selectedCd)
    ).length;
    const logsInWeek = (mileageLogs || []).filter(log => {
        const matchWeek = extractNumber(log.week) === selectedWeek;
        const matchCd = selectedCd === 'all' || normalizeStr(log.cd || "") === normalizeStr(selectedCd);
        return matchWeek && matchCd;
    });
    const uniqueDonePlates = new Set(logsInWeek.map(log => normalizePlate(log.plate))).size;
    const percentage = totalVehiclesInSection > 0 ? Math.round((uniqueDonePlates / totalVehiclesInSection) * 100) : 0;
    return { total: totalVehiclesInSection, done: uniqueDonePlates, percentage };
  }, [vehicles, mileageLogs, selectedWeek, selectedCd]);

  const filteredFiveS = useMemo(() => {
    return (fiveSReports || []).filter(f => {
      const matchCd = selectedCd === 'all' || normalizeStr(f.cd || "") === normalizeStr(selectedCd);
      const matchSearch = searchTerm === '' || normalizePlate(f.plate).includes(normalizePlate(searchTerm));
      return matchCd && matchSearch;
    });
  }, [fiveSReports, selectedCd, searchTerm]);

  const fiveSCompliance = useMemo(() => {
    const totalVehiclesInSection = (vehicles || []).filter(v => 
      selectedCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(selectedCd)
    ).length;
    const uniqueAuditedPlates = new Set((filteredFiveS || []).map(f => normalizePlate(f.plate))).size;
    const percentage = totalVehiclesInSection > 0 ? Math.round((uniqueAuditedPlates / totalVehiclesInSection) * 100) : 0;
    return { total: totalVehiclesInSection, audited: uniqueAuditedPlates, percentage };
  }, [vehicles, filteredFiveS, selectedCd]);

  const menuSections = [
    {
      id: 'DOCUMENTOS',
      icon: <FolderOpen size={16} />,
      items: [
        { id: 'vehiculos', icon: <Car size={14} />, label: 'Vehículos' },
        { id: 'conductores', icon: <Users size={14} />, label: 'Conductores' }
      ]
    },
    {
      id: 'NEUMATICOS',
      icon: <Scale size={16} />,
      items: [
        { id: 'calibraciones', icon: <Settings2 size={14} />, label: 'Neumáticos(Calibraciones)' }
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

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans text-slate-900 overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0f172a] transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 xl:relative xl:translate-x-0 shadow-2xl flex flex-col border-r border-white/5`}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-xl text-white flex shrink-0 ring-4 ring-white/5">
              <Truck size={22} />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tighter uppercase leading-tight">FLOTA BQA</h1>
              <p className="text-[8px] text-indigo-400 font-black uppercase tracking-[0.2em] opacity-70">SISTEMA INTEGRAL</p>
            </div>
          </div>
          
          <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar space-y-3">
            {menuSections.map((section) => (
              <div key={section.id} className="bg-white/5 rounded-2xl overflow-hidden border border-white/5 transition-all duration-300">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-4 py-4 text-white/70 hover:text-white transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg transition-colors ${openSectionId === section.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-slate-500 group-hover:text-indigo-400'}`}>
                      {section.icon}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">{section.id}</span>
                  </div>
                  {openSectionId === section.id ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                </button>
                
                <div className={`transition-all duration-300 ease-in-out ${openSectionId === section.id ? 'max-h-96 opacity-100 py-2' : 'max-h-0 opacity-0 overflow-hidden py-0'}`}>
                  <nav className="space-y-1 px-3 pb-2">
                    {section.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveView(item.id as ActiveView);
                          setSearchTerm('');
                          if (window.innerWidth < 1280) setIsSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[9px] font-black transition-all duration-200 ${activeView === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                      >
                        {item.icon}
                        <span className="uppercase tracking-widest leading-none">{item.label}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-auto pt-4 border-t border-white/10 px-2">
             <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl">
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-black text-[10px]">AD</div>
                <div>
                   <p className="text-[9px] font-black text-white uppercase tracking-tight leading-none mb-1">Gerencia BQA</p>
                   <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">CONTROL ACTIVO</p>
                </div>
             </div>
          </div>
        </div>
      </aside>

      <main className="flex-grow flex flex-col min-w-0 h-screen">
        <header className="z-30 bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="xl:hidden p-2 bg-slate-50 text-slate-600 rounded-lg"><Menu size={20} /></button>
            <div className="relative group">
              <div className="bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200 flex items-center gap-3 shadow-sm w-64 md:w-80 transition-all focus-within:border-indigo-400 focus-within:bg-white">
                <Search size={16} className="text-slate-400" />
                <input 
                  type="text" 
                  placeholder={activeView === 'conductores' ? "BUSCAR..." : "BUSCAR PLACA..."}
                  className="bg-transparent border-none text-[10px] font-black uppercase outline-none flex-grow tracking-widest" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value.toUpperCase())} 
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
               <span className="text-[9px] font-black uppercase tracking-widest">ONLINE</span>
             </div>
             <button onClick={handleSyncData} className={`p-2.5 ${isSyncing ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600 border border-slate-200'} rounded-xl transition-all`}>
               <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
             </button>
          </div>
        </header>

        <div className="flex-grow p-8 overflow-y-auto bg-[#f8fafc] custom-scrollbar">
          {/* FILTROS GLOBALES COMPACTOS */}
          <div className="max-w-[1600px] mx-auto mb-8 bg-white p-4 rounded-3xl border border-slate-200 shadow-lg flex flex-wrap items-center gap-4">
             <div className="flex items-center gap-3 border-r border-slate-100 pr-6">
               <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Filter size={16}/></div>
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filtros</span>
             </div>
             
             <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 cursor-pointer">
               <Building2 className="text-indigo-500 mr-2" size={16} />
               <select className="bg-transparent text-[10px] font-black uppercase outline-none cursor-pointer" value={selectedCd} onChange={(e) => setSelectedCd(e.target.value)}>
                 <option value="all">TODOS LOS C.D.</option>
                 {cds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
               </select>
             </div>

             <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 cursor-pointer">
               <UserCircle className="text-indigo-500 mr-2" size={16} />
               <select className="bg-transparent text-[10px] font-black uppercase outline-none cursor-pointer" value={selectedContractor} onChange={(e) => setSelectedContractor(e.target.value)}>
                 <option value="all">TODOS LOS CONTRATISTAS</option>
                 {contractors.map(cnt => <option key={cnt} value={cnt}>{cnt}</option>)}
               </select>
             </div>
          </div>

          {activeView === 'vehiculos' && (
            <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
              {/* PANEL VEHÍCULOS COMPACTO */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                 <button onClick={() => setVehicleStatusFilter('all')} className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border transition-all duration-300 ${vehicleStatusFilter === 'all' ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xl' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${vehicleStatusFilter === 'all' ? 'bg-indigo-600' : 'bg-indigo-50 text-indigo-600'}`}><Truck size={24} /></div>
                    <div className="text-center"><h4 className="text-3xl font-black tracking-tighter leading-none">{vehicleStats.total}</h4><p className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 ${vehicleStatusFilter === 'all' ? 'text-indigo-400' : 'text-slate-400'}`}>TODOS</p></div>
                 </button>
                 <button onClick={() => setVehicleStatusFilter('soat')} className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border transition-all duration-300 ${vehicleStatusFilter === 'soat' ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xl' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${vehicleStatusFilter === 'soat' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}><Shield size={24} /></div>
                    <div className="text-center"><h4 className="text-3xl font-black tracking-tighter leading-none">{vehicleStats.soat}</h4><p className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 ${vehicleStatusFilter === 'soat' ? 'text-blue-400' : 'text-slate-400'}`}>SOAT</p></div>
                 </button>
                 <button onClick={() => setVehicleStatusFilter('rtm')} className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border transition-all duration-300 ${vehicleStatusFilter === 'rtm' ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xl' : 'bg-white border-slate-200 hover:border-purple-300'}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${vehicleStatusFilter === 'rtm' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-600'}`}><Zap size={24} /></div>
                    <div className="text-center"><h4 className="text-3xl font-black tracking-tighter leading-none">{vehicleStats.rtm}</h4><p className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 ${vehicleStatusFilter === 'rtm' ? 'text-purple-400' : 'text-slate-400'}`}>RTM</p></div>
                 </button>
                 <button onClick={() => setVehicleStatusFilter('plc')} className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border transition-all duration-300 ${vehicleStatusFilter === 'plc' ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xl' : 'bg-white border-slate-200 hover:border-amber-300'}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${vehicleStatusFilter === 'plc' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600'}`}><FileText size={24} /></div>
                    <div className="text-center"><h4 className="text-3xl font-black tracking-tighter leading-none">{vehicleStats.plc}</h4><p className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 ${vehicleStatusFilter === 'plc' ? 'text-amber-400' : 'text-slate-400'}`}>PLC</p></div>
                 </button>
                 <button onClick={() => setVehicleStatusFilter('ext')} className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border transition-all duration-300 ${vehicleStatusFilter === 'ext' ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xl' : 'bg-white border-slate-200 hover:border-orange-300'}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${vehicleStatusFilter === 'ext' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-600'}`}><Flame size={24} /></div>
                    <div className="text-center"><h4 className="text-3xl font-black tracking-tighter leading-none">{vehicleStats.ext}</h4><p className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 ${vehicleStatusFilter === 'ext' ? 'text-orange-400' : 'text-slate-400'}`}>EXT</p></div>
                 </button>
              </div>

              {filteredVehicles.length > 0 ? filteredVehicles.map((vehicle) => (
                <div key={vehicle.id} ref={el => { vehicleRefs.current[vehicle.plate] = el; }} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-lg overflow-hidden flex flex-col xl:flex-row transition-all hover:border-indigo-300">
                  <div className="xl:w-[380px] bg-slate-50 p-10 flex flex-col justify-center items-center border-r border-slate-100 shrink-0">
                    <div className="w-full px-6 py-10 bg-[#0f172a] text-white rounded-3xl font-mono font-black text-5xl tracking-tighter shadow-xl text-center mb-8 border-8 border-white">{vehicle.plate}</div>
                    <div className="space-y-4 w-full px-2">
                       <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100"><MapPin size={18} className="text-indigo-500"/><div className="flex flex-col leading-none"><span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">C.D.</span><span className="text-xs font-black text-slate-800 uppercase">{vehicle.cd || 'GENERAL'}</span></div></div>
                       <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100"><Briefcase size={18} className="text-indigo-500"/><div className="flex flex-col leading-none"><span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Contratista</span><span className="text-xs font-black text-slate-800 uppercase truncate max-w-[150px]">{vehicle.contractor || 'GENERAL'}</span></div></div>
                    </div>
                  </div>
                  <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-6 flex-grow bg-white items-stretch">
                    <DocumentCard title="Propiedad" doc={{ expiryDate: '', lastRenewalDate: '', status: 'active', url: vehicle.propertyCardUrl }} icon={<Database />} onViewDoc={(url, title) => setViewerDoc({url, title})} />
                    <DocumentCard title="PLC" doc={vehicle.plc} icon={<ClipboardList />} onViewDoc={(url, title) => setViewerDoc({url, title})} />
                    <DocumentCard title="SOAT" doc={vehicle.soat} icon={<ShieldCheck />} onViewDoc={(url, title) => setViewerDoc({url, title})} />
                    <DocumentCard title="RTM" doc={vehicle.rtm} icon={<Gauge />} onViewDoc={(url, title) => setViewerDoc({url, title})} />
                    <DocumentCard title="Extintor" doc={vehicle.extinguisher} icon={<Plus />} onViewDoc={(url, title) => setViewerDoc({url, title})} />
                  </div>
                </div>
              )) : (
                <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200 opacity-40">
                  <Truck size={48} className="mx-auto mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Sin resultados</p>
                </div>
              )}
            </div>
          )}

          {activeView === 'conductores' && (
            <div className="space-y-8 animate-in fade-in duration-500 max-w-[1400px] mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <button onClick={() => setDriverStatusFilter('all')} className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border transition-all duration-300 ${driverStatusFilter === 'all' ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xl' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${driverStatusFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}><Users size={24} /></div>
                    <div className="text-center"><h4 className="text-3xl font-black tracking-tighter leading-none">{driverStats.total}</h4><p className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 ${driverStatusFilter === 'all' ? 'text-indigo-400' : 'text-slate-400'}`}>TOTAL</p></div>
                 </button>
                 <button onClick={() => setDriverStatusFilter('license')} className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border transition-all duration-300 ${driverStatusFilter === 'license' ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xl' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${driverStatusFilter === 'license' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}><CreditCard size={24} /></div>
                    <div className="text-center"><h4 className="text-3xl font-black tracking-tighter leading-none">{driverStats.license}</h4><p className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 ${driverStatusFilter === 'license' ? 'text-blue-400' : 'text-slate-400'}`}>LICENCIA</p></div>
                 </button>
                 <button onClick={() => setDriverStatusFilter('driving')} className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border transition-all duration-300 ${driverStatusFilter === 'driving' ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xl' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${driverStatusFilter === 'driving' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}><ShieldCheck size={24} /></div>
                    <div className="text-center"><h4 className="text-3xl font-black tracking-tighter leading-none">{driverStats.driving}</h4><p className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 ${driverStatusFilter === 'driving' ? 'text-indigo-400' : 'text-slate-400'}`}>CURSO</p></div>
                 </button>
                 <button onClick={() => setDriverStatusFilter('medical')} className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border transition-all duration-300 ${driverStatusFilter === 'medical' ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xl' : 'bg-white border-slate-200 hover:border-purple-300'}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${driverStatusFilter === 'medical' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-600'}`}><Stethoscope size={24} /></div>
                    <div className="text-center"><h4 className="text-3xl font-black tracking-tighter leading-none">{driverStats.medical}</h4><p className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 ${driverStatusFilter === 'medical' ? 'text-purple-400' : 'text-slate-400'}`}>EXÁMENES</p></div>
                 </button>
              </div>
              {filteredDrivers.length > 0 ? filteredDrivers.map(driver => (
                <DriverCard key={driver.id} driver={driver} onViewDoc={(url, title) => setViewerDoc({url, title})} />
              )) : (
                <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200 opacity-40">
                  <Users size={48} className="mx-auto mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Sin resultados</p>
                </div>
              )}
            </div>
          )}

          {activeView === 'kilometrajes' && (
            <div className="max-w-[1600px] mx-auto pb-24 space-y-8 animate-in fade-in duration-500">
               {/* PANEL ANALÍTICA KILOMETRAJES */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <button onClick={() => setMileageStatusFilter(prev => prev === 'completed' ? 'all' : 'completed')} className={`flex flex-col items-center justify-center gap-4 p-6 rounded-[2.5rem] border-2 transition-all duration-300 ${mileageStatusFilter === 'completed' ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-2xl' : 'bg-white border-slate-200 hover:border-emerald-300'}`}>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${mileageStatusFilter === 'completed' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600'}`}><ListChecks size={28} /></div>
                    <div className="text-center"><h4 className="text-5xl font-black tracking-tighter leading-none">{mileageCompliance.done}</h4><p className={`text-[10px] font-black uppercase tracking-widest mt-2 ${mileageStatusFilter === 'completed' ? 'text-emerald-400' : 'text-slate-400'}`}>REALIZADOS</p></div>
                  </button>
                  <button onClick={() => setMileageStatusFilter(prev => prev === 'pending' ? 'all' : 'pending')} className={`flex flex-col items-center justify-center gap-4 p-6 rounded-[2.5rem] border-2 transition-all duration-300 ${mileageStatusFilter === 'pending' ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-2xl' : 'bg-white border-slate-200 hover:border-rose-300'}`}>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${mileageStatusFilter === 'pending' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-600'}`}><Clock size={28} /></div>
                    <div className="text-center"><h4 className="text-5xl font-black tracking-tighter leading-none">{Math.max(0, mileageCompliance.total - mileageCompliance.done)}</h4><p className={`text-[10px] font-black uppercase tracking-widest mt-2 ${mileageStatusFilter === 'pending' ? 'text-rose-400' : 'text-slate-400'}`}>PENDIENTES</p></div>
                  </button>
                  <div className="bg-[#0f172a] p-6 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col justify-center border-2 border-indigo-500/20">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><Target size={100} /></div>
                    <div className="relative z-10">
                       <div className="flex items-center justify-between mb-4">
                          <div><h2 className="text-xl font-black uppercase tracking-tighter leading-none mb-1">Efectividad</h2><p className="text-indigo-400 font-bold text-[8px] uppercase tracking-widest">REPORTE SEMANAL</p></div>
                          <div className="bg-indigo-600 px-4 py-2 rounded-2xl"><span className="text-2xl font-black">{mileageCompliance.percentage}%</span></div>
                       </div>
                       <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden mb-4"><div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-1000" style={{width: `${mileageCompliance.percentage}%`}}></div></div>
                       <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400"><span>{mileageCompliance.done} / {mileageCompliance.total} UNIDADES</span><span className="text-emerald-400">ACTIVO</span></div>
                    </div>
                  </div>
               </div>

               <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg flex items-center justify-between">
                  <div className="flex items-center bg-indigo-600 text-white rounded-xl px-4 py-2 shadow-md">
                     <Calendar className="mr-2" size={16} />
                     <div className="flex flex-col"><span className="text-[7px] font-black uppercase tracking-widest opacity-80">Reporte</span><select className="bg-transparent text-[11px] font-black outline-none cursor-pointer" value={selectedWeek} onChange={(e) => setSelectedWeek(parseInt(e.target.value))}>{Array.from({length: 53}, (_, i) => i + 1).map(w => <option key={w} value={w} className="text-slate-800">SEMANA {String(w).padStart(2, '0')}</option>)}</select></div>
                  </div>
                  <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                     <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                     <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">KILOMETRAJE S{selectedWeek}</span>
                  </div>
               </div>

               <MileageEntryForm vehicles={vehicles} mileageLogs={mileageLogs} onSubmit={handleMileageSubmit} externalCd={selectedCd} setExternalCd={setSelectedCd} externalContractor={selectedContractor} setExternalContractor={setSelectedContractor} searchTerm={searchTerm} setSearchTerm={setSearchTerm} statusFilter={mileageStatusFilter} setStatusFilter={setMileageStatusFilter} selectedWeek={selectedWeek} onWeekChange={setSelectedWeek} />
            </div>
          )}

          {activeView === 'novedades' && (
            <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-[#0f172a] p-8 rounded-[2.5rem] text-white flex items-center gap-8 shadow-2xl">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90"><circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" /><circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={264} strokeDashoffset={264 - (264 * reportStats.percentage) / 100} className="text-indigo-400" strokeLinecap="round" /></svg>
                        <span className="absolute text-xl font-black">{reportStats.percentage}%</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-black uppercase tracking-tighter">Cumplimiento Cierre</h2>
                      <div className="flex gap-4 mt-4">
                         <div className="flex flex-col"><span className="text-[8px] text-slate-400 uppercase font-black">Totales</span><span className="text-lg font-black">{reportStats.total}</span></div>
                         <div className="flex flex-col"><span className="text-[8px] text-emerald-400 uppercase font-black">Cerradas</span><span className="text-lg font-black">{reportStats.closed}</span></div>
                         <div className="flex flex-col"><span className="text-[8px] text-rose-400 uppercase font-black">Pendientes</span><span className="text-lg font-black">{reportStats.open}</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 flex flex-col justify-center items-center shadow-lg">
                    <button onClick={() => setShowReportForm(true)} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"><Plus size={20} /> NUEVO REPORTE</button>
                  </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-16">
                  {filteredReports.length > 0 ? filteredReports.map(report => (<ReportCard key={report.id} report={report} onViewDoc={(url, title) => setViewerDoc({url, title})} onManageClosure={(r) => setClosureReport(r)} />)) : (<div className="col-span-full text-center py-24 opacity-40"><ClipboardList size={48} className="mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">Sin reportes</p></div>)}
               </div>
            </div>
          )}

          {activeView === '5s_camiones' && (
            <div className="space-y-8 animate-in fade-in duration-500 max-w-[1400px] mx-auto pb-24">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-emerald-600 p-8 rounded-[2.5rem] text-white flex items-center gap-8 shadow-2xl">
                     <div className="p-6 bg-white/10 rounded-3xl border border-white/20"><span className="text-4xl font-black">{fiveSCompliance.percentage}%</span></div>
                     <div><h2 className="text-xl font-black uppercase tracking-tighter">Cobertura Auditoría</h2><p className="text-[10px] font-black uppercase tracking-widest text-emerald-100">{fiveSCompliance.audited} de {fiveSCompliance.total} unidades auditadas</p></div>
                  </div>
                  <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 flex flex-col justify-center items-center shadow-lg">
                    <button onClick={() => setShowFiveSForm(true)} className="w-full py-5 bg-[#0f172a] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3"><Plus size={20} /> NUEVA AUDITORÍA</button>
                  </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredFiveS.length > 0 ? filteredFiveS.map(report => (<FiveSCard key={report.id} report={report} onViewDoc={(url, title) => setViewerDoc({url, title})} onManageClosure={(r) => setFiveSClosureReport(r)} />)) : (<div className="col-span-full py-24 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin registros 5S.</div>)}
               </div>
            </div>
          )}

          {activeView === 'calibraciones' && (
            <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                {filteredCalibrations.length > 0 ? filteredCalibrations.map((cal) => (
                  <CalibrationCard key={cal.id} calibration={cal} onViewDoc={(url, title) => setViewerDoc({url, title})} />
                )) : (
                  <div className="col-span-full text-center py-24 opacity-40">
                    <Scale size={48} className="mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Sin calibraciones</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {viewerDoc && <DocumentViewer url={viewerDoc.url} title={viewerDoc.title} onClose={() => setViewerDoc(null)} />}
      {showReportForm && <ReportForm vehicles={vehicles} onClose={() => setShowReportForm(false)} onSubmit={handleReportSubmit} />}
      {showFiveSForm && <FiveSForm vehicles={vehicles} preSelectedPlate={selectedPlateForFiveS} onClose={() => { setShowFiveSForm(false); setSelectedPlateForFiveS(undefined); }} onSubmit={handleFiveSSubmit} />}
      {closureReport && <ClosureForm report={closureReport} onClose={() => setClosureReport(null)} onSubmit={handleReportClosure} />}
      {fiveSClosureReport && <FiveSClosureForm report={fiveSClosureReport} onClose={() => setFiveSClosureReport(null)} onSubmit={handleFiveSClosure} />}
    </div>
  );
};

export default App;
