
import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend, RadarChart, PolarGrid, PolarAngleAxis, Radar, PieChart, Pie
} from 'recharts';
import { 
  Shield, ShieldCheck, AlertTriangle, TrendingUp, Users, 
  MapPin, Calendar, FileText, Download, ChevronRight, 
  Search, Filter, LayoutGrid, List, Activity, 
  CheckCircle2, XCircle, Info, Clock, User
} from 'lucide-react';
import { AuditQualitySafety } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface FleetStandardAuditDashboardProps {
  data: AuditQualitySafety[];
}

const COLORS = {
  primary: '#0f172a',
  secondary: '#64748b',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  white: '#ffffff',
  bg: '#f8fafc',
  accent: '#6366f1'
};

const FleetStandardAuditDashboard: React.FC<FleetStandardAuditDashboardProps> = ({ data }) => {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedCD, setSelectedCD] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Filtering Logic
  const filteredData = useMemo(() => {
    return data.filter(r => {
      const date = new Date(r.timestamp);
      const yearMatch = selectedYear === 0 || date.getFullYear() === selectedYear;
      const monthStr = date.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
      const monthMatch = selectedMonth === 'all' || monthStr === selectedMonth;
      const cdMatch = selectedCD === 'all' || r.centro === selectedCD;
      const searchMatch = !searchTerm || 
        r.placa.toUpperCase().includes(searchTerm.toUpperCase()) ||
        r.nombre.toUpperCase().includes(searchTerm.toUpperCase()) ||
        r.centro.toUpperCase().includes(searchTerm.toUpperCase());
      
      return yearMatch && monthMatch && cdMatch && searchMatch;
    });
  }, [data, selectedYear, selectedMonth, selectedCD, searchTerm]);

  // 2. Statistics Calculation
  const stats = useMemo(() => {
    if (filteredData.length === 0) return null;

    const totalAudits = filteredData.length;
    const avgScoreCG = filteredData.reduce((acc, r) => acc + (r.scoreCG || 0), 0) / totalAudits;
    const avgScoreSecurity = filteredData.reduce((acc, r) => acc + ((r.scoreSegNoMand || 0) + (r.scoreSegMand || 0)) / 2, 0) / totalAudits;
    const avgScoreQuality = filteredData.reduce((acc, r) => acc + ((r.scoreCalNoMand || 0) + (r.scoreCalMand || 0)) / 2, 0) / totalAudits;

    // CD Ranking
    const cdScores: Record<string, { total: number, count: number }> = {};
    filteredData.forEach(r => {
      if (!cdScores[r.centro]) cdScores[r.centro] = { total: 0, count: 0 };
      cdScores[r.centro].total += r.scoreCG;
      cdScores[r.centro].count += 1;
    });
    const cdRanking = Object.entries(cdScores)
      .map(([name, s]) => ({ name, score: s.total / s.count }))
      .sort((a, b) => b.score - a.score);

    // Auditor Ranking
    const auditorCounts: Record<string, number> = {};
    filteredData.forEach(r => {
      auditorCounts[r.nombre] = (auditorCounts[r.nombre] || 0) + 1;
    });
    const topAuditor = Object.entries(auditorCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)[0];

    // Failure distribution (count NOs in specific columns)
    const failureStats: Record<string, number> = {
      'Cinturones': 0,
      'Sillas': 0,
      'Telemetría': 0,
      'Caja Fuerte': 0,
      'Botiquín': 0,
      'Extintor': 0,
      'Dashcam': 0,
      'Cámaras': 0,
      'Luces': 0,
      'Frenos': 0
    };

    filteredData.forEach(r => {
      if (r.cinturonesSeguridad === 'NO') failureStats['Cinturones']++;
      if (r.sillas === 'NO') failureStats['Sillas']++;
      if (r.telemetria === 'NO') failureStats['Telemetría']++;
      if (r.cajaFuerte === 'NO') failureStats['Caja Fuerte']++;
      if (r.botiquin === 'NO') failureStats['Botiquín']++;
      if (r.extintor === 'NO') failureStats['Extintor']++;
      if (r.dashcam === 'NO') failureStats['Dashcam']++;
      if (r.camarasAuxiliares === 'NO') failureStats['Cámaras']++;
      if (r.sistemaIluminacion === 'NO') failureStats['Luces']++;
      if (r.sistemaFrenos === 'NO') failureStats['Frenos']++;
    });

    const failureData = Object.entries(failureStats).map(([name, value]) => ({ name, value }));

    // Monthly Trend
    const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const monthlyTrend = months.map(m => {
      const monthData = filteredData.filter(r => {
        const date = new Date(r.timestamp);
        return date.toLocaleString('es-ES', { month: 'long' }).toUpperCase() === m;
      });
      return {
        name: m.substring(0, 3),
        score: monthData.length > 0 ? (monthData.reduce((acc, r) => acc + r.scoreCG, 0) / monthData.length) : 0
      };
    }).filter(m => m.score > 0);

    return {
      totalAudits,
      avgScoreCG,
      avgScoreSecurity,
      avgScoreQuality,
      cdRanking,
      topAuditor,
      failureData,
      monthlyTrend
    };
  }, [filteredData]);

  const uniqueCDs = useMemo(() => Array.from(new Set(data.map(r => r.centro))).sort(), [data]);

  const generateHTML = () => {
    if (!stats) return;

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard Auditoría Estandar de Flota</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=JetBrains+Mono&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; background: #f8fafc; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .card { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .kpi-value { font-size: 2.5rem; font-weight: 800; line-height: 1; }
        .compliance-80 { color: #ef4444; }
        .compliance-85 { color: #f59e0b; }
        .compliance-100 { color: #10b981; }
    </style>
</head>
<body class="p-8">
    <div class="max-w-7xl mx-auto space-y-8">
        <!-- Header -->
        <div class="flex justify-between items-end border-b-4 border-slate-900 pb-6">
            <div>
                <h1 class="text-4xl font-black uppercase tracking-tighter">AUDITORÍA ESTÁNDAR DE FLOTA</h1>
                <p class="text-slate-500 font-bold uppercase tracking-widest text-sm">CALIDAD & SEGURIDAD | REPORTE EJECUTIVO</p>
            </div>
            <div class="text-right">
                <p class="text-xs font-black text-slate-400 uppercase">Período: ${selectedMonth === 'all' ? selectedYear : `${selectedMonth} ${selectedYear}`}</p>
                <p class="text-xs font-black text-slate-400 uppercase">Generado: ${new Date().toLocaleDateString('es-ES')}</p>
            </div>
        </div>

        <!-- KPI Grid -->
        <div class="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div class="card bg-slate-900 text-white">
                <p class="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Total Auditorías</p>
                <p class="kpi-value">${stats.totalAudits}</p>
            </div>
            <div class="card">
                <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Score Mandatorias</p>
                <p class="kpi-value ${stats.avgScoreCG < 80 ? 'compliance-80' : stats.avgScoreCG < 85 ? 'compliance-85' : 'compliance-100'}">${stats.avgScoreCG.toFixed(1)}%</p>
            </div>
            <div class="card">
                <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Cumplimiento Seg.</p>
                <p class="kpi-value">${stats.avgScoreSecurity.toFixed(1)}%</p>
            </div>
            <div class="card">
                <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Cumplimiento Cal.</p>
                <p class="kpi-value">${stats.avgScoreQuality.toFixed(1)}%</p>
            </div>
            <div class="card">
                <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Mejor Centro</p>
                <p class="text-xl font-black uppercase">${stats.cdRanking[0]?.name || 'N/A'}</p>
                <p class="text-[10px] font-bold text-emerald-500">${(stats.cdRanking[0]?.score || 0).toFixed(1)}% Avg</p>
            </div>
        </div>

        <!-- Charts Row 1 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="card">
                <h3 class="text-sm font-black uppercase tracking-widest mb-6">Tendencia Mensual de Cumplimiento</h3>
                <canvas id="trendChart" height="200"></canvas>
            </div>
            <div class="card">
                <h3 class="text-sm font-black uppercase tracking-widest mb-6">Distribución de Fallas por Sistema</h3>
                <canvas id="failureChart" height="200"></canvas>
            </div>
        </div>

        <!-- Charts Row 2 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="card">
                <h3 class="text-sm font-black uppercase tracking-widest mb-6">Cumplimiento por Centro (CD)</h3>
                <canvas id="cdChart" height="200"></canvas>
            </div>
            <div class="card">
                <h3 class="text-sm font-black uppercase tracking-widest mb-6">Ranking CD</h3>
                <div class="space-y-4">
                  ${stats.cdRanking.slice(0, 10).map(cd => `
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-black uppercase">${cd.name}</span>
                      <div class="flex-grow mx-4 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div class="bg-slate-900 h-full" style="width: ${cd.score}%"></div>
                      </div>
                      <span class="text-xs font-mono font-bold">${(cd.score).toFixed(1)}%</span>
                    </div>
                  `).join('')}
                </div>
            </div>
        </div>

        <!-- Tables -->
        <div class="card overflow-hidden">
            <div class="p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 class="text-sm font-black uppercase tracking-widest">Detalle de Auditorías Recientes</h3>
              <span class="px-3 py-1 bg-slate-900 text-white text-[10px] font-black rounded-full">${filteredData.length} Registros</span>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-slate-100 text-[10px] uppercase font-black text-slate-500">
                        <tr>
                            <th class="p-4">Fecha</th>
                            <th class="p-4">CD</th>
                            <th class="p-4">Placa</th>
                            <th class="p-4">Auditor</th>
                            <th class="p-4">Mandatorias</th>
                            <th class="p-4">Seguridad</th>
                            <th class="p-4">Calidad</th>
                        </tr>
                    </thead>
                    <tbody class="text-[11px] font-medium divide-y">
                        ${filteredData.slice(0, 50).map(r => `
                            <tr class="hover:bg-slate-50">
                                <td class="p-4">${new Date(r.timestamp).toLocaleDateString()}</td>
                                <td class="p-4 font-black">${r.centro}</td>
                                <td class="p-4"><span class="bg-slate-200 px-2 py-1 rounded font-mono font-black">${r.placa}</span></td>
                                <td class="p-4 uppercase">${r.nombre}</td>
                                <td class="p-4 font-black ${r.scoreCG < 80 ? 'text-rose-500' : 'text-emerald-500'}">${(r.scoreCG).toFixed(1)}%</td>
                                <td class="p-4 font-black">${((r.scoreSegNoMand + r.scoreSegMand) / 2).toFixed(1)}%</td>
                                <td class="p-4 font-black">${((r.scoreCalNoMand + r.scoreCalMand) / 2).toFixed(1)}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Summary -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="card md:col-span-2">
                <h3 class="text-sm font-black uppercase tracking-widest mb-4">Resumen Ejecutivo</h3>
                <div class="text-xs text-slate-600 leading-relaxed space-y-4">
                  <p>Estado actual de la flota: El nivel de cumplimiento de mandatorios se sitúa en el <strong>${stats.avgScoreCG.toFixed(1)}%</strong>, ${stats.avgScoreCG >= 85 ? 'superando el objetivo establecido' : 'lo que requiere atención inmediata en los puntos críticos identificados'}.</p>
                  <p>Ítem más crítico: El sistema de <strong>{[...stats.failureData].sort((a,b) => b.value - a.value)[0]?.name || 'N/A'}</strong> presenta el mayor número de fallas ({[...stats.failureData].sort((a,b) => b.value - a.value)[0]?.value || 0} NO), impactando directamente en la seguridad operativa.</p>
                  <p>Centro de mejor desempeño: <strong>${stats.cdRanking[0]?.name || 'N/A'}</strong> lidera el ranking con un score promedio de ${(stats.cdRanking[0]?.score || 0).toFixed(1)}%.</p>
                  <p>Auditor más activo: <strong>${stats.topAuditor?.name || 'N/A'}</strong> con ${stats.topAuditor?.count || 0} auditorías realizadas.</p>
                </div>
            </div>
            <div class="card">
                <h3 class="text-sm font-black uppercase tracking-widest mb-4">Recomendaciones</h3>
                <ul class="text-[10px] font-bold text-slate-500 space-y-2 uppercase">
                  <li class="flex items-start gap-2"><span class="text-slate-900">•</span> Focalizar mantenimientos en {[...stats.failureData].sort((a,b) => b.value - a.value)[0]?.name || 'ítems críticos'}.</li>
                  <li class="flex items-start gap-2"><span class="text-slate-900">•</span> Reforzar capacitación en los centros con score < 80%.</li>
                  <li class="flex items-start gap-2"><span class="text-slate-900">•</span> Estandarizar criterios de auditoría entre regiones.</li>
                </ul>
            </div>
        </div>
    </div>

    <script>
        // Trend Chart
        new Chart(document.getElementById('trendChart'), {
            type: 'line',
            data: {
                labels: ${JSON.stringify(stats.monthlyTrend.map(m => m.name))},
                datasets: [{
                    label: 'Score Avg %',
                    data: ${JSON.stringify(stats.monthlyTrend.map(m => m.score))},
                    borderColor: '#0f172a',
                    backgroundColor: 'rgba(15, 23, 42, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 } } }
        });

        // Failure Chart
        new Chart(document.getElementById('failureChart'), {
            type: 'radar',
            data: {
                labels: ${JSON.stringify(stats.failureData.map(f => f.name))},
                datasets: [{
                    label: 'Cantidad de Fallas (NO)',
                    data: ${JSON.stringify(stats.failureData.map(f => f.value))},
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    borderColor: '#ef4444',
                    borderWidth: 2
                }]
            },
            options: { plugins: { legend: { display: false } } }
        });

        // CD Chart
        new Chart(document.getElementById('cdChart'), {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(stats.cdRanking.map(cd => cd.name))},
                datasets: [{
                    label: 'Cumplimiento %',
                    data: ${JSON.stringify(stats.cdRanking.map(cd => cd.score))},
                    backgroundColor: '#6366f1'
                }]
            },
            options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { min: 0, max: 100 } } }
        });
    </script>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_Auditoria_${selectedMonth}_${selectedYear}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-32">
      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-900 rounded-2xl text-white">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Auditoría Estandar de Flota</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em]">Calidad & Seguridad Operativa</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
            <Calendar size={16} className="text-slate-400" />
            <select 
              className="bg-transparent font-black text-[10px] uppercase outline-none"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            >
              <option value="all">Todos los Meses</option>
              {['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <span className="text-slate-300">|</span>
            <select 
              className="bg-transparent font-black text-[10px] uppercase outline-none"
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
            <MapPin size={16} className="text-slate-400" />
            <select 
              className="bg-transparent font-black text-[10px] uppercase outline-none"
              value={selectedCD}
              onChange={e => setSelectedCD(e.target.value)}
            >
              <option value="all">Todos los CD</option>
              {uniqueCDs.map(cd => <option key={cd} value={cd}>{cd}</option>)}
            </select>
          </div>

          <button 
            onClick={generateHTML}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
          >
            <Download size={16} /> Descargar Dashboard
          </button>
        </div>
      </div>

      {stats ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* 2. KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[
              { label: 'Total Audits', value: stats.totalAudits, sub: 'Registros', icon: <FileText size={20}/>, color: 'slate' },
              { label: 'Score Mandatorias', value: `${stats.avgScoreCG.toFixed(1)}%`, sub: 'Cumplimiento CG', icon: <Shield size={20}/>, color: stats.avgScoreCG < 80 ? 'rose' : stats.avgScoreCG < 85 ? 'amber' : 'emerald' },
              { label: 'Seguridad', value: `${stats.avgScoreSecurity.toFixed(1)}%`, sub: 'Cumplimiento CB/CE', icon: <ShieldCheck size={20}/>, color: 'indigo' },
              { label: 'Calidad', value: `${stats.avgScoreQuality.toFixed(1)}%`, sub: 'Cumplimiento CC/CF', icon: <Activity size={20}/>, color: 'sky' },
              { label: 'Auditor más activo', value: stats.topAuditor?.name.split(' ')[0] || 'N/A', sub: `${stats.topAuditor?.count || 0} Audits`, icon: <User size={20}/>, color: 'slate' },
            ].map((kpi, i) => (
              <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm group hover:border-slate-300 transition-all">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${
                  kpi.color === 'rose' ? 'bg-rose-50 text-rose-500' :
                  kpi.color === 'amber' ? 'bg-amber-50 text-amber-500' :
                  kpi.color === 'emerald' ? 'bg-emerald-50 text-emerald-500' :
                  kpi.color === 'indigo' ? 'bg-indigo-50 text-indigo-500' :
                  kpi.color === 'sky' ? 'bg-sky-50 text-sky-500' : 'bg-slate-50 text-slate-500'
                }`}>
                  {kpi.icon}
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                <h4 className="text-3xl font-black text-slate-900 tracking-tighter mt-1">{kpi.value}</h4>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* 3. Charts Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Monthly Trend */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp size={18} className="text-slate-400" /> Tendencia Mensual (%)
                  </h3>
                </div>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                      domain={[0, 100]}
                      unit="%"
                    />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#0f172a" 
                      strokeWidth={4} 
                      dot={{ r: 6, fill: '#0f172a', strokeWidth: 2, stroke: '#fff' }} 
                      activeDot={{ r: 8 }}
                      formatter={(v: any) => `${(v * 100).toFixed(1)}%`}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Failure Distribution */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <AlertTriangle size={18} className="text-slate-400" /> Fallas Críticas por Sistema
                  </h3>
                </div>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.failureData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} />
                    <Radar
                      name="Fallas"
                      dataKey="value"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.4}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 4. CD Ranking Bar */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8">Cumplimiento por Centro (Ranking CD)</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.cdRanking} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 1]} hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#0f172a', fontSize: 10, fontWeight: 900 }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    formatter={(v: any) => `${(v * 100).toFixed(1)}%`}
                  />
                  <Bar dataKey="score" radius={[0, 10, 10, 0]} barSize={20}>
                    {stats.cdRanking.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.score >= 0.85 ? '#10b981' : entry.score >= 0.8 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 5. Detailed Table */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
               <div>
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Detalle de Auditorías</h3>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Últimos {filteredData.length} registros filtrados</p>
               </div>
               <div className="flex items-center gap-2">
                 <div className="bg-white border rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-inner">
                   <Search size={14} className="text-slate-400" />
                   <input 
                     type="text" 
                     placeholder="Buscar placa..." 
                     className="bg-transparent text-[10px] font-black uppercase outline-none w-32"
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                   />
                 </div>
               </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/30 text-[9px] uppercase font-black text-slate-400 tracking-[0.2em] border-b">
                    <th className="p-6">Fecha</th>
                    <th className="p-6">CD</th>
                    <th className="p-6">Placa</th>
                    <th className="p-6">Auditor</th>
                    <th className="p-6">Mandatorias</th>
                    <th className="p-6">Seguridad</th>
                    <th className="p-6">Calidad</th>
                    <th className="p-6">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10px] font-medium text-slate-700">
                  {filteredData.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-6">{new Date(r.timestamp).toLocaleDateString()}</td>
                      <td className="p-6 font-black uppercase text-slate-400">{r.centro}</td>
                      <td className="p-6">
                        <span className="bg-slate-900 px-3 py-1.5 rounded-lg text-white font-mono font-black tracking-tighter shadow-sm group-hover:scale-105 transition-transform inline-block">
                          {r.placa}
                        </span>
                      </td>
                      <td className="p-6 font-black uppercase whitespace-nowrap">{r.nombre}</td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <div className="flex-grow bg-slate-100 w-12 h-1.5 rounded-full overflow-hidden">
                            <div className={`h-full ${r.scoreCG >= 85 ? 'bg-emerald-500' : r.scoreCG >= 80 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${r.scoreCG}%` }}></div>
                          </div>
                          <span className="font-black text-[9px]">{(r.scoreCG).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="p-6 font-black whitespace-nowrap text-slate-400">{((r.scoreSegNoMand + r.scoreSegMand) / 2).toFixed(1)}%</td>
                      <td className="p-6 font-black whitespace-nowrap text-slate-400">{((r.scoreCalNoMand + r.scoreCalMand) / 2).toFixed(1)}%</td>
                      <td className="p-6">
                         {r.scoreCG >= 0.85 ? (
                           <span className="flex items-center gap-1 text-emerald-500 font-black">
                             <CheckCircle2 size={12}/> OK
                           </span>
                         ) : (
                           <span className="flex items-center gap-1 text-rose-500 font-black">
                             <XCircle size={12}/> FALLA
                           </span>
                         )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="bg-white p-32 rounded-[3rem] border border-slate-200 text-center shadow-sm">
           <Shield className="size-20 text-slate-100 mx-auto mb-8 animate-pulse" />
           <p className="text-xl font-black text-slate-300 uppercase tracking-tighter">Sin datos para el período seleccionado</p>
           <p className="text-[10px] text-slate-200 font-black uppercase tracking-widest mt-2 px-12">Intenta ajustar los filtros de año, mes o centro de distribución para ver la información</p>
        </div>
      )}
    </div>
  );
};

export default FleetStandardAuditDashboard;
