
import React, { useMemo, useState } from 'react';
import { Truck, Gauge, AlertTriangle, CheckCircle2, Clock, Search, Camera, Calendar, Hash, Filter } from 'lucide-react';
import { Vehicle, MileageLog, Preventive } from '../types';
import { normalizePlate } from '../utils';

interface PreventiveModuleProps {
  vehicles: Vehicle[];
  mileageLogs: MileageLog[];
  searchTerm: string;
  externalPreventives?: Preventive[];
  selectedMonth?: string;
  filterCd?: string;
  filterContractor?: string;
  onUpdate?: (v: Preventive) => void;
}

const PreventiveModule: React.FC<PreventiveModuleProps> = ({ 
  vehicles, 
  mileageLogs, 
  searchTerm, 
  externalPreventives, 
  selectedMonth: globalMonth,
  filterCd,
  filterContractor,
  onUpdate 
}) => {
  const [localMonth, setLocalMonth] = useState('all');
  const [localWeek, setLocalWeek] = useState('all');
  
  const maintenanceInterval = 5000;

  const preventiveData = useMemo(() => {
    const normalizeStr = (s: string) => s?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || '';
    
    if (!externalPreventives || externalPreventives.length === 0) return [];

    return externalPreventives.filter(p => {
      const vehicle = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(p.plate));
      
      const matchSearch = normalizePlate(p.plate).includes(normalizePlate(searchTerm));
      const matchCd = !filterCd || filterCd === 'all' || (vehicle && vehicle.cd === filterCd) || p.cd === filterCd;
      const matchContractor = !filterContractor || filterContractor === 'all' || (vehicle && vehicle.contractor === filterContractor) || p.contractor === filterContractor;
      
      const matchMonth = localMonth === 'all' || normalizeStr(p.month) === normalizeStr(localMonth);
      const matchWeek = localWeek === 'all' || p.week === localWeek;
      
      return matchSearch && matchCd && matchContractor && matchMonth && matchWeek;
    }).sort((a, b) => {
      const dateA = a.lastUpdate ? new Date(a.lastUpdate).getTime() : 0;
      const dateB = b.lastUpdate ? new Date(b.lastUpdate).getTime() : 0;
      if (dateA !== dateB) {
        return dateB - dateA;
      }
      return a.plate.localeCompare(b.plate);
    });
  }, [vehicles, searchTerm, externalPreventives, filterCd, filterContractor, localMonth, localWeek]);

  const stats = useMemo(() => {
    return {
      totalInSheet: externalPreventives?.length || 0,
      totalFiltered: preventiveData.length,
      cumplio: preventiveData.filter(v => v.complianceStatus === 'Cumplió').length,
      noCumplio: preventiveData.filter(v => v.complianceStatus === 'No cumplió').length,
    };
  }, [preventiveData, externalPreventives]);

  const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  const weeks = Array.from({ length: 53 }, (_, i) => (i + 1).toString());

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
            <Clock size={40} className="text-indigo-600" /> Mantenimiento Preventivo
          </h2>
          <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em] ml-14">Seguimiento por kilometraje y cumplimiento</p>
        </div>
        <button 
          onClick={() => onUpdate?.({} as any)}
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 hover:-translate-y-1 transition-all flex items-center gap-3"
        >
          <Camera size={20} /> Registrar Preventivo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-lg">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Registros</p>
          <p className="text-3xl font-black text-slate-900">{stats.totalInSheet}</p>
        </div>
        <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 shadow-lg">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Filtrados</p>
          <p className="text-3xl font-black text-indigo-600">{stats.totalFiltered}</p>
        </div>
        <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 shadow-lg">
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Cumplió</p>
          <p className="text-3xl font-black text-emerald-600">{stats.cumplio}</p>
        </div>
        <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 shadow-lg">
          <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">No Cumplió</p>
          <p className="text-3xl font-black text-rose-600">{stats.noCumplio}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Calendar size={14} className="text-indigo-400" /> Filtrar por Mes
          </p>
          <select 
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-[11px] font-black uppercase outline-none focus:border-indigo-500 appearance-none cursor-pointer"
            value={localMonth}
            onChange={e => setLocalMonth(e.target.value)}
          >
            <option value="all">TODOS LOS MESES</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Hash size={14} className="text-indigo-400" /> Filtrar por Semana
          </p>
          <select 
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-[11px] font-black uppercase outline-none focus:border-indigo-500 appearance-none cursor-pointer"
            value={localWeek}
            onChange={e => setLocalWeek(e.target.value)}
          >
            <option value="all">TODAS LAS SEMANAS</option>
            {weeks.map(w => <option key={w} value={w}>SEMANA {w}</option>)}
          </select>
        </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {preventiveData.map(v => (
          <div key={v.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-lg overflow-hidden group hover:shadow-xl transition-all duration-500">
            <div className={`h-2 w-full ${v.complianceStatus === 'No cumplió' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-900 px-4 py-2 rounded-xl text-white font-mono font-black text-xl tracking-tighter shadow-lg shadow-slate-900/20">
                      {v.plate}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{v.month}</span>
                      <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">SEM {v.week}</span>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest w-fit ${
                    v.complianceStatus === 'No cumplió' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                  }`}>
                    {v.complianceStatus || 'SIN REGISTRO'}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black text-slate-400 uppercase tracking-widest">FECHA EJEC.</span>
                  <span className="font-black text-slate-600">{v.lastUpdate ? new Date(v.lastUpdate).toLocaleDateString('es-ES') : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black text-slate-400 uppercase tracking-widest">ÚLTIMO MTTO</span>
                  <span className="font-black text-slate-600">{v.lastMaintenanceMileage?.toLocaleString()} KM</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black text-slate-400 uppercase tracking-widest">KM REGISTRADO</span>
                  <span className="font-black text-slate-800">{v.currentMileage?.toLocaleString()} KM</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black text-slate-400 uppercase tracking-widest">PRÓXIMO MANT.</span>
                  <span className="font-black text-indigo-600">{v.nextMaintenanceMileage?.toLocaleString()} KM</span>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">DIFERENCIA</span>
                    <span className={`font-black ${v.difference && v.difference > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {v.difference?.toLocaleString()} KM
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${v.complianceStatus === 'No cumplió' ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.max(0, Math.min(100, 100 - (Math.abs(v.difference || 0) / 1000) * 100))}%` }}
                    />
                  </div>
                </div>

                {v.validationStatus && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Validación</p>
                    <p className="text-[10px] text-slate-600 font-medium leading-relaxed">{v.validationStatus}</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">FRECUENCIA</span>
                  <span className="text-[10px] font-bold text-slate-600 uppercase">{v.frequency?.toLocaleString()} KM</span>
                </div>
                <div className="flex items-center gap-2">
                  {v.evidenceUrl && v.evidenceUrl.trim() !== '' && (
                    <a 
                      href={v.evidenceUrl.startsWith('http') ? v.evidenceUrl : `https://${v.evidenceUrl}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                      title="Ver Evidencia"
                    >
                      <Search size={14} />
                    </a>
                  )}
                  <Gauge size={20} className="text-slate-200" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PreventiveModule;
