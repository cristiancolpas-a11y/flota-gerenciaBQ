import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, Cell, LabelList, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, TrendingUp, Calendar, 
  Filter, Search, Download, RefreshCw, Layers, Award, Truck, AlertCircle, Settings, FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ForkliftAuditRecord } from '../types';
import { 
  fetchForkliftAuditsFromSheet, 
  getForkliftAuditDocId, 
  getForkliftAuditGid, 
  setForkliftAuditConfig,
  formatMonthName 
} from '../services/sheetService';

// Paleta de marca solicitada
const BRAND_COLORS = {
  primary: '#0D2B4E',   // Azul principal
  success: '#16A34A',   // Verde (cumple)
  warning: '#F2B705',   // Dorado (medio / acento)
  critical: '#DC2626',  // Rojo (no cumple)
  grayDark: '#111827',
  grayMuted: '#6B7280',
  bg: '#F1F3F5',
  card: '#FFFFFF',
  border: '#E5E7EB'
};

const getScoreColor = (score: number) => {
  if (score >= 90) return BRAND_COLORS.success;
  if (score >= 75) return BRAND_COLORS.warning;
  return BRAND_COLORS.critical;
};

interface ForkliftAuditDashboardProps {
  onRefreshParent?: () => void;
}

export const ForkliftAuditDashboard: React.FC<ForkliftAuditDashboardProps> = ({ onRefreshParent }) => {
  const [data, setData] = useState<ForkliftAuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Configuración de DocID y GID
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [docIdInput, setDocIdInput] = useState(() => getForkliftAuditDocId());
  const [gidInput, setGidInput] = useState(() => getForkliftAuditGid());

  // Filtros
  const [filterCentro, setFilterCentro] = useState<string>('TODOS');
  const [filterMes, setFilterMes] = useState<string>('TODOS');
  const [filterRegional, setFilterRegional] = useState<string>('TODOS');
  const [filterMaquina, setFilterMaquina] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Ordenamiento de tabla
  const [sortBy, setSortBy] = useState<'mandatorio_asc' | 'mandatorio_desc' | 'fecha_desc' | 'general_asc'>('mandatorio_asc');

  const loadAudits = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const records = await fetchForkliftAuditsFromSheet();
      setData(records);
      if (records.length === 0) {
        setErrorMsg('No se recibieron datos de la hoja ESTANDAR. Verifica el ID del documento y el GID en la configuración.');
      }
    } catch (err: any) {
      console.error("Error loading forklift audits:", err);
      setErrorMsg('Error al conectar con la hoja de cálculo. Puedes configurar el Document ID y GID usando el botón de configuración.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudits();
  }, []);

  const handleSaveConfig = () => {
    setForkliftAuditConfig(docIdInput, gidInput);
    setShowConfigModal(false);
    loadAudits();
  };

  // Opciones únicas para filtros
  const uniqueCentros = useMemo(() => {
    const set = new Set<string>();
    data.forEach(d => { if (d.centro) set.add(d.centro.trim()); });
    return Array.from(set).sort();
  }, [data]);

  const uniqueRegionales = useMemo(() => {
    const set = new Set<string>();
    data.forEach(d => { if (d.regional) set.add(d.regional.trim()); });
    return Array.from(set).sort();
  }, [data]);

  const uniqueMeses = useMemo(() => {
    const set = new Set<string>();
    data.forEach(d => {
      const m = formatMonthName(d.fecha);
      if (m) set.add(m);
    });
    return Array.from(set);
  }, [data]);

  const uniqueMaquinas = useMemo(() => {
    const set = new Set<string>();
    data.forEach(d => { if (d.maquina) set.add(d.maquina.trim()); });
    return Array.from(set).sort();
  }, [data]);

  // Filtrado de registros
  const filteredData = useMemo(() => {
    return data.filter(record => {
      if (filterCentro !== 'TODOS' && record.centro !== filterCentro) return false;
      if (filterRegional !== 'TODOS' && record.regional !== filterRegional) return false;
      if (filterMaquina !== 'TODOS' && record.maquina !== filterMaquina) return false;
      if (filterMes !== 'TODOS') {
        const m = formatMonthName(record.fecha);
        if (m !== filterMes) return false;
      }
      if (searchTerm) {
        const search = searchTerm.toLowerCase().trim();
        const mMatch = record.maquina?.toLowerCase().includes(search);
        const cMatch = record.centro?.toLowerCase().includes(search);
        const fMatch = record.fecha?.toLowerCase().includes(search);
        if (!mMatch && !cMatch && !fMatch) return false;
      }
      return true;
    });
  }, [data, filterCentro, filterRegional, filterMaquina, filterMes, searchTerm]);

  // KPIs Generales
  const kpis = useMemo(() => {
    const total = filteredData.length;
    if (total === 0) {
      return {
        total: 0,
        mandatorioAvg: 0,
        noMandatorioAvg: 0,
        generalAvg: 0,
        maquinasCount: 0
      };
    }
    const sumMandatorio = filteredData.reduce((acc, r) => acc + r.cumplimientoMandatorio, 0);
    const sumNoMandatorio = filteredData.reduce((acc, r) => acc + r.cumplimientoNoMandatorio, 0);
    const sumGeneral = filteredData.reduce((acc, r) => acc + r.cumplimientoGeneral, 0);
    const distinctMaquinas = new Set(filteredData.map(r => r.maquina).filter(Boolean)).size;

    return {
      total,
      mandatorioAvg: Math.round((sumMandatorio / total) * 10) / 10,
      noMandatorioAvg: Math.round((sumNoMandatorio / total) * 10) / 10,
      generalAvg: Math.round((sumGeneral / total) * 10) / 10,
      maquinasCount: distinctMaquinas
    };
  }, [filteredData]);

  // Gráfica 1: Cumplimiento mandatorio por Centro
  const centroChartData = useMemo(() => {
    const map = new Map<string, { sumMand: number; sumNoMand: number; count: number }>();
    filteredData.forEach(r => {
      const c = r.centro || 'Sin Centro';
      const existing = map.get(c) || { sumMand: 0, sumNoMand: 0, count: 0 };
      existing.sumMand += r.cumplimientoMandatorio;
      existing.sumNoMand += r.cumplimientoNoMandatorio;
      existing.count += 1;
      map.set(c, existing);
    });

    return Array.from(map.entries()).map(([centro, val]) => ({
      centro,
      mandatorio: Math.round((val.sumMand / val.count) * 10) / 10,
      noMandatorio: Math.round((val.sumNoMand / val.count) * 10) / 10,
      auditorias: val.count
    }));
  }, [filteredData]);

  // Gráfica 3: Cumplimiento por mes (evolución del % mandatorio en el tiempo)
  const mesChartData = useMemo(() => {
    const map = new Map<string, { sumMand: number; sumGen: number; count: number; rawDate: string }>();
    filteredData.forEach(r => {
      const month = formatMonthName(r.fecha) || 'Otro';
      const existing = map.get(month) || { sumMand: 0, sumGen: 0, count: 0, rawDate: r.fecha };
      existing.sumMand += r.cumplimientoMandatorio;
      existing.sumGen += r.cumplimientoGeneral;
      existing.count += 1;
      if (!existing.rawDate && r.fecha) existing.rawDate = r.fecha;
      map.set(month, existing);
    });

    return Array.from(map.entries()).map(([mes, val]) => ({
      mes,
      mandatorio: Math.round((val.sumMand / val.count) * 10) / 10,
      general: Math.round((val.sumGen / val.count) * 10) / 10,
      auditorias: val.count
    }));
  }, [filteredData]);

  // Gráfica 4: Cumplimiento por CATEGORÍA (DW:EH)
  const categoryChartData = useMemo(() => {
    if (filteredData.length === 0) return [];
    const cats = [
      { key: 'documentacion', label: 'Documentación' },
      { key: 'espejos', label: 'Espejos' },
      { key: 'marchaAtras', label: 'Marcha Atrás' },
      { key: 'controlVelocidad', label: 'Control Velocidad' },
      { key: 'luces', label: 'Luces' },
      { key: 'asiento', label: 'Asiento' },
      { key: 'cinturon', label: 'Cinturón' },
      { key: 'cabina', label: 'Cabina' },
      { key: 'mandos', label: 'Mandos' },
      { key: 'senalizacion', label: 'Señalización' },
      { key: 'gts', label: 'GTS' },
      { key: 'otros', label: 'Otros' },
    ];

    const total = filteredData.length;
    return cats.map(c => {
      const sum = filteredData.reduce((acc, r) => acc + ((r as any)[c.key] || 0), 0);
      const avg = Math.round((sum / total) * 10) / 10;
      return {
        categoria: c.label,
        cumplimiento: avg
      };
    }).sort((a, b) => a.cumplimiento - b.cumplimiento); // Peores primero para llamar la atención
  }, [filteredData]);

  // Gráfica 5: Top ítems que más fallan (donde valor es 0)
  const topFailingItemsData = useMemo(() => {
    if (filteredData.length === 0) return [];
    const failCounts: Record<string, number> = {};

    filteredData.forEach(r => {
      if (r.itemFailures) {
        Object.entries(r.itemFailures).forEach(([item, failed]) => {
          if (failed) {
            failCounts[item] = (failCounts[item] || 0) + 1;
          }
        });
      }
    });

    return Object.entries(failCounts)
      .map(([item, fallos]) => ({
        item,
        fallos,
        porcentajeFallo: Math.round((fallos / filteredData.length) * 100)
      }))
      .sort((a, b) => b.fallos - a.fallos)
      .slice(0, 10);
  }, [filteredData]);

  // Gráfica 6: Ranking de máquinas por cumplimiento (peores arriba)
  const rankingMaquinasData = useMemo(() => {
    const map = new Map<string, { sumGen: number; sumMand: number; count: number; centro: string }>();
    filteredData.forEach(r => {
      const m = r.maquina || 'Sin Máquina';
      const existing = map.get(m) || { sumGen: 0, sumMand: 0, count: 0, centro: r.centro };
      existing.sumGen += r.cumplimientoGeneral;
      existing.sumMand += r.cumplimientoMandatorio;
      existing.count += 1;
      map.set(m, existing);
    });

    return Array.from(map.entries()).map(([maquina, val]) => ({
      maquina,
      centro: val.centro,
      general: Math.round((val.sumGen / val.count) * 10) / 10,
      mandatorio: Math.round((val.sumMand / val.count) * 10) / 10,
      auditorias: val.count
    }))
    .sort((a, b) => a.general - b.general) // Peores arriba
    .slice(0, 12);
  }, [filteredData]);

  // Tabla detallada ordenada
  const sortedTableData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      if (sortBy === 'mandatorio_asc') return a.cumplimientoMandatorio - b.cumplimientoMandatorio;
      if (sortBy === 'mandatorio_desc') return b.cumplimientoMandatorio - a.cumplimientoMandatorio;
      if (sortBy === 'general_asc') return a.cumplimientoGeneral - b.cumplimientoGeneral;
      if (sortBy === 'fecha_desc') return (b.fecha || '').localeCompare(a.fecha || '');
      return 0;
    });
  }, [filteredData, sortBy]);

  // Exportar CSV
  const handleExportCSV = () => {
    if (filteredData.length === 0) return;
    const headers = ['Fecha', 'Regional', 'Centro', 'Maquina', '% Mandatorio', '% No Mandatorio', '% General'];
    const rows = filteredData.map(r => [
      `"${r.fecha || ''}"`,
      `"${r.regional || ''}"`,
      `"${r.centro || ''}"`,
      `"${r.maquina || ''}"`,
      r.cumplimientoMandatorio.toFixed(1),
      r.cumplimientoNoMandatorio.toFixed(1),
      r.cumplimientoGeneral.toFixed(1)
    ]);
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Auditoria_Montacargas_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-fadeIn" style={{ backgroundColor: BRAND_COLORS.bg, minHeight: '100vh', padding: '1.5rem' }}>
      
      {/* Header Principal */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: BRAND_COLORS.primary }}>
              <Truck size={24} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: BRAND_COLORS.primary }}>
                Auditoría Estándar de Montacargas
              </h1>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Evaluación de cumplimiento de flota FLT (MANDATORIOS vs NO MANDATORIOS)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
            title="Configurar Google Sheet ID y GID"
          >
            <Settings size={15} />
            <span>Configurar Fuente</span>
          </button>

          <button
            onClick={loadAudits}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredData.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md hover:brightness-110 disabled:opacity-50"
            style={{ backgroundColor: BRAND_COLORS.primary }}
          >
            <Download size={15} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Alerta si hubo error */}
      {errorMsg && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-800 text-xs">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Aviso sobre la fuente de datos:</p>
            <p>{errorMsg}</p>
          </div>
          <button 
            onClick={() => setShowConfigModal(true)}
            className="px-3 py-1 bg-amber-600 text-white rounded-lg font-bold text-[11px] hover:bg-amber-700 transition-colors"
          >
            Configurar ID
          </button>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider">
          <Filter size={14} />
          <span>Filtros de Auditoría</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Filtro Centro */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Centro</label>
            <select
              value={filterCentro}
              onChange={e => setFilterCentro(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">Todos los centros</option>
              {uniqueCentros.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Filtro Mes */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Mes</label>
            <select
              value={filterMes}
              onChange={e => setFilterMes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">Todos los meses</option>
              {uniqueMeses.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Filtro Regional */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Regional</label>
            <select
              value={filterRegional}
              onChange={e => setFilterRegional(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">Todas las regionales</option>
              {uniqueRegionales.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Filtro Máquina */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Máquina</label>
            <select
              value={filterMaquina}
              onChange={e => setFilterMaquina(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">Todas las máquinas</option>
              {uniqueMaquinas.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Buscador de texto */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Buscador</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar máquina, fecha..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Sección 1: Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Auditorías */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Auditorías</span>
            <Layers size={18} className="text-slate-400" />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-800">{kpis.total}</div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">Registros evaluados</div>
          </div>
        </div>

        {/* % CUMPLIMIENTO MANDATORIO (Destacado Principal) */}
        <div 
          className="bg-white rounded-2xl p-5 border-2 shadow-md flex flex-col justify-between relative overflow-hidden"
          style={{ borderColor: BRAND_COLORS.primary }}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -z-0 opacity-60" />
          <div className="flex items-center justify-between text-slate-700 mb-2 z-10">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: BRAND_COLORS.primary }}>
              <ShieldCheck size={14} /> % Mandatorio
            </span>
            <span className="px-2 py-0.5 rounded text-[9px] font-black text-white" style={{ backgroundColor: getScoreColor(kpis.mandatorioAvg) }}>
              {kpis.mandatorioAvg >= 90 ? 'ÓPTIMO' : kpis.mandatorioAvg >= 75 ? 'ALERTA' : 'CRÍTICO'}
            </span>
          </div>
          <div className="z-10">
            <div className="text-4xl font-black tracking-tight" style={{ color: getScoreColor(kpis.mandatorioAvg) }}>
              {kpis.mandatorioAvg}%
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-1">
              37 ítems mandatorios (Meta: 100%)
            </div>
          </div>
        </div>

        {/* % Cumplimiento No Mandatorio */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">% No Mandatorio</span>
            <AlertCircle size={18} className="text-slate-400" />
          </div>
          <div>
            <div className="text-3xl font-black" style={{ color: getScoreColor(kpis.noMandatorioAvg) }}>
              {kpis.noMandatorioAvg}%
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">
              20 ítems complementarios
            </div>
          </div>
        </div>

        {/* % Cumplimiento General */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">% Cumplimiento General</span>
            <TrendingUp size={18} className="text-slate-400" />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-800">
              {kpis.generalAvg}%
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">
              Ponderación columna EI
            </div>
          </div>
        </div>

        {/* Máquinas Auditadas */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Máquinas Auditadas</span>
            <Truck size={18} className="text-slate-400" />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-800">{kpis.maquinasCount}</div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">Placas distintas</div>
          </div>
        </div>
      </div>

      {/* Sección 2: Gráficas (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Gráfica 1: Cumplimiento Mandatorio por Centro */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                1. Cumplimiento Mandatorio por Centro
              </h3>
              <p className="text-xs text-slate-500 font-medium">Comparativa DC Galapa vs DC La Arenosa (con meta 100%)</p>
            </div>
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg">
              Meta: 100%
            </span>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={centroChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="centro" tick={{ fontSize: 11, fontWeight: 700, fill: '#475569' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748B' }} unit="%" />
                <Tooltip 
                  formatter={(val: any) => [`${val}%`, 'Cumplimiento Mandatorio']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="mandatorio" fill={BRAND_COLORS.primary} radius={[8, 8, 0, 0]}>
                  <LabelList dataKey="mandatorio" position="top" formatter={(v: any) => `${v}%`} style={{ fontSize: 11, fontWeight: 800, fill: BRAND_COLORS.primary }} />
                  {centroChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getScoreColor(entry.mandatorio)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica 2: Mandatorio vs No Mandatorio por Centro */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              2. Mandatorio vs No Mandatorio
            </h3>
            <p className="text-xs text-slate-500 font-medium">Comparativa directa por sede</p>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={centroChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="centro" tick={{ fontSize: 11, fontWeight: 700, fill: '#475569' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748B' }} unit="%" />
                <Tooltip 
                  formatter={(val: any) => [`${val}%`]}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="mandatorio" name="Mandatorio (37 ítems)" fill={BRAND_COLORS.primary} radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="mandatorio" position="top" formatter={(v: any) => `${v}%`} style={{ fontSize: 10, fontWeight: 700 }} />
                </Bar>
                <Bar dataKey="noMandatorio" name="No Mandatorio (20 ítems)" fill={BRAND_COLORS.warning} radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="noMandatorio" position="top" formatter={(v: any) => `${v}%`} style={{ fontSize: 10, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica 3: Cumplimiento por Mes (Línea de evolución) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              3. Evolución del Cumplimiento en el Tiempo
            </h3>
            <p className="text-xs text-slate-500 font-medium">Histórico mensual de cumplimiento Mandatorio vs General</p>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mesChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fontWeight: 700, fill: '#475569' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748B' }} unit="%" />
                <Tooltip 
                  formatter={(val: any) => [`${val}%`]}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line 
                  type="monotone" 
                  dataKey="mandatorio" 
                  name="% Mandatorio" 
                  stroke={BRAND_COLORS.success} 
                  strokeWidth={3} 
                  dot={{ r: 5, fill: BRAND_COLORS.success }}
                >
                  <LabelList dataKey="mandatorio" position="top" formatter={(v: any) => `${v}%`} style={{ fontSize: 10, fontWeight: 800, fill: BRAND_COLORS.success }} />
                </Line>
                <Line 
                  type="monotone" 
                  dataKey="general" 
                  name="% General" 
                  stroke={BRAND_COLORS.primary} 
                  strokeWidth={2} 
                  strokeDasharray="4 4"
                  dot={{ r: 4, fill: BRAND_COLORS.primary }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica 4: Cumplimiento por CATEGORÍA (DW:EH) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              4. Cumplimiento por Categoría del Estándar
            </h3>
            <p className="text-xs text-slate-500 font-medium">Promedio de las columnas precalculadas DW:EH (menores cumplimientos primero)</p>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={categoryChartData} 
                layout="vertical"
                margin={{ top: 10, right: 40, left: 70, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
                <YAxis dataKey="categoria" type="category" tick={{ fontSize: 10, fontWeight: 700 }} />
                <Tooltip 
                  formatter={(val: any) => [`${val}%`, 'Cumplimiento']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="cumplimiento" radius={[0, 6, 6, 0]}>
                  <LabelList dataKey="cumplimiento" position="right" formatter={(v: any) => `${v}%`} style={{ fontSize: 10, fontWeight: 700 }} />
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cat-${index}`} fill={getScoreColor(entry.cumplimiento)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica 5: Top Ítems que Más Fallan */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              5. Top Ítems que Más Fallan
            </h3>
            <p className="text-xs text-slate-500 font-medium">Frecuencia de no conformidades (valor 0 en auditoría)</p>
          </div>

          <div className="h-72 w-full pt-4">
            {topFailingItemsData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
                No se registraron fallos en los ítems evaluados
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={topFailingItemsData} 
                  layout="vertical" 
                  margin={{ top: 10, right: 45, left: 60, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="item" type="category" tick={{ fontSize: 10, fontWeight: 700 }} />
                  <Tooltip 
                    formatter={(val: any) => [`${val} fallos`, 'Cantidad']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="fallos" fill={BRAND_COLORS.critical} radius={[0, 6, 6, 0]}>
                    <LabelList dataKey="fallos" position="right" style={{ fontSize: 10, fontWeight: 800, fill: BRAND_COLORS.critical }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Gráfica 6: Ranking de Máquinas con Menor Cumplimiento (Críticas arriba) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              6. Ranking de Máquinas más Críticas
            </h3>
            <p className="text-xs text-slate-500 font-medium">Máquinas con menor % Total (columna EI) - Atención prioritaria</p>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={rankingMaquinasData} 
                layout="vertical" 
                margin={{ top: 10, right: 40, left: 60, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
                <YAxis dataKey="maquina" type="category" tick={{ fontSize: 10, fontWeight: 700 }} />
                <Tooltip 
                  formatter={(val: any) => [`${val}%`, 'Cumplimiento General']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="general" radius={[0, 6, 6, 0]}>
                  <LabelList dataKey="general" position="right" formatter={(v: any) => `${v}%`} style={{ fontSize: 10, fontWeight: 800 }} />
                  {rankingMaquinasData.map((entry, index) => (
                    <Cell key={`maq-${index}`} fill={getScoreColor(entry.general)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Sección 3: Tabla Detallada */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Detalle de Auditorías Registradas
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Mostrando {sortedTableData.length} registros de auditoría
            </p>
          </div>

          {/* Opciones de ordenamiento */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ordenar:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="mandatorio_asc">Peor % Mandatorio primero</option>
              <option value="mandatorio_desc">Mejor % Mandatorio primero</option>
              <option value="general_asc">Peor % General primero</option>
              <option value="fecha_desc">Fecha más reciente primero</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Regional</th>
                <th className="py-3.5 px-4">Centro</th>
                <th className="py-3.5 px-4">Máquina</th>
                <th className="py-3.5 px-4 text-center">% Mandatorio (37 ítems)</th>
                <th className="py-3.5 px-4 text-center">% No Mandatorio (20 ítems)</th>
                <th className="py-3.5 px-4 text-center">% General (EI)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {sortedTableData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    No se encontraron registros con los filtros seleccionados
                  </td>
                </tr>
              ) : (
                sortedTableData.map(record => (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {record.fecha || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {record.regional || 'Norte'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800">{record.centro}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-mono font-black text-[11px]">
                        {record.maquina}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span 
                        className="px-3 py-1 rounded-full font-black text-[11px] inline-block shadow-sm"
                        style={{
                          backgroundColor: `${getScoreColor(record.cumplimientoMandatorio)}15`,
                          color: getScoreColor(record.cumplimientoMandatorio),
                          border: `1px solid ${getScoreColor(record.cumplimientoMandatorio)}30`
                        }}
                      >
                        {record.cumplimientoMandatorio.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span 
                        className="px-3 py-1 rounded-full font-bold text-[11px] inline-block"
                        style={{
                          backgroundColor: `${getScoreColor(record.cumplimientoNoMandatorio)}10`,
                          color: getScoreColor(record.cumplimientoNoMandatorio)
                        }}
                      >
                        {record.cumplimientoNoMandatorio.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-black text-slate-800 text-xs">
                        {record.cumplimientoGeneral.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Configuración de Fuente de Datos */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: BRAND_COLORS.primary }}>
                    <Settings size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">
                      Configurar Fuente de Datos
                    </h3>
                    <p className="text-xs text-slate-500">
                      Documento Estándar de Flota FLT (Hoja ESTANDAR)
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowConfigModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Google Spreadsheet Doc ID
                  </label>
                  <input
                    type="text"
                    value={docIdInput}
                    onChange={e => setDocIdInput(e.target.value)}
                    placeholder="Ej: 1Vz9b-jRZNFbq-0ex4uQcpX0KT9u6GIrAVrhSO9Xhh8g"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    ID extraído de la URL: https://docs.google.com/spreadsheets/d/<b>DOC_ID</b>/edit
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    GID de la Hoja ESTANDAR
                  </label>
                  <input
                    type="text"
                    value={gidInput}
                    onChange={e => setGidInput(e.target.value)}
                    placeholder="Ej: 0 o ID numérico del tab ESTANDAR"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    El número al final de la URL al abrir la pestaña ESTANDAR: #gid=<b>0</b>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:brightness-110"
                  style={{ backgroundColor: BRAND_COLORS.primary }}
                >
                  Guardar y Recargar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ForkliftAuditDashboard;
