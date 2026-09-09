import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Filter, Download, RefreshCw, Truck,
  Building2, ShieldCheck, CheckCircle2, Clock, User, FileText, X,
  ChevronDown, ChevronUp, AlertCircle, BarChart3, PieChart as PieIcon,
  Calendar
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';
import { FleetSeguimientoRecord } from '../types';
import { fetchSeguimientoFromSheet, formatMonthName } from '../services/sheetService';

interface FleetSeguimientoTabProps {
  isDarkTheme?: boolean;
  externalMes?: string;
  onMesChange?: (mes: string) => void;
  externalCd?: string;
}

export const FleetSeguimientoTab: React.FC<FleetSeguimientoTabProps> = ({ 
  isDarkTheme = false,
  externalMes,
  onMesChange,
  externalCd
}) => {
  const [data, setData] = useState<FleetSeguimientoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [filterMes, setFilterMesState] = useState<string>(() => {
    if (externalMes && externalMes !== 'TODOS') {
      return formatMonthName(externalMes) || externalMes.toUpperCase();
    }
    return 'TODOS';
  });

  const setFilterMes = (mes: string) => {
    setFilterMesState(mes);
    onMesChange?.(mes);
  };

  useEffect(() => {
    if (externalMes !== undefined) {
      if (externalMes === 'TODOS') {
        setFilterMesState('TODOS');
      } else {
        const norm = formatMonthName(externalMes) || externalMes.toUpperCase();
        setFilterMesState(norm);
      }
    }
  }, [externalMes]);

  const [filterCd, setFilterCd] = useState<string>(() => {
    if (externalCd && externalCd !== 'TODOS') return externalCd;
    return 'TODOS';
  });

  useEffect(() => {
    if (externalCd && externalCd !== 'TODOS') {
      setFilterCd(externalCd);
    }
  }, [externalCd]);

  const [filterContratista, setFilterContratista] = useState('TODOS');
  const [filterEstado, setFilterEstado] = useState<'TODOS' | 'REALIZADO' | 'PENDIENTE'>('TODOS');
  const [sortOrder, setSortOrder] = useState<'REALIZADOS_PRIMERO' | 'PENDIENTES_PRIMERO' | 'ORIGINAL'>('REALIZADOS_PRIMERO');
  const [filterEncargado, setFilterEncargado] = useState('TODOS');
  const [showEncargadosGrid, setShowEncargadosGrid] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const records = await fetchSeguimientoFromSheet();
      setData(records);
    } catch (error) {
      console.error("Error loading seguimiento records:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helper for status check: >= 1 or REALIZADO/CERRADO is REALIZADO, 0 or PENDIENTE is PENDIENTE
  const checkIsRealizado = (val: string | number | undefined | null): boolean => {
    if (val === null || val === undefined) return false;
    const cleaned = String(val).trim().toUpperCase();
    if (!cleaned || cleaned === '0' || cleaned === 'PENDIENTE' || cleaned === 'NO' || cleaned === 'FALSE' || cleaned === 'ABIERTO') return false;
    if (cleaned === '1' || cleaned === '2' || cleaned.includes('REALIZADO') || cleaned.includes('CERRADO') || cleaned.includes('VALIDADO') || cleaned === 'SI' || cleaned === 'OK') return true;
    const num = parseFloat(cleaned.replace(',', '.'));
    if (!isNaN(num)) {
      return num >= 1;
    }
    return false;
  };

  // Helper to reliably extract month name from record
  const resolveRecordMonth = (r: FleetSeguimientoRecord): string => {
    const fromMes = formatMonthName(r.mes);
    if (fromMes) return fromMes.trim().toUpperCase();
    const fromFecha = formatMonthName(r.fecha);
    if (fromFecha) return fromFecha.trim().toUpperCase();
    const fromLlave = formatMonthName(r.llave);
    if (fromLlave) return fromLlave.trim().toUpperCase();
    return '';
  };

  // Filter options
  const uniqueMonths = useMemo(() => {
    const monthOrder = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    const set = new Set<string>();
    data.forEach(r => {
      const formatted = resolveRecordMonth(r);
      if (formatted) set.add(formatted);
    });
    return Array.from(set).sort((a, b) => {
      const idxA = monthOrder.indexOf(a);
      const idxB = monthOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [data]);

  const uniqueCds = useMemo(() => {
    const set = new Set<string>();
    data.forEach(r => {
      if (r.cd) {
        const val = r.cd.trim().toUpperCase();
        if (val) set.add(val);
      }
    });
    return Array.from(set).sort();
  }, [data]);

  const uniqueContratistas = useMemo(() => {
    const set = new Set<string>();
    data.forEach(r => {
      if (r.contratista) {
        const val = r.contratista.trim();
        if (val) set.add(val);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const uniqueEncargados = useMemo(() => {
    const set = new Set<string>();
    data.forEach(r => {
      if (r.encargado) {
        const val = r.encargado.trim();
        if (val) set.add(val);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  // Main filtered dataset for table and summary
  const filteredData = useMemo(() => {
    const list = data.filter(item => {
      // Mes
      if (filterMes !== 'TODOS') {
        const itemMes = resolveRecordMonth(item);
        const selMes = (formatMonthName(filterMes) || filterMes).trim().toUpperCase();
        if (itemMes !== selMes) return false;
      }

      // CD
      if (filterCd !== 'TODOS') {
        const itemCd = (item.cd || '').trim().toUpperCase();
        if (itemCd !== filterCd.trim().toUpperCase()) return false;
      }

      // Contratista
      if (filterContratista !== 'TODOS') {
        const itemContratista = (item.contratista || '').trim().toUpperCase();
        if (itemContratista !== filterContratista.trim().toUpperCase()) return false;
      }

      // Estado: REALIZADO o PENDIENTE
      const isReal = checkIsRealizado(item.validador);
      if (filterEstado === 'REALIZADO' && !isReal) return false;
      if (filterEstado === 'PENDIENTE' && isReal) return false;

      // Encargado
      if (filterEncargado !== 'TODOS') {
        const itemEnc = (item.encargado || 'SIN ENCARGADO').trim().toUpperCase();
        if (itemEnc !== filterEncargado.trim().toUpperCase()) return false;
      }

      // Búsqueda general
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const estadoStr = isReal ? 'realizado' : 'pendiente';
        
        const matchesPlaca = (item.placa || '').toLowerCase().includes(query);
        const matchesEncargado = (item.encargado || '').toLowerCase().includes(query);
        const matchesContratista = (item.contratista || '').toLowerCase().includes(query);
        const matchesCd = (item.cd || '').toLowerCase().includes(query);
        const matchesMes = (item.mes || '').toLowerCase().includes(query);
        const matchesLlave = (item.llave || '').toLowerCase().includes(query);
        const matchesEstado = estadoStr.includes(query);

        if (!matchesPlaca && !matchesEncargado && !matchesContratista && !matchesCd && !matchesMes && !matchesLlave && !matchesEstado) {
          return false;
        }
      }

      return true;
    });

    // Ordenar: primero REALIZADOS por defecto
    return list.sort((a, b) => {
      if (sortOrder === 'REALIZADOS_PRIMERO') {
        const aReal = checkIsRealizado(a.validador);
        const bReal = checkIsRealizado(b.validador);
        if (aReal && !bReal) return -1;
        if (!aReal && bReal) return 1;
      } else if (sortOrder === 'PENDIENTES_PRIMERO') {
        const aReal = checkIsRealizado(a.validador);
        const bReal = checkIsRealizado(b.validador);
        if (!aReal && bReal) return -1;
        if (aReal && !bReal) return 1;
      }
      return (a.placa || '').localeCompare(b.placa || '');
    });
  }, [data, filterMes, filterCd, filterContratista, filterEstado, filterEncargado, searchTerm, sortOrder]);

  // Metrics specifically for the Multi-Graphic Cards
  // Evaluated based on active filters (Mes, CD, Contratista, Encargado, Search)
  // to give a complete picture of Pendientes vs Realizados and allow clicking either card to toggle
  const multiGraphMetrics = useMemo(() => {
    const selMes = (formatMonthName(filterMes) || filterMes).trim().toUpperCase();

    const baseList = data.filter(item => {
      if (filterMes !== 'TODOS') {
        const itemMes = resolveRecordMonth(item);
        if (itemMes !== selMes) return false;
      }
      if (filterCd !== 'TODOS') {
        const itemCd = (item.cd || '').trim().toUpperCase();
        if (itemCd !== filterCd.trim().toUpperCase()) return false;
      }
      if (filterContratista !== 'TODOS') {
        const itemContratista = (item.contratista || '').trim().toUpperCase();
        if (itemContratista !== filterContratista.trim().toUpperCase()) return false;
      }
      if (filterEncargado !== 'TODOS') {
        const itemEnc = (item.encargado || 'SIN ENCARGADO').trim().toUpperCase();
        if (itemEnc !== filterEncargado.trim().toUpperCase()) return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const matchesPlaca = (item.placa || '').toLowerCase().includes(query);
        const matchesEncargado = (item.encargado || '').toLowerCase().includes(query);
        const matchesContratista = (item.contratista || '').toLowerCase().includes(query);
        const matchesCd = (item.cd || '').toLowerCase().includes(query);
        const matchesMes = (item.mes || '').toLowerCase().includes(query);
        const matchesLlave = (item.llave || '').toLowerCase().includes(query);
        if (!matchesPlaca && !matchesEncargado && !matchesContratista && !matchesCd && !matchesMes && !matchesLlave) {
          return false;
        }
      }
      return true;
    });

    const total = baseList.length;
    let totalPendientes = 0;
    let totalRealizados = 0;

    const cdMap: Record<string, { cd: string; pendientes: number; realizados: number; total: number }> = {};
    const contMap: Record<string, { contratista: string; pendientes: number; realizados: number; total: number }> = {};
    const mesMap: Record<string, { mes: string; pendientes: number; realizados: number; total: number }> = {};

    baseList.forEach(item => {
      const isRealizado = checkIsRealizado(item.validador);
      if (isRealizado) totalRealizados++; else totalPendientes++;

      const cd = (item.cd || 'SIN CD').trim().toUpperCase();
      const cont = (item.contratista || 'OTROS').trim();
      const mes = resolveRecordMonth(item) || 'SIN MES';

      if (!cdMap[cd]) cdMap[cd] = { cd, pendientes: 0, realizados: 0, total: 0 };
      cdMap[cd].total += 1;
      if (isRealizado) cdMap[cd].realizados += 1; else cdMap[cd].pendientes += 1;

      if (!contMap[cont]) contMap[cont] = { contratista: cont, pendientes: 0, realizados: 0, total: 0 };
      contMap[cont].total += 1;
      if (isRealizado) contMap[cont].realizados += 1; else contMap[cont].pendientes += 1;

      if (!mesMap[mes]) mesMap[mes] = { mes, pendientes: 0, realizados: 0, total: 0 };
      mesMap[mes].total += 1;
      if (isRealizado) mesMap[mes].realizados += 1; else mesMap[mes].pendientes += 1;
    });

    const cdList = Object.values(cdMap).sort((a, b) => b.total - a.total);
    const contList = Object.values(contMap).sort((a, b) => b.total - a.total).slice(0, 4);
    const mesList = Object.values(mesMap);

    const pctPendiente = total > 0 ? Math.round((totalPendientes / total) * 100) : 0;
    const pctRealizado = total > 0 ? Math.round((totalRealizados / total) * 100) : 0;

    return {
      total,
      totalPendientes,
      totalRealizados,
      pctPendiente,
      pctRealizado,
      cdList,
      contList,
      mesList
    };
  }, [data, filterMes, filterCd, filterContratista, filterEncargado, searchTerm]);

  // Cuadrícula por Encargado
  const encargadosGridData = useMemo(() => {
    const selMes = (formatMonthName(filterMes) || filterMes).trim().toUpperCase();

    const base = data.filter(item => {
      if (filterMes !== 'TODOS') {
        const itemMes = resolveRecordMonth(item);
        if (itemMes !== selMes) return false;
      }
      if (filterCd !== 'TODOS') {
        const itemCd = (item.cd || '').trim().toUpperCase();
        if (itemCd !== filterCd.trim().toUpperCase()) return false;
      }
      if (filterContratista !== 'TODOS') {
        const itemContratista = (item.contratista || '').trim().toUpperCase();
        if (itemContratista !== filterContratista.trim().toUpperCase()) return false;
      }
      if (filterEstado === 'REALIZADO' && !checkIsRealizado(item.validador)) return false;
      if (filterEstado === 'PENDIENTE' && checkIsRealizado(item.validador)) return false;
      return true;
    });

    const map = new Map<string, { total: number; pendientes: number; realizados: number }>();
    base.forEach(item => {
      const enc = item.encargado?.trim() || 'SIN ENCARGADO';
      if (!map.has(enc)) {
        map.set(enc, { total: 0, pendientes: 0, realizados: 0 });
      }
      const rec = map.get(enc)!;
      rec.total += 1;
      if (checkIsRealizado(item.validador)) {
        rec.realizados += 1;
      } else {
        rec.pendientes += 1;
      }
    });

    return Array.from(map.entries())
      .map(([encargado, info]) => ({
        encargado,
        total: info.total,
        pendientes: info.pendientes,
        realizados: info.realizados,
        porcentajeRealizado: info.total > 0 ? Math.round((info.realizados / info.total) * 100) : 0
      }))
      .sort((a, b) => b.pendientes - a.pendientes);
  }, [data, filterMes, filterCd, filterContratista, filterEstado]);

  const hasActiveFilters = filterMes !== 'TODOS' || 
    filterCd !== 'TODOS' || 
    filterContratista !== 'TODOS' || 
    filterEstado !== 'TODOS' || 
    filterEncargado !== 'TODOS' || 
    searchTerm.trim() !== '';

  const handleClearFilters = () => {
    setFilterMes('TODOS');
    setFilterCd('TODOS');
    setFilterContratista('TODOS');
    setFilterEstado('TODOS');
    setFilterEncargado('TODOS');
    setSearchTerm('');
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredData.length === 0) return;
    const headers = ['LLAVE', 'FECHA', 'MES', 'CD', 'CONTRATISTA', 'PLACA / MATRÍCULA', 'ESTADO', 'ENCARGADO'];
    const rows = filteredData.map(r => [
      `"${r.llave || ''}"`,
      `"${r.fecha || ''}"`,
      `"${r.mes || ''}"`,
      `"${r.cd || ''}"`,
      `"${r.contratista || ''}"`,
      `"${r.placa || ''}"`,
      `"${checkIsRealizado(r.validador) ? 'REALIZADO' : 'PENDIENTE'}"`,
      `"${r.encargado || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `seguimiento_flota_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Theme styling definitions
  const containerBg = isDarkTheme ? 'bg-[#121226] border-slate-800 text-slate-100' : 'bg-white border-slate-200/80 text-slate-800';
  const cardBg = isDarkTheme ? 'bg-[#1a1a2e] border-slate-800' : 'bg-slate-50/70 border-slate-200';
  const tableHeaderBg = isDarkTheme ? 'bg-[#18182c] border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700';
  const tableRowHover = isDarkTheme ? 'hover:bg-slate-800/40' : 'hover:bg-blue-50/30';
  const inputBg = isDarkTheme ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className={`p-6 rounded-3xl border ${containerBg} shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/10 text-indigo-600 rounded-2xl border border-indigo-500/20">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black italic uppercase tracking-tighter">
                Seguimiento de Inspección & Validación
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Matriz de seguimiento por Mes, CD, Contratista, Placa y Validador/Encargado
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {filterEstado !== 'TODOS' && (
            <button
              onClick={() => setFilterEstado('TODOS')}
              className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all border border-slate-300 dark:border-slate-700 flex items-center gap-1.5"
              title="Restablecer filtro de estado a TODOS"
            >
              <X size={14} />
              <span>Ver Todos ({multiGraphMetrics.total})</span>
            </button>
          )}

          <button
            onClick={loadData}
            disabled={loading}
            className={`p-2.5 rounded-2xl border transition-all flex items-center gap-2 text-xs font-bold ${
              isDarkTheme 
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Refrescar datos"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
          >
            <Download size={15} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SELECTOR RÁPIDO DE MESES */}
      {/* ============================================================ */}
      <div className={`p-4 rounded-3xl border ${containerBg} shadow-sm flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-wider">
            <Calendar size={14} />
            <span>Mes:</span>
          </div>

          <button
            onClick={() => setFilterMes('TODOS')}
            className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
              filterMes === 'TODOS'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 ring-2 ring-indigo-500'
                : isDarkTheme
                  ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            Todos ({data.length})
          </button>

          {uniqueMonths.map(m => {
            const count = data.filter(r => resolveRecordMonth(r) === m).length;
            const isSelected = (formatMonthName(filterMes) || filterMes).trim().toUpperCase() === m;
            return (
              <button
                key={m}
                onClick={() => setFilterMes(m)}
                className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 ring-2 ring-indigo-500'
                    : isDarkTheme
                      ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                <span>{m}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {filterMes !== 'TODOS' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">
              Mes activo: <strong className="text-indigo-600 dark:text-indigo-400">{filterMes}</strong> ({multiGraphMetrics.total} reg.)
            </span>
            <button
              onClick={() => setFilterMes('TODOS')}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Restablecer mes a TODOS"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* TARJETAS MULTIGRÁFICAS: PENDIENTES Y REALIZADOS (COMO EN LA HOJA) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ---------------- TARJETA MULTIGRÁFICA 1: PENDIENTES ---------------- */}
        <div 
          onClick={() => setFilterEstado(filterEstado === 'PENDIENTE' ? 'TODOS' : 'PENDIENTE')}
          className={`rounded-3xl border transition-all cursor-pointer shadow-sm p-6 relative overflow-hidden flex flex-col justify-between ${
            filterEstado === 'PENDIENTE'
              ? isDarkTheme 
                ? 'bg-amber-950/30 border-amber-500/80 ring-2 ring-amber-500 shadow-amber-900/20' 
                : 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400 shadow-amber-100'
              : containerBg
          } hover:border-amber-400/80`}
        >
          {/* Header de la tarjeta */}
          <div className="flex items-center justify-between gap-3 border-b pb-4 mb-4 border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-500/20">
                <Clock size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    ESTADO
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-white shadow-xs">
                    PENDIENTE
                  </span>
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">
                  Inspecciones Pendientes
                </h3>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-baseline gap-2 justify-end">
                <span className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                  {multiGraphMetrics.totalPendientes}
                </span>
                <span className="text-xs text-slate-400 font-bold">
                  / {multiGraphMetrics.total}
                </span>
              </div>
              <span className={`inline-block text-[11px] font-black px-2 py-0.5 rounded-lg mt-0.5 border ${
                isDarkTheme ? 'bg-amber-950/60 text-amber-300 border-amber-700/50' : 'bg-amber-100 text-amber-900 border-amber-200'
              }`}>
                {multiGraphMetrics.pctPendiente}% Pendiente
              </span>
            </div>
          </div>

          {/* Sub-gráficas de la tarjeta PENDIENTE */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Gráfica 1: Donut de proporción */}
            <div className="md:col-span-4 flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <PieIcon size={12} className="text-amber-500" />
                Proporción
              </span>
              <div className="w-full h-28 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Pendientes', value: multiGraphMetrics.totalPendientes },
                        { name: 'Realizados', value: multiGraphMetrics.totalRealizados }
                      ]}
                      innerRadius={32}
                      outerRadius={46}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      <Cell fill="#F59E0B" />
                      <Cell fill={isDarkTheme ? '#334155' : '#E2E8F0'} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                    {multiGraphMetrics.pctPendiente}%
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-bold mt-1">
                {multiGraphMetrics.totalPendientes} de {multiGraphMetrics.total} pendientes
              </span>
            </div>

            {/* Gráfica 2: Barras de Pendientes por Centro (CD) */}
            <div className="md:col-span-8 flex flex-col p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 h-full justify-between">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <BarChart3 size={12} className="text-amber-500" />
                  Pendientes por Centro (CD)
                </span>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  Total CD
                </span>
              </div>
              <div className="w-full h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={multiGraphMetrics.cdList} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis 
                      dataKey="cd" 
                      tick={{ fill: isDarkTheme ? '#94A3B8' : '#64748B', fontSize: 10, fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: isDarkTheme ? '#94A3B8' : '#64748B', fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{
                        backgroundColor: isDarkTheme ? '#1e1e38' : '#ffffff',
                        borderColor: isDarkTheme ? '#334155' : '#e2e8f0',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}
                      formatter={(val: any) => [`${val} pendientes`, 'Pendientes']}
                    />
                    <Bar dataKey="pendientes" fill="#F59E0B" radius={[6, 6, 0, 0]} barSize={34} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Gráfica 3 / Breakdown: Desglose por Contratistas */}
          <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
              Concentración de Pendientes por Contratista (Top)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {multiGraphMetrics.contList.map(cont => {
                const pct = cont.total > 0 ? Math.round((cont.pendientes / cont.total) * 100) : 0;
                return (
                  <div key={cont.contratista} className="p-2 rounded-xl bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate" title={cont.contratista}>
                      {cont.contratista}
                    </p>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400">{cont.pendientes}</span>
                      <span className="text-[9px] font-bold text-slate-400">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Card click hint & interactive button */}
          <div className="mt-4 pt-2 flex items-center justify-between gap-2 text-[11px] font-bold text-amber-600 dark:text-amber-400">
            <span className="flex items-center gap-1.5 truncate">
              {filterEstado === 'PENDIENTE' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                  <span>Filtrando tabla por PENDIENTES</span>
                </>
              ) : (
                <span>Clic para filtrar tabla por PENDIENTES</span>
              )}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFilterEstado(filterEstado === 'PENDIENTE' ? 'TODOS' : 'PENDIENTE');
              }}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 shadow-xs active:scale-95 ${
                filterEstado === 'PENDIENTE'
                  ? 'bg-amber-500 text-white shadow-amber-500/30'
                  : 'bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
              }`}
            >
              {filterEstado === 'PENDIENTE' ? '✓ Activo (Quitar)' : 'Filtrar Pendientes'}
            </button>
          </div>
        </div>

        {/* ---------------- TARJETA MULTIGRÁFICA 2: REALIZADOS ---------------- */}
        <div 
          onClick={() => setFilterEstado(filterEstado === 'REALIZADO' ? 'TODOS' : 'REALIZADO')}
          className={`rounded-3xl border transition-all cursor-pointer shadow-sm p-6 relative overflow-hidden flex flex-col justify-between ${
            filterEstado === 'REALIZADO'
              ? isDarkTheme 
                ? 'bg-emerald-950/30 border-emerald-500/80 ring-2 ring-emerald-500 shadow-emerald-900/20' 
                : 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-400 shadow-emerald-100'
              : containerBg
          } hover:border-emerald-400/80`}
        >
          {/* Header de la tarjeta */}
          <div className="flex items-center justify-between gap-3 border-b pb-4 mb-4 border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-500/20">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    ESTADO
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-600 text-white shadow-xs">
                    REALIZADO
                  </span>
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">
                  Inspecciones Validadas
                </h3>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-baseline gap-2 justify-end">
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {multiGraphMetrics.totalRealizados}
                </span>
                <span className="text-xs text-slate-400 font-bold">
                  / {multiGraphMetrics.total}
                </span>
              </div>
              <span className={`inline-block text-[11px] font-black px-2 py-0.5 rounded-lg mt-0.5 border ${
                isDarkTheme ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50' : 'bg-emerald-100 text-emerald-900 border-emerald-200'
              }`}>
                {multiGraphMetrics.pctRealizado}% Cumplimiento
              </span>
            </div>
          </div>

          {/* Sub-gráficas de la tarjeta REALIZADO */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Gráfica 1: Donut de proporción */}
            <div className="md:col-span-4 flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <PieIcon size={12} className="text-emerald-500" />
                Cumplimiento
              </span>
              <div className="w-full h-28 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Realizados', value: multiGraphMetrics.totalRealizados },
                        { name: 'Pendientes', value: multiGraphMetrics.totalPendientes }
                      ]}
                      innerRadius={32}
                      outerRadius={46}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      <Cell fill="#10B981" />
                      <Cell fill={isDarkTheme ? '#334155' : '#E2E8F0'} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {multiGraphMetrics.pctRealizado}%
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-bold mt-1">
                {multiGraphMetrics.totalRealizados} de {multiGraphMetrics.total} completadas
              </span>
            </div>

            {/* Gráfica 2: Barras de Realizados por Centro (CD) */}
            <div className="md:col-span-8 flex flex-col p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 h-full justify-between">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <BarChart3 size={12} className="text-emerald-500" />
                  Realizados por Centro (CD)
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  Total CD
                </span>
              </div>
              <div className="w-full h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={multiGraphMetrics.cdList} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis 
                      dataKey="cd" 
                      tick={{ fill: isDarkTheme ? '#94A3B8' : '#64748B', fontSize: 10, fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: isDarkTheme ? '#94A3B8' : '#64748B', fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{
                        backgroundColor: isDarkTheme ? '#1e1e38' : '#ffffff',
                        borderColor: isDarkTheme ? '#334155' : '#e2e8f0',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}
                      formatter={(val: any) => [`${val} realizados`, 'Realizados']}
                    />
                    <Bar dataKey="realizados" fill="#10B981" radius={[6, 6, 0, 0]} barSize={34} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Gráfica 3 / Breakdown: Desglose por Contratistas */}
          <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
              Validaciones Realizadas por Contratista (Top)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {multiGraphMetrics.contList.map(cont => {
                const pct = cont.total > 0 ? Math.round((cont.realizados / cont.total) * 100) : 0;
                return (
                  <div key={cont.contratista} className="p-2 rounded-xl bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate" title={cont.contratista}>
                      {cont.contratista}
                    </p>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{cont.realizados}</span>
                      <span className="text-[9px] font-bold text-slate-400">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Card click hint & interactive button */}
          <div className="mt-4 pt-2 flex items-center justify-between gap-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <span className="flex items-center gap-1.5 truncate">
              {filterEstado === 'REALIZADO' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                  <span>Filtrando tabla por REALIZADOS</span>
                </>
              ) : (
                <span>Clic para filtrar tabla por REALIZADOS</span>
              )}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFilterEstado(filterEstado === 'REALIZADO' ? 'TODOS' : 'REALIZADO');
              }}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 shadow-xs active:scale-95 ${
                filterEstado === 'REALIZADO'
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                  : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
              }`}
            >
              {filterEstado === 'REALIZADO' ? '✓ Activo (Quitar)' : 'Filtrar Realizados'}
            </button>
          </div>
        </div>

      </div>

      {/* FILTROS PRIMERO: Barra de Filtros interactiva que mueve y filtra la tabla en tiempo real */}
      <div className={`p-5 rounded-3xl border ${containerBg} shadow-sm space-y-4`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-slate-500">
            <Filter size={15} className="text-indigo-600" />
            <span>Filtros de Búsqueda</span>
            {hasActiveFilters && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                Filtros activos
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={() => setShowEncargadosGrid(!showEncargadosGrid)}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                showEncargadosGrid
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : isDarkTheme ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <User size={13} />
              <span>{showEncargadosGrid ? 'Ocultar Desglose Encargados' : 'Desglose por Encargado'}</span>
              {showEncargadosGrid ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-400 text-[11px] font-bold hover:bg-rose-100 transition-all flex items-center gap-1.5"
                title="Restablecer todos los filtros"
              >
                <X size={13} />
                <span>Limpiar Filtros</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Búsqueda general */}
          <div className="relative lg:col-span-1 sm:col-span-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar placa, estado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
            />
          </div>

          {/* Mes */}
          <div>
            <select
              value={filterMes}
              onChange={(e) => setFilterMes(e.target.value)}
              className={`w-full p-2 text-xs font-medium rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
            >
              <option value="TODOS">Mes: Todos</option>
              {uniqueMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* CD */}
          <div>
            <select
              value={filterCd}
              onChange={(e) => setFilterCd(e.target.value)}
              className={`w-full p-2 text-xs font-medium rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
            >
              <option value="TODOS">CD: Todos</option>
              {uniqueCds.map(cd => (
                <option key={cd} value={cd}>{cd}</option>
              ))}
            </select>
          </div>

          {/* Contratista */}
          <div>
            <select
              value={filterContratista}
              onChange={(e) => setFilterContratista(e.target.value)}
              className={`w-full p-2 text-xs font-medium rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
            >
              <option value="TODOS">Contratista: Todos</option>
              {uniqueContratistas.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Estado: PENDIENTE o REALIZADO */}
          <div>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value as any)}
              className={`w-full p-2 text-xs font-medium rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
            >
              <option value="TODOS">Estado: Todos</option>
              <option value="REALIZADO">REALIZADO</option>
              <option value="PENDIENTE">PENDIENTE</option>
            </select>
          </div>

          {/* Encargado */}
          <div>
            <select
              value={filterEncargado}
              onChange={(e) => setFilterEncargado(e.target.value)}
              className={`w-full p-2 text-xs font-medium rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
            >
              <option value="TODOS">Encargado: Todos</option>
              {uniqueEncargados.map(enc => (
                <option key={enc} value={enc}>{enc}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Desglose por Encargado (Opcional / Desplegable) */}
      {showEncargadosGrid && (
        <div className={`p-5 rounded-3xl border ${containerBg} shadow-sm space-y-3 animate-in fade-in duration-200`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-slate-400">
              <User size={15} className="text-indigo-500" />
              <span>Pendientes y Realizados por Encargado</span>
            </div>
            {filterEncargado !== 'TODOS' && (
              <button
                onClick={() => setFilterEncargado('TODOS')}
                className="text-[10px] font-bold text-indigo-500 hover:underline uppercase"
              >
                Ver Todos los Encargados
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {encargadosGridData.map((item) => {
              const isSelected = filterEncargado === item.encargado;
              const hasPending = item.pendientes > 0;
              return (
                <div
                  key={item.encargado}
                  onClick={() => setFilterEncargado(isSelected ? 'TODOS' : item.encargado)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? isDarkTheme 
                        ? 'bg-indigo-950/40 border-indigo-500 shadow-md ring-1 ring-indigo-500' 
                        : 'bg-indigo-50/80 border-indigo-300 shadow-sm ring-1 ring-indigo-400'
                      : cardBg
                  } hover:border-indigo-400/50`}
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="font-extrabold text-xs truncate" title={item.encargado}>
                      {item.encargado}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                      hasPending
                        ? isDarkTheme ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-amber-100 text-amber-800 border border-amber-300'
                        : isDarkTheme ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      {item.pendientes} {hasPending ? 'Pend.' : 'Ok'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                      <span>Realizados: <strong className={isDarkTheme ? 'text-slate-200' : 'text-slate-700'}>{item.realizados}</strong> / {item.total}</span>
                      <span>{item.porcentajeRealizado}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${hasPending ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${item.porcentajeRealizado}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Barra de Filtro Rápido y Prioridad de Estado */}
      <div className={`p-4 rounded-3xl border ${containerBg} shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mr-1">
            <Filter size={13} className="text-indigo-500" />
            Filtrar Estado:
          </span>

          <button
            type="button"
            onClick={() => setFilterEstado('TODOS')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95 ${
              filterEstado === 'TODOS'
                ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-md'
                : isDarkTheme ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Mostrar Todos</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/10 dark:bg-white/20">
              {multiGraphMetrics.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterEstado('REALIZADO')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95 ${
              filterEstado === 'REALIZADO'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400'
                : isDarkTheme ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/40' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 size={14} />
            <span>Realizados</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600/20 text-current">
              {multiGraphMetrics.totalRealizados}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterEstado('PENDIENTE')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95 ${
              filterEstado === 'PENDIENTE'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-400'
                : isDarkTheme ? 'bg-amber-950/40 text-amber-300 border border-amber-800 hover:bg-amber-900/40' : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Clock size={14} />
            <span>Pendientes</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-current">
              {multiGraphMetrics.totalPendientes}
            </span>
          </button>
        </div>

        {/* Prioridad / Orden en la tabla */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
            Orden en tabla:
          </span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className={`p-2 px-3 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
          >
            <option value="REALIZADOS_PRIMERO">✓ Realizados Primero</option>
            <option value="PENDIENTES_PRIMERO">⏳ Pendientes Primero</option>
            <option value="ORIGINAL">📄 Orden Original</option>
          </select>
        </div>
      </div>

      {/* Tabla de Seguimiento: responde dinámicamente a todos los filtros */}
      <div className={`rounded-3xl border ${containerBg} shadow-sm overflow-hidden`}>
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw size={28} className="animate-spin mx-auto text-indigo-500" />
            <p className="text-xs font-bold uppercase tracking-wider">Cargando registros de seguimiento...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <FileText size={32} className="mx-auto text-slate-300" />
            <p className="text-sm font-bold">No se encontraron registros con los filtros seleccionados</p>
            <p className="text-xs text-slate-400">Prueba ajustando o limpiando los filtros de búsqueda</p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm inline-flex items-center gap-1.5"
              >
                <X size={13} />
                <span>Restablecer Filtros</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b ${tableHeaderBg} text-[10px] font-black uppercase tracking-wider`}>
                  <th className="p-3 pl-5"># / Llave</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Mes</th>
                  <th className="p-3">CD</th>
                  <th className="p-3">Contratista</th>
                  <th className="p-3">Placa / Matrícula</th>
                  <th 
                    onClick={() => setSortOrder(sortOrder === 'REALIZADOS_PRIMERO' ? 'PENDIENTES_PRIMERO' : 'REALIZADOS_PRIMERO')}
                    className="p-3 cursor-pointer hover:text-indigo-500 select-none transition-colors"
                    title="Clic para cambiar orden: Realizados o Pendientes primero"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Estado</span>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {sortOrder === 'REALIZADOS_PRIMERO' ? '✓ Realizados 1°' : sortOrder === 'PENDIENTES_PRIMERO' ? '⏳ Pendientes 1°' : '↕'}
                      </span>
                    </div>
                  </th>
                  <th className="p-3 pr-5">Encargado</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkTheme ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {filteredData.map((item, idx) => {
                  const isRealizado = checkIsRealizado(item.validador);
                  return (
                    <tr key={item.id || idx} className={`transition-colors ${tableRowHover}`}>
                      <td className="p-3 pl-5 font-mono text-[11px] text-slate-400">
                        {item.llave || `${idx + 1}`}
                      </td>
                      <td className="p-3 font-medium text-slate-500">
                        {item.fecha || '-'}
                      </td>
                      <td className="p-3 font-bold text-indigo-600 uppercase">
                        {item.mes || '-'}
                      </td>
                      <td className="p-3 font-semibold">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          isDarkTheme ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
                        }`}>
                          <Building2 size={11} className="text-slate-400" />
                          {item.cd}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-600">
                        {item.contratista || '-'}
                      </td>
                      <td className="p-3">
                        <span className={`inline-block font-mono font-black text-xs px-2.5 py-1 rounded-lg border tracking-wider shadow-xs ${
                          isDarkTheme 
                            ? 'bg-amber-400/15 text-amber-300 border-amber-500/30' 
                            : 'bg-amber-100/90 text-amber-950 border-amber-300/80'
                        }`}>
                          {item.placa}
                        </span>
                      </td>
                      <td className="p-3">
                        {isRealizado ? (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${
                            isDarkTheme 
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            <CheckCircle2 size={12} className={isDarkTheme ? 'text-emerald-400' : 'text-emerald-600'} />
                            REALIZADO
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${
                            isDarkTheme 
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            <Clock size={12} className={isDarkTheme ? 'text-amber-400' : 'text-amber-600'} />
                            PENDIENTE
                          </span>
                        )}
                      </td>
                      <td className="p-3 pr-5 font-bold text-slate-700 dark:text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <User size={13} className="text-slate-400" />
                          <span>{item.encargado || '-'}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className={`p-4 border-t ${isDarkTheme ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'} text-xs flex justify-between items-center`}>
          <span>
            Mostrando <strong className={isDarkTheme ? 'text-white' : 'text-slate-800'}>{filteredData.length}</strong> de <strong className={isDarkTheme ? 'text-white' : 'text-slate-800'}>{data.length}</strong> registros
          </span>
          {hasActiveFilters && (
            <span className="text-[11px] font-semibold text-indigo-500">
              Vista filtrada
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
