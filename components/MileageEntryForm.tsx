
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
  AlertCircle
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
    setIsSubmitting(true);
    try {
      const weekNumber = getWeekNumber(new Date(entryDate + 'T12:00:00'));
      await onSubmit({
        plate: activeVehicle.plate,
        mileage: parseInt(newMileage),
        cd: activeVehicle.cd || 'GENERAL',
        contractor: activeVehicle.contractor || 'GENERAL',
        date: entryDate,
        weekNumber: weekNumber
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 bg-white p-2 rounded-3xl border border-slate-200 shadow-sm w-fit">
          <button 
            onClick={() => setActiveTab('registro')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'registro' ? 'bg-[#0f172a] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <Plus size={16} /> REGISTRO
          </button>
          <button 
            onClick={() => setActiveTab('historial')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'historial' ? 'bg-[#0f172a] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <History size={16} /> HISTORIAL
          </button>
        </div>

        <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm">
          <CalendarDays size={18} className="text-indigo-600" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Semana:</span>
          <select 
            className="bg-transparent font-black text-indigo-600 text-sm outline-none cursor-pointer"
            value={selectedWeek}
            onChange={(e) => onWeekChange(parseInt(e.target.value))}
          >
            {Array.from({length: 52}, (_, i) => i + 1).map(w => (
              <option key={w} value={w}>W{w} - 2025</option>
            ))}
          </select>
        </div>
      </div>

      {activeTab === 'registro' ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          {!activeVehicle && (
            <div className="bg-[#0f172a] rounded-[3rem] p-8 text-white shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                <div className="flex flex-col justify-center border-r border-white/10 md:pr-8">
                   <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em] mb-4">Cumplimiento Flota</p>
                   <div className="flex items-baseline gap-4">
                      <span className="text-7xl font-black tracking-tighter">{stats.percentage}%</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-indigo-400">{stats.completed}/{stats.total}</span>
                        <span className="text-[9px] font-black text-slate-500 uppercase">Vehículos</span>
                      </div>
                   </div>
                   <div className="mt-6 w-full h-3 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${stats.percentage}%` }}></div>
                   </div>
                </div>

                <div className="col-span-2 space-y-6">
                  <div className="flex items-center gap-4 mb-2">
                    <Filter size={16} className="text-indigo-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Control de Filtros</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-[8px] font-black text-indigo-300 uppercase mb-2">Estado Reporte</p>
                      <div className="flex gap-2">
                        {[
                          { id: 'all', label: 'Todo' },
                          { id: 'pending', label: 'Pend.', color: 'hover:bg-rose-500' },
                          { id: 'completed', label: 'Real.', color: 'hover:bg-emerald-500' }
                        ].map((f) => (
                          <button 
                            key={f.id} 
                            onClick={() => setStatusFilter(f.id as any)}
                            className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${statusFilter === f.id ? (f.id === 'pending' ? 'bg-rose-600 text-white' : f.id === 'completed' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white') : 'bg-white/5 text-slate-400 hover:text-white'}`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-[8px] font-black text-indigo-300 uppercase mb-2">Centro de Dist.</p>
                      <select className="bg-transparent text-white text-[10px] font-black w-full outline-none uppercase" value={externalCd} onChange={e => setExternalCd(e.target.value)}>
                        <option value="all" className="bg-[#0f172a]">TODOS LOS CD</option>
                        {cds.map(c => <option key={c} value={c} className="bg-[#0f172a]">{c}</option>)}
                      </select>
                    </div>

                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-[8px] font-black text-indigo-300 uppercase mb-2">Operador / Contratista</p>
                      <select className="bg-transparent text-white text-[10px] font-black w-full outline-none uppercase" value={externalContractor} onChange={e => setExternalContractor(e.target.value)}>
                        <option value="all" className="bg-[#0f172a]">TODOS LOS OP</option>
                        {contractors.map(c => <option key={c} value={c} className="bg-[#0f172a]">{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-[4rem] shadow-xl overflow-hidden border border-slate-100">
            {!activeVehicle ? (
              <div className="p-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 py-6">
                  {filteredVehicles.length > 0 ? filteredVehicles.map((v) => {
                    const isDone = isVehicleDone(v);
                    return (
                      <button 
                        key={v.id} 
                        onClick={() => { setActiveVehicle(v); setNewMileage(''); }} 
                        className={`group flex flex-col items-center justify-center p-8 rounded-[3rem] border-2 transition-all relative overflow-visible bg-white ${isDone ? 'border-emerald-100 bg-emerald-50/5 hover:border-emerald-400' : 'border-slate-100 hover:border-rose-400 hover:shadow-2xl hover:-translate-y-1'}`}
                      >
                        {/* BURBUJA DE ESTADO FLOTANTE - MEJORADA */}
                        <div className={`absolute -top-4 right-6 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl border-2 z-20 flex items-center gap-2 animate-in slide-in-from-top-2 duration-300 ${isDone ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-400 animate-pulse'}`}>
                           {isDone ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                           {isDone ? 'REALIZADO' : 'PENDIENTE'}
                        </div>

                        <div className={`w-full px-4 py-6 rounded-[1.8rem] font-mono font-black text-3xl shadow-xl transition-all mb-6 text-center border-4 ${isDone ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100 group-hover:bg-[#0f172a] group-hover:text-white group-hover:border-transparent'}`}>
                          {v.plate}
                        </div>
                        
                        <div className="text-center w-full px-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate mb-1">{v.cd || 'SIN CD'}</p>
                          <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest truncate">{v.contractor || 'OPERADOR GENERAL'}</p>
                        </div>
                      </button>
                    );
                  }) : (
                    <div className="col-span-full py-40 text-center flex flex-col items-center">
                       <div className="p-10 bg-slate-50 rounded-full mb-6">
                          <Search size={48} className="text-slate-200" />
                       </div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Búsqueda sin coincidencias.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="p-12 space-y-12 animate-in zoom-in duration-500">
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setActiveVehicle(null)} className="flex items-center gap-3 px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase hover:bg-rose-500 hover:text-white transition-all">
                    <ArrowLeft size={16} /> Volver a Lista
                  </button>
                </div>
                <div className="bg-slate-50 rounded-[5rem] p-16 border-4 border-dashed border-slate-200 flex flex-col items-center text-center group">
                   <div className="bg-[#0f172a] px-16 py-14 rounded-[3.5rem] border-[12px] border-white shadow-2xl mb-12">
                     <span className="text-6xl md:text-9xl font-mono font-black text-white tracking-tighter block">{activeVehicle.plate}</span>
                   </div>
                   <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">CD: {activeVehicle.cd} | OP: {activeVehicle.contractor}</p>
                </div>
                <div className="space-y-10 text-center max-w-lg mx-auto">
                  <label className="text-[12px] font-black text-slate-500 uppercase tracking-[0.6em] block">KILOMETRAJE SEMANA {selectedWeek}</label>
                  <input autoFocus required type="number" placeholder="0" value={newMileage} onChange={(e) => setNewMileage(e.target.value)} className="w-full p-8 bg-white border-4 border-indigo-50 rounded-[3rem] text-center text-5xl font-black text-indigo-600 outline-none focus:border-indigo-600 focus:shadow-2xl transition-all" />
                </div>
                <button type="submit" disabled={isSubmitting || !newMileage} className="w-full py-10 bg-indigo-600 text-white rounded-[3rem] font-black text-xl uppercase shadow-2xl hover:bg-[#0f172a] transition-all flex items-center justify-center gap-4">
                  {isSubmitting ? <Loader2 className="animate-spin" size={32} /> : <Save size={32} />}
                  {isSubmitting ? 'PROCESANDO...' : `CONFIRMAR REPORTE`}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 p-8">
            <div className="flex items-center justify-between mb-10 px-4">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <History size={24} />
                  </div>
                  <h2 className="text-3xl font-black text-[#0f172a] tracking-tighter uppercase">HISTORIAL W{selectedWeek}</h2>
               </div>
               <ExportButton data={historyLogs} filename={`Kilometrajes_W${selectedWeek}`} title="EXPORTAR CSV" />
            </div>

            <div className="grid grid-cols-4 gap-4 px-8 mb-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              <span>FECHA</span>
              <span className="text-center">PLACA</span>
              <span className="text-center">VALOR KM</span>
              <span className="text-right">CENTRO</span>
            </div>

            <div className="space-y-4">
              {historyLogs.length > 0 ? historyLogs.map((log, idx) => (
                <div key={idx} className="grid grid-cols-4 items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl transition-all hover:border-indigo-200 hover:shadow-indigo-500/5 group">
                   <div className="text-[11px] font-bold text-slate-500 first-letter:uppercase">
                      {formatDate(log.date)}
                   </div>
                   
                   <div className="flex justify-center">
                      <div className="bg-[#0f172a] px-5 py-2 rounded-xl text-white font-mono font-black text-sm tracking-wider shadow-md">
                         {log.plate}
                      </div>
                   </div>

                   <div className="flex justify-center items-baseline gap-1.5">
                      <span className="text-2xl font-black text-indigo-700 tracking-tighter">
                         {log.mileage.toLocaleString()}
                      </span>
                      <span className="text-[9px] font-black text-indigo-400 uppercase">KM</span>
                   </div>

                   <div className="text-right">
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                         {log.cd || 'GENERAL'}
                      </span>
                   </div>
                </div>
              )) : (
                <div className="py-32 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-[3rem]">
                   Sin registros para la semana {selectedWeek}.
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
