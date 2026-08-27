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
  Store,
  Layers,
  ArrowUpDown,
  Download,
  X,
  ChevronLeft,
  ChevronRight
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

const BRAND = {
  azulPrincipal: '#0D2B4E',
  azulSecundario: '#3E5A78',
  dorado: '#F2B705',
  positivo: '#16A34A',
  negativo: '#DC2626',
  textoPrincipal: '#111827',
  textoSecundario: '#6B7280',
  fondoLineas: '#F1F3F5',
  fondo: '#FFFFFF',
};

const CD_COLORS: Record<string, string> = {
  'GALAPA': '#0D2B4E',       // Azul principal
  'LA ARENOSA': '#F2B705',   // Dorado
  'ARENOSA': '#F2B705',
  'BARRANQUILLA': '#3E5A78', // Azul secundario
  'SANTA MARTA': '#16A34A',  // Verde
  'CARTAGENA': '#DC2626',    // Rojo
  'VALLEDUPAR': '#6B7280',   // Gris
  'MONTERIA': '#3E5A78',
  'TOTAL': '#0D2B4E'
};

const getCdColor = (cdName: string, idx: number): string => {
  const upper = (cdName || '').toUpperCase().trim();
  if (CD_COLORS[upper]) return CD_COLORS[upper];
  // Paleta de marca para CD no listados:
  const palette = ['#0D2B4E', '#F2B705', '#3E5A78', '#16A34A', '#DC2626', '#6B7280'];
  return palette[idx % palette.length];
};

export const AvailabilityModule: React.FC<AvailabilityDashboardProps> = ({
  availability = [],
  availabilityPct = [],
  onRefresh,
  loading = false
}) => {
  // Multi-filter states
  const [selectedCds, setSelectedCds] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedWeeks, setSelectedWeeks] = useState<string[]>([]);
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);
  
  // Section 1 Chart mode
  const [chartTimeframe, setChartTimeframe] = useState<'semanal' | 'mensual' | 'diaria'>('semanal');
  const [breakdownByCd, setBreakdownByCd] = useState<boolean>(true);

  // Section 3 Table states
  const [tableSearchPlate, setTableSearchPlate] = useState<string>('');
  const [tableSortDesc, setTableSortDesc] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);

  // Extract unique filter options from data
  const availableCds = useMemo(() => {
    const set = new Set<string>();
    availabilityPct.forEach(r => { if (r.cd) set.add(r.cd.toUpperCase().trim()); });
    availability.forEach(r => { if (r.cd) set.add(r.cd.toUpperCase().trim()); });
    return Array.from(set).filter(Boolean).sort();
  }, [availabilityPct, availability]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    const monthOrder = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
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
      if (c) set.add(c.toUpperCase().trim());
    });
    availability.forEach(r => {
      const c = r.contratista || (r as any).contractor;
      if (c) set.add(c.toUpperCase().trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [availabilityPct, availability]);

  // Multi-select toggle helpers
  const toggleCd = (cd: string) => {
    setCurrentPage(1);
    setSelectedCds(prev => 
      prev.includes(cd) ? prev.filter(c => c !== cd) : [...prev, cd]
    );
  };

  const toggleMonth = (m: string) => {
    setCurrentPage(1);
    setSelectedMonths(prev => 
      prev.includes(m) ? prev.filter(item => item !== m) : [...prev, m]
    );
  };

  const toggleWeek = (w: string) => {
    setCurrentPage(1);
    setSelectedWeeks(prev => 
      prev.includes(w) ? prev.filter(item => item !== w) : [...prev, w]
    );
  };

  const toggleContractor = (c: string) => {
    setCurrentPage(1);
    setSelectedContractors(prev => 
      prev.includes(c) ? prev.filter(item => item !== c) : [...prev, c]
    );
  };

  const clearAllFilters = () => {
    setSelectedCds([]);
    setSelectedMonths([]);
    setSelectedWeeks([]);
    setSelectedContractors([]);
    setTableSearchPlate('');
    setCurrentPage(1);
  };

  const hasActiveFilters = selectedCds.length > 0 || selectedMonths.length > 0 || selectedWeeks.length > 0 || selectedContractors.length > 0 || !!tableSearchPlate;

  // Cumulative filtered % Disponibilidad dataset (Section 1)
  const filteredPctRecords = useMemo(() => {
    return availabilityPct.filter(r => {
      if (selectedCds.length > 0 && !selectedCds.includes(r.cd.toUpperCase().trim())) return false;
      if (selectedMonths.length > 0 && r.mes && !selectedMonths.includes(r.mes.toUpperCase().trim())) return false;
      if (selectedWeeks.length > 0 && r.semana && !selectedWeeks.includes(r.semana.toUpperCase().trim())) return false;
      const cVal = (r.contratista || (r as any).contractor || '').toUpperCase().trim();
      if (selectedContractors.length > 0 && (!cVal || !selectedContractors.includes(cVal))) return false;
      return true;
    });
  }, [availabilityPct, selectedCds, selectedMonths, selectedWeeks, selectedContractors]);

  // Cumulative filtered Intervenciones dataset (Section 2 & 3)
  const filteredInterventions = useMemo(() => {
    return availability.filter(r => {
      if (selectedCds.length > 0 && !selectedCds.includes(r.cd.toUpperCase().trim())) return false;
      if (selectedMonths.length > 0 && r.mes && !selectedMonths.includes(r.mes.toUpperCase().trim())) return false;
      if (selectedWeeks.length > 0 && r.semana && !selectedWeeks.includes(r.semana.toUpperCase().trim())) return false;
      const cVal = (r.contratista || (r as any).contractor || '').toUpperCase().trim();
      if (selectedContractors.length > 0 && (!cVal || !selectedContractors.includes(cVal))) return false;
      return true;
    });
  }, [availability, selectedCds, selectedMonths, selectedWeeks, selectedContractors]);

  // -------------------------------------------------------------
  // SECTION 1 CALCULATIONS: KPI Metrics & Aggregations
  // -------------------------------------------------------------
  const kpiStats = useMemo(() => {
    if (filteredPctRecords.length === 0) {
      return { avgPromedio: 0, totalFleet: 0, avgDisponibles: 0, avgIndisponibles: 0, totalRecords: 0 };
    }

    const totalSum = filteredPctRecords.reduce((acc, r) => acc + (r.total || 0), 0);
    const dispSum = filteredPctRecords.reduce((acc, r) => acc + (r.disponibles || 0), 0);
    const indispSum = filteredPctRecords.reduce((acc, r) => acc + (r.indisponibles || 0), 0);
    
    // Calculate true weighted percentage if totals exist, else arithmetic mean of promedio
    let calculatedAvg = 0;
    if (totalSum > 0) {
      calculatedAvg = (dispSum / totalSum) * 100;
    } else {
      const validPromedios = filteredPctRecords.map(r => r.promedio).filter(p => p > 0);
      calculatedAvg = validPromedios.length > 0 ? (validPromedios.reduce((a, b) => a + b, 0) / validPromedios.length) : 0;
    }

    const count = filteredPctRecords.length;
    return {
      avgPromedio: Number(calculatedAvg.toFixed(1)),
      totalFleet: Math.round(totalSum / count),
      avgDisponibles: Math.round(dispSum / count),
      avgIndisponibles: Math.round(indispSum / count),
      totalRecords: count
    };
  }, [filteredPctRecords]);

  // Chart Data Preparation: Diaria, Semanal, Mensual
  const chartData = useMemo(() => {
    if (filteredPctRecords.length === 0) return [];

    if (chartTimeframe === 'diaria') {
      const groupedByDate: Record<string, { total: number; disp: number; indisp: number; proms: number[]; byCd: Record<string, { total: number; disp: number; proms: number[] }> }> = {};

      filteredPctRecords.forEach(r => {
        if (!r.fecha) return;
        if (!groupedByDate[r.fecha]) {
          groupedByDate[r.fecha] = { total: 0, disp: 0, indisp: 0, proms: [], byCd: {} };
        }
        groupedByDate[r.fecha].total += r.total || 0;
        groupedByDate[r.fecha].disp += r.disponibles || 0;
        groupedByDate[r.fecha].indisp += r.indisponibles || 0;
        if (r.promedio > 0) groupedByDate[r.fecha].proms.push(r.promedio);

        const cdKey = r.cd || 'GENERAL';
        if (!groupedByDate[r.fecha].byCd[cdKey]) {
          groupedByDate[r.fecha].byCd[cdKey] = { total: 0, disp: 0, proms: [] };
        }
        groupedByDate[r.fecha].byCd[cdKey].total += r.total || 0;
        groupedByDate[r.fecha].byCd[cdKey].disp += r.disponibles || 0;
        if (r.promedio > 0) groupedByDate[r.fecha].byCd[cdKey].proms.push(r.promedio);
      });

      return Object.keys(groupedByDate).sort().map(fecha => {
        const item = groupedByDate[fecha];
        const val = item.total > 0 ? (item.disp / item.total) * 100 : (item.proms.length > 0 ? item.proms.reduce((a, b) => a + b, 0) / item.proms.length : 0);
        
        const row: any = {
          name: fecha,
          label: fecha.substring(5), // MM-DD
          promedio: Number(val.toFixed(1)),
          total: item.total,
          disponibles: item.disp,
          indisponibles: item.indisp
        };

        Object.keys(item.byCd).forEach(cdKey => {
          const cdData = item.byCd[cdKey];
          const cdVal = cdData.total > 0 ? (cdData.disp / cdData.total) * 100 : (cdData.proms.length > 0 ? cdData.proms.reduce((a, b) => a + b, 0) / cdData.proms.length : 0);
          row[`cd_${cdKey}`] = Number(cdVal.toFixed(1));
        });

        return row;
      }).filter(row => (row.total > 0) || (row.promedio > 0));
    }

    if (chartTimeframe === 'semanal') {
      const groupedByWeek: Record<string, { total: number; disp: number; indisp: number; proms: number[]; byCd: Record<string, { total: number; disp: number; proms: number[] }> }> = {};

      filteredPctRecords.forEach(r => {
        const weekKey = r.semana || 'S1';
        if (!groupedByWeek[weekKey]) {
          groupedByWeek[weekKey] = { total: 0, disp: 0, indisp: 0, proms: [], byCd: {} };
        }
        groupedByWeek[weekKey].total += r.total || 0;
        groupedByWeek[weekKey].disp += r.disponibles || 0;
        groupedByWeek[weekKey].indisp += r.indisponibles || 0;
        if (r.promedio > 0) groupedByWeek[weekKey].proms.push(r.promedio);

        const cdKey = r.cd || 'GENERAL';
        if (!groupedByWeek[weekKey].byCd[cdKey]) {
          groupedByWeek[weekKey].byCd[cdKey] = { total: 0, disp: 0, proms: [] };
        }
        groupedByWeek[weekKey].byCd[cdKey].total += r.total || 0;
        groupedByWeek[weekKey].byCd[cdKey].disp += r.disponibles || 0;
        if (r.promedio > 0) groupedByWeek[weekKey].byCd[cdKey].proms.push(r.promedio);
      });

      return Object.keys(groupedByWeek).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      }).map(weekKey => {
        const item = groupedByWeek[weekKey];
        const val = item.total > 0 ? (item.disp / item.total) * 100 : (item.proms.length > 0 ? item.proms.reduce((a, b) => a + b, 0) / item.proms.length : 0);
        
        const row: any = {
          name: weekKey,
          label: weekKey,
          promedio: Number(val.toFixed(1)),
          total: item.total,
          disponibles: item.disp,
          indisponibles: item.indisp
        };

        Object.keys(item.byCd).forEach(cdKey => {
          const cdData = item.byCd[cdKey];
          const cdVal = cdData.total > 0 ? (cdData.disp / cdData.total) * 100 : (cdData.proms.length > 0 ? cdData.proms.reduce((a, b) => a + b, 0) / cdData.proms.length : 0);
          row[`cd_${cdKey}`] = Number(cdVal.toFixed(1));
        });

        return row;
      }).filter(row => (row.total > 0) || (row.promedio > 0));
    }

    // Mensual
    const monthOrder = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const groupedByMonth: Record<string, { total: number; disp: number; indisp: number; proms: number[]; byCd: Record<string, { total: number; disp: number; proms: number[] }> }> = {};

    filteredPctRecords.forEach(r => {
      const monthKey = r.mes || 'GENERAL';
      if (!groupedByMonth[monthKey]) {
        groupedByMonth[monthKey] = { total: 0, disp: 0, indisp: 0, proms: [], byCd: {} };
      }
      groupedByMonth[monthKey].total += r.total || 0;
      groupedByMonth[monthKey].disp += r.disponibles || 0;
      groupedByMonth[monthKey].indisp += r.indisponibles || 0;
      if (r.promedio > 0) groupedByMonth[monthKey].proms.push(r.promedio);

      const cdKey = r.cd || 'GENERAL';
      if (!groupedByMonth[monthKey].byCd[cdKey]) {
        groupedByMonth[monthKey].byCd[cdKey] = { total: 0, disp: 0, proms: [] };
      }
      groupedByMonth[monthKey].byCd[cdKey].total += r.total || 0;
      groupedByMonth[monthKey].byCd[cdKey].disp += r.disponibles || 0;
      if (r.promedio > 0) groupedByMonth[monthKey].byCd[cdKey].proms.push(r.promedio);
    });

    return Object.keys(groupedByMonth).sort((a, b) => {
      const idxA = monthOrder.indexOf(a);
      const idxB = monthOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.localeCompare(b);
    }).map(monthKey => {
      const item = groupedByMonth[monthKey];
      const val = item.total > 0 ? (item.disp / item.total) * 100 : (item.proms.length > 0 ? item.proms.reduce((a, b) => a + b, 0) / item.proms.length : 0);
      
      const row: any = {
        name: monthKey,
        label: monthKey,
        promedio: Number(val.toFixed(1)),
        total: item.total,
        disponibles: item.disp,
        indisponibles: item.indisp
      };

      Object.keys(item.byCd).forEach(cdKey => {
        const cdData = item.byCd[cdKey];
        const cdVal = cdData.total > 0 ? (cdData.disp / cdData.total) * 100 : (cdData.proms.length > 0 ? cdData.proms.reduce((a, b) => a + b, 0) / cdData.proms.length : 0);
        row[`cd_${cdKey}`] = Number(cdVal.toFixed(1));
      });

      return row;
    }).filter(row => (row.total > 0) || (row.promedio > 0));
  }, [filteredPctRecords, chartTimeframe]);

  // Active CDs in current filtered data for series breakdown
  const activeCdList = useMemo(() => {
    const set = new Set<string>();
    filteredPctRecords.forEach(r => { if (r.cd) set.add(r.cd.toUpperCase().trim()); });
    return Array.from(set).sort();
  }, [filteredPctRecords]);

  // -------------------------------------------------------------
  // SECTION 2 CALCULATIONS: Top Sistemas, Placas, Talleres
  // -------------------------------------------------------------
  const interventionRankings = useMemo(() => {
    const totalCount = filteredInterventions.length;
    const sistemasMap: Record<string, number> = {};
    const placasMap: Record<string, { count: number; cd: string; contractor: string }> = {};
    const talleresMap: Record<string, number> = {};

    filteredInterventions.forEach(r => {
      // Sistema
      const sis = (r.sistema || 'SIN ESPECIFICAR').trim();
      sistemasMap[sis] = (sistemasMap[sis] || 0) + 1;

      // Placa
      const plk = (r.placa || r.placasKey || 'DESC').trim();
      if (plk && plk !== 'DESC') {
        if (!placasMap[plk]) {
          placasMap[plk] = { count: 0, cd: r.cd, contractor: r.contratista };
        }
        placasMap[plk].count += 1;
      }

      // Taller
      const tal = (r.taller || 'SIN ASIGNAR').trim();
      talleresMap[tal] = (talleresMap[tal] || 0) + 1;
    });

    const topSistemas = Object.entries(sistemasMap)
      .map(([name, count]) => ({ name, count, pct: totalCount > 0 ? Number(((count / totalCount) * 100).toFixed(1)) : 0 }))
      .sort((a, b) => b.count - a.count);

    const topPlacas = Object.entries(placasMap)
      .map(([placa, info]) => ({ placa, count: info.count, cd: info.cd, contractor: info.contractor, pct: totalCount > 0 ? Number(((info.count / totalCount) * 100).toFixed(1)) : 0 }))
      .sort((a, b) => b.count - a.count);

    const topTalleres = Object.entries(talleresMap)
      .map(([name, count]) => ({ name, count, pct: totalCount > 0 ? Number(((count / totalCount) * 100).toFixed(1)) : 0 }))
      .sort((a, b) => b.count - a.count);

    return {
      totalInterventions: totalCount,
      topSistemas,
      topPlacas,
      topTalleres,
      chartSistemas: topSistemas.slice(0, 7)
    };
  }, [filteredInterventions]);

  // -------------------------------------------------------------
  // SECTION 3: Detailed Table Processing (8 Columns + Search + Sort)
  // -------------------------------------------------------------
  const tableRecords = useMemo(() => {
    let list = [...filteredInterventions];

    // Plate search filter
    if (tableSearchPlate.trim()) {
      const q = tableSearchPlate.toUpperCase().trim();
      list = list.filter(r => (r.placa || '').toUpperCase().includes(q) || (r.placasKey || '').toUpperCase().includes(q));
    }

    // Sort by Date
    list.sort((a, b) => {
      const dateA = a.fecha || '';
      const dateB = b.fecha || '';
      return tableSortDesc ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
    });

    return list;
  }, [filteredInterventions, tableSearchPlate, tableSortDesc]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(tableRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return tableRecords.slice(start, start + itemsPerPage);
  }, [tableRecords, currentPage, itemsPerPage]);

  const exportTableToCSV = () => {
    if (tableRecords.length === 0) return;
    const headers = ['Fecha', 'Centro de Distribucion', 'Sistema', 'Detalle', 'Placa', 'Taller', 'Fecha Ingreso Taller', 'Fecha Estimada Salida'];
    const rows = tableRecords.map(r => [
      `"${r.fecha || ''}"`,
      `"${r.cd || ''}"`,
      `"${r.sistema || ''}"`,
      `"${(r.detalle || '').replace(/"/g, '""')}"`,
      `"${r.placa || ''}"`,
      `"${r.taller || ''}"`,
      `"${r.fechaIngreso || ''}"`,
      `"${r.fechaEstimadaSalida || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_intervenciones_disponibilidad_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="availability-dashboard-root" className="space-y-8 max-w-7xl mx-auto px-2 sm:px-4 py-6 font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-[#F1F3F5] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#F1F3F5] text-[#0D2B4E] rounded-2xl border border-slate-200 shadow-inner">
              <Activity size={28} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#111827] uppercase tracking-tight">
                Tablero de Disponibilidad de Flota
              </h1>
              <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                Consolidado Operativo • % de Disponibilidad e Intervenciones de Taller
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {onRefresh && (
            <button
              onClick={() => onRefresh()}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0D2B4E] hover:bg-[#3E5A78] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Actualizando...' : 'Actualizar'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MULTI-FILTER BAR (CD, Mes, Semana, Contratista)               */}
      {/* ============================================================== */}
      <div id="availability-filters-card" className="bg-white p-5 rounded-3xl border border-[#F1F3F5] shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#F1F3F5] pb-3">
          <div className="flex items-center gap-2 text-xs font-black text-[#111827] uppercase tracking-wider">
            <Filter size={16} className="text-[#0D2B4E]" />
            <span>Filtros Múltiples Acumulativos</span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-[11px] font-black text-[#DC2626] hover:text-red-700 uppercase tracking-wider transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
            >
              <X size={13} />
              <span>Limpiar Filtros</span>
            </button>
          )}
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          
          {/* 1. Centro de Distribución (CD) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-black text-[#6B7280] uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Building2 size={13} className="text-[#0D2B4E]" /> Centro de Distribución:
              </span>
              <button
                onClick={() => setSelectedCds(selectedCds.length === availableCds.length ? [] : [...availableCds])}
                className="text-[10px] font-black text-[#0D2B4E] hover:underline"
              >
                {selectedCds.length === availableCds.length ? 'Desmarcar Todos' : 'Marcar Todos'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-[#F1F3F5] rounded-2xl border border-slate-200">
              <button
                onClick={() => setSelectedCds([])}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all tracking-wider ${
                  selectedCds.length === 0
                    ? 'bg-[#0D2B4E] text-white shadow-sm'
                    : 'bg-white text-[#6B7280] border border-slate-200 hover:bg-slate-100'
                }`}
              >
                TODOS
              </button>
              {availableCds.map(cd => {
                const isSelected = selectedCds.includes(cd);
                return (
                  <button
                    key={cd}
                    onClick={() => toggleCd(cd)}
                    className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all tracking-wider ${
                      isSelected
                        ? 'bg-[#0D2B4E] text-white shadow-sm'
                        : 'bg-white text-[#6B7280] border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cd}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Mes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-black text-[#6B7280] uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Calendar size={13} className="text-[#0D2B4E]" /> Mes:
              </span>
              <button
                onClick={() => setSelectedMonths(selectedMonths.length === availableMonths.length ? [] : [...availableMonths])}
                className="text-[10px] font-black text-[#0D2B4E] hover:underline"
              >
                {selectedMonths.length === availableMonths.length ? 'Desmarcar Todos' : 'Marcar Todos'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-[#F1F3F5] rounded-2xl border border-slate-200">
              <button
                onClick={() => setSelectedMonths([])}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all tracking-wider ${
                  selectedMonths.length === 0
                    ? 'bg-[#0D2B4E] text-white shadow-sm'
                    : 'bg-white text-[#6B7280] border border-slate-200 hover:bg-slate-100'
                }`}
              >
                TODOS
              </button>
              {availableMonths.map(m => {
                const isSelected = selectedMonths.includes(m);
                return (
                  <button
                    key={m}
                    onClick={() => toggleMonth(m)}
                    className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all tracking-wider ${
                      isSelected
                        ? 'bg-[#0D2B4E] text-white shadow-sm'
                        : 'bg-white text-[#6B7280] border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Semana */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-black text-[#6B7280] uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Layers size={13} className="text-[#0D2B4E]" /> Semana:
              </span>
              <button
                onClick={() => setSelectedWeeks(selectedWeeks.length === availableWeeks.length ? [] : [...availableWeeks])}
                className="text-[10px] font-black text-[#0D2B4E] hover:underline"
              >
                {selectedWeeks.length === availableWeeks.length ? 'Desmarcar Todas' : 'Marcar Todas'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-[#F1F3F5] rounded-2xl border border-slate-200">
              <button
                onClick={() => setSelectedWeeks([])}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all tracking-wider ${
                  selectedWeeks.length === 0
                    ? 'bg-[#0D2B4E] text-white shadow-sm'
                    : 'bg-white text-[#6B7280] border border-slate-200 hover:bg-slate-100'
                }`}
              >
                TODAS
              </button>
              {availableWeeks.map(w => {
                const isSelected = selectedWeeks.includes(w);
                return (
                  <button
                    key={w}
                    onClick={() => toggleWeek(w)}
                    className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all tracking-wider ${
                      isSelected
                        ? 'bg-[#0D2B4E] text-white shadow-sm'
                        : 'bg-white text-[#6B7280] border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {w}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Contratista */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-black text-[#6B7280] uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Briefcase size={13} className="text-[#0D2B4E]" /> Contratista:
              </span>
              <button
                onClick={() => setSelectedContractors(selectedContractors.length === availableContractors.length ? [] : [...availableContractors])}
                className="text-[10px] font-black text-[#0D2B4E] hover:underline"
              >
                {selectedContractors.length === availableContractors.length ? 'Desmarcar Todos' : 'Marcar Todos'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-[#F1F3F5] rounded-2xl border border-slate-200">
              <button
                onClick={() => setSelectedContractors([])}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all tracking-wider ${
                  selectedContractors.length === 0
                    ? 'bg-[#0D2B4E] text-white shadow-sm'
                    : 'bg-white text-[#6B7280] border border-slate-200 hover:bg-slate-100'
                }`}
              >
                TODOS
              </button>
              {availableContractors.map(c => {
                const isSelected = selectedContractors.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggleContractor(c)}
                    className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all tracking-wider ${
                      isSelected
                        ? 'bg-[#0D2B4E] text-white shadow-sm'
                        : 'bg-white text-[#6B7280] border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Selected active tags indicator */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#F1F3F5]">
            <span className="text-[10px] font-black text-[#6B7280] uppercase tracking-wider">Filtros Activos:</span>
            {selectedCds.map(cd => (
              <span key={`tag-${cd}`} className="inline-flex items-center gap-1 bg-[#0D2B4E]/10 text-[#0D2B4E] px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border border-[#0D2B4E]/20">
                CD: {cd}
                <button onClick={() => toggleCd(cd)} className="hover:text-black"><X size={11} /></button>
              </span>
            ))}
            {selectedMonths.map(m => (
              <span key={`tag-${m}`} className="inline-flex items-center gap-1 bg-[#3E5A78]/10 text-[#3E5A78] px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border border-[#3E5A78]/20">
                Mes: {m}
                <button onClick={() => toggleMonth(m)} className="hover:text-black"><X size={11} /></button>
              </span>
            ))}
            {selectedWeeks.map(w => (
              <span key={`tag-${w}`} className="inline-flex items-center gap-1 bg-[#F2B705]/15 text-amber-950 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border border-[#F2B705]/40">
                Semana: {w}
                <button onClick={() => toggleWeek(w)} className="hover:text-black"><X size={11} /></button>
              </span>
            ))}
            {selectedContractors.map(c => (
              <span key={`tag-${c}`} className="inline-flex items-center gap-1 bg-[#0D2B4E]/10 text-[#0D2B4E] px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border border-[#0D2B4E]/20">
                Contratista: {c}
                <button onClick={() => toggleContractor(c)} className="hover:text-black"><X size={11} /></button>
              </span>
            ))}
            {tableSearchPlate && (
              <span className="inline-flex items-center gap-1 bg-[#16A34A]/10 text-[#16A34A] px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border border-[#16A34A]/20">
                Placa: {tableSearchPlate}
                <button onClick={() => setTableSearchPlate('')} className="hover:text-black"><X size={11} /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* SECCIÓN 1: % DE DISPONIBILIDAD (Hoja %DISPONIBILIDAD)          */}
      {/* ============================================================== */}
      <div id="availability-section-1" className="space-y-6">
        
        {/* Section Title */}
        <div className="flex items-center gap-3">
          <div className="w-2 h-7 bg-[#0D2B4E] rounded-full"></div>
          <div>
            <h2 className="text-xl font-black text-[#111827] uppercase tracking-tight">
              1. Indicadores de % Disponibilidad
            </h2>
            <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
              Cálculo acumulado de disponibilidad y flota activa según filtros seleccionados
            </p>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: % Promedio */}
          <div className="bg-white p-5 rounded-3xl border border-[#F1F3F5] shadow-sm relative overflow-hidden group hover:border-[#3E5A78]/40 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                  % Disponibilidad Promedio
                </p>
                <h3 className="text-3xl font-black text-[#111827] mt-2 font-mono">
                  {kpiStats.avgPromedio}%
                </h3>
              </div>
              <div className={`p-3 rounded-2xl ${
                kpiStats.avgPromedio >= 95 ? 'bg-[#16A34A]/10 text-[#16A34A]' :
                kpiStats.avgPromedio >= 90 ? 'bg-[#F2B705]/20 text-[#D97706]' : 'bg-[#DC2626]/10 text-[#DC2626]'
              }`}>
                <TrendingUp size={22} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between pt-3 border-t border-[#F1F3F5] text-[10px] font-black uppercase">
              <span className="text-[#6B7280]">Meta: &ge; 95.0%</span>
              <span className={`px-2 py-0.5 rounded-full ${
                kpiStats.avgPromedio >= 95 ? 'bg-[#16A34A]/15 text-[#16A34A]' :
                kpiStats.avgPromedio >= 90 ? 'bg-[#F2B705]/20 text-[#B45309]' : 'bg-[#DC2626]/15 text-[#DC2626]'
              }`}>
                {kpiStats.avgPromedio >= 95 ? 'CUMPLE' : 'EN RIESGO'}
              </span>
            </div>
          </div>

          {/* Card 2: Total Vehículos */}
          <div className="bg-white p-5 rounded-3xl border border-[#F1F3F5] shadow-sm relative overflow-hidden group hover:border-[#3E5A78]/40 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                  Flota Promedio Total
                </p>
                <h3 className="text-3xl font-black text-[#0D2B4E] mt-2 font-mono">
                  {kpiStats.totalFleet}
                </h3>
              </div>
              <div className="p-3 bg-[#F1F3F5] text-[#3E5A78] rounded-2xl">
                <Truck size={22} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between pt-3 border-t border-[#F1F3F5] text-[10px] font-black uppercase text-[#6B7280]">
              <span>Registros analizados</span>
              <span className="font-mono text-[#111827]">{kpiStats.totalRecords}</span>
            </div>
          </div>

          {/* Card 3: Vehículos Disponibles */}
          <div className="bg-white p-5 rounded-3xl border border-[#F1F3F5] shadow-sm relative overflow-hidden group hover:border-[#16A34A]/40 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                  Vehículos Disponibles (Prom.)
                </p>
                <h3 className="text-3xl font-black text-[#16A34A] mt-2 font-mono">
                  {kpiStats.avgDisponibles}
                </h3>
              </div>
              <div className="p-3 bg-[#16A34A]/10 text-[#16A34A] rounded-2xl">
                <CheckCircle2 size={22} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between pt-3 border-t border-[#F1F3F5] text-[10px] font-black uppercase text-[#6B7280]">
              <span>Tasa operativa</span>
              <span className="font-mono text-[#16A34A]">
                {kpiStats.totalFleet > 0 ? ((kpiStats.avgDisponibles / kpiStats.totalFleet) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>

          {/* Card 4: Vehículos Indisponibles */}
          <div className="bg-white p-5 rounded-3xl border border-[#F1F3F5] shadow-sm relative overflow-hidden group hover:border-[#DC2626]/40 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                  Vehículos Indisponibles (Prom.)
                </p>
                <h3 className="text-3xl font-black text-[#DC2626] mt-2 font-mono">
                  {kpiStats.avgIndisponibles}
                </h3>
              </div>
              <div className="p-3 bg-[#DC2626]/10 text-[#DC2626] rounded-2xl">
                <AlertTriangle size={22} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between pt-3 border-t border-[#F1F3F5] text-[10px] font-black uppercase text-[#6B7280]">
              <span>Tasa indisponibilidad</span>
              <span className="font-mono text-[#DC2626]">
                {kpiStats.totalFleet > 0 ? ((kpiStats.avgIndisponibles / kpiStats.totalFleet) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>

        </div>

        {/* Charts Container with Visible Data Labels */}
        <div className="bg-white p-6 rounded-3xl border border-[#F1F3F5] shadow-sm space-y-6">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#F1F3F5] pb-4">
            <div>
              <h3 className="text-base font-black text-[#111827] uppercase tracking-tight flex items-center gap-2">
                <TrendingUp size={18} className="text-[#3E5A78]" />
                Evolución de % Disponibilidad Promedio
              </h3>
              <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                Visualización con etiquetas numéricas visibles en cada punto y comparativo de meta (95%)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Breakdown Toggle */}
              {activeCdList.length > 1 && (
                <button
                  onClick={() => setBreakdownByCd(!breakdownByCd)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                    breakdownByCd 
                      ? 'bg-[#0D2B4E] text-white border-[#0D2B4E] shadow-sm' 
                      : 'bg-white text-[#6B7280] border-slate-200 hover:bg-[#F1F3F5]'
                  }`}
                >
                  {breakdownByCd ? '✓ Desglose por CD' : 'Desglosar por CD'}
                </button>
              )}

              {/* Timeframe Selectors */}
              <div className="flex bg-[#F1F3F5] p-1 rounded-xl">
                <button
                  onClick={() => setChartTimeframe('semanal')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    chartTimeframe === 'semanal' ? 'bg-[#0D2B4E] text-white shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'
                  }`}
                >
                  Semanal
                </button>
                <button
                  onClick={() => setChartTimeframe('mensual')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    chartTimeframe === 'mensual' ? 'bg-[#0D2B4E] text-white shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'
                  }`}
                >
                  Mensual
                </button>
                <button
                  onClick={() => setChartTimeframe('diaria')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    chartTimeframe === 'diaria' ? 'bg-[#0D2B4E] text-white shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'
                  }`}
                >
                  Diaria
                </button>
              </div>
            </div>
          </div>

          {/* Chart Rendering with Visible Data Labels */}
          <div className="h-[360px] w-full pt-2">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[#6B7280] text-xs font-bold uppercase tracking-wider border-2 border-dashed border-slate-200 rounded-2xl">
                No hay datos disponibles para los filtros seleccionados
              </div>
            ) : chartTimeframe === 'diaria' && !breakdownByCd ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 25, right: 30, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={BRAND.fondoLineas} />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 10, fill: BRAND.textoSecundario, fontWeight: 700 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis 
                    domain={[60, 100]} 
                    tick={{ fontSize: 10, fill: BRAND.textoSecundario, fontWeight: 700 }}
                    unit="%"
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <Tooltip 
                    formatter={(val: any) => [`${val}%`, '% Disponibilidad']}
                    labelFormatter={(l) => `Fecha: ${l}`}
                    contentStyle={{ backgroundColor: BRAND.azulPrincipal, borderColor: BRAND.azulSecundario, borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                  />
                  <ReferenceLine y={95} stroke={BRAND.positivo} strokeDasharray="4 4" strokeWidth={2} label={{ value: 'Meta: 95%', position: 'right', fill: BRAND.positivo, fontSize: 10, fontWeight: 'bold' }} />
                  <Line 
                    type="monotone" 
                    dataKey="promedio" 
                    name="% Disponibilidad"
                    stroke={BRAND.azulSecundario} 
                    strokeWidth={3} 
                    dot={{ fill: BRAND.dorado, r: 5, strokeWidth: 2, stroke: BRAND.azulPrincipal }}
                    activeDot={{ r: 7 }}
                  >
                    <LabelList 
                      dataKey="promedio" 
                      position="top" 
                      formatter={(v: any) => `${v}%`}
                      style={{ fontSize: '10px', fontWeight: '900', fill: BRAND.textoPrincipal }} 
                    />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 25, right: 30, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={BRAND.fondoLineas} />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 11, fill: BRAND.textoSecundario, fontWeight: 800 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis 
                    domain={[60, 100]} 
                    tick={{ fontSize: 10, fill: BRAND.textoSecundario, fontWeight: 700 }}
                    unit="%"
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <Tooltip 
                    formatter={(val: any, name: any) => [`${val}%`, name]}
                    contentStyle={{ backgroundColor: BRAND.azulPrincipal, borderColor: BRAND.azulSecundario, borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '11px', fontWeight: 'bold' }} />
                  <ReferenceLine y={95} stroke={BRAND.positivo} strokeDasharray="4 4" strokeWidth={2} label={{ value: 'Meta: 95%', position: 'right', fill: BRAND.positivo, fontSize: 10, fontWeight: 'bold' }} />
                  
                  {breakdownByCd ? (
                    activeCdList.map((cdName, idx) => (
                      <Bar 
                        key={cdName}
                        dataKey={`cd_${cdName}`} 
                        name={cdName}
                        fill={getCdColor(cdName, idx)} 
                        radius={[6, 6, 0, 0]}
                        maxBarSize={38}
                      >
                        <LabelList 
                          dataKey={`cd_${cdName}`} 
                          position="top" 
                          formatter={(v: any) => v > 0 ? `${v}%` : ''}
                          style={{ fontSize: '9px', fontWeight: '900', fill: BRAND.textoPrincipal }} 
                        />
                      </Bar>
                    ))
                  ) : (
                    <Bar 
                      dataKey="promedio" 
                      name="% Promedio General"
                      fill={BRAND.azulSecundario} 
                      radius={[8, 8, 0, 0]}
                      maxBarSize={60}
                    >
                      <LabelList 
                        dataKey="promedio" 
                        position="top" 
                        formatter={(v: any) => `${v}%`}
                        style={{ fontSize: '11px', fontWeight: '900', fill: BRAND.textoPrincipal }} 
                      />
                      {chartData.map((entry: any, index: number) => {
                        const maxVal = Math.max(...chartData.map((d: any) => d.promedio || 0));
                        const isTop = chartData.length > 0 && entry.promedio === maxVal && maxVal > 0;
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={isTop ? BRAND.dorado : BRAND.azulSecundario} 
                          />
                        );
                      })}
                    </Bar>
                  )}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* SECCIÓN 2: ANÁLISIS DE INTERVENCIONES (Hoja DISPONILIDAD)     */}
      {/* ============================================================== */}
      <div id="availability-section-2" className="space-y-6">
        
        {/* Section Title */}
        <div className="flex items-center gap-3">
          <div className="w-2 h-7 bg-[#3E5A78] rounded-full"></div>
          <div>
            <h2 className="text-xl font-black text-[#111827] uppercase tracking-tight">
              2. Análisis de Intervenciones en Taller
            </h2>
            <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
              Sistemas más intervenidos, placas críticas y talleres con mayor carga ({interventionRankings.totalInterventions} registros)
            </p>
          </div>
        </div>

        {/* 3 Top Ranking Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Ranking 1: Sistema más intervenido */}
          <div className="bg-white p-5 rounded-3xl border border-[#F1F3F5] shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#6B7280] flex items-center gap-1.5">
                  <Wrench size={13} className="text-[#0D2B4E]" /> Sistema Más Intervenido
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#F2B705]/20 text-amber-950 text-[9px] font-black uppercase border border-[#F2B705]/40">
                  Top 1
                </span>
              </div>
              <h4 className="text-lg font-black text-[#111827] mt-2 uppercase truncate">
                {interventionRankings.topSistemas[0]?.name || 'N/A'}
              </h4>
              <p className="text-xs font-bold text-[#6B7280] mt-0.5">
                {interventionRankings.topSistemas[0]?.count || 0} intervenciones ({interventionRankings.topSistemas[0]?.pct || 0}%)
              </p>
            </div>

            {/* Mini list top 5 */}
            <div className="space-y-2 pt-3 border-t border-[#F1F3F5]">
              <p className="text-[9px] font-black text-[#6B7280] uppercase tracking-wider">Top 5 Sistemas:</p>
              <div className="space-y-1.5">
                {interventionRankings.topSistemas.slice(0, 5).map((sis, idx) => (
                  <div key={sis.name} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#111827] truncate max-w-[150px]">
                      {idx + 1}. {sis.name}
                    </span>
                    <span className="font-mono font-black text-[#0D2B4E] bg-[#F1F3F5] px-2 py-0.5 rounded-md text-[10px]">
                      {sis.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Ranking 2: Placa más intervenida */}
          <div className="bg-white p-5 rounded-3xl border border-[#F1F3F5] shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#6B7280] flex items-center gap-1.5">
                  <Truck size={13} className="text-[#DC2626]" /> Placa Más Intervenida
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#DC2626]/10 text-[#DC2626] text-[9px] font-black uppercase border border-[#DC2626]/20">
                  Crítica
                </span>
              </div>
              <h4 className="text-xl font-black text-[#111827] mt-2 font-mono uppercase tracking-tight">
                {interventionRankings.topPlacas[0]?.placa || 'N/A'}
              </h4>
              <p className="text-xs font-bold text-[#6B7280] mt-0.5">
                {interventionRankings.topPlacas[0]?.count || 0} ingresos • {interventionRankings.topPlacas[0]?.cd || ''}
              </p>
            </div>

            {/* Mini list top 5 */}
            <div className="space-y-2 pt-3 border-t border-[#F1F3F5]">
              <p className="text-[9px] font-black text-[#6B7280] uppercase tracking-wider">Top 5 Placas:</p>
              <div className="space-y-1.5">
                {interventionRankings.topPlacas.slice(0, 5).map((p, idx) => (
                  <div key={p.placa} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-[#6B7280] text-[10px]">{idx + 1}.</span>
                      <span className="font-mono font-black text-white bg-[#0D2B4E] px-1.5 py-0.5 rounded text-[10px]">
                        {p.placa}
                      </span>
                      <span className="text-[10px] font-bold text-[#6B7280] truncate max-w-[70px]">{p.cd}</span>
                    </div>
                    <span className="font-mono font-black text-[#0D2B4E] bg-[#F1F3F5] px-2 py-0.5 rounded-md text-[10px]">
                      {p.count} ing.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Ranking 3: Taller con más ingresos */}
          <div className="bg-white p-5 rounded-3xl border border-[#F1F3F5] shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#6B7280] flex items-center gap-1.5">
                  <Store size={13} className="text-[#3E5A78]" /> Taller Con Más Ingresos
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#3E5A78]/10 text-[#3E5A78] text-[9px] font-black uppercase border border-[#3E5A78]/20">
                  Mayor Carga
                </span>
              </div>
              <h4 className="text-lg font-black text-[#111827] mt-2 uppercase truncate">
                {interventionRankings.topTalleres[0]?.name || 'N/A'}
              </h4>
              <p className="text-xs font-bold text-[#6B7280] mt-0.5">
                {interventionRankings.topTalleres[0]?.count || 0} intervenciones ({interventionRankings.topTalleres[0]?.pct || 0}%)
              </p>
            </div>

            {/* Mini list top 5 */}
            <div className="space-y-2 pt-3 border-t border-[#F1F3F5]">
              <p className="text-[9px] font-black text-[#6B7280] uppercase tracking-wider">Top 5 Talleres:</p>
              <div className="space-y-1.5">
                {interventionRankings.topTalleres.slice(0, 5).map((tal, idx) => (
                  <div key={tal.name} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#111827] truncate max-w-[150px]">
                      {idx + 1}. {tal.name}
                    </span>
                    <span className="font-mono font-black text-[#0D2B4E] bg-[#F1F3F5] px-2 py-0.5 rounded-md text-[10px]">
                      {tal.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Chart: Intervenciones por Sistema with Visible Data Labels */}
        <div className="bg-white p-6 rounded-3xl border border-[#F1F3F5] shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-black text-[#111827] uppercase tracking-tight flex items-center gap-2">
              <Wrench size={18} className="text-[#3E5A78]" />
              Distribución de Intervenciones por Sistema
            </h3>
            <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
              Cantidad de ingresos a taller clasificados por componente/sistema
            </p>
          </div>

          <div className="h-[280px] w-full pt-2">
            {interventionRankings.chartSistemas.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[#6B7280] text-xs font-bold uppercase tracking-wider border-2 border-dashed border-slate-200 rounded-2xl">
                No hay intervenciones registradas para los filtros aplicados
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={interventionRankings.chartSistemas} layout="vertical" margin={{ top: 10, right: 35, left: 50, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={BRAND.fondoLineas} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: BRAND.textoSecundario, fontWeight: 700 }} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 10, fill: BRAND.textoPrincipal, fontWeight: 800 }}
                    width={110}
                  />
                  <Tooltip 
                    formatter={(val: any) => [`${val} intervenciones`, 'Cantidad']}
                    contentStyle={{ backgroundColor: BRAND.azulPrincipal, borderColor: BRAND.azulSecundario, borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="count" fill={BRAND.azulSecundario} radius={[0, 8, 8, 0]} maxBarSize={28}>
                    <LabelList 
                      dataKey="count" 
                      position="right" 
                      style={{ fontSize: '10px', fontWeight: '900', fill: BRAND.textoPrincipal }} 
                    />
                    {interventionRankings.chartSistemas.map((_, index) => (
                      <Cell 
                        key={`cell-sis-${index}`} 
                        fill={index === 0 ? BRAND.dorado : BRAND.azulSecundario} 
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
      {/* SECCIÓN 3: TABLA DETALLADA (8 Columnas, Buscador, Paginación)  */}
      {/* ============================================================== */}
      <div id="availability-section-3" className="space-y-4">
        
        {/* Section Title & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-3xl border border-[#F1F3F5] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-2 h-7 bg-[#0D2B4E] rounded-full"></div>
            <div>
              <h2 className="text-xl font-black text-[#111827] uppercase tracking-tight">
                3. Tabla Detallada de Intervenciones
              </h2>
              <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                Total de registros filtrados: {tableRecords.length}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search by plate */}
            <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
              <input
                type="text"
                placeholder="Buscar por placa..."
                value={tableSearchPlate}
                onChange={e => {
                  setTableSearchPlate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-[#F1F3F5] border border-slate-200 rounded-xl text-xs font-bold text-[#111827] placeholder-[#6B7280] uppercase outline-none focus:border-[#0D2B4E] focus:bg-white transition-all"
              />
              {tableSearchPlate && (
                <button
                  onClick={() => setTableSearchPlate('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827]"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Sort Date Toggle */}
            <button
              onClick={() => setTableSortDesc(!tableSortDesc)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#F1F3F5] hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-black uppercase text-[#111827] transition-colors"
              title="Cambiar orden de fecha"
            >
              <ArrowUpDown size={13} />
              <span>{tableSortDesc ? 'Más Reciente' : 'Más Antiguo'}</span>
            </button>

            {/* Export Button */}
            <button
              onClick={exportTableToCSV}
              disabled={tableRecords.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#16A34A]/10 hover:bg-[#16A34A]/20 text-[#16A34A] border border-[#16A34A]/30 rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              <Download size={13} />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* 8-Column Table */}
        <div className="bg-white rounded-3xl border border-[#F1F3F5] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0D2B4E] text-white text-[9px] uppercase font-black tracking-wider">
                  <th className="p-3.5 pl-5">1. Fecha</th>
                  <th className="p-3.5">2. Centro Distribución</th>
                  <th className="p-3.5">3. Sistema</th>
                  <th className="p-3.5">4. Detalle</th>
                  <th className="p-3.5">5. Placa</th>
                  <th className="p-3.5">6. Taller</th>
                  <th className="p-3.5">7. Ingreso Taller</th>
                  <th className="p-3.5 pr-5">8. Salida Estimada</th>
                </tr>
              </thead>
              <tbody className="text-xs font-medium text-[#111827]">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-[#6B7280] font-bold uppercase tracking-wider">
                      No se encontraron registros de intervenciones con los filtros actuales
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((r, idx) => (
                    <tr 
                      key={r.id ? `${r.id}-${idx}` : `interv-row-${idx}`} 
                      className={`border-b border-[#F1F3F5] transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-[#F1F3F5]/40'
                      } hover:bg-[#0D2B4E]/5`}
                    >
                      {/* 1. Fecha */}
                      <td className="p-3.5 pl-5 font-mono font-bold text-[#111827] whitespace-nowrap">
                        {r.fecha || '-'}
                      </td>

                      {/* 2. Centro de Distribución */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-[#F1F3F5] text-[#0D2B4E] font-black text-[10px] uppercase border border-slate-200">
                          {r.cd || '-'}
                        </span>
                      </td>

                      {/* 3. Sistema */}
                      <td className="p-3.5 font-black uppercase text-[#111827] whitespace-nowrap">
                        {r.sistema || '-'}
                      </td>

                      {/* 4. Detalle */}
                      <td className="p-3.5 text-[#6B7280] max-w-xs truncate" title={r.detalle || ''}>
                        {r.detalle || '-'}
                      </td>

                      {/* 5. Placa */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="px-2 py-1 rounded bg-[#0D2B4E] text-white font-mono font-black text-[11px] tracking-tighter">
                          {r.placa || r.placasKey || '-'}
                        </span>
                      </td>

                      {/* 6. Taller */}
                      <td className="p-3.5 font-bold uppercase text-[#3E5A78] whitespace-nowrap">
                        {r.taller || '-'}
                      </td>

                      {/* 7. Fecha Ingreso */}
                      <td className="p-3.5 font-mono text-[#6B7280] whitespace-nowrap">
                        {r.fechaIngreso || '-'}
                      </td>

                      {/* 8. Fecha Estimada Salida */}
                      <td className="p-3.5 pr-5 font-mono text-[#6B7280] whitespace-nowrap">
                        {r.fechaEstimadaSalida || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination */}
          {tableRecords.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-4 bg-[#F1F3F5]/60 border-t border-[#F1F3F5] text-xs font-bold text-[#6B7280]">
              <div className="flex items-center gap-2">
                <span>Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, tableRecords.length)} de {tableRecords.length}</span>
                <span className="text-slate-300">•</span>
                <select
                  value={itemsPerPage}
                  onChange={e => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-black text-[#111827] outline-none"
                >
                  <option value={15}>15 por pág.</option>
                  <option value={25}>25 por pág.</option>
                  <option value={50}>50 por pág.</option>
                  <option value={100}>100 por pág.</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-[#F1F3F5] disabled:opacity-40 disabled:hover:bg-white text-[#111827] transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-mono font-bold text-[#111827] text-xs">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-[#F1F3F5] disabled:opacity-40 disabled:hover:bg-white text-[#111827] transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default AvailabilityModule;
