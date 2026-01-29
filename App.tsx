
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
import PublishingGuide from './components/PublishingGuide';
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
  Rocket,
  Clock,
  BarChart3
} from 'lucide-react';

type ActiveView = 'vehiculos' | 'conductores' | 'novedades' | 'kilometrajes' | '5s_camiones' | 'calibraciones';
type StatusFilter = 'all' | 'completed' | 'pending';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    try {
      return (localStorage.getItem('activeView') as ActiveView) || 'vehiculos';
    } catch (e) {
      return 'vehiculos';
    }
  });
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showPublishGuide, setShowPublishGuide] = useState(false);
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('expandedSections');
      return saved ? JSON.parse(saved) : { 'DOCUMENTOS': true, 'NEUMATICOS': true, 'GESTION': true };
    } catch (e) {
      return { 'DOCUMENTOS': true, 'NEUMATICOS': true, 'GESTION': true };
    }
  });
  
  const [selectedCd, setSelectedCd] = useState<string>(() => {
    try { return localStorage.getItem('selectedCd') || 'all'; } catch(e) { return 'all'; }
  });
  const [selectedContractor, setSelectedContractor] = useState<string>(() => {
    try { return localStorage.getItem('selectedContractor') || 'all'; } catch(e) { return 'all'; }
  });
  
  const [mileageStatusFilter, setMileageStatusFilter] = useState<StatusFilter>('all');
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
      localStorage.setItem('expandedSections', JSON.stringify(expandedSections));
    } catch (e) { /* ignore localStorage errors */ }
  }, [activeView, selectedCd, selectedContractor, expandedSections]);

  useEffect(() => {
    handleSyncData();
    if (window.innerWidth >= 1280) setIsSidebarOpen(true);
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
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

  const cds = useMemo(() => Array.from(new Set(vehicles.map(v => v.cd || 'GENERAL'))).sort(), [vehicles]);
  const contractors = useMemo(() => Array.from(new Set(vehicles.map(v => v.contractor || 'GENERAL'))).sort(), [vehicles]);

  const filteredVehicles = useMemo(() => {
    const nSearch = normalizePlate(searchTerm);
    return (vehicles || []).filter(v => {
      const matchCd = selectedCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(selectedCd);
      const matchContractor = selectedContractor === 'all' || normalizeStr(v.contractor || "") === normalizeStr(selectedContractor);
      const matchSearch = nSearch === '' || normalizePlate(v.plate).includes(nSearch);
      return matchCd && matchContractor && matchSearch;
    });
  }, [vehicles, searchTerm, selectedCd, selectedContractor]);

  const filteredDrivers = useMemo(() => {
    const s = searchTerm.toUpperCase().trim();
    return (drivers || []).filter(d => {
      const matchSearch = s === '' || d.name.toUpperCase().includes(s) || d.identification.includes(s);
      const matchCd = selectedCd === 'all' || normalizeStr(d.cd || "") === normalizeStr(selectedCd);
      const matchContractor = selectedContractor === 'all' || normalizeStr(d.contractor || "") === normalizeStr(selectedContractor);
      return matchSearch && matchCd && matchContractor;
    });
  }, [drivers, searchTerm, selectedCd, selectedContractor]);

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
    const totalVehiclesInSection = vehicles.filter(v => 
      selectedCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(selectedCd)
    ).length;
    const vehiclesWithLogs = new Set(filteredMileageLogs.map(log => normalizePlate(log.plate))).size;
    const percentage = totalVehiclesInSection > 0 ? Math.round((vehiclesWithLogs / totalVehiclesInSection) * 100) : 0;
    return { total: totalVehiclesInSection, done: vehiclesWithLogs, percentage };
  }, [vehicles, filteredMileageLogs, selectedCd]);

  const filteredFiveS = useMemo(() => {
    return (fiveSReports || []).filter(f => {
      const matchCd = selectedCd === 'all' || normalizeStr(f.cd || "") === normalizeStr(selectedCd);
      const matchSearch = searchTerm === '' || normalizePlate(f.plate).includes(normalizePlate(searchTerm));
      return matchCd && matchSearch;
    });
  }, [fiveSReports, selectedCd, searchTerm]);

  const fiveSCompliance = useMemo(() => {
    const totalVehiclesInSection = vehicles.filter(v => 
      selectedCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(selectedCd)
    ).length;
    const uniqueAuditedPlates = new Set(filteredFiveS.map(f => normalizePlate(f.plate))).size;
    const percentage = totalVehiclesInSection > 0 ? Math.round((uniqueAuditedPlates / totalVehiclesInSection) * 100) : 0;
    return { total: totalVehiclesInSection, audited: uniqueAuditedPlates, percentage };
  }, [vehicles, filteredFiveS, selectedCd]);

  const menuSections = [
    {
      id: 'DOCUMENTOS',
      icon: <FolderOpen size={18} />,
      items: [
        { id: 'vehiculos', icon: <Car size={16} />, label: 'Vehículos' },
        { id: 'conductores', icon: <Users size={16} />, label: 'Conductores' }
      ]
    },
    {
      id: 'NEUMATICOS',
      icon: <Scale size={18} />,
      items: [
        { id: 'calibraciones', icon: <Settings2 size={16} />, label: 'NEUMATICOS(CALIBRACIONES)' }
      ]
    },
    {
      id: 'GESTION',
      icon: <LayoutDashboard size={18} />,
      items: [
        { id: 'novedades', icon: <ClipboardList size={16} />, label: 'Novedades' },
        { id: 'kilometrajes', icon: <Gauge size={16} />, label: 'Kilometrajes' },
        { id: '5s_camiones', icon: <ShieldCheck size={16} />, label: '5S Camiones' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans text-slate-900 overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-50 w-80 bg-[#0f172a] transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 xl:relative xl:translate-x-0 shadow-2xl flex flex-col border-r border-white/5`}>
        <div className="p-8 flex flex-col h-full">
          <div className="flex items-center gap-4 mb-10 px-2">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-900/40 text-white flex shrink-0 ring-4 ring-white/5">
              <Truck size={28} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tighter uppercase leading-tight">FLOTA BQA</h1>
              <p className="text-[9px] text-indigo-400 font-black uppercase tracking-[0.2em] mt-1 opacity-70">SISTEMA INTEGRAL</p>
            </div>
          </div>
          
          <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-4">
            {menuSections.map((section) => (
              <div key={section.id} className="bg-white/5 rounded-3xl overflow-hidden border border-white/5 transition-all duration-300">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-6 py-5 text-white/70 hover:text-white transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl transition-colors ${expandedSections[section.id] ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/5 text-slate-500 group-hover:text-indigo-400'}`}>
                      {section.icon}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">{section.id}</span>
                  </div>
                  {expandedSections[section.id] ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                </button>
                
                <div className={`transition-all duration-300 ease-in-out ${expandedSections[section.id] ? 'max-h-96 opacity-100 py-3' : 'max-h-0 opacity-0 overflow-hidden py-0'}`}>
                  <nav className="space-y-1.5 px-4">
                    {section.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveView(item.id as ActiveView);
                          setSearchTerm('');
                          if (window.innerWidth < 1280) setIsSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black transition-all duration-200 ${activeView === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                      >
                        {item.icon}
                        <span className="uppercase tracking-widest leading-none">{item.label}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            ))}
            
            <button
              onClick={() => setShowPublishGuide(true)}
              className="w-full flex items-center gap-4 px-8 py-5 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-[0.2em] mt-8 hover:bg-indigo-500 hover:text-white transition-all group"
            >
              <Rocket size={18} className="group-hover:animate-bounce" />
              <span>Ayuda para Publicar App</span>
            </button>
          </div>
          
          <div className="mt-6 pt-6 border-t border-white/10 px-4">
             <div className="flex items-center gap-4 p-4 bg-white/5 rounded-[2rem]">
                <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-black text-xs">ADMIN</div>
                <div>
                   <p className="text-[10px] font-black text-white uppercase tracking-tight">Gerencia BQA</p>
                   <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">CONTROL ACTIVO</p>
                </div>
             </div>
          </div>
        </div>
      </aside>

      <main className="flex-grow flex flex-col min-w-0 h-screen">
        <header className="z-30 bg-white border-b border-slate-100 px-10 py-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(true)} className="xl:hidden p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-indigo-50 transition-all"><Menu size={24} /></button>
            <div className="relative group">
              <div className="bg-slate-50 rounded-2xl px-6 py-4 border-2 border-slate-100 flex items-center gap-4 shadow-sm w-80 md:w-96 transition-all focus-within:border-indigo-500 focus-within:bg-white focus-within:shadow-xl">
                <Search size={20} className="text-slate-400 group-focus-within:text-indigo-600" />
                <input 
                  type="text" 
                  placeholder={activeView === 'conductores' ? "BUSCAR NOMBRE O CC..." : "BUSCAR PLACA..."}
                  className="bg-transparent border-none text-xs font-black uppercase outline-none flex-grow tracking-[0.2em]" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value.toUpperCase())} 
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-3 px-5 py-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 shadow-sm">
               <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-100"></div>
               <span className="text-[10px] font-black uppercase tracking-widest">CONECTADO</span>
             </div>
             <button onClick={handleSyncData} className={`p-4 ${isSyncing ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600 border border-slate-200'} rounded-2xl transition-all hover:scale-105 active:scale-95`}>
               <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
             </button>
          </div>
        </header>

        <div className="flex-grow p-10 overflow-y-auto bg-[#f8fafc]">
          {/* FILTROS GLOBALES */}
          <div className="max-w-[1600px] mx-auto mb-10 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-wrap items-center gap-8">
             <div className="flex items-center gap-3 border-r border-slate-100 pr-8">
               <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Filter size={20}/></div>
               <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Filtrar Flota</span>
             </div>
             
             <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-2.5 hover:border-indigo-300 transition-all cursor-pointer">
               <Building2 className="text-indigo-500 mr-3" size={18} />
               <select className="bg-transparent text-[11px] font-black uppercase outline-none cursor-pointer" value={selectedCd} onChange={(e) => setSelectedCd(e.target.value)}>
                 <option value="all">TODOS LOS C.D. (SECCIÓN)</option>
                 {cds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
               </select>
             </div>

             <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-2.5 hover:border-indigo-300 transition-all cursor-pointer">
               <UserCircle className="text-indigo-500 mr-3" size={18} />
               <select className="bg-transparent text-[11px] font-black uppercase outline-none cursor-pointer" value={selectedContractor} onChange={(e) => setSelectedContractor(e.target.value)}>
                 <option value="all">TODOS LOS CONTRATISTAS</option>
                 {contractors.map(cnt => <option key={cnt} value={cnt}>{cnt}</option>)}
               </select>
             </div>
          </div>

          {activeView === 'vehiculos' && (
            <div className="space-y-12 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
              {filteredVehicles.length > 0 ? filteredVehicles.map((vehicle) => (
                <div key={vehicle.id} ref={el => { vehicleRefs.current[vehicle.plate] = el; }} className="bg-white rounded-[3.5rem] border-2 border-slate-100 shadow-xl overflow-hidden flex flex-col xl:flex-row transition-all hover:border-indigo-200">
                  <div className="xl:w-[480px] bg-slate-50/50 p-12 flex flex-col justify-center items-center border-r border-slate-100 shrink-0 relative overflow-hidden">
                    <div className="absolute -top-20 -left-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl"></div>
                    <div className="relative z-10 w-full flex flex-col items-center">
                      <div className="w-full px-8 py-12 bg-[#0f172a] text-white rounded-[3rem] font-mono font-black text-6xl tracking-tighter shadow-2xl text-center mb-10 border-[12px] border-white ring-1 ring-slate-100">
                        {vehicle.plate}
                      </div>
                      <div className="space-y-6 w-full max-w-[320px]">
                         <div className="flex items-center gap-5 bg-white p-5 rounded-[1.8rem] shadow-sm border border-slate-100 transition-all hover:shadow-md">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><MapPin size={22}/></div>
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CD Asignado</span>
                              <span className="text-sm font-black text-slate-800 uppercase">{vehicle.cd || 'ARENOSA'}</span>
                            </div>
                         </div>
                         <div className="flex items-center gap-5 bg-white p-5 rounded-[1.8rem] shadow-sm border border-slate-100 transition-all hover:shadow-md">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Briefcase size={22}/></div>
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contratista</span>
                              <span className="text-sm font-black text-slate-800 uppercase truncate max-w-[200px]">{vehicle.contractor || 'GENERAL'}</span>
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-8 flex-grow bg-white items-stretch">
                    <DocumentCard title="Propiedad" doc={{ expiryDate: '', lastRenewalDate: '', status: 'active', url: vehicle.propertyCardUrl }} icon={<Database />} onViewDoc={(url, title) => setViewerDoc({url, title})} />
                    <DocumentCard title="PLC" doc={vehicle.plc} icon={<ClipboardList />} onViewDoc={(url, title) => setViewerDoc({url, title})} />
                    <DocumentCard title="SOAT" doc={vehicle.soat} icon={<ShieldCheck />} onViewDoc={(url, title) => setViewerDoc({url, title})} />
                    <DocumentCard title="RTM" doc={vehicle.rtm} icon={<Gauge />} onViewDoc={(url, title) => setViewerDoc({url, title})} />
                    <DocumentCard title="Extintor" doc={vehicle.extinguisher} icon={<Plus />} onViewDoc={(url, title) => setViewerDoc({url, title})} />
                  </div>
                </div>
              )) : (
                <div className="text-center py-40 bg-white rounded-[3.5rem] border-2 border-dashed border-slate-100 shadow-inner opacity-40">
                  <Truck size={64} className="mx-auto mb-6" />
                  <p className="text-sm font-black uppercase tracking-[0.4em]">Sin vehículos registrados</p>
                </div>
              )}
            </div>
          )}

          {activeView === 'conductores' && (
            <div className="space-y-10 animate-in fade-in duration-500 max-w-[1400px] mx-auto">
              {filteredDrivers.length > 0 ? filteredDrivers.map(driver => (
                <DriverCard key={driver.id} driver={driver} onViewDoc={(url, title) => setViewerDoc({url, title})} />
              )) : (
                <div className="text-center py-40 bg-white rounded-[3.5rem] border-2 border-dashed border-slate-100 shadow-inner opacity-40">
                  <Users size={64} className="mx-auto mb-6" />
                  <p className="text-sm font-black uppercase tracking-[0.4em]">Sin conductores registrados</p>
                </div>
              )}
            </div>
          )}

          {activeView === 'calibraciones' && (
            <div className="space-y-12 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 pb-12">
                {filteredCalibrations.length > 0 ? filteredCalibrations.map((cal) => (
                  <CalibrationCard key={cal.id} calibration={cal} onViewDoc={(url, title) => setViewerDoc({url, title})} />
                )) : (
                  <div className="col-span-full text-center py-40 opacity-40">
                    <Scale size={64} className="mx-auto mb-6" />
                    <p className="text-sm font-black uppercase tracking-[0.4em]">Sin calibraciones registradas</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'novedades' && (
            <div className="space-y-12 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-[#0f172a] p-10 rounded-[3rem] text-white flex items-center gap-10 shadow-2xl">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                           <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/10" />
                           <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={364} strokeDashoffset={364 - (364 * reportStats.percentage) / 100} className="text-indigo-400" strokeLinecap="round" />
                        </svg>
                        <span className="absolute text-2xl font-black">{reportStats.percentage}%</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-black uppercase tracking-tighter">Cumplimiento de Cierre</h2>
                      <p className="text-indigo-400 font-bold uppercase tracking-widest text-[10px] mb-4">Efectividad técnica del mes</p>
                      <div className="flex gap-6">
                         <div className="flex flex-col"><span className="text-[10px] text-slate-400 uppercase font-black">Totales</span><span className="text-xl font-black">{reportStats.total}</span></div>
                         <div className="flex flex-col"><span className="text-[10px] text-emerald-400 uppercase font-black">Cerradas</span><span className="text-xl font-black">{reportStats.closed}</span></div>
                         <div className="flex flex-col"><span className="text-[10px] text-rose-400 uppercase font-black">Pendientes</span><span className="text-xl font-black">{reportStats.open}</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 flex flex-col justify-center items-center shadow-xl">
                    <button onClick={() => setShowReportForm(true)} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-4">
                        <Plus size={24} /> NUEVO REPORTE
                    </button>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 pb-16">
                  {filteredReports.length > 0 ? filteredReports.map(report => (
                    <ReportCard key={report.id} report={report} onViewDoc={(url, title) => setViewerDoc({url, title})} onManageClosure={(r) => setClosureReport(r)} />
                  )) : (
                    <div className="col-span-full text-center py-40 opacity-40">
                      <ClipboardList size={64} className="mx-auto mb-6" />
                      <p className="text-sm font-black uppercase tracking-[0.4em]">Sin reportes registrados</p>
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeView === 'kilometrajes' && (
            <div className="max-w-[1600px] mx-auto pb-24 space-y-10">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-[#0f172a] p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-10"><BarChart3 size={120} /></div>
                    <div className="relative z-10 flex items-center gap-10">
                       <div className="bg-indigo-500 p-8 rounded-[2.5rem] shadow-2xl">
                          <span className="text-5xl font-black">{mileageCompliance.percentage}%</span>
                       </div>
                       <div>
                          <h2 className="text-2xl font-black uppercase tracking-tighter">Cumplimiento de Registro</h2>
                          <p className="text-indigo-400 font-bold uppercase tracking-widest text-[10px] mb-6">Semana actual de reporte</p>
                          <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden border border-white/5 mb-4">
                             <div className="h-full bg-indigo-400 rounded-full transition-all duration-1000" style={{width: `${mileageCompliance.percentage}%`}}></div>
                          </div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{mileageCompliance.done} de {mileageCompliance.total} camiones reportados</p>
                       </div>
                    </div>
                  </div>
                  <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col justify-center items-center text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Semana Seleccionada</p>
                    <span className="text-5xl font-black text-indigo-600">S-{selectedWeek}</span>
                  </div>
               </div>

               <MileageEntryForm 
                  vehicles={vehicles} 
                  mileageLogs={mileageLogs} 
                  onSubmit={handleMileageSubmit} 
                  externalCd={selectedCd} 
                  setExternalCd={setSelectedCd} 
                  externalContractor={selectedContractor} 
                  setExternalContractor={setSelectedContractor} 
                  searchTerm={searchTerm} 
                  setSearchTerm={setSearchTerm} 
                  statusFilter={mileageStatusFilter} 
                  setStatusFilter={setMileageStatusFilter} 
                  selectedWeek={selectedWeek} 
                  onWeekChange={setSelectedWeek} 
               />
               
               <div className="mt-12 bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between mb-8">
                     <h2 className="text-2xl font-black uppercase tracking-tighter">Historial de Registros</h2>
                     <ExportButton data={filteredMileageLogs} filename="KILOMETRAJES" title="Exportar CSV" />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-y-4">
                        <thead>
                          <tr className="text-slate-400">
                            <th className="py-2 px-8 text-[10px] font-black uppercase tracking-widest">Fecha</th>
                            <th className="py-2 px-8 text-[10px] font-black uppercase tracking-widest">Placa</th>
                            <th className="py-2 px-8 text-[10px] font-black uppercase tracking-widest text-right">Kilometraje</th>
                            <th className="py-2 px-8 text-[10px] font-black uppercase tracking-widest">Sección</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(filteredMileageLogs || []).map((log, idx) => (
                            <tr key={idx} className="bg-slate-50/50 hover:bg-white hover:shadow-xl transition-all group rounded-[2rem]">
                              <td className="py-6 px-8 rounded-l-[2rem]">
                                <span className="text-[11px] font-bold text-slate-500">{formatDate(log.date)}</span>
                              </td>
                              <td className="py-6 px-8">
                                <span className="px-5 py-2 bg-[#0f172a] text-white rounded-2xl font-mono font-black text-sm tracking-tighter">{log.plate}</span>
                              </td>
                              <td className="py-6 px-8 text-right">
                                <span className="text-2xl font-black text-indigo-600 tracking-tighter">{log.mileage.toLocaleString()} KM</span>
                              </td>
                              <td className="py-6 px-8 rounded-r-[2rem]">
                                <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{log.cd}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                  </div>
               </div>
            </div>
          )}

          {activeView === '5s_camiones' && (
            <div className="space-y-12 animate-in fade-in duration-500 max-w-[1400px] mx-auto pb-24">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-emerald-600 p-10 rounded-[3rem] text-white flex items-center gap-10 shadow-2xl">
                     <div className="p-8 bg-white/10 rounded-[2.5rem] border border-white/20">
                        <span className="text-6xl font-black">{fiveSCompliance.percentage}%</span>
                     </div>
                     <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter">Cobertura de Auditoría</h2>
                        <p className="text-emerald-100 font-bold uppercase tracking-widest text-[10px] mb-4">Alcance de inspecciones 5S</p>
                        <div className="flex items-center gap-3">
                           <ShieldCheck size={20} className="text-emerald-200" />
                           <span className="text-[11px] font-black uppercase tracking-widest">{fiveSCompliance.audited} de {fiveSCompliance.total} camiones auditados</span>
                        </div>
                     </div>
                  </div>
                  <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 flex flex-col justify-center items-center shadow-xl">
                    <button onClick={() => setShowFiveSForm(true)} className="w-full py-6 bg-[#0f172a] text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3">
                        <Plus size={24} /> NUEVA AUDITORÍA
                    </button>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                  {filteredFiveS.length > 0 ? filteredFiveS.map(report => (
                    <FiveSCard key={report.id} report={report} onViewDoc={(url, title) => setViewerDoc({url, title})} onManageClosure={(r) => setFiveSClosureReport(r)} />
                  )) : (
                    <div className="col-span-full py-40 text-center text-sm font-black text-slate-400 uppercase tracking-[0.3em]">No hay auditorías registradas en esta sección.</div>
                  )}
               </div>
            </div>
          )}
        </div>
      </main>

      {showPublishGuide && <PublishingGuide onClose={() => setShowPublishGuide(false)} />}
      {viewerDoc && <DocumentViewer url={viewerDoc.url} title={viewerDoc.title} onClose={() => setViewerDoc(null)} />}
      {showReportForm && <ReportForm vehicles={vehicles} onClose={() => setShowReportForm(false)} onSubmit={handleReportSubmit} />}
      {showFiveSForm && <FiveSForm vehicles={vehicles} preSelectedPlate={selectedPlateForFiveS} onClose={() => { setShowFiveSForm(false); setSelectedPlateForFiveS(undefined); }} onSubmit={handleFiveSSubmit} />}
      {closureReport && <ClosureForm report={closureReport} onClose={() => setClosureReport(null)} onSubmit={handleReportClosure} />}
      {fiveSClosureReport && <FiveSClosureForm report={fiveSClosureReport} onClose={() => setFiveSClosureReport(null)} onSubmit={handleFiveSClosure} />}
    </div>
  );
};

export default App;
