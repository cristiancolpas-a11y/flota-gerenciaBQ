import React, { useMemo, useState } from 'react';
import { Vehicle, AvailabilityRecord, FleetComposition } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, ComposedChart, Area
} from 'recharts';
import { 
  Activity, Filter, Calendar, Building2, Users, Wrench, AlertTriangle, 
  ChevronLeft, ChevronRight, Download, Table as TableIcon, BarChart3, TrendingUp,
  Truck
} from 'lucide-react';
import { normalizePlate, normalizeStr } from '../utils';

interface AvailabilityIndicatorsProps {
  vehicles: Vehicle[];
  availabilityRecords: AvailabilityRecord[];
  fleetComposition: FleetComposition[];
}

const AvailabilityIndicators: React.FC<AvailabilityIndicatorsProps> = ({
  vehicles,
  availabilityRecords,
  fleetComposition
}) => {
  // Filters
  const [filterCd, setFilterCd] = useState('all');
  const [filterContractor, setFilterContractor] = useState('all');
  const [filterSystem, setFilterSystem] = useState('all');
  const [filterWorkshop, setFilterWorkshop] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '2026-01-01', end: new Date().toISOString().split('T')[0] });

  // Options for filters
  const cds = useMemo(() => Array.from(new Set(fleetComposition.map(fc => fc.cd).filter(Boolean))), [fleetComposition]);
  const contractors = useMemo(() => Array.from(new Set(fleetComposition.map(fc => fc.contractor).filter(Boolean))), [fleetComposition]);
  const systems = useMemo(() => Array.from(new Set(availabilityRecords.map(r => r.system).filter(Boolean))), [availabilityRecords]);
  const workshops = useMemo(() => Array.from(new Set(availabilityRecords.map(r => r.workshop).filter(Boolean))), [availabilityRecords]);

  // Filtered Data
  const filteredRecords = useMemo(() => {
    return availabilityRecords.filter(r => {
      const matchCd = filterCd === 'all' || r.cd === filterCd;
      const matchContractor = filterContractor === 'all' || r.contractor === filterContractor;
      const matchSystem = filterSystem === 'all' || r.system === filterSystem;
      const matchWorkshop = filterWorkshop === 'all' || r.workshop === filterWorkshop;
      
      let matchDate = true;
      if (dateRange.start && dateRange.end) {
        const rDate = new Date(r.date.split('/').reverse().join('-'));
        const sDate = new Date(dateRange.start);
        const eDate = new Date(dateRange.end);
        matchDate = rDate >= sDate && rDate <= eDate;
      }
      
      return matchCd && matchContractor && matchSystem && matchWorkshop && matchDate;
    });
  }, [availabilityRecords, filterCd, filterContractor, filterSystem, filterWorkshop, dateRange]);

  // Stats & Indicators
  const indicators = useMemo(() => {
    if (filteredRecords.length === 0) return { topSystem: 'N/A', topWorkshop: 'N/A' };

    const systemCounts: Record<string, number> = {};
    const workshopCounts: Record<string, number> = {};

    filteredRecords.forEach(r => {
      if (r.system) systemCounts[r.system] = (systemCounts[r.system] || 0) + 1;
      if (r.workshop) workshopCounts[r.workshop] = (workshopCounts[r.workshop] || 0) + 1;
    });

    const topSystem = Object.entries(systemCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const topWorkshop = Object.entries(workshopCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return { topSystem, topWorkshop };
  }, [filteredRecords]);

  // Daily Availability Calculation
  const dailyStats = useMemo(() => {
    const dates = Array.from(new Set(availabilityRecords.map(r => r.date)))
      .filter((d): d is string => typeof d === 'string' && d.includes('/'))
      .sort((a, b) => {
        const dateA = new Date(a.split('/').reverse().join('-')).getTime();
        const dateB = new Date(b.split('/').reverse().join('-')).getTime();
        return dateA - dateB;
      });

    return dates.map(date => {
      const dayRecords = availabilityRecords.filter(r => r.date === date);
      
      // Apply filters to both fleet and unavailable count
      const filteredFleet = fleetComposition.filter(fc => {
        const matchCd = filterCd === 'all' || fc.cd === filterCd;
        const matchContractor = filterContractor === 'all' || fc.contractor === filterContractor;
        return matchCd && matchContractor;
      });
      const totalFleet = filteredFleet.reduce((sum, fc) => sum + fc.count, 0) || 1;

      const unavailableCount = new Set(dayRecords.filter(r => {
        const matchCd = filterCd === 'all' || r.cd === filterCd;
        const matchContractor = filterContractor === 'all' || r.contractor === filterContractor;
        return matchCd && matchContractor;
      }).map(r => r.fullPlate)).size;

      const availability = ((totalFleet - unavailableCount) / totalFleet) * 100;

      return {
        date,
        availability: parseFloat(availability.toFixed(2)),
        unavailable: unavailableCount,
        total: totalFleet
      };
    }).filter(d => {
      if (!dateRange.start || !dateRange.end) return true;
      const dDate = new Date(d.date.split('/').reverse().join('-'));
      return dDate >= new Date(dateRange.start) && dDate <= new Date(dateRange.end);
    });
  }, [availabilityRecords, vehicles, filterCd, filterContractor, dateRange]);

  // Weekly Stats
  const weeklyStats = useMemo(() => {
    const weeks: Record<string, { sum: number, count: number }> = {};
    
    dailyStats.forEach(d => {
      // Simple week calculation (not perfect but works for trends)
      const dateParts = d.date.split('/');
      const dateObj = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
      const weekNum = Math.ceil((dateObj.getDate() + new Date(dateObj.getFullYear(), dateObj.getMonth(), 1).getDay()) / 7);
      const weekKey = `Sem ${weekNum} - ${dateParts[1]}/${dateParts[2]}`;
      
      if (!weeks[weekKey]) weeks[weekKey] = { sum: 0, count: 0 };
      weeks[weekKey].sum += d.availability;
      weeks[weekKey].count += 1;
    });

    return Object.entries(weeks).map(([name, data]) => ({
      name,
      availability: parseFloat((data.sum / data.count).toFixed(2))
    }));
  }, [dailyStats]);

  // Monthly Stats
  const monthlyStats = useMemo(() => {
    const months: Record<string, { sum: number, count: number }> = {};
    
    dailyStats.forEach(d => {
      const dateParts = d.date.split('/');
      const monthKey = `${dateParts[1]}/${dateParts[2]}`;
      
      if (!months[monthKey]) months[monthKey] = { sum: 0, count: 0 };
      months[monthKey].sum += d.availability;
      months[monthKey].count += 1;
    });

    return Object.entries(months).map(([name, data]) => ({
      name,
      availability: parseFloat((data.sum / data.count).toFixed(2))
    }));
  }, [dailyStats]);

  const chartCds = useMemo(() => {
    const cdsSet = new Set<string>();
    filteredRecords.forEach(r => cdsSet.add(r.cd || 'null'));
    return Array.from(cdsSet).sort();
  }, [filteredRecords]);

  const cdColors: Record<string, string> = {
    'GALAPA': '#94a3b8',
    'LA ARENOSA': '#eab308',
    'null': '#a855f7',
    'N/A': '#cbd5e1'
  };

  const getCdColor = (cd: string) => {
    const upperCd = cd.toUpperCase();
    if (cdColors[upperCd]) return cdColors[upperCd];
    if (upperCd.includes('GALAPA')) return cdColors['GALAPA'];
    if (upperCd.includes('ARENOSA')) return cdColors['LA ARENOSA'];
    return '#6366f1'; // Default indigo
  };

  // Frequency Data (Count of reports)
  const systemFrequencyData = useMemo(() => {
    const dataMap: Record<string, Record<string, number>> = {};
    filteredRecords.forEach(r => {
      const system = r.system || 'N/A';
      const cd = r.cd || 'null';
      if (!dataMap[system]) dataMap[system] = {};
      dataMap[system][cd] = (dataMap[system][cd] || 0) + 1;
    });
    return Object.entries(dataMap).map(([system, cdsData]) => ({
      name: system,
      ...cdsData
    })).sort((a, b) => {
      const totalA = Object.values(a).filter(v => typeof v === 'number').reduce((s, v) => s + (v as number), 0);
      const totalB = Object.values(b).filter(v => typeof v === 'number').reduce((s, v) => s + (v as number), 0);
      return totalB - totalA;
    });
  }, [filteredRecords]);

  const workshopFrequencyData = useMemo(() => {
    const dataMap: Record<string, Record<string, number>> = {};
    filteredRecords.forEach(r => {
      const workshop = r.workshop || 'N/A';
      const cd = r.cd || 'null';
      if (!dataMap[workshop]) dataMap[workshop] = {};
      dataMap[workshop][cd] = (dataMap[workshop][cd] || 0) + 1;
    });
    return Object.entries(dataMap).map(([workshop, cdsData]) => ({
      name: workshop,
      ...cdsData
    })).sort((a, b) => {
      const totalA = Object.values(a).filter(v => typeof v === 'number').reduce((s, v) => s + (v as number), 0);
      const totalB = Object.values(b).filter(v => typeof v === 'number').reduce((s, v) => s + (v as number), 0);
      return totalB - totalA;
    }).slice(0, 10);
  }, [filteredRecords]);

  const plateFrequencyData = useMemo(() => {
    const dataMap: Record<string, Record<string, number>> = {};
    filteredRecords.forEach(r => {
      const plate = r.plate || 'N/A';
      const cd = r.cd || 'null';
      if (!dataMap[plate]) dataMap[plate] = {};
      dataMap[plate][cd] = (dataMap[plate][cd] || 0) + 1;
    });
    return Object.entries(dataMap).map(([plate, cdsData]) => ({
      name: plate,
      ...cdsData
    })).sort((a, b) => {
      const totalA = Object.values(a).filter(v => typeof v === 'number').reduce((s, v) => s + (v as number), 0);
      const totalB = Object.values(b).filter(v => typeof v === 'number').reduce((s, v) => s + (v as number), 0);
      return totalB - totalA;
    }).slice(0, 12);
  }, [filteredRecords]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
            <TrendingUp size={40} className="text-indigo-600" /> Disponibilidad
          </h2>
          <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em] ml-14">Análisis operativo basado en disponibilidadd</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-wrap gap-4 items-end">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CD</label>
          <div className="relative">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select 
              value={filterCd}
              onChange={(e) => setFilterCd(e.target.value)}
              className="pl-12 pr-8 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 appearance-none min-w-[160px]"
            >
              <option value="all">Todos los CD</option>
              {cds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contratista</label>
          <div className="relative">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select 
              value={filterContractor}
              onChange={(e) => setFilterContractor(e.target.value)}
              className="pl-12 pr-8 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 appearance-none min-w-[180px]"
            >
              <option value="all">Todos los Contratistas</option>
              {contractors.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sistema</label>
          <div className="relative">
            <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select 
              value={filterSystem}
              onChange={(e) => setFilterSystem(e.target.value)}
              className="pl-12 pr-8 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 appearance-none min-w-[160px]"
            >
              <option value="all">Todos los Sistemas</option>
              {systems.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Taller</label>
          <div className="relative">
            <Wrench className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select 
              value={filterWorkshop}
              onChange={(e) => setFilterWorkshop(e.target.value)}
              className="pl-12 pr-8 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 appearance-none min-w-[160px]"
            >
              <option value="all">Todos los Talleres</option>
              {workshops.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rango de Fechas</label>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-4 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-slate-400 text-xs font-black">A</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-4 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Indicators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-200 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Activity size={120} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Disponibilidad Promedio</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-5xl font-black">
              {dailyStats.length > 0 
                ? (dailyStats.reduce((acc, curr) => acc + curr.availability, 0) / dailyStats.length).toFixed(1) 
                : '0.0'}%
            </h3>
          </div>
          <p className="text-[10px] mt-4 font-bold opacity-60 uppercase tracking-widest">Basado en periodo seleccionado</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sistema con más fallas</p>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{indicators.topSystem}</h3>
          </div>
          <div className="mt-4 flex items-center gap-2 text-rose-500">
            <AlertTriangle size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Crítico para mantenimiento</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Taller con más reportes</p>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{indicators.topWorkshop}</h3>
          </div>
          <div className="mt-4 flex items-center gap-2 text-indigo-500">
            <Wrench size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Mayor flujo de vehículos</span>
          </div>
        </div>
      </div>

      {/* Fleet Composition Summary */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <Truck size={18} className="text-indigo-600" /> Composición de Flota Base (Hoja Maestra)
          </h3>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Números usados como denominador</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-2">Por Centro de Distribución (CD)</p>
            <div className="grid grid-cols-2 gap-4">
              {cds.map(cd => {
                const count = fleetComposition
                  .filter(fc => fc.cd === cd)
                  .reduce((sum, fc) => sum + fc.count, 0);
                return (
                  <div key={cd as string} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-600 uppercase">{cd as string}</span>
                    <span className="text-sm font-black text-slate-900">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-2">Por Contratista</p>
            <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {contractors.map(c => {
                const count = fleetComposition
                  .filter(fc => fc.contractor === c)
                  .reduce((sum, fc) => sum + fc.count, 0);
                return (
                  <div key={c as string} className="flex justify-between items-center bg-slate-50 p-2 px-4 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-600 uppercase truncate mr-4">{c as string}</span>
                    <span className="text-sm font-black text-slate-900">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-600" /> Disponibilidad Diaria (%)
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 9, fontWeight: 900 }} 
                />
                <YAxis 
                  domain={[0, 100]} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 900, fontSize: '12px', marginBottom: '4px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="availability" 
                  stroke="#4f46e5" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 size={18} className="text-indigo-600" /> Disponibilidad Semanal (%)
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 9, fontWeight: 900 }} 
                />
                <YAxis 
                  domain={[0, 100]} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="availability" fill="#818cf8" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-600" /> Disponibilidad Mensual (%)
          </h3>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyStats}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} 
              />
              <YAxis 
                domain={[0, 100]} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
              />
              <Tooltip 
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="availability" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Frequency Section */}
      <div className="space-y-8">
        <div className="flex items-center gap-4 px-4">
          <div className="h-px flex-1 bg-slate-200"></div>
          <h2 className="text-xl font-black text-slate-400 uppercase tracking-[0.3em]">Frecuencia de Reportes (Veces)</h2>
          <div className="h-px flex-1 bg-slate-200"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* System Frequency Chart */}
          <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <BarChart3 size={18} className="text-indigo-600" /> Frecuencia por Sistema
              </h3>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={systemFrequencyData} margin={{ bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 8, fontWeight: 900 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none' }} />
                  {chartCds.map(cd => (
                    <Bar key={cd} dataKey={cd} name={cd === 'null' ? 'Sin CD' : cd} fill={getCdColor(cd)} radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 8, fontWeight: 900 }} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Workshop Frequency Chart */}
          <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Wrench size={18} className="text-indigo-600" /> Frecuencia por Taller
              </h3>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workshopFrequencyData} margin={{ bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 8, fontWeight: 900 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none' }} />
                  {chartCds.map(cd => (
                    <Bar key={cd} dataKey={cd} name={cd === 'null' ? 'Sin CD' : cd} fill={getCdColor(cd)} radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 8, fontWeight: 900 }} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Plate Frequency Chart */}
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Truck size={18} className="text-indigo-600" /> Frecuencia por Placa
            </h3>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={plateFrequencyData} margin={{ bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 8, fontWeight: 900 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none' }} />
                {chartCds.map(cd => (
                  <Bar key={cd} dataKey={cd} name={cd === 'null' ? 'Sin CD' : cd} fill={getCdColor(cd)} radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 8, fontWeight: 900 }} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <TableIcon size={18} className="text-indigo-600" /> Reporte Detallado de Indisponibilidad
          </h3>
          <span className="bg-indigo-100 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
            {filteredRecords.length} Registros
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Fecha</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">CD</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Sistema</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Placa</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Novedad</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Taller</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Ingreso</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Días</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRecords.map((r, idx) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-xs font-bold text-slate-600">{r.date}</td>
                  <td className="px-6 py-4 text-xs font-black text-slate-900">{r.cd}</td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      {r.system}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-900 text-white px-3 py-1 rounded-lg font-mono font-black text-xs tracking-tighter">
                      {r.plate}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate font-medium" title={r.detail}>
                    {r.detail}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-600">{r.workshop}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{r.entryDate}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black ${
                      r.daysUnavailable > 5 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {r.daysUnavailable}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-slate-400 font-black uppercase tracking-widest text-sm">
                    No hay registros para los filtros seleccionados
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

export default AvailabilityIndicators;
