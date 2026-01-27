
import React, { useState, useMemo, useEffect } from 'react';
import { Vehicle, MileageLog } from '../types';
import { getWeekNumber, normalizePlate, normalizeStr, extractNumber } from '../utils';
import { Gauge, Save, Loader2, CheckCircle2, Truck, Search, Hash, ArrowLeft, Calendar, ListChecks, Clock, Building2, UserCircle, CalendarDays, Briefcase } from 'lucide-react';

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
  const [entryDate, setEntryDate] = useState(entryDateOverride || new Date().toISOString().split('T')[0]);
  const [activeVehicle, setActiveVehicle] = useState<Vehicle | null>(null);
  const [newMileage, setNewMileage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (entryDateOverride) setEntryDate(entryDateOverride);
  }, [entryDateOverride]);

  const cds = useMemo(() => Array.from(new Set(vehicles.map(v => v.cd || 'GENERAL'))).sort(), [vehicles]);
  const contractors = useMemo(() => Array.from(new Set(vehicles.map(v => v.contractor || 'GENERAL'))).sort(), [vehicles]);

  const isVehicleDone = (vehicle: Vehicle) => {
    const vPlate = normalizePlate(vehicle.plate);
    return (mileageLogs || []).some(log => {
      const logWeek = extractNumber(log.week);
      const logPlate = normalizePlate(log.plate);
      return logPlate === vPlate && logWeek === selectedWeek;
    });
  };

  const baseFiltered = useMemo(() => {
    return vehicles.filter(v => {
      const matchCd = externalCd === 'all' || normalizeStr(v.cd || "") === normalizeStr(externalCd);
      const matchContractor = externalContractor === 'all' || normalizeStr(v.contractor || "") === normalizeStr(externalContractor);
      const matchPlate = normalizePlate(v.plate).includes(normalizePlate(searchTerm));
      return matchCd && matchContractor && matchPlate;
    });
  }, [vehicles, externalCd, externalContractor, searchTerm]);

  const counts = useMemo(() => {
    const completedCount = baseFiltered.filter(v => isVehicleDone(v)).length;
    return {
      all: baseFiltered.length,
      completed: completedCount,
      pending: Math.max(0, baseFiltered.length - completedCount)
    };
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
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-4">
           <div className="flex items-center bg-indigo-600 text-white rounded-2xl px-5 py-2.5">
             <CalendarDays className="mr-3" size={20} />
             <div className="flex flex-col">
               <span className="text-[8px] font-black uppercase tracking-widest opacity-80">Semana</span>
               <select className="bg-transparent text-[11px] font-black outline-none" value={selectedWeek} onChange={(e) => onWeekChange(parseInt(e.target.value))}>
                 {Array.from({length: 53}, (_, i) => i + 1).map(w => <option key={w} value={w} className="text-slate-800">SEMANA {w}</option>)}
               </select>
             </div>
           </div>
           
           <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 hover:border-indigo-300 transition-all">
             <Building2 className="text-indigo-500 mr-3" size={18} />
             <select className="bg-transparent text-[11px] font-black uppercase outline-none" value={externalCd} onChange={(e) => setExternalCd(e.target.value)}>
               <option value="all">TODOS LOS C.D.</option>
               {cds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
             </select>
           </div>

           <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 hover:border-indigo-300 transition-all">
             <Briefcase className="text-indigo-500 mr-3" size={18} />
             <select className="bg-transparent text-[11px] font-black uppercase outline-none" value={externalContractor} onChange={(e) => setExternalContractor(e.target.value)}>
               <option value="all">TODOS LOS CONTRATISTAS</option>
               {contractors.map(cnt => <option key={cnt} value={cnt}>{cnt}</option>)}
             </select>
           </div>
        </div>
        
        <div className="flex items-center bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-2.5">
          <Calendar className="text-emerald-600 mr-3" size={18} />
          <input type="date" className="bg-transparent text-[11px] font-black text-emerald-700 outline-none" value={entryDate} onChange={(e) => { setEntryDate(e.target.value); onDateChange?.(e.target.value); }} />
        </div>
      </div>

      <div className="bg-white rounded-[4rem] shadow-2xl overflow-hidden border border-slate-100">
        {!activeVehicle ? (
          <div className="p-10 space-y-12">
            <div className="flex flex-col md:flex-row gap-6 items-center justify-center p-3 bg-slate-50 rounded-[3rem] shadow-inner max-w-5xl mx-auto border border-slate-100">
              <button onClick={() => setStatusFilter('all')} className={`flex-1 flex items-center justify-center gap-4 py-5 px-10 rounded-full text-[11px] font-black transition-all ${statusFilter === 'all' ? 'bg-[#0f172a] text-white shadow-xl scale-105' : 'text-slate-400 hover:text-indigo-600'}`}>
                TODOS <span>{counts.all}</span>
              </button>
              <button onClick={() => setStatusFilter('completed')} className={`flex-1 flex items-center justify-center gap-4 py-5 px-10 rounded-full text-[11px] font-black transition-all ${statusFilter === 'completed' ? 'bg-emerald-600 text-white shadow-xl scale-105' : 'text-emerald-500 hover:text-emerald-600'}`}>
                <ListChecks size={20} /> REALIZADOS <span>{counts.completed}</span>
              </button>
              <button onClick={() => setStatusFilter('pending')} className={`flex-1 flex items-center justify-center gap-4 py-5 px-10 rounded-full text-[11px] font-black transition-all ${statusFilter === 'pending' ? 'bg-rose-600 text-white shadow-xl scale-105' : 'text-rose-50 hover:text-rose-600'}`}>
                <Clock size={20} /> PENDIENTES <span>{counts.pending}</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 py-6">
              {filteredVehicles.length > 0 ? filteredVehicles.map((v) => {
                const isDone = isVehicleDone(v);
                return (
                  <button key={v.id} onClick={() => { setActiveVehicle(v); setNewMileage(''); }} className={`group flex flex-col items-center justify-center p-8 rounded-[3rem] border-2 transition-all relative overflow-hidden bg-white ${isDone ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-100 hover:border-indigo-400 hover:shadow-2xl hover:-translate-y-1'}`}>
                    <div className={`w-full px-4 py-5 rounded-[1.5rem] font-mono font-black text-2xl shadow-xl transition-all mb-6 text-center ${isDone ? 'bg-emerald-600 text-white' : 'bg-[#4f46e5] text-white group-hover:bg-[#0f172a]'}`}>
                      {v.plate}
                    </div>
                    <div className="text-center space-y-1 w-full px-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase truncate">{v.cd || 'SIN CD'}</p>
                      <p className="text-[11px] font-black uppercase mt-4">{isDone ? <span className="text-emerald-600 flex items-center justify-center gap-2"><CheckCircle2 size={14} /> REALIZADO</span> : <span className="text-slate-400">PENDIENTE</span>}</p>
                    </div>
                  </button>
                );
              }) : (
                <div className="col-span-full py-40 text-center text-sm font-black text-slate-400 uppercase tracking-[0.3em]">No se encontraron camiones con este filtro.</div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="p-12 space-y-12 animate-in zoom-in duration-500">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setActiveVehicle(null)} className="flex items-center gap-3 px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">
                <ArrowLeft size={16} /> Volver a Lista
              </button>
            </div>
            <div className="bg-slate-50 rounded-[5rem] p-16 border-4 border-dashed border-slate-200 flex flex-col items-center text-center group">
               <div className="bg-[#0f172a] px-16 py-14 rounded-[3.5rem] border-[12px] border-white shadow-2xl mb-12">
                 <span className="text-6xl md:text-9xl font-mono font-black text-white tracking-tighter block">{activeVehicle.plate}</span>
               </div>
               <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">C.D.: {activeVehicle.cd} | CONTRATISTA: {activeVehicle.contractor}</p>
            </div>
            <div className="space-y-10 text-center max-w-lg mx-auto">
              <label className="text-[12px] font-black text-slate-500 uppercase tracking-[0.6em] block">NUEVO KILOMETRAJE</label>
              <input autoFocus required type="number" placeholder="0" value={newMileage} onChange={(e) => setNewMileage(e.target.value)} className="w-full p-8 bg-white border-4 border-indigo-50 rounded-[3rem] text-center text-5xl font-black text-indigo-600 outline-none focus:border-indigo-600 focus:shadow-2xl transition-all" />
            </div>
            <button type="submit" disabled={isSubmitting || !newMileage} className="w-full py-10 bg-[#0f172a] text-white rounded-[3rem] font-black text-xl uppercase shadow-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-4">
              {isSubmitting ? <Loader2 className="animate-spin" size={32} /> : <Save size={32} />}
              {isSubmitting ? 'GUARDANDO...' : `CONFIRMAR REGISTRO`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default MileageEntryForm;
