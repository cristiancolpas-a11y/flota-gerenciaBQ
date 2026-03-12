
import React, { useMemo } from 'react';
import { Truck, Gauge, AlertTriangle, CheckCircle2, Clock, Search, Camera } from 'lucide-react';
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
  selectedMonth,
  filterCd,
  filterContractor,
  onUpdate 
}) => {
  
  const maintenanceInterval = 5000; // Example: 5000km interval

  const preventiveData = useMemo(() => {
    const normalizeStr = (s: string) => s?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || '';
    
    if (!externalPreventives || externalPreventives.length === 0) return [];

    // 1. Filter the raw external preventives based on global filters
    return externalPreventives.filter(p => {
      const vehicle = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(p.plate));
      
      const matchSearch = normalizePlate(p.plate).includes(normalizePlate(searchTerm));
      
      // Improved month matching: check if p.month is a prefix of selectedMonth or vice versa
      const pMonth = normalizeStr(p.month);
      const sMonth = normalizeStr(selectedMonth);
      const matchMonth = !selectedMonth || !p.month || pMonth.includes(sMonth) || sMonth.includes(pMonth);
      
      const matchCd = !filterCd || filterCd === 'all' || (vehicle && vehicle.cd === filterCd) || p.cd === filterCd;
      const matchContractor = !filterContractor || filterContractor === 'all' || (vehicle && vehicle.contractor === filterContractor) || p.contractor === filterContractor;
      
      return matchSearch && matchMonth && matchCd && matchContractor;
    }).sort((a, b) => {
      // Sort by month/week if possible, then by plate
      return a.plate.localeCompare(b.plate);
    });
  }, [vehicles, searchTerm, externalPreventives, selectedMonth, filterCd, filterContractor]);

  const stats = useMemo(() => {
    return {
      totalInSheet: externalPreventives?.length || 0,
      totalFiltered: preventiveData.length,
      critical: preventiveData.filter(v => v.status === 'critical').length,
      warning: preventiveData.filter(v => v.status === 'warning').length,
      ok: preventiveData.filter(v => v.status === 'ok').length
    };
  }, [preventiveData, externalPreventives]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
            <Clock size={40} className="text-indigo-600" /> Mantenimiento Preventivo
          </h2>
          <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em] ml-14">Seguimiento por kilometraje (Intervalo: {maintenanceInterval}km)</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-lg">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total en Hoja</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-slate-900">{stats.totalInSheet}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filas</p>
          </div>
        </div>
        <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 shadow-lg">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Filtrados ({selectedMonth})</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-indigo-600">{stats.totalFiltered}</p>
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Entradas</p>
          </div>
        </div>
        <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 shadow-lg">
          <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Vencidos/Críticos</p>
          <p className="text-3xl font-black text-rose-600">{stats.critical}</p>
        </div>
        <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 shadow-lg">
          <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Próximos</p>
          <p className="text-3xl font-black text-amber-600">{stats.warning}</p>
        </div>
        <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 shadow-lg">
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Al Día</p>
          <p className="text-3xl font-black text-emerald-600">{stats.ok}</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Mostrando <span className="text-indigo-600">{preventiveData.length}</span> de <span className="text-slate-900">{stats.totalInSheet}</span> registros encontrados en la hoja
        </p>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {preventiveData.map(v => (
          <div key={v.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-lg overflow-hidden group hover:shadow-xl transition-all duration-500">
            <div className={`h-2 w-full ${v.status === 'critical' ? 'bg-rose-500' : v.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-900 px-4 py-2 rounded-xl text-white font-mono font-black text-xl tracking-tighter shadow-lg shadow-slate-900/20">
                      {v.plate}
                    </div>
                    {(v.week || v.month) && (
                      <div className="flex flex-col">
                        {v.month && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{v.month}</span>}
                        {v.week && <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">SEM {v.week}</span>}
                      </div>
                    )}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest w-fit ${
                    (v.complianceStatus?.toLowerCase().includes('no cumplió') || v.complianceStatus?.toLowerCase().includes('no cumplio') || v.validationStatus?.toLowerCase().includes('no cumplió') || v.validationStatus?.toLowerCase().includes('no cumplio')) ? 'bg-rose-100 text-rose-600' : 
                    (v.complianceStatus?.toLowerCase().includes('cumplió') || v.complianceStatus?.toLowerCase().includes('cumplio') || v.validationStatus?.toLowerCase().includes('cumplió') || v.validationStatus?.toLowerCase().includes('cumplio')) ? 'bg-emerald-100 text-emerald-600' :
                    v.status === 'critical' ? 'bg-rose-100 text-rose-600' : 
                    v.status === 'warning' ? 'bg-amber-100 text-amber-600' : 
                    'bg-emerald-100 text-emerald-600'
                  }`}>
                    {v.validationStatus && v.validationStatus !== '0%' && v.validationStatus !== '0' ? (
                      <span className="flex items-center gap-1">
                        {v.validationStatus} VALIDACIÓN
                      </span>
                    ) : (
                      v.validationStatus || v.complianceStatus || (v.status === 'critical' ? 'CRÍTICO' : v.status === 'warning' ? 'PRÓXIMO' : 'AL DÍA')
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black text-slate-400 uppercase tracking-widest">FECHA PROG.</span>
                  <span className="font-black text-slate-600">{v.lastUpdate ? new Date(v.lastUpdate).toLocaleDateString('es-ES') : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black text-slate-400 uppercase tracking-widest">ÚLTIMO MTTO</span>
                  <span className="font-black text-slate-600">{v.lastMaintenanceMileage?.toLocaleString()} KM</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black text-slate-400 uppercase tracking-widest">KM ACTUAL</span>
                  <span className="font-black text-slate-800">{v.currentMileage?.toLocaleString()} KM</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black text-slate-400 uppercase tracking-widest">PRÓXIMO MANT.</span>
                  <span className="font-black text-indigo-600">{v.nextMaintenanceMileage.toLocaleString()} KM</span>
                </div>
                
                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">DIFERENCIA (KM)</span>
                    <span className={`font-black ${v.kmsToNext < 0 ? 'text-rose-600 animate-pulse' : v.status === 'critical' ? 'text-rose-600' : 'text-slate-600'}`}>
                      {v.kmsToNext < 0 ? `VENCIDO ${Math.abs(v.kmsToNext).toLocaleString()}` : `${v.kmsToNext.toLocaleString()}`} KM
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        v.status === 'critical' ? 'bg-rose-500' : 
                        v.status === 'warning' ? 'bg-amber-500' : 
                        'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(0, Math.min(100, (v.kmsToNext / maintenanceInterval) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">ÚLTIMA EJECUCIÓN</span>
                  <span className="text-[10px] font-bold text-slate-600 uppercase">{v.lastUpdate || 'SIN REGISTRO'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {v.evidenceUrl && v.evidenceUrl.startsWith('http') && (
                    <a 
                      href={v.evidenceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                      title="Ver Evidencia"
                    >
                      <Search size={14} />
                    </a>
                  )}
                  <button 
                    onClick={() => onUpdate?.(v)}
                    className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                    title="Actualizar Registro"
                  >
                    <Camera size={14} />
                  </button>
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
