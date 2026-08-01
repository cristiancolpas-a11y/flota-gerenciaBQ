import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Filter, Download, RefreshCw, Truck, UserCheck, Calendar, 
  Building2, ShieldCheck, CheckCircle2, Clock, User, FileText, ChevronRight
} from 'lucide-react';
import { FleetSeguimientoRecord } from '../types';
import { fetchSeguimientoFromSheet, formatMonthName } from '../services/sheetService';

interface FleetSeguimientoTabProps {
  isDarkTheme?: boolean;
}

export const FleetSeguimientoTab: React.FC<FleetSeguimientoTabProps> = ({ isDarkTheme = false }) => {
  const [data, setData] = useState<FleetSeguimientoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [filterMes, setFilterMes] = useState('TODOS');
  const [filterCd, setFilterCd] = useState('TODOS');
  const [filterContratista, setFilterContratista] = useState('TODOS');
  const [filterValidador, setFilterValidador] = useState('TODOS');
  const [filterEncargado, setFilterEncargado] = useState('TODOS');

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

  // Filter options
  const uniqueMonths = useMemo(() => {
    const monthOrder = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    const set = new Set<string>();
    data.forEach(r => {
      const formatted = formatMonthName(r.mes);
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
    data.forEach(r => r.cd && set.add(r.cd.trim().toUpperCase()));
    return Array.from(set).sort();
  }, [data]);

  const uniqueContratistas = useMemo(() => {
    const set = new Set<string>();
    data.forEach(r => r.contratista && set.add(r.contratista.trim()));
    return Array.from(set).sort();
  }, [data]);

  const uniqueEncargados = useMemo(() => {
    const set = new Set<string>();
    data.forEach(r => r.encargado && set.add(r.encargado.trim()));
    return Array.from(set).sort();
  }, [data]);

  // Helper for status check: >= 1 is REALIZADO, 0 is PENDIENTE
  const checkIsRealizado = (val: string | number | undefined | null): boolean => {
    if (!val) return false;
    const cleaned = String(val).trim();
    if (cleaned === '0' || cleaned === '') return false;
    const num = parseFloat(cleaned.replace(',', '.'));
    if (!isNaN(num)) {
      return num >= 1;
    }
    return true;
  };

  // Base data for Encargados grid (excludes filterEncargado so all cards stay visible for selection)
  const baseDataForEncargadosGrid = useMemo(() => {
    return data.filter(item => {
      const itemMesFormatted = formatMonthName(item.mes);
      if (filterMes !== 'TODOS' && itemMesFormatted !== filterMes) return false;
      if (filterCd !== 'TODOS' && item.cd?.toUpperCase() !== filterCd) return false;
      if (filterContratista !== 'TODOS' && item.contratista !== filterContratista) return false;
      
      if (filterValidador === 'VALIDADO' && !checkIsRealizado(item.validador)) return false;
      if (filterValidador === 'PENDIENTE' && checkIsRealizado(item.validador)) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesPlaca = item.placa?.toLowerCase().includes(query);
        const matchesEncargado = item.encargado?.toLowerCase().includes(query);
        const matchesValidador = item.validador?.toLowerCase().includes(query);
        const matchesContratista = item.contratista?.toLowerCase().includes(query);
        const matchesLlave = item.llave?.toLowerCase().includes(query);
        const matchesCd = item.cd?.toLowerCase().includes(query);
        if (!matchesPlaca && !matchesEncargado && !matchesValidador && !matchesContratista && !matchesLlave && !matchesCd) {
          return false;
        }
      }
      return true;
    });
  }, [data, filterMes, filterCd, filterContratista, filterValidador, searchTerm]);

  // Cuadrícula por Encargado: pendientes por encargado (computado sobre baseDataForEncargadosGrid)
  const encargadosGridData = useMemo(() => {
    const map = new Map<string, { total: number; pendientes: number; realizados: number }>();
    
    baseDataForEncargadosGrid.forEach(item => {
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
  }, [baseDataForEncargadosGrid]);

  // Final filtered dataset for KPIs and table
  const filteredData = useMemo(() => {
    if (filterEncargado === 'TODOS') return baseDataForEncargadosGrid;
    return baseDataForEncargadosGrid.filter(item => {
      const enc = item.encargado?.trim() || 'SIN ENCARGADO';
      return enc === filterEncargado;
    });
  }, [baseDataForEncargadosGrid, filterEncargado]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = filteredData.length;
    const uniquePlacas = new Set(filteredData.map(d => d.placa).filter(Boolean)).size;
    const validados = filteredData.filter(d => checkIsRealizado(d.validador)).length;
    const pendientes = total - validados;
    const porcentajeValidado = total > 0 ? Math.round((validados / total) * 100) : 0;

    return { total, uniquePlacas, validados, pendientes, porcentajeValidado };
  }, [filteredData]);

  // CSV Export
  const handleExportCSV = () => {
    if (filteredData.length === 0) return;
    const headers = ['LLAVE', 'FECHA', 'MES', 'CD', 'CONTRATISTA', 'PLACA / MATRÍCULA', 'VALIDADOR', 'ENCARGADO'];
    const rows = filteredData.map(r => [
      `"${r.llave || ''}"`,
      `"${r.fecha || ''}"`,
      `"${r.mes || ''}"`,
      `"${r.cd || ''}"`,
      `"${r.contratista || ''}"`,
      `"${r.placa || ''}"`,
      `"${r.validador || ''}"`,
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

        <div className="flex items-center gap-3 w-full md:w-auto">
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-5 rounded-3xl border ${containerBg} shadow-sm flex items-center gap-4`}>
          <div className="p-3 bg-blue-500/10 text-blue-600 rounded-2xl">
            <FileText size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Registros</p>
            <p className="text-2xl font-black">{stats.total}</p>
          </div>
        </div>

        <div className={`p-5 rounded-3xl border ${containerBg} shadow-sm flex items-center gap-4`}>
          <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-2xl">
            <Truck size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Placas Únicas</p>
            <p className="text-2xl font-black">{stats.uniquePlacas}</p>
          </div>
        </div>

        <div className={`p-5 rounded-3xl border ${containerBg} shadow-sm flex items-center gap-4`}>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl">
            <UserCheck size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Realizados (≥1)</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-emerald-600">{stats.validados}</p>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                {stats.porcentajeValidado}%
              </span>
            </div>
          </div>
        </div>

        <div className={`p-5 rounded-3xl border ${containerBg} shadow-sm flex items-center gap-4`}>
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendientes (0)</p>
            <p className="text-2xl font-black text-amber-600">{stats.pendientes}</p>
          </div>
        </div>
      </div>

      {/* Encargados Pending Grid */}
      <div className={`p-5 rounded-3xl border ${containerBg} shadow-sm space-y-3`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-slate-400">
            <User size={15} className="text-indigo-500" />
            <span>Pendientes por Encargado</span>
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

      {/* Filters Bar */}
      <div className={`p-5 rounded-3xl border ${containerBg} shadow-sm space-y-4`}>
        <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-500">
          <Filter size={14} />
          <span>Filtros de Búsqueda</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Búsqueda general */}
          <div className="relative lg:col-span-1 sm:col-span-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar placa, encargado, estado..."
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

          {/* Estado (antes Validador) */}
          <div>
            <select
              value={filterValidador}
              onChange={(e) => setFilterValidador(e.target.value)}
              className={`w-full p-2 text-xs font-medium rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
            >
              <option value="TODOS">Estado: Todos</option>
              <option value="VALIDADO">REALIZADO (≥1)</option>
              <option value="PENDIENTE">PENDIENTE (0)</option>
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

      {/* Table Section */}
      <div className={`rounded-3xl border ${containerBg} shadow-sm overflow-hidden`}>
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw size={28} className="animate-spin mx-auto text-indigo-500" />
            <p className="text-xs font-bold uppercase tracking-wider">Cargando registros de seguimiento...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <FileText size={32} className="mx-auto text-slate-300" />
            <p className="text-sm font-bold">No se encontraron registros de seguimiento</p>
            <p className="text-xs text-slate-400">Intenta ajustar los filtros de búsqueda</p>
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
                  <th className="p-3">Estado</th>
                  <th className="p-3 pr-5">Encargado</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkTheme ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {filteredData.map((item, idx) => {
                  const isValidated = checkIsRealizado(item.validador);
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
                        {isValidated ? (
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
                      <td className="p-3 pr-5 font-bold text-slate-700">
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
          <span>Mostrando <strong className={isDarkTheme ? 'text-white' : 'text-slate-800'}>{filteredData.length}</strong> de <strong className={isDarkTheme ? 'text-white' : 'text-slate-800'}>{data.length}</strong> registros</span>
          <span className="text-[10px] uppercase font-bold text-slate-400">Hoja: SEGUIMIENTO</span>
        </div>
      </div>
    </div>
  );
};
