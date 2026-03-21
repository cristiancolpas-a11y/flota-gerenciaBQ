
import React, { useMemo, useState } from 'react';
import { Truck, Gauge, AlertTriangle, CheckCircle2, Clock, Search, Camera, Calendar, Hash, Filter, ExternalLink, TrendingUp, BarChart3, Plus } from 'lucide-react';
import { Vehicle, MileageLog, Preventive } from '../types';
import { normalizePlate } from '../utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  Legend,
  ReferenceLine
} from 'recharts';

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
      cumplio: preventiveData.filter(v => v.complianceStatus === 'Cumplió' || v.complianceStatus === '1').length,
      noCumplio: preventiveData.filter(v => v.complianceStatus === 'No cumplió' || v.complianceStatus === '0').length,
    };
  }, [preventiveData, externalPreventives]);

  const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  const weeks = Array.from({ length: 53 }, (_, i) => (i + 1).toString());

  const chartData = useMemo(() => {
    // Filter data for Month and Week charts based on CD and Contractor filters
    const filteredForCharts = externalPreventives?.filter(p => {
      const vehicle = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(p.plate));
      const matchCd = !filterCd || filterCd === 'all' || (vehicle && vehicle.cd === filterCd) || p.cd === filterCd;
      const matchContractor = !filterContractor || filterContractor === 'all' || (vehicle && vehicle.contractor === filterContractor) || p.contractor === filterContractor;
      return matchCd && matchContractor;
    }) || [];

    // Month data
    const monthStats = months.map(m => {
      const monthData = filteredForCharts.filter(p => p.month?.toUpperCase() === m);
      const total = monthData.length;
      const complied = monthData.filter(p => p.complianceStatus === 'Cumplió' || p.complianceStatus === '1').length;
      const percentage = total > 0 ? Math.round((complied / total) * 100) : 0;
      return { name: m.substring(0, 3), percentage, total, complied };
    }).filter(m => m.total > 0);

    // Week data (last 12 weeks with data)
    const weekStats = weeks.map(w => {
      const weekData = filteredForCharts.filter(p => p.week === w);
      const total = weekData.length;
      const complied = weekData.filter(p => p.complianceStatus === 'Cumplió' || p.complianceStatus === '1').length;
      return { name: `S${w}`, complied, total };
    }).filter(w => w.total > 0).slice(-12);

    // CD data (always show all CDs for comparison, but respect Contractor filter)
    const cds = Array.from(new Set(externalPreventives?.map(p => p.cd?.trim()).filter(Boolean) || []));
    const cdStats = cds.map(cd => {
      const cdData = externalPreventives?.filter(p => {
        const vehicle = vehicles.find(v => normalizePlate(v.plate) === normalizePlate(p.plate));
        const matchCd = p.cd?.trim() === cd;
        const matchContractor = !filterContractor || filterContractor === 'all' || (vehicle && vehicle.contractor === filterContractor) || p.contractor === filterContractor;
        return matchCd && matchContractor;
      }) || [];
      const total = cdData.length;
      const complied = cdData.filter(p => p.complianceStatus === 'Cumplió' || p.complianceStatus === '1').length;
      const percentage = total > 0 ? Math.round((complied / total) * 100) : 0;
      return { name: String(cd).toUpperCase(), percentage, total, complied };
    }).filter(cd => cd.total > 0).sort((a, b) => b.percentage - a.percentage);

    return { monthStats, weekStats, cdStats };
  }, [externalPreventives, vehicles, filterCd, filterContractor, months, weeks]);

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
          <Plus size={20} /> Registrar Preventivo
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                <TrendingUp size={20} className="text-indigo-600" /> Mensual (%)
              </h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                {filterCd && filterCd !== 'all' ? `CD: ${filterCd}` : 'Todos los Centros'}
              </p>
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.monthStats} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 800 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 800 }}
                  unit="%"
                  domain={[0, 100]}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '10px',
                    fontWeight: '800',
                    textTransform: 'uppercase'
                  }}
                />
                <ReferenceLine y={100} stroke="#10b981" strokeDasharray="3 3" />
                <Bar dataKey="percentage" radius={[6, 6, 6, 6]} barSize={20}>
                  {chartData.monthStats.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.percentage >= 95 ? '#10b981' : entry.percentage >= 80 ? '#f59e0b' : '#ef4444'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                <BarChart3 size={20} className="text-indigo-600" /> Semanal
              </h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                {filterCd && filterCd !== 'all' ? `CD: ${filterCd}` : 'Todos los Centros'}
              </p>
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.weekStats} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 800 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 800 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '10px',
                    fontWeight: '800',
                    textTransform: 'uppercase'
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', paddingTop: '10px' }} />
                <Line 
                  type="monotone" 
                  dataKey="complied" 
                  name="Cumplieron"
                  stroke="#6366f1" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  name="Total"
                  stroke="#cbd5e1" 
                  strokeWidth={1} 
                  strokeDasharray="3 3"
                  dot={{ r: 3, fill: '#cbd5e1', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                <Filter size={20} className="text-indigo-600" /> Por CD (%)
              </h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Cumplimiento por Centro</p>
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.cdStats} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis 
                  type="number"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 800 }}
                  unit="%"
                  domain={[0, 100]}
                />
                <YAxis 
                  dataKey="name" 
                  type="category"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 800 }}
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '10px',
                    fontWeight: '800',
                    textTransform: 'uppercase'
                  }}
                />
                <Bar dataKey="percentage" radius={[0, 6, 6, 0]} barSize={15}>
                  {chartData.cdStats.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.percentage >= 95 ? '#10b981' : entry.percentage >= 80 ? '#f59e0b' : '#ef4444'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
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
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-lg overflow-hidden">
        <div className="overflow-y-auto max-h-[600px]">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200 text-[8px] uppercase tracking-widest text-slate-500 font-black">
                <th className="p-2 w-[40px]">SEM</th>
                <th className="p-2 w-[60px]">MES</th>
                <th className="p-2 w-[80px]">FECHA</th>
                <th className="p-2 w-[80px]">PLACA</th>
                <th className="p-2 w-[70px]">FREC.</th>
                <th className="p-2 w-[80px]">ÚLT. KM</th>
                <th className="p-2 w-[80px]">PRÓX. KM</th>
                <th className="p-2 w-[80px]">REG. KM</th>
                <th className="p-2 w-[70px]">DIF.</th>
                <th className="p-2 w-[100px] text-center">CUMPLIMIENTO</th>
                <th className="p-2 w-[60px] text-center">VAL.</th>
                <th className="p-2 w-[80px] text-center">EVIDENCIA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[10px] font-medium text-slate-700">
              {preventiveData.map(v => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-2 font-black text-indigo-500">
                    {v.week}
                  </td>
                  <td className="p-2 font-black text-slate-400 uppercase tracking-widest text-[8px]">
                    {v.month}
                  </td>
                  <td className="p-2 font-black text-slate-600">
                    {v.lastUpdate ? new Date(v.lastUpdate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) : 'N/A'}
                  </td>
                  <td className="p-2">
                    <span className="bg-slate-900 px-2 py-1 rounded text-white font-mono font-black tracking-tighter text-[9px]">
                      {v.plate}
                    </span>
                  </td>
                  <td className="p-2 font-black text-slate-600">
                    {v.frequency?.toLocaleString()}
                  </td>
                  <td className="p-2 font-black text-slate-600">
                    {v.lastMaintenanceMileage?.toLocaleString()}
                  </td>
                  <td className="p-2 font-black text-indigo-600">
                    {v.nextMaintenanceMileage?.toLocaleString()}
                  </td>
                  <td className="p-2 font-black text-slate-800">
                    {v.currentMileage?.toLocaleString()}
                  </td>
                  <td className="p-2">
                    <span className={`font-black ${v.difference && v.difference > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {v.difference?.toLocaleString()}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest inline-block ${
                      v.complianceStatus === 'Cumplió' || v.complianceStatus === '1' ? 'bg-emerald-100 text-emerald-600' : 
                      (v.complianceStatus === 'No cumplió' || v.complianceStatus === '0' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600')
                    }`}>
                      {v.complianceStatus === 'Cumplió' || v.complianceStatus === '1' ? 'CUMPLIÓ' : 
                       (v.complianceStatus === 'No cumplió' || v.complianceStatus === '0' ? 'NO CUMPLIÓ' : 'SIN REG.')}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest inline-block ${
                      v.validationStatus === '100%' ? 'bg-emerald-100 text-emerald-600' : 
                      (v.validationStatus === '0%' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600')
                    }`}>
                      {v.validationStatus || '-'}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    {v.evidenceUrl && v.evidenceUrl.trim() !== '' ? (
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {v.evidenceUrl.split(',').map((url, idx) => {
                          const cleanUrl = url.trim();
                          if (!cleanUrl) return null;
                          return (
                            <a 
                              key={idx}
                              href={cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"
                              title={`Ver Evidencia ${idx + 1}`}
                            >
                              <Search size={10} />
                            </a>
                          );
                        })}
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (onUpdate) onUpdate(v);
                        }}
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400 hover:bg-indigo-100 hover:text-indigo-600 transition-all"
                        title="Registrar Evidencia"
                      >
                        <Camera size={10} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {preventiveData.length === 0 && (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-400 font-medium">
                    No hay registros preventivos que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PreventiveModule;
