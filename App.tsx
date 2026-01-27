
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
import { formatDate, getWeekNumber, normalizePlate, extractNumber, normalizeStr, monthMatches } from './utils';
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
  Activity,
  CheckCircle2,
  Clock,
  TrendingUp,
  Search,
  UserCircle,
  ShieldCheck,
  AlertCircle,
  LayoutDashboard,
  CalendarDays,
  Building2,
  Filter,
  MapPin,
  Briefcase,
  FileSpreadsheet,
  Scale
} from 'lucide-react';

type ActiveView = 'vehiculos' | 'conductores' | 'novedades' | 'kilometrajes' | '5s_camiones' | 'calibraciones';
type StatusFilter = 'all' | 'completed' | 'pending';

const MONTHS = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYOS", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
];

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>('vehiculos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedCd, setSelectedCd] = useState<string>('all');
  const [selectedContractor, setSelectedContractor] = useState<string>('all');
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
    handleSyncData();
    if (window.innerWidth >= 1280) setIsSidebarOpen(true);
  }, []);

  const handleSyncData = async () => {
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
    return vehicles.filter(v => {
      const matchCd = selectedCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(selectedCd);
      const matchContractor = selectedContractor === 'all' || normalizeStr(v.contractor || "") === normalizeStr(selectedContractor);
      const matchSearch = nSearch === '' || normalizePlate(v.plate).includes(nSearch);
      return matchCd && matchContractor && matchSearch;
    });
  }, [vehicles, searchTerm, selectedCd, selectedContractor]);

  const filteredDrivers = useMemo(() => {
    const s = searchTerm.toUpperCase().trim();
    return drivers.filter(d => {
      const matchSearch = s === '' || d.name.toUpperCase().includes(s) || d.identification.includes(s);
      const matchCd = selectedCd === 'all' || normalizeStr(d.cd || "") === normalizeStr(selectedCd);
      const matchContractor = selectedContractor === 'all' || normalizeStr(d.contractor || "") === normalizeStr(selectedContractor);
      return matchSearch && matchCd && matchContractor;
    });
  }, [drivers, searchTerm, selectedCd, selectedContractor]);

  const filteredCalibrations = useMemo(() => {
    const nSearch = normalizePlate(searchTerm);
    return calibrations.filter(c => {
      const matchCd = selectedCd === 'all' || normalizeStr(c.cd || "") === normalizeStr(selectedCd);
      const matchContractor = selectedContractor === 'all' || normalizeStr(c.contractor || "") === normalizeStr(selectedContractor);
      const matchSearch = nSearch === '' || normalizePlate(c.plate).includes(nSearch) || c.equipment.includes(nSearch);
      return matchCd && matchContractor && matchSearch;
    });
  }, [calibrations, searchTerm, selectedCd, selectedContractor]);

  const filteredReports = useMemo(() => {
    const nSearch = normalizePlate(searchTerm);
    return reports.filter(r => {
      const reportDate = new Date(r.date + 'T12:00:00');
      const matchMonth = reportDate.getMonth() === selectedReportMonth;
      const matchSearch = nSearch === '' || normalizePlate(r.plate).includes(nSearch);
      
      const vehicle = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(r.plate));
      const matchCd = selectedCd === 'all' || (vehicle && normalizeStr(vehicle.cd || "") === normalizeStr(selectedCd));
      const matchContractor = selectedContractor === 'all' || (vehicle && normalizeStr(vehicle.contractor || "") === normalizeStr(selectedContractor));
      
      return matchMonth && matchSearch && matchCd && matchContractor;
    }).sort((a, b) => new Date(b.date + 'T12:00:00').getTime() - new Date(a.date + 'T12:00:00').getTime());
  }, [reports, selectedReportMonth, searchTerm, selectedCd, selectedContractor, vehicles]);

  const mileageStats = useMemo(() => {
    const contextVehicles = vehicles.filter(v => {
      const matchCd = selectedCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(selectedCd);
      const matchContractor = selectedContractor === 'all' || normalizeStr(v.contractor || "") === normalizeStr(selectedContractor);
      return matchCd && matchContractor;
    });
    const total = contextVehicles.length;
    const completed = contextVehicles.filter(v => {
      const vPlate = normalizePlate(v.plate);
      return (mileageLogs || []).some(l => normalizePlate(l.plate) === vPlate && extractNumber(l.week) === selectedWeek);
    }).length;
    const pending = Math.max(0, total - completed);
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, percentage };
  }, [vehicles, mileageLogs, selectedWeek, selectedCd, selectedContractor]);

  const filteredMileageLogs = useMemo(() => {
    return (mileageLogs || []).filter(log => {
      const matchWeek = extractNumber(log.week) === selectedWeek;
      const matchCd = selectedCd === 'all' || normalizeStr(log.cd || "") === normalizeStr(selectedCd);
      const matchContractor = selectedContractor === 'all' || normalizeStr(log.contractor || "") === normalizeStr(selectedContractor);
      const matchSearch = searchTerm === '' || normalizePlate(log.plate).includes(normalizePlate(searchTerm));
      return matchWeek && matchCd && matchContractor && matchSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [mileageLogs, selectedWeek, selectedCd, selectedContractor, searchTerm]);

  const reportStats = useMemo(() => {
    const total = filteredReports.length;
    const closed = filteredReports.filter(r => r.status === 'CERRADO').length;
    const open = total - closed;
    const percentage = total > 0 ? Math.round((closed / total) * 100) : 0;
    return { total, closed, open, percentage };
  }, [filteredReports]);

  const calibrationStats = useMemo(() => {
    const total = filteredCalibrations.length;
    const active = filteredCalibrations.filter(c => c.status === 'active').length;
    const warning = filteredCalibrations.filter(c => c.status === 'warning').length;
    const expired = filteredCalibrations.filter(c => c.status === 'expired').length;
    return { total, active, warning, expired };
  }, [filteredCalibrations]);

  const fiveSStats = useMemo(() => {
    const contextVehicles = vehicles.filter(v => {
      const matchCd = selectedCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(selectedCd);
      const matchContractor = selectedContractor === 'all' || normalizeStr(v.contractor || "") === normalizeStr(selectedContractor);
      return matchCd && matchContractor;
    });
    const totalInBase = contextVehicles.length;
    
    const currentMonthReports = fiveSReports.filter(f => {
      const matchMonth = (f.month && monthMatches(f.month, selectedReportMonth, MONTHS)) || 
                         (f.date && new Date(f.date + 'T12:00:00').getMonth() === selectedReportMonth);
      
      const vehicle = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(f.plate));
      const matchCd = selectedCd === 'all' || (vehicle && normalizeStr(vehicle.cd || "") === normalizeStr(selectedCd));
      const matchContractor = selectedContractor === 'all' || (vehicle && normalizeStr(vehicle.contractor || "") === normalizeStr(selectedContractor));
      
      return matchMonth && matchCd && matchContractor;
    });

    const realizedPlatesThisMonth = new Set(currentMonthReports.map(f => normalizePlate(f.plate)));
    const totalRealized = contextVehicles.filter(v => realizedPlatesThisMonth.has(normalizePlate(v.plate))).length;
    const coveragePercentage = totalInBase > 0 ? Math.round((totalRealized / totalInBase) * 100) : 0;
    
    const totalFindings = currentMonthReports.length;
    const closedFindings = currentMonthReports.filter(f => f.status === 'CERRADO').length;
    const resolutionPercentage = totalFindings > 0 ? Math.round((closedFindings / totalFindings) * 100) : 0;
    
    const openHallazgos = currentMonthReports.filter(f => f.status === 'ABIERTO');

    return { totalInBase, totalRealized, coveragePercentage, totalFindings, openFindings: totalFindings - closedFindings, closedFindings, resolutionPercentage, openHallazgos };
  }, [vehicles, fiveSReports, selectedReportMonth, selectedCd, selectedContractor]);

  const coverageByCd = useMemo(() => {
    return cds.map(cd => {
      const vehiclesInCd = vehicles.filter(v => normalizeStr(v.cd || "") === normalizeStr(cd));
      const total = vehiclesInCd.length;
      const realizedPlates = new Set(
        fiveSReports
          .filter(f => {
            const matchMonth = (f.month && monthMatches(f.month, selectedReportMonth, MONTHS)) || 
                               (f.date && new Date(f.date + 'T12:00:00').getMonth() === selectedReportMonth);
            if (!matchMonth) return false;
            const vehicle = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(f.plate));
            return vehicle && normalizeStr(vehicle.cd || "") === normalizeStr(cd);
          })
          .map(f => normalizePlate(f.plate))
      );
      const realized = vehiclesInCd.filter(v => realizedPlates.has(normalizePlate(v.plate))).length;
      const percentage = total > 0 ? Math.round((realized / total) * 100) : 0;
      return { cd, total, realized, percentage };
    });
  }, [cds, vehicles, fiveSReports, selectedReportMonth]);

  const scrollToVehicle = (plate: string) => {
    setSearchTerm(plate);
    const element = vehicleRefs.current[plate];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans text-slate-900">
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0f172a] transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 xl:relative xl:translate-x-0 shadow-2xl`}>
        <div className="h-full flex flex-col p-8">
          <div className="flex items-center gap-4 mb-12 px-2">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/40 text-white"><Truck size={28} /></div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tighter uppercase leading-none">FLOTA BQA</h1>
              <p className="text-[9px] text-indigo-400 font-black uppercase tracking-[0.2em] mt-2">GERENCIA CONTROL</p>
            </div>
          </div>
          <nav className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            {[
              { id: 'vehiculos', icon: <Car size={22} />, label: 'Vehículos' },
              { id: 'conductores', icon: <Users size={22} />, label: 'Conductores' },
              { id: 'calibraciones', icon: <Scale size={22} />, label: 'NEUMATICOS(CALIBRACIONES)' },
              { id: 'kilometrajes', icon: <Gauge size={22} />, label: 'Kilometrajes' },
              { id: 'novedades', icon: <ClipboardList size={22} />, label: 'Novedades' },
              { id: '5s_camiones', icon: <ShieldCheck size={22} />, label: '5S Camiones' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id as ActiveView);
                  setSearchTerm('');
                  if (window.innerWidth < 1280) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-6 py-5 rounded-3xl text-sm font-black transition-all duration-300 ${activeView === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/50 scale-[1.02]' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
              >
                {item.icon}
                <span className="uppercase tracking-widest text-[11px]">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <main className="flex-grow flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="z-30 bg-white border-b border-slate-100 px-10 py-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(true)} className="xl:hidden p-2 text-slate-600"><Menu size={24} /></button>
            <div className="relative group">
              <div className="bg-slate-50 rounded-2xl px-6 py-4 border-2 border-slate-100 flex items-center gap-4 shadow-sm w-80 md:w-96 transition-all focus-within:border-indigo-500 focus-within:bg-white focus-within:shadow-xl">
                <Search size={20} className="text-slate-400 group-focus-within:text-indigo-600" />
                <input 
                  type="text" 
                  placeholder={activeView === 'conductores' ? "BUSCAR POR NOMBRE O CC..." : "BUSCAR PLACA..."}
                  className="bg-transparent border-none text-xs font-black uppercase outline-none flex-grow tracking-[0.2em]" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value.toUpperCase())} 
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
               <span className="text-[9px] font-black uppercase tracking-widest">Base de Datos En Línea</span>
             </div>
             <button onClick={handleSyncData} className={`p-4 ${isSyncing ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600 border border-slate-200'} rounded-2xl transition-all`}>
               <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
             </button>
          </div>
        </header>

        <div className="flex-grow p-10 overflow-y-auto bg-slate-50/30">
          
          {activeView !== 'novedades' && (
            <div className="max-w-[1600px] mx-auto mb-8 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-6">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Filter size={18}/></div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filtrar Flota:</span>
               </div>
               
               <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 hover:border-indigo-300 transition-all">
                 <Building2 className="text-indigo-500 mr-3" size={16} />
                 <select className="bg-transparent text-[11px] font-black uppercase outline-none" value={selectedCd} onChange={(e) => setSelectedCd(e.target.value)}>
                   <option value="all">TODOS LOS C.D.</option>
                   {cds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                 </select>
               </div>

               <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 hover:border-indigo-300 transition-all">
                 <UserCircle className="text-indigo-500 mr-3" size={16} />
                 <select className="bg-transparent text-[11px] font-black uppercase outline-none" value={selectedContractor} onChange={(e) => setSelectedContractor(e.target.value)}>
                   <option value="all">TODOS LOS CONTRATISTAS</option>
                   {contractors.map(cnt => <option key={cnt} value={cnt}>{cnt}</option>)}
                 </select>
               </div>
            </div>
          )}

          {activeView === 'vehiculos' && (
            <div className="space-y-12 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
              <div className="space-y-10">
                {filteredVehicles.length > 0 ? filteredVehicles.map((vehicle) => (
                  <div key={vehicle.id} ref={el => { vehicleRefs.current[vehicle.plate] = el; }} className="bg-white rounded-[3rem] border-2 border-slate-100 shadow-xl overflow-hidden flex flex-col xl:flex-row transition-all hover:border-indigo-200">
                    <div className="xl:w-[450px] bg-slate-50/50 p-12 flex flex-col justify-center items-center border-r border-slate-100 shrink-0 relative overflow-hidden">
                      <div className="absolute -top-20 -left-20 w-60 h-60 bg-indigo-500/5 rounded-full blur-3xl"></div>
                      
                      <div className="relative z-10 w-full flex flex-col items-center">
                        <div className="w-full px-8 py-10 bg-[#0f172a] text-white rounded-[3rem] font-mono font-black text-5xl tracking-tighter shadow-2xl text-center mb-8 border-[10px] border-white ring-1 ring-slate-100">
                          {vehicle.plate}
                        </div>
                        
                        <div className="space-y-6 w-full max-w-[280px]">
                           <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><MapPin size={18}/></div>
                              <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Centro de Operación</span>
                                <span className="text-xs font-black text-slate-800 uppercase">{vehicle.cd || 'SIN ASIGNAR'}</span>
                              </div>
                           </div>
                           <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Briefcase size={18}/></div>
                              <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Contratista Responsable</span>
                                <span className="text-xs font-black text-slate-800 uppercase truncate max-w-[180px]">{vehicle.contractor || 'OPERACIÓN GENERAL'}</span>
                              </div>
                           </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-6 flex-grow bg-white">
                      <DocumentCard title="Propiedad" doc={{ expiryDate: '', lastRenewalDate: '', status: 'active', url: vehicle.propertyCardUrl }} icon={<Database />} onViewDoc={(url, title) => setViewerDoc({url, title})} />
                      <DocumentCard title="PLC" doc={vehicle.plc} icon={<ClipboardList />} onViewDoc={(url, title) => setViewerDoc({url, title})} />
                      <DocumentCard title="SOAT" doc={vehicle.soat} icon={<ShieldCheck />} onViewDoc={(url, title) => setViewerDoc({url, title})} />
                      <DocumentCard title="RTM" doc={vehicle.rtm} icon={<Gauge />} onViewDoc={(url, title) => setViewerDoc({url, title})} />
                      <DocumentCard title="Extintor" doc={vehicle.extinguisher} icon={<Plus />} onViewDoc={(url, title) => setViewerDoc({url, title})} />
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-40 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                    <Truck size={64} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-sm font-black text-slate-400 uppercase tracking-[0.4em]">No se encontraron vehículos registrados</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'conductores' && (
            <div className="space-y-10 animate-in fade-in duration-500 max-w-[1400px] mx-auto">
              {filteredDrivers.length > 0 ? filteredDrivers.map(driver => (
                <DriverCard key={driver.id} driver={driver} onViewDoc={(url, title) => setViewerDoc({url, title})} />
              )) : (
                <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                  <UserCircle size={64} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-sm font-black text-slate-400 uppercase tracking-[0.4em]">No se encontraron conductores con estos filtros</p>
                </div>
              )}
            </div>
          )}

          {activeView === 'calibraciones' && (
            <div className="space-y-12 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
              {/* Dashboard de Calibraciones */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="bg-[#0f172a] rounded-[2.5rem] p-8 text-white flex flex-col justify-center items-center text-center shadow-xl border-4 border-white/5">
                   <Scale size={32} className="text-indigo-400 mb-3" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Equipos</span>
                   <p className="text-4xl font-black">{calibrationStats.total}</p>
                </div>
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl flex flex-col justify-center items-center text-center">
                   <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3"><CheckCircle2 size={24}/></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Vigentes</span>
                   <p className="text-3xl font-black text-emerald-600">{calibrationStats.active}</p>
                </div>
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl flex flex-col justify-center items-center text-center">
                   <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-3"><Clock size={24}/></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Por Vencer</span>
                   <p className="text-3xl font-black text-amber-600">{calibrationStats.warning}</p>
                </div>
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl flex flex-col justify-center items-center text-center">
                   <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-3"><AlertCircle size={24}/></div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Vencidos</span>
                   <p className="text-3xl font-black text-rose-600">{calibrationStats.expired}</p>
                </div>
              </div>

              {/* Título de Sección */}
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl">
                   <Scale size={28} />
                </div>
                <div>
                   <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800">NEUMATICOS(CALIBRACIONES)</h2>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Seguimiento de Certificados y Calibraciones</p>
                </div>
              </div>

              {/* Lista de Calibraciones */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-12">
                {filteredCalibrations.length > 0 ? filteredCalibrations.map((cal) => (
                  <CalibrationCard key={cal.id} calibration={cal} onViewDoc={(url, title) => setViewerDoc({url, title})} />
                )) : (
                  <div className="col-span-full text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                    <Scale size={64} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-sm font-black text-slate-400 uppercase tracking-[0.4em]">No se encontraron equipos para calibración</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'novedades' && (
            <div className="space-y-12 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                <div className="lg:col-span-8 bg-[#0f172a] rounded-[3.5rem] p-10 text-white relative shadow-2xl overflow-hidden">
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                    <div className="relative shrink-0">
                      <svg className="w-40 h-40 transform -rotate-90">
                        <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="14" fill="transparent" className="text-white/10" />
                        <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="14" fill="transparent" strokeDasharray={440} strokeDashoffset={440 - (440 * reportStats.percentage) / 100} className="text-indigo-400 transition-all duration-1000" strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-black">{reportStats.percentage}%</span>
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Solución</span>
                      </div>
                    </div>
                    <div className="flex-grow w-full">
                      <h3 className="text-2xl font-black uppercase tracking-tighter">Panel de Gestión de Novedades</h3>
                      <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.3em] mt-1 mb-6">{MONTHS[selectedReportMonth]}</p>
                      <div className="grid grid-cols-3 gap-6">
                        <div className="bg-white/5 rounded-3xl p-6 border border-white/5 transition-all text-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Registradas</span>
                          <p className="text-3xl font-black text-white">{reportStats.total}</p>
                        </div>
                        <div className="bg-white/5 rounded-3xl p-6 border border-white/5 transition-all text-center">
                          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mb-2">Cerradas</span>
                          <p className="text-3xl font-black text-white">{reportStats.closed}</p>
                        </div>
                        <div className="bg-white/5 rounded-3xl p-6 border border-white/5 transition-all text-center">
                          <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest block mb-2">Abiertas</span>
                          <p className="text-3xl font-black text-white">{reportStats.open}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-4 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl flex flex-col justify-center items-center text-center">
                   <div className="w-16 h-16 bg-slate-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm"><Activity size={32} /></div>
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 leading-relaxed">¿Deseas registrar una novedad<br/>vincualda a un camión?</h4>
                   <button onClick={() => setShowReportForm(true)} className="w-full py-5 bg-[#0f172a] text-white rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-2">
                     <Plus size={18} /> ABRIR NUEVO REPORTE
                   </button>
                </div>
              </div>
              
              <div className="flex items-center gap-6 mt-8 mb-4">
                 <div className="flex items-center bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
                   <Calendar size={18} className="text-indigo-600 mr-3" />
                   <select className="bg-transparent text-[11px] font-black uppercase outline-none" value={selectedReportMonth} onChange={(e) => setSelectedReportMonth(parseInt(e.target.value))}>
                      {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                   </select>
                 </div>
                 <div className="flex items-center bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
                   <Building2 size={18} className="text-indigo-600 mr-3" />
                   <select className="bg-transparent text-[11px] font-black uppercase outline-none" value={selectedCd} onChange={(e) => setSelectedCd(e.target.value)}>
                      <option value="all">TODOS LOS C.D.</option>
                      {cds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                   </select>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-12">
                {filteredReports.map(report => (
                  <ReportCard key={report.id} report={report} onViewDoc={(url, title) => setViewerDoc({url, title})} onManageClosure={(r) => setClosureReport(r)} />
                ))}
              </div>
            </div>
          )}

          {activeView === 'kilometrajes' && (
             <div className="space-y-12 animate-in fade-in duration-500 max-w-[1400px] mx-auto pb-20">
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                  <div className="lg:col-span-8 bg-[#0f172a] rounded-[3.5rem] p-10 text-white relative shadow-2xl overflow-hidden">
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                      <div className="relative shrink-0">
                        <svg className="w-40 h-40 transform -rotate-90">
                          <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="14" fill="transparent" className="text-white/10" />
                          <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="14" fill="transparent" strokeDasharray={440} strokeDashoffset={440 - (440 * (mileageStats.percentage || 0)) / 100} className="text-indigo-400 transition-all duration-1000" strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl font-black">{mileageStats.percentage}%</span>
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Cumplimiento</span>
                        </div>
                      </div>
                      <div className="flex-grow w-full">
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Estado de Validación de Kilometraje</h3>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.3em] mt-1 mb-6">Reporte Semana {selectedWeek}</p>
                        <div className="grid grid-cols-2 gap-6">
                           <div className="bg-white/5 rounded-3xl p-6 border border-white/5"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Realizados</span><p className="text-3xl font-black text-emerald-400">{mileageStats.completed}</p></div>
                           <div className="bg-white/5 rounded-3xl p-6 border border-white/5"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Pendientes</span><p className="text-3xl font-black text-rose-400">{mileageStats.pending}</p></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-4 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl flex flex-col justify-center items-center text-center">
                    <div className="w-16 h-16 bg-slate-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4"><Database size={28} /></div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Flota Contextual</h4>
                    <p className="text-4xl font-black text-slate-900">{mileageStats.total}</p>
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

               <div className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-xl space-y-8 mt-12">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-50 pb-8">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl shadow-sm"><FileSpreadsheet size={28} /></div>
                      <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter text-slate-800">Registros Realizados</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Semana {selectedWeek} • {filteredMileageLogs.length} Entradas</p>
                      </div>
                    </div>
                    <ExportButton 
                      data={filteredMileageLogs} 
                      filename={`KILOMETRAJES_S${selectedWeek}`} 
                      title="Exportar Reporte Semanal" 
                    />
                  </div>

                  {filteredMileageLogs.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                            <th className="py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Placa</th>
                            <th className="py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Kilometraje</th>
                            <th className="py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">CD / Operación</th>
                            <th className="py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Contratista</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredMileageLogs.map((log, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="py-5 px-6">
                                <span className="text-xs font-bold text-slate-500">{formatDate(log.date)}</span>
                              </td>
                              <td className="py-5 px-6">
                                <span className="px-4 py-1.5 bg-slate-900 text-white rounded-xl font-mono font-black text-sm tracking-tighter shadow-sm group-hover:bg-indigo-600 transition-colors">{log.plate}</span>
                              </td>
                              <td className="py-5 px-6 text-right">
                                <span className="text-lg font-black text-indigo-600 tracking-tighter">{log.mileage.toLocaleString()} <span className="text-[10px] text-slate-300">KM</span></span>
                              </td>
                              <td className="py-5 px-6">
                                <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{log.cd}</span>
                              </td>
                              <td className="py-5 px-6">
                                <span className="text-xs font-bold text-slate-400 uppercase truncate max-w-[200px] block">{log.contractor}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                      <Search size={48} className="text-slate-200 mb-4" />
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No hay registros para los filtros actuales</p>
                    </div>
                  )}
               </div>
             </div>
          )}

          {activeView === '5s_camiones' && (
            <div className="space-y-12 animate-in fade-in duration-500 max-w-[1400px] mx-auto">
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                 <div className="lg:col-span-8 bg-[#0f172a] rounded-[3.5rem] p-10 text-white relative shadow-2xl overflow-hidden">
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                      <div className="relative shrink-0">
                        <svg className="w-40 h-40 transform -rotate-90">
                          <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="14" fill="transparent" className="text-white/10" />
                          <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="14" fill="transparent" strokeDasharray={440} strokeDashoffset={440 - (440 * fiveSStats.coveragePercentage) / 100} className="text-indigo-400 transition-all duration-1000" strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl font-black">{fiveSStats.coveragePercentage}%</span>
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Cobertura</span>
                        </div>
                      </div>
                      <div className="flex-grow w-full">
                        <h3 className="text-2xl font-black uppercase tracking-tighter">REPORTE AUDITORÍA {MONTHS[selectedReportMonth]}</h3>
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.3em] mt-1 mb-6">ESTADÍSTICAS POR FILTRO ACTUAL</p>
                        <div className="grid grid-cols-3 gap-6 text-center">
                           <div className="bg-white/5 rounded-3xl p-6 border border-white/5 transition-all"><span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Base Maestra</span><p className="text-3xl font-black text-white">{fiveSStats.totalInBase}</p></div>
                           <div className="bg-white/5 rounded-3xl p-6 border border-white/5 transition-all"><span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Realizados</span><p className="text-3xl font-black text-white">{fiveSStats.totalRealized}</p></div>
                           <div className="bg-white/5 rounded-3xl p-6 border border-white/5 transition-all"><span className="text-[9px] font-black text-rose-400 uppercase tracking-widest block mb-1">Pendientes</span><p className="text-3xl font-black text-white">{fiveSStats.totalInBase - fiveSStats.totalRealized}</p></div>
                        </div>
                      </div>
                    </div>
                 </div>
                 <div className="lg:col-span-4 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl flex flex-col justify-center items-center text-center">
                    <div className="w-16 h-16 bg-slate-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 transition-transform hover:scale-110"><TrendingUp size={28} /></div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">EFECTIVIDAD DE CIERRE</h4>
                    <p className="text-4xl font-black text-slate-900">{fiveSStats.resolutionPercentage}%</p>
                    <button onClick={() => { setSelectedPlateForFiveS(undefined); setShowFiveSForm(true); }} className="mt-8 w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"><Plus size={18} /> Nuevo Reporte 5S</button>
                 </div>
               </div>

               <div className="bg-white p-8 rounded-[3rem] border-2 border-rose-100 shadow-xl space-y-6">
                  <div className="flex items-center justify-between border-b border-rose-50 pb-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl"><AlertCircle size={24} /></div>
                      <h2 className="text-xl font-black uppercase tracking-tighter text-slate-800">Hallazgos Pendientes de Cierre ({fiveSStats.openHallazgos.length})</h2>
                    </div>
                  </div>
                  {fiveSStats.openHallazgos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {fiveSStats.openHallazgos.map(hallazgo => (
                        <div key={hallazgo.id} className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-md flex flex-col">
                           <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
                              <span className="font-mono font-black text-xl">{hallazgo.plate}</span>
                              <span className="text-[10px] font-black bg-rose-500 px-3 py-1 rounded-lg">ABIERTO</span>
                           </div>
                           <div className="p-6 flex flex-col flex-grow gap-4">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 flex items-center gap-2"><Calendar size={12}/> {formatDate(hallazgo.date)}</span>
                                <span className="text-[10px] font-black text-indigo-500">SEMANA {hallazgo.week}</span>
                              </div>
                              <button onClick={() => setFiveSClosureReport(hallazgo)} className="w-full mt-4 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-700 transition-all">
                                <Clock size={16} /> GESTIONAR CIERRE
                              </button>
                           </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-emerald-50 rounded-[2rem] border border-dashed border-emerald-200">
                       <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-3" />
                       <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">No hay hallazgos con estos filtros.</p>
                    </div>
                  )}
               </div>

               <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl space-y-8">
                  <div className="flex items-center gap-4 border-b border-slate-50 pb-6"><div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><LayoutDashboard size={24} /></div><h2 className="text-xl font-black uppercase tracking-tighter text-slate-800">Avance de Auditoría Global por CD</h2></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {coverageByCd.map(item => (
                      <div key={item.cd} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-lg transition-all">
                        <div className="flex justify-between items-center mb-4"><span className="text-[11px] font-black text-slate-800 uppercase">{item.cd}</span><span className={`px-3 py-1 rounded-lg text-[9px] font-black ${item.percentage >= 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>{item.percentage}%</span></div>
                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mb-3"><div className={`h-full transition-all duration-1000 ${item.percentage >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${item.percentage}%` }}></div></div>
                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-400"><span>Hechos: {item.realized}</span><span>Total: {item.total}</span></div>
                      </div>
                    ))}
                  </div>
               </div>

               <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                    <h2 className="text-xl font-black uppercase tracking-tighter text-slate-800 leading-none">Estado Auditoría Individual ({MONTHS[selectedReportMonth]})</h2>
                    <div className="flex items-center gap-4">
                       <div className="flex items-center bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                         <CalendarDays size={18} className="text-indigo-500 mr-2" />
                         <select className="bg-transparent text-[10px] font-black uppercase outline-none" value={selectedReportMonth} onChange={(e) => setSelectedReportMonth(parseInt(e.target.value))}>
                            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                         </select>
                       </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-10 gap-3">
                    {vehicles.filter(v => {
                      const matchCd = selectedCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(selectedCd);
                      const matchContractor = selectedContractor === 'all' || normalizeStr(v.contractor || "") === normalizeStr(selectedContractor);
                      return matchCd && matchContractor;
                    }).sort((a,b) => a.plate.localeCompare(b.plate)).map((v) => {
                      const reportsForVehicle = fiveSReports.filter(f => normalizePlate(f.plate) === normalizePlate(v.plate) && ((f.month && monthMatches(f.month, selectedReportMonth, MONTHS)) || (f.date && new Date(f.date + 'T12:00:00').getMonth() === selectedReportMonth)));
                      const isDone = reportsForVehicle.length > 0;
                      const hasOpen = reportsForVehicle.some(f => f.status === 'ABIERTO');
                      
                      return (
                        <button key={v.id} onClick={() => { setSelectedPlateForFiveS(v.plate); setShowFiveSForm(true); }} className={`py-3 px-2 rounded-xl text-[11px] font-mono font-black transition-all border-2 flex items-center justify-center gap-1 ${hasOpen ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-md' : isDone ? 'bg-emerald-50 text-emerald-700 border-emerald-500' : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-emerald-400'}`}>
                          {v.plate}{hasOpen ? <Clock size={10} /> : isDone && <CheckCircle2 size={10} />}
                        </button>
                      );
                    })}
                  </div>
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
