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
  ShieldAlert
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart, 
  Line, 
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

const CD_COLORS: Record<string, string> = {
  'GALAPA': '#0D2B4E',
  'LA ARENOSA': '#3E5A78',
  'ARENOSA': '#3E5A78',
  'OTRO': '#64748B'
};

const getCdColor = (cdName: string): string => {
  const norm = (cdName || '').toUpperCase().trim();
  if (norm.includes('GALAPA')) return CD_COLORS['GALAPA'];
  if (norm.includes('ARENOSA')) return CD_COLORS['LA ARENOSA'];
  return CD_COLORS['OTRO'];
};

interface FilterState {
  cd: string;            // 'all' | 'GALAPA' | 'LA ARENOSA'
  mes: string;           // 'all' | 'ENERO' ...
  semana: string;        // 'all' | 'S1' ...
  dia: string;           // 'all' | 'YYYY-MM-DD'
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
  // 1. UNIFIED FILTER STATE (Supports Top Bar + Cross-Filtering)
  // -------------------------------------------------------------
  const [filters, setFilters] = useState<FilterState>({
    cd: 'all',
    mes: 'all',
    semana: 'all',
    dia: 'all',
    contratista: 'all',
    sistema: 'all',
    placa: 'all',
    excluirFinRentin: true,
  });

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

  // Helper to toggle any filter (Clicking again deselects to 'all')
  const toggleFilter = (key: keyof Omit<FilterState, 'excluirFinRentin'>, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key] === value ? 'all' : value
    }));
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setFilters({
      cd: 'all',
      mes: 'all',
      semana: 'all',
      dia: 'all',
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
    filters.dia !== 'all' || 
    filters.contratista !== 'all' || 
    filters.sistema !== 'all' || 
    filters.placa !== 'all' || 
    !filters.excluirFinRentin ||
    !!tableSearchPlate;

  // -------------------------------------------------------------
  // 2. EXTRACT FILTER OPTIONS (from real data)
  // -------------------------------------------------------------
  const availableCds = useMemo(() => {
    const set = new Set<string>();
    availabilityPct.forEach(r => { if (r.cd) set.add(r.cd.toUpperCase().trim()); });
    availability.forEach(r => { if (r.cd) set.add(r.cd.toUpperCase().trim()); });
    return Array.from(set).filter(Boolean).sort();
  }, [availabilityPct, availability]);

  const availableMonths = useMemo(() => {
    const monthOrder = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const set = new Set<string>();
    availabilityPct.forEach(r => { if (r.mes) set.add(r.mes.toUpperCase().trim()); });
    availability.forEach(r => { if (r.mes) set.add(r.mes.toUpperCase().trim()); });
    return Array.from(set).filter(Boolean).sort((a, b) => {
      const idxA = monthOrder.indexOf(a);
      const idxB = monthOrder.indexOf(b);
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
  // 3. FILTERED DATASETS (Derived with Unified Filter State)
  // -------------------------------------------------------------
  // A) Intervenciones crudas (DISPONILIDAD)
  const filteredInterventions = useMemo(() => {
    return availability.filter(r => {
      if (filters.excluirFinRentin && isFinRentin(r.contratista)) return false;
      if (filters.cd !== 'all' && r.cd.toUpperCase().trim() !== filters.cd.toUpperCase().trim()) return false;
      if (filters.mes !== 'all' && r.mes && r.mes.toUpperCase().trim() !== filters.mes.toUpperCase().trim()) return false;
      if (filters.semana !== 'all' && r.semana && r.semana.toUpperCase().trim() !== filters.semana.toUpperCase().trim()) return false;
      if (filters.dia !== 'all' && r.fecha !== filters.dia) return false;
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
      if (filters.cd !== 'all' && r.cd.toUpperCase().trim() !== filters.cd.toUpperCase().trim()) return false;
      if (filters.mes !== 'all' && r.mes && r.mes.toUpperCase().trim() !== filters.mes.toUpperCase().trim()) return false;
      if (filters.semana !== 'all' && r.semana && r.semana.toUpperCase().trim() !== filters.semana.toUpperCase().trim()) return false;
      if (filters.dia !== 'all' && r.fecha !== filters.dia) return false;
      if (filters.contratista !== 'all' && (r.contratista || '').toUpperCase().trim() !== filters.contratista.toUpperCase().trim()) return false;
      
      // If filtered by a specific plate or system, filter to days where that plate/system had an intervention
      if (filters.placa !== 'all' || filters.sistema !== 'all') {
        const matchesIntervention = filteredInterventions.some(inv => 
          inv.fecha === r.fecha && inv.cd.toUpperCase().trim() === r.cd.toUpperCase().trim()
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

  // A) Mensual (Fila dedicada independiente)
  const monthlyData = useMemo(() => {
    const monthOrder = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const map: Record<string, { total: number; disp: number }> = {};

    filteredPctRecords.forEach(r => {
      const m = r.mes || 'OTRO';
      if (!map[m]) map[m] = { total: 0, disp: 0 };
      map[m].total += r.total || 0;
      map[m].disp += r.disponibles || 0;
    });

    return Object.keys(map).sort((a, b) => {
      const idxA = monthOrder.indexOf(a);
      const idxB = monthOrder.indexOf(b);
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

  // B) Semanal
  const weeklyData = useMemo(() => {
    const map: Record<string, { total: number; disp: number }> = {};

    filteredPctRecords.forEach(r => {
      const w = r.semana || 'S1';
      if (!map[w]) map[w] = { total: 0, disp: 0 };
      map[w].total += r.total || 0;
      map[w].disp += r.disponibles || 0;
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
        total: item.total,
        disponibles: item.disp
      };
    });
  }, [filteredPctRecords]);

  // C) Diaria
  const dailyData = useMemo(() => {
    const map: Record<string, { total: number; disp: number }> = {};

    filteredPctRecords.forEach(r => {
      if (!r.fecha) return;
      if (!map[r.fecha]) map[r.fecha] = { total: 0, disp: 0 };
      map[r.fecha].total += r.total || 0;
      map[r.fecha].disp += r.disponibles || 0;
    });

    const dates = Object.keys(map).sort();
    // Tomar los últimos 35 días para mantener legibilidad visual
    const displayDates = dates.length > 35 ? dates.slice(-35) : dates;

    return displayDates.map(f => {
      const item = map[f];
      const pct = item.total > 0 ? Number(((item.disp / item.total) * 100).toFixed(1)) : 0;
      return {
        name: f,
        label: f.substring(5), // MM-DD
        fecha: f,
        disponibilidad: pct,
        total: item.total,
        disponibles: item.disp
      };
    });
  }, [filteredPctRecords]);

  // D) Centro de Distribución (GALAPA vs LA ARENOSA)
  const cdData = useMemo(() => {
    const map: Record<string, { total: number; disp: number; dailyTotals: Record<string, number> }> = {};

    filteredPctRecords.forEach(r => {
      const cd = (r.cd || 'OTRO').toUpperCase().trim();
      if (!map[cd]) map[cd] = { total: 0, disp: 0, dailyTotals: {} };
      map[cd].total += r.total || 0;
      map[cd].disp += r.disponibles || 0;
      if (r.fecha) {
        map[cd].dailyTotals[r.fecha] = (map[cd].dailyTotals[r.fecha] || 0) + (r.total || 0);
      }
    });

    return Object.keys(map).sort().map(cd => {
      const item = map[cd];
      const pct = item.total > 0 ? Number(((item.disp / item.total) * 100).toFixed(1)) : 0;
      const daysCount = Object.keys(item.dailyTotals).length || 1;
      const avgFlotaCd = Math.round(item.total / daysCount);
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

  // E) Por Contratista
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

  // F) Días Indisponibles (Salida - Ingreso de taller, sin negativos)
  const daysInShopStats = useMemo(() => {
    const cdDaysMap: Record<string, { totalDays: number; count: number }> = {};
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

      // Por CD
      const cd = (r.cd || 'OTRO').toUpperCase().trim();
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

    const cdDaysList = Object.keys(cdDaysMap).sort().map(cd => {
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

  // G) Sistema Más Intervenido
  const systemInterventionsData = useMemo(() => {
    const map: Record<string, number> = {};

    filteredInterventions.forEach(r => {
      const s = (r.sistema || 'SIN ESPECIFICAR').toUpperCase().trim();
      map[s] = (map[s] || 0) + 1;
    });

    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filteredInterventions]);

  // H) Placa Más Intervenida (Vertical / Top 15-20)
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
      {/* 2. MULTIFILTER BAR (Visible, Cruzada con las Gráficas)         */}
      {/* ============================================================== */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Filter size={15} className="text-[#0D2B4E]" />
            <span>Filtros y filtros cruzados interactivos</span>
            <span className="text-[11px] font-normal text-slate-400">
              (Hacer clic en cualquier gráfica para filtrar)
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
              value={filters.cd}
              onChange={e => toggleFilter('cd', e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#0D2B4E] outline-none"
            >
              <option value="all">Todos los CD</option>
              {availableCds.map(cd => (
                <option key={cd} value={cd}>{cd}</option>
              ))}
            </select>
          </div>

          {/* Mes */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mes</label>
            <select
              value={filters.mes}
              onChange={e => toggleFilter('mes', e.target.value)}
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
              onChange={e => toggleFilter('semana', e.target.value)}
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
              onChange={e => toggleFilter('contratista', e.target.value)}
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
              onChange={e => toggleFilter('sistema', e.target.value)}
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
                onChange={e => toggleFilter('placa', e.target.value ? e.target.value.toUpperCase() : 'all')}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-[#0D2B4E] outline-none uppercase"
              />
              {filters.placa !== 'all' && (
                <button
                  onClick={() => toggleFilter('placa', 'all')}
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
                CD: {filters.cd}
                <button onClick={() => toggleFilter('cd', 'all')}><X size={11} /></button>
              </span>
            )}
            {filters.mes !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200">
                Mes: {filters.mes}
                <button onClick={() => toggleFilter('mes', 'all')}><X size={11} /></button>
              </span>
            )}
            {filters.semana !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200">
                Semana: {filters.semana}
                <button onClick={() => toggleFilter('semana', 'all')}><X size={11} /></button>
              </span>
            )}
            {filters.dia !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200">
                Día: {filters.dia}
                <button onClick={() => toggleFilter('dia', 'all')}><X size={11} /></button>
              </span>
            )}
            {filters.contratista !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200">
                Contratista: {filters.contratista}
                <button onClick={() => toggleFilter('contratista', 'all')}><X size={11} /></button>
              </span>
            )}
            {filters.sistema !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 text-xs font-semibold border border-amber-200">
                Sistema: {filters.sistema}
                <button onClick={() => toggleFilter('sistema', 'all')}><X size={11} /></button>
              </span>
            )}
            {filters.placa !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-900 font-mono text-xs font-semibold border border-blue-200">
                Placa: {filters.placa}
                <button onClick={() => toggleFilter('placa', 'all')}><X size={11} /></button>
              </span>
            )}
            {!hasActiveFilters && (
              <span className="text-slate-400 text-xs">Sin filtros (Mostrando consolidado general)</span>
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
      {/* 4. GRÁFICA MENSUAL (APARTE, EN SU PROPIA SECCIÓN)              */}
      {/* ============================================================== */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar size={18} className="text-[#0D2B4E]" />
              Evolución mensual de % disponibilidad
            </h3>
            <p className="text-xs text-slate-500">
              Consolidado mes a mes. Haz clic en una barra para filtrar el dashboard por ese mes.
            </p>
          </div>
          {filters.mes !== 'all' && (
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200">
              Mes seleccionado: {filters.mes}
            </span>
          )}
        </div>

        <div className="h-[280px] w-full pt-2">
          {monthlyData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl">
              No hay datos para el rango o filtros seleccionados
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={monthlyData} 
                margin={{ top: 25, right: 20, left: 0, bottom: 15 }}
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
                  tick={{ fontSize: 11, fill: PALETTE.grisTexto, fontWeight: 600 }}
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
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                  cursor="pointer"
                >
                  <LabelList 
                    dataKey="disponibilidad" 
                    position="top" 
                    formatter={(v: any) => `${v}%`}
                    style={{ fontSize: '11px', fontWeight: '700', fill: PALETTE.grisOscuro }} 
                  />
                  {monthlyData.map((entry, index) => {
                    const isSelected = filters.mes === entry.name;
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
      {/* 5. GRÁFICAS TEMPORALES: SEMANAL Y DIARIA JUNTAS (2 COLUMNAS)   */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfica Semanal */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers size={16} className="text-[#0D2B4E]" />
                Disponibilidad semanal
              </h3>
              <p className="text-[11px] text-slate-500">Haz clic en una semana para filtrar</p>
            </div>
            {filters.semana !== 'all' && (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-200">
                {filters.semana}
              </span>
            )}
          </div>

          <div className="h-[250px] w-full pt-2">
            {weeklyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl">
                Sin datos para este corte semanal
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={weeklyData} 
                  margin={{ top: 20, right: 15, left: -10, bottom: 10 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length > 0) {
                      const item = e.activePayload[0].payload;
                      toggleFilter('semana', item.name);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={PALETTE.fondoGris} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: PALETTE.grisTexto }} />
                  <YAxis domain={[75, 100]} tick={{ fontSize: 10, fill: PALETTE.grisTexto }} unit="%" />
                  <Tooltip 
                    formatter={(val: any) => [`${val}%`, '% Disponibilidad']}
                    contentStyle={{ backgroundColor: '#0F172A', borderRadius: '10px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                  />
                  <ReferenceLine y={95} stroke={PALETTE.verde} strokeDasharray="3 3" />
                  <Bar dataKey="disponibilidad" radius={[5, 5, 0, 0]} maxBarSize={30} cursor="pointer">
                    <LabelList 
                      dataKey="disponibilidad" 
                      position="top" 
                      formatter={(v: any) => `${v}%`}
                      style={{ fontSize: '9px', fontWeight: '700', fill: PALETTE.grisOscuro }} 
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

        {/* Gráfica Diaria */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock size={16} className="text-[#0D2B4E]" />
                Disponibilidad diaria (últimos 35 días)
              </h3>
              <p className="text-[11px] text-slate-500">Haz clic en un día para ver detalle de ese día</p>
            </div>
            {filters.dia !== 'all' && (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-200">
                {filters.dia}
              </span>
            )}
          </div>

          <div className="h-[250px] w-full pt-2">
            {dailyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl">
                Sin datos diarios para este corte
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={dailyData} 
                  margin={{ top: 20, right: 15, left: -10, bottom: 10 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length > 0) {
                      const item = e.activePayload[0].payload;
                      toggleFilter('dia', item.fecha);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={PALETTE.fondoGris} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: PALETTE.grisTexto }} />
                  <YAxis domain={[75, 100]} tick={{ fontSize: 10, fill: PALETTE.grisTexto }} unit="%" />
                  <Tooltip 
                    formatter={(val: any) => [`${val}%`, '% Disponibilidad']}
                    labelFormatter={(l) => `Fecha: ${l}`}
                    contentStyle={{ backgroundColor: '#0F172A', borderRadius: '10px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                  />
                  <ReferenceLine y={95} stroke={PALETTE.verde} strokeDasharray="3 3" />
                  <Line 
                    type="monotone" 
                    dataKey="disponibilidad" 
                    stroke={PALETTE.azulMedio} 
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: PALETTE.dorado }}
                    activeDot={{ r: 6 }}
                    cursor="pointer"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* 6. GRÁFICAS: POR CD Y POR CONTRATISTA (2 COLUMNAS)             */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Comparativa por Centro de Distribución (CD) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 size={16} className="text-[#0D2B4E]" />
                Disponibilidad por Centro de Distribución (CD)
              </h3>
              <p className="text-[11px] text-slate-500">Comparativa GALAPA vs LA ARENOSA</p>
            </div>
            {filters.cd !== 'all' && (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-200">
                {filters.cd}
              </span>
            )}
          </div>

          <div className="h-[240px] w-full pt-2">
            {cdData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl">
                Sin datos por CD
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={cdData} 
                  margin={{ top: 20, right: 30, left: 0, bottom: 10 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length > 0) {
                      const item = e.activePayload[0].payload;
                      toggleFilter('cd', item.name);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={PALETTE.fondoGris} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: PALETTE.grisOscuro, fontWeight: 700 }} />
                  <YAxis domain={[80, 100]} tick={{ fontSize: 10, fill: PALETTE.grisTexto }} unit="%" />
                  <Tooltip 
                    formatter={(val: any, _: any, p: any) => [
                      `${val}% (Flota prom: ${p.payload.avgFlota} vehíc.)`, 
                      '% Disponibilidad'
                    ]}
                    contentStyle={{ backgroundColor: '#0F172A', borderRadius: '10px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                  />
                  <ReferenceLine y={95} stroke={PALETTE.verde} strokeDasharray="3 3" />
                  <Bar dataKey="disponibilidad" radius={[6, 6, 0, 0]} maxBarSize={55} cursor="pointer">
                    <LabelList 
                      dataKey="disponibilidad" 
                      position="top" 
                      formatter={(v: any) => `${v}%`}
                      style={{ fontSize: '11px', fontWeight: '800', fill: PALETTE.grisOscuro }} 
                    />
                    {cdData.map((entry, index) => {
                      const isSelected = filters.cd === entry.name;
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

        {/* Disponibilidad por Contratista */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Briefcase size={16} className="text-[#0D2B4E]" />
                Disponibilidad por contratista
              </h3>
              <p className="text-[11px] text-slate-500">% Operativo y vehículos indisponibles</p>
            </div>
            {filters.contratista !== 'all' && (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-200">
                {filters.contratista}
              </span>
            )}
          </div>

          <div className="h-[240px] w-full pt-2">
            {contractorData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl">
                Sin datos de contratistas
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={contractorData} 
                  layout="vertical" 
                  margin={{ top: 10, right: 35, left: 60, bottom: 10 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length > 0) {
                      const item = e.activePayload[0].payload;
                      toggleFilter('contratista', item.name);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={PALETTE.fondoGris} />
                  <XAxis type="number" domain={[85, 100]} tick={{ fontSize: 10, fill: PALETTE.grisTexto }} unit="%" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 10, fill: PALETTE.grisOscuro, fontWeight: 600 }}
                    width={110}
                  />
                  <Tooltip 
                    formatter={(val: any, _: any, p: any) => [
                      `${val}% (Indisponibles acum: ${p.payload.indisponibles})`, 
                      '% Disponibilidad'
                    ]}
                    contentStyle={{ backgroundColor: '#0F172A', borderRadius: '10px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="disponibilidad" radius={[0, 6, 6, 0]} maxBarSize={24} cursor="pointer">
                    <LabelList 
                      dataKey="disponibilidad" 
                      position="right" 
                      formatter={(v: any) => `${v}%`}
                      style={{ fontSize: '10px', fontWeight: '700', fill: PALETTE.grisOscuro }} 
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

      </div>

      {/* ============================================================== */}
      {/* 7. DÍAS INDISPONIBLES EN TALLER (SALIDA - INGRESO)              */}
      {/* ============================================================== */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock size={16} className="text-[#0D2B4E]" />
              Permanencia y días indisponibles en taller
            </h3>
            <p className="text-xs text-slate-500">
              Calculado como (Fecha estimada de salida) − (Fecha de ingreso), excluyendo valores negativos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          
          {/* Promedio de días por CD */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Días promedio de permanencia por CD
            </h4>
            <div className="h-[220px] w-full">
              {daysInShopStats.cdDaysList.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl">
                  Sin datos de permanencia
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daysInShopStats.cdDaysList} margin={{ top: 20, right: 30, left: -10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={PALETTE.fondoGris} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: PALETTE.grisOscuro, fontWeight: 700 }} />
                    <YAxis tick={{ fontSize: 10, fill: PALETTE.grisTexto }} unit=" d" />
                    <Tooltip 
                      formatter={(val: any, _: any, p: any) => [
                        `${val} días prom. (${p.payload.totalDias} días en ${p.payload.intervenciones} intervenciones)`, 
                        'Permanencia'
                      ]}
                      contentStyle={{ backgroundColor: '#0F172A', borderRadius: '10px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="promedioDias" fill={PALETTE.azulOscuro} radius={[6, 6, 0, 0]} maxBarSize={45}>
                      <LabelList 
                        dataKey="promedioDias" 
                        position="top" 
                        formatter={(v: any) => `${v} días`}
                        style={{ fontSize: '10px', fontWeight: '700', fill: PALETTE.grisOscuro }} 
                      />
                      {daysInShopStats.cdDaysList.map((entry, index) => (
                        <Cell 
                          key={`cell-cddays-${index}`} 
                          fill={filters.cd === entry.name ? PALETTE.doradoActivo : getCdColor(entry.name)} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top Placas con más días acumulados */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Top 10 placas con más días acumulados en taller
            </h4>
            <div className="h-[220px] w-full">
              {daysInShopStats.topPlatesDaysList.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl">
                  Sin datos de placas
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={daysInShopStats.topPlatesDaysList} 
                    layout="vertical" 
                    margin={{ top: 5, right: 40, left: 35, bottom: 5 }}
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
                      tick={{ fontSize: 10, fill: PALETTE.grisOscuro, fontWeight: 700, fontFamily: 'monospace' }}
                      width={60}
                    />
                    <Tooltip 
                      formatter={(val: any, _: any, p: any) => [
                        `${val} días acumulados (${p.payload.intervenciones} ingresos • ${p.payload.cd})`, 
                        'Días en taller'
                      ]}
                      contentStyle={{ backgroundColor: '#0F172A', borderRadius: '10px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="diasAcumulados" radius={[0, 6, 6, 0]} maxBarSize={18} cursor="pointer">
                      <LabelList 
                        dataKey="diasAcumulados" 
                        position="right" 
                        formatter={(v: any) => `${v} d`}
                        style={{ fontSize: '9px', fontWeight: '700', fill: PALETTE.grisOscuro }} 
                      />
                      {daysInShopStats.topPlatesDaysList.map((entry, index) => (
                        <Cell 
                          key={`cell-topdays-${index}`} 
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
      </div>

      {/* ============================================================== */}
      {/* 8. ANÁLISIS DE INTERVENCIONES: SISTEMA Y PLACAS (2 COLUMNAS)   */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sistema Más Intervenido */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Wrench size={16} className="text-[#0D2B4E]" />
                Sistemas más intervenidos
              </h3>
              <p className="text-[11px] text-slate-500">Cantidad de novedades por componente / sistema</p>
            </div>
            {filters.sistema !== 'all' && (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-200">
                {filters.sistema}
              </span>
            )}
          </div>

          <div className="h-[250px] w-full pt-2">
            {systemInterventionsData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl">
                Sin datos de sistemas
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={systemInterventionsData} 
                  layout="vertical" 
                  margin={{ top: 5, right: 35, left: 60, bottom: 5 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length > 0) {
                      const item = e.activePayload[0].payload;
                      toggleFilter('sistema', item.name);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={PALETTE.fondoGris} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: PALETTE.grisTexto }} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 10, fill: PALETTE.grisOscuro, fontWeight: 700 }}
                    width={100}
                  />
                  <Tooltip 
                    formatter={(val: any) => [`${val} intervenciones`, 'Cantidad']}
                    contentStyle={{ backgroundColor: '#0F172A', borderRadius: '10px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={22} cursor="pointer">
                    <LabelList 
                      dataKey="count" 
                      position="right" 
                      style={{ fontSize: '10px', fontWeight: '700', fill: PALETTE.grisOscuro }} 
                    />
                    {systemInterventionsData.map((entry, index) => (
                      <Cell 
                        key={`cell-sys-${index}`} 
                        fill={filters.sistema === entry.name ? PALETTE.doradoActivo : PALETTE.azulOscuro} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Placas Más Intervenidas (Barras VERTICALES como solicitado) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Truck size={16} className="text-[#0D2B4E]" />
                Placas más intervenidas (Top 15)
              </h3>
              <p className="text-[11px] text-slate-500">Vehículos con mayor recurrencia de ingresos a taller</p>
            </div>
            {filters.placa !== 'all' && (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-200 font-mono">
                {filters.placa}
              </span>
            )}
          </div>

          <div className="h-[250px] w-full pt-2">
            {plateInterventionsData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl">
                Sin datos de placas
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
      {/* 9. TABLA DETALLADA DE INTERVENCIONES                           */}
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
