
import React, { useState, useMemo, useEffect } from 'react';
import { Vehicle, MileageLog } from '../types';
import { getWeekNumber, normalizePlate, normalizeStr, extractNumber, formatDate } from '../utils';
import { 
  Gauge, 
  Save, 
  Loader2, 
  CheckCircle2, 
  Truck, 
  Search, 
  Hash, 
  ArrowLeft, 
  Calendar, 
  ListChecks, 
  Clock, 
  Building2, 
  UserCircle, 
  CalendarDays, 
  Briefcase,
  History,
  Plus,
  ArrowRight,
  FileSpreadsheet,
  Filter,
  Activity,
  AlertCircle,
  PieChart,
  BarChart3,
  TrendingUp,
  ChevronRight,
  HelpCircle,
  Database,
  ChevronDown
} from 'lucide-react';
import ExportButton from './ExportButton';

interface MileageEntryFormProps {
  vehicles: Vehicle[];
  mileageLogs: MileageLog[];
  onSubmit: (data: { plate: string, mileage: number, cd: string, contractor: string, date: string, week: string }) => Promise<void>;
  externalCd: string;
  setExternalCd: (cd: string) => void;
  externalContractor: string;
  setExternalContractor: (cnt: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: 'all' | 'completed' | 'pending';
  setStatusFilter: (filter: 'all' | 'completed' | 'pending') => void;
  entryDateOverride?: string;
  onDateChange?: (date: string) => void;
  selectedWeek: number;
  onWeekChange: (week: number) => void;
}

const MileageEntryForm: React.FC<MileageEntryFormProps> = ({ 
  vehicles, 
  mileageLogs,
  onSubmit, 
  externalCd, 
  setExternalCd, 
  externalContractor, 
  setExternalContractor,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  entryDateOverride,
  onDateChange,
  selectedWeek,
  onWeekChange
}) => {
  const [activeTab, setActiveTab] = useState<'registro' | 'historial'>('registro');
  const [entryDate, setEntryDate] = useState(entryDateOverride || new Date().toISOString().split('T')[0]);
  const [activeVehicle, setActiveVehicle] = useState<Vehicle | null>(null);
  const [newMileage, setNewMileage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Nuevo: Control de vista Mensual vs Semanal
  const [viewMode, setViewMode] = useState<'semanal' | 'mensual'>('semanal');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const months = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
  ];

  useEffect(() => {
    if (entryDateOverride) setEntryDate(entryDateOverride);
  }, [entryDateOverride]);

  const getLastMileage = (plate: string) => {
    const vPlate = normalizePlate(plate);
    const logs = (mileageLogs || [])
      .filter(log => normalizePlate(log.plate) === vPlate)
      .sort((a, b) => {
        const weekA = extractNumber(a.week);
        const weekB = extractNumber(b.week);
        if (weekA !== weekB) return weekB - weekA;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    return logs.length > 0 ? logs[0].mileage : 0;
  };

  const isVehicleDoneInWeek = (vehicle: Vehicle, week: number) => {
    const vPlate = normalizePlate(vehicle.plate);
    return (mileageLogs || []).some(log => {
      const logWeek = extractNumber(log.week);
      const logPlate = normalizePlate(log.plate);
      return logPlate === vPlate && logWeek === week;
    });
  };

  const isVehicleDoneInMonth = (vehicle: Vehicle, monthIndex: number) => {
    const vPlate = normalizePlate(vehicle.plate);
    return (mileageLogs || []).some(log => {
      const logDate = new Date(log.date);
      const logPlate = normalizePlate(log.plate);
      return logPlate === vPlate && logDate.getMonth() === monthIndex;
    });
  };

  const cds = useMemo(() => Array.from(new Set(vehicles.map(v => v.cd || 'GENERAL'))).sort(), [vehicles]);
  const contractors = useMemo(() => {
    const vInCd = externalCd === 'all' ? vehicles : vehicles.filter(v => normalizeStr(v.cd || "") === normalizeStr(externalCd));
    return Array.from(new Set(vInCd.map(v => v.contractor || 'GENERAL'))).sort();
  }, [vehicles, externalCd]);

  const statsFiltered = useMemo(() => {
    return vehicles.filter(v => {
      const matchCd = externalCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(externalCd);
      const matchContractor = externalContractor === 'all' || normalizeStr(v.contractor || "") === normalizeStr(externalContractor);
      return matchCd && matchContractor;
    });
  }, [vehicles, externalCd, externalContractor]);

  const stats = useMemo(() => {
    const total = statsFiltered.length;
    const completed = statsFiltered.filter(v => 
      viewMode === 'semanal' ? isVehicleDoneInWeek(v, selectedWeek) : isVehicleDoneInMonth(v, selectedMonth)
    ).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending: total - completed, percentage };
  }, [statsFiltered, mileageLogs, selectedWeek, selectedMonth, viewMode]);

  const filteredVehicles = useMemo(() => {
    return statsFiltered.filter(v => {
      const isCompleted = viewMode === 'semanal' ? isVehicleDoneInWeek(v, selectedWeek) : isVehicleDoneInMonth(v, selectedMonth);
      const matchPlate = normalizePlate(v.plate).includes(normalizePlate(searchTerm));
      
      if (!matchPlate) return false;
      if (statusFilter === 'completed') return isCompleted;
      if (statusFilter === 'pending') return !isCompleted;
      return true;
    }).sort((a, b) => {
      const aDone = viewMode === 'semanal' ? isVehicleDoneInWeek(a, selectedWeek) : isVehicleDoneInMonth(a, selectedMonth);
      const bDone = viewMode === 'semanal' ? isVehicleDoneInWeek(b, selectedWeek) : isVehicleDoneInMonth(b, selectedMonth);
      if (aDone !== bDone) return aDone ? 1 : -1;
      return a.plate.localeCompare(b.plate);
    });
  }, [statsFiltered, statusFilter, mileageLogs, selectedWeek, selectedMonth, viewMode, searchTerm]);

  const historyLogs = useMemo(() => {
    return (mileageLogs || []).filter(log => {
      const logDate = new Date(log.date);
      const matchTime = viewMode === 'semanal' 
        ? extractNumber(log.week) === selectedWeek 
        : logDate.getMonth() === selectedMonth;
      const matchCd = externalCd === 'all' || normalizeStr(log.cd || "") === normalizeStr(externalCd);
      const matchContractor = externalContractor === 'all' || normalizeStr(log.contractor || "") === normalizeStr(externalContractor);
      const matchSearch = searchTerm === '' || normalizePlate(log.plate).includes(normalizePlate(searchTerm));
      return matchTime && matchCd && matchContractor && matchSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [mileageLogs, selectedWeek, selectedMonth, viewMode, externalCd, externalContractor, searchTerm]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVehicle || !newMileage) return;
    const lastKm = getLastMileage(activeVehicle.plate);
    const currentKm = parseInt(newMileage);
    if (currentKm < lastKm) {
      if (!window.confirm(`El kilometraje ingresado (${currentKm}) es menor al anterior (${lastKm}). ¿Desea continuar?`)) return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        plate: activeVehicle.plate,
        mileage: currentKm,
        cd: activeVehicle.cd || 'GENERAL',
        contractor: activeVehicle.contractor || 'GENERAL',
        date: entryDate,
        week: selectedWeek.toString()
      });
      setActiveVehicle(null);
      setNewMileage('');
    } catch (err) {
      alert("Error al guardar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* HEADER DE CONTROL */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
             <Gauge size={32} className="text-indigo-600" /> Control de Kilometrajes
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
            Auditoría de Recorridos {viewMode.toUpperCase()} <span className="text-indigo-500">•</span> BQA
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-full border border-slate-200 shadow-sm">
            <button 
              onClick={() => setActiveTab('registro')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'registro' ? 'bg-[#0f172a] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <BarChart3 size={16} /> REGISTRO
            </button>
            <button 
              onClick={() => setActiveTab('historial')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'historial' ? 'bg-[#0f172a] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <History size={16} /> HISTORIAL
            </button>
          </div>

          <div className="flex items-center gap-4 bg-white px-6 py-2.5 rounded-2xl border border-slate-200 shadow-sm group hover:border-indigo-300 transition-all">
            <CalendarDays size={18} className="text-indigo-600" />
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">PERIODO SELECCIONADO</span>
              <div className="flex items-center gap-2">
                 <select 
                   className="bg-transparent font-black text-slate-800 text-xs outline-none cursor-pointer uppercase"
                   value={viewMode}
                   onChange={(e) => setViewMode(e.target.value as any)}
                 >
                   <option value="semanal">SEMANA</option>
                   <option value="mensual">MES</option>
                 </select>
                 <span className="text-slate-300 text-xs">|</span>
                 {viewMode === 'semanal' ? (
                   <select 
                     className="bg-transparent font-black text-slate-800 text-xs outline-none cursor-pointer uppercase"
                     value={selectedWeek}
                     onChange={(e) => onWeekChange(parseInt(e.target.value))}
                   >
                     {Array.from({length: 52}, (_, i) => i + 1).map(w => (
                       <option key={w} value={w}>{w} - 2025</option>
                     ))}
                   </select>
                 ) : (
                   <select 
                     className="bg-transparent font-black text-slate-800 text-xs outline-none cursor-pointer uppercase"
                     value={selectedMonth}
                     onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
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
        </div>
      </div>

      {activeTab === 'registro' ? (
        <div className="space-y-8">
          {/* DASHBOARD DE CUMPLIMIENTO (ESTILO PREMIUM) */}
          <div className="bg-[#0f172a] rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden border border-white/5">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] -mr-64 -mt-64"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-[100px] -ml-48 -mb-48"></div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
              
              {/* PORCENTAJE CIRCULAR */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center lg:border-r lg:border-white/10 lg:pr-12">
                 <div className="flex items-center gap-3 mb-10">
                    <TrendingUp size={16} className="text-indigo-400" />
                    <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em]">CUMPLIMIENTO {viewMode === 'semanal' ? `SEMANA ${selectedWeek}` : months[selectedMonth]}</p>
                 </div>
                 
                 <div className="relative flex items-center justify-center mb-10">
                    <svg className="w-56 h-56 transform -rotate-90">
                       <circle cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="14" fill="transparent" className="text-white/5" />
                       <circle cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="14" fill="transparent" 
                                strokeDasharray={628.3} 
                                strokeDashoffset={628.3 - (628.3 * stats.percentage) / 100}
                                className="text-indigo-500 transition-all duration-1000 ease-out" 
                                strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                       <span className="text-8xl font-black tracking-tighter leading-none">{stats.percentage}</span>
                       <span className="text-xl font-black text-indigo-400 mt-1">%</span>
                    </div>
                 </div>

                 <div className="w-full grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-5 rounded-3xl border border-white/5 backdrop-blur-sm">
                       <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">REPORTADOS</p>
                       <p className="text-3xl font-black tracking-tighter">{stats.completed}</p>
                       <div className="w-full h-1.5 bg-emerald-500/20 rounded-full mt-3 overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{width: `${stats.percentage}%`}}></div>
                       </div>
                    </div>
                    <div className="bg-white/5 p-5 rounded-3xl border border-white/5 backdrop-blur-sm text-right">
                       <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-2">FALTANTES</p>
                       <p className="text-3xl font-black tracking-tighter">{stats.pending}</p>
                       <div className="w-full h-1.5 bg-rose-500/20 rounded-full mt-3 overflow-hidden">
                          <div className="h-full bg-rose-500 ml-auto" style={{width: `${100 - stats.percentage}%`}}></div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* FILTROS DE BÚSQUEDA */}
              <div className="lg:col-span-8 space-y-10">
                 <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-indigo-500/20 rounded-xl">
                       <Filter size={20} className="text-indigo-400" />
                    </div>
                    <span className="text-[12px] font-black uppercase tracking-[0.4em] text-white/60">Panel de Filtros Globales</span>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 backdrop-blur-md hover:bg-white/[0.07] transition-all">
                       <p className="text-[10px] font-black text-indigo-400 uppercase mb-5 flex items-center gap-2.5">
                          <Activity size={16}/> ESTADO DEL REPORTE
                       </p>
                       <div className="flex p-1.5 bg-white/5 rounded-2xl border border-white/5">
                          {[
                            { id: 'all', label: 'TODO' },
                            { id: 'pending', label: 'FALTAN' },
                            { id: 'completed', label: 'LISTOS' }
                          ].map((f) => (
                            <button 
                              key={f.id} 
                              onClick={() => setStatusFilter(f.id as any)}
                              className={`flex-1 py-3.5 rounded-xl text-[11px] font-black uppercase transition-all ${statusFilter === f.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'text-slate-400 hover:text-white'}`}
                            >
                              {f.label}
                            </button>
                          ))}
                       </div>
                    </div>

                    <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 backdrop-blur-md hover:bg-white/[0.07] transition-all">
                       <p className="text-[10px] font-black text-indigo-400 uppercase mb-5 flex items-center gap-2.5">
                          <Building2 size={16}/> UBICACIÓN CD
                       </p>
                       <div className="relative">
                          <select className="bg-[#1e293b] text-white text-[12px] font-black w-full px-6 py-4.5 rounded-2xl outline-none uppercase appearance-none cursor-pointer border border-white/10 focus:border-indigo-500 transition-all" value={externalCd} onChange={e => setExternalCd(e.target.value)}>
                            <option value="all">TODOS LOS CD</option>
                            {cds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
                          </select>
                          <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" size={18} />
                       </div>
                    </div>

                    <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 backdrop-blur-md hover:bg-white/[0.07] transition-all">
                       <p className="text-[10px] font-black text-indigo-400 uppercase mb-5 flex items-center gap-2.5">
                          <UserCircle size={16}/> OPERADOR / CONTRATISTA
                       </p>
                       <div className="relative">
                          <select className="bg-[#1e293b] text-white text-[12px] font-black w-full px-6 py-4.5 rounded-2xl outline-none uppercase appearance-none cursor-pointer border border-white/10 focus:border-indigo-500 transition-all" value={externalContractor} onChange={e => setExternalContractor(e.target.value)}>
                            <option value="all">TODOS LOS OPERADORES</option>
                            {contractors.map(cnt => <option key={cnt} value={cnt}>{cnt}</option>)}
                          </select>
                          <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" size={18} />
                       </div>
                    </div>
                 </div>

                 {stats.total === 0 && (
                   <div className="bg-indigo-600/20 p-5 rounded-3xl border border-indigo-500/30 flex items-center gap-4 animate-pulse">
                      <div className="p-2 bg-indigo-500/20 rounded-lg">
                        <Database size={20} className="text-indigo-400" />
                      </div>
                      <p className="text-[11px] font-bold text-indigo-200 uppercase tracking-widest">Sincronizando registros en tiempo real desde Google Sheets...</p>
                   </div>
                 )}
              </div>
            </div>
          </div>

          {/* GRID DE VEHÍCULOS */}
          <div className="bg-white rounded-[4rem] shadow-xl border border-slate-100 p-12">
            {!activeVehicle ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
                {filteredVehicles.length > 0 ? filteredVehicles.map((v) => {
                  const isDone = viewMode === 'semanal' ? isVehicleDoneInWeek(v, selectedWeek) : isVehicleDoneInMonth(v, selectedMonth);
                  const lastKm = getLastMileage(v.plate);
                  return (
                    <button 
                      key={v.id} 
                      onClick={() => { setActiveVehicle(v); setNewMileage(''); }} 
                      className={`group flex flex-col items-center p-10 rounded-[4rem] border-2 transition-all relative bg-white ${isDone ? 'border-emerald-100 bg-emerald-50/10 grayscale opacity-80' : 'border-slate-100 hover:border-indigo-500 hover:shadow-2xl hover:-translate-y-2'}`}
                    >
                      <div className={`absolute -top-4 right-10 px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl border-2 z-20 flex items-center gap-2 ${isDone ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-400 animate-pulse'}`}>
                         {isDone ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                         {isDone ? 'LISTO' : 'PENDIENTE'}
                      </div>

                      <div className={`w-full py-10 rounded-[3rem] font-mono font-black text-4xl shadow-2xl transition-all mb-8 text-center border-4 ${isDone ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-[#0f172a] text-white border-white/10 group-hover:bg-indigo-600'}`}>
                        {v.plate}
                      </div>
                      
                      <div className="text-center w-full space-y-4">
                        <div className="flex items-center justify-center gap-2.5 text-indigo-600 font-black bg-indigo-50/50 py-3 rounded-2xl border border-indigo-100/50">
                           <Gauge size={18} />
                           <span className="text-base tracking-tighter">{lastKm.toLocaleString()} <span className="text-[10px] opacity-60">KM</span></span>
                        </div>
                        <div className="pt-4 border-t border-slate-100">
                           <div className="flex items-center justify-center gap-2 mb-1">
                              <Building2 size={12} className="text-slate-300" />
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{v.cd || 'SIN ASIGNACIÓN'}</p>
                           </div>
                           <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest truncate">{v.contractor || 'OPERACIÓN GENERAL'}</p>
                        </div>
                      </div>
                    </button>
                  );
                }) : (
                  <div className="col-span-full py-48 text-center flex flex-col items-center">
                     <div className="p-16 bg-slate-50 rounded-full mb-10 border-4 border-dashed border-slate-100 animate-pulse">
                        <Search size={72} className="text-slate-200" />
                     </div>
                     <p className="text-xl font-black text-slate-300 uppercase tracking-[0.5em]">Sin resultados bajo estos filtros</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 space-y-16 animate-in zoom-in duration-500">
                <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-100 pb-12 gap-8">
                  <button type="button" onClick={() => setActiveVehicle(null)} className="flex items-center gap-4 px-12 py-6 bg-slate-100 text-slate-600 rounded-[2.5rem] text-[12px] font-black uppercase hover:bg-rose-500 hover:text-white transition-all shadow-lg active:scale-95">
                    <ArrowLeft size={24} /> VOLVER AL LISTADO
                  </button>
                  <div className="text-center md:text-right">
                     <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Lectura de Referencia Anterior</p>
                     <div className="flex items-baseline justify-center md:justify-end gap-3">
                        <p className="text-6xl font-black text-indigo-600 tracking-tighter leading-none">{getLastMileage(activeVehicle.plate).toLocaleString()}</p>
                        <span className="text-2xl font-black text-indigo-300">KM</span>
                     </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                  <div className="bg-slate-50 rounded-[6rem] p-24 border-4 border-dashed border-slate-200 flex flex-col items-center text-center shadow-inner relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <div className="bg-[#0f172a] px-24 py-16 rounded-[4rem] border-[14px] border-white shadow-2xl mb-14 group-hover:scale-110 transition-transform duration-700 relative z-10">
                       <span className="text-8xl md:text-9xl font-mono font-black text-white tracking-tighter block">{activeVehicle.plate}</span>
                    </div>
                    <div className="space-y-4 relative z-10">
                       <div className="inline-flex items-center gap-3 px-6 py-2 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                          <Activity size={14} /> AUDITORÍA {viewMode === 'semanal' ? `W${selectedWeek}` : months[selectedMonth]}
                       </div>
                       <div className="flex items-center gap-5 justify-center text-slate-500">
                         <div className="flex items-center gap-2">
                            <Building2 size={22} className="text-indigo-400" />
                            <span className="text-sm font-black uppercase tracking-widest">{activeVehicle.cd}</span>
                         </div>
                         <span className="text-slate-200">|</span>
                         <div className="flex items-center gap-2">
                            <Briefcase size={22} className="text-indigo-400" />
                            <span className="text-sm font-black uppercase tracking-widest">{activeVehicle.contractor}</span>
                         </div>
                       </div>
                    </div>
                  </div>

                  <form onSubmit={handleFormSubmit} className="space-y-14">
                    <div className="space-y-10">
                      <div className="flex items-center gap-4 justify-center lg:justify-start">
                         <Gauge size={24} className="text-indigo-600" />
                         <label className="text-2xl font-black text-slate-800 uppercase tracking-[0.4em] block">Kilometraje Actual</label>
                      </div>
                      <div className="relative group">
                         <input 
                           autoFocus 
                           required 
                           type="number" 
                           placeholder="000,000" 
                           value={newMileage} 
                           onChange={(e) => setNewMileage(e.target.value)} 
                           className="w-full p-14 bg-white border-4 border-indigo-50 rounded-[4rem] text-center lg:text-left text-8xl font-black text-[#0f172a] outline-none focus:border-indigo-600 focus:shadow-2xl transition-all shadow-inner placeholder:text-slate-100" 
                         />
                         <div className="absolute right-14 top-1/2 -translate-y-1/2 hidden md:block">
                            <span className="text-4xl font-black text-indigo-100 group-focus-within:text-indigo-200 transition-colors">KM</span>
                         </div>
                      </div>
                    </div>
                    
                    <button type="submit" disabled={isSubmitting || !newMileage} className="w-full py-14 bg-indigo-600 text-white rounded-[4rem] font-black text-3xl uppercase shadow-2xl hover:bg-[#0f172a] transition-all flex items-center justify-center gap-8 group active:scale-95">
                      {isSubmitting ? <Loader2 className="animate-spin" size={40} /> : <Save size={40} className="group-hover:rotate-12 transition-transform" />}
                      {isSubmitting ? 'PROCESANDO...' : `GUARDAR REPORTE`}
                    </button>
                    
                    <div className="bg-amber-50 p-10 rounded-[3rem] border border-amber-100 flex gap-8 items-center shadow-sm">
                       <div className="p-4 bg-amber-100 rounded-2xl">
                          <AlertCircle className="text-amber-600" size={36} />
                       </div>
                       <p className="text-sm font-bold text-amber-800 uppercase leading-relaxed">
                         Al guardar este registro, el vehículo quedará marcado como <span className="text-emerald-700 font-black">LISTO</span> para el periodo actual. <span className="underline decoration-amber-300 decoration-4">Verifique los dígitos</span> antes de confirmar.
                       </p>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-white rounded-[4rem] shadow-2xl border border-slate-100 p-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-8">
               <div className="flex items-center gap-6">
                  <div className="p-5 bg-indigo-600 text-white rounded-[1.8rem] shadow-xl shadow-indigo-500/30">
                    <ListChecks size={32} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-[#0f172a] tracking-tighter uppercase leading-none">HISTORIAL DETALLADO</h2>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2">Reportes filtrados por {viewMode}</p>
                  </div>
               </div>
               <div className="flex items-center gap-4">
                 <ExportButton data={historyLogs} filename={`Kilometrajes_${viewMode}`} title="EXPORTAR DATA" />
               </div>
            </div>

            <div className="hidden md:grid grid-cols-5 gap-8 px-12 mb-10 text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">
              <span className="col-span-1">FECHA REPORTE</span>
              <span className="col-span-1 text-center">UNIDAD</span>
              <span className="col-span-1 text-center">KM AUDITADO</span>
              <span className="col-span-1 text-center">C.D.</span>
              <span className="col-span-1 text-right">CONTRATISTA</span>
            </div>

            <div className="space-y-5">
              {historyLogs.length > 0 ? historyLogs.map((log, idx) => (
                <div key={idx} className="grid grid-cols-2 md:grid-cols-5 items-center gap-8 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl transition-all hover:border-indigo-400 group cursor-default">
                   <div className="flex items-center gap-4">
                      <div className="w-2.5 h-12 bg-indigo-50 group-hover:bg-indigo-600 rounded-full transition-colors"></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Fecha</p>
                        <p className="text-base font-black text-slate-800 uppercase leading-none">{formatDate(log.date)}</p>
                      </div>
                   </div>
                   
                   <div className="flex justify-center">
                      <div className="bg-[#0f172a] px-10 py-4 rounded-2xl text-white font-mono font-black text-2xl tracking-wider shadow-2xl group-hover:bg-indigo-600 transition-colors">
                         {log.plate}
                      </div>
                   </div>

                   <div className="flex justify-center items-baseline gap-3 col-span-2 md:col-span-1">
                      <span className="text-4xl font-black text-slate-900 tracking-tighter group-hover:text-indigo-600 transition-colors">
                         {log.mileage.toLocaleString()}
                      </span>
                      <span className="text-xs font-black text-slate-400 uppercase">KM</span>
                   </div>

                   <div className="hidden md:flex justify-center">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest bg-slate-100 px-6 py-3 rounded-2xl border border-slate-200">
                         {log.cd || 'BQA'}
                      </span>
                   </div>

                   <div className="hidden md:block text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Operación</p>
                      <p className="text-[12px] font-black text-slate-800 uppercase tracking-tight truncate">{log.contractor || 'BARRANQUILLA'}</p>
                   </div>
                </div>
              )) : (
                <div className="py-48 text-center flex flex-col items-center border-[8px] border-dashed border-slate-50 rounded-[5rem]">
                   <div className="p-14 bg-slate-50 rounded-full mb-10">
                     <FileSpreadsheet size={72} className="text-slate-200" />
                   </div>
                   <h3 className="text-3xl font-black text-slate-300 uppercase tracking-tighter">SIN REGISTROS</h3>
                   <p className="text-sm font-bold text-slate-300 uppercase mt-6 tracking-[0.4em]">Inicie la captura de datos en la pestaña de Registro.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MileageEntryForm;
