import React, { useMemo, useState } from 'react';
import { Vehicle, AvailabilityRecord } from '../types';
import { Truck, Wrench, CheckCircle2, AlertTriangle, Activity, CalendarDays, BarChart3, LayoutGrid, List } from 'lucide-react';
import { normalizePlate } from '../utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface AvailabilityModuleProps {
  vehicles: Vehicle[];
  availabilityRecords: AvailabilityRecord[];
  searchTerm: string;
  filterCd: string;
  filterContractor: string;
}

const AvailabilityModule: React.FC<AvailabilityModuleProps> = ({
  vehicles,
  availabilityRecords,
  searchTerm,
  filterCd,
  filterContractor
}) => {
  const [viewMode, setViewMode] = useState<'charts' | 'list'>('charts');

  const availabilityData = useMemo(() => {
    return vehicles.filter(v => {
      const matchCd = filterCd === 'all' || v.cd === filterCd;
      const matchContractor = filterContractor === 'all' || v.contractor === filterContractor;
      const matchSearch = normalizePlate(v.plate).includes(normalizePlate(searchTerm));
      return matchCd && matchContractor && matchSearch;
    }).map(v => {
      const records = availabilityRecords.filter(r => normalizePlate(r.fullPlate) === normalizePlate(v.plate));
      const isAvailable = records.length === 0;
      return { ...v, isAvailable, records };
    }).sort((a, b) => {
      if (a.isAvailable === b.isAvailable) return a.plate.localeCompare(b.plate);
      return a.isAvailable ? 1 : -1;
    });
  }, [vehicles, availabilityRecords, searchTerm, filterCd, filterContractor]);

  const chartData = useMemo(() => {
    // 1. Placas por Día (Actually frequency of plates in the sheet)
    const plateCounts: Record<string, any> = {};
    availabilityRecords.forEach(r => {
      const plate = r.plate || 'SIN PLACA';
      const cd = r.cd || 'null';
      if (!plateCounts[plate]) {
        plateCounts[plate] = { name: plate, 'LA ARENOSA': 0, 'GALAPA': 0, 'null': 0 };
      }
      const key = cd.includes('ARENOSA') ? 'LA ARENOSA' : cd.includes('GALAPA') ? 'GALAPA' : 'null';
      plateCounts[plate][key] = (plateCounts[plate][key] || 0) + 1;
    });
    const platesChart = Object.values(plateCounts).sort((a, b) => {
      const totalA = (a['LA ARENOSA'] || 0) + (a['GALAPA'] || 0) + (a['null'] || 0);
      const totalB = (b['LA ARENOSA'] || 0) + (b['GALAPA'] || 0) + (b['null'] || 0);
      return totalB - totalA;
    }).slice(0, 10);

    // 2. Talleres
    const workshopCounts: Record<string, any> = {};
    availabilityRecords.forEach(r => {
      const workshop = r.workshop || 'SIN TALLER';
      const cd = r.cd || 'null';
      if (!workshopCounts[workshop]) {
        workshopCounts[workshop] = { name: workshop, 'La Arenosa': 0, 'Galapa': 0, 'null': 0 };
      }
      const key = cd.includes('ARENOSA') ? 'LA ARENOSA' : cd.includes('GALAPA') ? 'GALAPA' : 'null';
      workshopCounts[workshop][key] = (workshopCounts[workshop][key] || 0) + 1;
    });
    const workshopsChart = Object.values(workshopCounts).sort((a, b) => {
      const totalA = (a['LA ARENOSA'] || 0) + (a['GALAPA'] || 0) + (a['null'] || 0);
      const totalB = (b['LA ARENOSA'] || 0) + (b['GALAPA'] || 0) + (b['null'] || 0);
      return totalB - totalA;
    }).slice(0, 10);

    // 3. Disponibilidad por Sistema
    const systemCounts: Record<string, any> = {};
    availabilityRecords.forEach(r => {
      const system = r.system || 'OTROS';
      const cd = r.cd || 'null';
      if (!systemCounts[system]) {
        systemCounts[system] = { name: system, 'LA ARENOSA': 0, 'GALAPA': 0, 'null': 0 };
      }
      const key = cd.includes('ARENOSA') ? 'LA ARENOSA' : cd.includes('GALAPA') ? 'GALAPA' : 'null';
      systemCounts[system][key] = (systemCounts[system][key] || 0) + 1;
    });
    const systemsChart = Object.values(systemCounts).sort((a, b) => {
      const totalA = (a['LA ARENOSA'] || 0) + (a['GALAPA'] || 0) + (a['null'] || 0);
      const totalB = (b['LA ARENOSA'] || 0) + (b['GALAPA'] || 0) + (b['null'] || 0);
      return totalB - totalA;
    });

    return { platesChart, workshopsChart, systemsChart };
  }, [availabilityRecords]);

  const stats = useMemo(() => {
    const total = availabilityData.length;
    const available = availabilityData.filter(v => v.isAvailable).length;
    const unavailable = total - available;
    const availabilityRate = total > 0 ? Math.round((available / total) * 100) : 0;
    
    const cdBreakdown: Record<string, number> = {};
    availabilityData.forEach(v => {
      const cd = v.cd || 'GENERAL';
      cdBreakdown[cd] = (cdBreakdown[cd] || 0) + 1;
    });

    return { total, available, unavailable, availabilityRate, cdBreakdown };
  }, [availabilityData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-xl shadow-2xl border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b pb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 mb-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                <span className="text-[10px] font-bold text-slate-600 uppercase">{entry.name}:</span>
              </div>
              <span className="text-[10px] font-black text-slate-900">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
            <Activity size={40} className="text-indigo-600" /> Disponibilidad de Flota
          </h2>
          <div className="flex items-center gap-2 ml-14">
            <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em]">Estado operativo según hoja de DISPONIBILIDAD</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
          <button 
            onClick={() => setViewMode('charts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'charts' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <BarChart3 size={16} /> Gráficas
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <List size={16} /> Listado
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-lg flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Flota</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-slate-900">{stats.total}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vehículos</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 flex flex-wrap gap-3">
            {Object.entries(stats.cdBreakdown).map(([cd, count]) => (
              <div key={cd} className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{cd}: {count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 shadow-lg">
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Disponibles</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-emerald-600">{stats.available}</p>
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Operativos</p>
          </div>
        </div>
        <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 shadow-lg">
          <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">En Taller / Novedad</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-rose-600">{stats.unavailable}</p>
            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Inactivos</p>
          </div>
        </div>
        <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 shadow-lg">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">% Disponibilidad</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-indigo-600">{stats.availabilityRate}%</p>
          </div>
        </div>
      </div>

      {viewMode === 'charts' ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* PLACAS POR DIA */}
            <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 text-center border-b pb-4">PLACAS POR DÍA</h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.platesChart} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 9, fontWeight: 900 }} 
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '40px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} />
                    <Bar dataKey="LA ARENOSA" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="GALAPA" fill="#d97706" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="null" fill="#a78bfa" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* TALLERES */}
            <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 text-center border-b pb-4">TALLERES</h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.workshopsChart} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 9, fontWeight: 900 }} 
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '40px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} />
                    <Bar dataKey="LA ARENOSA" fill="#d97706" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="GALAPA" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="null" fill="#a78bfa" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* DISPONIBILIDAD POR SISTEMA */}
          <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 text-center border-b pb-4">DISPONIBILIDAD POR SISTEMA</h3>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.systemsChart} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} 
                    interval={0}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '40px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} />
                  <Bar dataKey="GALAPA" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar dataKey="LA ARENOSA" fill="#d97706" radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar dataKey="null" fill="#a78bfa" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availabilityData.map(v => (
            <div key={v.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-lg overflow-hidden group hover:shadow-xl transition-all duration-500">
              <div className={`h-2 w-full ${v.isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-900 px-4 py-2 rounded-xl text-white font-mono font-black text-xl tracking-tighter shadow-lg shadow-slate-900/20">
                        {v.plate}
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest w-fit flex items-center gap-1 ${
                      v.isAvailable ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                    }`}>
                      {v.isAvailable ? <CheckCircle2 size={10} /> : <Wrench size={10} />}
                      {v.isAvailable ? 'DISPONIBLE' : 'EN TALLER / NOVEDAD'}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-black text-slate-400 uppercase tracking-widest">CD</span>
                    <span className="font-black text-slate-600">{v.cd || 'GENERAL'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-black text-slate-400 uppercase tracking-widest">CONTRATISTA</span>
                    <span className="font-black text-slate-600 truncate max-w-[150px] text-right">{v.contractor || 'GENERAL'}</span>
                  </div>
                  
                  {!v.isAvailable && v.records.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                      <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Detalles de Inactividad:</span>
                      {v.records.map((r, idx) => (
                        <div key={`rec-${idx}`} className="text-xs flex flex-col gap-2 text-slate-600 bg-rose-50 p-3 rounded-xl border border-rose-100/50">
                          <div className="flex items-start gap-2">
                            <AlertTriangle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                            <div className="flex flex-col">
                              <span className="font-black text-slate-800">{r.system || 'SISTEMA NO ESPECIFICADO'}</span>
                              <span className="text-[10px] text-slate-500">{r.detail}</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-rose-100">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Taller:</span>
                              <span className="font-medium text-slate-700">{r.workshop}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Ingreso:</span>
                              <span className="font-medium text-slate-700">{r.entryDate}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Salida Est.:</span>
                              <span className="font-medium text-indigo-600">{r.estimatedExitDate}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {availabilityData.length === 0 && (
            <div className="col-span-full bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-200">
              <Truck size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No se encontraron vehículos</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AvailabilityModule;

