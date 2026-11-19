import React, { useEffect, useMemo, useState } from 'react';
import { AdherenciaRecord, MatrizPolivalenciaRecord } from '../types';
import { fetchAdherenciaBundle } from '../services/sheetService';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  LabelList
} from 'recharts';
import {
  UserCheck,
  RefreshCw,
  Filter,
  Search,
  X,
  AlertTriangle,
  Users,
  CheckCircle2,
  XCircle,
  Calendar,
  Truck,
  Download,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Info,
  PieChart as PieChartIcon
} from 'lucide-react';

interface AdherenciaModuleProps {
  adhRecords?: AdherenciaRecord[];
  matrizRecords?: MatrizPolivalenciaRecord[];
  onRefresh?: () => Promise<void> | void;
  loading?: boolean;
}

const CORP_NAVY = '#0D2B4E';
const CORP_GOLD = '#E0A800';
const STATUS_GREEN = '#16A34A';
const STATUS_AMBER = '#D97706';
const STATUS_RED = '#DC2626';

export const normNombre = (s: string): string =>
  (s || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const formatReadableName = (raw: string): string => {
  const clean = (raw || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '—';
  return clean
    .toLowerCase()
    .split(' ')
    .map(w => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
};

const normPlate = (s: string): string =>
  (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

const MESES_ORDER: Record<string, number> = {
  ENERO: 1,
  FEBRERO: 2,
  MARZO: 3,
  ABRIL: 4,
  MAYO: 5,
  JUNIO: 6,
  JULIO: 7,
  AGOSTO: 8,
  SEPTIEMBRE: 9,
  OCTUBRE: 10,
  NOVIEMBRE: 11,
  DICIEMBRE: 12
};

export const AdherenciaModule: React.FC<AdherenciaModuleProps> = ({
  adhRecords,
  matrizRecords,
  onRefresh,
  loading = false
}) => {
  // Respaldo autónomo por si el componente se monta sin datos cargados aún
  const [localAdh, setLocalAdh] = useState<AdherenciaRecord[]>([]);
  const [localMatriz, setLocalMatriz] = useState<MatrizPolivalenciaRecord[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const hasExternalData = Boolean(adhRecords && adhRecords.length > 0);
  const effectiveAdh = hasExternalData ? adhRecords! : localAdh;
  const effectiveMatriz =
    matrizRecords && matrizRecords.length > 0 ? matrizRecords : localMatriz;
  const isFetching = loading || localLoading;

  const loadLiveBundle = async () => {
    setLocalLoading(true);
    setLoadError(null);
    try {
      const { adh, matriz } = await fetchAdherenciaBundle();
      setLocalAdh(adh);
      setLocalMatriz(matriz);
      if (adh.length === 0) {
        setLoadError('No se encontraron registros en la hoja ADH.');
      }
    } catch (e) {
      setLoadError('No fue posible sincronizar los datos en vivo.');
    } finally {
      setLocalLoading(false);
    }
  };

  useEffect(() => {
    if (!hasExternalData && localAdh.length === 0 && !loading) {
      loadLiveBundle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasExternalData]);

  const handleRefreshAll = async () => {
    if (onRefresh) {
      await onRefresh();
    } else {
      await loadLiveBundle();
    }
  };

  // ---------------------------------------------------------------------------
  // 1. ESTADO MULTIFILTRO UNIFICADO
  // ---------------------------------------------------------------------------
  const [filters, setFilters] = useState<{
    mes: string;
    fecha: string;
    placa: string;
    conductor: string; // versión normalizada
    estado: 'all' | '1' | '0';
    search: string;
  }>({
    mes: 'all',
    fecha: 'all',
    placa: 'all',
    conductor: 'all',
    estado: 'all',
    search: ''
  });

  const [sortCol, setSortCol] = useState<'fecha' | 'placa' | 'estado'>('fecha');
  const [sortDesc, setSortDesc] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);

  const resetFilters = () => {
    setFilters({
      mes: 'all',
      fecha: 'all',
      placa: 'all',
      conductor: 'all',
      estado: 'all',
      search: ''
    });
    setCurrentPage(1);
  };

  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (filters.mes !== 'all') c++;
    if (filters.fecha !== 'all') c++;
    if (filters.placa !== 'all') c++;
    if (filters.conductor !== 'all') c++;
    if (filters.estado !== 'all') c++;
    if (filters.search.trim() !== '') c++;
    return c;
  }, [filters]);

  // ---------------------------------------------------------------------------
  // 2. MAPEO MATRIZ_POLIVALENCIA (Placa + Mes -> Conductor asignado)
  // ---------------------------------------------------------------------------
  const matrizMaps = useMemo(() => {
    const byMesPlaca = new Map<string, Set<string>>();
    const byPlaca = new Map<string, Set<string>>();

    effectiveMatriz.forEach(m => {
      const placa = normPlate(m.placa);
      const mes = normNombre(m.mes);
      const cond = formatReadableName(m.conductor);
      if (!placa || !cond || cond === '—') return;

      if (mes) {
        const key = `${mes}_${placa}`;
        if (!byMesPlaca.has(key)) byMesPlaca.set(key, new Set());
        byMesPlaca.get(key)!.add(cond);
      }
      if (!byPlaca.has(placa)) byPlaca.set(placa, new Set());
      byPlaca.get(placa)!.add(cond);
    });

    return { byMesPlaca, byPlaca };
  }, [effectiveMatriz]);

  const getAssignedDriver = (r: AdherenciaRecord): string => {
    const placa = normPlate(r.placa);
    const mes = normNombre(r.mes);
    if (mes) {
      const exact = matrizMaps.byMesPlaca.get(`${mes}_${placa}`);
      if (exact && exact.size > 0) return Array.from(exact).join(' / ');
    }
    const fallback = matrizMaps.byPlaca.get(placa);
    if (fallback && fallback.size > 0) return Array.from(fallback).join(' / ');
    return '—';
  };

  // ---------------------------------------------------------------------------
  // 3. DETECCIÓN DE DÍAS INCOMPLETOS (Conductor vacío en TODAS las filas del día)
  // ---------------------------------------------------------------------------
  const { incompleteDateSet, incompleteDateList, validRecords } = useMemo(() => {
    const byDate = new Map<string, AdherenciaRecord[]>();

    effectiveAdh.forEach(r => {
      const dateKey = r.fechaIso || r.fechaLabel || r.fecha;
      if (!dateKey) return;
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey)!.push(r);
    });

    const incSet = new Set<string>();
    const incList: { fechaIso: string; fechaLabel: string; mes: string; count: number }[] = [];

    byDate.forEach((rows, dateKey) => {
      const allEmptyConductor = rows.every(r => !r.conductorNorm && r.estado === '0');
      if (allEmptyConductor) {
        incSet.add(dateKey);
        incList.push({
          fechaIso: dateKey,
          fechaLabel: rows[0]?.fechaLabel || dateKey,
          mes: rows[0]?.mes || '',
          count: rows.length
        });
      }
    });

    incList.sort((a, b) => a.fechaIso.localeCompare(b.fechaIso));

    const valid = effectiveAdh.filter(r => {
      const dateKey = r.fechaIso || r.fechaLabel || r.fecha;
      return !incSet.has(dateKey);
    });

    return {
      incompleteDateSet: incSet,
      incompleteDateList: incList,
      validRecords: valid
    };
  }, [effectiveAdh]);

  // ---------------------------------------------------------------------------
  // 4. OPCIONES DISPONIBLES PARA SELECTORES
  // ---------------------------------------------------------------------------
  const filterOptions = useMemo(() => {
    const mesesSet = new Set<string>();
    const fechasMap = new Map<string, string>();
    const placasSet = new Set<string>();
    const conductoresMap = new Map<string, string>();

    validRecords.forEach(r => {
      if (r.mes) mesesSet.add(normNombre(r.mes));
      if (r.fechaIso) fechasMap.set(r.fechaIso, r.fechaLabel || r.fechaIso);
      if (r.placa) placasSet.add(normPlate(r.placa));
      if (r.conductorNorm) {
        if (!conductoresMap.has(r.conductorNorm)) {
          conductoresMap.set(r.conductorNorm, formatReadableName(r.conductor));
        }
      }
    });

    const meses = Array.from(mesesSet).sort(
      (a, b) => (MESES_ORDER[a] || 99) - (MESES_ORDER[b] || 99) || a.localeCompare(b)
    );
    const fechas = Array.from(fechasMap.entries())
      .map(([iso, label]) => ({ iso, label }))
      .sort((a, b) => a.iso.localeCompare(b.iso));
    const placas = Array.from(placasSet).sort();
    const conductores = Array.from(conductoresMap.entries())
      .map(([norm, label]) => ({ norm, label }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return { meses, fechas, placas, conductores };
  }, [validRecords]);

  // ---------------------------------------------------------------------------
  // 5. HELPER CENTRAL DE MULTIFILTRO CRUZADO (adhPasa)
  // ---------------------------------------------------------------------------
  const adhPasa = (
    r: AdherenciaRecord,
    opts?: {
      ignoreMes?: boolean;
      ignoreFecha?: boolean;
      ignorePlaca?: boolean;
      ignoreConductor?: boolean;
      ignoreEstado?: boolean;
    }
  ): boolean => {
    if (!opts?.ignoreMes && filters.mes !== 'all') {
      if (normNombre(r.mes) !== normNombre(filters.mes)) return false;
    }
    if (!opts?.ignoreFecha && filters.fecha !== 'all') {
      if (r.fechaIso !== filters.fecha) return false;
    }
    if (!opts?.ignorePlaca && filters.placa !== 'all') {
      if (normPlate(r.placa) !== normPlate(filters.placa)) return false;
    }
    if (!opts?.ignoreConductor && filters.conductor !== 'all') {
      if (r.conductorNorm !== filters.conductor) return false;
    }
    if (!opts?.ignoreEstado && filters.estado !== 'all') {
      if (r.estado !== filters.estado) return false;
    }
    if (filters.search.trim() !== '') {
      const q = normNombre(filters.search);
      const qPlate = q.replace(/\s+/g, '');
      const matchPlaca = normPlate(r.placa).includes(qPlate);
      const matchCond = r.conductorNorm.includes(q);
      const matchAsignado = normNombre(getAssignedDriver(r)).includes(q);
      if (!matchPlaca && !matchCond && !matchAsignado) return false;
    }
    return true;
  };

  // Registros completamente filtrados (para KPIs y tabla)
  const filteredRecords = useMemo(
    () => validRecords.filter(r => adhPasa(r)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [validRecords, filters, matrizMaps]
  );

  // ---------------------------------------------------------------------------
  // 6. KPIs PRINCIPALES (solo días válidos, nunca incompletos)
  // ---------------------------------------------------------------------------
  const kpiStats = useMemo(() => {
    const total = filteredRecords.length;
    const adherentes = filteredRecords.filter(r => r.adhiere).length;
    const noAdherentes = total - adherentes;
    const pctAdherencia = total > 0 ? Math.round((adherentes / total) * 1000) / 10 : null;

    const byPlate = new Map<string, { total: number; adh: number }>();
    const driversSet = new Set<string>();

    filteredRecords.forEach(r => {
      const p = normPlate(r.placa);
      if (p) {
        if (!byPlate.has(p)) byPlate.set(p, { total: 0, adh: 0 });
        const cur = byPlate.get(p)!;
        cur.total++;
        if (r.adhiere) cur.adh++;
      }
      if (r.conductorNorm) {
        driversSet.add(r.conductorNorm);
      }
    });

    const criticalPlates: string[] = [];
    byPlate.forEach((v, p) => {
      if (v.total > 0 && v.adh === 0) criticalPlates.push(p);
    });
    criticalPlates.sort();

    return {
      total,
      adherentes,
      noAdherentes,
      pctAdherencia,
      criticalPlatesCount: criticalPlates.length,
      criticalPlatesList: criticalPlates,
      totalPlatesCount: byPlate.size,
      driversCount: driversSet.size
    };
  }, [filteredRecords]);

  // ---------------------------------------------------------------------------
  // 7. GRÁFICA B: LÍNEA — % ADHERENCIA POR DÍA (incluye días incompletos marcados)
  // ---------------------------------------------------------------------------
  const dailyLineData = useMemo(() => {
    const map = new Map<
      string,
      {
        fechaIso: string;
        fechaLabel: string;
        shortLabel: string;
        total: number;
        adh: number;
        incomplete: boolean;
      }
    >();

    // Días válidos aplicando todos los filtros excepto fecha
    validRecords
      .filter(r => adhPasa(r, { ignoreFecha: true }))
      .forEach(r => {
        const key = r.fechaIso || r.fechaLabel;
        if (!key) return;
        if (!map.has(key)) {
          const parts = (r.fechaLabel || '').split('/');
          const shortLabel =
            parts.length >= 2 ? `${parts[0]}/${parts[1]}` : r.fechaLabel || key;
          map.set(key, {
            fechaIso: key,
            fechaLabel: r.fechaLabel || key,
            shortLabel,
            total: 0,
            adh: 0,
            incomplete: false
          });
        }
        const entry = map.get(key)!;
        entry.total++;
        if (r.adhiere) entry.adh++;
      });

    // Días incompletos (respetando filtro de mes si aplica, y si no hay filtro específico de conductor/estado=1)
    if (filters.conductor === 'all' && filters.estado !== '1') {
      effectiveAdh.forEach(r => {
        const key = r.fechaIso || r.fechaLabel;
        if (!key || !incompleteDateSet.has(key)) return;
        if (filters.mes !== 'all' && normNombre(r.mes) !== normNombre(filters.mes)) return;
        if (filters.placa !== 'all' && normPlate(r.placa) !== normPlate(filters.placa)) return;
        if (filters.search.trim() !== '') {
          const q = normNombre(filters.search).replace(/\s+/g, '');
          if (!normPlate(r.placa).includes(q)) return;
        }
        if (!map.has(key)) {
          const parts = (r.fechaLabel || '').split('/');
          const shortLabel =
            parts.length >= 2 ? `${parts[0]}/${parts[1]}` : r.fechaLabel || key;
          map.set(key, {
            fechaIso: key,
            fechaLabel: r.fechaLabel || key,
            shortLabel,
            total: 0,
            adh: 0,
            incomplete: true
          });
        }
        map.get(key)!.total++;
      });
    }

    return Array.from(map.values())
      .sort((a, b) => a.fechaIso.localeCompare(b.fechaIso))
      .map(d => ({
        ...d,
        pctValida:
          !d.incomplete && d.total > 0
            ? Math.round((d.adh / d.total) * 1000) / 10
            : null,
        pctIncompleta: d.incomplete ? 0 : null
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validRecords, effectiveAdh, incompleteDateSet, filters, matrizMaps]);

  // ---------------------------------------------------------------------------
  // 8. GRÁFICA C: BARRAS HORIZONTALES — PLACAS CON MENOR ADHERENCIA
  // ---------------------------------------------------------------------------
  const minPlateRecords = filters.fecha !== 'all' ? 1 : 3;

  const worstPlatesData = useMemo(() => {
    const byPlate = new Map<string, { total: number; adh: number; noAdh: number }>();

    validRecords
      .filter(r => adhPasa(r, { ignorePlaca: true }))
      .forEach(r => {
        const p = normPlate(r.placa);
        if (!p) return;
        if (!byPlate.has(p)) byPlate.set(p, { total: 0, adh: 0, noAdh: 0 });
        const cur = byPlate.get(p)!;
        cur.total++;
        if (r.adhiere) cur.adh++;
        else cur.noAdh++;
      });

    return Array.from(byPlate.entries())
      .filter(([, v]) => v.total >= minPlateRecords)
      .map(([placa, v]) => ({
        placa,
        pct: Math.round((v.adh / v.total) * 1000) / 10,
        adh: v.adh,
        noAdh: v.noAdh,
        total: v.total
      }))
      .sort((a, b) => a.pct - b.pct || b.noAdh - a.noAdh || b.total - a.total)
      .slice(0, 15);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validRecords, filters, minPlateRecords, matrizMaps]);

  // ---------------------------------------------------------------------------
  // 9. GRÁFICA D: BARRAS HORIZONTALES — CONDUCTORES CON MÁS NO-ADHERENCIA
  // ---------------------------------------------------------------------------
  const worstDriversData = useMemo(() => {
    const byDriver = new Map<
      string,
      { displayName: string; total: number; adh: number; noAdh: number }
    >();

    validRecords
      .filter(r => adhPasa(r, { ignoreConductor: true }))
      .forEach(r => {
        if (!r.conductorNorm) return;
        if (!byDriver.has(r.conductorNorm)) {
          byDriver.set(r.conductorNorm, {
            displayName: formatReadableName(r.conductor),
            total: 0,
            adh: 0,
            noAdh: 0
          });
        }
        const cur = byDriver.get(r.conductorNorm)!;
        cur.total++;
        if (r.adhiere) cur.adh++;
        else cur.noAdh++;
      });

    return Array.from(byDriver.entries())
      .filter(([, v]) => v.noAdh > 0)
      .map(([conductorNorm, v]) => ({
        conductorNorm,
        nombre: v.displayName,
        noAdh: v.noAdh,
        adh: v.adh,
        total: v.total,
        pct: v.total > 0 ? Math.round((v.adh / v.total) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.noAdh - a.noAdh || a.pct - b.pct || a.nombre.localeCompare(b.nombre))
      .slice(0, 15);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validRecords, filters, matrizMaps]);

  // ---------------------------------------------------------------------------
  // 10. GRÁFICA E: DONA — ADHIERE VS NO ADHIERE
  // ---------------------------------------------------------------------------
  const donutData = useMemo(() => {
    const base = validRecords.filter(r => adhPasa(r, { ignoreEstado: true }));
    const adh = base.filter(r => r.adhiere).length;
    const noAdh = base.length - adh;
    const total = base.length;
    return {
      total,
      adh,
      noAdh,
      pctAdh: total > 0 ? Math.round((adh / total) * 1000) / 10 : null,
      slices: [
        { name: 'Adhiere', estadoVal: '1' as const, value: adh, color: STATUS_GREEN },
        { name: 'No adhiere', estadoVal: '0' as const, value: noAdh, color: STATUS_RED }
      ]
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validRecords, filters, matrizMaps]);

  // ---------------------------------------------------------------------------
  // 11. TABLA DE DETALLE (ORDENADA + PAGINADA)
  // ---------------------------------------------------------------------------
  const tableRows = useMemo(() => {
    const rows = filteredRecords.map(r => ({
      ...r,
      conductorDisplay: r.conductor ? formatReadableName(r.conductor) : '—',
      conductorAsignado: getAssignedDriver(r)
    }));

    rows.sort((a, b) => {
      let cmp = 0;
      if (sortCol === 'fecha') {
        cmp = a.fechaIso.localeCompare(b.fechaIso) || a.placa.localeCompare(b.placa);
      } else if (sortCol === 'placa') {
        cmp = a.placa.localeCompare(b.placa) || a.fechaIso.localeCompare(b.fechaIso);
      } else {
        cmp = Number(a.estado) - Number(b.estado) || a.fechaIso.localeCompare(b.fechaIso);
      }
      return sortDesc ? -cmp : cmp;
    });

    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRecords, sortCol, sortDesc, matrizMaps]);

  const totalPages = Math.max(1, Math.ceil(tableRows.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return tableRows.slice(start, start + itemsPerPage);
  }, [tableRows, safePage, itemsPerPage]);

  const handleSort = (col: 'fecha' | 'placa' | 'estado') => {
    if (sortCol === col) {
      setSortDesc(prev => !prev);
    } else {
      setSortCol(col);
      setSortDesc(col === 'fecha');
    }
    setCurrentPage(1);
  };

  const handleExportCsv = () => {
    if (tableRows.length === 0) return;
    const headers = [
      'Mes',
      'Fecha',
      'Placa',
      'Conductor (Manejó)',
      'Conductor Asignado (Matriz)',
      'Estado'
    ];
    const escape = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
    const lines = [
      headers.join(','),
      ...tableRows.map(r =>
        [
          escape(r.mes),
          escape(r.fechaLabel),
          escape(r.placa),
          escape(r.conductorDisplay),
          escape(r.conductorAsignado),
          escape(r.adhiere ? 'Adhiere' : 'No adhiere')
        ].join(',')
      )
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `adherencia_conductores_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Semántica de color para % Adherencia general
  const adherenceTone = useMemo(() => {
    const pct = kpiStats.pctAdherencia;
    if (pct === null) {
      return {
        text: 'text-slate-400',
        badgeBg: 'bg-slate-100 text-slate-500 border-slate-200',
        iconBg: 'bg-slate-100 text-slate-500 border-slate-200',
        label: 'Sin datos'
      };
    }
    if (pct >= 85) {
      return {
        text: 'text-emerald-600',
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        label: 'Óptima (≥85%)'
      };
    }
    if (pct >= 60) {
      return {
        text: 'text-amber-600',
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
        iconBg: 'bg-amber-50 text-amber-700 border-amber-200',
        label: 'Media (60–84%)'
      };
    }
    return {
      text: 'text-red-600',
      badgeBg: 'bg-red-50 text-red-700 border-red-200',
      iconBg: 'bg-red-50 text-red-600 border-red-200',
      label: 'Crítica (<60%)'
    };
  }, [kpiStats.pctAdherencia]);

  // Toggle helpers para clics en gráficas
  const toggleFecha = (fechaIso: string) => {
    setFilters(prev => ({
      ...prev,
      fecha: prev.fecha === fechaIso ? 'all' : fechaIso
    }));
    setCurrentPage(1);
  };

  const togglePlaca = (placa: string) => {
    const norm = normPlate(placa);
    setFilters(prev => ({
      ...prev,
      placa: prev.placa === norm ? 'all' : norm
    }));
    setCurrentPage(1);
  };

  const toggleConductor = (conductorNorm: string) => {
    setFilters(prev => ({
      ...prev,
      conductor: prev.conductor === conductorNorm ? 'all' : conductorNorm
    }));
    setCurrentPage(1);
  };

  const toggleEstado = (estado: '1' | '0') => {
    setFilters(prev => ({
      ...prev,
      estado: prev.estado === estado ? 'all' : estado
    }));
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-6 font-sans text-slate-800">
      {/* ==================================================================== */}
      {/* ENCABEZADO                                                           */}
      {/* ==================================================================== */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#0D2B4E]/10 text-[#0D2B4E] rounded-xl border border-[#0D2B4E]/15">
            <UserCheck size={24} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Adherencia de Conductores
            </h1>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Control diario de asignación oficial conductor–placa · Haz clic en cualquier gráfica para filtrar todo el tablero
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={tableRows.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </button>
          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={isFetching}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0D2B4E] hover:bg-[#1E3A5F] text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            <span>{isFetching ? 'Sincronizando...' : 'Actualizar datos'}</span>
          </button>
        </div>
      </div>

      {/* Nota de error si falló la carga */}
      {loadError && !isFetching && effectiveAdh.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <span className="font-semibold">{loadError}</span>
          </div>
          <button
            type="button"
            onClick={handleRefreshAll}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold cursor-pointer whitespace-nowrap"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MULTIFILTRO CRUZADO                                                  */}
      {/* ==================================================================== */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <div className="p-1.5 bg-[#0D2B4E]/10 text-[#0D2B4E] rounded-lg">
              <Filter size={15} />
            </div>
            <span>Multifiltro Cruzado</span>
            <span className="text-[11px] font-normal text-slate-400">
              (Sincronizado entre tarjetas, gráficas y tabla)
            </span>
          </div>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl border border-red-200 transition-colors cursor-pointer"
            >
              <X size={13} />
              <span>Restablecer ({activeFiltersCount})</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Mes */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Mes
            </label>
            <select
              value={filters.mes}
              onChange={e => {
                setFilters(prev => ({ ...prev, mes: e.target.value }));
                setCurrentPage(1);
              }}
              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold outline-none transition-colors cursor-pointer ${
                filters.mes !== 'all'
                  ? 'bg-[#0D2B4E] text-white border border-[#0D2B4E]'
                  : 'bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-[#0D2B4E]'
              }`}
            >
              <option value="all" className="bg-white text-slate-800">
                Todos los meses
              </option>
              {filterOptions.meses.map(m => (
                <option key={m} value={m} className="bg-white text-slate-800">
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha / Día */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Fecha / Día
            </label>
            <select
              value={filters.fecha}
              onChange={e => {
                setFilters(prev => ({ ...prev, fecha: e.target.value }));
                setCurrentPage(1);
              }}
              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold outline-none transition-colors cursor-pointer font-mono tabular-nums ${
                filters.fecha !== 'all'
                  ? 'bg-[#E0A800] text-slate-900 border border-[#E0A800]'
                  : 'bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-[#0D2B4E]'
              }`}
            >
              <option value="all" className="bg-white text-slate-800 font-sans">
                Todas las fechas
              </option>
              {filterOptions.fechas.map(f => (
                <option key={f.iso} value={f.iso} className="bg-white text-slate-800">
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Placa */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Placa
            </label>
            <select
              value={filters.placa}
              onChange={e => {
                setFilters(prev => ({ ...prev, placa: e.target.value }));
                setCurrentPage(1);
              }}
              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold outline-none transition-colors cursor-pointer font-mono ${
                filters.placa !== 'all'
                  ? 'bg-[#0D2B4E] text-white border border-[#0D2B4E]'
                  : 'bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-[#0D2B4E]'
              }`}
            >
              <option value="all" className="bg-white text-slate-800 font-sans">
                Todas las placas
              </option>
              {filterOptions.placas.map(p => (
                <option key={p} value={p} className="bg-white text-slate-800">
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Conductor */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Conductor
            </label>
            <select
              value={filters.conductor}
              onChange={e => {
                setFilters(prev => ({ ...prev, conductor: e.target.value }));
                setCurrentPage(1);
              }}
              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold outline-none transition-colors cursor-pointer ${
                filters.conductor !== 'all'
                  ? 'bg-[#0D2B4E] text-white border border-[#0D2B4E]'
                  : 'bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-[#0D2B4E]'
              }`}
            >
              <option value="all" className="bg-white text-slate-800">
                Todos los conductores
              </option>
              {filterOptions.conductores.map(c => (
                <option key={c.norm} value={c.norm} className="bg-white text-slate-800">
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Estado
            </label>
            <select
              value={filters.estado}
              onChange={e => {
                setFilters(prev => ({
                  ...prev,
                  estado: e.target.value as 'all' | '1' | '0'
                }));
                setCurrentPage(1);
              }}
              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold outline-none transition-colors cursor-pointer ${
                filters.estado === '1'
                  ? 'bg-emerald-600 text-white border border-emerald-600'
                  : filters.estado === '0'
                  ? 'bg-red-600 text-white border border-red-600'
                  : 'bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-[#0D2B4E]'
              }`}
            >
              <option value="all" className="bg-white text-slate-800">
                Todos los estados
              </option>
              <option value="1" className="bg-white text-slate-800">
                Adhiere (1)
              </option>
              <option value="0" className="bg-white text-slate-800">
                No adhiere (0)
              </option>
            </select>
          </div>

          {/* Buscador de texto */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Buscar placa / conductor
            </label>
            <div className="relative">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={filters.search}
                onChange={e => {
                  setFilters(prev => ({ ...prev, search: e.target.value }));
                  setCurrentPage(1);
                }}
                placeholder="Placa o nombre..."
                className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#0D2B4E] outline-none transition-colors"
              />
              {filters.search && (
                <button
                  type="button"
                  onClick={() => {
                    setFilters(prev => ({ ...prev, search: '' }));
                    setCurrentPage(1);
                  }}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Resumen limpio de selección e incompletos */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <Info size={13} className="text-slate-400" />
            <span>
              {activeFiltersCount === 0
                ? 'Mostrando consolidado completo de días diligenciados'
                : [
                    filters.mes !== 'all' ? `Mes: ${filters.mes}` : null,
                    filters.fecha !== 'all'
                      ? `Fecha: ${
                          filterOptions.fechas.find(f => f.iso === filters.fecha)?.label ||
                          filters.fecha
                        }`
                      : null,
                    filters.placa !== 'all' ? `Placa: ${filters.placa}` : null,
                    filters.conductor !== 'all'
                      ? `Conductor: ${
                          filterOptions.conductores.find(c => c.norm === filters.conductor)
                            ?.label || filters.conductor
                        }`
                      : null,
                    filters.estado !== 'all'
                      ? `Estado: ${filters.estado === '1' ? 'Adhiere' : 'No adhiere'}`
                      : null,
                    filters.search.trim() ? `Búsqueda: "${filters.search.trim()}"` : null
                  ]
                    .filter(Boolean)
                    .join(' · ')}
            </span>
          </div>

          <div className="font-mono tabular-nums text-[11px] font-semibold text-slate-600">
            {kpiStats.total} registros válidos
            {incompleteDateList.length > 0 &&
              ` · ${incompleteDateList.length} día(s) incompleto(s) excluidos`}
          </div>
        </div>
      </div>

      {/* Nota explícita si existen días incompletos excluidos del cálculo */}
      {incompleteDateList.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-600 shrink-0" />
            <span>
              <strong className="text-slate-800">Días incompletos excluidos del promedio:</strong>{' '}
              {incompleteDateList
                .map(d => `${d.fechaLabel} (${d.count} reg. sin conductor)`)
                .join(' · ')}
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Marcados aparte en la gráfica diaria
          </span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* A) KPIs SUPERIORES (4 TARJETAS)                                      */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: % Adherencia general */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                % Adherencia general
              </p>
              <h3
                className={`text-3xl sm:text-4xl font-extrabold mt-1 font-mono tabular-nums tracking-tight ${adherenceTone.text}`}
              >
                {kpiStats.pctAdherencia !== null ? `${kpiStats.pctAdherencia}%` : '—'}
              </h3>
            </div>
            <div className={`p-2.5 rounded-xl border ${adherenceTone.iconBg}`}>
              <UserCheck size={20} />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Meta operativa: ≥ 85%</span>
            <span className={`font-bold ${adherenceTone.text}`}>{adherenceTone.label}</span>
          </div>
        </div>

        {/* KPI 2: Registros adherentes / Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Adherentes / Total
              </p>
              <h3 className="text-3xl font-extrabold text-[#0D2B4E] mt-1 font-mono tabular-nums tracking-tight">
                {kpiStats.total > 0 ? (
                  <>
                    <span>{kpiStats.adherentes}</span>
                    <span className="text-slate-300 mx-1">/</span>
                    <span className="text-slate-600 text-2xl">{kpiStats.total}</span>
                  </>
                ) : (
                  '—'
                )}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-100 text-[#0D2B4E] border border-slate-200">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Registros no adherentes</span>
            <span className="font-mono tabular-nums font-bold text-red-600">
              {kpiStats.total > 0 ? kpiStats.noAdherentes : '—'}
            </span>
          </div>
        </div>

        {/* KPI 3: Placas con 0% adherencia (críticas) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Placas con 0% adherencia
              </p>
              <h3
                className={`text-3xl font-extrabold mt-1 font-mono tabular-nums tracking-tight ${
                  kpiStats.total === 0
                    ? 'text-slate-400'
                    : kpiStats.criticalPlatesCount > 0
                    ? 'text-red-600'
                    : 'text-emerald-600'
                }`}
              >
                {kpiStats.total > 0 ? kpiStats.criticalPlatesCount : '—'}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500">
            <span className="truncate" title={kpiStats.criticalPlatesList.join(', ')}>
              {kpiStats.total === 0
                ? 'Sin registros'
                : kpiStats.criticalPlatesCount > 0
                ? kpiStats.criticalPlatesList.slice(0, 3).join(', ') +
                  (kpiStats.criticalPlatesCount > 3
                    ? ` (+${kpiStats.criticalPlatesCount - 3})`
                    : '')
                : 'Ninguna placa en 0%'}
            </span>
            <span className="font-mono tabular-nums font-semibold text-slate-700 shrink-0">
              de {kpiStats.totalPlatesCount}
            </span>
          </div>
        </div>

        {/* KPI 4: Conductores evaluados */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Conductores evaluados
              </p>
              <h3 className="text-3xl font-extrabold text-[#0D2B4E] mt-1 font-mono tabular-nums tracking-tight">
                {kpiStats.total > 0 ? kpiStats.driversCount : '—'}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Asignados en matriz</span>
            <span className="font-mono tabular-nums font-bold text-slate-700">
              {effectiveMatriz.length > 0 ? effectiveMatriz.length : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* B) LÍNEA — % ADHERENCIA POR DÍA                                      */}
      {/* ==================================================================== */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar size={18} className="text-[#0D2B4E]" />
              Evolución diaria de % adherencia
            </h2>
            <p className="text-xs text-slate-500">
              Clic en cualquier punto del día para filtrar · Los días sin conductor diligenciado se marcan en gris y no alteran el promedio
            </p>
          </div>
          {filters.fecha !== 'all' && (
            <button
              type="button"
              onClick={() => toggleFecha(filters.fecha)}
              className="text-xs font-bold text-[#0D2B4E] hover:underline cursor-pointer whitespace-nowrap"
            >
              Ver todos los días
            </button>
          )}
        </div>

        <div className="h-[300px] w-full">
          {dailyLineData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl gap-2">
              <Calendar size={28} className="text-slate-300" />
              <span>Sin registros diarios para los filtros actuales (—)</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dailyLineData}
                margin={{ top: 18, right: 24, left: 0, bottom: 8 }}
                onClick={(e: any) => {
                  const p = e?.activePayload?.[0]?.payload;
                  if (p && !p.incomplete && p.fechaIso) {
                    toggleFecha(p.fechaIso);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  unit="%"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-xl text-xs shadow-lg border border-slate-700 space-y-1">
                        <div className="font-bold font-mono">{d.fechaLabel}</div>
                        {d.incomplete ? (
                          <div className="text-amber-300 font-semibold">
                            Día incompleto ({d.total} placas sin conductor · excluido)
                          </div>
                        ) : (
                          <>
                            <div className="font-mono font-bold text-emerald-300">
                              Adherencia: {d.pctValida}%
                            </div>
                            <div className="text-slate-300 font-mono">
                              {d.adh} adherentes / {d.total} registros
                            </div>
                          </>
                        )}
                      </div>
                    );
                  }}
                />
                <ReferenceLine
                  y={85}
                  stroke={STATUS_GREEN}
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: 'Meta 85%',
                    position: 'insideTopRight',
                    fill: STATUS_GREEN,
                    fontSize: 11,
                    fontWeight: 700
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="pctValida"
                  name="% Adherencia"
                  stroke={CORP_NAVY}
                  strokeWidth={2.5}
                  connectNulls={false}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (cx == null || cy == null || payload?.pctValida == null) {
                      return <g key={`dot-empty-${props.index}`} />;
                    }
                    const isSelected = filters.fecha === payload.fechaIso;
                    return (
                      <circle
                        key={`dot-val-${payload.fechaIso}`}
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 7 : 4.5}
                        fill={isSelected ? CORP_GOLD : CORP_NAVY}
                        stroke="#FFFFFF"
                        strokeWidth={2}
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  }}
                  activeDot={{ r: 7, fill: CORP_GOLD, stroke: '#FFFFFF', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="pctIncompleta"
                  name="Día incompleto (excluido)"
                  stroke="#94A3B8"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  connectNulls={false}
                  dot={{ r: 5, fill: '#E2E8F0', stroke: '#64748B', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* C, D, E) RANKING PLACAS · RANKING CONDUCTORES · DONA ESTADO          */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* C) Barras horizontales — Placas con menor adherencia */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck size={18} className="text-[#0D2B4E]" />
                Placas con menor adherencia
              </h2>
              <p className="text-xs text-slate-500">
                Top {worstPlatesData.length} peores (mín. {minPlateRecords}{' '}
                {minPlateRecords === 1 ? 'registro' : 'registros'}) · Clic para filtrar
              </p>
            </div>
            {filters.placa !== 'all' && (
              <button
                type="button"
                onClick={() => togglePlaca(filters.placa)}
                className="text-xs font-bold text-[#0D2B4E] hover:underline cursor-pointer shrink-0"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="w-full">
            {worstPlatesData.length === 0 ? (
              <div className="h-[320px] flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl gap-2 p-6 text-center">
                <Truck size={28} className="text-slate-300" />
                <span>
                  Sin placas con al menos {minPlateRecords} registros para la selección actual (—)
                </span>
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height={Math.max(300, worstPlatesData.length * 30)}
              >
                <BarChart
                  data={worstPlatesData}
                  layout="vertical"
                  margin={{ top: 5, right: 56, left: 6, bottom: 5 }}
                  onClick={(e: any) => {
                    const p = e?.activePayload?.[0]?.payload;
                    if (p?.placa) togglePlaca(p.placa);
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    unit="%"
                  />
                  <YAxis
                    type="category"
                    dataKey="placa"
                    width={78}
                    tick={{
                      fontSize: 11,
                      fill: '#0F172A',
                      fontWeight: 700,
                      fontFamily: 'monospace'
                    }}
                  />
                  <Tooltip
                    formatter={(val: any, _n: any, p: any) => [
                      `${val}% (${p?.payload?.adh ?? 0}/${p?.payload?.total ?? 0} adherentes)`,
                      p?.payload?.placa ?? ''
                    ]}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      color: '#fff',
                      borderRadius: '10px',
                      border: 'none',
                      fontSize: '12px'
                    }}
                  />
                  <Bar
                    dataKey="pct"
                    radius={[0, 6, 6, 0]}
                    maxBarSize={22}
                    minPointSize={4}
                    cursor="pointer"
                  >
                    {worstPlatesData.map((entry, idx) => (
                      <Cell
                        key={`cell-placa-${entry.placa}-${idx}`}
                        fill={filters.placa === entry.placa ? CORP_GOLD : CORP_NAVY}
                      />
                    ))}
                    <LabelList
                      dataKey="pct"
                      position="right"
                      formatter={(v: any) => `${v}%`}
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        fill: '#0F172A',
                        fontFamily: 'monospace'
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* D) Barras horizontales — Conductores con más no-adherencia */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users size={18} className="text-[#0D2B4E]" />
                Conductores con más no-adherencia
              </h2>
              <p className="text-xs text-slate-500">
                N° de registros con estado 0 (agrupado sin tildes/mayúsculas) · Clic para filtrar
              </p>
            </div>
            {filters.conductor !== 'all' && (
              <button
                type="button"
                onClick={() => toggleConductor(filters.conductor)}
                className="text-xs font-bold text-[#0D2B4E] hover:underline cursor-pointer shrink-0"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="w-full">
            {worstDriversData.length === 0 ? (
              <div className="h-[320px] flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl gap-2 p-6 text-center">
                <CheckCircle2 size={28} className="text-emerald-400" />
                <span>Sin registros no-adherentes para la selección actual (—)</span>
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height={Math.max(300, worstDriversData.length * 30)}
              >
                <BarChart
                  data={worstDriversData}
                  layout="vertical"
                  margin={{ top: 5, right: 42, left: 4, bottom: 5 }}
                  onClick={(e: any) => {
                    const p = e?.activePayload?.[0]?.payload;
                    if (p?.conductorNorm) toggleConductor(p.conductorNorm);
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={136}
                    tick={{ fontSize: 10, fill: '#1E293B', fontWeight: 600 }}
                    tickFormatter={(v: string) =>
                      v.length > 22 ? v.slice(0, 20) + '…' : v
                    }
                  />
                  <Tooltip
                    formatter={(val: any, _n: any, p: any) => [
                      `${val} no-adherentes (${p?.payload?.pct ?? 0}% adherencia · ${p?.payload?.total ?? 0} reg.)`,
                      p?.payload?.nombre ?? ''
                    ]}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      color: '#fff',
                      borderRadius: '10px',
                      border: 'none',
                      fontSize: '12px'
                    }}
                  />
                  <Bar
                    dataKey="noAdh"
                    radius={[0, 6, 6, 0]}
                    maxBarSize={22}
                    cursor="pointer"
                  >
                    {worstDriversData.map((entry, idx) => (
                      <Cell
                        key={`cell-driver-${entry.conductorNorm}-${idx}`}
                        fill={
                          filters.conductor === entry.conductorNorm
                            ? CORP_GOLD
                            : CORP_NAVY
                        }
                      />
                    ))}
                    <LabelList
                      dataKey="noAdh"
                      position="right"
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        fill: '#0F172A',
                        fontFamily: 'monospace'
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* E) Dona — Adhiere vs No adhiere */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PieChartIcon size={18} className="text-[#0D2B4E]" />
                Adhiere vs No adhiere
              </h2>
              <p className="text-xs text-slate-500">
                Proporción global · Clic en segmento para filtrar
              </p>
            </div>
            {filters.estado !== 'all' && (
              <button
                type="button"
                onClick={() => toggleEstado(filters.estado as '1' | '0')}
                className="text-xs font-bold text-[#0D2B4E] hover:underline cursor-pointer shrink-0"
              >
                Todos
              </button>
            )}
          </div>

          {donutData.total === 0 ? (
            <div className="flex-grow min-h-[240px] flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl gap-2 p-4">
              <span>Sin datos para graficar (—)</span>
            </div>
          ) : (
            <div className="relative h-[230px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData.slices}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={86}
                    paddingAngle={3}
                    onClick={(entry: any) => {
                      if (entry?.estadoVal) toggleEstado(entry.estadoVal);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {donutData.slices.map((s, idx) => {
                      const dimmed =
                        filters.estado !== 'all' && filters.estado !== s.estadoVal;
                      return (
                        <Cell
                          key={`donut-${s.estadoVal}-${idx}`}
                          fill={s.color}
                          fillOpacity={dimmed ? 0.25 : 1}
                          stroke={
                            filters.estado === s.estadoVal ? CORP_NAVY : '#FFFFFF'
                          }
                          strokeWidth={filters.estado === s.estadoVal ? 2.5 : 1.5}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      `${val} registros (${
                        donutData.total > 0
                          ? Math.round((Number(val) / donutData.total) * 1000) / 10
                          : 0
                      }%)`,
                      name
                    ]}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      color: '#fff',
                      borderRadius: '10px',
                      border: 'none',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Lectura central */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-extrabold font-mono tabular-nums text-slate-900">
                  {donutData.pctAdh !== null ? `${donutData.pctAdh}%` : '—'}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Adherencia
                </span>
              </div>
            </div>
          )}

          {/* Botones interactivos de leyenda */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => toggleEstado('1')}
              className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                filters.estado === '1'
                  ? 'bg-emerald-50 border-emerald-400'
                  : 'bg-slate-50 border-slate-200 hover:bg-emerald-50/50'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 size={13} />
                <span>Adhiere</span>
              </div>
              <div className="text-base font-extrabold font-mono tabular-nums text-slate-900 mt-0.5">
                {donutData.total > 0 ? donutData.adh : '—'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => toggleEstado('0')}
              className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                filters.estado === '0'
                  ? 'bg-red-50 border-red-400'
                  : 'bg-slate-50 border-slate-200 hover:bg-red-50/50'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-700">
                <XCircle size={13} />
                <span>No adhiere</span>
              </div>
              <div className="text-base font-extrabold font-mono tabular-nums text-slate-900 mt-0.5">
                {donutData.total > 0 ? donutData.noAdh : '—'}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* F) TABLA DE DETALLE                                                  */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Detalle diario de adherencia
            </h2>
            <p className="text-xs text-slate-500">
              Comparación entre quien manejó el vehículo (hoja ADH) y el conductor asignado oficial (MATRIZ_POLIVALENCIA)
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Filas por página:</span>
            <select
              value={itemsPerPage}
              onChange={e => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort('fecha')}
                    className="flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                  >
                    <span>Fecha</span>
                    <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort('placa')}
                    className="flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                  >
                    <span>Placa</span>
                    <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="py-3 px-4">Conductor (manejó)</th>
                <th className="py-3 px-4">Conductor asignado (Matriz)</th>
                <th className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('estado')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                  >
                    <span>Estado</span>
                    <ArrowUpDown size={12} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    {isFetching
                      ? 'Cargando registros desde Google Sheets...'
                      : 'No hay registros que coincidan con los filtros seleccionados (—)'}
                  </td>
                </tr>
              ) : (
                paginatedRows.map(row => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {row.fechaLabel || '—'}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => togglePlaca(row.placa)}
                        className="font-mono font-bold text-[#0D2B4E] hover:text-[#E0A800] cursor-pointer"
                        title="Filtrar por esta placa"
                      >
                        {row.placa || '—'}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-800">
                      {row.conductorNorm ? (
                        <button
                          type="button"
                          onClick={() => toggleConductor(row.conductorNorm)}
                          className="text-left hover:text-[#0D2B4E] hover:underline cursor-pointer"
                          title="Filtrar por este conductor"
                        >
                          {row.conductorDisplay}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {row.conductorAsignado}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      {row.adhiere ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                          <CheckCircle2 size={12} />
                          <span>Adhiere</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 font-bold text-[11px]">
                          <XCircle size={12} />
                          <span>No adhiere</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {tableRows.length > 0 && (
          <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <span className="font-mono tabular-nums">
              Mostrando {(safePage - 1) * itemsPerPage + 1}–
              {Math.min(safePage * itemsPerPage, tableRows.length)} de {tableRows.length}{' '}
              registros
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                aria-label="Página anterior"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="px-3 font-mono tabular-nums font-semibold">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                aria-label="Página siguiente"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdherenciaModule;
