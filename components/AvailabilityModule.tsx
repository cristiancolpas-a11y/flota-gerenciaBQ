import React, { useMemo, useState } from 'react';
import { AvailabilityRecord, AvailabilityPctRecord, FleetListRecord } from '../types';
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
  BarChart3,
  Waves
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
// MONTH NORMALIZATION (Fix: ENE -> ENERO, OCT -> OCTUBRE)
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

// Brand Colors (Limpios, corporativos, suaves, sin neones)
const PALETTE = {
  azulOscuro: '#0D2B4E',
  azulMedio: '#1E3A5F',
  azulClaro: '#3E5A78',
  dorado: '#E0A800',
  doradoActivo: '#F59E0B',
  verde: '#15803D',
  verdeBg: '#DCFCE7',
  rojo: '#DC2626',
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

const CD_COLORS: Record<string, string> = {
  'GALAPA': '#0D2B4E',
  'LA ARENOSA': '#3E5A78',
  'ARENOSA': '#3E5A78',
  'OTRO': '#64748B'
};

const MONTH_COLORS = [
  '#0D2B4E', '#1E3A5F', '#3E5A78', '#2563EB', '#0284C7', '#0D9488',
  '#16A34A', '#65A30D', '#D97706', '#EA580C', '#DC2626', '#7C3AED'
];

// Paleta de marca suave y profesional para el Streamgraph (como Power BI)
const STREAM_PALETTE = [
  '#7A1F2B', // Vinotinto
  '#C9D1D9', // Gris claro suave
  '#2E7D8A', // Teal / azul verdoso
  '#3E5A78', // Azul medio
  '#0D2B4E', // Azul oscuro
  '#F2B705', // Dorado / mostaza
  '#16A34A', // Verde corporativo
  '#EA580C', // Naranja suave
  '#64748B'  // Pizarra
];

const getCdColor = (cdName: string): string => {
  const norm = normCd(cdName);
  if (norm === 'GALAPA') return CD_COLORS['GALAPA'];
  if (norm === 'LA ARENOSA') return CD_COLORS['LA ARENOSA'];
  return CD_COLORS['OTRO'];
};

interface FilterState {
  cd: string;            // 'all' | 'GALAPA' | 'LA ARENOSA'
  mes: string;           // 'all' | 'ENERO' ...
  semana: string;        // 'all' | 'S1' ...
  contratista: string;   // 'all' | string
  sistema: string;       // 'all' | string
  placa: string;         // 'all' | string
  excluirFinRentin: boolean; // default true
}

export const AvailabilityModule: React.FC<AvailabilityDashboardProps> = ({
  availability = [],
  availabilityPct = [],
  onRefresh,
  loading = false
}) => {
  // -------------------------------------------------------------
  // 1. UNIFIED FILTER STATE (Top Bar + Cross-Filtering Sync)
  // -------------------------------------------------------------
  const [filters, setFilters] = useState<FilterState>({
    cd: 'all',
    mes: 'all',
    semana: 'all',
    contratista: 'all',
    sistema: 'all',
    placa: 'all',
    excluirFinRentin: true,
  });

  // Mode toggles for sub-charts
  const [cdViewMode, setCdViewMode] = useState<'consolidado' | 'por_mes'>('consolidado');
  const [contractorViewMode, setContractorViewMode] = useState<'consolidado' | 'por_mes'>('consolidado');
  const [streamTimeMode, setStreamTimeMode] = useState<'semanal' | 'mensual'>('semanal');
  const [streamStackType, setStreamStackType] = useState<'silhouette' | 'stacked'>('silhouette');

  // Table internal state
  const [tableSearchPlate, setTableSearchPlate] = useState<string>('');
  const [tableSortDesc, setTableSortDesc] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);

  // Helper: Detect FIN RENTIN
  const isFinRentin = (c?: string) => {
    if (!c) return false;
    const norm = c.toUpperCase().trim();
    return norm.startsWith('FIN RENTIN');
  };

  // Helper to directly set any filter value (Used by dropdown selects)
  const setFilterValue = (key: keyof Omit<FilterState, 'excluirFinRentin'>, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1);
  };

  // Helper to toggle any filter (Clicking again deselects to 'all')
  const toggleFilter = (key: keyof Omit<FilterState, 'excluirFinRentin'>, value: string) => {
    setFilters(prev => {
      let isSame = prev[key] === value;
      if (key === 'cd' && value !== 'all') {
        isSame = normCd(prev.cd) === normCd(value);
      } else if (key === 'mes' && value !== 'all') {
        isSame = normMes(prev.mes) === normMes(value);
      }
      return {
        ...prev,
        [key]: isSame ? 'all' : value
      };
    });
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
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
    !!tableSearchPlate;

  // -------------------------------------------------------------
  // 2. EXTRACT FILTER OPTIONS (Normalized from real data)
  // -------------------------------------------------------------
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
    availabilityPct.forEach(r => { if (r.semana) set.add(r.semana.toUpperCase().trim()); });
    availability.forEach(r => { if (r.semana) set.add(r.semana.toUpperCase().trim()); });
    return Array.from(set).filter(Boolean).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
  }, [availabilityPct, availability]);

  const availableContractors = useMemo(() => {
    const set = new Set<string>();
    availabilityPct.forEach(r => {
      const c = r.contratista || (r as any).contractor;
      if (c && (!filters.excluirFinRentin || !isFinRentin(c))) {
        set.add(c.trim());
      }
    });
    availability.forEach(r => {
      const c = r.contratista || (r as any).contractor;
      if (c && (!filters.excluirFinRentin || !isFinRentin(c))) {
        set.add(c.trim());
      }
    });
    return Array.from(set).filter(Boolean).sort();
  }, [availabilityPct, availability, filters.excluirFinRentin]);

  const availableSystems = useMemo(() => {
    const set = new Set<string>();
    availability.forEach(r => { if (r.sistema) set.add(r.sistema.toUpperCase().trim()); });
    return Array.from(set).filter(Boolean).sort();
  }, [availability]);

  // -------------------------------------------------------------
  // 3. FILTERED DATASETS (Unified Filter State with normMes and normCd)
  // -------------------------------------------------------------
  // A) Intervenciones crudas (DISPONILIDAD)
  const filteredInterventions = useMemo(() => {
    return availability.filter(r => {
      if (filters.excluirFinRentin && isFinRentin(r.contratista)) return false;
      if (filters.cd !== 'all' && normCd(r.cd) !== normCd(filters.cd)) return false;
      
      // Normalized month matching
      if (filters.mes !== 'all') {
        const rMes = normMes(r.mes || getRecordMes(r));
        if (rMes !== normMes(filters.mes)) return false;
      }

      if (filters.semana !== 'all' && r.semana && r.semana.toUpperCase().trim() !== filters.semana.toUpperCase().trim()) return false;
      if (filters.contratista !== 'all' && (r.contratista || '').toUpperCase().trim() !== filters.contratista.toUpperCase().trim()) return false;
      if (filters.sistema !== 'all' && (r.sistema || '').toUpperCase().trim() !== filters.sistema.toUpperCase().trim()) return false;
      if (filters.placa !== 'all') {
        const pUpper = filters.placa.toUpperCase().trim();
        const rPlaca = (r.placa || r.placasKey || '').toUpperCase().trim();
        if (rPlaca !== pUpper) return false;
      }
      return true;
    });
  }, [availability, filters]);

  // B) Resumen % Disponibilidad (%DISPONIBILIDAD)
  const filteredPctRecords = useMemo(() => {
    return availabilityPct.filter(r => {
      if (filters.excluirFinRentin && isFinRentin(r.contratista)) return false;
      if (filters.cd !== 'all' && normCd(r.cd) !== normCd(filters.cd)) return false;
      
      // Normalized month matching
      if (filters.mes !== 'all') {
        const rMes = normMes(r.mes || getRecordMes(r));
        if (rMes !== normMes(filters.mes)) return false;
      }

      if (filters.semana !== 'all' && r.semana && r.semana.toUpperCase().trim() !== filters.semana.toUpperCase().trim()) return false;
      if (filters.contratista !== 'all' && (r.contratista || '').toUpperCase().trim() !== filters.contratista.toUpperCase().trim()) return false;
      
      // If filtered by a specific plate or system, filter to days/CDs where that plate/system had interventions
      if (filters.placa !== 'all' || filters.sistema !== 'all') {
        const matchesIntervention = filteredInterventions.some(inv => 
          inv.fecha === r.fecha && normCd(inv.cd) === normCd(r.cd)
        );
        if (!matchesIntervention) return false;
      }
      return true;
    });
  }, [availabilityPct, filters, filteredInterventions]);

  // -------------------------------------------------------------
  // 4. KPIS CALCULATIONS (GROUP BY DAY, NEVER ROW-BY-ROW)
  // -------------------------------------------------------------
  const kpiStats = useMemo(() => {
    if (filteredPctRecords.length === 0) {
      return {
        tasaOperativa: 0,
        tasaIndisponibilidad: 0,
        avgFlotaTotal: 0,
        avgDisponibles: 0,
        avgIndisponibles: 0,
        lastActiveFleet: 0,
        totalDias: 0,
        totalIntervenciones: filteredInterventions.length
      };
    }

    const dailyMap: Record<string, { total: number; disp: number; indisp: number }> = {};
    let sumTotalAll = 0;
    let sumDispAll = 0;
    let sumIndispAll = 0;

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

    const dayKeys = Object.keys(dailyMap).sort();
    const activeDayKeys = dayKeys.filter(k => dailyMap[k].total > 0);
    const numActiveDays = activeDayKeys.length > 0 ? activeDayKeys.length : Math.max(1, dayKeys.length);

    const avgFlotaTotal = Math.round(activeDayKeys.reduce((acc, k) => acc + dailyMap[k].total, 0) / numActiveDays);
    const avgDisponibles = Math.round(activeDayKeys.reduce((acc, k) => acc + dailyMap[k].disp, 0) / numActiveDays);
    const avgIndisponibles = Math.round(activeDayKeys.reduce((acc, k) => acc + dailyMap[k].indisp, 0) / numActiveDays);

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

  // -------------------------------------------------------------
  // 5. CHART DATA PREPARATIONS
  // -------------------------------------------------------------

  // A) Mensual (Fila dedicada a ancho completo, alta y espaciosa)
  const monthlyData = useMemo(() => {
    const map: Record<string, { total: number; disp: number }> = {};

    filteredPctRecords.forEach(r => {
      const m = normMes(r.mes || getRecordMes(r));
      if (!m) return;
      if (!map[m]) map[m] = { total: 0, disp: 0 };
      map[m].total += r.total || 0;
      map[m].disp += r.disponibles || 0;
    });

    return Object.keys(map).sort((a, b) => {
      const idxA = MESES_FULL.indexOf(a);
      const idxB = MESES_FULL.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.localeCompare(b);
    }).map(m => {
      const item = map[m];
      const pct = item.total > 0 ? Number(((item.disp / item.total) * 100).toFixed(1)) : 0;
      return {
        name: m,
        label: m,
        disponibilidad: pct,
        total: item.total,
        disponibles: item.disp
      };
    });
  }, [filteredPctRecords]);

  // B) Semanal (Sin gráfica diaria)
  const weeklyData = useMemo(() => {
    const map: Record<string, { total: number; disp: number; mes: string }> = {};

    filteredPctRecords.forEach(r => {
      const w = r.semana || 'S1';
      const m = normMes(r.mes || getRecordMes(r));
      if (!map[w]) map[w] = { total: 0, disp: 0, mes: m };
      map[w].total += r.total || 0;
      map[w].disp += r.disponibles || 0;
      if (!map[w].mes && m) map[w].mes = m;
    });

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
  }, [filteredPctRecords]);

  // C) Centro de Distribución (GALAPA vs LA ARENOSA) — SIEMPRE AMBOS CD PRESENTES
  const cdData = useMemo(() => {
    // Inicializar con ambos CD fijos para que nunca desaparezcan de la comparativa
    const map: Record<string, { total: number; disp: number; dailyTotals: Record<string, number> }> = {
      'GALAPA': { total: 0, disp: 0, dailyTotals: {} },
      'LA ARENOSA': { total: 0, disp: 0, dailyTotals: {} }
    };

    filteredPctRecords.forEach(r => {
      const cd = normCd(r.cd) || 'OTRO';
      if (!map[cd]) map[cd] = { total: 0, disp: 0, dailyTotals: {} };
      map[cd].total += r.total || 0;
      map[cd].disp += r.disponibles || 0;
      if (r.fecha) {
        map[cd].dailyTotals[r.fecha] = (map[cd].dailyTotals[r.fecha] || 0) + (r.total || 0);
      }
    });

    const fixedOrder = ['GALAPA', 'LA ARENOSA'];
    return Object.keys(map).sort((a, b) => {
      const idxA = fixedOrder.indexOf(a);
      const idxB = fixedOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    }).map(cd => {
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
  }, [filteredPctRecords]);

  // Diagnóstico rápido (consola) para depuración y verificación
  console.log('PCT total:', availabilityPct.length);
  console.log('CDs en PCT:', Array.from(new Set(availabilityPct.map(r => (r.cd||'').toUpperCase().trim()))));
  console.log('filteredPct:', filteredPctRecords.length, 'cdData:', cdData);

  // C.2) Desglose mensual de CD (Meses en X, Galapa vs La Arenosa)
  const cdMonthlyBreakdown = useMemo(() => {
    const monthsMap: Record<string, { GALAPA: { disp: number; total: number }; ARENOSA: { disp: number; total: number } }> = {};

    filteredPctRecords.forEach(r => {
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

    return Object.keys(monthsMap).sort((a, b) => {
      const idxA = MESES_FULL.indexOf(a);
      const idxB = MESES_FULL.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.localeCompare(b);
    }).map(m => {
      const g = monthsMap[m].GALAPA;
      const a = monthsMap[m].ARENOSA;
      const pctG = g.total > 0 ? Number(((g.disp / g.total) * 100).toFixed(1)) : 0;
      const pctA = a.total > 0 ? Number(((a.disp / a.total) * 100).toFixed(1)) : 0;
      return {
        name: m,
        mes: m,
        GALAPA: pctG,
        'LA ARENOSA': pctA
      };
    });
  }, [filteredPctRecords]);

  // D) Contratista (Con División por Mes)
  const contractorData = useMemo(() => {
    const map: Record<string, { total: number; disp: number; indisp: number }> = {};

    filteredPctRecords.forEach(r => {
      const c = (r.contratista || 'SIN ESPECIFICAR').trim();
      if (!map[c]) map[c] = { total: 0, disp: 0, indisp: 0 };
      map[c].total += r.total || 0;
      map[c].disp += r.disponibles || 0;
      map[c].indisp += r.indisponibles || 0;
    });

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
  }, [filteredPctRecords]);

  // D.2) Desglose por Mes de Contratistas
  const contractorMonthlyBreakdown = useMemo(() => {
    const monthsMap: Record<string, Record<string, { disp: number; total: number }>> = {};
    const contractorsSet = new Set<string>();

    filteredPctRecords.forEach(r => {
      const m = normMes(r.mes || getRecordMes(r));
      const c = (r.contratista || 'SIN ESPECIFICAR').trim();
      if (!m || !c) return;
      contractorsSet.add(c);
      if (!monthsMap[m]) monthsMap[m] = {};
      if (!monthsMap[m][c]) monthsMap[m][c] = { disp: 0, total: 0 };
      monthsMap[m][c].disp += r.disponibles || 0;
      monthsMap[m][c].total += r.total || 0;
    });

    const activeContractors = Array.from(contractorsSet);

    const rows = Object.keys(monthsMap).sort((a, b) => {
      const idxA = MESES_FULL.indexOf(a);
      const idxB = MESES_FULL.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.localeCompare(b);
    }).map(m => {
      const row: any = { name: m, mes: m };
      activeContractors.forEach(c => {
        const item = monthsMap[m][c];
        row[c] = item && item.total > 0 ? Number(((item.disp / item.total) * 100).toFixed(1)) : null;
      });
      return row;
    });

    return { rows, contractors: activeContractors };
  }, [filteredPctRecords]);

  // E) Días Indisponibles (Salida - Ingreso de taller, sin negativos)
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

      // Por CD (Normalizado a GALAPA y LA ARENOSA)
      const cd = normCd(r.cd) || 'OTRO';
      if (!cdDaysMap[cd]) cdDaysMap[cd] = { totalDays: 0, count: 0 };
      cdDaysMap[cd].totalDays += dias;
      cdDaysMap[cd].count += 1;

      // Por Placa
      const pl = (r.placa || r.placasKey || '').toUpperCase().trim();
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
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
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
      .slice(0, 10);

    return {
      cdDaysList,
      topPlatesDaysList
    };
  }, [filteredInterventions]);

  // F) SISTEMAS MÁS INTERVENIDOS — STREAMGRAPH / Área Apilada Suavizada
  const { streamData: systemStreamData, streamSystems, systemColorMap, totalStreamInterventions } = useMemo(() => {
    // 1. Contar sistemas en los registros filtrados
    const overallCounts: Record<string, number> = {};
    let totalInterv = 0;
    filteredInterventions.forEach(r => {
      const s = (r.sistema || 'SIN ESPECIFICAR').toUpperCase().trim();
      overallCounts[s] = (overallCounts[s] || 0) + 1;
      totalInterv++;
    });

    const sortedSystems = Object.entries(overallCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([s]) => s);

    // Seleccionar los top 7 sistemas principales; agrupar el resto en OTROS
    const topSystems = sortedSystems.slice(0, 7);
    const hasOthers = sortedSystems.length > 7;
    const finalSystems = hasOthers ? [...topSystems, 'OTROS'] : topSystems;

    // Asignar colores de la paleta STREAM_PALETTE
    const colorMap: Record<string, string> = {};
    finalSystems.forEach((sys, i) => {
      if (sys === 'OTROS') {
        colorMap[sys] = '#94A3B8';
      } else {
        colorMap[sys] = STREAM_PALETTE[i % STREAM_PALETTE.length];
      }
    });

    // 2. Agrupar por periodo (semanal o mensual)
    const periodsMap: Record<string, any> = {};

    filteredInterventions.forEach(r => {
      let periodKey = '';
      let sortKey = 0;

      if (streamTimeMode === 'mensual') {
        const m = normMes(r.mes || getRecordMes(r));
        if (!m) return;
        periodKey = m;
        const mIdx = MESES_FULL.indexOf(m);
        sortKey = mIdx !== -1 ? mIdx : 999;
      } else {
        // semanal
        const w = (r.semana || 'S1').toUpperCase().trim();
        periodKey = w.startsWith('S') ? w : `S${w}`;
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
  }, [filteredInterventions, streamTimeMode]);

  // G) Placa Más Intervenida (Vertical / Top 15, Respeta Filtro de Mes)
  const plateInterventionsData = useMemo(() => {
    const map: Record<string, { count: number; cd: string }> = {};

    filteredInterventions.forEach(r => {
      const pl = (r.placa || r.placasKey || '').toUpperCase().trim();
      if (!pl) return;
      if (!map[pl]) map[pl] = { count: 0, cd: r.cd };
      map[pl].count += 1;
    });

    return Object.entries(map)
      .map(([placa, info]) => ({
        placa,
        name: placa,
        count: info.count,
        cd: info.cd
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [filteredInterventions]);

  // -------------------------------------------------------------
  // 6. DETAILED TABLE WITH SEARCH & PAGINATION
  // -------------------------------------------------------------
  const tableRecords = useMemo(() => {
    let list = [...filteredInterventions];

    if (tableSearchPlate.trim()) {
      const q = tableSearchPlate.toUpperCase().trim();
      list = list.filter(r => 
        (r.placa || '').toUpperCase().includes(q) || 
        (r.placasKey || '').toUpperCase().includes(q) ||
        (r.detalle || '').toUpperCase().includes(q) ||
        (r.taller || '').toUpperCase().includes(q)
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
    const headers = ['Fecha', 'Centro de Distribución', 'Sistema', 'Detalle', 'Placa', 'Taller', 'Ingreso Taller', 'Salida Estimada', 'Contratista'];
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-100 text-[#0D2B4E] rounded-xl border border-slate-200">
              <Activity size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Disponibilidad de Flota
              </h1>
              <p className="text-xs font-semibold text-slate-500">
                Consolidado operativo de flota activa, novedades de taller e intervenciones
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {onRefresh && (
            <button
              onClick={() => onRefresh()}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0D2B4E] hover:bg-[#1E3A5F] text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Sincronizando...' : 'Actualizar datos'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. MULTIFILTER BAR (Visible, Normalizado con normMes)           */}
      {/* ============================================================== */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Filter size={15} className="text-[#0D2B4E]" />
            <span>Filtros interactivos sincronizados</span>
            <span className="text-[11px] font-normal text-slate-400">
              (Hacer clic en cualquier barra o elemento para filtrar)
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Checkbox: Excluir FIN RENTIN */}
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.excluirFinRentin}
                onChange={e => {
                  setFilters(prev => ({ ...prev, excluirFinRentin: e.target.checked }));
                  setCurrentPage(1);
                }}
                className="w-4 h-4 rounded border-slate-300 text-[#0D2B4E] focus:ring-[#0D2B4E]"
              />
              <span>Excluir FIN RENTIN</span>
            </label>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
              >
                <X size={13} />
                <span>Limpiar filtros</span>
              </button>
            )}
          </div>
        </div>

        {/* Dropdowns / Selectors */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* CD */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Centro (CD)</label>
            <select
              value={normCd(filters.cd) || 'all'}
              onChange={e => setFilterValue('cd', e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#0D2B4E] outline-none"
            >
              <option value="all">Todos los CD</option>
              {availableCds.map(cd => (
                <option key={cd} value={cd}>{cd}</option>
              ))}
            </select>
          </div>

          {/* Mes (Normalizado a ENERO, FEBRERO...) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mes</label>
            <select
              value={filters.mes === 'all' ? 'all' : normMes(filters.mes)}
              onChange={e => setFilterValue('mes', e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#0D2B4E] outline-none"
            >
              <option value="all">Todos los meses</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Semana */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Semana</label>
            <select
              value={filters.semana}
              onChange={e => setFilterValue('semana', e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#0D2B4E] outline-none"
            >
              <option value="all">Todas las semanas</option>
              {availableWeeks.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          {/* Contratista */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Contratista</label>
            <select
              value={filters.contratista}
              onChange={e => setFilterValue('contratista', e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#0D2B4E] outline-none"
            >
              <option value="all">Todos los contratistas</option>
              {availableContractors.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Sistema */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sistema</label>
            <select
              value={filters.sistema}
              onChange={e => setFilterValue('sistema', e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#0D2B4E] outline-none"
            >
              <option value="all">Todos los sistemas</option>
              {availableSystems.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Placa */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Placa específica</label>
            <div className="relative">
              <input
                type="text"
                placeholder={filters.placa === 'all' ? "Escribir placa..." : filters.placa}
                value={filters.placa === 'all' ? '' : filters.placa}
                onChange={e => setFilterValue('placa', e.target.value ? e.target.value.toUpperCase() : 'all')}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-[#0D2B4E] outline-none uppercase"
              />
              {filters.placa !== 'all' && (
                <button
                  onClick={() => setFilterValue('placa', 'all')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Active Filter Chips / Status */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Filtros aplicados:</span>
            {filters.cd !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200">
                CD: {normCd(filters.cd)}
                <button onClick={() => setFilterValue('cd', 'all')}><X size={11} /></button>
              </span>
            )}
            {filters.mes !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 text-xs font-bold border border-amber-200">
                Mes: {normMes(filters.mes)}
                <button onClick={() => setFilterValue('mes', 'all')}><X size={11} /></button>
              </span>
            )}
            {filters.semana !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200">
                Semana: {filters.semana}
                <button onClick={() => setFilterValue('semana', 'all')}><X size={11} /></button>
              </span>
            )}
            {filters.contratista !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200">
                Contratista: {filters.contratista}
                <button onClick={() => setFilterValue('contratista', 'all')}><X size={11} /></button>
              </span>
            )}
            {filters.sistema !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-900 text-xs font-semibold border border-blue-200">
                Sistema: {filters.sistema}
                <button onClick={() => setFilterValue('sistema', 'all')}><X size={11} /></button>
              </span>
            )}
            {filters.placa !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-mono text-xs font-semibold">
                Placa: {filters.placa}
                <button onClick={() => setFilterValue('placa', 'all')}><X size={11} /></button>
              </span>
            )}
            {!hasActiveFilters && (
              <span className="text-slate-400 text-xs">Sin filtros (Consolidado general)</span>
            )}
          </div>

          <div className="text-[11px] font-medium text-slate-500">
            Mostrando {kpiStats.totalDias} días analizados • {kpiStats.totalIntervenciones} intervenciones
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. TARJETAS KPI (CORREGIDAS: AGRUPACIÓN DIARIA, ~100-160 FLOTA)*/}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: % Disponibilidad Ponderado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                % Disponibilidad promedio
              </p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1 font-mono">
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
            <span className="text-slate-500 font-medium">Meta operativa: &ge; 95.0%</span>
            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
              kpiStats.tasaOperativa >= 95 ? 'bg-emerald-100 text-emerald-800' :
              kpiStats.tasaOperativa >= 90 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
            }`}>
              {kpiStats.tasaOperativa >= 95 ? 'Cumple meta' : 'En seguimiento'}
            </span>
          </div>
        </div>

        {/* KPI 2: Flota Promedio Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Flota promedio total
              </p>
              <h3 className="text-3xl font-extrabold text-[#0D2B4E] mt-1 font-mono">
                {kpiStats.avgFlotaTotal}
              </h3>
            </div>
            <div className="p-2.5 bg-slate-100 text-[#0D2B4E] rounded-xl border border-slate-200">
              <Truck size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Último registro activo</span>
            <span className="font-mono font-bold text-slate-800">{kpiStats.lastActiveFleet} vehíc.</span>
          </div>
        </div>

        {/* KPI 3: Vehículos Disponibles (Promedio) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Vehículos disponibles (prom.)
              </p>
              <h3 className="text-3xl font-extrabold text-emerald-700 mt-1 font-mono">
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
        </div>

        {/* KPI 4: Vehículos Indisponibles (Promedio) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Vehículos indisponibles (prom.)
              </p>
              <h3 className="text-3xl font-extrabold text-red-600 mt-1 font-mono">
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
        </div>

      </div>

      {/* ============================================================== */}
      {/* 4. GRÁFICA MENSUAL (APARTE, EN SU PROPIA SECCIÓN, MÁS AMPLIA)  */}
      {/* ============================================================== */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar size={20} className="text-[#0D2B4E]" />
              Evolución mensual de % disponibilidad
            </h3>
            <p className="text-xs text-slate-500">
              Desglose mes a mes a lo ancho completo. Haz clic en cualquier mes para filtrar todo el dashboard.
            </p>
          </div>
          {filters.mes !== 'all' ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300">
                Filtro activo: {normMes(filters.mes)}
              </span>
              <button
                onClick={() => toggleFilter('mes', 'all')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
              >
                Ver todos
              </button>
            </div>
          ) : (
            <span className="text-xs font-medium text-slate-400">
              Mostrando los 12 meses
            </span>
          )}
        </div>

        <div className="h-[360px] md:h-[400px] w-full pt-2">
          {monthlyData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl">
              No hay datos para el rango o filtros seleccionados
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={monthlyData} 
                margin={{ top: 25, right: 25, left: 0, bottom: 20 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const item = e.activePayload[0].payload;
                    toggleFilter('mes', item.name);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={PALETTE.fondoGris} />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 11, fill: PALETTE.grisOscuro, fontWeight: 700 }}
                  axisLine={{ stroke: PALETTE.bordeSuave }}
                />
                <YAxis 
                  domain={[70, 100]} 
                  tick={{ fontSize: 10, fill: PALETTE.grisTexto }}
                  unit="%"
                  axisLine={{ stroke: PALETTE.bordeSuave }}
                />
                <Tooltip 
                  formatter={(val: any) => [`${val}%`, '% Disponibilidad']}
                  labelFormatter={(l) => `Mes: ${l}`}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                />
                <ReferenceLine 
                  y={95} 
                  stroke={PALETTE.verde} 
                  strokeDasharray="4 4" 
                  strokeWidth={2} 
                  label={{ value: 'Meta: 95%', position: 'right', fill: PALETTE.verde, fontSize: 10, fontWeight: 'bold' }} 
                />
                <Bar 
                  dataKey="disponibilidad" 
                  name="% Disponibilidad"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={54}
                  cursor="pointer"
                >
                  <LabelList 
                    dataKey="disponibilidad" 
                    position="top" 
                    formatter={(v: any) => `${v}%`}
                    style={{ fontSize: '11px', fontWeight: '800', fill: PALETTE.grisOscuro }} 
                  />
                  {monthlyData.map((entry, index) => {
                    const isSelected = normMes(filters.mes) === entry.name;
                    return (
                      <Cell 
                        key={`cell-month-${index}`} 
                        fill={isSelected ? PALETTE.doradoActivo : PALETTE.azulOscuro} 
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. DISPONIBILIDAD SEMANAL (ANCHO COMPLETO)                     */}
      {/* ============================================================== */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers size={18} className="text-[#0D2B4E]" />
              Disponibilidad semanal
            </h3>
            <p className="text-xs text-slate-500">
              {filters.mes !== 'all' ? `Semanas correspondientes a ${normMes(filters.mes)}` : 'Evolución semanal del periodo consolidado. Haz clic en una barra para filtrar.'}
            </p>
          </div>
          {filters.semana !== 'all' && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200 flex items-center gap-1.5">
                Semana activa: {filters.semana}
                <button 
                  onClick={() => toggleFilter('semana', filters.semana)}
                  className="text-slate-400 hover:text-slate-700 ml-1"
                >
                  <X size={12} />
                </button>
              </span>
            </div>
          )}
        </div>

        <div className="h-[340px] md:h-[370px] w-full pt-2">
          {weeklyData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl">
              Sin datos para este corte semanal
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={weeklyData} 
                margin={{ top: 20, right: 20, left: -5, bottom: 10 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const item = e.activePayload[0].payload;
                    toggleFilter('semana', item.name);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={PALETTE.fondoGris} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: PALETTE.grisTexto, fontWeight: 600 }} />
                <YAxis domain={[75, 100]} tick={{ fontSize: 11, fill: PALETTE.grisTexto }} unit="%" />
                <Tooltip 
                  formatter={(val: any, _: any, p: any) => [
                    `${val}% (${p.payload.mes || 'Semanas'})`, 
                    '% Disponibilidad'
                  ]}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '10px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
                <ReferenceLine 
                  y={95} 
                  stroke={PALETTE.verde} 
                  strokeDasharray="4 4" 
                  strokeWidth={2}
                  label={{ value: 'Meta: 95%', position: 'right', fill: PALETTE.verde, fontSize: 11, fontWeight: 'bold' }}
                />
                <Bar dataKey="disponibilidad" radius={[6, 6, 0, 0]} maxBarSize={38} cursor="pointer">
                  <LabelList 
                    dataKey="disponibilidad" 
                    position="top" 
                    formatter={(v: any) => `${v}%`}
                    style={{ fontSize: '10px', fontWeight: '700', fill: PALETTE.grisOscuro }} 
                  />
                  {weeklyData.map((entry, index) => (
                    <Cell 
                      key={`cell-week-${index}`} 
                      fill={filters.semana === entry.name ? PALETTE.doradoActivo : PALETTE.azulClaro} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 6. DISPONIBILIDAD POR CENTRO (CD) (ANCHO COMPLETO)             */}
      {/* ============================================================== */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 size={18} className="text-[#0D2B4E]" />
              Disponibilidad por Centro (CD)
            </h3>
            <p className="text-xs text-slate-500">
              {filters.mes !== 'all' ? `Mes: ${normMes(filters.mes)} • GALAPA vs LA ARENOSA` : 'GALAPA vs LA ARENOSA • Haz clic en una barra para filtrar por CD'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {filters.cd !== 'all' && (
              <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm">
                CD: {normCd(filters.cd)}
                <button 
                  onClick={() => toggleFilter('cd', filters.cd)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Toggle de Desglose Mensual (solo cuando no hay mes único filtrado) */}
            {filters.mes === 'all' && (
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
                <button
                  onClick={() => setCdViewMode('consolidado')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    cdViewMode === 'consolidado' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Consolidado
                </button>
                <button
                  onClick={() => setCdViewMode('por_mes')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    cdViewMode === 'por_mes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Por Mes
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="h-[340px] md:h-[370px] w-full pt-2">
          {filters.mes === 'all' && cdViewMode === 'por_mes' ? (
            // Vista Desglosada por Mes para Galapa y La Arenosa
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={cdMonthlyBreakdown} 
                margin={{ top: 20, right: 25, left: -5, bottom: 10 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const item = e.activePayload[0].payload;
                    if (item && item.mes) {
                      toggleFilter('mes', item.mes);
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={PALETTE.fondoGris} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: PALETTE.grisTexto, fontWeight: 600 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: PALETTE.grisTexto }} unit="%" />
                <Tooltip 
                  formatter={(val: any, name: any) => [`${val}%`, name]}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '10px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />
                <ReferenceLine y={95} stroke={PALETTE.verde} strokeDasharray="4 4" strokeWidth={1.5} />
                <Bar dataKey="GALAPA" name="GALAPA" fill="#0D2B4E" radius={[6, 6, 0, 0]} maxBarSize={32} cursor="pointer" minPointSize={6}>
                  <LabelList 
                    dataKey="GALAPA" 
                    position="top" 
                    formatter={(v: any) => v > 0 ? `${v}%` : '0%'}
                    style={{ fontSize: '10px', fontWeight: '700', fill: PALETTE.grisOscuro }} 
                  />
                </Bar>
                <Bar dataKey="LA ARENOSA" name="LA ARENOSA" fill="#3E5A78" radius={[6, 6, 0, 0]} maxBarSize={32} cursor="pointer" minPointSize={6}>
                  <LabelList 
                    dataKey="LA ARENOSA" 
                    position="top" 
                    formatter={(v: any) => v > 0 ? `${v}%` : '0%'}
                    style={{ fontSize: '10px', fontWeight: '700', fill: PALETTE.grisOscuro }} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            // Vista Consolidada o Filtrada
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={cdData} 
                margin={{ top: 25, right: 35, left: 10, bottom: 15 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const item = e.activePayload[0].payload;
                    toggleFilter('cd', item.name);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={PALETTE.fondoGris} />
                <XAxis dataKey="name" tick={{ fontSize: 13, fill: PALETTE.grisOscuro, fontWeight: 700 }} />
                <YAxis domain={[cdData.some(d => d.disponibilidad === 0) ? 0 : 70, 100]} tick={{ fontSize: 11, fill: PALETTE.grisTexto }} unit="%" />
                <Tooltip 
                  formatter={(val: any, _: any, p: any) => [
                    `${val}% (Flota prom: ${p.payload.avgFlota} vehíc.)`, 
                    '% Disponibilidad'
                  ]}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '10px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
                <ReferenceLine 
                  y={95} 
                  stroke={PALETTE.verde} 
                  strokeDasharray="4 4" 
                  strokeWidth={2}
                  label={{ value: 'Meta: 95%', position: 'right', fill: PALETTE.verde, fontSize: 11, fontWeight: 'bold' }}
                />
                <Bar dataKey="disponibilidad" radius={[8, 8, 0, 0]} maxBarSize={90} cursor="pointer" minPointSize={8}>
                  <LabelList 
                    dataKey="disponibilidad" 
                    position="top" 
                    formatter={(v: any) => `${v}%`}
                    style={{ fontSize: '13px', fontWeight: '800', fill: PALETTE.grisOscuro }} 
                  />
                  {cdData.map((entry, index) => {
                    const isSelected = normCd(filters.cd) === normCd(entry.name);
                    return (
                      <Cell 
                        key={`cell-cd-${index}`} 
                        fill={isSelected ? PALETTE.doradoActivo : getCdColor(entry.name)} 
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 7. DISPONIBILIDAD POR CONTRATISTA (ANCHO COMPLETO)             */}
      {/* ============================================================== */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-2">
              <Briefcase size={18} className="text-[#0D2B4E]" />
              Disponibilidad por contratista
            </h3>
            <p className="text-xs text-slate-500">
              {filters.mes !== 'all' ? `Mes: ${normMes(filters.mes)}` : '% Operativo y volumen indisponible por contratista • Haz clic para filtrar'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {filters.contratista !== 'all' && (
              <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm">
                Contratista: {filters.contratista}
                <button 
                  onClick={() => toggleFilter('contratista', filters.contratista)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {filters.mes === 'all' && (
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
                <button
                  onClick={() => setContractorViewMode('consolidado')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    contractorViewMode === 'consolidado' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Consolidado
                </button>
                <button
                  onClick={() => setContractorViewMode('por_mes')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    contractorViewMode === 'por_mes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Por Mes
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="h-[350px] md:h-[390px] w-full pt-2">
          {filters.mes === 'all' && contractorViewMode === 'por_mes' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={contractorMonthlyBreakdown.rows} 
                margin={{ top: 20, right: 20, left: -5, bottom: 10 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const item = e.activePayload[0].payload;
                    if (item && item.mes) {
                      toggleFilter('mes', item.mes);
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={PALETTE.fondoGris} />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: PALETTE.grisTexto, fontWeight: 600 }} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 10, fill: PALETTE.grisTexto }} unit="%" />
                <Tooltip 
                  formatter={(val: any, name: any) => [`${val}%`, name]}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '10px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                {contractorMonthlyBreakdown.contractors.map((c, i) => (
                  <Bar 
                    key={c} 
                    dataKey={c} 
                    name={c} 
                    fill={MONTH_COLORS[i % MONTH_COLORS.length]} 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={18} 
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={contractorData} 
                layout="vertical" 
                margin={{ top: 10, right: 40, left: 75, bottom: 10 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const item = e.activePayload[0].payload;
                    toggleFilter('contratista', item.name);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={PALETTE.fondoGris} />
                <XAxis type="number" domain={[85, 100]} tick={{ fontSize: 11, fill: PALETTE.grisTexto }} unit="%" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fontSize: 11, fill: PALETTE.grisOscuro, fontWeight: 700 }}
                  width={140}
                />
                <Tooltip 
                  formatter={(val: any, _: any, p: any) => [
                    `${val}% (Indisponibles acum: ${p.payload.indisponibles})`, 
                    '% Disponibilidad'
                  ]}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '10px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
                <ReferenceLine x={95} stroke={PALETTE.verde} strokeDasharray="4 4" strokeWidth={1.5} />
                <Bar dataKey="disponibilidad" radius={[0, 8, 8, 0]} maxBarSize={28} cursor="pointer">
                  <LabelList 
                    dataKey="disponibilidad" 
                    position="right" 
                    formatter={(v: any) => `${v}%`}
                    style={{ fontSize: '11px', fontWeight: '700', fill: PALETTE.grisOscuro }} 
                  />
                  {contractorData.map((entry, index) => (
                    <Cell 
                      key={`cell-cont-${index}`} 
                      fill={filters.contratista === entry.name ? PALETTE.doradoActivo : PALETTE.azulClaro} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 8. SISTEMAS MÁS INTERVENIDOS (STREAMGRAPH / ÁREA APILADA)      */}
      {/* ============================================================== */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-2">
              <Waves size={18} className="text-[#7A1F2B]" />
              Sistemas más intervenidos (Evolución temporal)
            </h3>
            <p className="text-xs text-slate-500">
              Evolución {streamTimeMode === 'semanal' ? 'semanal' : 'mensual'} de intervenciones por componente mecánico — bandas de área suavizadas
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {filters.sistema !== 'all' && (
              <span className="px-3 py-1 rounded-full bg-[#7A1F2B] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm">
                Sistema: {filters.sistema}
                <button 
                  onClick={() => toggleFilter('sistema', filters.sistema)}
                  className="text-white/80 hover:text-white"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Agrupación temporal: Semanal vs Mensual */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setStreamTimeMode('semanal')}
                className={`px-3 py-1 rounded-md transition-all ${
                  streamTimeMode === 'semanal' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Semanal
              </button>
              <button
                onClick={() => setStreamTimeMode('mensual')}
                className={`px-3 py-1 rounded-md transition-all ${
                  streamTimeMode === 'mensual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Mensual
              </button>
            </div>

            {/* Estilo Stream Centrado vs Área Apilada */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setStreamStackType('silhouette')}
                className={`px-3 py-1 rounded-md transition-all ${
                  streamStackType === 'silhouette' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Streamgraph centrado fluido estilo Power BI"
              >
                Stream Centrado
              </button>
              <button
                onClick={() => setStreamStackType('stacked')}
                className={`px-3 py-1 rounded-md transition-all ${
                  streamStackType === 'stacked' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Área apilada tradicional"
              >
                Área Apilada
              </button>
            </div>
          </div>
        </div>

        {/* Gráfica AreaChart Streamgraph */}
        <div className="h-[380px] md:h-[430px] w-full pt-2">
          {systemStreamData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl">
              Sin registros de intervenciones de sistemas para los filtros activos
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={systemStreamData} 
                stackOffset={streamStackType === 'silhouette' ? 'silhouette' : undefined}
                margin={{ top: 20, right: 30, left: 10, bottom: 15 }}
              >
                <defs>
                  {streamSystems.map((sys) => {
                    const color = systemColorMap[sys] || '#3E5A78';
                    const id = `grad-sys-${sys.replace(/[^a-zA-Z0-9]/g, '_')}`;
                    return (
                      <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.92}/>
                        <stop offset="95%" stopColor={color} stopOpacity={0.72}/>
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={PALETTE.fondoGris} />
                <XAxis 
                  dataKey="periodo" 
                  tick={{ fontSize: 11, fill: PALETTE.grisTexto, fontWeight: 600 }}
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
                      toggleFilter('sistema', e.dataKey);
                    }
                  }}
                  formatter={(value) => (
                    <span className={`cursor-pointer transition-opacity ${filters.sistema !== 'all' && filters.sistema !== value ? 'opacity-40' : 'font-bold'}`}>
                      {value}
                    </span>
                  )}
                />
                {streamSystems.map((sys) => {
                  const color = systemColorMap[sys] || '#3E5A78';
                  const isSelected = filters.sistema === sys;
                  const hasSysFilter = filters.sistema !== 'all';
                  const gradId = `grad-sys-${sys.replace(/[^a-zA-Z0-9]/g, '_')}`;
                  return (
                    <Area
                      key={sys}
                      type="monotone"
                      dataKey={sys}
                      name={sys}
                      stackId="1"
                      stroke={color}
                      strokeWidth={isSelected ? 3 : 1.5}
                      fill={`url(#${gradId})`}
                      fillOpacity={!hasSysFilter || isSelected ? 0.9 : 0.25}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                      cursor="pointer"
                      onClick={() => toggleFilter('sistema', sys)}
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Botones de filtro rápido por sistema debajo del streamgraph */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            Sistemas ({totalStreamInterventions} novedades):
          </span>
          {streamSystems.map((sys) => {
            const color = systemColorMap[sys] || '#3E5A78';
            const isSelected = filters.sistema === sys;
            return (
              <button
                key={`btn-sys-${sys}`}
                onClick={() => toggleFilter('sistema', sys)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isSelected 
                    ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900 ring-offset-1' 
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                {sys}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 9. DÍAS EN TALLER Y PLACAS MÁS INTERVENIDAS (2 COLUMNAS)       */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Días Indisponibles en Taller (Permanencia) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock size={16} className="text-[#0D2B4E]" />
                Días de permanencia en taller
              </h3>
              <p className="text-[11px] text-slate-500">
                (Fecha Salida) − (Fecha Ingreso) en días, excluyendo negativos
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
                        toggleFilter('cd', item.name);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={PALETTE.fondoGris} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: PALETTE.grisOscuro, fontWeight: 700 }} />
                    <YAxis tick={{ fontSize: 9, fill: PALETTE.grisTexto }} unit=" d" />
                    <Tooltip 
                      formatter={(val: any, _: any, p: any) => [
                        `${val} días prom. (${p.payload.totalDias} d en ${p.payload.intervenciones} ingresos)`, 
                        'Permanencia'
                      ]}
                      contentStyle={{ backgroundColor: '#0F172A', borderRadius: '10px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="promedioDias" fill={PALETTE.azulOscuro} radius={[5, 5, 0, 0]} maxBarSize={40} cursor="pointer" minPointSize={4}>
                      <LabelList 
                        dataKey="promedioDias" 
                        position="top" 
                        formatter={(v: any) => `${v} d`}
                        style={{ fontSize: '10px', fontWeight: '700', fill: PALETTE.grisOscuro }} 
                      />
                      {daysInShopStats.cdDaysList.map((entry, index) => (
                        <Cell 
                          key={`cell-cddays-${index}`} 
                          fill={normCd(filters.cd) === normCd(entry.name) ? PALETTE.doradoActivo : getCdColor(entry.name)} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top 6 Placas con más días */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Top placas en taller (días acum.)
              </span>
              <div className="h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={daysInShopStats.topPlatesDaysList.slice(0, 6)} 
                    layout="vertical" 
                    margin={{ top: 5, right: 25, left: 30, bottom: 5 }}
                    onClick={(e: any) => {
                      if (e && e.activePayload && e.activePayload.length > 0) {
                        const item = e.activePayload[0].payload;
                        toggleFilter('placa', item.placa);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={PALETTE.fondoGris} />
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
                      contentStyle={{ backgroundColor: '#0F172A', borderRadius: '10px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="diasAcumulados" radius={[0, 5, 5, 0]} maxBarSize={16} cursor="pointer">
                      <LabelList 
                        dataKey="diasAcumulados" 
                        position="right" 
                        formatter={(v: any) => `${v}d`}
                        style={{ fontSize: '9px', fontWeight: '700', fill: PALETTE.grisOscuro }} 
                      />
                      {daysInShopStats.topPlatesDaysList.slice(0, 6).map((entry, index) => (
                        <Cell 
                          key={`cell-topdays-${index}`} 
                          fill={filters.placa === entry.placa ? PALETTE.doradoActivo : PALETTE.azulClaro} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>

        {/* Placas Más Intervenidas (Barras VERTICALES Top 15) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Truck size={16} className="text-[#0D2B4E]" />
                Placas más intervenidas (Top 15)
              </h3>
              <p className="text-[11px] text-slate-500">
                {filters.mes !== 'all' ? `Ingresos en ${normMes(filters.mes)}` : 'Vehículos con mayor recurrencia de ingresos a taller'}
              </p>
            </div>
            {filters.placa !== 'all' && (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold font-mono">
                {filters.placa}
              </span>
            )}
          </div>

          <div className="h-[270px] w-full pt-2">
            {plateInterventionsData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl">
                Sin datos de placas para los filtros actuales
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={plateInterventionsData} 
                  margin={{ top: 20, right: 10, left: -15, bottom: 25 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length > 0) {
                      const item = e.activePayload[0].payload;
                      toggleFilter('placa', item.placa);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={PALETTE.fondoGris} />
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
                    formatter={(val: any, _: any, p: any) => [`${val} ingresos (${p.payload.cd})`, 'Intervenciones']}
                    contentStyle={{ backgroundColor: '#0F172A', borderRadius: '10px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={28} cursor="pointer">
                    <LabelList 
                      dataKey="count" 
                      position="top" 
                      style={{ fontSize: '9px', fontWeight: '700', fill: PALETTE.grisOscuro }} 
                    />
                    {plateInterventionsData.map((entry, index) => (
                      <Cell 
                        key={`cell-plate-${index}`} 
                        fill={filters.placa === entry.placa ? PALETTE.doradoActivo : PALETTE.azulClaro} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* 8. TABLA DETALLADA DE INTERVENCIONES                           */}
      {/* ============================================================== */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        
        {/* Table Header and Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Detalle de intervenciones en taller
            </h3>
            <p className="text-xs text-slate-500">
              {tableRecords.length} registros filtrados • Página {currentPage} de {totalPages}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-grow sm:flex-grow-0 sm:w-60">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar placa o detalle..."
                value={tableSearchPlate}
                onChange={e => {
                  setTableSearchPlate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#0D2B4E] outline-none"
              />
              {tableSearchPlate && (
                <button
                  onClick={() => setTableSearchPlate('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Sort Toggle */}
            <button
              onClick={() => setTableSortDesc(!tableSortDesc)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
            >
              <ArrowUpDown size={13} />
              <span>{tableSortDesc ? 'Más reciente' : 'Más antiguo'}</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={exportTableToCSV}
              disabled={tableRecords.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40"
            >
              <Download size={13} />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* 8 Columns Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0D2B4E] text-white text-[10px] uppercase font-bold tracking-wider">
                <th className="p-3 pl-4">Fecha</th>
                <th className="p-3">Centro</th>
                <th className="p-3">Sistema</th>
                <th className="p-3">Detalle de falla</th>
                <th className="p-3">Placa</th>
                <th className="p-3">Taller</th>
                <th className="p-3">Ingreso</th>
                <th className="p-3 pr-4">Salida est.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    No se encontraron registros de intervenciones con los filtros actuales
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r, idx) => (
                  <tr 
                    key={r.id ? `${r.id}-${idx}` : `row-${idx}`} 
                    className={`hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                  >
                    <td className="p-3 pl-4 font-mono whitespace-nowrap text-slate-800">
                      {r.fecha || '—'}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-bold">
                        {r.cd || '—'}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                      {r.sistema || '—'}
                    </td>
                    <td className="p-3 max-w-xs truncate text-slate-600" title={r.detalle || ''}>
                      {r.detalle || '—'}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-bold text-[11px]">
                        {r.placa || r.placasKey || '—'}
                      </span>
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
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
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
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-800 text-xs">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

export default AvailabilityModule;
