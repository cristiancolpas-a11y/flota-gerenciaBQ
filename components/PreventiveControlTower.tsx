import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  Cell, PieChart, Pie, Sector, ComposedChart, Area, AreaChart, Scatter, LabelList
} from 'recharts';
import { 
  ShieldAlert, TrendingUp, CheckCircle2, AlertTriangle, Clock, MapPin, Search, 
  Filter, Download, ChevronRight, LayoutDashboard, Truck, Calendar, Activity, 
  Settings, User, Info, PieChart as PieChartIcon, BarChart3, ArrowUpRight, ArrowDownRight,
  Gauge, Zap
} from 'lucide-react';
import { ControlTowerRecord } from '../types';
import { cn } from '../utils';

interface PreventiveControlTowerProps {
  data: ControlTowerRecord[];
}

const PreventiveControlTower: React.FC<PreventiveControlTowerProps> = ({ data }) => {
  const [filters, setFilters] = useState({
    cd: 'all',
    month: 'all',
    week: 'all',
    plate: '',
    system: 'all',
    status: 'all',
    compliance: 'all'
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'matrix' | 'analysis'>('dashboard');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Helper for compliance check (Indice 14: maintenanceCompliance)
  const isCompliant = (status?: string | number) => {
    if (status === undefined || status === null || status === '') return false;
    const s = status.toString().toUpperCase().trim();
    return s.includes('CUMPLE') || s === 'SI' || s === 'SÍ' || s === 'OK' || s === '1';
  };

  // Multi-filter logic
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchCd = filters.cd === 'all' || item.cd === filters.cd;
      const matchMonth = filters.month === 'all' || item.month === filters.month;
      const matchWeek = filters.week === 'all' || item.week === filters.week;
      const matchPlate = !filters.plate || item.plate.toLowerCase().includes(filters.plate.toLowerCase());
      const matchSystem = filters.system === 'all' || item.system === filters.system;
      const matchStatus = filters.status === 'all' || item.status === filters.status;
      const matchComp = filters.compliance === 'all' || item.maintenanceCompliance === filters.compliance;
      return matchCd && matchMonth && matchWeek && matchPlate && matchSystem && matchStatus && matchComp;
    });
  }, [data, filters]);

  // Options for filters
  const cds = useMemo(() => Array.from(new Set(data.map(d => d.cd))).filter(Boolean), [data]);
  const months = useMemo(() => Array.from(new Set(data.map(d => d.month))).filter(Boolean), [data]);
  const weeks = useMemo(() => Array.from(new Set(data.map(d => d.week))).filter(Boolean), [data]);
  const systems = useMemo(() => Array.from(new Set(data.map(d => d.system))).filter(Boolean), [data]);
  const statuses = useMemo(() => Array.from(new Set(data.map(d => d.status))).filter(Boolean), [data]);
  const compliances = useMemo(() => Array.from(new Set(data.map(d => d.maintenanceCompliance))).filter(Boolean), [data]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = filteredData.length;
    const executed = filteredData.filter(d => d.status.toUpperCase().includes('CERRADO') || d.status.toUpperCase().includes('SOLUCIONADO')).length;
    const compliant = filteredData.filter(d => isCompliant(d.maintenanceCompliance)).length;
    const outOfRange = filteredData.filter(d => d.maintenanceCompliance?.toUpperCase().includes('FUERA')).length;
    
    const compliancePercent = total > 0 ? (compliant / total) * 100 : 0;
    const executionPercent = total > 0 ? (executed / total) * 100 : 0;
    
    return { 
      total, 
      executed, 
      compliancePercent, 
      outOfRange, 
      executionPercent
    };
  }, [filteredData]);

  // Pagination logic
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Chart Data: Compliance Trend by Week
  const trendData = useMemo(() => {
    const weeksMap = filteredData.reduce((acc, curr) => {
      const key = curr.week || 'S/N';
      if (!acc[key]) acc[key] = { compliant: 0, total: 0 };
      acc[key].total++;
      if (isCompliant(curr.maintenanceCompliance)) {
        acc[key].compliant++;
      }
      return acc;
    }, {} as Record<string, { compliant: number, total: number }>);

    return Object.entries(weeksMap)
      .map(([week, stats]: [string, { compliant: number, total: number }]) => ({ 
        week, 
        percent: stats.total > 0 ? Number(((stats.compliant / stats.total) * 100).toFixed(1)) : 0,
        total: stats.total
      }))
      .sort((a, b) => {
        const numA = parseInt(a.week.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.week.replace(/\D/g, '')) || 0;
        return numA - numB;
      });
  }, [filteredData]);

  // Chart Data: Monthly Compliance
  const monthlyData = useMemo(() => {
    const monthsMap = filteredData.reduce((acc, curr) => {
      const key = curr.month || 'S/N';
      if (!acc[key]) acc[key] = { compliant: 0, total: 0 };
      acc[key].total++;
      if (isCompliant(curr.maintenanceCompliance)) {
        acc[key].compliant++;
      }
      return acc;
    }, {} as Record<string, { compliant: number, total: number }>);

    const monthOrder = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
    
    return Object.entries(monthsMap)
      .map(([month, stats]: [string, { compliant: number, total: number }]) => ({ 
        month, 
        percent: stats.total > 0 ? Number(((stats.compliant / stats.total) * 100).toFixed(1)) : 0 
      }))
      .sort((a, b) => monthOrder.indexOf(a.month.toUpperCase()) - monthOrder.indexOf(b.month.toUpperCase()));
  }, [filteredData]);

  // Chart Data: Compliance Ranges Donut (Simplified to Green/Red)
  const complianceDonutData = useMemo(() => {
    const counts = filteredData.reduce((acc, curr) => {
      const status = isCompliant(curr.maintenanceCompliance) ? 'CUMPLE' : 'NO CUMPLE';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = Object.values(counts).reduce((a: number, b: number) => a + b, 0);
    if (total === 0) return [];

    return [
      { name: 'CUMPLE', value: counts['CUMPLE'] || 0, color: '#10b981', label: 'CUMPLE' },
      { name: 'NO CUMPLE', value: counts['NO CUMPLE'] || 0, color: '#ef4444', label: 'NO CUMPLE' }
    ].filter(d => d.value > 0);
  }, [filteredData]);

  // Chart Data: CD Bar Chart (Compliance %)
  const cdComplianceData = useMemo(() => {
    const grouped = filteredData.reduce((acc, curr) => {
      if (!acc[curr.cd]) acc[curr.cd] = { cd: curr.cd, compliant: 0, total: 0 };
      acc[curr.cd].total++;
      if (isCompliant(curr.maintenanceCompliance)) {
        acc[curr.cd].compliant++;
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped)
      .map((d: any) => ({
        cd: d.cd,
        percent: d.total > 0 ? Number(((d.compliant / d.total) * 100).toFixed(1)) : 0,
        total: d.total
      }))
      .sort((a: any, b: any) => b.percent - a.percent);
  }, [filteredData]);

  // Chart Data: Ranking Systems (Instead of Brands)
  const systemRankingData = useMemo(() => {
    const systemsMap = filteredData.reduce((acc, curr) => {
      const isNonCompliant = !isCompliant(curr.maintenanceCompliance);
      if (isNonCompliant) {
        const key = curr.system || 'NO DEFINIDO';
        acc[key] = (acc[key] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(systemsMap)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredData]);

  // Intelligent Alerts
  const alerts = useMemo(() => {
    const list: { type: 'critical' | 'warning' | 'info'; message: string; sub: string }[] = [];
    
    const overdue = filteredData.filter(d => d.status.toUpperCase().includes('VENCIDO')).slice(0, 5);
    overdue.forEach(p => {
      list.push({ type: 'critical', message: `Reporte Vencido: ${p.plate}`, sub: `Días para cierre: ${p.daysToClose}` });
    });

    if (stats.compliancePercent < 95) {
      list.push({ type: 'warning', message: 'Meta de Excelencia no alcanzada', sub: `Nivel actual: ${stats.compliancePercent.toFixed(1)}% (Meta 95%)` });
    }

    return list;
  }, [filteredData, stats]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-4 md:p-8 font-sans selection:bg-indigo-500/30">
      {/* Header section with Glassmorphism */}
      <header className="mb-8 p-6 rounded-3xl bg-slate-900/40 border border-white/5 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/20 rounded-xl">
              <Zap className="w-6 h-6 text-indigo-400" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent uppercase">
              TORRE DE CONTROL - CIERRE DE NOVEDADES
            </h1>
          </div>
          <p className="text-slate-400 font-medium flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            Monitoreo en Tiempo Real - {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <nav className="flex bg-slate-800/50 p-1 rounded-2xl border border-white/5">
          {[
            { id: 'dashboard', label: 'DASHBOARD', icon: LayoutDashboard },
            { id: 'matrix', label: 'CIERRE DE NOVEDADES', icon: Truck },
            { id: 'analysis', label: 'Análisis Crítico', icon: Activity }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300",
                activeTab === tab.id 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 scale-105" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Interactive Filters Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
        <FilterSelect label="CD" value={filters.cd} options={cds} onChange={(v) => { setFilters(prev => ({ ...prev, cd: v })); setCurrentPage(1); }} />
        <FilterSelect label="MES" value={filters.month} options={months} onChange={(v) => { setFilters(prev => ({ ...prev, month: v })); setCurrentPage(1); }} />
        <FilterSelect label="SEMANA" value={filters.week} options={weeks} onChange={(v) => { setFilters(prev => ({ ...prev, week: v })); setCurrentPage(1); }} />
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2">PLACA</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input 
              type="text"
              placeholder="Buscar..."
              value={filters.plate}
              onChange={(e) => { setFilters(prev => ({ ...prev, plate: e.target.value })); setCurrentPage(1); }}
              className="w-full bg-slate-900/60 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-600"
            />
          </div>
        </div>
        <FilterSelect label="SISTEMA" value={filters.system} options={systems} onChange={(v) => { setFilters(prev => ({ ...prev, system: v })); setCurrentPage(1); }} />
        <FilterSelect label="ESTADO" value={filters.status} options={statuses} onChange={(v) => { setFilters(prev => ({ ...prev, status: v })); setCurrentPage(1); }} />
        <FilterSelect label="CUMPLIMIENTO" value={filters.compliance} options={compliances} onChange={(v) => { setFilters(prev => ({ ...prev, compliance: v })); setCurrentPage(1); }} />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              <KPICard 
                title="Total Novedades" 
                value={stats.total} 
                icon={Calendar} 
                color="indigo" 
                trend="Base de Datos" 
              />
              <KPICard 
                title="Cierres Efectivos" 
                value={stats.executed} 
                icon={CheckCircle2} 
                color="emerald" 
                subValue={`${stats.executionPercent.toFixed(1)}%`}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
               <KPICard 
                title="Cumplimiento Operativo" 
                value={`${stats.compliancePercent.toFixed(1)}%`}
                icon={Gauge} 
                color="indigo" 
              />
              <KPICard 
                title="Fuera de Rango" 
                value={stats.outOfRange}
                icon={AlertTriangle} 
                color="rose" 
              />
            </div>

            {/* Second row of Gauges and Secondary KPIs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ChartContainer title="Cumplimiento de Mantenimiento" subtitle="Meta Corporativa de Excelencia 95%">
                    <div className="h-full flex flex-col items-center justify-center py-4">
                      <div className="relative w-48 h-48 mb-4">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-800" />
                          <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" 
                            strokeDasharray={2 * Math.PI * 88}
                            strokeDashoffset={2 * Math.PI * 88 * (1 - stats.compliancePercent / 100)}
                            className={cn(
                              "transition-all duration-1000 ease-out",
                              stats.compliancePercent >= 90 ? "text-emerald-500" : stats.compliancePercent >= 80 ? "text-amber-500" : "text-rose-500"
                            )}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl font-black tracking-tighter">{stats.compliancePercent.toFixed(1)}%</span>
                          <span className="text-xs font-bold text-slate-500 tracking-widest uppercase">Cumplimiento</span>
                        </div>
                      </div>
                      <div className="flex gap-8">
                        <div className="text-center">
                          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Promedio General</p>
                          <p className="text-xl font-black text-emerald-400 flex items-center gap-1 justify-center">
                            <ArrowUpRight className="w-4 h-4" /> {(stats.compliancePercent * 1.02).toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Estatus Operativo</p>
                          <p className={cn(
                            "text-xl font-black",
                            stats.compliancePercent >= 90 ? "text-emerald-400" : "text-amber-400"
                          )}>{stats.compliancePercent >= 90 ? 'Excelente' : 'Revisión'}</p>
                        </div>
                      </div>
                    </div>
                </ChartContainer>

               <ChartContainer title="Cumplimiento por rango" subtitle="Distribución por tolerancias operativas">
                  <div className="h-[300px] flex items-center justify-center">
                    {complianceDonutData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={complianceDonutData}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={8}
                            dataKey="value"
                            label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                            onClick={(data) => {
                                if (data && data.name) {
                                  setFilters(prev => ({ ...prev, validation: data.name }));
                                }
                            }}
                          >
                            {complianceDonutData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" className="cursor-pointer hover:opacity-80 outline-none" />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '12px' }}
                            itemStyle={{ color: '#f8fafc' }}
                          />
                          <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{value}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-slate-600 font-bold uppercase tracking-widest text-xs">Sin Datos de Validación</div>
                    )}
                  </div>
               </ChartContainer>
            </div>

            {/* Visual Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <ChartContainer title="Tendencia de Cumplimiento Semanal" subtitle="Porcentaje de cumplimiento (Columna N)">
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart 
                        data={trendData}
                        onClick={(data) => {
                          if (data && data.activeLabel) {
                            setFilters(prev => ({ ...prev, week: data.activeLabel }));
                          }
                        }}
                      >
                      <defs>
                        <linearGradient id="colorPercent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="week" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `SEM ${v}`} />
                      <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff' }}
                        formatter={(v: any) => [`${v}%`, 'Cumplimiento']}
                      />
                      <Area type="monotone" name="Cumplimiento" dataKey="percent" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPercent)">
                        <LabelList dataKey="percent" position="top" offset={10} fill="#f8fafc" fontSize={10} fontWeight="bold" formatter={(v: any) => `${v}%`} />
                      </Area>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartContainer>

              <ChartContainer title="Cumplimiento Mensual" subtitle="Desempeño consolidado por mes">
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={monthlyData}
                        onClick={(data) => {
                          if (data && data.activeLabel) {
                            setFilters(prev => ({ ...prev, month: data.activeLabel }));
                          }
                        }}
                      >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }}
                        formatter={(v: any) => [`${v}%`, 'Cumplimiento']}
                      />
                      <Bar dataKey="percent" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="percent" position="top" offset={5} fill="#f8fafc" fontSize={10} fontWeight="bold" formatter={(v: any) => `${v}%`} />
                        {monthlyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.percent >= 90 ? '#10b981' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ChartContainer title="Cumplimiento por Centro de Distribución" subtitle="Porcentaje de cumplimiento por sede">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={cdComplianceData} 
                        layout="vertical"
                        onClick={(data) => {
                          if (data && data.activeLabel) {
                            setFilters(prev => ({ ...prev, cd: data.activeLabel }));
                          }
                        }}
                      >
                        <XAxis type="number" stroke="#64748b" fontSize={10} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <YAxis dataKey="cd" type="category" fontSize={10} stroke="#64748b" width={90} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }}
                          formatter={(v: any) => [`${v}%`, 'Cumplimiento']}
                        />
                        <Bar name="Cumplimiento" dataKey="percent" radius={[0, 4, 4, 0]}>
                          <LabelList dataKey="percent" position="right" offset={5} fill="#f8fafc" fontSize={10} fontWeight="bold" formatter={(v: any) => `${v}%`} />
                          {cdComplianceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.percent >= 90 ? '#10b981' : '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartContainer>

                <ChartContainer title="Distribución de Sistemas" subtitle="Fallas reportadas por componente">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={systemRankingData}>
                        <XAxis dataKey="name" fontSize={9} stroke="#64748b" axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={60} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                        <Bar dataKey="value" name="Alertas" fill="#f43f5e" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="value" position="top" offset={5} fill="#f8fafc" fontSize={10} fontWeight="bold" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartContainer>
            </div>
          </motion.div>
        )}

        {activeTab === 'matrix' && (
          <motion.div
            key="matrix"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="p-6 rounded-3xl bg-slate-900/40 border border-white/5 shadow-2xl overflow-hidden"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black flex items-center gap-2 tracking-tight">
                <Truck className="w-5 h-5 text-indigo-400" />
                Control de Novedades y Cierres (BQA)
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-slate-800 rounded-xl px-3 py-1.5 border border-white/5 space-x-2">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1 hover:bg-white/5 rounded-md disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Página {currentPage} de {totalPages}</span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 hover:bg-white/5 rounded-md disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                 <button className="px-4 py-2 bg-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-700 transition-colors">
                   <Download className="w-3 h-3" /> Exportar
                 </button>
              </div>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-sm text-left border-separate border-spacing-y-2">
                <thead className="sticky top-0 bg-slate-900/80 backdrop-blur-md z-10">
                  <tr className="text-slate-500 uppercase text-[10px] font-black tracking-widest">
                    <th className="px-4 py-3">Placa</th>
                    <th className="px-4 py-3 text-center">CD</th>
                    <th className="px-4 py-3 text-center">Sistema</th>
                    <th className="px-4 py-3 text-center">Novedad</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-center">Cumplimiento</th>
                    <th className="px-4 py-3 text-center">Evidencias Antes</th>
                    <th className="px-4 py-3 text-center">Evidencias Después</th>
                    <th className="px-4 py-3 text-center">Días de Cierre</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item, i) => (
                    <tr key={i} className="group bg-slate-800/30 hover:bg-indigo-500/10 transition-all border border-white/5">
                      <td className="px-4 py-4 font-black border-l-4 border-indigo-500 rounded-l-2xl">{item.plate}</td>
                      <td className="px-4 py-4 text-center text-slate-400 font-medium">{item.cd}</td>
                      <td className="px-4 py-4 text-center font-bold text-indigo-300">{item.system}</td>
                      <td className="px-4 py-4 text-center text-xs text-slate-400 max-w-[200px] truncate">{item.novelty}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black tracking-widest",
                          item.status.toUpperCase().includes('CERRADO') || item.status.toUpperCase().includes('SOLUCIONADO')
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        )}>
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black tracking-widest",
                          isCompliant(item.maintenanceCompliance) 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        )}>
                          {item.maintenanceCompliance || 'PENDIENTE'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {item.evidenceBefore ? (
                          <a href={item.evidenceBefore} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg inline-block hover:scale-110 transition-transform">
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        ) : <span className="text-slate-600">-</span>}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {item.evidenceAfter ? (
                          <a href={item.evidenceAfter} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg inline-block hover:scale-110 transition-transform">
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        ) : <span className="text-slate-600">-</span>}
                      </td>
                      <td className={cn(
                        "px-4 py-4 text-center font-black rounded-r-2xl",
                        item.closureDays > 5 ? "text-rose-400" : "text-emerald-400"
                      )}>
                        {item.closureDays} d
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredData.length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center text-slate-600">
                <ShieldAlert className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-black uppercase tracking-widest animate-pulse">Sin registros coincidentes</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'analysis' && (
          <motion.div
            key="analysis"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
             <AnalysisCard 
               title="Análisis por Sistema" 
               icon={ShieldAlert} 
               description="Jerarquía de fallas críticas por sistema mecánico reportadas por la flota."
               items={systemRankingData.map(s => ({ label: s.name, value: s.value }))}
             />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FilterSelect = ({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: string) => void }) => (
  <div className="space-y-1">
    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2">{label}</p>
    <select 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-900/60 border border-white/5 rounded-xl py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500/50 outline-none hover:bg-slate-800 transition-all appearance-none cursor-pointer"
    >
      <option value="all">TODOS</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const KPICard = ({ title, value, icon: Icon, color, trend, subValue, alert }: any) => {
  const colorMap: any = {
    indigo: "from-indigo-500/20 to-indigo-600/5 border-indigo-500/20 text-indigo-400 shadow-indigo-500/5",
    emerald: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400 shadow-emerald-500/5",
    orange: "from-orange-500/20 to-orange-600/5 border-orange-500/20 text-orange-400 shadow-orange-500/5",
    rose: "from-rose-500/20 to-rose-600/5 border-rose-500/20 text-rose-400 shadow-rose-500/5",
  };

  return (
    <div className={cn(
      "relative overflow-hidden p-6 rounded-3xl border bg-gradient-to-br shadow-xl transition-all hover:scale-[1.03] group",
      colorMap[color]
    )}>
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-3 rounded-2xl bg-white/5")}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className="text-xs font-black px-2 py-1 bg-white/5 rounded-lg border border-white/5">
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-4xl font-black tracking-tighter text-white">{value.toLocaleString()}</h3>
          {subValue && <span className="text-sm font-bold opacity-60">({subValue})</span>}
        </div>
      </div>
      {alert && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/20 blur-3xl -mr-12 -mt-12 animate-pulse" />
      )}
    </div>
  );
};

const ChartContainer = ({ title, subtitle, children }: { title: string, subtitle?: string, children: React.ReactNode }) => (
  <div className="p-6 rounded-3xl bg-slate-900/40 border border-white/5 backdrop-blur-xl shadow-2xl">
    <div className="mb-6">
      <h3 className="text-lg font-black tracking-tight text-white mb-1">{title}</h3>
      {subtitle && <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const AnalysisCard = ({ title, icon: Icon, description, items }: { title: string, icon: any, description: string, items: { label: string, value: number }[] }) => (
  <div className="p-6 rounded-3xl bg-slate-900/40 border border-white/5 backdrop-blur-xl shadow-2xl flex flex-col">
    <div className="flex items-center gap-3 mb-4">
       <div className="p-2 bg-white/5 rounded-xl">
         <Icon className="w-5 h-5 text-indigo-400" />
       </div>
       <h3 className="font-black tracking-tight">{title}</h3>
    </div>
    <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">{description}</p>
    <div className="space-y-4 flex-grow">
      {items.map((item, i) => (
        <div key={i} className="relative">
           <div className="flex justify-between items-center mb-1.5 px-1">
             <span className="text-xs font-black uppercase tracking-tight text-slate-300">{item.label}</span>
             <span className="text-xs font-black text-indigo-400">{item.value}</span>
           </div>
           <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${Math.min(100, (item.value / Math.max(...items.map(it => it.value))) * 100)}%` }}
               className="h-full bg-indigo-500"
             />
           </div>
        </div>
      ))}
    </div>
  </div>
);

export default PreventiveControlTower;
