import React, { useState, useMemo } from 'react';
import { FuelPerformance } from '../types';
import { 
  Search, Filter, Fuel, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, Download, RefreshCw, AlertCircle,
  Building2, Calendar, Truck, DollarSign, Gauge, X, Layers
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, LabelList, ReferenceLine
} from 'recharts';

/**
 * Semáforo de rendimiento (umbral provisional, ajustable).
 * El usuario dará las metas reales después.
 * rendimiento >= 12  → VERDE (bueno)
 * 10 a 11.99         → AMARILLO (medio)
 * < 10               → ROJO (bajo rendimiento / alerta)
 */
export const META_RENDIMIENTO = { 
  bueno: 12, 
  medio: 10 
}; // km/galón

/**
 * Cálculo del promedio de rendimiento idéntico a Excel / Google Sheets:
 * - INCLUIR solo los registros con rendimiento > 0.
 * - EXCLUIR (ignorar) los registros con rendimiento 0, vacío o no numérico.
 */
export const promedioRendimiento = (registros: FuelPerformance[]): number => {
  const conDato = registros.filter(r => r.rendimiento && r.rendimiento > 0);
  if (conDato.length === 0) return 0;
  const suma = conDato.reduce((acc, r) => acc + r.rendimiento, 0);
  return suma / conDato.length;
};

export const getRendimientoStatus = (rendimiento: number) => {
  if (!rendimiento || rendimiento <= 0) {
    return {
      key: 'sin_dato' as const,
      label: 'Sin dato',
      color: '#94A3B8',
      bgColor: 'bg-slate-50',
      textColor: 'text-slate-500',
      borderColor: 'border-slate-200',
      badgeClass: 'bg-slate-100 text-slate-500 border-slate-200 font-normal',
      dotClass: 'bg-slate-400'
    };
  }
  if (rendimiento >= META_RENDIMIENTO.bueno) {
    return {
      key: 'bueno' as const,
      label: 'Buen Rendimiento',
      color: '#16A34A',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
      dotClass: 'bg-emerald-500'
    };
  }
  if (rendimiento >= META_RENDIMIENTO.medio) {
    return {
      key: 'medio' as const,
      label: 'Rendimiento Medio',
      color: '#F2B705',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-200',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 font-semibold',
      dotClass: 'bg-amber-500'
    };
  }
  return {
    key: 'bajo' as const,
    label: 'Bajo Rendimiento',
    color: '#DC2626',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-200',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
    dotClass: 'bg-rose-500'
  };
};

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(val || 0);
};

const formatShortCurrency = (val: number): string => {
  if (val >= 1_000_000) {
    return `$${(val / 1_000_000).toFixed(1)}M`;
  }
  if (val >= 1_000) {
    return `$${(val / 1_000).toFixed(0)}K`;
  }
  return formatCurrency(val);
};

const formatNumber = (val: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(val || 0);
};

interface FuelPerformanceModuleProps {
  fuelData: FuelPerformance[];
  onRefresh?: () => Promise<void> | void;
  isSyncing?: boolean;
}

type SortField = 'rendimiento' | 'totalCostos' | 'kmRecorridos' | 'galones' | 'placa';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'bajo' | 'medio' | 'bueno' | 'sin_dato';
type RankingView = 'peores' | 'mejores' | 'top20';

const FuelPerformanceModule: React.FC<FuelPerformanceModuleProps> = ({ 
  fuelData = [],
  onRefresh,
  isSyncing = false
}) => {
  // Filtros
  const [selectedCd, setSelectedCd] = useState<string>('');
  const [selectedMes, setSelectedMes] = useState<string>('');
  const [selectedProveedor, setSelectedProveedor] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Ordenamiento & Paginación
  const [sortField, setSortField] = useState<SortField>('rendimiento');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc'); // Peores reales arriba por defecto
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  // Gráfica de Ranking
  const [rankingView, setRankingView] = useState<RankingView>('peores');

  // Listas únicas para filtros
  const cdOptions = useMemo(() => {
    const list = Array.from(new Set(fuelData.map(d => d.cd?.trim()).filter(Boolean)));
    return list.sort();
  }, [fuelData]);

  const mesOptions = useMemo(() => {
    const list = Array.from(new Set(fuelData.map(d => d.mes?.trim()).filter(Boolean)));
    return list.sort();
  }, [fuelData]);

  const proveedorOptions = useMemo(() => {
    const list = Array.from(new Set(fuelData.map(d => d.proveedor?.trim()).filter(Boolean)));
    return list.sort();
  }, [fuelData]);

  // Limpiar filtros
  const hasActiveFilters = Boolean(
    selectedCd || selectedMes || selectedProveedor || statusFilter !== 'all' || searchTerm
  );

  const clearFilters = () => {
    setSelectedCd('');
    setSelectedMes('');
    setSelectedProveedor('');
    setStatusFilter('all');
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Filtrado de datos
  const filteredData = useMemo(() => {
    return fuelData.filter(item => {
      if (selectedCd && item.cd?.trim().toUpperCase() !== selectedCd.toUpperCase()) return false;
      if (selectedMes && item.mes?.trim().toUpperCase() !== selectedMes.toUpperCase()) return false;
      if (selectedProveedor && item.proveedor?.trim().toUpperCase() !== selectedProveedor.toUpperCase()) return false;

      if (searchTerm) {
        const term = searchTerm.trim().toUpperCase();
        const matchesPlate = item.placa?.toUpperCase().includes(term);
        const matchesProv = item.proveedor?.toUpperCase().includes(term);
        const matchesCd = item.cd?.toUpperCase().includes(term);
        if (!matchesPlate && !matchesProv && !matchesCd) return false;
      }

      if (statusFilter !== 'all') {
        const itemStatus = getRendimientoStatus(item.rendimiento).key;
        if (itemStatus !== statusFilter) return false;
      }

      return true;
    });
  }, [fuelData, selectedCd, selectedMes, selectedProveedor, statusFilter, searchTerm]);

  // Datos ordenados para la tabla
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'placa') {
        comparison = (a.placa || '').localeCompare(b.placa || '');
      } else if (sortField === 'rendimiento') {
        const valA = a.rendimiento || 0;
        const valB = b.rendimiento || 0;
        if (sortOrder === 'asc') {
          // Mostrar los peores con dato real primero (ej. 8.02, 9.36), y los "Sin dato" al final
          if (valA <= 0 && valB > 0) return 1;
          if (valB <= 0 && valA > 0) return -1;
          comparison = valA - valB;
        } else {
          // Mostrar mejores primero, y los "Sin dato" al final
          if (valA <= 0 && valB > 0) return 1;
          if (valB <= 0 && valA > 0) return -1;
          comparison = valB - valA;
        }
        return comparison;
      } else {
        comparison = (a[sortField] || 0) - (b[sortField] || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortField, sortOrder]);

  // Paginación
  const totalPages = Math.ceil(sortedData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'rendimiento' ? 'asc' : 'desc');
    }
    setCurrentPage(1);
  };

  // Métricas Resumen
  const stats = useMemo(() => {
    const totalKm = filteredData.reduce((acc, curr) => acc + (curr.kmRecorridos || 0), 0);
    const totalGal = filteredData.reduce((acc, curr) => acc + (curr.galones || 0), 0);
    const totalCost = filteredData.reduce((acc, curr) => acc + (curr.totalCostos || 0), 0);

    // Promedio de rendimiento exactamente como en Excel (ignora ceros/vacíos)
    const avgRendimiento = promedioRendimiento(filteredData);

    // Registros con dato real vs sin dato
    const conDato = filteredData.filter(d => d.rendimiento && d.rendimiento > 0);
    const sinDatoCount = filteredData.length - conDato.length;

    // Conteo por estado de semáforo (SOLO se cuentan los vehículos con rendimiento > 0)
    const bajoCount = conDato.filter(d => d.rendimiento < META_RENDIMIENTO.medio).length;
    const medioCount = conDato.filter(d => d.rendimiento >= META_RENDIMIENTO.medio && d.rendimiento < META_RENDIMIENTO.bueno).length;
    const buenoCount = conDato.filter(d => d.rendimiento >= META_RENDIMIENTO.bueno).length;

    // Vehículos con bajo rendimiento críticos (excluyendo ceros/sin dato)
    const lowPerformanceVehicles = [...conDato]
      .filter(d => d.rendimiento < META_RENDIMIENTO.medio)
      .sort((a, b) => a.rendimiento - b.rendimiento);

    return {
      totalKm,
      totalGal,
      totalCost,
      avgRendimiento,
      conDatoCount: conDato.length,
      sinDatoCount,
      bajoCount,
      medioCount,
      buenoCount,
      lowPerformanceVehicles
    };
  }, [filteredData]);

  // Gráfica 1: Ranking de Vehículos (SOLO incluye vehículos con rendimiento > 0)
  const rankingChartData = useMemo(() => {
    const conDato = filteredData.filter(d => d.rendimiento && d.rendimiento > 0);
    const sorted = [...conDato].sort((a, b) => a.rendimiento - b.rendimiento);

    let sliced: FuelPerformance[] = [];
    if (rankingView === 'peores') {
      sliced = sorted.slice(0, 10);
    } else if (rankingView === 'mejores') {
      sliced = sorted.slice(-10).reverse();
    } else {
      sliced = sorted.slice(0, 20);
    }

    return sliced.map(d => ({
      placa: d.placa || 'S/P',
      rendimiento: Number((d.rendimiento || 0).toFixed(2)),
      cd: d.cd || '',
      proveedor: d.proveedor || '',
      mes: d.mes || '',
      costo: d.totalCostos || 0,
      color: getRendimientoStatus(d.rendimiento).color
    }));
  }, [filteredData, rankingView]);

  // Gráfica 2: Rendimiento Promedio por CD (cálculo Excel: solo rendimiento > 0)
  const cdChartData = useMemo(() => {
    const cdGroups: Record<string, FuelPerformance[]> = {};
    filteredData.forEach(d => {
      const cdName = d.cd?.trim() || 'Sin CD';
      if (!cdGroups[cdName]) cdGroups[cdName] = [];
      cdGroups[cdName].push(d);
    });

    return Object.entries(cdGroups).map(([cd, rows]) => {
      const rendimiento = Number(promedioRendimiento(rows).toFixed(2));
      const conDato = rows.filter(r => r.rendimiento && r.rendimiento > 0);
      return {
        cd,
        rendimiento,
        vehiculosConDato: conDato.length,
        totalVehiculos: rows.length,
        color: getRendimientoStatus(rendimiento).color
      };
    }).sort((a, b) => b.rendimiento - a.rendimiento);
  }, [filteredData]);

  // Gráfica 3: Evolución Mensual (cálculo Excel: solo rendimiento > 0)
  const monthlyChartData = useMemo(() => {
    const monthOrder = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    const monthGroups: Record<string, FuelPerformance[]> = {};

    filteredData.forEach(d => {
      const m = d.mes?.trim().toUpperCase() || 'S/M';
      if (!monthGroups[m]) monthGroups[m] = [];
      monthGroups[m].push(d);
    });

    return Object.entries(monthGroups).map(([mes, rows]) => {
      const rendimiento = Number(promedioRendimiento(rows).toFixed(2));
      const conDato = rows.filter(r => r.rendimiento && r.rendimiento > 0);
      const totalKm = rows.reduce((acc, r) => acc + (r.kmRecorridos || 0), 0);
      const totalGal = rows.reduce((acc, r) => acc + (r.galones || 0), 0);
      const totalCosto = rows.reduce((acc, r) => acc + (r.totalCostos || 0), 0);

      return {
        mes,
        rendimiento,
        vehiculosConDato: conDato.length,
        totalVehiculos: rows.length,
        km: Math.round(totalKm),
        galones: Math.round(totalGal),
        costo: totalCosto
      };
    })
    .filter(d => d.vehiculosConDato > 0) // Omitir meses que no tengan datos cargados para no desvirtuar la línea
    .sort((a, b) => {
      const idxA = monthOrder.indexOf(a.mes);
      const idxB = monthOrder.indexOf(b.mes);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.mes.localeCompare(b.mes);
    });
  }, [filteredData]);

  // Gráfica 4: Costo Total por CD
  const costCdChartData = useMemo(() => {
    const cdCost: Record<string, number> = {};
    filteredData.forEach(d => {
      const cdName = d.cd?.trim() || 'Sin CD';
      cdCost[cdName] = (cdCost[cdName] || 0) + (d.totalCostos || 0);
    });

    return Object.entries(cdCost).map(([cd, costo]) => ({
      cd,
      costo,
      costoFormatted: formatShortCurrency(costo)
    })).sort((a, b) => b.costo - a.costo);
  }, [filteredData]);

  // Exportar a CSV
  const handleExportCSV = () => {
    if (sortedData.length === 0) return;
    const headers = [
      'CD / UBICACIÓN',
      'PROVEEDOR',
      'PLACA',
      'FECHA INICIAL',
      'FECHA FINAL',
      'MES',
      'KM RECORRIDOS',
      'GALONES',
      'RENDIMIENTO (KM/GAL)',
      'ESTADO SEMÁFORO',
      'TOTAL COSTOS (COP)'
    ];

    const rows = sortedData.map(d => [
      `"${d.cd || ''}"`,
      `"${d.proveedor || ''}"`,
      `"${d.placa || ''}"`,
      `"${d.fechaInicial || ''}"`,
      `"${d.fechaFinal || ''}"`,
      `"${d.mes || ''}"`,
      d.kmRecorridos || 0,
      d.galones || 0,
      d.rendimiento && d.rendimiento > 0 ? d.rendimiento.toFixed(2) : 'Sin dato',
      `"${getRendimientoStatus(d.rendimiento).label}"`,
      Math.round(d.totalCostos || 0)
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rendimiento_combustible_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F1F3F5] text-slate-800 p-4 md:p-6 lg:p-8 space-y-6">
      {/* Encabezado Principal */}
      <header className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0D2B4E] text-white rounded-lg shadow-sm">
              <Fuel className="w-6 h-6 text-[#F2B705]" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#0D2B4E]">
                Seguimiento de Rendimiento de Combustible
              </h1>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                Control de km por galón por vehículo, análisis por centro y detección de bajo rendimiento (promedios con criterio Excel)
              </p>
            </div>
          </div>
        </div>

        {/* Acciones del encabezado */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Leyenda Semáforo */}
          <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
            <span className="font-semibold text-slate-700">Metas:</span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]"></span>
              Bueno (≥ {META_RENDIMIENTO.bueno})
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F2B705]"></span>
              Medio ({META_RENDIMIENTO.medio} - {META_RENDIMIENTO.bueno - 0.01})
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]"></span>
              Bajo (&lt; {META_RENDIMIENTO.medio})
            </span>
            <span className="inline-flex items-center gap-1 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
              Sin dato (excluido de promedios)
            </span>
          </div>

          {onRefresh && (
            <button
              onClick={() => onRefresh()}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition shadow-sm disabled:opacity-60"
              title="Actualizar datos desde la hoja"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#0D2B4E]' : ''}`} />
              <span>{isSyncing ? 'Actualizando...' : 'Recargar'}</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            disabled={sortedData.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#0D2B4E] rounded-lg hover:bg-[#091e36] active:bg-[#07172b] transition shadow-sm disabled:opacity-50"
            title="Descargar datos filtrados en formato CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#F2B705]" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </header>

      {/* Barra de Filtros */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#0D2B4E]">
            <Filter className="w-4 h-4 text-[#0D2B4E]" />
            <span>Filtros Operativos</span>
            <span className="text-xs font-normal text-slate-500">
              (Mostrando <strong className="text-slate-800 tabular-nums">{filteredData.length}</strong> registros:{' '}
              <strong className="text-emerald-700 tabular-nums">{stats.conDatoCount}</strong> con dato,{' '}
              <span className="text-slate-400 tabular-nums">{stats.sinDatoCount}</span> sin dato)
            </span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800 transition"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Buscador de placa */}
          <div className="relative">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Búsqueda por Placa
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="Ej. COGUQ878..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D2B4E] focus:bg-white transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filtro CD */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Centro de Distribución (CD)
            </label>
            <select
              value={selectedCd}
              onChange={e => { setSelectedCd(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D2B4E] focus:bg-white transition"
            >
              <option value="">Todos los Centros ({cdOptions.length})</option>
              {cdOptions.map(cd => (
                <option key={cd} value={cd}>{cd}</option>
              ))}
            </select>
          </div>

          {/* Filtro Mes */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Mes
            </label>
            <select
              value={selectedMes}
              onChange={e => { setSelectedMes(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D2B4E] focus:bg-white transition"
            >
              <option value="">Todos los Meses ({mesOptions.length})</option>
              {mesOptions.map(mes => (
                <option key={mes} value={mes}>{mes}</option>
              ))}
            </select>
          </div>

          {/* Filtro Proveedor */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Proveedor
            </label>
            <select
              value={selectedProveedor}
              onChange={e => { setSelectedProveedor(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D2B4E] focus:bg-white transition truncate"
            >
              <option value="">Todos los Proveedores ({proveedorOptions.length})</option>
              {proveedorOptions.map(prov => (
                <option key={prov} value={prov}>{prov}</option>
              ))}
            </select>
          </div>

          {/* Filtro Semáforo */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Semáforo de Rendimiento
            </label>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value as StatusFilter); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D2B4E] focus:bg-white transition font-medium"
            >
              <option value="all">Todos los Estados</option>
              <option value="bajo">🚨 Bajo Rendimiento (&gt; 0 y &lt; {META_RENDIMIENTO.medio})</option>
              <option value="medio">⚠️ Rendimiento Medio ({META_RENDIMIENTO.medio} - {META_RENDIMIENTO.bueno})</option>
              <option value="bueno">✅ Buen Rendimiento (≥ {META_RENDIMIENTO.bueno})</option>
              <option value="sin_dato">⚪ Sin Dato Cargado (0 o vacío)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Tarjetas Resumen (KPIs) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Rendimiento Promedio de Flota (Cálculo tipo Excel: ignora ceros) */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Rendimiento Promedio Flota
            </span>
            <div className="p-2 bg-slate-100 rounded-lg text-[#0D2B4E]">
              <Gauge className="w-5 h-5 text-[#0D2B4E]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-extrabold text-[#0D2B4E] tabular-nums">
                {stats.avgRendimiento > 0 ? stats.avgRendimiento.toFixed(2) : '—'}
              </span>
              <span className="text-xs font-medium text-slate-500">km / galón</span>
            </div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {stats.avgRendimiento > 0 && (
                <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${getRendimientoStatus(stats.avgRendimiento).badgeClass}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${getRendimientoStatus(stats.avgRendimiento).dotClass}`}></span>
                  {getRendimientoStatus(stats.avgRendimiento).label}
                </span>
              )}
              <span className="text-[11px] text-slate-400">
                Sobre {stats.conDatoCount} registros reales (ignora ceros)
              </span>
            </div>
          </div>
        </div>

        {/* Total Galones Consumidos */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Galones Consumidos
            </span>
            <div className="p-2 bg-amber-50 rounded-lg text-[#F2B705]">
              <Fuel className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-extrabold text-slate-900 tabular-nums">
                {formatNumber(stats.totalGal, 1)}
              </span>
              <span className="text-xs font-medium text-slate-500">GL</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {formatNumber(stats.totalKm)} km recorridos en total
            </p>
          </div>
        </div>

        {/* Costo Total de Combustible */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Costo Total Combustible
            </span>
            <div className="p-2 bg-blue-50 rounded-lg text-[#0D2B4E]">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-xl md:text-2xl font-extrabold text-slate-900 tabular-nums">
                {formatCurrency(stats.totalCost)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {stats.totalGal > 0 ? (
                <span>Promedio: <strong>{formatCurrency(stats.totalCost / stats.totalGal)}/gal</strong></span>
              ) : 'Sin consumo registrado'}
            </p>
          </div>
        </div>

        {/* Vehículos en Bajo Rendimiento (solo rendimiento > 0 y < META_RENDIMIENTO.medio) */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'bajo' ? 'all' : 'bajo')}
          className={`bg-white rounded-xl p-5 border transition cursor-pointer shadow-sm flex flex-col justify-between ${
            statusFilter === 'bajo' ? 'ring-2 ring-rose-500 border-rose-300' : 'border-slate-200 hover:border-rose-300'
          }`}
          title="Haga clic para aislar vehículos en bajo rendimiento"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Bajo Rendimiento
            </span>
            <div className="p-2 bg-rose-50 rounded-lg text-[#DC2626]">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-extrabold text-[#DC2626] tabular-nums">
                {stats.bajoCount}
              </span>
              <span className="text-xs font-medium text-slate-500">
                de {stats.conDatoCount} ({stats.conDatoCount > 0 ? ((stats.bajoCount / stats.conDatoCount) * 100).toFixed(0) : 0}%)
              </span>
            </div>
            <p className="text-[11px] text-rose-600 mt-2 font-medium">
              {statusFilter === 'bajo' ? 'Mostrando sólo alertas (clic para quitar)' : `Menor a ${META_RENDIMIENTO.medio} km/gal (excluye sin dato)`}
            </p>
          </div>
        </div>
      </section>

      {/* Sección de Alertas Destacadas si existen vehículos en ROJO */}
      {stats.lowPerformanceVehicles.length > 0 && statusFilter !== 'bajo' && (
        <section className="bg-rose-50 border border-rose-200 rounded-xl p-4 md:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-rose-600 text-white rounded-md">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-900">
                  Alertas de Rendimiento Crítico (&gt; 0 y &lt; {META_RENDIMIENTO.medio} km/gal)
                </h3>
                <p className="text-xs text-rose-700">
                  Se detectaron {stats.lowPerformanceVehicles.length} vehículos con consumo real y rendimiento bajo que requieren revisión operativa.
                </p>
              </div>
            </div>
            <button
              onClick={() => setStatusFilter('bajo')}
              className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-white border border-rose-300 rounded-lg hover:bg-rose-100 transition whitespace-nowrap self-start sm:self-auto"
            >
              Ver {stats.lowPerformanceVehicles.length} vehículos en tabla
            </button>
          </div>

          {/* Tarjetas rápidas con los casos más críticos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            {stats.lowPerformanceVehicles.slice(0, 4).map((veh, idx) => (
              <div 
                key={`${veh.placa}-${idx}`}
                className="bg-white p-3 rounded-lg border border-rose-200 shadow-2xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900 text-sm">{veh.placa}</span>
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    {veh.rendimiento.toFixed(2)} km/gl
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-2 space-y-0.5">
                  <div className="flex justify-between">
                    <span>CD:</span>
                    <strong className="text-slate-700">{veh.cd}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Km / Gal:</span>
                    <span className="tabular-nums">{formatNumber(veh.kmRecorridos)} km / {formatNumber(veh.galones, 1)} gl</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Costo:</span>
                    <strong className="text-slate-800">{formatCurrency(veh.totalCostos)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Gráficas Principales */}
      {filteredData.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-slate-200 text-center shadow-sm">
          <Fuel className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">Sin datos de rendimiento de combustible</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            No se encontraron registros con los filtros seleccionados o la hoja de cálculo se encuentra vacía.
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 text-xs font-semibold text-[#0D2B4E] bg-slate-100 rounded-lg hover:bg-slate-200 transition"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfica 1: Ranking de Vehículos por Rendimiento (Solo rendimiento > 0) */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0D2B4E] flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#0D2B4E]" />
                  Ranking de Vehículos (km/gal)
                </h3>
                <p className="text-xs text-slate-500">
                  Vehículos con rendimiento real (excluye registros sin dato o 0)
                </p>
              </div>

              {/* Selector de vista: Peores / Mejores / Top 20 */}
              <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-medium self-start sm:self-auto">
                <button
                  onClick={() => setRankingView('peores')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    rankingView === 'peores'
                      ? 'bg-rose-600 text-white shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  10 Peores (Alerta)
                </button>
                <button
                  onClick={() => setRankingView('mejores')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    rankingView === 'mejores'
                      ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  10 Mejores
                </button>
                <button
                  onClick={() => setRankingView('top20')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    rankingView === 'top20'
                      ? 'bg-[#0D2B4E] text-white shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Primeros 20
                </button>
              </div>
            </div>

            {rankingChartData.length === 0 ? (
              <div className="h-[320px] flex items-center justify-center text-xs text-slate-400">
                No hay vehículos con rendimiento &gt; 0 para mostrar en el ranking.
              </div>
            ) : (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={rankingChartData}
                    layout="vertical"
                    margin={{ top: 10, right: 35, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                    <XAxis 
                      type="number" 
                      domain={[0, (dataMax: number) => Math.max(dataMax + 2, 16)]}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      unit=" km/gl"
                    />
                    <YAxis 
                      type="category" 
                      dataKey="placa" 
                      tick={{ fontSize: 11, fill: '#1E293B', fontWeight: 600 }}
                      width={75}
                    />
                    <Tooltip
                      formatter={(val: any) => [`${Number(val).toFixed(2)} km/galón`, 'Rendimiento']}
                      labelFormatter={(label, payload) => {
                        const item = payload?.[0]?.payload;
                        return `${label} (${item?.cd || ''} - ${item?.mes || ''})`;
                      }}
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <ReferenceLine 
                      x={META_RENDIMIENTO.medio} 
                      stroke="#F2B705" 
                      strokeDasharray="4 4" 
                      label={{ value: `Mín: ${META_RENDIMIENTO.medio}`, position: 'top', fill: '#B45309', fontSize: 10 }} 
                    />
                    <ReferenceLine 
                      x={META_RENDIMIENTO.bueno} 
                      stroke="#16A34A" 
                      strokeDasharray="4 4" 
                      label={{ value: `Meta: ${META_RENDIMIENTO.bueno}`, position: 'top', fill: '#15803D', fontSize: 10 }} 
                    />
                    <Bar dataKey="rendimiento" radius={[0, 4, 4, 0]} barSize={18}>
                      {rankingChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                      <LabelList 
                        dataKey="rendimiento" 
                        position="right" 
                        style={{ fontSize: '11px', fontWeight: 600, fill: '#334155' }}
                        formatter={(val: any) => `${Number(val).toFixed(2)}`}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
              <span>* Barras coloreadas según semáforo de desempeño</span>
              <span className="font-medium text-slate-700">{rankingChartData.length} vehículos mostrados</span>
            </div>
          </div>

          {/* Gráfica 2: Rendimiento Promedio por CD (cálculo Excel: solo rendimiento > 0) */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-[#0D2B4E] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#0D2B4E]" />
                Rendimiento Promedio por Centro de Distribución
              </h3>
              <p className="text-xs text-slate-500">
                Promedio de km/gal calculado como en Excel (solo registros con rendimiento &gt; 0)
              </p>
            </div>

            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={cdChartData}
                  margin={{ top: 25, right: 20, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="cd" 
                    tick={{ fontSize: 11, fill: '#1E293B', fontWeight: 600 }}
                  />
                  <YAxis 
                    domain={[0, (dataMax: number) => Math.max(Math.ceil(dataMax + 2), 16)]}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    unit=" km/gl"
                  />
                  <Tooltip
                    formatter={(val: any, _name, item: any) => [
                      `${Number(val).toFixed(2)} km/gal (${item?.payload?.vehiculosConDato || 0} con dato de ${item?.payload?.totalVehiculos || 0})`, 
                      'Rendimiento Promedio'
                    ]}
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <ReferenceLine 
                    y={META_RENDIMIENTO.medio} 
                    stroke="#F2B705" 
                    strokeDasharray="4 4" 
                    label={{ value: `Meta Mín: ${META_RENDIMIENTO.medio}`, position: 'right', fill: '#B45309', fontSize: 10 }} 
                  />
                  <ReferenceLine 
                    y={META_RENDIMIENTO.bueno} 
                    stroke="#16A34A" 
                    strokeDasharray="4 4" 
                    label={{ value: `Meta: ${META_RENDIMIENTO.bueno}`, position: 'right', fill: '#15803D', fontSize: 10 }} 
                  />
                  <Bar dataKey="rendimiento" radius={[4, 4, 0, 0]} barSize={40}>
                    {cdChartData.map((entry, index) => (
                      <Cell key={`cd-cell-${index}`} fill={entry.color} />
                    ))}
                    <LabelList 
                      dataKey="rendimiento" 
                      position="top" 
                      style={{ fontSize: '12px', fontWeight: 700, fill: '#0D2B4E' }}
                      formatter={(val: any) => `${Number(val).toFixed(2)} km/gl`}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
              <span>Umbral medio: {META_RENDIMIENTO.medio} km/gl | Umbral óptimo: {META_RENDIMIENTO.bueno} km/gl</span>
              <span className="font-semibold text-slate-700">{cdChartData.length} sedes operativas</span>
            </div>
          </div>

          {/* Gráfica 3: Evolución Mensual (cálculo Excel: solo rendimiento > 0) */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-[#0D2B4E] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0D2B4E]" />
                Evolución de Rendimiento por Mes
              </h3>
              <p className="text-xs text-slate-500">
                Tendencia mensual del rendimiento promedio (solo meses con datos reales)
              </p>
            </div>

            {monthlyChartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-xs text-slate-400">
                No hay meses con rendimiento &gt; 0 para graficar tendencia.
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyChartData}
                    margin={{ top: 25, right: 30, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="mes" 
                      tick={{ fontSize: 11, fill: '#1E293B', fontWeight: 600 }}
                    />
                    <YAxis 
                      domain={[0, (dataMax: number) => Math.max(Math.ceil(dataMax + 2), 16)]}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      unit=" km/gl"
                    />
                    <Tooltip
                      formatter={(val: any, name: string) => {
                        if (name === 'rendimiento') return [`${Number(val).toFixed(2)} km/gal`, 'Rendimiento Promedio'];
                        return [val, name];
                      }}
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <ReferenceLine 
                      y={META_RENDIMIENTO.medio} 
                      stroke="#F2B705" 
                      strokeDasharray="4 4" 
                      label={{ value: `Meta: ${META_RENDIMIENTO.medio}`, position: 'right', fill: '#B45309', fontSize: 10 }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="rendimiento" 
                      stroke="#0D2B4E" 
                      strokeWidth={3}
                      dot={{ fill: '#F2B705', stroke: '#0D2B4E', strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7 }}
                    >
                      <LabelList 
                        dataKey="rendimiento" 
                        position="top" 
                        style={{ fontSize: '12px', fontWeight: 700, fill: '#0D2B4E' }}
                        formatter={(val: any) => `${Number(val).toFixed(2)} km/gl`}
                      />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
              <span>Meses con datos reales analizados: {monthlyChartData.length}</span>
            </div>
          </div>

          {/* Gráfica 4: Costo Total por CD */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-[#0D2B4E] flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#0D2B4E]" />
                Costo Total de Combustible por CD
              </h3>
              <p className="text-xs text-slate-500">
                Gasto consolidado en combustible en pesos colombianos ($ COP)
              </p>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={costCdChartData}
                  margin={{ top: 25, right: 20, left: 15, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="cd" 
                    tick={{ fontSize: 11, fill: '#1E293B', fontWeight: 600 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickFormatter={(val) => formatShortCurrency(val)}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Gasto Total']}
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="costo" fill="#0D2B4E" radius={[4, 4, 0, 0]} barSize={40}>
                    <LabelList 
                      dataKey="costo" 
                      position="top" 
                      style={{ fontSize: '11px', fontWeight: 700, fill: '#0D2B4E' }}
                      formatter={(val: any) => formatShortCurrency(Number(val))}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
              <span>Gasto consolidado del periodo filtrado</span>
              <strong className="text-slate-800">{formatCurrency(stats.totalCost)}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Tabla Detallada */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 md:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#0D2B4E] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0D2B4E]" />
              Detalle de Rendimiento por Vehículo
            </h2>
            <p className="text-xs text-slate-500">
              Datos de la hoja RENDIMIENTO. Filas sin carga se muestran como "Sin dato" y no alteran los promedios.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              Orden actual: <strong className="text-slate-700 capitalize">{sortField}</strong> ({sortOrder === 'asc' ? 'Ascendente (peores primero)' : 'Descendente'})
            </span>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th 
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition whitespace-nowrap"
                  onClick={() => handleSort('placa')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Placa</span>
                    {sortField === 'placa' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#0D2B4E]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0D2B4E]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 whitespace-nowrap">CD / Ubicación</th>
                <th className="px-4 py-3 whitespace-nowrap">Proveedor</th>
                <th className="px-4 py-3 whitespace-nowrap">Mes</th>
                <th className="px-4 py-3 whitespace-nowrap">Periodo (Ini - Fin)</th>
                <th 
                  className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100 transition whitespace-nowrap"
                  onClick={() => handleSort('kmRecorridos')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>KM Recorridos</span>
                    {sortField === 'kmRecorridos' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#0D2B4E]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0D2B4E]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100 transition whitespace-nowrap"
                  onClick={() => handleSort('galones')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Galones</span>
                    {sortField === 'galones' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#0D2B4E]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0D2B4E]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-center cursor-pointer hover:bg-slate-100 transition whitespace-nowrap bg-slate-100/60"
                  onClick={() => handleSort('rendimiento')}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="font-bold text-[#0D2B4E]">Rendimiento</span>
                    {sortField === 'rendimiento' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#0D2B4E]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0D2B4E]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100 transition whitespace-nowrap"
                  onClick={() => handleSort('totalCostos')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Total Costos</span>
                    {sortField === 'totalCostos' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#0D2B4E]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0D2B4E]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    No se encontraron registros de rendimiento que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, idx) => {
                  const hasRealData = Boolean(item.rendimiento && item.rendimiento > 0);
                  const status = getRendimientoStatus(item.rendimiento);
                  const isLow = hasRealData && item.rendimiento < META_RENDIMIENTO.medio;

                  return (
                    <tr 
                      key={`${item.placa}-${item.mes}-${idx}`} 
                      className={`hover:bg-slate-50/80 transition ${isLow ? 'bg-rose-50/25' : ''}`}
                    >
                      {/* Placa */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${status.dotClass}`}></span>
                          <span>{item.placa || '-'}</span>
                        </div>
                      </td>

                      {/* CD */}
                      <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                        {item.cd || '-'}
                      </td>

                      {/* Proveedor */}
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap max-w-[200px] truncate" title={item.proveedor}>
                        {item.proveedor || '-'}
                      </td>

                      {/* Mes */}
                      <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                        {item.mes || '-'}
                      </td>

                      {/* Periodo */}
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap tabular-nums text-[11px]">
                        {item.fechaInicial && item.fechaFinal 
                          ? `${item.fechaInicial} al ${item.fechaFinal}`
                          : item.fechaInicial || item.fechaFinal || '-'}
                      </td>

                      {/* Km Recorridos */}
                      <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap tabular-nums">
                        {item.kmRecorridos && item.kmRecorridos > 0 
                          ? `${formatNumber(item.kmRecorridos, 2)} km`
                          : <span className="text-slate-400">0 km</span>}
                      </td>

                      {/* Galones */}
                      <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap tabular-nums">
                        {item.galones && item.galones > 0 
                          ? `${formatNumber(item.galones, 2)} gl`
                          : <span className="text-slate-400">0 gl</span>}
                      </td>

                      {/* Rendimiento (km/gal) con semáforo */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {hasRealData ? (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border tabular-nums ${status.badgeClass}`}>
                            <span>{item.rendimiento.toFixed(2)} km/gl</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border bg-slate-100 text-slate-400 border-slate-200">
                            <span>Sin dato</span>
                          </span>
                        )}
                      </td>

                      {/* Total Costos */}
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                        {item.totalCostos && item.totalCostos > 0 
                          ? formatCurrency(item.totalCostos)
                          : <span className="text-slate-400">$0</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Mostrando <span className="font-semibold text-slate-800 tabular-nums">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
              <span className="font-semibold text-slate-800 tabular-nums">
                {Math.min(currentPage * itemsPerPage, sortedData.length)}
              </span> de{' '}
              <span className="font-semibold text-slate-800 tabular-nums">{sortedData.length}</span> registros
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <span className="px-3 py-1 font-semibold text-slate-800 tabular-nums">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default FuelPerformanceModule;
