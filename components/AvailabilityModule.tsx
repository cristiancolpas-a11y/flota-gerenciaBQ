import React, { useMemo, useState } from 'react';
import { AvailabilityRecord, FleetListRecord } from '../types';
import { 
  Activity, 
  Truck, 
  Wrench, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  CheckCircle2,
  XCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Filter
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
  LabelList,
} from 'recharts';

const getWeekNumber = (d: Date) => {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

interface AvailabilityDashboardProps {
  availability: AvailabilityRecord[];
  fleetBase: FleetListRecord[];
}

const AvailabilityModule: React.FC<AvailabilityDashboardProps> = ({ availability, fleetBase }) => {
  const [filterCd, setFilterCd] = useState<string>('all');
  const [filterContractor, setFilterContractor] = useState<string>('all');
  const [systemView, setSystemView] = useState<'all' | 'GALAPA' | 'ARENOSA'>('all');
  
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  
  // Default to current month or range of data
  const initialRange = useMemo(() => {
    if (availability.length === 0) return { start: '2026-01-01', end: new Date().toISOString().split('T')[0] };
    const dates = availability.map(r => r.fecha).filter(d => d && d >= '2026-01-01').sort();
    return { 
      start: dates[0] || '2026-01-01', 
      end: dates[dates.length - 1] || new Date().toISOString().split('T')[0] 
    };
  }, [availability]);

  const [dateRange, setDateRange] = useState(initialRange);

  const processedData = useMemo(() => {
    // 1. Filter Availability Records by CD, Contractor, and DATE RANGE
    let filtered = availability.filter(r => {
      if (!r.fecha) return false;
      const isWithinDate = r.fecha >= dateRange.start && r.fecha <= dateRange.end;
      const matchCd = filterCd === 'all' || 
                      (r.cdRegistro && r.cdRegistro.toUpperCase().includes(filterCd.toUpperCase())) ||
                      (r.cdOriginal && r.cdOriginal.toUpperCase().includes(filterCd.toUpperCase()));
      const matchContractor = filterContractor === 'all' || 
                              (r.contratista && r.contratista.toUpperCase().includes(filterContractor.toUpperCase()));
      return isWithinDate && matchCd && matchContractor;
    });

    // 1.5 Subdivide for dynamic card and list filters (cross-filtering)
    let statsFiltered = filtered;
    if (selectedDate) {
      statsFiltered = filtered.filter(r => r.fecha === selectedDate);
    } else if (selectedWeek) {
      statsFiltered = filtered.filter(r => {
        const d = new Date(r.fecha);
        const w = getWeekNumber(d);
        const y = d.getFullYear();
        const key = `${y}-W${w}`;
        return key === selectedWeek;
      });
    } else if (selectedMonth) {
      statsFiltered = filtered.filter(r => {
        const d = new Date(r.fecha);
        const label = d.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
        return label === selectedMonth;
      });
    }

    // 2. Discover Fleet Bases for the priority CDs
    // We try to find the 'totalVH' reported in the sheet for these CDs
    const getReportedBase = (cdKey: string) => {
      const records = availability.filter(r => 
        (r.cdRegistro?.toUpperCase().includes(cdKey) || r.cdOriginal?.toUpperCase().includes(cdKey)) &&
        (filterContractor === 'all' || r.contratista?.toUpperCase().includes(filterContractor.toUpperCase()))
      );
      // Take the most frequent totalVH or the max
      const bases = records.map(r => r.totalVH).filter(v => v > 0);
      if (bases.length > 0) {
        // Return most common value (mode)
        const counts: any = {};
        bases.forEach(b => counts[b] = (counts[b] || 0) + 1);
        return parseFloat(Object.entries(counts).sort((a: any, b: any) => b[1] - a[1])[0][0]);
      }
      
      // Fallback to fleetBase sheet
      return fleetBase.filter(v => 
        v.cd?.toUpperCase().includes(cdKey) &&
        (filterContractor === 'all' || v.contratista?.toUpperCase().includes(filterContractor.toUpperCase()))
      ).length || (cdKey === 'GALAPA' ? 122 : 105);
    };

    const baseGalapa = filterContractor === 'all' ? 92 : getReportedBase('GALAPA');
    const baseArenosa = getReportedBase('ARENOSA');
    
    const parseDate = (dStr: string) => {
      if (!dStr || typeof dStr !== 'string') return new Date(0);
      return new Date(dStr);
    };

    // Sort by date for tendencies
    const sortedByDate = [...filtered].sort((a, b) => a.fecha.localeCompare(b.fecha));

    // --- KPI CALCULATION (Latest Day in Filtered Set) ---
    const latestDate = sortedByDate.length > 0 ? sortedByDate[sortedByDate.length - 1].fecha : null;
    const latestRecords = filtered.filter(r => r.fecha === latestDate);
    
    const uGT = new Set(latestRecords.filter(r => 
      (r.cdRegistro?.toUpperCase().includes('GALAPA') || r.cdOriginal?.toUpperCase().includes('GALAPA')) &&
      r.vehiculoIndisponible === 1
    ).map(r => r.placasKey)).size;
    
    const uAT = new Set(latestRecords.filter(r => 
      (r.cdRegistro?.toUpperCase().includes('ARENOSA') || r.cdOriginal?.toUpperCase().includes('ARENOSA')) &&
      r.vehiculoIndisponible === 1
    ).map(r => r.placasKey)).size;
    
    const dispoGalapaToday = ((baseGalapa - uGT) / baseGalapa) * 100;
    const dispoArenosaToday = ((baseArenosa - uAT) / baseArenosa) * 100;
    const indispTotalToday = uGT + uAT;

    // Highest frequency system in range
    const rangeSystemMap: Record<string, number> = {};
    statsFiltered.forEach(r => {
      if (r.sistema) rangeSystemMap[r.sistema] = (rangeSystemMap[r.sistema] || 0) + 1;
    });
    const topSystemRange = Object.entries(rangeSystemMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // --- CHARTS DATA ---
    // Generate ALL dates in the selected range
    const allDates: string[] = [];
    const dateStart = new Date(dateRange.start);
    const dateEnd = new Date(dateRange.end);
    const curr = new Date(dateStart);
    while(curr <= dateEnd) {
      allDates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    // A. Daily Tendency
    const dailyTendency = allDates.map(dateStr => {
      const dayRecs = filtered.filter(r => r.fecha === dateStr);
      const uG = new Set(dayRecs.filter(r => (r.cdRegistro?.toUpperCase().includes('GALAPA') || r.cdOriginal?.toUpperCase().includes('GALAPA')) && r.vehiculoIndisponible === 1).map(r => r.placasKey)).size;
      const uA = new Set(dayRecs.filter(r => (r.cdRegistro?.toUpperCase().includes('ARENOSA') || r.cdOriginal?.toUpperCase().includes('ARENOSA')) && r.vehiculoIndisponible === 1).map(r => r.placasKey)).size;
      
      return {
        name: dateStr,
        galapa: Math.round(((baseGalapa - uG) / baseGalapa) * 1000) / 10,
        arenosa: Math.round(((baseArenosa - uA) / baseArenosa) * 1000) / 10
      };
    }).slice(-60); // Show last 60 days for better perspective

    // B. Weekly Availability
    const weeklyMap: Record<string, { galapa: number, arenosa: number, label: string, sumG: number, sumA: number, count: number }> = {};
    allDates.forEach(dateStr => {
      const d = new Date(dateStr);
      const w = getWeekNumber(d);
      const y = d.getFullYear();
      const key = `${y}-W${w}`;
      
      if (!weeklyMap[key]) {
        const start = new Date(d);
        start.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const label = `Sem ${w}`;
        weeklyMap[key] = { label, galapa: 0, arenosa: 0, sumG: 0, sumA: 0, count: 0 };
      }

      const dayRecs = filtered.filter(r => r.fecha === dateStr);
      const uG = new Set(dayRecs.filter(r => (r.cdRegistro?.toUpperCase().includes('GALAPA') || r.cdOriginal?.toUpperCase().includes('GALAPA')) && r.vehiculoIndisponible === 1).map(r => r.placasKey)).size;
      const uA = new Set(dayRecs.filter(r => (r.cdRegistro?.toUpperCase().includes('ARENOSA') || r.cdOriginal?.toUpperCase().includes('ARENOSA')) && r.vehiculoIndisponible === 1).map(r => r.placasKey)).size;
      
      weeklyMap[key].sumG += ((baseGalapa - uG) / baseGalapa) * 100;
      weeklyMap[key].sumA += ((baseArenosa - uA) / baseArenosa) * 100;
      weeklyMap[key].count += 1;
    });

    const weeklyChart = Object.entries(weeklyMap).map(([key, w]) => ({
      name: w.label,
      key,
      galapa: Math.round((w.sumG / w.count) * 10) / 10,
      arenosa: Math.round((w.sumA / w.count) * 10) / 10
    })).slice(-12); // Show last 12 weeks

    // C. Monthly Availability
    const monthlyMap: Record<string, { galapa: number, arenosa: number, sumG: number, sumA: number, count: number, monthRecs: any[] }> = {};
    allDates.forEach(dateStr => {
      const d = new Date(dateStr);
      const label = d.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
      
      if (!monthlyMap[label]) {
        monthlyMap[label] = { galapa: 0, arenosa: 0, sumG: 0, sumA: 0, count: 0, monthRecs: [] };
      }

      const dayRecs = filtered.filter(r => r.fecha === dateStr);
      const uG = new Set(dayRecs.filter(r => (r.cdRegistro?.toUpperCase().includes('GALAPA') || r.cdOriginal?.toUpperCase().includes('GALAPA')) && r.vehiculoIndisponible === 1).map(r => r.placasKey)).size;
      const uA = new Set(dayRecs.filter(r => (r.cdRegistro?.toUpperCase().includes('ARENOSA') || r.cdOriginal?.toUpperCase().includes('ARENOSA')) && r.vehiculoIndisponible === 1).map(r => r.placasKey)).size;
      
      monthlyMap[label].sumG += ((baseGalapa - uG) / baseGalapa) * 100;
      monthlyMap[label].sumA += ((baseArenosa - uA) / baseArenosa) * 100;
      monthlyMap[label].count += 1;
      monthlyMap[label].monthRecs.push(...dayRecs);
    });

    const calcAvgTaller = (recs: any[]) => {
      if (recs.length === 0) return 0;
      const uniqueEvents = new Set(recs.map(r => `${r.placa}-${r.fechaIngreso}`)).size;
      const sum = recs.reduce((acc, row) => {
        if (!row.fechaIngreso || !row.fecha) return acc;
        const fR = new Date(row.fecha).getTime();
        const fI = new Date(row.fechaIngreso).getTime();
        return acc + Math.max(0, (fR - fI) / (1000 * 60 * 60 * 24));
      }, 0);
      return Math.round((sum / (uniqueEvents || 1)) * 10) / 10;
    };

    const monthlyChart = Object.entries(monthlyMap).map(([name, data]) => {
      return {
        name,
        galapa: Math.round((data.sumG / data.count) * 10) / 10,
        arenosa: Math.round((data.sumA / data.count) * 10) / 10,
        sumDaysG: calcAvgTaller(data.monthRecs.filter(row => row.cdRegistro?.toUpperCase().includes('GALAPA') || row.cdOriginal?.toUpperCase().includes('GALAPA'))),
        sumDaysA: calcAvgTaller(data.monthRecs.filter(row => row.cdRegistro?.toUpperCase().includes('ARENOSA') || row.cdOriginal?.toUpperCase().includes('ARENOSA'))),
        baseG: baseGalapa,
        baseA: baseArenosa
      };
    });

    // D. Top Fallas
    const systemFilter = systemView === 'all' ? filtered : filtered.filter(r => r.cdRegistro?.toUpperCase().includes(systemView.toUpperCase()));
    const systemCounts: Record<string, number> = {};
    systemFilter.forEach(r => {
      systemCounts[r.sistema] = (systemCounts[r.sistema] || 0) + 1;
    });
    const topFailures = Object.entries(systemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    // E. Workshop Participation
    const workshopCounts: Record<string, number> = {};
    filtered.forEach(r => {
      const w = r.taller || 'SIN ESPECIFICAR';
      workshopCounts[w] = (workshopCounts[w] || 0) + 1;
    });
    const workshopDistribution = Object.entries(workshopCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, value]) => ({ name, value }));

    // F. Top 10 Critical Vehicles
    const criticalMap: Record<string, { cd: string, dist: string, novedades: number, dias: number, systems: Record<string, number> }> = {};
    filtered.forEach(r => {
      const plate = r.placasKey || 'N/A';
      if (!criticalMap[plate]) {
        const baseInfo = fleetBase.find(v => v.placa === plate);
        criticalMap[plate] = {
          cd: r.cdRegistro || 'N/A',
          dist: baseInfo?.distribuidor || 'N/A',
          novedades: 0,
          dias: 0,
          systems: {}
        };
      }
      criticalMap[plate].novedades += 1;
      criticalMap[plate].dias += (r.diasIndisponible || 0);
      criticalMap[plate].systems[r.sistema] = (criticalMap[plate].systems[r.sistema] || 0) + 1;
    });

    const criticalVehicles = Object.entries(criticalMap)
      .sort((a, b) => b[1].dias - a[1].dias)
      .slice(0, 10)
      .map(([plate, data]) => ({
        plate,
        cd: data.cd,
        dist: data.dist,
        novedades: data.novedades,
        dias: data.novedades > 0 ? Math.round((data.dias / data.novedades) * 10) / 10 : 0,
        topSystem: Object.entries(data.systems).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
      }));

    // Calculate Unified Average Availability across all selected days/filter
    let statsDates = allDates;
    if (selectedDate) {
      statsDates = [selectedDate];
    } else if (selectedWeek) {
      statsDates = allDates.filter(dateStr => {
        const d = new Date(dateStr);
        const w = getWeekNumber(d);
        const y = d.getFullYear();
        const key = `${y}-W${w}`;
        return key === selectedWeek;
      });
    } else if (selectedMonth) {
      statsDates = allDates.filter(dateStr => {
        const d = new Date(dateStr);
        const label = d.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
        return label === selectedMonth;
      });
    }

    let statsAvailableSum = 0;
    let statsCapacitySum = 0;

    statsDates.forEach((dateStr) => {
      const dayRecs = filtered.filter((r) => r.fecha === dateStr);

      const isGalapaSelected = filterCd === 'all' || filterCd.toUpperCase().includes('GALAPA');
      const isArenosaSelected = filterCd === 'all' || filterCd.toUpperCase().includes('ARENOSA');

      if (isGalapaSelected) {
        const uG = new Set(
          dayRecs
            .filter(
              (r) =>
                (r.cdRegistro?.toUpperCase().includes('GALAPA') ||
                  r.cdOriginal?.toUpperCase().includes('GALAPA')) &&
                r.vehiculoIndisponible === 1
            )
            .map((r) => r.placasKey)
        ).size;
        statsAvailableSum += baseGalapa - uG;
        statsCapacitySum += baseGalapa;
      }

      if (isArenosaSelected) {
        const uA = new Set(
          dayRecs
            .filter(
              (r) =>
                (r.cdRegistro?.toUpperCase().includes('ARENOSA') ||
                  r.cdOriginal?.toUpperCase().includes('ARENOSA')) &&
                r.vehiculoIndisponible === 1
            )
            .map((r) => r.placasKey)
        ).size;
        statsAvailableSum += baseArenosa - uA;
        statsCapacitySum += baseArenosa;
      }
    });

    const statsUnifiedAverageDispo = statsCapacitySum > 0 ? (statsAvailableSum / statsCapacitySum) * 100 : 0;
    const statsIndispCount = new Set(statsFiltered.filter(r => r.vehiculoIndisponible === 1).map(r => r.placasKey)).size;

    return {
      kpis: { 
        dispoGalapaToday, 
        dispoArenosaToday, 
        indispTotalToday, 
        topSystemMonth: topSystemRange,
        unifiedAverageDispo: Math.round(statsUnifiedAverageDispo * 10) / 10,
        indispFilterCount: statsIndispCount,
        topSystemFilter: topSystemRange
      },
      dailyTendency,
      weeklyChart,
      monthlyChart,
      topFailures,
      workshopDistribution,
      monthlySummary: [...monthlyChart].reverse().map(m => ({
        name: m.name,
        galapaDispo: m.galapa,
        arenosaDispo: m.arenosa,
        galapaAvgDays: m.sumDaysG,
        arenosaAvgDays: m.sumDaysA,
        baseG: m.baseG,
        baseA: m.baseA
      })),
      criticalVehicles,
      dateRange: {
        min: sortedByDate[0]?.fecha || 'N/A',
        max: sortedByDate[sortedByDate.length - 1]?.fecha || 'N/A'
      }
    };
  }, [availability, fleetBase, filterCd, filterContractor, systemView, selectedDate, selectedWeek, selectedMonth]);

  const contractors = useMemo(() => {
    const fromBase = fleetBase.map(v => v.contratista).filter(Boolean);
    const fromAvail = availability.map(v => v.contratista).filter(Boolean);
    return Array.from(new Set([...fromBase, ...fromAvail])).sort();
  }, [fleetBase, availability]);

  const getEfficiencyColor = (val: number) => {
    if (val < 70) return 'text-rose-500';
    if (val < 85) return 'text-amber-500';
    return 'text-emerald-500';
  };

  const COLORS = ['#3B82F6', '#F97316', '#10B981', '#A855F7', '#F43F5E', '#EC4899', '#6366F1'];

  return (
    <div className="min-h-screen bg-[#F0F4FF] text-slate-800 p-4 md:p-8 font-sans animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-lg shadow-indigo-600/20">
              <Activity size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-950">Dashboard Disponibilidad</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <p className="text-indigo-600 font-bold text-xs uppercase tracking-widest">
                  Periodo: {processedData.dateRange.min} → {processedData.dateRange.max}
                </p>
                {(selectedDate || selectedWeek || selectedMonth) && (
                  <span className="bg-amber-500/10 text-amber-700 border border-amber-500/30 text-[9px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                    ⚡ FILTRO ACTIVO: {selectedDate || (selectedWeek ? `SEMANA ${selectedWeek.split('-W')[1]}` : selectedMonth)}
                    <button 
                      onClick={() => {
                        setSelectedDate(null);
                        setSelectedWeek(null);
                        setSelectedMonth(null);
                      }}
                      className="hover:text-white transition-colors ml-1 font-black bg-amber-500/20 hover:bg-amber-500/40 rounded-full w-4 h-4 flex items-center justify-center text-[8px]"
                      title="Quitar filtro de gráfico"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
           <div className="bg-white p-2 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
              <div className="flex items-center gap-2 pl-4 pr-3 border-r border-slate-200">
                <Calendar size={16} className="text-indigo-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">INICIO</span>
              </div>
              <input 
                type="date"
                className="bg-transparent text-sm font-black uppercase outline-none cursor-pointer text-slate-700"
                value={dateRange.start}
                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
           </div>

           <div className="bg-white p-2 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
              <div className="flex items-center gap-2 pl-4 pr-3 border-r border-slate-200">
                <Calendar size={16} className="text-indigo-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FIN</span>
              </div>
              <input 
                type="date"
                className="bg-transparent text-sm font-black uppercase outline-none cursor-pointer text-slate-700"
                value={dateRange.end}
                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
           </div>

           <div className="bg-white p-2 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
              <div className="flex items-center gap-2 pl-4 pr-3 border-r border-slate-200">
                <Filter size={16} className="text-indigo-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CD</span>
              </div>
              <select 
                className="bg-transparent text-slate-700 text-sm font-black uppercase outline-none pr-6 cursor-pointer"
                value={filterCd}
                onChange={e => setFilterCd(e.target.value)}
              >
                <option value="all">AMBOS CD</option>
                <option value="GALAPA">GALAPA</option>
                <option value="ARENOSA">LA ARENOSA</option>
              </select>
           </div>

           <div className="bg-white p-2 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
              <div className="flex items-center gap-2 pl-4 pr-3 border-r border-slate-200">
                <Truck size={16} className="text-indigo-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CONTRATISTA</span>
              </div>
              <select 
                className="bg-transparent text-slate-700 text-sm font-black uppercase outline-none pr-6 cursor-pointer max-w-[200px]"
                value={filterContractor}
                onChange={e => setFilterContractor(e.target.value)}
              >
                <option value="all">TODOS</option>
                {contractors.map(c => (
                  <option key={c} value={c}>{c.toUpperCase()}</option>
                ))}
              </select>
           </div>
           
           <div className="bg-white px-8 py-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-indigo-500 uppercase mb-1">GENERADO EL</span>
                <span className="text-sm font-black text-slate-700">{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}</span>
              </div>
           </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-all duration-500"></div>
          <div className="relative z-10 space-y-4">
            <div className="text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div> 
              {selectedDate || selectedWeek || selectedMonth ? 'PROMEDIO FILTRADO' : 'PROMEDIO COMPLETO'}
            </div>
            <h2 className={`text-5xl font-black ${getEfficiencyColor(processedData.kpis.unifiedAverageDispo)}`}>
              {processedData.kpis.unifiedAverageDispo}%
            </h2>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              {selectedDate || selectedWeek || selectedMonth ? 'Disponibilidad Periodo Seleccionado' : `Disponibilidad General (${filterCd === 'all' ? 'Ambos CD' : filterCd.toUpperCase()})`}
            </p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative group">
          <div className="relative z-10 space-y-4">
            <div className="text-[11px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div> 
              {selectedDate || selectedWeek || selectedMonth ? 'SISTEMA CRÍTICO (FILTRO)' : 'SISTEMA CRÍTICO'}
            </div>
            <h2 className="text-2xl font-black text-amber-600 uppercase break-words leading-tight">
              {selectedDate || selectedWeek || selectedMonth ? processedData.kpis.topSystemFilter : processedData.kpis.topSystemMonth}
            </h2>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              Sistema con mayor frecuencia de parada
            </p>
          </div>
        </div>
      </div>

      {/* Daily Tendency */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">
        <div className="xl:col-span-2 bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4 border-b border-slate-100 pb-6">
            <div>
              <h3 className="text-lg font-black uppercase flex items-center gap-3 text-slate-900">
                <TrendingUp size={20} className="text-indigo-500" /> Tendencia Diaria
              </h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">META 85%</p>
            </div>
            <div className="flex items-center gap-6">
               {(filterCd === 'all' || filterCd === 'GALAPA') && (
                 <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#3B82F6]"></div><span className="text-[10px] font-black text-slate-400 uppercase">GALAPA</span></div>
               )}
               {(filterCd === 'all' || filterCd === 'ARENOSA') && (
                 <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#F97316]"></div><span className="text-[10px] font-black text-slate-400 uppercase">ARENOSA</span></div>
               )}
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={processedData.dailyTendency} 
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                onClick={(data) => {
                  if (data && data.activeLabel !== undefined && data.activeLabel !== null) {
                    setSelectedDate(String(data.activeLabel));
                    setSelectedWeek(null);
                    setSelectedMonth(null);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 900 }} tickFormatter={(v) => v ? v.split('-').slice(1).join('/') : ''}/>
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} domain={[0, 105]} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', fontSize: '10px', fontWeight: 900 }} />
                <ReferenceLine y={85} stroke="#EF4444" strokeDasharray="10 10" />
                {(filterCd === 'all' || filterCd === 'GALAPA') && (
                  <Line type="monotone" dataKey="galapa" stroke="#3B82F6" strokeWidth={5} dot={false} />
                )}
                {(filterCd === 'all' || filterCd === 'ARENOSA') && (
                  <Line type="monotone" dataKey="arenosa" stroke="#F97316" strokeWidth={5} dot={false} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Failures */}
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-10 border-b border-slate-100 pb-6">
            <h3 className="text-lg font-black uppercase flex items-center gap-3 text-slate-900">
              <AlertTriangle size={20} className="text-amber-500" /> Top 8 Fallas
            </h3>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {(['all', 'GALAPA', 'ARENOSA'] as const).map(v => (
                <button key={v} onClick={() => setSystemView(v)} className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${systemView === v ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'}`}>{v === 'all' ? 'MIX' : v}</button>
              ))}
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={processedData.topFailures} margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: 900 }} width={90}/>
                <XAxis type="number" hide />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px' }} />
                <Bar dataKey="count" fill="#F97316" radius={[0, 6, 6, 0]} barSize={15}>
                  {processedData.topFailures.map((_, i) => <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />)}
                  <LabelList dataKey="count" position="right" fill="#475569" fontSize={9} fontWeight={900} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Weekly & Monthly Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
          <h3 className="text-lg font-black uppercase flex items-center gap-3 mb-8 pb-4 border-b border-slate-100 text-slate-900">
            <BarChart3 size={20} className="text-indigo-500" /> Disponibilidad Semanal
          </h3>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={processedData.weeklyChart} 
                  margin={{ top: 20, right: 10, left: -25, bottom: 20 }}
                  onClick={(data: any) => {
                    if (data && data.activePayload && data.activePayload[0]) {
                      const payload = data.activePayload[0].payload;
                      if (payload.key) {
                        setSelectedWeek(payload.key);
                        setSelectedDate(null);
                        setSelectedMonth(null);
                      }
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 8, fontWeight: 900 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px' }} />
                  <ReferenceLine y={85} stroke="#EF4444" strokeDasharray="5 5" />
                  {(filterCd === 'all' || filterCd === 'GALAPA') && (
                    <Bar dataKey="galapa" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={filterCd === 'GALAPA' ? 35 : 20}>
                      <LabelList dataKey="galapa" position="top" fill="#475569" fontSize={8} fontWeight={900} formatter={(v: any) => `${v}%`} />
                    </Bar>
                  )}
                  {(filterCd === 'all' || filterCd === 'ARENOSA') && (
                    <Bar dataKey="arenosa" fill="#F97316" radius={[4, 4, 0, 0]} barSize={filterCd === 'ARENOSA' ? 35 : 20}>
                      <LabelList dataKey="arenosa" position="top" fill="#475569" fontSize={8} fontWeight={900} formatter={(v: any) => `${v}%`} />
                    </Bar>
                  )}
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
          <h3 className="text-lg font-black uppercase flex items-center gap-3 mb-8 pb-4 border-b border-slate-100 text-slate-900">
            <Calendar size={20} className="text-purple-500" /> Disponibilidad Mensual
          </h3>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={processedData.monthlyChart} 
                  margin={{ top: 20, right: 10, left: -25, bottom: 20 }}
                  onClick={(data) => {
                    if (data && data.activeLabel !== undefined && data.activeLabel !== null) {
                      setSelectedMonth(String(data.activeLabel));
                      setSelectedDate(null);
                      setSelectedWeek(null);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 9, fontWeight: 900 }} tickFormatter={v => v ? v.split(' ')[0] : ''} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px' }} />
                  <ReferenceLine y={85} stroke="#EF4444" strokeDasharray="5 5" />
                  {(filterCd === 'all' || filterCd === 'GALAPA') && (
                    <Bar dataKey="galapa" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={filterCd === 'GALAPA' ? 55 : 35}>
                      <LabelList dataKey="galapa" position="top" fill="#475569" fontSize={8} fontWeight={900} formatter={(v: any) => `${v}%`} />
                    </Bar>
                  )}
                  {(filterCd === 'all' || filterCd === 'ARENOSA') && (
                    <Bar dataKey="arenosa" fill="#F97316" radius={[4, 4, 0, 0]} barSize={filterCd === 'ARENOSA' ? 55 : 35}>
                      <LabelList dataKey="arenosa" position="top" fill="#475569" fontSize={8} fontWeight={900} formatter={(v: any) => `${v}%`} />
                    </Bar>
                  )}
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm overflow-x-auto">
          <h3 className="text-lg font-black uppercase flex items-center gap-3 mb-8 pb-4 border-b border-slate-100 text-slate-900">Top 10 Críticos</h3>
          <table className="w-full text-left text-[9px] uppercase">
             <thead>
               <tr className="border-b border-slate-200 text-slate-500">
                 <th className="pb-4 pr-4">PLACA</th>
                 <th className="pb-4 px-4">CD</th>
                 <th className="pb-4 px-4">DISTRIBUIDOR</th>
                 <th className="pb-4 px-4">AVG DÍAS</th>
                 <th className="pb-4 pl-4 text-right">SISTEMA TOP</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 text-slate-700">
                {processedData.criticalVehicles.map((v, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-all">
                     <td className="py-4 pr-4 font-black font-mono text-slate-900">{v.plate}</td>
                     <td className="py-4 px-4 font-black text-slate-500">{v.cd}</td>
                     <td className="py-4 px-4 font-black text-slate-500">{v.dist}</td>
                     <td className="py-4 px-4 font-black text-rose-600">{v.dias} d</td>
                     <td className="py-4 pl-4 font-black text-indigo-600 text-right italic">{v.topSystem}</td>
                  </tr>
                ))}
             </tbody>
          </table>
        </div>
      </div>

      <div className="mt-12 text-center pb-20">
         <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Fuente: DISPONIBILIDAD.xlsx | Sistema v4.0</p>
      </div>
    </div>
  );
};

export default AvailabilityModule;


