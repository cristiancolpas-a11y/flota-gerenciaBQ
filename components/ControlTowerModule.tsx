import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList 
} from 'recharts';
import { 
  AlertTriangle, CheckCircle, Clock, Truck, 
  Search, Filter, Calendar, Activity, 
  ChevronDown, ArrowUpRight, ArrowDownRight,
  ShieldAlert, MoreVertical, Download, TrendingUp, LayoutGrid
} from 'lucide-react';
import { ControlTowerRecord, Vehicle } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface ControlTowerModuleProps {
  data: ControlTowerRecord[];
  vehicles: Vehicle[];
}

const COLORS = {
  CRITICAL: '#ef4444', // Red
  HIGH: '#f97316',     // Orange
  MEDIUM: '#facc15',   // Yellow
  LOW: '#22c55e',      // Green
  PRIMARY: '#3b82f6',  // Blue
  SECONDARY: '#a855f7', // Purple
  NEUTRAL: '#94a3b8'    // Slate
};

const CRITICIDAD_COLORS: Record<string, string> = {
  '1': COLORS.CRITICAL,
  '2': COLORS.HIGH,
  '3': COLORS.MEDIUM,
  '4': COLORS.LOW,
  'ALTA': COLORS.CRITICAL,
  'MEDIA': COLORS.HIGH,
  'BAJA': COLORS.LOW
};

const ControlTowerModule: React.FC<ControlTowerModuleProps> = ({ data, vehicles }) => {
  // Join data with vehicles
  const dataWithVehicles = useMemo(() => {
    return data.map(item => {
      const v = vehicles.find(vh => vh.plate === item.plate);
      return {
        ...item,
        brand: v?.brand || 'DESCONOCIDO'
      };
    });
  }, [data, vehicles]);

  // Filters
  const [filters, setFilters] = useState({
    cd: 'ALL',
    contractor: 'ALL',
    month: 'ALL',
    week: 'ALL',
    status: 'ALL',
    criticality: 'ALL',
    system: 'ALL',
    search: ''
  });

  // Filtered data
  const filteredData = useMemo(() => {
    return dataWithVehicles.filter(item => {
      const matchCd = filters.cd === 'ALL' || item.cd === filters.cd;
      const matchContractor = filters.contractor === 'ALL' || item.contractor === filters.contractor;
      const matchMonth = filters.month === 'ALL' || item.month === filters.month;
      const matchWeek = filters.week === 'ALL' || item.week === filters.week;
      const matchStatus = filters.status === 'ALL' || item.status === filters.status;
      const matchCriticality = filters.criticality === 'ALL' || item.criticality === filters.criticality;
      const matchSystem = filters.system === 'ALL' || item.system === filters.system;
      const matchSearch = !filters.search || 
        item.plate.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.novelty.toLowerCase().includes(filters.search.toLowerCase());
      
      return matchCd && matchContractor && matchMonth && matchWeek && matchStatus && matchCriticality && matchSystem && matchSearch;
    });
  }, [dataWithVehicles, filters]);

  // Unique values for filters
  const filterOptions = useMemo(() => ({
    cds: Array.from(new Set(data.map(item => item.cd))).filter(Boolean).sort(),
    contractors: Array.from(new Set(data.map(item => item.contractor))).filter(Boolean).sort(),
    months: Array.from(new Set(data.map(item => item.month))).filter(Boolean).sort(),
    weeks: Array.from(new Set(data.map(item => item.week))).filter(Boolean).sort(),
    statuses: Array.from(new Set(data.map(item => item.status))).filter(Boolean).sort(),
    criticalities: Array.from(new Set(data.map(item => item.criticality))).filter(Boolean).sort(),
    systems: Array.from(new Set(data.map(item => item.system))).filter(Boolean).sort(),
  }), [data]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filteredData.length;
    const closed = filteredData.filter(item => item.status.toUpperCase() === 'CERRADO' || item.status.toUpperCase() === 'SOLUCIONADO').length;
    const open = total - closed;
    const avgClosureTime = filteredData.length > 0 
      ? filteredData.reduce((acc, curr) => acc + (curr.closureDays || 0), 0) / filteredData.length 
      : 0;
    const compliance = filteredData.filter(item => item.maintenanceCompliance?.toUpperCase() === 'CUMPLIO').length;
    const complianceRate = total > 0 ? (compliance / total) * 100 : 0;
    
    // SLAs overdue (daysToClose < 0 logic)
    const overdue = filteredData.filter(item => item.status.toUpperCase() !== 'CERRADO' && item.daysToClose < 0).length;
    const criticalPlates = Array.from(new Set(filteredData.filter(item => item.criticality === '1' || item.criticality?.toUpperCase() === 'URGENTE').map(item => item.plate))).length;

    return { total, open, closed, avgClosureTime, complianceRate, overdue, criticalPlates };
  }, [filteredData]);

  // Charts data
  const chartsData = useMemo(() => {
    // Trend by week
    const trendMap: Record<string, { week: string, total: number, closed: number }> = {};
    filteredData.forEach(item => {
      if (!trendMap[item.week]) trendMap[item.week] = { week: item.week, total: 0, closed: 0 };
      trendMap[item.week].total++;
      if (item.status.toUpperCase() === 'CERRADO' || item.status.toUpperCase() === 'SOLUCIONADO') {
        trendMap[item.week].closed++;
      }
    });
    const trend = Object.values(trendMap).sort((a, b) => Number(a.week) - Number(b.week)).map(t => ({
      ...t,
      percentage: t.total > 0 ? (t.closed / t.total) * 100 : 0
    }));

    // Criticality
    const criticalityMap: Record<string, { name: string, value: number }> = {};
    filteredData.forEach(item => {
      const crit = item.criticality || 'SIN INFO';
      if (!criticalityMap[crit]) criticalityMap[crit] = { name: crit, value: 0 };
      criticalityMap[crit].value++;
    });
    const criticality = Object.values(criticalityMap);

    // Systems
    const systemMap: Record<string, { name: string, count: number }> = {};
    filteredData.forEach(item => {
      if (!systemMap[item.system]) systemMap[item.system] = { name: item.system, count: 0 };
      systemMap[item.system].count++;
    });
    const systems = Object.values(systemMap).sort((a, b) => b.count - a.count).slice(0, 10);

    // Top Plates
    const plateMap: Record<string, { plate: string, count: number }> = {};
    filteredData.forEach(item => {
      if (!plateMap[item.plate]) plateMap[item.plate] = { plate: item.plate, count: 0 };
      plateMap[item.plate].count++;
    });
    const topPlates = Object.values(plateMap).sort((a, b) => b.count - a.count).slice(0, 10);

    // Brands
    const brandMap: Record<string, { name: string, count: number }> = {};
    filteredData.forEach(item => {
      if (!brandMap[item.brand]) brandMap[item.brand] = { name: item.brand, count: 0 };
      brandMap[item.brand].count++;
    });
    const brands = Object.values(brandMap).sort((a, b) => b.count - a.count);

    return { trend, criticality, systems, topPlates, brands };
  }, [filteredData]);

  const getStatusColor = (status: string) => {
    const s = status.toUpperCase();
    if (s.includes('CERRADO') || s.includes('SOLUCIONADO')) return COLORS.LOW;
    if (s.includes('PROCESO') || s.includes('PENDIENTE')) return COLORS.MEDIUM;
    return COLORS.CRITICAL;
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            CIERRE DE NOVEDADES DEL CHECK LIST
          </h1>
          <p className="text-slate-400 mt-1 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar placa o novedad..."
              className="bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-blue-500 w-64 transition-all"
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            />
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20">
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 backdrop-blur-sm">
        <FilterSelect 
          label="CD" 
          value={filters.cd} 
          options={filterOptions.cds} 
          onChange={(v) => setFilters(f => ({ ...f, cd: v }))} 
        />
        <FilterSelect 
          label="TRANSPORTISTA" 
          value={filters.contractor} 
          options={filterOptions.contractors} 
          onChange={(v) => setFilters(f => ({ ...f, contractor: v }))} 
        />
        <FilterSelect 
          label="MES" 
          value={filters.month} 
          options={filterOptions.months} 
          onChange={(v) => setFilters(f => ({ ...f, month: v }))} 
        />
        <FilterSelect 
          label="SEMANA" 
          value={filters.week} 
          options={filterOptions.weeks} 
          onChange={(v) => setFilters(f => ({ ...f, week: v }))} 
        />
        <FilterSelect 
          label="ESTADO" 
          value={filters.status} 
          options={filterOptions.statuses} 
          onChange={(v) => setFilters(f => ({ ...f, status: v }))} 
        />
        <FilterSelect 
          label="CRITICIDAD" 
          value={filters.criticality} 
          options={filterOptions.criticalities} 
          onChange={(v) => setFilters(f => ({ ...f, criticality: v }))} 
        />
        <FilterSelect 
          label="SISTEMA" 
          value={filters.system} 
          options={filterOptions.systems} 
          onChange={(v) => setFilters(f => ({ ...f, system: v }))} 
        />
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
        <KPICard label="Total Novedades" value={kpis.total} icon={Activity} color={COLORS.PRIMARY} />
        <KPICard label="Abiertas" value={kpis.open} icon={AlertTriangle} color={COLORS.HIGH} subtext="Pendientes Gestión" />
        <KPICard label="Cerradas" value={kpis.closed} icon={CheckCircle} color={COLORS.LOW} subtext={`${((kpis.closed/kpis.total)*100 || 0).toFixed(1)}% Eficacia`} />
        <KPICard label="Prom. Cierre" value={`${kpis.avgClosureTime.toFixed(1)}`} unit="Días" icon={Clock} color={COLORS.SECONDARY} />
        <KPICard label="% Cumplimiento" value={`${kpis.complianceRate.toFixed(1)}`} unit="%" icon={Truck} color={COLORS.PRIMARY} />
        <KPICard label="SLAs Vencidos" value={kpis.overdue} icon={ShieldAlert} color={COLORS.CRITICAL} subtext="Acción Requerida" />
        <KPICard label="Placas Críticas" value={kpis.criticalPlates} icon={Truck} color={COLORS.NEUTRAL} subtext="Múltiples Fallas" />
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Trend Total Chart */}
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Novedades Semanales
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartsData.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }}>
                  <LabelList dataKey="total" position="top" style={{ fill: '#94a3b8', fontSize: '10px' }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend Percentage Chart */}
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            % Eficacia Cierre Semanal
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartsData.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={[0, 105]} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="percentage" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }}>
                  <LabelList dataKey="percentage" position="top" formatter={(v: number) => `${v.toFixed(0)}%`} style={{ fill: '#94a3b8', fontSize: '10px' }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Criticality Chart */}
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            Distribución Criticidad
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={chartsData.criticality} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={50} 
                  outerRadius={80} 
                  paddingAngle={5} 
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  labelLine={{ stroke: '#475569', strokeWidth: 1 }}
                >
                  {chartsData.criticality.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CRITICIDAD_COLORS[entry.name] || COLORS.PRIMARY} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Systems Chart */}
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Sistemas Afectados
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartsData.systems} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} width={80} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Bar dataKey="count" fill={COLORS.SECONDARY} radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="count" position="right" style={{ fill: '#94a3b8', fontSize: '10px' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Plates Chart */}
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            <Truck className="w-5 h-5 text-orange-400" />
            Top Placas Recurrentes
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartsData.topPlates}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="plate" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Bar dataKey="count" fill={COLORS.HIGH} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="count" position="top" style={{ fill: '#94a3b8', fontSize: '10px' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Brands Chart */}
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-indigo-400" />
            Novedades por Marca
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartsData.brands}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="count" position="top" style={{ fill: '#94a3b8', fontSize: '10px' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-700/50 flex justify-between items-center">
          <h3 className="font-semibold text-lg">Detalle Torre de Control</h3>
          <div className="text-sm text-slate-400">
            Mostrando {filteredData.length} de {data.length} registros
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Info Vehículo</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Reporte</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Sistema</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Criticidad</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">SLA</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Solución</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredData.slice(0, 100).map((item) => (
                <tr key={item.id} className="hover:bg-slate-700/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-blue-400">{item.plate}</span>
                      <span className="text-xs text-slate-500">{item.cd} | {item.contractor}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col max-w-xs">
                      <span className="text-sm line-clamp-1">{item.novelty}</span>
                      <span className="text-xs text-slate-500">{item.reportDate} | {item.source}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded bg-slate-700/50 text-xs border border-slate-600">
                      {item.system}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                      style={{ 
                        backgroundColor: `${CRITICIDAD_COLORS[item.criticality] || COLORS.NEUTRAL}20`,
                        color: CRITICIDAD_COLORS[item.criticality] || COLORS.NEUTRAL,
                        border: `1px solid ${CRITICIDAD_COLORS[item.criticality] || COLORS.NEUTRAL}40`
                      }}
                    >
                      {item.criticality}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-medium border"
                      style={{ 
                        backgroundColor: `${getStatusColor(item.status)}15`,
                        color: getStatusColor(item.status),
                        borderColor: `${getStatusColor(item.status)}30`
                      }}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center">
                      <span className={`text-sm font-bold ${item.daysToClose < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {item.daysToClose}
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase">Días</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col text-right">
                      <span className="text-sm font-medium">{item.solutionDate || '--'}</span>
                      <span className="text-xs text-slate-500">{item.closureDays ? `${item.closureDays} d` : ''}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredData.length > 100 && (
            <div className="p-4 text-center text-slate-500 text-sm italic">
              Mostrando los primeros 100 resultados. Use los filtros para mayor precisión.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper Components
const FilterSelect = ({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: string) => void }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold ml-1">{label}</label>
    <div className="relative group">
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:border-blue-500/50 hover:bg-slate-900 transition-all cursor-pointer"
      >
        <option value="ALL">TODOS</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none transition-transform group-hover:scale-110" />
    </div>
  </div>
);

const KPICard = ({ label, value, unit, icon: Icon, color, subtext }: { label: string, value: any, unit?: string, icon: any, color: string, subtext?: string }) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 backdrop-blur-md relative overflow-hidden group transition-all hover:bg-slate-800/60 hover:shadow-xl hover:shadow-black/20"
  >
    <div 
      className="absolute top-0 right-0 w-24 h-24 blur-3xl opacity-10 rounded-full -mr-12 -mt-12 transition-all group-hover:opacity-20"
      style={{ backgroundColor: color }}
    />
    <div className="flex items-start justify-between mb-3">
      <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/50 shadow-inner group-hover:scale-110 transition-transform">
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      {subtext && <span className="text-[10px] font-bold text-slate-500 bg-slate-900/40 px-2 py-0.5 rounded uppercase">{subtext}</span>}
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
      {unit && <span className="text-xs text-slate-400 font-medium">{unit}</span>}
    </div>
    <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">{label}</p>
  </motion.div>
);

export default ControlTowerModule;
