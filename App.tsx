
import React, { useState, useEffect, useMemo } from 'react';
import { Vehicle, Driver, Report, MileageLog, Calibration, WashReport, Fine } from './types';
import DocumentCard from './components/DocumentCard';
import DocumentViewer from './components/DocumentViewer';
import DriverCard from './components/DriverCard';
import FineCard from './components/FineCard';
import FineForm from './components/FineForm';
import FineSupportForm from './components/FineSupportForm';
import ReportCard from './components/ReportCard';
import ReportForm from './components/ReportForm';
import ReportStats from './components/ReportStats';
import VehicleStats from './components/VehicleStats';
import ClosureForm from './components/ClosureForm';
import WashCard from './components/WashCard';
import WashStats from './components/WashStats';
import WashForm from './components/WashForm';
import CleaningForm from './components/CleaningForm';
import CleaningCalendar from './components/CleaningCalendar';
import CalibrationCard from './components/CalibrationCard';
import CalibrationForm from './components/CalibrationForm';
import CalibrationStats from './components/CalibrationStats';
import CalibrationCalendar from './components/CalibrationCalendar';
import MileageEntryForm from './components/MileageEntryForm';
import WorkshopVisitItem from './components/WorkshopVisitItem';
import WorkshopStats from './components/WorkshopStats';
import WorkshopVisitClosureForm from './components/WorkshopVisitClosureForm';
import WorkshopModule from './components/WorkshopModule';
import DocumentUpdateForm from './components/DocumentUpdateForm';
import WorkshopCalendar from './components/WorkshopCalendar';
import WashCalendar from './components/WashCalendar';

import { 
  fetchVehiclesFromSheet, 
  fetchDriversFromSheet, 
  fetchFinesFromSheet,
  fetchReportsFromSheet,
  fetchWashReportsFromSheet,
  fetchCleaningReportsFromSheet,
  fetchCalibrationsFromSheet,
  fetchMileageLogsFromSheet,
  fetchWorkshopVisitsFromSheet,
  submitReportToSheet,
  submitMileageToSheet,
  submitWashToSheet,
  submitCleaningToSheet,
  submitFineToSheet,
  submitCalibrationToSheet,
  submitCalibrationUpdateToSheet,
  submitDocumentUpdateToSheet,
  submitWorkshopVisitUpdateToSheet
} from './services/sheetService';

import { normalizePlate, normalizeStr, getWeekNumber } from './utils';
import { 
  RefreshCw, Users, Truck, Search, Shield, Gavel, Menu, LogOut, Loader2, 
  Building2, ListFilter, CalendarDays, ClipboardList, Sparkles, Droplets, 
  Disc, Store, Gauge, Plus, History, Filter, Hash, Calendar, Clock, MapPin,
  UserCircle, LayoutGrid, Settings, ChevronLeft, Wrench, Lock, X
} from 'lucide-react';

type AppMode = 'root_menu' | 'flota_menu' | 'camiones' | 'montacargas' | 'talleres';
type ActiveView = 'vehiculos' | 'conductores' | 'comparendos' | 'kilometrajes' | 'novedades' | 'fives' | 'lavados' | 'limpieza' | 'calibraciones' | 'visitas';

const App: React.FC = () => {
  const [appMode, setAppMode] = useState<AppMode>('root_menu');
  const [activeView, setActiveView] = useState<ActiveView>('vehiculos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCd, setFilterCd] = useState('all');
  const [filterContractor, setFilterContractor] = useState('all');
  
  // Data States
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [washReports, setWashReports] = useState<WashReport[]>([]);
  const [cleaningReports, setCleaningReports] = useState<WashReport[]>([]);
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);
  const [workshopVisits, setWorkshopVisits] = useState<Report[]>([]);

  // UI States
  const [viewDoc, setViewDoc] = useState<{ url: string | string[] | {url: string, label?: string}[], title: string } | null>(null);
  const [fineStatusFilter, setFineStatusFilter] = useState<'all' | 'PENDIENTE' | 'PAGADO'>('all');
  const [showFineForm, setShowFineForm] = useState(false);
  const [managingFineSupport, setManagingFineSupport] = useState<Fine | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showWashForm, setShowWashForm] = useState(false);
  const [showCleaningForm, setShowCleaningForm] = useState(false);
  const [showCalibrationForm, setShowCalibrationForm] = useState(false);
  const [updatingCalibration, setUpdatingCalibration] = useState<Calibration | null>(null);
  const [showDocUpdateForm, setShowDocUpdateForm] = useState(false);
  const [closingReport, setClosingReport] = useState<Report | null>(null);
  const [closingWorkshopVisit, setClosingWorkshopVisit] = useState<Report | null>(null);
  const [closingCleaning, setClosingCleaning] = useState<WashReport | null>(null);
  const [workshopViewMode, setWorkshopViewMode] = useState<'list' | 'calendar'>('calendar');
  const [calibrationViewMode, setCalibrationViewMode] = useState<'list' | 'calendar'>('calendar');
  const [washViewMode, setWashViewMode] = useState<'list' | 'calendar'>('calendar');
  const [cleaningViewMode, setCleaningViewMode] = useState<'list' | 'calendar'>('calendar');

  // Mileage Filters
  const [mileageStatusFilter, setMileageStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [selectedWeek, setSelectedWeek] = useState(getWeekNumber(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('es-ES', { month: 'long' }).toUpperCase());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Vehicle Filters
  const [vehicleDocFilter, setVehicleDocFilter] = useState<'all' | 'soat' | 'rtm' | 'plc' | 'ext'>('all');

  // Auth State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const handleFlotaAccess = () => {
    setShowPasswordModal(true);
    setPasswordInput('');
    setPasswordError(false);
  };

  const verifyPassword = () => {
    if (passwordInput === '1506') {
      setAppMode('flota_menu');
      setShowPasswordModal(false);
    } else {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 2000);
    }
  };

  useEffect(() => {
    handleSyncData();
  }, []);

  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      const [v, d, f, r, w, cl, c, m, wv] = await Promise.all([
        fetchVehiclesFromSheet(),
        fetchDriversFromSheet(),
        fetchFinesFromSheet(),
        fetchReportsFromSheet(),
        fetchWashReportsFromSheet(),
        fetchCleaningReportsFromSheet(),
        fetchCalibrationsFromSheet(),
        fetchMileageLogsFromSheet(),
        fetchWorkshopVisitsFromSheet()
      ]);
      setVehicles(v);
      setDrivers(d);
      setFines(f);
      setReports(r);
      setWashReports(w);
      setCleaningReports(cl);
      setCalibrations(c);
      setMileageLogs(m);
      setWorkshopVisits(wv);
    } catch (err) {
      console.error("Critical Sync Error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const uniqueCds = useMemo(() => Array.from(new Set(vehicles.map(v => v.cd || 'GENERAL'))).sort(), [vehicles]);
  const uniqueContractors = useMemo(() => Array.from(new Set(vehicles.map(v => v.contractor || 'GENERAL'))).sort(), [vehicles]);

  const filteredWashReports = useMemo(() => {
    return washReports.filter(r => {
      const vehicle = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(r.plate));
      const matchMonth = normalizeStr(r.month) === normalizeStr(selectedMonth);
      const matchSearch = normalizePlate(r.plate).includes(normalizePlate(searchTerm));
      const matchCd = filterCd === 'all' || (vehicle && vehicle.cd === filterCd);
      const matchContractor = filterContractor === 'all' || (vehicle && vehicle.contractor === filterContractor);
      
      return matchMonth && matchSearch && matchCd && matchContractor;
    });
  }, [washReports, vehicles, selectedMonth, searchTerm, filterCd, filterContractor]);

  const washStats = useMemo(() => {
    const total = filteredWashReports.length;
    const completed = filteredWashReports.filter(r => r.status === 'CERRADO').length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [filteredWashReports]);

  const filteredCleaningReports = useMemo(() => {
    return cleaningReports.filter(r => {
      const vehicle = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(r.plate));
      const matchMonth = normalizeStr(r.month).includes(normalizeStr(selectedMonth)) || normalizeStr(selectedMonth).includes(normalizeStr(r.month));
      const matchSearch = normalizePlate(r.plate).includes(normalizePlate(searchTerm));
      const matchCd = filterCd === 'all' || (vehicle && vehicle.cd === filterCd);
      const matchContractor = filterContractor === 'all' || (vehicle && vehicle.contractor === filterContractor);
      
      return matchMonth && matchSearch && matchCd && matchContractor;
    });
  }, [cleaningReports, vehicles, selectedMonth, searchTerm, filterCd, filterContractor]);

  const cleaningStats = useMemo(() => {
    const total = filteredCleaningReports.length;
    const completed = filteredCleaningReports.filter(r => r.status === 'CERRADO').length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [filteredCleaningReports]);

  const filteredVehiclesForWash = useMemo(() => {
    return vehicles.filter(v => {
      const matchCd = filterCd === 'all' || v.cd === filterCd;
      const matchContractor = filterContractor === 'all' || v.contractor === filterContractor;
      return matchCd && matchContractor;
    });
  }, [vehicles, filterCd, filterContractor]);

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const vehicle = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(r.plate));
      const d = new Date(r.date + "T12:00:00");
      const matchMonth = d.toLocaleString('es-ES', { month: 'long' }).toUpperCase() === selectedMonth;
      const matchCd = filterCd === 'all' || (vehicle && vehicle.cd === filterCd) || r.cd === filterCd;
      const matchContractor = filterContractor === 'all' || (vehicle && vehicle.contractor === filterContractor) || r.contractor === filterContractor;
      const matchSearch = normalizePlate(r.plate).includes(normalizePlate(searchTerm));
      
      return matchMonth && matchCd && matchContractor && matchSearch;
    });
  }, [reports, vehicles, selectedMonth, filterCd, filterContractor, searchTerm]);

  const statsReports = useMemo(() => {
    const baseFiltered = reports.filter(r => {
      const vehicle = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(r.plate));
      const d = new Date(r.date + "T12:00:00");
      const matchMonth = d.toLocaleString('es-ES', { month: 'long' }).toUpperCase() === selectedMonth;
      const matchCd = filterCd === 'all' || (vehicle && vehicle.cd === filterCd) || r.cd === filterCd;
      const matchContractor = filterContractor === 'all' || (vehicle && vehicle.contractor === filterContractor) || r.contractor === filterContractor;
      return matchMonth && matchCd && matchContractor;
    });
    
    return {
      total: baseFiltered.length,
      completed: baseFiltered.filter(r => r.status === 'CERRADO').length,
      pending: baseFiltered.filter(r => r.status === 'ABIERTO').length,
      searchCount: filteredReports.length
    };
  }, [reports, vehicles, selectedMonth, filterCd, filterContractor, filteredReports]);

  const filteredCalibrations = useMemo(() => {
    return calibrations.filter(c => {
      const vehicle = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(c.plate));
      const matchMonth = c.month?.trim().toUpperCase() === selectedMonth.trim().toUpperCase();
      const matchYear = c.year === selectedYear;
      const matchCd = filterCd === 'all' || (vehicle && vehicle.cd === filterCd) || c.cd === filterCd;
      const matchContractor = filterContractor === 'all' || (vehicle && vehicle.contractor === filterContractor) || c.contractor === filterContractor;
      const matchSearch = normalizePlate(c.plate).includes(normalizePlate(searchTerm));
      return matchMonth && matchYear && matchCd && matchContractor && matchSearch;
    });
  }, [calibrations, vehicles, filterCd, filterContractor, searchTerm, selectedMonth, selectedYear]);

  const statsCalibrations = useMemo(() => {
    return {
      total: filteredCalibrations.length,
      completed: filteredCalibrations.filter(c => c.estado === 'COMPLETADO').length,
      pending: filteredCalibrations.filter(c => c.estado !== 'COMPLETADO').length,
      searchCount: filteredCalibrations.length
    };
  }, [filteredCalibrations]);

  const statsVehicles = useMemo(() => {
    const filtered = vehicles.filter(v => 
      (filterCd === 'all' || v.cd === filterCd) && 
      (filterContractor === 'all' || v.contractor === filterContractor) &&
      normalizePlate(v.plate).includes(normalizePlate(searchTerm))
    );
    return {
      total: filtered.length,
      soatWarning: filtered.filter(v => v.soat.status !== 'active').length,
      rtmWarning: filtered.filter(v => v.rtm.status !== 'active').length,
      plcWarning: filtered.filter(v => v.plc.status !== 'active').length,
      extWarning: filtered.filter(v => v.extinguisher.status !== 'active').length
    };
  }, [vehicles, filterCd, filterContractor, searchTerm]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchCd = filterCd === 'all' || v.cd === filterCd;
      const matchContractor = filterContractor === 'all' || v.contractor === filterContractor;
      const matchSearch = normalizePlate(v.plate).includes(normalizePlate(searchTerm));
      const matchDoc = vehicleDocFilter === 'all' || 
        (vehicleDocFilter === 'soat' && v.soat.status !== 'active') ||
        (vehicleDocFilter === 'rtm' && v.rtm.status !== 'active') ||
        (vehicleDocFilter === 'plc' && v.plc.status !== 'active') ||
        (vehicleDocFilter === 'ext' && v.extinguisher.status !== 'active');
      
      return matchCd && matchContractor && matchSearch && matchDoc;
    });
  }, [vehicles, filterCd, filterContractor, searchTerm, vehicleDocFilter]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {isSyncing && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center"><Loader2 size={48} className="text-white animate-spin" /></div>}
      
      {appMode === 'root_menu' ? (
        <div className="flex-grow bg-[#0f172a] flex flex-col items-center justify-center p-8 relative overflow-hidden">
          {/* Background Elements */}
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-[120px]"></div>
          </div>

          {/* Central Logo Area */}
          <div className="relative z-10 flex flex-col items-center text-center mb-16">
            <div className="w-48 h-48 bg-white rounded-[3rem] shadow-2xl flex items-center justify-center mb-10 relative group">
              <div className="absolute inset-0 bg-indigo-500/5 rounded-[3rem] scale-110 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <LayoutGrid size={80} className="text-slate-800" />
                <div className="absolute -bottom-2 -right-2 bg-indigo-600 p-3 rounded-2xl shadow-lg border-4 border-white">
                  <Settings size={28} className="text-white animate-spin-slow" />
                </div>
              </div>
            </div>
            <h1 className="text-5xl font-black text-white uppercase tracking-[0.2em] mb-4">SISTEMA DE GESTIÓN</h1>
            <p className="text-indigo-400 font-black text-sm uppercase tracking-[0.5em] opacity-80">CONTROL CENTRALIZADO DE ACTIVOS</p>
          </div>

          {/* Root Menu Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl relative z-10">
            <button 
              onClick={handleFlotaAccess}
              className="group bg-white/5 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-500/50 p-10 rounded-[3rem] transition-all duration-500 flex items-center gap-8 shadow-2xl hover:-translate-y-2"
            >
              <div className="w-20 h-20 bg-indigo-600/20 rounded-[1.5rem] flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-600/10 group-hover:scale-110 transition-transform border border-indigo-500/30">
                <Truck size={36} />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-1">FLOTA BARRANQUILLA</h3>
                <p className="text-indigo-400/60 text-[10px] font-bold uppercase tracking-widest">Gestión de vehículos y equipos</p>
              </div>
            </button>

            <button 
              onClick={() => setAppMode('talleres')}
              className="group bg-white/5 hover:bg-amber-600/20 border border-white/10 hover:border-amber-500/50 p-10 rounded-[3rem] transition-all duration-500 flex items-center gap-8 shadow-2xl hover:-translate-y-2"
            >
              <div className="w-20 h-20 bg-amber-600/20 rounded-[1.5rem] flex items-center justify-center text-amber-400 shadow-xl shadow-amber-600/10 group-hover:scale-110 transition-transform border border-amber-500/30">
                <Wrench size={36} />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-1">TALLERES</h3>
                <p className="text-amber-400/60 text-[10px] font-bold uppercase tracking-widest">Control de mantenimiento y servicios</p>
              </div>
            </button>
          </div>
        </div>
      ) : appMode === 'flota_menu' ? (
        <div className="flex-grow bg-[#0f172a] flex flex-col items-center justify-center p-8 relative overflow-hidden">
          {/* Background Elements */}
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px]"></div>
          </div>

          {/* Top Left Icon */}
          <div className="absolute top-8 left-8">
            <button onClick={() => setAppMode('root_menu')} className="p-3 bg-white/5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2">
              <ChevronLeft size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest">Menú Principal</span>
            </button>
          </div>

          {/* Central Logo Area */}
          <div className="relative z-10 flex flex-col items-center text-center mb-16">
            <div className="w-48 h-48 bg-white rounded-[3rem] shadow-2xl flex items-center justify-center mb-10 relative group">
              <div className="absolute inset-0 bg-indigo-500/5 rounded-[3rem] scale-110 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <ClipboardList size={80} className="text-slate-800" />
                <div className="absolute -bottom-2 -right-2 bg-amber-400 p-3 rounded-2xl shadow-lg border-4 border-white">
                  <Settings size={28} className="text-slate-900 animate-spin-slow" />
                </div>
              </div>
            </div>
            <h1 className="text-5xl font-black text-white uppercase tracking-[0.2em] mb-4">FLOTA BARRANQUILLA</h1>
            <p className="text-indigo-400 font-black text-sm uppercase tracking-[0.5em] opacity-80">GESTIÓN Y CONTROL DE ACTIVOS</p>
          </div>

          {/* Menu Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl relative z-10">
            <button 
              onClick={() => setAppMode('camiones')}
              className="group bg-white/5 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-500/50 p-10 rounded-[3rem] transition-all duration-500 flex items-center gap-8 shadow-2xl hover:-translate-y-2"
            >
              <div className="w-20 h-20 bg-indigo-600/20 rounded-[1.5rem] flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-600/10 group-hover:scale-110 transition-transform border border-indigo-500/30">
                <Truck size={36} />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-1">CAMIONES</h3>
                <p className="text-indigo-400/60 text-[10px] font-bold uppercase tracking-widest">Control de flota pesada</p>
              </div>
            </button>

            <button 
              onClick={() => setAppMode('montacargas')}
              className="group bg-white/5 hover:bg-emerald-600/20 border border-white/10 hover:border-emerald-500/50 p-10 rounded-[3rem] transition-all duration-500 flex items-center gap-8 shadow-2xl hover:-translate-y-2"
            >
              <div className="w-20 h-20 bg-emerald-600/20 rounded-[1.5rem] flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-600/10 group-hover:scale-110 transition-transform border border-emerald-500/30">
                <Truck size={36} className="rotate-12" />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-1">MONTACARGAS</h3>
                <p className="text-emerald-400/60 text-[10px] font-bold uppercase tracking-widest">Gestión de equipos logísticos</p>
              </div>
            </button>
          </div>
        </div>
      ) : appMode === 'talleres' ? (
        <WorkshopModule onBack={() => setAppMode('root_menu')} />
      ) : appMode === 'montacargas' ? (
        <div className="flex-grow bg-[#0f172a] flex flex-col items-center justify-center p-8">
           <div className="text-center space-y-8">
              <div className="w-32 h-32 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-500/30">
                 <Truck size={64} className="text-emerald-500 rotate-12" />
              </div>
              <h2 className="text-4xl font-black text-white uppercase tracking-widest">Módulo Montacargas</h2>
              <p className="text-slate-400 font-bold uppercase tracking-widest">Próximamente disponible</p>
              <button 
                onClick={() => setAppMode('flota_menu')}
                className="px-8 py-4 bg-white/5 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-3 mx-auto"
              >
                <ChevronLeft size={20} /> VOLVER AL MENÚ
              </button>
           </div>
        </div>
      ) : (
        <>
          {/* SIDEBAR PREMIUM */}
          <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0f172a] transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform xl:relative xl:translate-x-0`}>
            <div className="p-8 flex flex-col h-full space-y-2">
              <div className="mb-10 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/20">BQA</div>
                    <span className="text-white font-black text-xs tracking-widest uppercase">Gestión Flota</span>
                 </div>
                 <button onClick={() => setAppMode('flota_menu')} className="p-2 text-slate-500 hover:text-white transition-colors">
                    <LayoutGrid size={20} />
                 </button>
              </div>
              
              <nav className="flex-grow space-y-1 overflow-y-auto custom-scrollbar pr-2">
            {[
              { id: 'vehiculos', label: 'Vehículos', icon: <Truck size={18}/> },
              { id: 'conductores', label: 'Conductores', icon: <Users size={18}/> },
              { id: 'comparendos', label: 'Comparendos', icon: <Gavel size={18}/> },
              { id: 'kilometrajes', label: 'Kilometrajes', icon: <Gauge size={18}/> },
              { id: 'novedades', label: 'Novedades', icon: <ClipboardList size={18}/> },
              { id: 'lavados', label: 'Lavados', icon: <Droplets size={18}/> },
              { id: 'limpieza', label: 'Limpieza 5S', icon: <Sparkles size={18}/> },
              { id: 'calibraciones', label: 'Calibración', icon: <Disc size={18}/> },
              { id: 'visitas', label: 'Visitas Taller', icon: <Store size={18}/> },
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => { setActiveView(item.id as ActiveView); setIsSidebarOpen(false); }} 
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </nav>

          <button onClick={handleSyncData} className="mt-auto w-full flex items-center justify-center gap-3 py-4 bg-white/5 text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /> Sincronizar
          </button>
        </div>
      </aside>

      <main className="flex-grow flex flex-col h-screen overflow-hidden">
        {/* HEADER */}
        <header className="bg-white border-b p-4 flex justify-between items-center shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4 flex-grow">
            <button onClick={() => setIsSidebarOpen(true)} className="xl:hidden p-2 text-slate-600"><Menu/></button>
            <button 
              onClick={() => setAppMode('flota_menu')}
              className="hidden xl:flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all group"
            >
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-[9px] font-black uppercase tracking-widest">Menú Flota</span>
            </button>
            <div className="bg-slate-50 border rounded-xl px-4 py-2 flex items-center gap-3 w-full max-w-md shadow-inner">
              <Search size={16} className="text-slate-400" />
              <input 
                type="text" 
                placeholder="BUSCAR PLACA, NOMBRE O CC..." 
                className="bg-transparent font-black uppercase text-[10px] outline-none flex-grow" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value.toUpperCase())} 
              />
            </div>
          </div>
          <div className="ml-4 flex items-center gap-3">
             <div className="hidden md:flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl">
               <Building2 size={12} className="text-slate-400" />
               <select className="bg-transparent font-black text-[9px] uppercase outline-none" value={filterCd} onChange={e => setFilterCd(e.target.value)}>
                  <option value="all">TODOS LOS CD</option>
                  {uniqueCds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
               </select>
             </div>
             <button onClick={() => {
                if(activeView === 'comparendos') setShowFineForm(true);
                else if(activeView === 'vehiculos') setShowDocUpdateForm(true);
                else if(activeView === 'novedades') setShowReportForm(true);
                else if(activeView === 'lavados') setShowWashForm(true);
                else if(activeView === 'limpieza') setShowCleaningForm(true);
                else if(activeView === 'calibraciones') setShowCalibrationForm(true);
             }} className="p-2 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 transition-all">
               <Plus size={18} />
             </button>
          </div>
        </header>

        {/* CONTENT AREA */}
        <div className="flex-grow p-6 md:p-8 overflow-y-auto bg-[#f8fafc] custom-scrollbar">
          
          {activeView === 'vehiculos' && (
            <div className="max-w-7xl mx-auto space-y-6 pb-20">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                 <Shield size={24} className="text-indigo-600" /> Seguimiento Documental
              </h2>

              <VehicleStats 
                total={statsVehicles.total}
                soatWarning={statsVehicles.soatWarning}
                rtmWarning={statsVehicles.rtmWarning}
                plcWarning={statsVehicles.plcWarning}
                extWarning={statsVehicles.extWarning}
                onFilter={setVehicleDocFilter}
                activeFilter={vehicleDocFilter}
              />

              <div className="space-y-8">
                {filteredVehicles.map(v => (
                  <div key={v.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-lg overflow-hidden group hover:shadow-xl transition-all duration-500">
                    <div className="flex flex-col lg:flex-row">
                      <div className="lg:w-[280px] bg-[#0f172a] p-8 flex flex-col items-center shrink-0 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
                        <div className="bg-white/5 px-6 py-4 rounded-2xl border border-white/10 text-center mb-6 shadow-2xl">
                            <h2 className="text-3xl font-mono font-black text-white tracking-tighter">{v.plate}</h2>
                        </div>
                        <div className="space-y-2 w-full">
                           <div className="flex items-center gap-2 text-indigo-400">
                             <Building2 size={14}/>
                             <span className="text-[9px] font-black uppercase tracking-widest">{v.cd}</span>
                           </div>
                           <div className="flex items-center gap-2 text-slate-400">
                             <Users size={14}/>
                             <span className="text-[9px] font-black uppercase tracking-widest truncate">{v.contractor}</span>
                           </div>
                        </div>
                      </div>
                      <div className="flex-grow p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         <DocumentCard title="SOAT" doc={v.soat} icon={<Shield/>} onViewDoc={(url, t) => setViewDoc({url, title: `${v.plate} - ${t}`})} onAddSupport={() => setShowDocUpdateForm(true)} />
                         <DocumentCard title="RTM" doc={v.rtm} icon={<RefreshCw/>} onViewDoc={(url, t) => setViewDoc({url, title: `${v.plate} - ${t}`})} onAddSupport={() => setShowDocUpdateForm(true)} />
                         <DocumentCard title="EXTINTOR" doc={v.extinguisher} icon={<Shield/>} onViewDoc={(url, t) => setViewDoc({url, title: `${v.plate} - ${t}`})} onAddSupport={() => setShowDocUpdateForm(true)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === 'conductores' && (
            <div className="max-w-7xl mx-auto space-y-6">
               <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                 <Users size={24} className="text-indigo-600" /> Directorio de Conductores
               </h2>
               <div className="grid grid-cols-1 gap-6">
                {drivers.filter(d => (filterCd === 'all' || d.cd === filterCd) && d.name.toUpperCase().includes(searchTerm.toUpperCase())).map(d => (
                  <DriverCard key={d.id} driver={d} onViewDoc={(url, t) => setViewDoc({url, title: t})} />
                ))}
               </div>
            </div>
          )}

          {activeView === 'comparendos' && (
            <div className="max-w-7xl mx-auto space-y-6 pb-20">
               <div className="flex justify-between items-center">
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                    <Gavel size={24} className="text-rose-600" /> Gestión Comparendos
                  </h2>
                  <div className="flex items-center gap-4">
                    <select className="bg-white border rounded-lg px-3 py-1.5 text-[9px] font-black uppercase shadow-sm" value={fineStatusFilter} onChange={e => setFineStatusFilter(e.target.value as any)}>
                      <option value="all">TODOS</option>
                      <option value="PENDIENTE">PENDIENTES</option>
                      <option value="PAGADO">PAGADOS</option>
                    </select>
                  </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {fines.filter(f => (filterCd === 'all' || f.cd === filterCd) && (fineStatusFilter === 'all' || f.status === fineStatusFilter)).map(f => (
                    <FineCard key={f.id} fine={f} onViewDoc={(url, t) => setViewDoc({url, title: t})} onAddSupport={setManagingFineSupport} />
                  ))}
               </div>
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
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
                      <ClipboardList size={40} className="text-indigo-600" /> Gestión de Novedades
                    </h2>
                    <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em] ml-14">Control mensual de operaciones de taller</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Filtros CD y Contratista */}
                    <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2">
                      <select 
                        className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[9px] font-black uppercase outline-none focus:border-indigo-500"
                        value={filterCd}
                        onChange={e => setFilterCd(e.target.value)}
                      >
                        <option value="all">TODOS LOS CD</option>
                        {uniqueCds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                      </select>
                      <select 
                        className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[9px] font-black uppercase outline-none focus:border-indigo-500"
                        value={filterContractor}
                        onChange={e => setFilterContractor(e.target.value)}
                      >
                        <option value="all">TODOS LOS CONTRATISTAS</option>
                        {uniqueContractors.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                        <CalendarDays size={16} className="text-indigo-600" />
                        <div className="flex flex-col">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">PERIODO MENSUAL</span>
                          <div className="flex items-center gap-2">
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value="MENSUAL"
                              disabled
                            >
                              <option value="MENSUAL">MENSUAL</option>
                            </select>
                            <span className="text-slate-300">|</span>
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value={selectedMonth}
                              onChange={e => setSelectedMonth(e.target.value)}
                            >
                              {['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'].map(m => (
                                <option key={m} value={m}>{m} - {selectedYear}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setShowReportForm(true)}
                      className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-3xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                    >
                      <Plus size={20}/> Crear Novedad
                    </button>
                  </div>
               </div>

               <ReportStats 
                 total={statsReports.total}
                 completed={statsReports.completed}
                 pending={statsReports.pending}
                 searchCount={statsReports.searchCount}
                 month={selectedMonth}
               />

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredReports.map(r => (
                    <ReportCard key={r.id} report={r} onViewDoc={(url, t) => setViewDoc({url, title: t})} onManageClosure={setClosingReport} />
                  ))}
                  {filteredReports.length === 0 && (
                    <div className="col-span-full bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-200">
                      <ClipboardList size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No se han encontrado novedades con los filtros seleccionados</p>
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeView === 'lavados' && (
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
                      <Droplets size={40} className="text-cyan-500" /> Historial de Lavados
                    </h2>
                    <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em] ml-14">Cumplimiento de higiene y limpieza</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Filtros de CD y Contratista */}
                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                      <div className="flex items-center gap-4 px-3 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex flex-col border-r border-slate-200 pr-4">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">CENTRO (C.D.)</span>
                          <select 
                            className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                            value={filterCd}
                            onChange={e => setFilterCd(e.target.value)}
                          >
                            <option value="all">TODOS LOS CD</option>
                            {uniqueCds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">CONTRATISTA</span>
                          <select 
                            className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer max-w-[120px]"
                            value={filterContractor}
                            onChange={e => setFilterContractor(e.target.value)}
                          >
                            <option value="all">TODOS</option>
                            {uniqueContractors.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                        <CalendarDays size={16} className="text-cyan-600" />
                        <div className="flex flex-col">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">PERIODO SELECCIONADO</span>
                          <div className="flex items-center gap-2">
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value="MENSUAL"
                              disabled
                            >
                              <option value="MENSUAL">MENSUAL</option>
                            </select>
                            <span className="text-slate-300">|</span>
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value={selectedMonth}
                              onChange={e => setSelectedMonth(e.target.value)}
                            >
                              {['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'].map(m => (
                                <option key={m} value={m}>{m} - {selectedYear}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setShowWashForm(true)}
                      className="flex items-center gap-3 px-8 py-4 bg-cyan-600 text-white rounded-3xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-cyan-600/20 hover:bg-cyan-700 transition-all"
                    >
                      <Plus size={20}/> Registrar Lavado
                    </button>
                  </div>
               </div>

               <WashStats 
                 totalFlota={filteredVehiclesForWash.length}
                 lavados={filteredWashReports.length}
                 pendientes={filteredVehiclesForWash.length - filteredWashReports.length}
                 busqueda={filteredWashReports.length}
                 month={selectedMonth}
               />

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredWashReports.map(r => (
                      <WashCard 
                        key={r.id} 
                        report={r} 
                        onViewDoc={(url, t) => setViewDoc({url, title: t})} 
                      />
                    ))
                  }
                  {filteredWashReports.length === 0 && (
                    <div className="col-span-full bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-200">
                      <Droplets size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No se han encontrado lavados con los filtros aplicados para {selectedMonth}</p>
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeView === 'limpieza' && (
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
                      <Sparkles size={40} className="text-cyan-600" /> Limpieza 5S
                    </h2>
                    <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em] ml-14">Cronograma de limpieza profunda y 5S</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
                      <button 
                        onClick={() => setCleaningViewMode('list')}
                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${cleaningViewMode === 'list' ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-2">
                          <LayoutGrid size={12} /> Lista
                        </div>
                      </button>
                      <button 
                        onClick={() => setCleaningViewMode('calendar')}
                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${cleaningViewMode === 'calendar' ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-2">
                          <CalendarDays size={12} /> Calendario
                        </div>
                      </button>
                    </div>

                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                      <div className="flex items-center gap-4 px-3 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex flex-col border-r border-slate-200 pr-4">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">CENTRO (C.D.)</span>
                          <select 
                            className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                            value={filterCd}
                            onChange={e => setFilterCd(e.target.value)}
                          >
                            <option value="all">TODOS LOS CD</option>
                            {uniqueCds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">CONTRATISTA</span>
                          <select 
                            className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer max-w-[120px]"
                            value={filterContractor}
                            onChange={e => setFilterContractor(e.target.value)}
                          >
                            <option value="all">TODOS</option>
                            {uniqueContractors.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                        <CalendarDays size={16} className="text-cyan-600" />
                        <div className="flex flex-col">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">PERIODO SELECCIONADO</span>
                          <div className="flex items-center gap-2">
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value="MENSUAL"
                              disabled
                            >
                              <option value="MENSUAL">MENSUAL</option>
                            </select>
                            <span className="text-slate-300">|</span>
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value={selectedMonth}
                              onChange={e => setSelectedMonth(e.target.value)}
                            >
                              {['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'].map(m => (
                                <option key={m} value={m}>{m} - {selectedYear}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setShowCleaningForm(true)}
                      className="flex items-center gap-3 px-8 py-4 bg-cyan-600 text-white rounded-3xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-cyan-600/20 hover:bg-cyan-700 transition-all"
                    >
                      <Plus size={20}/> Registrar Limpieza
                    </button>
                  </div>
               </div>

               <WashStats 
                 totalFlota={cleaningStats.total}
                 lavados={cleaningStats.completed}
                 pendientes={cleaningStats.pending}
                 busqueda={filteredCleaningReports.length}
                 month={selectedMonth}
               />

               {cleaningViewMode === 'list' ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredCleaningReports.map(r => (
                        <WashCard 
                          key={r.id} 
                          report={r} 
                          onViewDoc={(url, t) => setViewDoc({url, title: t})} 
                        />
                      ))
                    }
                    {filteredCleaningReports.length === 0 && (
                      <div className="col-span-full bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-200">
                        <Droplets size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No se han encontrado limpiezas con los filtros aplicados para {selectedMonth}</p>
                      </div>
                    )}
                 </div>
               ) : (
                 <CleaningCalendar 
                   reports={cleaningReports.filter(r => filterCd === 'all' || (vehicles.find(v => normalizePlate(v.plate) === normalizePlate(r.plate))?.cd === filterCd))}
                   selectedMonth={selectedMonth}
                   selectedYear={selectedYear}
                   onMonthChange={setSelectedMonth}
                   onYearChange={setSelectedYear}
                   onViewDoc={(url, t) => setViewDoc({url, title: t})}
                   onManageClosure={setClosingCleaning}
                   searchTerm={searchTerm}
                 />
               )}
            </div>
          )}

          {activeView === 'calibraciones' && (
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
                      <Disc size={40} className="text-indigo-600" /> Cumplimiento Calibración
                    </h2>
                    <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em] ml-14">Monitoreo de presión y desgaste</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 flex items-center">
                      <button 
                        onClick={() => setCalibrationViewMode('list')}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${calibrationViewMode === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        Lista
                      </button>
                      <button 
                        onClick={() => setCalibrationViewMode('calendar')}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${calibrationViewMode === 'calendar' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        Cronograma
                      </button>
                    </div>

                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                        <CalendarDays size={16} className="text-indigo-600" />
                        <div className="flex flex-col">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">PERIODO</span>
                          <div className="flex items-center gap-2">
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value="MES"
                              disabled
                            >
                              <option value="MES">MES</option>
                            </select>
                            <span className="text-slate-300">|</span>
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value={selectedMonth}
                              onChange={e => setSelectedMonth(e.target.value)}
                            >
                              {['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'].map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
               </div>

               {/* Filtros CD y Contratista */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Building2 size={14} className="text-indigo-400" /> Filtrar por CD
                    </p>
                    <select 
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-[11px] font-black uppercase outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                      value={filterCd}
                      onChange={e => setFilterCd(e.target.value)}
                    >
                      <option value="all">TODOS LOS CENTROS</option>
                      {uniqueCds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                    </select>
                  </div>
                  <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <UserCircle size={14} className="text-indigo-400" /> Filtrar por Contratista
                    </p>
                    <select 
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-[11px] font-black uppercase outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                      value={filterContractor}
                      onChange={e => setFilterContractor(e.target.value)}
                    >
                      <option value="all">TODOS LOS OPERADORES</option>
                      {uniqueContractors.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
               </div>

               <CalibrationStats 
                 total={statsCalibrations.total}
                 completed={statsCalibrations.completed}
                 pending={statsCalibrations.pending}
                 searchCount={statsCalibrations.searchCount}
                 month={selectedMonth}
               />

               {calibrationViewMode === 'list' ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredCalibrations.map(c => (
                      <CalibrationCard 
                        key={c.id} 
                        calibration={c} 
                        onViewDoc={(url, t) => setViewDoc({url, title: t})} 
                        onUpdateEvidence={(cal) => {
                          setUpdatingCalibration(cal);
                          setShowCalibrationForm(true);
                        }}
                      />
                    ))}
                    {filteredCalibrations.length === 0 && (
                      <div className="col-span-full bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-200">
                        <Disc size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No se han encontrado calibraciones con los filtros seleccionados</p>
                      </div>
                    )}
                 </div>
               ) : (
                 <CalibrationCalendar 
                   calibrations={filteredCalibrations}
                   selectedMonth={selectedMonth}
                   selectedYear={selectedYear}
                   onMonthChange={setSelectedMonth}
                   onYearChange={setSelectedYear}
                   onViewDoc={(url, t) => setViewDoc({url, title: t})}
                   onUpdateEvidence={(cal) => {
                     setUpdatingCalibration(cal);
                     setShowCalibrationForm(true);
                   }}
                   searchTerm={searchTerm}
                 />
               )}
            </div>
          )}

          {activeView === 'visitas' && (
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                      <Store size={32} className="text-indigo-600" /> Visitas a Taller
                    </h2>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Gestión de trámites semanales (SOAT/RTM/EXT)</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 flex items-center">
                      <button 
                        onClick={() => setWorkshopViewMode('list')}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${workshopViewMode === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        Lista
                      </button>
                      <button 
                        onClick={() => setWorkshopViewMode('calendar')}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${workshopViewMode === 'calendar' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        Calendario
                      </button>
                    </div>

                    {workshopViewMode === 'list' && (
                      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                          <CalendarDays size={16} className="text-indigo-600" />
                          <div className="flex flex-col">
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">PERIODO DE REVISIÓN</span>
                            <select 
                              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer"
                              value={selectedWeek}
                              onChange={e => setSelectedWeek(parseInt(e.target.value))}
                            >
                              {Array.from({length: 52}, (_, i) => i + 1).map(w => (
                                <option key={w} value={w}>SEMANA {w}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
               </div>

               {workshopViewMode === 'list' ? (
                 <>
                   <WorkshopStats 
                     total={workshopVisits.filter(v => v.week === String(selectedWeek)).length}
                     completed={workshopVisits.filter(v => v.week === String(selectedWeek) && v.status === 'CERRADO').length}
                     pending={workshopVisits.filter(v => v.week === String(selectedWeek) && v.status === 'ABIERTO').length}
                     label={`SEMANA ${selectedWeek}`}
                   />

                   <div className="space-y-4">
                      {workshopVisits
                        .filter(v => v.week === String(selectedWeek) && normalizePlate(v.plate).includes(normalizePlate(searchTerm)))
                        .map(v => (
                          <WorkshopVisitItem 
                            key={v.id} 
                            visit={v} 
                            onViewDoc={(url, t) => setViewDoc({url, title: t})} 
                            onManageClosure={setClosingWorkshopVisit} 
                          />
                        ))
                      }
                      {workshopVisits.filter(v => v.week === String(selectedWeek)).length === 0 && (
                        <div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-slate-200">
                          <Store size={48} className="mx-auto text-slate-200 mb-4" />
                          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No hay visitas programadas para esta semana</p>
                        </div>
                      )}
                   </div>
                 </>
               ) : (
                 <>
                   <WorkshopStats 
                     total={workshopVisits.filter(v => {
                       const d = new Date(v.date + "T12:00:00");
                       return d.getFullYear() === selectedYear && d.toLocaleString('es-ES', { month: 'long' }).toUpperCase() === selectedMonth;
                     }).length}
                     completed={workshopVisits.filter(v => {
                       const d = new Date(v.date + "T12:00:00");
                       return d.getFullYear() === selectedYear && d.toLocaleString('es-ES', { month: 'long' }).toUpperCase() === selectedMonth && v.status === 'CERRADO';
                     }).length}
                     pending={workshopVisits.filter(v => {
                       const d = new Date(v.date + "T12:00:00");
                       return d.getFullYear() === selectedYear && d.toLocaleString('es-ES', { month: 'long' }).toUpperCase() === selectedMonth && v.status === 'ABIERTO';
                     }).length}
                     label={`${selectedMonth} ${selectedYear}`}
                   />

                   <WorkshopCalendar 
                     visits={workshopVisits}
                     selectedMonth={selectedMonth}
                     selectedYear={selectedYear}
                     onMonthChange={setSelectedMonth}
                     onYearChange={setSelectedYear}
                     onViewDoc={(url, t) => setViewDoc({url, title: t})}
                     onManageClosure={setClosingWorkshopVisit}
                     searchTerm={searchTerm}
                   />
                 </>
               )}
            </div>
          )}
        </div>
          </main>
        </>
      )}

      {/* MODALS & FORMS */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="bg-[#1e293b] border border-white/10 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600"></div>
            <button 
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-indigo-600/20 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/30">
                <Lock size={36} className="text-indigo-400" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-2">ACCESO RESTRINGIDO</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">Ingrese la clave para continuar</p>

              <div className="w-full space-y-4">
                <input 
                  type="password" 
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
                  placeholder="••••"
                  autoFocus
                  className={`w-full bg-white/5 border ${passwordError ? 'border-rose-500 animate-shake' : 'border-white/10'} rounded-2xl px-6 py-4 text-center text-3xl font-black tracking-[0.5em] text-white outline-none focus:border-indigo-500/50 transition-all`}
                />
                {passwordError && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest">Clave incorrecta</p>}
                
                <button 
                  onClick={verifyPassword}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20"
                >
                  VERIFICAR ACCESO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewDoc && <DocumentViewer url={viewDoc.url} title={viewDoc.title} onClose={() => setViewDoc(null)} />}
      {showFineForm && <FineForm vehicles={vehicles} drivers={drivers} onClose={() => setShowFineForm(false)} onSubmit={async (d) => { await submitFineToSheet(d); handleSyncData(); }} />}
      {managingFineSupport && <FineSupportForm fine={managingFineSupport} onClose={() => setManagingFineSupport(null)} onSubmit={async (d) => { await submitFineToSheet(d); handleSyncData(); }} />}
      {showDocUpdateForm && <DocumentUpdateForm vehicles={vehicles} onClose={() => setShowDocUpdateForm(false)} onSubmit={async (d) => { await submitDocumentUpdateToSheet(d); handleSyncData(); }} />}
      {showReportForm && <ReportForm vehicles={vehicles} onClose={() => setShowReportForm(false)} onSubmit={async (d) => { await submitReportToSheet(d); handleSyncData(); }} />}
      {showWashForm && <WashForm vehicles={vehicles} onClose={() => setShowWashForm(false)} onSubmit={async (d) => { await submitWashToSheet(d); handleSyncData(); }} />}
      {showCleaningForm && <CleaningForm vehicles={vehicles} onClose={() => setShowCleaningForm(false)} onSubmit={async (d) => { await submitCleaningToSheet(d); handleSyncData(); }} />}
      {closingCleaning && <CleaningForm vehicles={vehicles} preSelectedPlate={closingCleaning.plate} initialDate={closingCleaning.date} onClose={() => setClosingCleaning(null)} onSubmit={async (d) => { await submitCleaningToSheet(d); handleSyncData(); }} />}
      {showCalibrationForm && (
        <CalibrationForm 
          vehicles={vehicles} 
          calibrationToUpdate={updatingCalibration || undefined}
          onClose={() => {
            setShowCalibrationForm(false);
            setUpdatingCalibration(null);
          }} 
          onSubmit={async (d: any) => { 
            if (d.isUpdate) {
              await submitCalibrationUpdateToSheet(d);
            } else {
              await submitCalibrationToSheet(d);
            }
            handleSyncData(); 
          }} 
        />
      )}
      {closingReport && <ClosureForm report={closingReport} onClose={() => setClosingReport(null)} onSubmit={async (id, d) => { await submitReportToSheet({...closingReport, ...d} as any); handleSyncData(); }} />}
      {closingWorkshopVisit && <WorkshopVisitClosureForm visit={closingWorkshopVisit} onClose={() => setClosingWorkshopVisit(null)} onSubmit={async (d) => { await submitWorkshopVisitUpdateToSheet(d); handleSyncData(); }} />}
    </div>
  );
};

export default App;
