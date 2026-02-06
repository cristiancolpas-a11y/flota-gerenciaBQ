
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
  ChevronRight
} from 'lucide-react';
import ExportButton from './ExportButton';

interface MileageEntryFormProps {
  vehicles: Vehicle[];
  mileageLogs: MileageLog[];
  onSubmit: (data: { plate: string, mileage: number, cd: string, contractor: string, date: string, weekNumber: number }) => Promise<void>;
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

  useEffect(() => {
    if (entryDateOverride) setEntryDate(entryDateOverride);
  }, [entryDateOverride]);

  // Función para obtener el último kilometraje registrado de un vehículo (de cualquier semana)
  const getLastMileage = (plate: string) => {
    const vPlate = normalizePlate(plate);
    const logs = (mileageLogs || [])
      .filter(log => normalizePlate(log.plate) === vPlate)
      .sort((a, b) => {
        // Ordenar por semana descendente
        const weekA = extractNumber(a.week);
        const weekB = extractNumber(b.week);
        if (weekA !== weekB) return weekB - weekA;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    return logs.length > 0 ? logs[0].mileage : 0;
  };

  const isVehicleDone = (vehicle: Vehicle) => {
    const vPlate = normalizePlate(vehicle.plate);
    return (mileageLogs || []).some(log => {
      const logWeek = extractNumber(log.week);
      const logPlate = normalizePlate(log.plate);
      return logPlate === vPlate && logWeek === selectedWeek;
    });
  };

  const cds = useMemo(() => Array.from(new Set(vehicles.map(v => v.cd || 'GENERAL'))).sort(), [vehicles]);
  const contractors = useMemo(() => {
    const vInCd = externalCd === 'all' ? vehicles : vehicles.filter(v => normalizeStr(v.cd || "") === normalizeStr(externalCd));
    return Array.from(new Set(vInCd.map(v => v.contractor || 'GENERAL'))).sort();
  }, [vehicles, externalCd]);

  const baseFiltered = useMemo(() => {
    return vehicles.filter(v => {
      const matchCd = externalCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(externalCd);
      const matchContractor = externalContractor === 'all' || normalizeStr(v.contractor || "") === normalizeStr(externalContractor);
      const matchPlate = normalizePlate(v.plate).includes(normalizePlate(searchTerm));
      return matchCd && matchContractor && matchPlate;
    });
  }, [vehicles, externalCd, externalContractor, searchTerm]);

  const stats = useMemo(() => {
    const total = baseFiltered.length;
    const completed = baseFiltered.filter(v => isVehicleDone(v)).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending: total - completed, percentage };
  }, [baseFiltered, mileageLogs, selectedWeek]);

  const filteredVehicles = useMemo(() => {
    return baseFiltered.filter(v => {
      const isCompleted = isVehicleDone(v);
      if (statusFilter === 'completed') return isCompleted;
      if (statusFilter === 'pending') return !isCompleted;
      return true;
    }).sort((a, b) => {
      const aDone = isVehicleDone(a);
      const bDone = isVehicleDone(b);
      if (aDone !== bDone) return aDone ? 1 : -1;
      return a.plate.localeCompare(b.plate);
    });
  }, [baseFiltered, statusFilter, mileageLogs, selectedWeek]);

  const historyLogs = useMemo(() => {
    return (mileageLogs || []).filter(log => {
      const matchWeek = extractNumber(log.week) === selectedWeek;
      const matchCd = externalCd === 'all' || normalizeStr(log.cd || "") === normalizeStr(externalCd);
      const matchSearch = searchTerm === '' || normalizePlate(log.plate).includes(normalizePlate(searchTerm));
      return matchWeek && matchCd && matchSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [mileageLogs, selectedWeek, externalCd, searchTerm]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVehicle || !newMileage) return;
    
    const lastKm = getLastMileage(activeVehicle.plate);
    const currentKm = parseInt(newMileage);
    
    if (currentKm < lastKm) {
      if (!window.confirm(`El kilometraje ingresado (${currentKm}) es menor al anterior (${lastKm}). ¿Desea continuar?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        plate: activeVehicle.plate,
        mileage: currentKm,
        cd: activeVehicle.cd || 'GENERAL',
        contractor: activeVehicle.contractor || 'GENERAL',
        date: entryDate,
        weekNumber: selectedWeek
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* HEADER DE CONTROL */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
             <Gauge size={32} className="text-indigo-600" /> Control de Kilometrajes
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
            Auditoría de Recorridos Semanales <span className="text-indigo-500">•</span> BQA
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-[1.8rem] border border-slate-200 shadow-sm">
            <button 
              onClick={() => setActiveTab('registro')}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'registro' ? 'bg-[#0f172a] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <BarChart3 size={16} /> REGISTRO
            </button>
            <button 
              onClick={() => setActiveTab('historial')}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'historial' ? 'bg-[#0f172a] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <History size={16} /> AUDITORÍA
            </button>
          </div>

          <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm group hover:border-indigo-300 transition-all">
            <CalendarDays size={18} className="text-indigo-600 group-hover:scale-110 transition-transform" />
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">SEMANA SELECCIONADA</span>
              <select 
                className="bg-transparent font-black text-slate-800 text-xs outline-none cursor-pointer uppercase"
                value={selectedWeek}
                onChange={(e) => onWeekChange(parseInt(e.target.value))}
              >
                {Array.from({length: 52}, (_, i) => i + 1).map(w => (
                  <option key={w} value={w}>Semana {w} - 2025</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'registro' ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          {!activeVehicle && (
            <div className="bg-[#0f172a] rounded-[3.5rem] p-10 text-white shadow-2xl overflow-hidden relative border-b-[10px] border-indigo-600">
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -mr-40 -mt-40"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
                {/* MÉTRICA DE CUMPLIMIENTO */}
                <div className="flex flex-col justify-center border-r border-white/10 md:pr-10">
                   <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-6 flex items-center gap-2">
                     <TrendingUp size={14}/> CUMPLIMIENTO SEMANA {selectedWeek}
                   </p>
                   <div className="flex items-baseline gap-4 mb-4">
                      <span className="text-8xl font-black tracking-tighter">{stats.percentage}<span className="text-3xl text-indigo-400">%</span></span>
                   </div>
                   <div className="flex justify-between items-center mb-6 px-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-emerald-400 uppercase">REPORTADOS: {stats.completed}</span>
                        <div className="w-20 h-1 bg-emerald-500/20 rounded-full mt-1 overflow-hidden">
                           <div className="h-full bg-emerald-500" style={{width: `${(stats.completed/stats.total)*100}%`}}></div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-rose-400 uppercase">FALTAN: {stats.pending}</span>
                        <div className="w-20 h-1 bg-rose-500/20 rounded-full mt-1 overflow-hidden">
                           <div className="h-full bg-rose-500" style={{width: `${(stats.pending/stats.total)*100}%`}}></div>
                        </div>
                      </div>
                   </div>
                   <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-1">
                      <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(79,70,229,0.5)]" style={{ width: `${stats.percentage}%` }}></div>
                   </div>
                </div>

                {/* FILTROS DE AUDITORÍA */}
                <div className="col-span-2 space-y-8">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                      <Filter size={18} className="text-indigo-400" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-white/50">Filtros de Búsqueda</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 backdrop-blur-sm">
                      <p className="text-[9px] font-black text-indigo-400 uppercase mb-3 flex items-center gap-2"><CheckCircle2 size={12}/> Estado Reporte</p>
                      <div className="flex gap-2">
                        {[
                          { id: 'all', label: 'Todo' },
                          { id: 'pending', label: 'Faltan' },
                          { id: 'completed', label: 'Listos' }
                        ].map((f) => (
                          <button 
                            key={f.id} 
                            onClick={() => setStatusFilter(f.id as any)}
                            className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${statusFilter === f.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 backdrop-blur-sm">
                      <p className="text-[9px] font-black text-indigo-400 uppercase mb-3 flex items-center gap-2"><Building2 size={12}/> Ubicación CD</p>
                      <select className="bg-[#1e293b] text-white text-[10px] font-black w-full px-4 py-2.5 rounded-xl outline-none uppercase cursor-pointer border border-white/5 focus:border-indigo-500" value={externalCd} onChange={e => setExternalCd(e.target.value)}>
                        <option value="all">TODOS LOS CD</option>
                        {cds.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 backdrop-blur-sm">
                      <p className="text-[9px] font-black text-indigo-400 uppercase mb-3 flex items-center gap-2"><UserCircle size={12}/> Operador</p>
                      <select className="bg-[#1e293b] text-white text-[10px] font-black w-full px-4 py-2.5 rounded-xl outline-none uppercase cursor-pointer border border-white/5 focus:border-indigo-500" value={externalContractor} onChange={e => setExternalContractor(e.target.value)}>
                        <option value="all">TODOS LOS OP</option>
                        {contractors.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LISTADO DE VEHÍCULOS */}
          <div className="bg-white rounded-[4rem] shadow-xl border border-slate-100 p-10">
            {!activeVehicle ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                {filteredVehicles.length > 0 ? filteredVehicles.map((v) => {
                  const isDone = isVehicleDone(v);
                  const lastKm = getLastMileage(v.plate);
                  return (
                    <button 
                      key={v.id} 
                      onClick={() => { setActiveVehicle(v); setNewMileage(''); }} 
                      className={`group flex flex-col items-center p-8 rounded-[3.5rem] border-2 transition-all relative bg-white ${isDone ? 'border-emerald-100 bg-emerald-50/5 grayscale opacity-70' : 'border-slate-100 hover:border-indigo-500 hover:shadow-2xl hover:-translate-y-2'}`}
                    >
                      <div className={`absolute -top-4 right-8 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl border-2 z-20 flex items-center gap-2 ${isDone ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-400 animate-pulse'}`}>
                         {isDone ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                         {isDone ? 'REPORTADO' : 'PENDIENTE'}
                      </div>

                      <div className={`w-full py-7 rounded-[2.2rem] font-mono font-black text-4xl shadow-xl transition-all mb-6 text-center border-4 ${isDone ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-[#0f172a] text-white border-white/10 group-hover:bg-indigo-600 group-hover:scale-105'}`}>
                        {v.plate}
                      </div>
                      
                      <div className="text-center w-full space-y-2 px-2">
                        <div className="flex items-center justify-center gap-2 text-indigo-600 font-black">
                           <Gauge size={14} />
                           <span className="text-xs uppercase">Últ: {lastKm.toLocaleString()} KM</span>
                        </div>
                        <div className="pt-2 border-t border-slate-50">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{v.cd || 'SIN CD'}</p>
                          <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest truncate">{v.contractor || 'OPERADOR GENERAL'}</p>
                        </div>
                      </div>
                    </button>
                  );
                }) : (
                  <div className="col-span-full py-48 text-center flex flex-col items-center">
                     <div className="p-12 bg-slate-50 rounded-full mb-8 border-4 border-dashed border-slate-100 animate-pulse">
                        <Search size={64} className="text-slate-200" />
                     </div>
                     <p className="text-base font-black text-slate-400 uppercase tracking-[0.4em]">Sin unidades reportables bajo este filtro</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 space-y-12 animate-in zoom-in duration-500">
                <div className="flex items-center justify-between border-b border-slate-100 pb-8">
                  <button type="button" onClick={() => setActiveVehicle(null)} className="flex items-center gap-3 px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                    <ArrowLeft size={18} /> Cancelar Registro
                  </button>
                  <div className="text-right">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Último Kilometraje de Referencia</p>
                     <p className="text-2xl font-black text-indigo-600 tracking-tighter">{getLastMileage(activeVehicle.plate).toLocaleString()} KM</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                  <div className="bg-slate-50 rounded-[4rem] p-16 border-4 border-dashed border-slate-200 flex flex-col items-center text-center shadow-inner">
                    <div className="bg-[#0f172a] px-16 py-12 rounded-[3rem] border-[10px] border-white shadow-2xl mb-10 group-hover:scale-105 transition-transform">
                       <span className="text-7xl md:text-9xl font-mono font-black text-white tracking-tighter block">{activeVehicle.plate}</span>
                    </div>
                    <div className="space-y-2">
                       <p className="text-[12px] font-black text-slate-500 uppercase tracking-[0.5em]">Semana {selectedWeek} Auditoría</p>
                       <div className="flex items-center gap-3 justify-center text-slate-400">
                         <Building2 size={16}/> <span className="text-[10px] font-black uppercase">{activeVehicle.cd}</span>
                       </div>
                    </div>
                  </div>

                  <form onSubmit={handleFormSubmit} className="space-y-10">
                    <div className="space-y-6">
                      <label className="text-[14px] font-black text-indigo-600 uppercase tracking-[0.4em] block text-center lg:text-left">Kilometraje Actual</label>
                      <div className="relative group">
                         <input 
                           autoFocus 
                           required 
                           type="number" 
                           placeholder="000,000" 
                           value={newMileage} 
                           onChange={(e) => setNewMileage(e.target.value)} 
                           className="w-full p-10 bg-white border-4 border-indigo-50 rounded-[3rem] text-center lg:text-left text-6xl font-black text-[#0f172a] outline-none focus:border-indigo-600 focus:shadow-2xl transition-all" 
                         />
                         <div className="absolute right-10 top-1/2 -translate-y-1/2 hidden md:block">
                            <span className="text-2xl font-black text-indigo-200">KM</span>
                         </div>
                      </div>
                    </div>
                    
                    <button type="submit" disabled={isSubmitting || !newMileage} className="w-full py-10 bg-indigo-600 text-white rounded-[3rem] font-black text-2xl uppercase shadow-2xl hover:bg-[#0f172a] transition-all flex items-center justify-center gap-5 group">
                      {isSubmitting ? <Loader2 className="animate-spin" size={32} /> : <Save size={32} className="group-hover:rotate-12 transition-transform" />}
                      {isSubmitting ? 'PROCESANDO...' : `CONFIRMAR SEMANA ${selectedWeek}`}
                    </button>
                    
                    <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex gap-4 items-center">
                       <AlertCircle className="text-amber-600 shrink-0" size={24} />
                       <p className="text-[10px] font-bold text-amber-800 uppercase leading-relaxed">
                         Asegúrese de que el kilometraje sea el que muestra el odómetro físico. Este registro se guardará para auditoría gerencial.
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
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
               <div className="flex items-center gap-5">
                  <div className="p-4 bg-indigo-600 text-white rounded-[1.5rem] shadow-xl shadow-indigo-500/20">
                    <ListChecks size={28} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-[#0f172a] tracking-tighter uppercase">HISTORIAL DE REPORTES</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Registros de la Semana {selectedWeek}</p>
                  </div>
               </div>
               <div className="flex items-center gap-4">
                 <ExportButton data={historyLogs} filename={`Kilometrajes_W${selectedWeek}`} title="EXPORTAR DATA EXCEL" />
               </div>
            </div>

            <div className="hidden md:grid grid-cols-5 gap-6 px-10 mb-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">
              <span className="col-span-1">FECHA</span>
              <span className="col-span-1 text-center">UNIDAD</span>
              <span className="col-span-1 text-center">LECTURA KM</span>
              <span className="col-span-1 text-center">CD</span>
              <span className="col-span-1 text-right">CONTRATISTA</span>
            </div>

            <div className="space-y-4">
              {historyLogs.length > 0 ? historyLogs.map((log, idx) => (
                <div key={idx} className="grid grid-cols-2 md:grid-cols-5 items-center gap-6 bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-xl transition-all hover:border-indigo-400 hover:shadow-indigo-500/10 group cursor-default">
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-10 bg-indigo-100 group-hover:bg-indigo-600 rounded-full transition-colors"></div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Fecha Reporte</p>
                        <p className="text-sm font-black text-slate-800 uppercase">{formatDate(log.date)}</p>
                      </div>
                   </div>
                   
                   <div className="flex justify-center">
                      <div className="bg-[#0f172a] px-8 py-3 rounded-2xl text-white font-mono font-black text-xl tracking-wider shadow-xl group-hover:bg-indigo-600 transition-colors">
                         {log.plate}
                      </div>
                   </div>

                   <div className="flex justify-center items-baseline gap-2 col-span-2 md:col-span-1">
                      <span className="text-3xl font-black text-slate-900 tracking-tighter group-hover:text-indigo-600 transition-colors">
                         {log.mileage.toLocaleString()}
                      </span>
                      <span className="text-[11px] font-black text-slate-400 uppercase">KM</span>
                   </div>

                   <div className="hidden md:flex justify-center">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest bg-slate-100 px-5 py-2.5 rounded-xl border border-slate-200">
                         {log.cd || 'GENERAL'}
                      </span>
                   </div>

                   <div className="hidden md:block text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Responsable</p>
                      <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">{log.contractor || 'OPERADOR'}</p>
                   </div>
                </div>
              )) : (
                <div className="py-40 text-center flex flex-col items-center border-[6px] border-dashed border-slate-50 rounded-[4rem]">
                   <div className="p-10 bg-slate-50 rounded-full mb-8">
                     <FileSpreadsheet size={64} className="text-slate-200" />
                   </div>
                   <h3 className="text-2xl font-black text-slate-300 uppercase tracking-tighter">SIN DATOS PARA ESTA SEMANA</h3>
                   <p className="text-xs font-bold text-slate-300 uppercase mt-4 tracking-widest">Audite una semana anterior o inicie el registro de la semana {selectedWeek}.</p>
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
