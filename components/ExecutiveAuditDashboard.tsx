import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Cell, PieChart, Pie, LabelList
} from 'recharts';
import { 
  Shield, CheckCircle2, AlertCircle, XCircle, Users, Truck, Calendar, 
  Filter, Download, ArrowUpRight, TrendingUp, Target, Award, Activity, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FleetStandardAudit, 
} from '../types';
import { 
  fetchFleetStandardAuditFromSheet,
  FLEET_STANDARD_SECURITY_ITEMS,
  FLEET_STANDARD_QUALITY_ITEMS
} from '../services/sheetService';

const COLORS = {
  primary: '#00D4FF',    // Electric Blue
  success: '#00FF88',    // Neon Green
  warning: '#FFB800',    // Amber
  critical: '#FF4560',   // Neon Red
  bg: '#0A0E1A',
  card: 'rgba(255, 255, 255, 0.05)',
  border: 'rgba(0, 212, 255, 0.2)'
};

const getStatusColor = (value: number) => {
  if (value >= 85) return COLORS.success;
  if (value >= 70) return COLORS.warning;
  return COLORS.critical;
};

const normalizeAuditor = (name: string) => {
  if (!name) return 'N/A';
  return name.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, ' ');
};

const ExecutiveAuditDashboard: React.FC = () => {
  const [data, setData] = useState<FleetStandardAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cierre'>('dashboard');
  
  // Filters
  const [filterCentro, setFilterCentro] = useState('TODOS');
  const [filterMes, setFilterMes] = useState('TODOS');
  const [filterTipo, setFilterTipo] = useState('Mensual del estándar');
  const [filterAuditor, setFilterAuditor] = useState('TODOS');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const audits = await fetchFleetStandardAuditFromSheet();
      setData(audits);
      setLoading(false);
    };
    loadData();
  }, []);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      // Exclude "Auditoría Cruzada" from global visual as requested
      if (item.tipoAuditoria === 'Auditoría Cruzada') return false;

      const matchCentro = filterCentro === 'TODOS' || item.centro === filterCentro;
      const matchMes = filterMes === 'TODOS' || item.mes.toLowerCase() === filterMes.toLowerCase();
      const matchTipo = filterTipo === 'TODOS' || item.tipoAuditoria === filterTipo;
      const matchAuditor = filterAuditor === 'TODOS' || normalizeAuditor(item.auditor) === normalizeAuditor(filterAuditor);
      const matchSearch = !searchTerm || 
        item.placa.toUpperCase().includes(searchTerm.toUpperCase()) ||
        (item.observations && item.observations.toUpperCase().includes(searchTerm.toUpperCase()));
      return matchCentro && matchMes && matchTipo && matchAuditor && matchSearch;
    });
  }, [data, filterCentro, filterMes, filterTipo, filterAuditor, searchTerm]);

  // Case Closure Metrics (Cierre de Novedades)
  const closureMetrics = useMemo(() => {
    const records = filteredData.filter(r => r.observations && r.observations.trim() !== '');
    const total = records.length;
    if (total === 0) return { total: 0, closed: 0, open: 0, uniquePlates: 0, compliance: 0 };

    const closed = records.filter(r => r.estado && r.estado.toUpperCase().includes('CERRADO')).length;
    const open = records.filter(r => r.estado && r.estado.toUpperCase().includes('ABIERTO')).length;
    const uniquePlates = new Set(records.map(r => r.placa)).size;
    const compliance = total > 0 ? (closed / total) * 100 : 0;

    return { total, closed, open, uniquePlates, compliance };
  }, [filteredData]);

  // Derived Metrics
  const metrics = useMemo(() => {
    if (filteredData.length === 0) return null;

    const count = filteredData.length;
    const uniqueVehicles = new Set(filteredData.map(d => d.placa)).size;
    
    // Means
    const avgMandatory = filteredData.reduce((acc, d) => acc + d.scoreTotalMand, 0) / count;
    const avgNoMandatory = filteredData.reduce((acc, d) => acc + d.scoreTotalNoMand, 0) / count;
    const avgSegMand = filteredData.reduce((acc, d) => acc + d.scoreSegMand, 0) / count;
    const avgCalMand = filteredData.reduce((acc, d) => acc + d.scoreCalMand, 0) / count;

    // Monthly Evolution - Stacked Bar Chart
    const monthsOrder = ['febrero', 'marzo', 'abril'];
    const monthlyData = monthsOrder.map(m => {
      const monthAudits = filteredData.filter(d => d.mes.toLowerCase() === m);
      if (monthAudits.length === 0) return { name: m.charAt(0).toUpperCase() + m.slice(1), mand: 0, noMand: 0 };
      const c = monthAudits.length;
      return {
        name: m.charAt(0).toUpperCase() + m.slice(1),
        mand: monthAudits.reduce((acc, d) => acc + d.scoreTotalMand, 0) / c,
        noMand: monthAudits.reduce((acc, d) => acc + d.scoreTotalNoMand, 0) / c,
      };
    });

    // Execution Time Frequency
    const timeFreqMap: Record<number, number> = {};
    filteredData.forEach(d => {
      const mins = Math.round(d.tiempoMin);
      if (mins > 0) {
        timeFreqMap[mins] = (timeFreqMap[mins] || 0) + 1;
      }
    });
    const timeData = Object.entries(timeFreqMap)
      .map(([mins, count]) => ({ mins: parseInt(mins), count }))
      .sort((a, b) => a.mins - b.mins)
      .slice(0, 15); // Show first 15 mins most common

    // CD Comparison
    const centers = ['DC Galapa', 'DC La Arenosa'];
    const centerData = centers.map(cd => {
      const cdAudits = filteredData.filter(d => d.centro === cd);
      if (cdAudits.length === 0) return { name: cd, mand: 0, noMand: 0, segMand: 0, calMand: 0 };
      const c = cdAudits.length;
      return {
        name: cd,
        mand: cdAudits.reduce((acc, d) => acc + d.scoreTotalMand, 0) / c,
        noMand: cdAudits.reduce((acc, d) => acc + d.scoreTotalNoMand, 0) / c,
        segMand: cdAudits.reduce((acc, d) => acc + d.scoreSegMand, 0) / c,
        calMand: cdAudits.reduce((acc, d) => acc + d.scoreCalMand, 0) / c,
      };
    });

    // Auditor Ranking
    const auditorMap = new Map<string, { count: number, mandSum: number, noMandSum: number, centerCounts: Record<string, number> }>();
    filteredData.forEach(d => {
      const name = normalizeAuditor(d.auditor);
      const existing = auditorMap.get(name) || { count: 0, mandSum: 0, noMandSum: 0, centerCounts: {} };
      existing.count += 1;
      existing.mandSum += d.scoreTotalMand;
      existing.noMandSum += d.scoreTotalNoMand;
      existing.centerCounts[d.centro] = (existing.centerCounts[d.centro] || 0) + 1;
      auditorMap.set(name, existing);
    });

    const auditorRanking = Array.from(auditorMap.entries())
      .map(([name, stats]) => ({
        name: name.toUpperCase(),
        count: stats.count,
        mandAvg: stats.mandSum / stats.count,
        noMandAvg: stats.noMandSum / stats.count,
        mainCenter: Object.entries(stats.centerCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Most failed items (Top 10)
    const itemFailures: { name: string, category: 'SEGURIDAD' | 'CALIDAD', failRate: number }[] = [];
    
    FLEET_STANDARD_SECURITY_ITEMS.forEach((name, idx) => {
      const fails = filteredData.filter(d => d.securityScores[idx] === 0).length;
      itemFailures.push({ name, category: 'SEGURIDAD', failRate: (fails / count) * 100 });
    });

    FLEET_STANDARD_QUALITY_ITEMS.forEach((name, idx) => {
      const fails = filteredData.filter(d => d.qualityScores[idx] === 0).length;
      itemFailures.push({ name, category: 'CALIDAD', failRate: (fails / count) * 100 });
    });

    const topFailingItems = itemFailures
      .sort((a, b) => b.failRate - a.failRate)
      .slice(0, 10);

    return {
      count,
      uniqueVehicles,
      avgMandatory,
      avgNoMandatory,
      avgSegMand,
      avgCalMand,
      monthlyData,
      centerData,
      auditorRanking,
      topFailingItems,
      timeData
    };
  }, [filteredData]);

  const uniqueAuditors = useMemo(() => {
    const set = new Set<string>();
    data.forEach(d => set.add(normalizeAuditor(d.auditor)));
    return Array.from(set).sort();
  }, [data]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[#00D4FF]">
        <motion.div
           animate={{ rotate: 360 }}
           transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
           className="mb-6"
        >
          <Activity size={48} />
        </motion.div>
        <span className="text-sm font-black uppercase tracking-[0.3em] animate-pulse">Sincronizando Datacenters...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white p-4 lg:p-8 font-sans selection:bg-[#00D4FF]/30 selection:text-[#00D4FF]">
      {/* Header & Filters */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 mb-12">
        <header>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-[#00D4FF]/10 rounded-2xl border border-[#00D4FF]/20 shadow-[0_0_20px_rgba(0,212,255,0.1)]">
              <Shield className="text-[#00D4FF]" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none text-white">
                Estándar de Flota <span className="text-[#00D4FF]">Calidad y Seg.</span>
              </h1>
              <p className="text-[#00D4FF]/60 text-xs font-bold uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-[#00FF88] rounded-full animate-ping" />
                Regional Norte
              </p>
            </div>
          </div>
        </header>

        {/* Filters Panel */}
        <div className="grid grid-cols-2 lg:flex gap-4 bg-white/5 backdrop-blur-xl p-4 rounded-[2rem] border border-white/10 shadow-2xl">
          <div className="space-y-2 lg:w-48">
            <label className="text-[9px] font-black text-[#00D4FF] uppercase tracking-widest ml-2">Centro</label>
            <select 
              value={filterCentro}
              onChange={(e) => setFilterCentro(e.target.value)}
              className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-[#00D4FF]/50 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="TODOS">TODOS LOS CENTROS</option>
              <option value="DC Galapa">DC GALAPA</option>
              <option value="DC La Arenosa">DC LA ARENOSA</option>
            </select>
          </div>
          <div className="space-y-2 lg:w-48">
            <label className="text-[9px] font-black text-[#00D4FF] uppercase tracking-widest ml-2">Mes</label>
            <select 
              value={filterMes}
              onChange={(e) => setFilterMes(e.target.value)}
              className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-[#00D4FF]/50 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="TODOS">TODOS LOS MESES</option>
              <option value="febrero">FEBRERO</option>
              <option value="marzo">MARZO</option>
              <option value="abril">ABRIL</option>
            </select>
          </div>
          <div className="space-y-2 lg:w-48">
            <label className="text-[9px] font-black text-[#00D4FF] uppercase tracking-widest ml-2">Tipo</label>
            <select 
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-[#00D4FF]/50 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="TODOS">TODAS (EXCL. CRUZADA)</option>
              <option value="Mensual del estándar">MENSUAL ESTÁNDAR</option>
            </select>
          </div>
          <div className="space-y-2 lg:w-48">
            <label className="text-[9px] font-black text-[#00D4FF] uppercase tracking-widest ml-2">Auditor</label>
            <select 
              value={filterAuditor}
              onChange={(e) => setFilterAuditor(e.target.value)}
              className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-[#00D4FF]/50 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="TODOS">TODOS LOS AUDITORES</option>
              {uniqueAuditors.map(aud => (
                <option key={aud} value={aud}>{aud.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-[#00D4FF] text-black shadow-[0_0_20px_rgba(0,212,255,0.3)]' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
        >
          Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('cierre')}
          className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'cierre' ? 'bg-[#00FF88] text-black shadow-[0_0_20px_rgba(0,255,136,0.3)]' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
        >
          Cierre de Novedades
        </button>
      </div>

      {activeTab === 'dashboard' ? (
        metrics ? (
          <div className="space-y-10">
            {/* Section 1: KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
              <KPICard title="Total Auditorías" value={metrics.count} icon={<Activity size={20} />} color={COLORS.primary} />
              <KPICard title="Vehículos Únicos" value={metrics.uniqueVehicles} icon={<Truck size={20} />} color={COLORS.primary} />
              <KPICard title="% Mandatorias" value={metrics.avgMandatory.toFixed(0) + '%'} icon={<Target size={20} />} color={getStatusColor(metrics.avgMandatory)} isPercent />
              <KPICard title="% No Mandatorias" value={metrics.avgNoMandatory.toFixed(0) + '%'} icon={<TrendingUp size={20} />} color={getStatusColor(metrics.avgNoMandatory)} isPercent />
              <KPICard title="% Seguridad (Mand.)" value={metrics.avgSegMand.toFixed(0) + '%'} icon={<Shield size={20} />} color={getStatusColor(metrics.avgSegMand)} isPercent />
              <KPICard title="% Calidad (Mand.)" value={metrics.avgCalMand.toFixed(0) + '%'} icon={<CheckCircle2 size={20} />} color={getStatusColor(metrics.avgCalMand)} isPercent />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Section 2: Mandatory Group */}
              <div className="bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/10 p-8 shadow-2xl flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-black italic uppercase tracking-tighter">
                    Sesión 2: <span className="text-rose-500">Mandatorio</span>
                  </h3>
                  <div className="p-2 bg-rose-500/10 rounded-full border border-rose-500/20">
                    <AlertCircle className="text-rose-500" size={16} />
                  </div>
                </div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-10">Nivel Crítico de Operación (Seguridad & Calidad Mandat.)</p>
                
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 flex-1 items-center">
                  <div className="lg:col-span-2 relative flex flex-col items-center">
                    <div className="w-full h-[180px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                            <Pie
                              data={[
                                { value: metrics.avgMandatory },
                                { value: 100 - metrics.avgMandatory }
                              ]}
                              cx="50%"
                              cy="100%"
                              startAngle={180}
                              endAngle={0}
                              innerRadius="65%"
                              outerRadius="95%"
                              paddingAngle={0}
                              dataKey="value"
                              stroke="none"
                            >
                              <Cell fill={getStatusColor(metrics.avgMandatory)} />
                              <Cell fill="rgba(255,255,255,0.05)" />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
                          <span className="text-4xl font-black tracking-tighter text-white">{metrics.avgMandatory.toFixed(0)}%</span>
                        </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white mt-4">Mandatorio Total</span>
                  </div>

                  <div className="lg:col-span-3 bg-black/20 rounded-3xl p-6 border border-white/5 h-full flex flex-col justify-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-8 block text-center">Promedio por Categoría</span>
                    <div className="flex justify-around items-end h-40 gap-4">
                      <CategoryBar label="Seguridad" value={metrics.avgSegMand} color={getStatusColor(metrics.avgSegMand)} />
                      <CategoryBar label="Calidad" value={metrics.avgCalMand} color={getStatusColor(metrics.avgCalMand)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2.5: No Mandatory Group */}
              <div className="bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/10 p-8 shadow-2xl flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-black italic uppercase tracking-tighter">
                    Sesión 3: <span className="text-[#00D4FF]">No Mandatorio</span>
                  </h3>
                  <div className="p-2 bg-[#00D4FF]/10 rounded-full border border-[#00D4FF]/20">
                    <Target className="text-[#00D4FF]" size={16} />
                  </div>
                </div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-10">Criterios de Excelencia (No Mandatorios)</p>
                
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 flex-1 items-center">
                  <div className="lg:col-span-2 relative flex flex-col items-center">
                    <div className="w-full h-[180px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                            <Pie
                              data={[
                                { value: metrics.avgNoMandatory },
                                { value: 100 - metrics.avgNoMandatory }
                              ]}
                              cx="50%"
                              cy="100%"
                              startAngle={180}
                              endAngle={0}
                              innerRadius="65%"
                              outerRadius="95%"
                              paddingAngle={0}
                              dataKey="value"
                              stroke="none"
                            >
                              <Cell fill={getStatusColor(metrics.avgNoMandatory)} />
                              <Cell fill="rgba(255,255,255,0.05)" />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
                          <span className="text-4xl font-black tracking-tighter text-white">{metrics.avgNoMandatory.toFixed(0)}%</span>
                        </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white mt-4">Promedio Total</span>
                  </div>

                  <div className="lg:col-span-3 bg-black/20 rounded-3xl p-6 border border-white/5 h-full flex flex-col justify-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-8 block text-center">Promedio por Categoría</span>
                    <div className="flex justify-around items-end h-40 gap-4">
                      <CategoryBar label="Seguridad" value={filteredData.reduce((acc, d) => acc + d.scoreSegNoMand, 0) / metrics.count} color={COLORS.primary} />
                      <CategoryBar label="Calidad" value={filteredData.reduce((acc, d) => acc + d.scoreCalNoMand, 0) / metrics.count} color={COLORS.primary} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
              {/* Section 3: Evolution - Stacked Bars */}
              <div className="xl:col-span-3 bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/10 p-8 shadow-2xl flex flex-col">
                <h3 className="text-xl font-black italic uppercase tracking-tighter mb-8">
                  Estándar <span className="text-[#00D4FF]">Mensual</span>
                </h3>
                <div className="min-h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 900 }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 900 }}
                        domain={[0, 100]}
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }}
                        itemStyle={{ fontSize: '10px', fontWeight: 900 }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 900 }} />
                      <Bar name="Mandatario" dataKey="mand" fill={COLORS.critical} radius={[10, 10, 0, 0]}>
                        <LabelList dataKey="mand" position="top" formatter={(v: any) => `${v.toFixed(0)}%`} style={{ fill: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: 900 }} />
                      </Bar>
                      <Bar name="No Mandatario" dataKey="noMand" fill={COLORS.primary} radius={[10, 10, 0, 0]}>
                        <LabelList dataKey="noMand" position="top" formatter={(v: any) => `${v.toFixed(0)}%`} style={{ fill: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: 900 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Section: Time Execution Frequency */}
              <div className="xl:col-span-2 bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/10 p-8 shadow-2xl flex flex-col">
                <h3 className="text-xl font-black italic uppercase tracking-tighter mb-8">
                  Tiempos de <span className="text-[#00FF88]">Ejecución</span>
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6">Auditorías por Minutos de Duración</p>
                <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.timeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis 
                        dataKey="mins" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 900 }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 900 }}
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }}
                        itemStyle={{ fontSize: '10px', fontWeight: 900 }}
                      />
                      <Bar name="Registros" dataKey="count" fill={COLORS.success} radius={[10, 10, 0, 0]}>
                        <LabelList dataKey="count" position="top" style={{ fill: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: 900 }} />
                        {metrics.timeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fillOpacity={0.4 + (entry.count / Math.max(...metrics.timeData.map(d=>d.count))) * 0.6} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/10 p-8 shadow-2xl">
                <h3 className="text-lg font-black italic uppercase tracking-tight mb-8">
                  Compliance por <span className="text-[#00D4FF]">Centro</span>
                </h3>
                <div className="space-y-10">
                  {metrics.centerData.map(cd => (
                    <div key={cd.name} className="space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-widest text-[#00D4FF]">{cd.name}</span>
                        <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-black text-white">{cd.mand.toFixed(1)}% Mand.</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <MetricProgress label="Mandatorio Total" value={cd.mand} color={getStatusColor(cd.mand)} />
                        <MetricProgress label="No Mandatorio Total" value={cd.noMand} color={COLORS.primary} />
                        <MetricProgress label="Seguridad Mand." value={cd.segMand} color={getStatusColor(cd.segMand)} />
                        <MetricProgress label="Calidad Mand." value={cd.calMand} color={getStatusColor(cd.calMand)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/10 p-8 shadow-2xl flex flex-col overflow-hidden">
                <h3 className="text-lg font-black italic uppercase tracking-tight mb-8">
                  Top Auditores <span className="text-[#00D4FF]">— Reportes</span>
                </h3>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Rank</th>
                        <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Auditor</th>
                        <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Auds.</th>
                        <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">% Mand.</th>
                        <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Base</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.auditorRanking.map((aud, idx) => (
                        <tr key={aud.name} className={`group border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors ${idx === 0 ? 'bg-[#FFB800]/5' : ''}`}>
                          <td className="py-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${idx < 3 ? 'bg-[#FFB800] text-black shadow-[0_0_15px_rgba(255,184,0,0.4)]' : 'bg-white/5 text-slate-500'}`}>
                              {idx + 1}
                            </div>
                          </td>
                          <td className="py-4">
                            <span className={`text-[11px] font-black uppercase tracking-widest ${idx === 0 ? 'text-[#FFB800]' : 'text-white'}`}>
                              {aud.name}
                            </span>
                          </td>
                          <td className="py-4 text-center font-mono text-[11px] font-bold text-slate-400">{aud.count}</td>
                          <td className="py-4 text-right">
                            <span className="text-[11px] font-black" style={{ color: getStatusColor(aud.mandAvg) }}>
                              {aud.mandAvg.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-4 text-right overflow-hidden max-w-[80px]">
                            <span className="text-[8px] font-bold text-slate-500 uppercase truncate block">
                              {aud.mainCenter}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-20 bg-white/5 rounded-[3rem]">
            <Search size={48} className="mx-auto text-slate-600 mb-6" />
            <h3 className="text-xl font-black uppercase tracking-widest text-slate-500">No hay datos para los filtros seleccionados</h3>
          </div>
        )
      ) : (
        /* CIERRE DE NOVEDADES TAB */
        <div className="space-y-8">
          {/* Search Bar for Table */}
          <div className="bg-white/5 backdrop-blur-xl p-4 rounded-3xl border border-white/10 flex items-center gap-4 max-w-xl">
            <Search className="text-[#00D4FF]" size={20} />
            <input 
              type="text" 
              placeholder="BUSCAR POR PLACA O OBSERVACIÓN..." 
              className="bg-transparent border-none outline-none text-xs font-black uppercase tracking-widest text-white placeholder:text-slate-500 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {closureMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6">
              <KPICard title="Total Reportes" value={closureMetrics.total} icon={<Activity size={20} />} color={COLORS.primary} />
              <KPICard title="Abiertos" value={closureMetrics.open} icon={<AlertCircle size={20} />} color={COLORS.critical} />
              <KPICard title="Cerrados" value={closureMetrics.closed} icon={<CheckCircle2 size={20} />} color={COLORS.success} />
              <KPICard title="Placas Únicas" value={closureMetrics.uniquePlates} icon={<Truck size={20} />} color={COLORS.primary} />
              <KPICard title="% Cumplimiento" value={closureMetrics.compliance.toFixed(0) + '%'} icon={<Target size={20} />} color={getStatusColor(closureMetrics.compliance)} isPercent />
            </div>
          )}

          <div className="bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha Reporte</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">CD</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Placa</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Observación</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Estado</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha Cierre</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Días</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredData.filter(item => item.observations && item.observations.trim() !== '').map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-6 text-[11px] font-bold text-slate-400 whitespace-nowrap">{item.fecha || 'N/A'}</td>
                      <td className="p-6 text-[11px] font-black text-[#00D4FF] uppercase">{item.centro}</td>
                      <td className="p-6">
                        <span className="px-3 py-1 bg-white/10 rounded-lg text-[11px] font-mono font-black text-white border border-white/10 group-hover:border-[#00D4FF]/30 transition-colors">
                          {item.placa}
                        </span>
                      </td>
                      <td className="p-6 text-[11px] text-slate-300 font-medium max-w-xs truncate">
                        {item.observations || '-'}
                      </td>
                      <td className="p-6 text-center">
                        <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          item.estado?.toUpperCase().includes('CERRADO') 
                            ? 'bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20' 
                            : 'bg-[#FF4560]/10 text-[#FF4560] border border-[#FF4560]/20'
                        }`}>
                          {item.estado || 'PENDIENTE'}
                        </span>
                      </td>
                      <td className="p-6 text-[11px] font-bold text-slate-400">{item.fechaCierre || '-'}</td>
                      <td className="p-6 text-center font-mono text-[11px] font-black text-white">{item.diasCierre || 0}</td>
                    </tr>
                  ))}
                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-20 text-center text-slate-600 font-black uppercase tracking-widest text-xs">
                        No se han encontrado registros
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const KPICard = ({ title, value, icon, color, isPercent = false }: any) => (
  <motion.div 
    whileHover={{ y: -5, scale: 1.02 }}
    className="bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 flex flex-col items-center justify-center text-center group shadow-xl"
  >
    <div className="p-3 mb-4 rounded-2xl transition-all duration-500 group-hover:rotate-12" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
      {React.cloneElement(icon, { style: { color } })}
    </div>
    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{title}</span>
    <span className="text-3xl font-black tracking-tighter" style={{ color: color }}>{value}</span>
    {isPercent && (
       <div className="w-12 h-1 bg-white/10 rounded-full mt-4 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: value, backgroundColor: color }} />
       </div>
    )}
  </motion.div>
);

const MetricProgress = ({ label, value, color }: any) => (
  <div className="space-y-3">
    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
      <span>{label}</span>
      <span style={{ color }}>{value.toFixed(0)}%</span>
    </div>
    <div className="h-3 w-full bg-white/5 rounded-full p-1 border border-white/5">
      <motion.div 
        initial={{ width: 0 }}
        whileInView={{ width: `${value}%` }}
        viewport={{ once: true }}
        className="h-full rounded-full"
        style={{ 
          backgroundColor: color,
          boxShadow: `0 0 15px ${color}40`,
          backgroundImage: `linear-gradient(90deg, transparent, rgba(255,255,255,0.2))`
        }}
      />
    </div>
  </div>
);

const CategoryBar = ({ label, value, color }: { label: string, value: number, color: string }) => (
  <div className="flex flex-col items-center flex-1 h-full justify-end group">
    <span className="text-[11px] font-black mb-2">{value.toFixed(0)}%</span>
    <motion.div 
      initial={{ height: 0 }}
      whileInView={{ height: `${value}%` }}
      viewport={{ once: true }}
      className="w-12 rounded-t-xl relative overflow-hidden"
      style={{ backgroundColor: color, boxShadow: `0 0 20px ${color}30` }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
    </motion.div>
    <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter mt-4 group-hover:text-white transition-colors">{label}</span>
  </div>
);

export default ExecutiveAuditDashboard;
