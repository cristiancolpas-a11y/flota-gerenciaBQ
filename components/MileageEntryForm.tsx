
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
      <div className="bg-white rounded-[4rem] shadow-2xl overflow-hidden border border-slate-100">
        {!activeVehicle ? (
          <div className="p-10">
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
