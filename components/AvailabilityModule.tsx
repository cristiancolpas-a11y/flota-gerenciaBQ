import React, { useMemo, useState } from 'react';
import { AvailabilityRecord, AvailabilityPctRecord, FleetListRecord } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Truck, 
  Wrench, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Filter,
  RefreshCw,
  Search,
  Building2,
  Briefcase,
  Layers,
  ArrowUpDown,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Waves,
  Sparkles,
  Info,
  Check
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Legend, 
  ReferenceLine, 
  LabelList 
} from 'recharts';

interface AvailabilityDashboardProps {
  availability?: AvailabilityRecord[];
  availabilityPct?: AvailabilityPctRecord[];
  fleetBase?: FleetListRecord[];
  onRefresh?: () => Promise<void> | void;
  loading?: boolean;
}

// -------------------------------------------------------------
// MONTH & STRING NORMALIZATION
// -------------------------------------------------------------
export const MESES_FULL = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

export const MES_ABREV: Record<string, string> = {
  ENE: 'ENERO',
  FEB: 'FEBRERO',
  MAR: 'MARZO',
  ABR: 'ABRIL',
  MAY: 'MAYO',
  JUN: 'JUNIO',
  JUL: 'JULIO',
  AGO: 'AGOSTO',
  SEP: 'SEPTIEMBRE',
  SEPT: 'SEPTIEMBRE',
  OCT: 'OCTUBRE',
  NOV: 'NOVIEMBRE',
  DIC: 'DICIEMBRE'
};

export const normMes = (s?: any): string => {
  if (!s) return '';
  const u = String(s).trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (MESES_FULL.includes(u)) return u;
  if (MES_ABREV[u]) return MES_ABREV[u];
  return u;
};

export const getRecordMes = (r: { mes?: string; fecha?: string }): string => {
  if (r.mes) {
    const n = normMes(r.mes);
    if (n) return n;
  }
  if (r.fecha) {
    const d = new Date(r.fecha.includes('T') ? r.fecha : r.fecha + 'T12:00:00');
    if (!isNaN(d.getTime())) {
      return MESES_FULL[d.getMonth()];
    }
  }
  return '';
};

// Brand Colors (Esquema Azul Oscuro y Dorado corporativo)
export const PALETTE = {
  azulOscuro: '#0D2B4E',
  azulMedio: '#1E3A5F',
  azulClaro: '#3E5A78',
  azulSuave: '#5B7A9E',
  dorado: '#E0A800',
  doradoHover: '#F59E0B',
  doradoClaro: '#FEF3C7',
  verde: '#10B981',
  verdeBg: '#DCFCE7',
  rojo: '#EF4444',
  rojoBg: '#FEE2E2',
  grisTexto: '#64748B',
  grisOscuro: '#0F172A',
  bordeSuave: '#E2E8F0',
  fondoGris: '#F8FAFC',
  blanco: '#FFFFFF',
};

export const normCd = (s?: any): string => {
  if (!s) return '';
  const u = String(s).trim().toUpperCase();
  if (u.includes('GALAPA')) return 'GALAPA';
  if (u.includes('ARENOSA')) return 'LA ARENOSA';
  return u;
};

export const normSemana = (s?: any): string => {
  if (!s) return '';
  const str = String(s).toUpperCase().trim();
  const digits = str.replace(/\D/g, '');
  if (digits) {
    return `S${parseInt(digits, 10)}`;
  }
  return str;
};

export const normalizePlate = (s?: any): string => {
  if (!s) return '';
  return String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
};

const CD_COLORS: Record<string, string> = {
  'GALAPA': '#0D2B4E',
  'LA ARENOSA': '#E0A800',
  'ARENOSA': '#E0A800',
  'OTRO': '#64748B'
};

const STREAM_PALETTE = [
  '#0D2B4E', // Azul corporativo
  '#E0A800', // Dorado primario
  '#2563EB', // Azul vibrante
  '#F59E0B', // Ámbar dorado
  '#0D9488', // Verde azulado
  '#7C3AED', // Púrpura elegante
  '#EA580C', // Naranja terracota
  '#B8860B', // Bronce / Oro viejo
  '#64748B'  // Pizarra neutro
];

// Helper para calcular un dominio dinámico y seguro que NUNCA recorte las barras ni corte los números en la cima
const getSafePercentDomain = (values: (number | null | undefined)[], fallbackMin = 70): [number, number] => {
  const valid = values.filter((v): v is number => typeof v === 'number' && !isNaN(v) && v >= 0);
  if (valid.length === 0) return [0, 105];
  const min = Math.min(...valid);
  // Dejar 5-10% de espacio abajo
  const calculatedMin = Math.max(0, Math.floor((min - 5) / 5) * 5);
  const chosenMin = Math.min(calculatedMin, fallbackMin);
  return [chosenMin, 105]; // 105 da margen exacto para la etiqueta 100% arriba
};

export const AvailabilityModule: React.FC<AvailabilityDashboardProps> = ({
  availability = [],
  availabilityPct = [],
  onRefresh,
  loading = false
}) => {
  // ---------------------------------------------------------------------------
  // 1. ESTADO MULTIFILTRO UNIFICADO
  // ---------------------------------------------------------------------------
  const [filters, setFilters] = useState<{
    cd: string;
    mes: string;
    semana: string;
    contratista: string;
    sistema: string;
    placa: string;
    excluirFinRentin: boolean;
  }>({
    cd: 'all',
    mes: 'all',
    semana: 'all',
    contratista: 'all',
    sistema: 'all',
    placa: 'all',
    excluirFinRentin: true,
  });

  // Variables y setters sincronizados con el objeto filters
  const filterCd = filters.cd === 'all' ? 'TODOS' : filters.cd;
  const filterMes = filters.mes === 'all' ? 'TODOS' : filters.mes;
  const filterSemana = filters.semana === 'all' ? 'TODOS' : filters.semana;
  const filterContratista = filters.contratista === 'all' ? 'TODOS' : filters.contratista;
  const filterSistema = filters.sistema === 'all' ? 'TODOS' : filters.sistema;
  const searchPlaca = filters.placa === 'all' ? '' : filters.placa;
  const excluirFinRentin = filters.excluirFinRentin;

  const setFilterCd = (val: string) => setFilters(prev => ({ ...prev, cd: (!val || val === 'TODOS' || val === 'all') ? 'all' : val }));
  const setFilterMes = (val: string) => setFilters(prev => ({ ...prev, mes: (!val || val === 'TODOS' || val === 'all') ? 'all' : val }));
  const setFilterSemana = (val: string) => setFilters(prev => ({ ...prev, semana: (!val || val === 'TODOS' || val === 'all') ? 'all' : val }));
  const setFilterContratista = (val: string) => setFilters(prev => ({ ...prev, contratista: (!val || val === 'TODOS' || val === 'all') ? 'all' : val }));
  const setFilterSistema = (val: string) => setFilters(prev => ({ ...prev, sistema: (!val || val === 'TODOS' || val === 'all') ? 'all' : val }));
  const setSearchPlaca = (val: string) => setFilters(prev => ({ ...prev, placa: (!val || val.trim() === '' || val === 'all') ? 'all' : val.trim() }));
  const setExcluirFinRentin = (valOrFn: any) => setFilters(prev => ({ ...prev, excluirFinRentin: typeof valOrFn === 'function' ? valOrFn(prev.excluirFinRentin) : !!valOrFn }));

  // Sub-chart view modes
  const [cdViewMode, setCdViewMode] = useState<'consolidado' | 'por_mes'>('consolidado');
  const [contractorViewMode, setContractorViewMode] = useState<'consolidado' | 'por_mes'>('consolidado');
  const [streamTimeMode, setStreamTimeMode] = useState<'semanal' | 'mensual'>('semanal');
  const [streamStackType, setStreamStackType] = useState<'stacked' | 'silhouette'>('stacked');

  // Tabla detalle: búsqueda interna, orden y paginación
  const [tableSearchPlate, setTableSearchPlate] = useState<string>('');
  const [tableSortDesc, setTableSortDesc] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);

  // Helper: detectar FIN RENTIN
  const isFinRentin = (c?: string) => {
    if (!c) return false;
    const norm = c.toUpperCase().trim();
    return norm.startsWith('FIN RENTIN');
  };

  // Helper para normalizar fecha (YYYY-MM-DD)
  const normFecha = (f?: any): string => {
    if (!f) return '';
    const s = String(f).trim();
    if (s.includes('T')) return s.split('T')[0];
    if (s.includes(' ')) return s.split(' ')[0];
    const parts = s.split(/[\/\-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return s;
  };

  // Clave dinámica para activar transiciones suaves de Recharts en cada cambio de filtro
  const filterKey = `${filters.cd}-${filters.mes}-${filters.semana}-${filters.contratista}-${filters.sistema}-${filters.placa}-${filters.excluirFinRentin}`;

  // ---------------------------------------------------------------------------
  // 2. TOGGLE HANDLER (Hacer clic en cualquier barra = alternar filtro)
  // ---------------------------------------------------------------------------
  const handleToggleFilter = (
    type: 'cd' | 'mes' | 'semana' | 'contratista' | 'sistema' | 'placa',
    value: string
  ) => {
    setCurrentPage(1);
    setFilters(prev => {
      switch (type) {
        case 'cd': {
          const isSame = prev.cd !== 'all' && normCd(prev.cd) === normCd(value);
          return { ...prev, cd: isSame ? 'all' : value };
        }
        case 'mes': {
          const isSame = prev.mes !== 'all' && normMes(prev.mes) === normMes(value);
          return { ...prev, mes: isSame ? 'all' : value };
        }
        case 'semana': {
          const isSame = prev.semana !== 'all' && normSemana(prev.semana) === normSemana(value);
          return { ...prev, semana: isSame ? 'all' : value };
        }
        case 'contratista': {
          const isSame = prev.contratista !== 'all' && (prev.contratista || '').toUpperCase().trim() === (value || '').toUpperCase().trim();
          return { ...prev, contratista: isSame ? 'all' : value };
        }
        case 'sistema': {
          const isSame = prev.sistema !== 'all' && (prev.sistema || '').toUpperCase().trim() === (value || '').toUpperCase().trim();
          return { ...prev, sistema: isSame ? 'all' : value };
        }
        case 'placa': {
          const isSame = prev.placa !== 'all' && normalizePlate(prev.placa) === normalizePlate(value);
          return { ...prev, placa: isSame ? 'all' : value };
        }
        default:
          return prev;
      }
    });
  };

  const handleResetFilters = () => {
    setFilters({
      cd: 'all',
      mes: 'all',
      semana: 'all',
      contratista: 'all',
      sistema: 'all',
      placa: 'all',
      excluirFinRentin: true,
    });
    setTableSearchPlate('');
    setCurrentPage(1);
  };

  const hasActiveFilters = 
    filters.cd !== 'all' || 
    filters.mes !== 'all' || 
    filters.semana !== 'all' || 
    filters.contratista !== 'all' || 
    filters.sistema !== 'all' || 
    filters.placa !== 'all' || 
    !filters.excluirFinRentin ||
    tableSearchPlate.trim() !== '';

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.cd !== 'all') count++;
    if (filters.mes !== 'all') count++;
    if (filters.semana !== 'all') count++;
    if (filters.contratista !== 'all') count++;
    if (filters.sistema !== 'all') count++;
    if (filters.placa !== 'all') count++;
    if (!filters.excluirFinRentin) count++;
    return count;
  }, [filters]);

  // ---------------------------------------------------------------------------
  // 3. OPCIONES ÚNICAS DISPONIBLES PARA LOS SELECTORES
  // ---------------------------------------------------------------------------
  const availableCds = useMemo(() => {
    const set = new Set<string>(['GALAPA', 'LA ARENOSA']);
    availabilityPct.forEach(r => { const c = normCd(r.cd); if (c) set.add(c); });
    availability.forEach(r => { const c = normCd(r.cd); if (c) set.add(c); });
    const fixedOrder = ['GALAPA', 'LA ARENOSA'];
    return Array.from(set).sort((a, b) => {
      const idxA = fixedOrder.indexOf(a);
      const idxB = fixedOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.localeCompare(b);
    });
  }, [availabilityPct, availability]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    availabilityPct.forEach(r => { 
      const m = normMes(r.mes || getRecordMes(r));
      if (m) set.add(m); 
    });
    availability.forEach(r => { 
      const m = normMes(r.mes || getRecordMes(r));
      if (m) set.add(m); 
    });
    return Array.from(set).sort((a, b) => {
      const idxA = MESES_FULL.indexOf(a);
      const idxB = MESES_FULL.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.localeCompare(b);
    });
  }, [availabilityPct, availability]);

  const availableWeeks = useMemo(() => {
    const set = new Set<string>();
    const targetMes = filters.mes !== 'all' ? normMes(filters.mes) : null;
    
    availabilityPct.forEach(r => { 
      const rMes = normMes(r.mes || getRecordMes(r));
      if (!targetMes || rMes === targetMes) {
        const s = normSemana(r.semana);
        if (s) set.add(s);
      }
    });
    availability.forEach(r => { 
      const rMes = normMes(r.mes || getRecordMes(r));
      if (!targetMes || rMes === targetMes) {
        const s = normSemana(r.semana);
        if (s) set.add(s);
      }
    });

    return Array.from(set).filter(Boolean).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
  }, [availabilityPct, availability, filters.mes]);

  const availableContractors = useMemo(() => {
    const set = new Set<string>();
    availabilityPct.forEach(r => {
      const c = r.contratista || (r as any).contractor;
      if (c && (!filters.excluirFinRentin || !isFinRentin(c))) {
        set.add(c.trim().toUpperCase());
      }
    });
    availability.forEach(r => {
      const c = r.contratista || (r as any).contractor;
      if (c && (!filters.excluirFinRentin || !isFinRentin(c))) {
        set.add(c.trim().toUpperCase());
      }
    });
    return Array.from(set).filter(Boolean).sort();
  }, [availabilityPct, availability, filters.excluirFinRentin]);

  const availableSystems = useMemo(() => {
    const set = new Set<string>();
    availability.forEach(r => { 
      if (r.sistema) set.add(r.sistema.toUpperCase().trim()); 
    });
    return Array.from(set).filter(Boolean).sort();
  }, [availability]);

  // ---------------------------------------------------------------------------
  // 4. HELPERS DE FILTRADO UNIFICADOS Y CRUCE POR SISTEMA / PLACA
  // ---------------------------------------------------------------------------
  
  // --- Multifiltro unificado: claves fecha|CD que cumplen sistema/placa ---
  const clavesSistemaPlaca = useMemo(() => {
    if (filters.sistema === 'all' && filters.placa === 'all') return null; // sin restricción
    const set = new Set<string>();
    const cleanPlaca = filters.placa !== 'all' ? normalizePlate(filters.placa) : '';
    (availability || []).forEach(r => {
      if (filters.excluirFinRentin && isFinRentin(r.contratista)) return;
      if (filters.sistema !== 'all' && (r.sistema || '').toUpperCase().trim() !== filters.sistema.toUpperCase().trim()) return;
      if (cleanPlaca) {
        const p1 = normalizePlate(r.placa);
        const p2 = normalizePlate(r.placasKey);
        if (!p1.includes(cleanPlaca) && !p2.includes(cleanPlaca)) return;
      }
      const f = normFecha(r.fecha);
      const cd = normCd(r.cd);
      if (f && cd) {
        set.add(`${f}|${cd}`);
      }
      if (r.fecha && cd) {
        set.add(`${r.fecha}|${cd}`);
      }
    });
    return set;
  }, [availability, filters.sistema, filters.placa, filters.excluirFinRentin]);

  // Aplica TODOS los filtros a una fila de availabilityPct. opts ignora SOLO el eje propio de la gráfica.
  const pctPasa = (
    r: any,
    opts: { ignoreCd?: boolean; ignoreMes?: boolean; ignoreSemana?: boolean; ignoreContratista?: boolean } = {}
  ) => {
    if (filters.excluirFinRentin && isFinRentin(r.contratista)) return false;
    if (!opts.ignoreCd && filters.cd !== 'all' && normCd(r.cd) !== normCd(filters.cd)) return false;
    if (!opts.ignoreMes && filters.mes !== 'all' && normMes(r.mes || getRecordMes(r)) !== normMes(filters.mes)) return false;
    if (!opts.ignoreSemana && filters.semana !== 'all' && normSemana(r.semana) !== normSemana(filters.semana)) return false;
    if (!opts.ignoreContratista && filters.contratista !== 'all' && (r.contratista || '').toUpperCase().trim() !== filters.contratista.toUpperCase().trim()) return false;
    if (clavesSistemaPlaca) {
      const f = normFecha(r.fecha);
      const cd = normCd(r.cd);
      if (!clavesSistemaPlaca.has(`${f}|${cd}`) && !clavesSistemaPlaca.has(`${r.fecha}|${cd}`)) return false;
    }
    return true;
  };

  // Aplica TODOS los filtros a una fila de intervenciones crudas
  const intervencionPasa = (
    r: any,
    opts: { ignoreCd?: boolean; ignoreMes?: boolean; ignoreSemana?: boolean; ignoreContratista?: boolean; ignoreSistema?: boolean; ignorePlaca?: boolean } = {}
  ) => {
    if (filters.excluirFinRentin && isFinRentin(r.contratista)) return false;
    if (!opts.ignoreCd && filters.cd !== 'all' && normCd(r.cd) !== normCd(filters.cd)) return false;
    if (!opts.ignoreMes && filters.mes !== 'all' && normMes(r.mes || getRecordMes(r)) !== normMes(filters.mes)) return false;
    if (!opts.ignoreSemana && filters.semana !== 'all' && normSemana(r.semana) !== normSemana(filters.semana)) return false;
    if (!opts.ignoreContratista && filters.contratista !== 'all' && (r.contratista || '').toUpperCase().trim() !== filters.contratista.toUpperCase().trim()) return false;
    if (!opts.ignoreSistema && filters.sistema !== 'all' && (r.sistema || '').toUpperCase().trim() !== filters.sistema.toUpperCase().trim()) return false;
    if (!opts.ignorePlaca && filters.placa !== 'all') {
      const clean = normalizePlate(filters.placa);
      const p1 = normalizePlate(r.placa);
      const p2 = normalizePlate(r.placasKey);
      if (!p1.includes(clean) && !p2.includes(clean)) return false;
    }
    return true;
  };

  // A) Intervenciones filtradas (con todos los criterios activos)
  const filteredInterventions = useMemo(() => {
    return (availability || []).filter(item => intervencionPasa(item));
  }, [availability, filters]);

  // B) Resumen % Disponibilidad filtrado y sincronizado (con todos los criterios activos)
  const filteredPctRecords = useMemo(
    () => (availabilityPct || []).filter(r => pctPasa(r)),
    [availabilityPct, filters, clavesSistemaPlaca]
  );

  // ---------------------------------------------------------------------------
  // 5. CÁLCULOS KPI AGREGADOS (RESPONDE A TODOS LOS FILTROS)
  // ---------------------------------------------------------------------------
  const kpiStats = useMemo(() => {
    const dailyMap: Record<string, { total: number; disp: number; indisp: number }> = {};
    let sumTotalAll = 0;
    let sumDispAll = 0;
    let sumIndispAll = 0;

    if (filteredPctRecords.length > 0) {
      filteredPctRecords.forEach(r => {
        if (!r.fecha) return;
        if (!dailyMap[r.fecha]) {
          dailyMap[r.fecha] = { total: 0, disp: 0, indisp: 0 };
        }
        const t = r.total || 0;
        const d = r.disponibles || 0;
        const ind = r.indisponibles || 0;
        dailyMap[r.fecha].total += t;
        dailyMap[r.fecha].disp += d;
        dailyMap[r.fecha].indisp += ind;
        sumTotalAll += t;
        sumDispAll += d;
        sumIndispAll += ind;
      });
    } else if (filteredInterventions.length > 0) {
      // Respaldo desde intervenciones crudas agrupadas por día
      filteredInterventions.forEach(r => {
        if (!r.fecha) return;
        if (!dailyMap[r.fecha]) {
          dailyMap[r.fecha] = { total: 0, disp: 0, indisp: 0 };
        }
        const t = r.totalVH || ((r.vehiculosDisponibles || 0) + (r.vehiculoIndisponible || 0)) || 0;
        const d = r.vehiculosDisponibles || 0;
        const ind = r.vehiculoIndisponible || (r.placa ? 1 : 0);
        dailyMap[r.fecha].total += t;
        dailyMap[r.fecha].disp += d;
        dailyMap[r.fecha].indisp += ind;
        sumTotalAll += t;
        sumDispAll += d;
        sumIndispAll += ind;
      });
    }

    const dayKeys = Object.keys(dailyMap).sort();
    const activeDayKeys = dayKeys.filter(k => dailyMap[k].total > 0);
    const numActiveDays = activeDayKeys.length > 0 ? activeDayKeys.length : Math.max(1, dayKeys.length);

    const avgFlotaTotal = Math.round(activeDayKeys.reduce((acc, k) => acc + dailyMap[k].total, 0) / numActiveDays) || 0;
    const avgDisponibles = Math.round(activeDayKeys.reduce((acc, k) => acc + dailyMap[k].disp, 0) / numActiveDays) || 0;
    const avgIndisponibles = Math.round(activeDayKeys.reduce((acc, k) => acc + dailyMap[k].indisp, 0) / numActiveDays) || 0;

    const tasaOperativa = sumTotalAll > 0 ? Number(((sumDispAll / sumTotalAll) * 100).toFixed(1)) : 0;
    const tasaIndisponibilidad = Number((100 - tasaOperativa).toFixed(1));

    const lastActiveDay = activeDayKeys[activeDayKeys.length - 1];
    const lastActiveFleet = lastActiveDay ? dailyMap[lastActiveDay].total : 0;

    return {
      tasaOperativa,
      tasaIndisponibilidad,
      avgFlotaTotal,
      avgDisponibles,
      avgIndisponibles,
      lastActiveFleet,
      totalDias: dayKeys.length,
      totalIntervenciones: filteredInterventions.length
    };
  }, [filteredPctRecords, filteredInterventions]);

  // ---------------------------------------------------------------------------
  // 6. DATOS DE GRÁFICAS TOTALMENTE CONECTADAS
  // ---------------------------------------------------------------------------

  // A) MENSUAL: agrupa por mes -> ignora SOLO mes, aplica TODOS los demás filtros
  const monthlyData = useMemo(() => {
    const records = (availabilityPct || []).filter(r => pctPasa(r, { ignoreMes: true }));
    const map: Record<string, { total: number; disp: number }> = {};

    if (records.length > 0) {
      records.forEach(r => {
        const m = normMes(r.mes || getRecordMes(r));
        if (!m) return;
        if (!map[m]) map[m] = { total: 0, disp: 0 };
        map[m].total += r.total || 0;
        map[m].disp += r.disponibles || 0;
      });
    } else {
      // Respaldo desde intervenciones crudas ignorando mes
      const rawRecords = (availability || []).filter(r => intervencionPasa(r, { ignoreMes: true }));
      rawRecords.forEach(r => {
        const m = normMes(r.mes || getRecordMes(r));
        if (!m) return;
        if (!map[m]) map[m] = { total: 0, disp: 0 };
        const t = r.totalVH || ((r.vehiculosDisponibles || 0) + (r.vehiculoIndisponible || 0)) || 1;
        const d = r.vehiculosDisponibles || 0;
        map[m].total += t;
        map[m].disp += d;
      });
    }

    // Asegurar los 12 meses ordenados
    return MESES_FULL.map(m => {
      const item = map[m];
      const hasData = item && item.total > 0;
      const pct = hasData ? Number(((item.disp / item.total) * 100).toFixed(1)) : null;
      return {
        name: m,
        label: m.slice(0, 3),
        fullLabel: m,
        disponibilidad: pct,
        hasData,
        total: item?.total || 0,
        disponibles: item?.disp || 0
      };
    });
  }, [availabilityPct, filters, clavesSistemaPlaca, availability]);

  const monthlyDomain = useMemo(() => {
    return getSafePercentDomain(monthlyData.map(d => d.disponibilidad), 70);
  }, [monthlyData]);

  // B) SEMANAL: agrupa por semana -> ignora SOLO semana, aplica TODOS los demás filtros
  const weeklyData = useMemo(() => {
    const records = (availabilityPct || []).filter(r => pctPasa(r, { ignoreSemana: true }));
    const map: Record<string, { total: number; disp: number; mes: string }> = {};

    if (records.length > 0) {
      records.forEach(r => {
        const w = normSemana(r.semana) || 'S1';
        const m = normMes(r.mes || getRecordMes(r));
        if (!map[w]) map[w] = { total: 0, disp: 0, mes: m };
        map[w].total += r.total || 0;
        map[w].disp += r.disponibles || 0;
        if (!map[w].mes && m) map[w].mes = m;
      });
    } else {
      // Respaldo desde intervenciones crudas ignorando semana
      const rawRecords = (availability || []).filter(r => intervencionPasa(r, { ignoreSemana: true }));
      rawRecords.forEach(r => {
        const w = normSemana(r.semana) || 'S1';
        const m = normMes(r.mes || getRecordMes(r));
        if (!map[w]) map[w] = { total: 0, disp: 0, mes: m };
        const t = r.totalVH || ((r.vehiculosDisponibles || 0) + (r.vehiculoIndisponible || 0)) || 1;
        const d = r.vehiculosDisponibles || 0;
        map[w].total += t;
        map[w].disp += d;
        if (!map[w].mes && m) map[w].mes = m;
      });
    }

    return Object.keys(map).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    }).map(w => {
      const item = map[w];
      const pct = item.total > 0 ? Number(((item.disp / item.total) * 100).toFixed(1)) : 0;
      return {
        name: w,
        label: w,
        disponibilidad: pct,
        mes: item.mes || '',
        total: item.total,
        disponibles: item.disp
      };
    });
  }, [availabilityPct, filters, clavesSistemaPlaca, availability]);

  const weeklyDomain = useMemo(() => {
    return getSafePercentDomain(weeklyData.map(d => d.disponibilidad), 70);
  }, [weeklyData]);

  // C) CENTRO DE DISTRIBUCIÓN (CD): agrupa por CD -> ignora SOLO CD, aplica TODOS los demás filtros
  const cdData = useMemo(() => {
    const records = (availabilityPct || []).filter(r => pctPasa(r, { ignoreCd: true }));
    const map: Record<string, { total: number; disp: number; dailyTotals: Record<string, number> }> = {
      'GALAPA': { total: 0, disp: 0, dailyTotals: {} },
      'LA ARENOSA': { total: 0, disp: 0, dailyTotals: {} }
    };

    if (records.length > 0) {
      records.forEach(r => {
        const cd = normCd(r.cd);
        if (!cd) return;
        if (!map[cd]) map[cd] = { total: 0, disp: 0, dailyTotals: {} };
        map[cd].total += r.total || 0;
        map[cd].disp += r.disponibles || 0;
        if (r.fecha) {
          map[cd].dailyTotals[r.fecha] = (map[cd].dailyTotals[r.fecha] || 0) + (r.total || 0);
        }
      });
    } else {
      // Respaldo desde intervenciones crudas ignorando CD
      const rawRecords = (availability || []).filter(r => intervencionPasa(r, { ignoreCd: true }));
      rawRecords.forEach(r => {
        const cd = normCd(r.cd);
        if (!cd) return;
        if (!map[cd]) map[cd] = { total: 0, disp: 0, dailyTotals: {} };
        const t = r.totalVH || ((r.vehiculosDisponibles || 0) + (r.vehiculoIndisponible || 0)) || 1;
        const d = r.vehiculosDisponibles || 0;
        map[cd].total += t;
        map[cd].disp += d;
        if (r.fecha) {
          map[cd].dailyTotals[r.fecha] = (map[cd].dailyTotals[r.fecha] || 0) + t;
        }
      });
    }

    const fixedOrder = ['GALAPA', 'LA ARENOSA'];
    return fixedOrder.map(cd => {
      const item = map[cd];
      const pct = item.total > 0 ? Number(((item.disp / item.total) * 100).toFixed(1)) : 0;
      const daysCount = Object.keys(item.dailyTotals).length || 1;
      const avgFlotaCd = item.total > 0 ? Math.round(item.total / daysCount) : 0;
      return {
        name: cd,
        cd,
        disponibilidad: pct,
        avgFlota: avgFlotaCd,
        total: item.total,
        disponibles: item.disp
      };
    });
  }, [availabilityPct, filters, clavesSistemaPlaca, availability]);

  const cdDomain = useMemo(() => {
    return getSafePercentDomain(cdData.map(d => d.disponibilidad), 60);
  }, [cdData]);

  // C.2) Desglose mensual de CD (Meses en X, Galapa vs La Arenosa) -> ignora CD y Mes
  const cdMonthlyBreakdown = useMemo(() => {
    const records = (availabilityPct || []).filter(r => pctPasa(r, { ignoreCd: true, ignoreMes: true }));
    const monthsMap: Record<string, { GALAPA: { disp: number; total: number }; ARENOSA: { disp: number; total: number } }> = {};

    records.forEach(r => {
      const m = normMes(r.mes || getRecordMes(r));
      if (!m) return;
      if (!monthsMap[m]) {
        monthsMap[m] = {
          GALAPA: { disp: 0, total: 0 },
          ARENOSA: { disp: 0, total: 0 }
        };
      }
      const cdNorm = normCd(r.cd);
      if (cdNorm === 'GALAPA') {
        monthsMap[m].GALAPA.disp += r.disponibles || 0;
        monthsMap[m].GALAPA.total += r.total || 0;
      } else if (cdNorm === 'LA ARENOSA') {
        monthsMap[m].ARENOSA.disp += r.disponibles || 0;
        monthsMap[m].ARENOSA.total += r.total || 0;
      }
    });

    return MESES_FULL.filter(m => Boolean(monthsMap[m])).map(m => {
      const g = monthsMap[m]?.GALAPA || { disp: 0, total: 0 };
      const a = monthsMap[m]?.ARENOSA || { disp: 0, total: 0 };
      const pctG = g.total > 0 ? Number(((g.disp / g.total) * 100).toFixed(1)) : 0;
      const pctA = a.total > 0 ? Number(((a.disp / a.total) * 100).toFixed(1)) : 0;
      return {
        name: m,
        mes: m,
        label: m.slice(0, 3),
        GALAPA: pctG,
        'LA ARENOSA': pctA
      };
    });
  }, [availabilityPct, filters, clavesSistemaPlaca]);

  // D) CONTRATISTAS: agrupa por contratista -> ignora SOLO contratista, aplica TODOS los demás filtros
  const contractorData = useMemo(() => {
    const records = (availabilityPct || []).filter(r => pctPasa(r, { ignoreContratista: true }));
    const map: Record<string, { total: number; disp: number; indisp: number }> = {};

    if (records.length > 0) {
      records.forEach(r => {
        const c = (r.contratista || 'SIN ESPECIFICAR').trim().toUpperCase();
        if (!map[c]) map[c] = { total: 0, disp: 0, indisp: 0 };
        map[c].total += r.total || 0;
        map[c].disp += r.disponibles || 0;
        map[c].indisp += r.indisponibles || 0;
      });
    } else {
      // Respaldo desde intervenciones crudas ignorando contratista
      const rawRecords = (availability || []).filter(r => intervencionPasa(r, { ignoreContratista: true }));
      rawRecords.forEach(r => {
        const c = (r.contratista || 'SIN ESPECIFICAR').trim().toUpperCase();
        if (!map[c]) map[c] = { total: 0, disp: 0, indisp: 0 };
        const t = r.totalVH || ((r.vehiculosDisponibles || 0) + (r.vehiculoIndisponible || 0)) || 1;
        const d = r.vehiculosDisponibles || 0;
        const ind = r.vehiculoIndisponible || 1;
        map[c].total += t;
        map[c].disp += d;
        map[c].indisp += ind;
      });
    }

    return Object.keys(map).map(c => {
      const item = map[c];
      const pct = item.total > 0 ? Number(((item.disp / item.total) * 100).toFixed(1)) : 0;
      return {
        name: c,
        contratista: c,
        disponibilidad: pct,
        indisponibles: item.indisp,
        total: item.total
      };
    }).sort((a, b) => b.disponibilidad - a.disponibilidad);
  }, [availabilityPct, filters, clavesSistemaPlaca, availability]);

  const contractorDomain = useMemo(() => {
    return getSafePercentDomain(contractorData.map(d => d.disponibilidad), 75);
  }, [contractorData]);

  // D.2) Desglose por Mes de Contratistas -> ignora Contratista y Mes
  const contractorMonthlyBreakdown = useMemo(() => {
    const records = (availabilityPct || []).filter(r => pctPasa(r, { ignoreContratista: true, ignoreMes: true }));
    const monthsMap: Record<string, Record<string, { disp: number; total: number }>> = {};
    const contractorsSet = new Set<string>();

    records.forEach(r => {
      const m = normMes(r.mes || getRecordMes(r));
      const c = (r.contratista || 'SIN ESPECIFICAR').trim().toUpperCase();
      if (!m || !c) return;
      contractorsSet.add(c);
      if (!monthsMap[m]) monthsMap[m] = {};
      if (!monthsMap[m][c]) monthsMap[m][c] = { disp: 0, total: 0 };
      monthsMap[m][c].disp += r.disponibles || 0;
      monthsMap[m][c].total += r.total || 0;
    });

    const activeContractors = Array.from(contractorsSet);

    const rows = MESES_FULL.filter(m => Boolean(monthsMap[m])).map(m => {
      const row: any = { name: m, mes: m, label: m.slice(0, 3) };
      activeContractors.forEach(c => {
        const item = monthsMap[m][c];
        row[c] = item && item.total > 0 ? Number(((item.disp / item.total) * 100).toFixed(1)) : null;
      });
      return row;
    });

    return { rows, contractors: activeContractors };
  }, [availabilityPct, filters, clavesSistemaPlaca]);

  // E) SISTEMAS MÁS INTERVENIDOS (STREAMGRAPH / ÁREA APILADA SUAVIZADA)
  // Aplica TODOS los filtros (CD, Mes, Semana, Contratista, Placa) ignorando SOLO Sistema
  const { streamData: systemStreamData, streamSystems, systemColorMap, totalStreamInterventions } = useMemo(() => {
    const baseInterventions = (availability || []).filter(item => intervencionPasa(item, { ignoreSistema: true }));

    const overallCounts: Record<string, number> = {};
    let totalInterv = 0;
    baseInterventions.forEach(r => {
      const s = (r.sistema || 'SIN ESPECIFICAR').toUpperCase().trim();
      overallCounts[s] = (overallCounts[s] || 0) + 1;
      totalInterv++;
    });

    const sortedSystems = Object.entries(overallCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([s]) => s);

    // Seleccionar los top 7 sistemas principales; agrupar el resto en OTROS garantizando sin duplicados
    const nonOtherSystems = sortedSystems.filter(s => s !== 'OTROS');
    const topSystems = nonOtherSystems.slice(0, 7);
    const hasOthers = sortedSystems.includes('OTROS') || nonOtherSystems.length > 7;
    const finalSystems = Array.from(new Set(hasOthers ? [...topSystems, 'OTROS'] : topSystems));

    const colorMap: Record<string, string> = {};
    finalSystems.forEach((sys, i) => {
      if (sys === 'OTROS') {
        colorMap[sys] = '#94A3B8';
      } else {
        colorMap[sys] = STREAM_PALETTE[i % STREAM_PALETTE.length];
      }
    });

    // Agrupar por periodo (semanal o mensual)
    const periodsMap: Record<string, any> = {};

    baseInterventions.forEach(r => {
      let periodKey = '';
      let sortKey = 0;

      if (streamTimeMode === 'mensual') {
        const m = normMes(r.mes || getRecordMes(r));
        if (!m) return;
        periodKey = m;
        const mIdx = MESES_FULL.indexOf(m);
        sortKey = mIdx !== -1 ? mIdx : 999;
      } else {
        const w = normSemana(r.semana) || 'S1';
        periodKey = w;
        sortKey = parseInt(periodKey.replace(/\D/g, ''), 10) || 0;
      }

      if (!periodsMap[periodKey]) {
        periodsMap[periodKey] = {
          periodo: periodKey,
          label: periodKey,
          _sortKey: sortKey,
          total: 0
        };
        finalSystems.forEach(s => {
          periodsMap[periodKey][s] = 0;
        });
      }

      const s = (r.sistema || 'SIN ESPECIFICAR').toUpperCase().trim();
      if (topSystems.includes(s)) {
        periodsMap[periodKey][s] = (periodsMap[periodKey][s] || 0) + 1;
      } else if (hasOthers) {
        periodsMap[periodKey]['OTROS'] = (periodsMap[periodKey]['OTROS'] || 0) + 1;
      }
      periodsMap[periodKey].total += 1;
    });

    const streamData = Object.values(periodsMap).sort((a: any, b: any) => a._sortKey - b._sortKey);

    return {
      streamData,
      streamSystems: finalSystems,
      systemColorMap: colorMap,
      totalStreamInterventions: totalInterv
    };
  }, [availability, filters, streamTimeMode]);

  // F) DÍAS EN TALLER (PERMANENCIA)
  const daysInShopStats = useMemo(() => {
    const cdDaysMap: Record<string, { totalDays: number; count: number }> = {
      'GALAPA': { totalDays: 0, count: 0 },
      'LA ARENOSA': { totalDays: 0, count: 0 }
    };
    const plateDaysMap: Record<string, { totalDays: number; count: number; cd: string }> = {};

    filteredInterventions.forEach(r => {
      let dias = 0;
      if (r.fechaIngreso && r.fechaEstimadaSalida) {
        const dIn = new Date(r.fechaIngreso.includes('T') ? r.fechaIngreso : r.fechaIngreso + 'T12:00:00');
        const dOut = new Date(r.fechaEstimadaSalida.includes('T') ? r.fechaEstimadaSalida : r.fechaEstimadaSalida + 'T12:00:00');
        if (!isNaN(dIn.getTime()) && !isNaN(dOut.getTime())) {
          const diff = Math.round((dOut.getTime() - dIn.getTime()) / (1000 * 3600 * 24));
          dias = diff >= 0 ? diff : 0;
        }
      } else if (typeof r.diasIndisponible === 'number' && r.diasIndisponible >= 0) {
        dias = r.diasIndisponible;
      }

      const cd = normCd(r.cd) || 'OTRO';
      if (!cdDaysMap[cd]) cdDaysMap[cd] = { totalDays: 0, count: 0 };
      cdDaysMap[cd].totalDays += dias;
      cdDaysMap[cd].count += 1;

      const pl = normalizePlate(r.placa || r.placasKey);
      if (pl) {
        if (!plateDaysMap[pl]) plateDaysMap[pl] = { totalDays: 0, count: 0, cd: r.cd };
        plateDaysMap[pl].totalDays += dias;
        plateDaysMap[pl].count += 1;
      }
    });

    const fixedOrder = ['GALAPA', 'LA ARENOSA'];
    const cdDaysList = Object.keys(cdDaysMap).sort((a, b) => {
      const idxA = fixedOrder.indexOf(a);
      const idxB = fixedOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.localeCompare(b);
    }).map(cd => {
      const item = cdDaysMap[cd];
      const avg = item.count > 0 ? Number((item.totalDays / item.count).toFixed(1)) : 0;
      return {
        name: cd,
        cd,
        promedioDias: avg,
        totalDias: item.totalDays,
        intervenciones: item.count
      };
    });

    const topPlatesDaysList = Object.keys(plateDaysMap)
      .map(pl => ({
        placa: pl,
        name: pl,
        diasAcumulados: plateDaysMap[pl].totalDays,
        intervenciones: plateDaysMap[pl].count,
        cd: plateDaysMap[pl].cd
      }))
      .sort((a, b) => b.diasAcumulados - a.diasAcumulados)
      .slice(0, 8);

    return {
      cdDaysList,
      topPlatesDaysList
    };
  }, [filteredInterventions]);

  // G) PLACAS MÁS INTERVENIDAS (TOP 15 VERTICAL)
  const plateInterventionsData = useMemo(() => {
    const map: Record<string, { count: number; cd: string; contractor: string }> = {};

    filteredInterventions.forEach(r => {
      const pl = normalizePlate(r.placa || r.placasKey);
      if (!pl) return;
      if (!map[pl]) map[pl] = { count: 0, cd: r.cd, contractor: r.contratista };
      map[pl].count += 1;
    });

    return Object.entries(map)
      .map(([placa, info]) => ({
        placa,
        name: placa,
        count: info.count,
        cd: info.cd,
        contractor: info.contractor
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [filteredInterventions]);

  // ---------------------------------------------------------------------------
  // 7. TABLA DE DETALLE INTERACTIVA CON BÚSQUEDA Y PAGINACIÓN
  // ---------------------------------------------------------------------------
  const tableRecords = useMemo(() => {
    let list = [...filteredInterventions];

    if (tableSearchPlate.trim()) {
      const q = tableSearchPlate.toUpperCase().trim();
      list = list.filter(r => 
        (r.placa || '').toUpperCase().includes(q) || 
        (r.placasKey || '').toUpperCase().includes(q) ||
        (r.detalle || '').toUpperCase().includes(q) ||
        (r.taller || '').toUpperCase().includes(q) ||
        (r.sistema || '').toUpperCase().includes(q) ||
        (r.contratista || '').toUpperCase().includes(q)
      );
    }

    list.sort((a, b) => {
      const dateA = a.fecha || '';
      const dateB = b.fecha || '';
      return tableSortDesc ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
    });

    return list;
  }, [filteredInterventions, tableSearchPlate, tableSortDesc]);

  const totalPages = Math.max(1, Math.ceil(tableRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return tableRecords.slice(start, start + itemsPerPage);
  }, [tableRecords, currentPage, itemsPerPage]);

  const exportTableToCSV = () => {
    if (tableRecords.length === 0) return;
    const headers = ['Fecha', 'Centro (CD)', 'Sistema', 'Detalle de Falla', 'Placa', 'Taller', 'Ingreso Taller', 'Salida Estimada', 'Contratista'];
    const rows = tableRecords.map(r => [
      `"${r.fecha || '—'}"`,
      `"${r.cd || '—'}"`,
      `"${r.sistema || '—'}"`,
      `"${(r.detalle || '—').replace(/"/g, '""')}"`,
      `"${r.placa || r.placasKey || '—'}"`,
      `"${r.taller || '—'}"`,
      `"${r.fechaIngreso || '—'}"`,
      `"${r.fechaEstimadaSalida || '—'}"`,
      `"${r.contratista || '—'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `disponibilidad_flota_intervenciones_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="availability-dashboard-root" className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-6 font-sans text-slate-800">
      
      {/* ============================================================== */}
      {/* 1. HEADER                                                      */}
      {/* ============================================================== */}
      <motion.div 
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#0D2B4E]/10 text-[#0D2B4E] rounded-xl border border-[#0D2B4E]/20">
              <Activity size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Disponibilidad de Flota
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Sparkles size={11} /> Interactiva
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500">
                Tablero analítico con filtros cruzados: selecciona cualquier barra, mes, contratista o sistema para actualizar todas las gráficas con animación
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {onRefresh && (
            <button
              onClick={() => onRefresh()}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0D2B4E] hover:bg-[#1E3A5F] text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Sincronizando...' : 'Actualizar datos'}</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* ============================================================== */}
      {/* 2. MULTIFILTER BAR                                             */}
      {/* ============================================================== */}
      <motion.div 
        layout
        className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <div className="p-1.5 bg-[#0D2B4E]/10 text-[#0D2B4E] rounded-lg">
              <Filter size={15} />
            </div>
            <span>Multifiltro Dinámico Conectado</span>
            <span className="text-[11px] font-normal text-slate-400">
              (Haz clic en cualquier gráfica o usa los selectores para filtrar en tiempo real)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Checkbox: Excluir FIN RENTIN */}
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={excluirFinRentin}
                onChange={e => {
                  setExcluirFinRentin(e.target.checked);
                  setCurrentPage(1);
                }}
                className="w-4 h-4 rounded border-slate-300 text-[#0D2B4E] focus:ring-[#0D2B4E] cursor-pointer"
              />
              <span>Excluir FIN RENTIN</span>
            </label>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition-all cursor-pointer active:scale-95"
              >
                <X size={13} />
                <span>Restablecer ({activeFiltersCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Dropdowns / Selectors */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* CD */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Centro (CD)</span>
              {filterCd !== 'TODOS' && <span className="text-[#0D2B4E] font-black">•</span>}
            </label>
            <select
              value={filterCd}
              onChange={e => {
                setFilterCd(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-medium outline-none transition-all cursor-pointer ${
                filterCd !== 'TODOS' 
                  ? 'bg-[#0D2B4E] text-white border border-[#0D2B4E] font-bold shadow-sm' 
                  : 'bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-[#0D2B4E]'
              }`}
            >
              <option value="TODOS" className="bg-white text-slate-800">Todos los CD</option>
              {availableCds.map((cd, i) => (
                <option key={`opt-cd-${cd}-${i}`} value={cd} className="bg-white text-slate-800">{cd}</option>
              ))}
            </select>
          </div>

          {/* Mes */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Mes</span>
              {filterMes !== 'TODOS' && <span className="text-[#E0A800] font-black">•</span>}
            </label>
            <select
              value={filterMes}
              onChange={e => {
                setFilterMes(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-medium outline-none transition-all cursor-pointer ${
                filterMes !== 'TODOS' 
                  ? 'bg-[#E0A800] text-slate-900 border border-[#E0A800] font-bold shadow-sm' 
                  : 'bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-[#0D2B4E]'
              }`}
            >
              <option value="TODOS" className="bg-white text-slate-800">Todos los meses</option>
              {availableMonths.map((m, i) => (
                <option key={`opt-mes-${m}-${i}`} value={m} className="bg-white text-slate-800">{m}</option>
              ))}
            </select>
          </div>

          {/* Semana */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Semana</span>
              {filterSemana !== 'TODOS' && <span className="text-[#0D2B4E] font-black">•</span>}
            </label>
            <select
              value={filterSemana}
              onChange={e => {
                setFilterSemana(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-medium outline-none transition-all cursor-pointer ${
                filterSemana !== 'TODOS' 
                  ? 'bg-[#0D2B4E] text-white border border-[#0D2B4E] font-bold shadow-sm' 
                  : 'bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-[#0D2B4E]'
              }`}
            >
              <option value="TODOS" className="bg-white text-slate-800">Todas las semanas</option>
              {availableWeeks.map((w, i) => (
                <option key={`opt-sem-${w}-${i}`} value={w} className="bg-white text-slate-800">{w}</option>
              ))}
            </select>
          </div>

          {/* Contratista */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Contratista</span>
              {filterContratista !== 'TODOS' && <span className="text-[#0D2B4E] font-black">•</span>}
            </label>
            <select
              value={filterContratista}
              onChange={e => {
                setFilterContratista(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-medium outline-none transition-all cursor-pointer ${
                filterContratista !== 'TODOS' 
                  ? 'bg-[#0D2B4E] text-white border border-[#0D2B4E] font-bold shadow-sm' 
                  : 'bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-[#0D2B4E]'
              }`}
            >
              <option value="TODOS" className="bg-white text-slate-800">Todos los contratistas</option>
              {availableContractors.map((c, i) => (
                <option key={`opt-cont-${c}-${i}`} value={c} className="bg-white text-slate-800">{c}</option>
              ))}
            </select>
          </div>

          {/* Sistema */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Sistema</span>
              {filterSistema !== 'TODOS' && <span className="text-[#0D2B4E] font-black">•</span>}
            </label>
            <select
              value={filterSistema}
              onChange={e => {
                setFilterSistema(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-medium outline-none transition-all cursor-pointer ${
                filterSistema !== 'TODOS' 
                  ? 'bg-[#0D2B4E] text-white border border-[#0D2B4E] font-bold shadow-sm' 
                  : 'bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-[#0D2B4E]'
              }`}
            >
              <option value="TODOS" className="bg-white text-slate-800">Todos los sistemas</option>
              {availableSystems.map((s, i) => (
                <option key={`opt-sys-${s}-${i}`} value={s} className="bg-white text-slate-800">{s}</option>
              ))}
            </select>
          </div>

          {/* Placa */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Placa</span>
              {Boolean(searchPlaca) && <span className="text-[#0D2B4E] font-black">•</span>}
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ej: ABC123"
                value={searchPlaca}
                onChange={e => {
                  setSearchPlaca(e.target.value.toUpperCase());
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-[#0D2B4E] outline-none uppercase transition-all"
              />
              {searchPlaca && (
                <button
                  onClick={() => {
                    setSearchPlaca('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Active Filter Chips with Animations */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Info size={12} /> Filtros activos:
            </span>
            <AnimatePresence>
              {filterCd !== 'TODOS' && (
                <motion.span 
                  key="chip-filter-cd"
                  initial={{ opacity: 0, scale: 0.8 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0D2B4E] text-white text-xs font-semibold shadow-xs"
                >
                  CD: {normCd(filterCd)}
                  <button onClick={() => setFilterCd('TODOS')} className="hover:text-amber-300 cursor-pointer"><X size={11} /></button>
                </motion.span>
              )}
              {filterMes !== 'TODOS' && (
                <motion.span 
                  key="chip-filter-mes"
                  initial={{ opacity: 0, scale: 0.8 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E0A800] text-slate-900 text-xs font-bold shadow-xs"
                >
                  Mes: {normMes(filterMes)}
                  <button onClick={() => setFilterMes('TODOS')} className="hover:text-white cursor-pointer"><X size={11} /></button>
                </motion.span>
              )}
              {filterSemana !== 'TODOS' && (
                <motion.span 
                  key="chip-filter-semana"
                  initial={{ opacity: 0, scale: 0.8 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-white text-xs font-semibold shadow-xs"
                >
                  Semana: {filterSemana}
                  <button onClick={() => setFilterSemana('TODOS')} className="hover:text-amber-300 cursor-pointer"><X size={11} /></button>
                </motion.span>
              )}
              {filterContratista !== 'TODOS' && (
                <motion.span 
                  key="chip-filter-contratista"
                  initial={{ opacity: 0, scale: 0.8 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-900 text-white text-xs font-semibold shadow-xs"
                >
                  Contratista: {filterContratista}
                  <button onClick={() => setFilterContratista('TODOS')} className="hover:text-amber-300 cursor-pointer"><X size={11} /></button>
                </motion.span>
              )}
              {filterSistema !== 'TODOS' && (
                <motion.span 
                  key="chip-filter-sistema"
                  initial={{ opacity: 0, scale: 0.8 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-700 text-white text-xs font-semibold shadow-xs"
                >
                  Sistema: {filterSistema}
                  <button onClick={() => setFilterSistema('TODOS')} className="hover:text-amber-300 cursor-pointer"><X size={11} /></button>
                </motion.span>
              )}
              {searchPlaca.trim() !== '' && (
                <motion.span 
                  key="chip-filter-placa"
                  initial={{ opacity: 0, scale: 0.8 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-600 text-white font-mono text-xs font-bold shadow-xs"
                >
                  Placa: {searchPlaca}
                  <button onClick={() => setSearchPlaca('')} className="hover:text-slate-900 cursor-pointer"><X size={11} /></button>
                </motion.span>
              )}
              {!hasActiveFilters && (
                <motion.span 
                  key="chip-filter-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-slate-400 text-xs italic"
                >
                  Todos los registros (Consolidado general)
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div className="text-[11px] font-medium text-slate-500">
            Mostrando {kpiStats.totalDias} días analizados • {kpiStats.totalIntervenciones} intervenciones en taller
          </div>
        </div>
      </motion.div>

      {/* ============================================================== */}
      {/* 3. TARJETAS KPI RESUMEN                                        */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: % Disponibilidad Ponderado */}
        <motion.div 
          key={`kpi-disp-${filterKey}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                % Disponibilidad promedio
              </p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1 font-mono tracking-tight">
                {kpiStats.tasaOperativa}%
              </h3>
            </div>
            <div className={`p-2.5 rounded-xl ${
              kpiStats.tasaOperativa >= 95 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              kpiStats.tasaOperativa >= 90 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 
              'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500 font-medium">Meta estándar: &ge; 95.0%</span>
            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
              kpiStats.tasaOperativa >= 95 ? 'bg-emerald-100 text-emerald-800' :
              kpiStats.tasaOperativa >= 90 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
            }`}>
              {kpiStats.tasaOperativa >= 95 ? 'Cumple meta' : 'En seguimiento'}
            </span>
          </div>
        </motion.div>

        {/* KPI 2: Flota Promedio Total */}
        <motion.div 
          key={`kpi-flota-${filterKey}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Flota promedio total
              </p>
              <h3 className="text-3xl font-extrabold text-[#0D2B4E] mt-1 font-mono tracking-tight">
                {kpiStats.avgFlotaTotal}
              </h3>
            </div>
            <div className="p-2.5 bg-slate-100 text-[#0D2B4E] rounded-xl border border-slate-200">
              <Truck size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Último corte activo</span>
            <span className="font-mono font-bold text-slate-800">{kpiStats.lastActiveFleet} vehíc.</span>
          </div>
        </motion.div>

        {/* KPI 3: Vehículos Disponibles (Promedio) */}
        <motion.div 
          key={`kpi-dispv-${filterKey}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Vehículos disponibles (prom.)
              </p>
              <h3 className="text-3xl font-extrabold text-emerald-700 mt-1 font-mono tracking-tight">
                {kpiStats.avgDisponibles}
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Tasa operativa ponderada</span>
            <span className="font-mono font-bold text-emerald-700">{kpiStats.tasaOperativa}%</span>
          </div>
        </motion.div>

        {/* KPI 4: Vehículos Indisponibles (Promedio) */}
        <motion.div 
          key={`kpi-indisp-${filterKey}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Vehículos indisponibles (prom.)
              </p>
              <h3 className="text-3xl font-extrabold text-red-600 mt-1 font-mono tracking-tight">
                {kpiStats.avgIndisponibles}
              </h3>
            </div>
            <div className="p-2.5 bg-red-50 text-red-600 rounded-xl border border-red-200">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Tasa de indisponibilidad</span>
            <span className="font-mono font-bold text-red-600">{kpiStats.tasaIndisponibilidad}%</span>
          </div>
        </motion.div>

      </div>

      {/* ============================================================== */}
      {/* 4. GRÁFICA MENSUAL (% DISPONIBILIDAD)                          */}
      {/* ============================================================== */}
      <motion.div 
        layout
        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar size={20} className="text-[#0D2B4E]" />
              Evolución mensual de % disponibilidad
            </h3>
            <p className="text-xs text-slate-500">
              Desglose mes a mes. Haz clic en cualquier barra de mes para filtrar todo el tablero o limpiar el filtro.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {filterMes !== 'TODOS' ? (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#E0A800] text-slate-900 text-xs font-bold border border-amber-400 shadow-xs flex items-center gap-1.5">
                  <Check size={12} /> Mes activo: {normMes(filterMes)}
                  <button
                    onClick={() => setFilterMes('TODOS')}
                    className="ml-1 text-slate-800 hover:text-black cursor-pointer font-black"
                  >
                    ×
                  </button>
                </span>
                <button
                  onClick={() => setFilterMes('TODOS')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Ver todos los meses
                </button>
              </div>
            ) : (
              <span className="text-xs font-semibold text-slate-400">
                Consolidado 12 meses
              </span>
            )}
          </div>
        </div>

        <div className="h-[360px] md:h-[390px] w-full pt-2">
          {monthlyData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl p-8 gap-2">
              <Calendar size={32} className="text-slate-300" />
              <span>No hay registros para la combinación de filtros seleccionada</span>
              <button 
                onClick={handleResetFilters}
                className="mt-2 text-xs font-bold text-[#0D2B4E] hover:underline cursor-pointer"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={monthlyData} 
                margin={{ top: 25, right: 25, left: -5, bottom: 20 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const item = e.activePayload[0].payload;
                    handleToggleFilter('mes', item.name);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: PALETTE.grisOscuro, fontWeight: 700 }}
                  axisLine={{ stroke: PALETTE.bordeSuave }}
                  interval={0}
                />
                <YAxis 
                  domain={monthlyDomain} 
                  tick={{ fontSize: 10, fill: PALETTE.grisTexto }}
                  unit="%"
                  axisLine={{ stroke: PALETTE.bordeSuave }}
                />
                <Tooltip 
                  formatter={(val: any) => [`${val !== null ? `${val}%` : 'Sin datos'}`, '% Disponibilidad']}
                  labelFormatter={(l) => `Mes: ${l}`}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}
                />
                <ReferenceLine 
                  y={95} 
                  stroke={PALETTE.dorado} 
                  strokeDasharray="4 4" 
                  strokeWidth={2} 
                  label={{ value: 'Meta: 95%', position: 'right', fill: '#B45309', fontSize: 10, fontWeight: 'bold' }} 
                />
                <Bar 
                  dataKey="disponibilidad" 
                  name="% Disponibilidad"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={56}
                  cursor="pointer"
                  isAnimationActive={true}
                  animationDuration={750}
                  animationEasing="ease-out"
                >
                  <LabelList 
                    dataKey="disponibilidad" 
                    position="top" 
                    formatter={(v: any) => (v !== null && v !== undefined) ? `${v}%` : ''}
                    style={{ fontSize: '11px', fontWeight: '800', fill: PALETTE.grisOscuro }} 
                  />
                  {monthlyData.map((entry, index) => {
                    const isSelected = normMes(filterMes) === normMes(entry.name);
                    const isAnyMonthFiltered = filterMes !== 'TODOS';
                    // Si hay mes filtrado, resaltar el seleccionado en dorado y suavizar los demás; si no, azul corporativo
                    const cellColor = isAnyMonthFiltered 
                      ? (isSelected ? PALETTE.dorado : '#94A3B8') 
                      : PALETTE.azulOscuro;
                    return (
                      <Cell 
                        key={`cell-month-${index}`} 
                        fill={cellColor} 
                        className="transition-colors duration-300 hover:opacity-85"
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* ============================================================== */}
      {/* 5. DISPONIBILIDAD SEMANAL (SINCRONIZADA CON EL MES Y FILTROS)  */}
      {/* ============================================================== */}
      <motion.div 
        layout
        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers size={18} className="text-[#0D2B4E]" />
              Disponibilidad semanal
            </h3>
            <p className="text-xs text-slate-500">
              {filterMes !== 'TODOS' 
                ? `Semanas correspondientes al corte de ${normMes(filterMes)}. Haz clic en una barra para filtrar.` 
                : 'Evolución semanal consolidada. Haz clic en cualquier barra de semana para filtrar.'}
            </p>
          </div>
          {filterSemana !== 'TODOS' && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#E0A800] text-slate-900 text-xs font-bold border border-amber-400 shadow-xs flex items-center gap-1.5">
                <Check size={12} /> Semana activa: {filterSemana}
                <button 
                  onClick={() => setFilterSemana('TODOS')}
                  className="text-slate-800 hover:text-black ml-1 cursor-pointer font-black"
                >
                  ×
                </button>
              </span>
            </div>
          )}
        </div>

        <div className="h-[340px] md:h-[370px] w-full pt-2">
          {weeklyData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl p-8 gap-2">
              <Layers size={32} className="text-slate-300" />
              <span>Sin registros para este corte semanal o filtro</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={weeklyData} 
                margin={{ top: 25, right: 20, left: -5, bottom: 10 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const item = e.activePayload[0].payload;
                    handleToggleFilter('semana', item.name);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: PALETTE.grisTexto, fontWeight: 700 }} />
                <YAxis domain={weeklyDomain} tick={{ fontSize: 11, fill: PALETTE.grisTexto }} unit="%" />
                <Tooltip 
                  formatter={(val: any, _: any, p: any) => [
                    `${val}% (${p.payload.mes || 'Semana'})`, 
                    '% Disponibilidad'
                  ]}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}
                />
                <ReferenceLine 
                  y={95} 
                  stroke={PALETTE.dorado} 
                  strokeDasharray="4 4" 
                  strokeWidth={2}
                  label={{ value: 'Meta: 95%', position: 'right', fill: '#B45309', fontSize: 10, fontWeight: 'bold' }}
                />
                <Bar 
                  dataKey="disponibilidad" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={42} 
                  cursor="pointer"
                  isAnimationActive={true}
                  animationDuration={750}
                  animationEasing="ease-out"
                >
                  <LabelList 
                    dataKey="disponibilidad" 
                    position="top" 
                    formatter={(v: any) => `${v}%`}
                    style={{ fontSize: '10px', fontWeight: '800', fill: PALETTE.grisOscuro }} 
                  />
                  {weeklyData.map((entry, index) => {
                    const isSelected = normSemana(filterSemana) === normSemana(entry.name);
                    const isAnyWeekFiltered = filterSemana !== 'TODOS';
                    const cellColor = isAnyWeekFiltered 
                      ? (isSelected ? PALETTE.dorado : '#94A3B8') 
                      : PALETTE.azulOscuro;
                    return (
                      <Cell 
                        key={`cell-week-${index}`} 
                        fill={cellColor} 
                        className="transition-colors duration-300 hover:opacity-85"
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* ============================================================== */}
      {/* 6. DISPONIBILIDAD POR CENTRO (CD) (GALAPA vs LA ARENOSA)       */}
      {/* ============================================================== */}
      <motion.div 
        layout
        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 size={18} className="text-[#0D2B4E]" />
              Disponibilidad por Centro (CD)
            </h3>
            <p className="text-xs text-slate-500">
              GALAPA (Azul) vs LA ARENOSA (Dorado) • Haz clic en una barra para alternar el filtro de CD
            </p>
          </div>

          <div className="flex items-center gap-2">
            {filterCd !== 'TODOS' && (
              <span className="px-3 py-1 rounded-full bg-[#0D2B4E] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs">
                <Check size={12} /> CD activo: {normCd(filterCd)}
                <button 
                  onClick={() => setFilterCd('TODOS')}
                  className="text-amber-300 hover:text-white ml-1 cursor-pointer font-black"
                >
                  ×
                </button>
              </span>
            )}

            {/* Toggle Consolidado / Por Mes */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setCdViewMode('consolidado')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  cdViewMode === 'consolidado' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Consolidado
              </button>
              <button
                onClick={() => setCdViewMode('por_mes')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  cdViewMode === 'por_mes' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Por Mes
              </button>
            </div>
          </div>
        </div>

        <div className="h-[340px] md:h-[370px] w-full pt-2">
          {cdViewMode === 'por_mes' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={cdMonthlyBreakdown} 
                margin={{ top: 25, right: 25, left: -5, bottom: 10 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const item = e.activePayload[0].payload;
                    if (item && item.mes) {
                      handleToggleFilter('mes', item.mes);
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: PALETTE.grisTexto, fontWeight: 700 }} />
                <YAxis domain={getSafePercentDomain([...cdMonthlyBreakdown.map(d => d.GALAPA), ...cdMonthlyBreakdown.map(d => d['LA ARENOSA'])], 70)} tick={{ fontSize: 11, fill: PALETTE.grisTexto }} unit="%" />
                <Tooltip 
                  formatter={(val: any, name: any) => [`${val}%`, name]}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />
                <ReferenceLine y={95} stroke={PALETTE.dorado} strokeDasharray="4 4" strokeWidth={1.5} />
                <Bar 
                  dataKey="GALAPA" 
                  name="GALAPA" 
                  fill="#0D2B4E" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={32} 
                  cursor="pointer" 
                  minPointSize={6}
                  isAnimationActive={true}
                  animationDuration={750}
                  animationEasing="ease-out"
                  onClick={(e: any) => {
                    e?.stopPropagation?.();
                    handleToggleFilter('cd', 'GALAPA');
                  }}
                >
                  <LabelList 
                    dataKey="GALAPA" 
                    position="top" 
                    formatter={(v: any) => v > 0 ? `${v}%` : ''}
                    style={{ fontSize: '10px', fontWeight: '700', fill: PALETTE.grisOscuro }} 
                  />
                </Bar>
                <Bar 
                  dataKey="LA ARENOSA" 
                  name="LA ARENOSA" 
                  fill="#E0A800" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={32} 
                  cursor="pointer" 
                  minPointSize={6}
                  isAnimationActive={true}
                  animationDuration={750}
                  animationEasing="ease-out"
                  onClick={(e: any) => {
                    e?.stopPropagation?.();
                    handleToggleFilter('cd', 'LA ARENOSA');
                  }}
                >
                  <LabelList 
                    dataKey="LA ARENOSA" 
                    position="top" 
                    formatter={(v: any) => v > 0 ? `${v}%` : ''}
                    style={{ fontSize: '10px', fontWeight: '700', fill: PALETTE.grisOscuro }} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={cdData} 
                margin={{ top: 25, right: 35, left: 10, bottom: 15 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const item = e.activePayload[0].payload;
                    handleToggleFilter('cd', item.name);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 13, fill: PALETTE.grisOscuro, fontWeight: 700 }} />
                <YAxis domain={cdDomain} tick={{ fontSize: 11, fill: PALETTE.grisTexto }} unit="%" />
                <Tooltip 
                  formatter={(val: any, _: any, p: any) => [
                    `${val}% (Flota prom: ${p.payload.avgFlota} vehíc.)`, 
                    '% Disponibilidad'
                  ]}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}
                />
                <ReferenceLine 
                  y={95} 
                  stroke={PALETTE.dorado} 
                  strokeDasharray="4 4" 
                  strokeWidth={2}
                  label={{ value: 'Meta: 95%', position: 'right', fill: '#B45309', fontSize: 11, fontWeight: 'bold' }}
                />
                <Bar 
                  dataKey="disponibilidad" 
                  radius={[8, 8, 0, 0]} 
                  maxBarSize={95} 
                  cursor="pointer" 
                  minPointSize={8}
                  isAnimationActive={true}
                  animationDuration={750}
                  animationEasing="ease-out"
                >
                  <LabelList 
                    dataKey="disponibilidad" 
                    position="top" 
                    formatter={(v: any) => `${v}%`}
                    style={{ fontSize: '13px', fontWeight: '800', fill: PALETTE.grisOscuro }} 
                  />
                  {cdData.map((entry, index) => {
                    const isSelected = normCd(filterCd) === normCd(entry.name);
                    const isFiltered = filterCd !== 'TODOS';
                    const baseColor = entry.name === 'GALAPA' ? PALETTE.azulOscuro : PALETTE.dorado;
                    const cellColor = isFiltered ? (isSelected ? PALETTE.dorado : '#94A3B8') : baseColor;
                    return (
                      <Cell 
                        key={`cell-cd-${index}`} 
                        fill={cellColor} 
                        className="transition-colors duration-300 hover:opacity-85"
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* ============================================================== */}
      {/* 7. DISPONIBILIDAD POR CONTRATISTA (CONECTADA)                  */}
      {/* ============================================================== */}
      <motion.div 
        layout
        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-2">
              <Briefcase size={18} className="text-[#0D2B4E]" />
              Disponibilidad por contratista
            </h3>
            <p className="text-xs text-slate-500">
              {filterMes !== 'TODOS' 
                ? `Corte en ${normMes(filterMes)}` 
                : 'Comparativo de % operativo por operador • Haz clic en cualquier barra para filtrar'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {filterContratista !== 'TODOS' && (
              <span className="px-3 py-1 rounded-full bg-[#E0A800] text-slate-900 text-xs font-bold border border-amber-400 shadow-xs flex items-center gap-1.5">
                <Check size={12} /> Contratista activo: {filterContratista}
                <button 
                  onClick={() => setFilterContratista('TODOS')}
                  className="text-slate-800 hover:text-black ml-1 cursor-pointer font-black"
                >
                  ×
                </button>
              </span>
            )}

            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setContractorViewMode('consolidado')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  contractorViewMode === 'consolidado' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Consolidado
              </button>
              <button
                onClick={() => setContractorViewMode('por_mes')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  contractorViewMode === 'por_mes' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Por Mes
              </button>
            </div>
          </div>
        </div>

        <div className="h-[360px] md:h-[400px] w-full pt-2">
          {contractorViewMode === 'por_mes' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={contractorMonthlyBreakdown.rows} 
                margin={{ top: 20, right: 20, left: -5, bottom: 10 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const item = e.activePayload[0].payload;
                    if (item && item.mes) {
                      handleToggleFilter('mes', item.mes);
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: PALETTE.grisTexto, fontWeight: 700 }} />
                <YAxis domain={[75, 105]} tick={{ fontSize: 10, fill: PALETTE.grisTexto }} unit="%" />
                <Tooltip 
                  formatter={(val: any, name: any) => [`${val}%`, name]}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                {contractorMonthlyBreakdown.contractors.map((c, i) => (
                  <Bar 
                    key={`bar-cont-month-${c}-${i}`} 
                    dataKey={c} 
                    name={c} 
                    fill={STREAM_PALETTE[i % STREAM_PALETTE.length]} 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={20} 
                    cursor="pointer"
                    isAnimationActive={true}
                    animationDuration={750}
                    animationEasing="ease-out"
                    onClick={(e: any) => {
                      e?.stopPropagation?.();
                      handleToggleFilter('contratista', c);
                    }}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={contractorData} 
                layout="vertical" 
                margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const item = e.activePayload[0].payload;
                    handleToggleFilter('contratista', item.name);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" domain={contractorDomain} tick={{ fontSize: 11, fill: PALETTE.grisTexto }} unit="%" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fontSize: 11, fill: PALETTE.grisOscuro, fontWeight: 700 }}
                  width={160}
                />
                <Tooltip 
                  formatter={(val: any, _: any, p: any) => [
                    `${val}% (Indisponibles acum: ${p.payload.indisponibles})`, 
                    '% Disponibilidad'
                  ]}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}
                />
                <ReferenceLine x={95} stroke={PALETTE.dorado} strokeDasharray="4 4" strokeWidth={1.5} />
                <Bar 
                  dataKey="disponibilidad" 
                  radius={[0, 8, 8, 0]} 
                  maxBarSize={28} 
                  cursor="pointer"
                  isAnimationActive={true}
                  animationDuration={750}
                  animationEasing="ease-out"
                >
                  <LabelList 
                    dataKey="disponibilidad" 
                    position="right" 
                    formatter={(v: any) => `${v}%`}
                    style={{ fontSize: '11px', fontWeight: '800', fill: PALETTE.grisOscuro }} 
                  />
                  {contractorData.map((entry, index) => {
                    const isSelected = filterContratista !== 'TODOS' && filterContratista.toUpperCase().trim() === entry.name.toUpperCase().trim();
                    const isAnyFiltered = filterContratista !== 'TODOS';
                    const cellColor = isAnyFiltered 
                      ? (isSelected ? PALETTE.dorado : '#94A3B8') 
                      : PALETTE.azulOscuro;
                    return (
                      <Cell 
                        key={`cell-cont-${index}`} 
                        fill={cellColor} 
                        className="transition-colors duration-300 hover:opacity-85"
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* ============================================================== */}
      {/* 8. SISTEMAS MÁS INTERVENIDOS (STREAMGRAPH / ÁREA APILADA)      */}
      {/* ============================================================== */}
      <motion.div 
        layout
        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-2">
              <Waves size={18} className="text-[#0D2B4E]" />
              Sistemas más intervenidos (Evolución temporal)
            </h3>
            <p className="text-xs text-slate-500">
              Evolución {streamTimeMode === 'semanal' ? 'semanal' : 'mensual'} por componente mecánico. Responde en vivo a CD, contratista o mes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {filterSistema !== 'TODOS' && (
              <span className="px-3 py-1 rounded-full bg-[#0D2B4E] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs">
                <Check size={12} /> Sistema: {filterSistema}
                <button 
                  onClick={() => setFilterSistema('TODOS')}
                  className="text-amber-400 hover:text-white ml-1 cursor-pointer font-black"
                >
                  ×
                </button>
              </span>
            )}

            {/* Agrupación temporal: Semanal vs Mensual */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setStreamTimeMode('semanal')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  streamTimeMode === 'semanal' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Semanal
              </button>
              <button
                onClick={() => setStreamTimeMode('mensual')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  streamTimeMode === 'mensual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Mensual
              </button>
            </div>

            {/* Estilo Área Apilada vs Silhouette */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setStreamStackType('stacked')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  streamStackType === 'stacked' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Área Apilada
              </button>
              <button
                onClick={() => setStreamStackType('silhouette')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  streamStackType === 'silhouette' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Stream Centrado
              </button>
            </div>
          </div>
        </div>

        {/* Gráfica AreaChart Streamgraph */}
        <div className="h-[380px] md:h-[430px] w-full pt-2">
          {systemStreamData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl p-8 gap-2">
              <Waves size={32} className="text-slate-300" />
              <span>Sin registros de intervenciones de sistemas para la selección actual</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={systemStreamData} 
                stackOffset={streamStackType === 'silhouette' ? 'silhouette' : undefined}
                margin={{ top: 20, right: 30, left: 10, bottom: 15 }}
                onClick={(e: any) => {
                  const p = e?.activePayload?.[0]?.payload;
                  if (p?.periodo) {
                    if (streamTimeMode === 'semanal') handleToggleFilter('semana', p.periodo);
                    else handleToggleFilter('mes', p.periodo);
                  }
                }}
              >
                <defs>
                  {streamSystems.map((sys, idx) => {
                    const color = systemColorMap[sys] || '#3E5A78';
                    const id = `grad-sys-${sys.replace(/[^a-zA-Z0-9]/g, '_')}-${idx}`;
                    return (
                      <linearGradient key={`grad-${sys}-${idx}`} id={id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.92}/>
                        <stop offset="95%" stopColor={color} stopOpacity={0.72}/>
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="periodo" 
                  tick={{ fontSize: 11, fill: PALETTE.grisTexto, fontWeight: 700 }}
                  axisLine={{ stroke: PALETTE.bordeSuave }}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: PALETTE.grisTexto }} 
                  axisLine={{ stroke: PALETTE.bordeSuave }}
                  tickFormatter={(v) => Math.abs(v).toString()}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', fontSize: '11px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}
                  formatter={(value: any, name: any) => [`${value} ingresos`, name]}
                  labelFormatter={(label) => `${streamTimeMode === 'semanal' ? 'Semana' : 'Mes'}: ${label}`}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  onClick={(e: any) => {
                    if (e && e.dataKey) {
                      handleToggleFilter('sistema', e.dataKey);
                    }
                  }}
                  formatter={(value) => (
                    <span className={`cursor-pointer transition-all ${filterSistema !== 'TODOS' && filterSistema !== value ? 'opacity-35' : 'font-extrabold text-slate-900'}`}>
                      {value}
                    </span>
                  )}
                />
                {streamSystems.map((sys, idx) => {
                  const color = systemColorMap[sys] || '#3E5A78';
                  const isSelected = filterSistema === sys;
                  const hasSysFilter = filterSistema !== 'TODOS';
                  const gradId = `grad-sys-${sys.replace(/[^a-zA-Z0-9]/g, '_')}-${idx}`;
                  return (
                    <Area
                      key={`area-sys-${sys}-${idx}`}
                      type="monotone"
                      dataKey={sys}
                      name={sys}
                      stackId="1"
                      stroke={color}
                      strokeWidth={isSelected ? 3.5 : 1.5}
                      fill={`url(#${gradId})`}
                      fillOpacity={!hasSysFilter || isSelected ? 0.92 : 0.2}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                      cursor="pointer"
                      isAnimationActive={true}
                      animationDuration={750}
                      animationEasing="ease-out"
                      onClick={(e: any) => {
                        e?.stopPropagation?.();
                        handleToggleFilter('sistema', sys);
                      }}
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Botones de filtro rápido interactivo por sistema */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            Componentes ({totalStreamInterventions} fallas analizadas):
          </span>
          {streamSystems.map((sys, idx) => {
            const color = systemColorMap[sys] || '#3E5A78';
            const isSelected = filterSistema === sys;
            return (
              <button
                key={`btn-sys-${sys}-${idx}`}
                onClick={() => handleToggleFilter('sistema', sys)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-[#0D2B4E] text-white shadow-sm ring-2 ring-amber-500 ring-offset-1 font-bold' 
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span>{sys}</span>
                {isSelected && <Check size={12} className="ml-0.5 text-amber-400" />}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ============================================================== */}
      {/* 9. DÍAS EN TALLER Y PLACAS MÁS INTERVENIDAS                    */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Días Indisponibles en Taller (Permanencia) */}
        <motion.div 
          layout
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4"
        >
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock size={16} className="text-[#0D2B4E]" />
                Días de permanencia en taller
              </h3>
              <p className="text-[11px] text-slate-500">
                (Fecha Salida Estimada) − (Fecha Ingreso) en días
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            
            {/* Promedio por CD */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Promedio por CD
              </span>
              <div className="h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={daysInShopStats.cdDaysList} 
                    margin={{ top: 20, right: 15, left: -15, bottom: 5 }}
                    onClick={(e: any) => {
                      if (e && e.activePayload && e.activePayload.length > 0) {
                        const item = e.activePayload[0].payload;
                        handleToggleFilter('cd', item.name);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: PALETTE.grisOscuro, fontWeight: 700 }} />
                    <YAxis tick={{ fontSize: 9, fill: PALETTE.grisTexto }} unit=" d" />
                    <Tooltip 
                      formatter={(val: any, _: any, p: any) => [
                        `${val} días prom. (${p.payload.totalDias} d en ${p.payload.intervenciones} ingresos)`, 
                        'Permanencia'
                      ]}
                      contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold', border: 'none' }}
                    />
                    <Bar 
                      dataKey="promedioDias" 
                      radius={[6, 6, 0, 0]} 
                      maxBarSize={44} 
                      cursor="pointer" 
                      minPointSize={4}
                      isAnimationActive={true}
                      animationDuration={750}
                      animationEasing="ease-out"
                    >
                      <LabelList 
                        dataKey="promedioDias" 
                        position="top" 
                        formatter={(v: any) => `${v} d`}
                        style={{ fontSize: '10px', fontWeight: '800', fill: PALETTE.grisOscuro }} 
                      />
                      {daysInShopStats.cdDaysList.map((entry, index) => {
                        const isSelected = normCd(filterCd) === normCd(entry.name);
                        const isFiltered = filterCd !== 'TODOS';
                        const baseColor = entry.name === 'GALAPA' ? PALETTE.azulOscuro : PALETTE.dorado;
                        const cellColor = isFiltered ? (isSelected ? PALETTE.dorado : '#94A3B8') : baseColor;
                        return (
                          <Cell 
                            key={`cell-cddays-${index}`} 
                            fill={cellColor} 
                            className="transition-colors duration-300 hover:opacity-85"
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Placas con más días */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Top placas en taller (días acum.)
              </span>
              <div className="h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={daysInShopStats.topPlatesDaysList.slice(0, 6)} 
                    layout="vertical" 
                    margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
                    onClick={(e: any) => {
                      if (e && e.activePayload && e.activePayload.length > 0) {
                        const item = e.activePayload[0].payload;
                        handleToggleFilter('placa', item.placa);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                    <XAxis type="number" tick={{ fontSize: 9, fill: PALETTE.grisTexto }} unit=" d" />
                    <YAxis 
                      dataKey="placa" 
                      type="category" 
                      tick={{ fontSize: 9, fill: PALETTE.grisOscuro, fontWeight: 700, fontFamily: 'monospace' }}
                      width={55}
                    />
                    <Tooltip 
                      formatter={(val: any, _: any, p: any) => [
                        `${val} días acumulados (${p.payload.intervenciones} ingresos • ${p.payload.cd})`, 
                        'Días taller'
                      ]}
                      contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold', border: 'none' }}
                    />
                    <Bar 
                      dataKey="diasAcumulados" 
                      radius={[0, 6, 6, 0]} 
                      maxBarSize={16} 
                      cursor="pointer"
                      isAnimationActive={true}
                      animationDuration={750}
                      animationEasing="ease-out"
                    >
                      <LabelList 
                        dataKey="diasAcumulados" 
                        position="right" 
                        formatter={(v: any) => `${v}d`}
                        style={{ fontSize: '9px', fontWeight: '800', fill: PALETTE.grisOscuro }} 
                      />
                      {daysInShopStats.topPlatesDaysList.slice(0, 6).map((entry, index) => {
                        const isSelected = searchPlaca ? normalizePlate(searchPlaca) === normalizePlate(entry.placa) : false;
                        return (
                          <Cell 
                            key={`cell-topdays-${index}`} 
                            fill={isSelected ? PALETTE.dorado : PALETTE.azulOscuro} 
                            className="transition-colors duration-300 hover:opacity-85"
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </motion.div>

        {/* Placas Más Intervenidas (Barras VERTICALES Top 15) */}
        <motion.div 
          layout
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4"
        >
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Truck size={16} className="text-[#0D2B4E]" />
                Placas más intervenidas (Top 15)
              </h3>
              <p className="text-[11px] text-slate-500">
                {filterMes !== 'TODOS' 
                  ? `Ingresos a taller en ${normMes(filterMes)}` 
                  : 'Vehículos con mayor recurrencia de ingresos • Haz clic para filtrar'}
              </p>
            </div>
            {Boolean(searchPlaca) && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#E0A800] text-slate-900 text-[10px] font-bold font-mono border border-amber-400 flex items-center gap-1.5 shadow-xs">
                {searchPlaca}
                <button 
                  onClick={() => setSearchPlaca('')}
                  className="text-slate-800 hover:text-black cursor-pointer font-black"
                >
                  ×
                </button>
              </span>
            )}
          </div>

          <div className="h-[270px] w-full pt-2">
            {plateInterventionsData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl p-8 gap-2">
                <Truck size={32} className="text-slate-300" />
                <span>Sin datos de placas para los filtros actuales</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={plateInterventionsData} 
                  margin={{ top: 20, right: 10, left: -15, bottom: 25 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length > 0) {
                      const item = e.activePayload[0].payload;
                      handleToggleFilter('placa', item.placa);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="placa" 
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    tick={{ fontSize: 9, fill: PALETTE.grisOscuro, fontWeight: 700, fontFamily: 'monospace' }}
                    height={40}
                  />
                  <YAxis tick={{ fontSize: 9, fill: PALETTE.grisTexto }} />
                  <Tooltip 
                    formatter={(val: any, _: any, p: any) => [`${val} ingresos (${p.payload.cd} • ${p.payload.contractor || ''})`, 'Intervenciones']}
                    contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold', border: 'none' }}
                  />
                  <Bar 
                    dataKey="count" 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={30} 
                    cursor="pointer"
                    isAnimationActive={true}
                    animationDuration={750}
                    animationEasing="ease-out"
                  >
                    <LabelList 
                      dataKey="count" 
                      position="top" 
                      style={{ fontSize: '9px', fontWeight: '800', fill: PALETTE.grisOscuro }} 
                    />
                    {plateInterventionsData.map((entry, index) => {
                      const isSelected = searchPlaca ? normalizePlate(searchPlaca) === normalizePlate(entry.placa) : false;
                      return (
                        <Cell 
                          key={`cell-plate-${index}`} 
                          fill={isSelected ? PALETTE.dorado : PALETTE.azulOscuro} 
                          className="transition-colors duration-300 hover:opacity-85"
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

      </div>

      {/* ============================================================== */}
      {/* 10. TABLA DETALLADA DE INTERVENCIONES EN TALLER                */}
      {/* ============================================================== */}
      <motion.div 
        layout
        className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4"
      >
        
        {/* Table Header and Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wrench size={18} className="text-[#0D2B4E]" />
              Detalle de intervenciones en taller
            </h3>
            <p className="text-xs text-slate-500">
              {tableRecords.length} registros filtrados • Página {currentPage} de {totalPages}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar placa, falla o taller..."
                value={tableSearchPlate}
                onChange={e => {
                  setTableSearchPlate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#0D2B4E] outline-none transition-all"
              />
              {tableSearchPlate && (
                <button
                  onClick={() => setTableSearchPlate('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Sort Toggle */}
            <button
              onClick={() => setTableSortDesc(!tableSortDesc)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              <ArrowUpDown size={13} />
              <span>{tableSortDesc ? 'Más reciente' : 'Más antiguo'}</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={exportTableToCSV}
              disabled={tableRecords.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Download size={13} />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0D2B4E] text-white text-[10px] uppercase font-bold tracking-wider">
                <th className="p-3 pl-4">Fecha</th>
                <th className="p-3">Centro</th>
                <th className="p-3">Sistema</th>
                <th className="p-3">Detalle de falla</th>
                <th className="p-3">Placa</th>
                <th className="p-3">Contratista</th>
                <th className="p-3">Taller</th>
                <th className="p-3">Ingreso</th>
                <th className="p-3 pr-4">Salida est.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                    No se encontraron registros de intervenciones con los filtros actuales
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r, idx) => (
                  <tr 
                    key={`tbl-row-${currentPage}-${idx}-${r.id || ''}`} 
                    className={`hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                  >
                    <td className="p-3 pl-4 font-mono whitespace-nowrap text-slate-800">
                      {r.fecha || '—'}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleFilter('cd', r.cd)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                          normCd(r.cd) === 'GALAPA' 
                            ? 'bg-[#0D2B4E]/10 text-[#0D2B4E] hover:bg-[#0D2B4E] hover:text-white' 
                            : 'bg-amber-100 text-amber-900 hover:bg-[#E0A800] hover:text-black'
                        }`}
                      >
                        {r.cd || '—'}
                      </button>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleFilter('sistema', r.sistema)}
                        className="font-bold text-slate-900 hover:text-blue-700 cursor-pointer hover:underline"
                      >
                        {r.sistema || '—'}
                      </button>
                    </td>
                    <td className="p-3 max-w-xs truncate text-slate-600" title={r.detalle || ''}>
                      {r.detalle || '—'}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleFilter('placa', r.placa || r.placasKey || '')}
                        className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-bold text-[11px] hover:bg-[#E0A800] hover:text-black transition-colors cursor-pointer"
                      >
                        {r.placa || r.placasKey || '—'}
                      </button>
                    </td>
                    <td className="p-3 whitespace-nowrap text-slate-600">
                      <button
                        onClick={() => handleToggleFilter('contratista', r.contratista)}
                        className="hover:text-indigo-700 cursor-pointer hover:underline text-[11px]"
                      >
                        {r.contratista || '—'}
                      </button>
                    </td>
                    <td className="p-3 whitespace-nowrap text-slate-600">
                      {r.taller || '—'}
                    </td>
                    <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                      {r.fechaIngreso || '—'}
                    </td>
                    <td className="p-3 pr-4 font-mono text-slate-500 whitespace-nowrap">
                      {r.fechaEstimadaSalida || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 text-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <span>Registros por página:</span>
              <select
                value={itemsPerPage}
                onChange={e => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-800 text-xs">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

      </motion.div>

    </div>
  );
};

export default AvailabilityModule;
