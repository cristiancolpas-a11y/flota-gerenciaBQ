import React, { useMemo, useState } from 'react';
import { 
  ArrowUp, ArrowDown, ListFilter, Maximize2, MoreHorizontal,
  ChevronUp, ChevronDown
} from 'lucide-react';
import { WorkshopActivityRecord } from '../types';

// Let's define the localized lowercased month labels we showed
const MONTH_NAMES: Record<string, string> = {
  'ENERO': 'enero',
  'FEBRERO': 'febrero',
  'MARZO': 'marzo',
  'ABRIL': 'abril'
};

const getRecordMonthLower = (dateStr: string): string => {
  const parts = dateStr.split('-');
  const mStr = parts[1];
  if (mStr === '01') return 'enero';
  if (mStr === '02') return 'febrero';
  if (mStr === '03') return 'marzo';
  if (mStr === '04') return 'abril';
  return 'otros';
};

// ----------------- HEADER ROW ACTIONS (PowerBI replica) -----------------
const ChartHeader: React.FC<{ title: string; subtitle?: string; showDrill?: boolean }> = ({ title, subtitle, showDrill }) => {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
      <div>
        <h3 className="text-sm font-extrabold text-white tracking-wide uppercase font-sans select-none">{title}</h3>
        {subtitle && <p className="text-[9px] font-semibold text-slate-400 capitalize select-none">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-1.5 text-slate-400">
        {showDrill && (
          <>
            <button className="p-1 hover:text-white hover:bg-white/5 rounded transition-all" title="Drill Up">
              <ChevronUp size={12} className="stroke-[3]" />
            </button>
            <button className="p-1 hover:text-white hover:bg-white/5 rounded transition-all" title="Drill Down">
              <ChevronDown size={12} className="stroke-[3]" />
            </button>
            <div className="h-3 w-px bg-white/10 mx-0.5" />
          </>
        )}
        <button className="p-1 hover:text-white hover:bg-white/5 rounded transition-all" title="Filtro">
          <ListFilter size={12} className="stroke-[2.5]" />
        </button>
        <button className="p-1 hover:text-white hover:bg-white/5 rounded transition-all" title="Enfocar">
          <Maximize2 size={12} className="stroke-[2.5]" />
        </button>
        <button className="p-1 hover:text-white hover:bg-white/5 rounded transition-all" title="Más opciones">
          <MoreHorizontal size={12} className="stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};

// ----------------- CHART 1: SEGUIMIENTO MENSUAL & MTD (Side-by-side) -----------------
interface GroupedMonthlyChartProps {
  records: WorkshopActivityRecord[];
  uniqueCds: string[];
  activeCd?: string | null;
  onSelectCd?: (cd: string | null) => void;
  activeMonth?: string | null;
  onSelectMonth?: (month: string | null) => void;
}
export const GroupedMonthlyChart: React.FC<GroupedMonthlyChartProps> = ({ 
  records, 
  uniqueCds,
  activeCd,
  onSelectCd,
  activeMonth,
  onSelectMonth
}) => {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [hoveredMtdCd, setHoveredMtdCd] = useState<string | null>(null);

  // Let's compute grouped monthly data
  // We want to group by month (enero, febrero, marzo, abril)
  // Inside each month, we list the values for the CDs.
  // The CDs will be GALAPA, LA ARENOSA or any active CDs.
  // We compute the average MTTR in hours.
  
  const activeCds = useMemo(() => {
    return uniqueCds.length > 0 ? uniqueCds.slice(0, 3) : ['GALAPA', 'LA ARENOSA'];
  }, [uniqueCds]);

  const monthlyGroupData = useMemo(() => {
    const listMonths = ['enero', 'febrero', 'marzo', 'abril'];
    
    return listMonths.map(m => {
      const recordsInMonth = records.filter(r => getRecordMonthLower(r.fechaIngreso) === m);
      
      const cdsData = activeCds.map(cd => {
        const cdRecs = recordsInMonth.filter(r => r.cd === cd);
        const totalHours = cdRecs.reduce((sum, r) => sum + r.horasTaller, 0);
        const count = cdRecs.length;
        const avgHours = count > 0 ? totalHours / count : 0;
        return {
          cdName: cd,
          avgHours: Math.round(avgHours * 10) / 10,
          count
        };
      });

      return {
        month: m,
        cdsData
      };
    });
  }, [records, activeCds]);

  // Compute MTD (Month to Date) - latest active month (e.g. Abril) or cumulative for active filter
  const mtdData = useMemo(() => {
    const latestMonth = 'abril'; // or dynamic latest month in dataset
    const recordsInMonth = records.filter(r => getRecordMonthLower(r.fechaIngreso) === latestMonth);
    
    return activeCds.map(cd => {
      const cdRecs = recordsInMonth.filter(r => r.cd === cd);
      const totalHours = cdRecs.reduce((sum, r) => sum + r.horasTaller, 0);
      const count = cdRecs.length;
      const avgHours = count > 0 ? totalHours / count : 0;
      return {
        cdName: cd,
        avgHours: Math.round(avgHours * 10) / 10,
        count
      };
    });
  }, [records, activeCds]);

  // Find max value overall to scale bars nicely
  const maxVal = useMemo(() => {
    let currentMax = 10;
    monthlyGroupData.forEach(m => {
      m.cdsData.forEach(c => {
        if (c.avgHours > currentMax) currentMax = c.avgHours;
      });
    });
    mtdData.forEach(c => {
      if (c.avgHours > currentMax) currentMax = c.avgHours;
    });
    return currentMax * 1.15; // padding for labels
  }, [monthlyGroupData, mtdData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 select-none">
      
      {/* 1. SEGUIMIENTO MENSUAL CARD (occupies 3 cols) */}
      <div className={`lg:col-span-3 bg-[#111625] p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
        activeMonth || activeCd ? 'border-[#00D4FF]/40 shadow-[0_0_15px_rgba(0,212,255,0.05)]' : 'border-slate-700 shadow-2xl'
      }`}>
        <ChartHeader 
          title={(activeMonth || activeCd) ? `Mensual: ${[activeMonth ? `Mes ${activeMonth}` : '', activeCd ? `CD ${activeCd}` : ''].filter(Boolean).join(' • ')} (Filtrado)` : "Seguimiento Mensual"} 
          subtitle="Métrico: Tiempo promedio en taller. Presione un mes o barra CD para filtrar." 
          showDrill={true} 
        />
        
        {/* Render actual bar columns */}
        <div className="relative pt-6 pb-2 min-h-[220px] flex items-end justify-between w-full">
          {monthlyGroupData.map((m, mIdx) => {
            const isMonthSelected = activeMonth === m.month;
            const isMonthDimmed = activeMonth && !isMonthSelected;

            return (
              <div 
                key={m.month} 
                className={`flex-1 flex flex-col items-center relative h-full transition-all duration-300 ${
                  isMonthDimmed ? 'opacity-30 saturate-50' : 'opacity-100'
                }`}
              >
                
                {/* Columns inside month */}
                <div className="flex items-end justify-center gap-5 w-full h-[180px]">
                  {m.cdsData.map((c, cIdx) => {
                    const pct = Math.max(8, (c.avgHours / maxVal) * 100);
                    const key = `${m.month}-${c.cdName}`;
                    const isHovered = hoveredKey === key;
                    const isCdSelected = activeCd === c.cdName;
                    const isCdDimmed = activeCd && !isCdSelected;

                    const barStyle = {
                      background: 'linear-gradient(to top, #B45309, #FFC800)',
                      boxShadow: isCdSelected 
                        ? '0 0 20px rgba(250, 200, 0, 0.9)' 
                        : `0 0 ${isHovered ? '16px' : '6px'} ${isHovered ? 'rgba(250, 200, 0, 0.75)' : 'rgba(250, 200, 0, 0.35)'}`,
                    };

                    return (
                      <div 
                        key={c.cdName} 
                        className={`flex flex-col items-center justify-end h-full w-[45px] relative group cursor-pointer transition-all duration-200 ${
                          isCdDimmed ? 'opacity-40 saturate-50' : 'opacity-100'
                        }`}
                        onMouseEnter={() => setHoveredKey(key)}
                        onMouseLeave={() => setHoveredKey(null)}
                        onClick={() => onSelectCd?.(isCdSelected ? null : c.cdName)}
                      >
                        
                        {/* Numerical Value above the bar */}
                        <div className={`absolute -top-7 text-[10px] md:text-[11px] font-extrabold tracking-tight text-center w-full select-all transition-all duration-200 ${isHovered || isCdSelected ? 'text-white scale-110 -translate-y-0.5' : 'text-slate-350'}`}>
                          {c.avgHours > 0 ? c.avgHours.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0,0'}
                        </div>

                        {/* Solid Golden/Yellow Premium Bar */}
                        <div 
                          className={`w-full transition-all duration-300 rounded-t-lg shadow-lg relative ${isCdSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111625]' : ''}`}
                          style={{ 
                            height: `${pct}%`,
                            background: barStyle.background,
                            boxShadow: barStyle.boxShadow,
                            transform: isHovered ? 'scaleY(1.03) scaleX(1.05)' : 'none',
                            transformOrigin: 'bottom',
                            filter: isHovered || isCdSelected ? 'brightness(1.15)' : 'none'
                          }}
                        >
                          <div className="absolute inset-0 bg-white/5 hover:bg-white/10 rounded-t-lg transition-colors" />
                        </div>

                        {/* CD Code below */}
                        <div className={`text-[8px] md:text-[9px] font-black text-center mt-2.5 truncate w-full uppercase tracking-wider block transition-colors duration-200 ${isHovered || isCdSelected ? 'text-white font-extrabold scale-105' : 'text-slate-350'}`}>
                          {c.cdName === 'LA ARENOSA' ? 'Arenosa' : c.cdName === 'GALAPA' ? 'Galapa' : c.cdName}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Sub Month Label Centered below the CD columns */}
                <button 
                  onClick={() => onSelectMonth?.(isMonthSelected ? null : m.month)}
                  className={`text-[10px] font-black uppercase tracking-widest mt-3.5 italic block transition-all duration-200 py-1 px-2.5 rounded-full cursor-pointer hover:bg-white/5 ${
                    isMonthSelected ? 'text-white bg-[#00D4FF]/20 border border-[#00D4FF]/40 scale-105 font-black' : 'text-[#00D4FF] hover:text-white'
                  }`}
                >
                  {m.month}
                </button>

                {/* Dotted border separators between monthly blocks */}
                {mIdx < monthlyGroupData.length - 1 && (
                  <div className="absolute right-0 top-2 bottom-8 border-r border-dotted border-white/10" />
                )}
              </div>
            );
          })}
        </div>

        {/* X-axis Label "CD" */}
        <div className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
          CD {activeMonth || activeCd ? " • Presione el mes o barra para limpiar filtros" : ""}
        </div>
      </div>

      {/* 2. MTD CARD (occupies 1 col) */}
      <div className={`bg-[#111625] p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
        activeCd ? 'border-[#00D4FF]/40 shadow-[0_0_15px_rgba(0,212,255,0.05)]' : 'border-slate-700 shadow-2xl'
      }`}>
        <ChartHeader 
          title={activeCd ? `MTD (${activeCd})` : "MTD"} 
          subtitle="Mes de Abril. Presione barra para filtrar CD." 
        />

        {/* Render MTD statistics */}
        <div className="relative pt-6 pb-2 min-h-[220px] flex items-end justify-center w-full">
          <div className="flex items-end justify-center gap-6 w-full h-[180px]">
            {mtdData.map((c) => {
              const pct = Math.max(8, (c.avgHours / maxVal) * 100);
              const isHovered = hoveredMtdCd === c.cdName;
              const isCdSelected = activeCd === c.cdName;
              const isCdDimmed = activeCd && !isCdSelected;

              const barStyle = {
                background: 'linear-gradient(to top, #B45309, #FFC800)',
                boxShadow: isCdSelected 
                  ? '0 0 20px rgba(250, 200, 0, 0.9)'
                  : `0 0 ${isHovered ? '16px' : '6px'} ${isHovered ? 'rgba(250, 200, 0, 0.75)' : 'rgba(250, 200, 0, 0.35)'}`,
              };

              return (
                <div 
                  key={c.cdName} 
                  className={`flex flex-col items-center justify-end h-full w-[45px] relative group cursor-pointer transition-all duration-200 ${
                    isCdDimmed ? 'opacity-35 saturate-50' : 'opacity-100'
                  }`}
                  onMouseEnter={() => setHoveredMtdCd(c.cdName)}
                  onMouseLeave={() => setHoveredMtdCd(null)}
                  onClick={() => onSelectCd?.(isCdSelected ? null : c.cdName)}
                >
                  
                  {/* Numerical Value above the bar */}
                  <div className={`absolute -top-7 text-[10px] md:text-[11px] font-extrabold tracking-tight text-center w-full select-all transition-all duration-200 ${isHovered || isCdSelected ? 'text-white scale-110 -translate-y-0.5' : 'text-slate-350'}`}>
                    {c.avgHours > 0 ? c.avgHours.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0,0'}
                  </div>

                  {/* Solid Golden/Yellow Premium Bar */}
                  <div 
                    className={`w-full transition-all duration-300 rounded-t-lg shadow-lg relative ${isCdSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111625]' : ''}`}
                    style={{ 
                      height: `${pct}%`,
                      background: barStyle.background,
                      boxShadow: barStyle.boxShadow,
                      transform: isHovered ? 'scaleY(1.03) scaleX(1.05)' : 'none',
                      transformOrigin: 'bottom',
                      filter: isHovered || isCdSelected ? 'brightness(1.15)' : 'none'
                    }}
                  >
                    <div className="absolute inset-0 bg-white/5 hover:bg-white/10 rounded-t-lg transition-colors" />
                  </div>

                  {/* CD Code below */}
                  <div className={`text-[8px] md:text-[9px] font-black text-center mt-2.5 truncate w-full uppercase tracking-wider block transition-colors duration-200 ${isHovered || isCdSelected ? 'text-white font-extrabold scale-105' : 'text-slate-350'}`}>
                    {c.cdName === 'LA ARENOSA' ? 'Arenosa' : c.cdName === 'GALAPA' ? 'Galapa' : c.cdName}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* X-axis Label "CD" */}
        <div className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
          CD
        </div>
      </div>

    </div>
  );
};


// ----------------- CHART 2: SEGUIMIENTO SEMANAL (Sequence 1 to 18) -----------------
interface WeeklySequenceChartProps {
  records: WorkshopActivityRecord[];
  activeWeek?: number | null;
  onSelectWeek?: (week: number | null) => void;
}

export const WeeklySequenceChart: React.FC<WeeklySequenceChartProps> = ({ 
  records,
  activeWeek,
  onSelectWeek
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // We want to plot exactly weeks 1 to 18.
  // We check which records correspond to each week in 2026.
  
  const weeklyData = useMemo(() => {
    // Generate week numbers 1 to 18
    const totalWeeks = Array.from({ length: 18 }, (_, i) => i + 1);
    
    return totalWeeks.map(wkNum => {
      // Filter records belonging to this week of year
      const weekRecords = records.filter(r => {
        const d = new Date(r.fechaIngreso + 'T12:00:00');
        if (isNaN(d.getTime())) return false;
        
        // Simple day of year divided by 7
        const start = new Date(d.getFullYear(), 0, 1);
        const diff = d.getTime() - start.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay) + 1;
        const wk = Math.ceil(dayOfYear / 7);
        return wk === wkNum;
      });

      const totalHours = weekRecords.reduce((sum, r) => sum + r.horasTaller, 0);
      const count = weekRecords.length;
      const avgHours = count > 0 ? totalHours / count : 0;

      return {
        weekNum: wkNum,
        avgHours: Math.round(avgHours * 10) / 10,
        count
      };
    });
  }, [records]);

  // Find max weekly average to scale nicely
  const maxVal = useMemo(() => {
    const currentMax = Math.max(...weeklyData.map(w => w.avgHours), 10);
    return currentMax * 1.15;
  }, [weeklyData]);

  return (
    <div className={`bg-[#111625] p-5 rounded-2xl border transition-all duration-300 select-none ${
      activeWeek ? 'border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.05)]' : 'border-slate-700 shadow-2xl'
    }`}>
      <ChartHeader 
        title={activeWeek ? `Semana: ${activeWeek} (Filtrado)` : "Seguimiento Semanal"} 
        subtitle="Métrico: Tiempo promedio en taller. Presione una barra para fijar filtro por semana." 
      />

      {/* Render 18 sequential columns side by side */}
      <div className="relative pt-6 pb-2 min-h-[220px] flex items-end justify-between w-full overflow-x-auto custom-scrollbar">
        <div className="flex items-end justify-between w-full min-w-[700px] h-[180px] gap-2 px-2">
          {weeklyData.map((w, idx) => {
            const pct = Math.max(5, (w.avgHours / maxVal) * 100);
            const isHovered = hoveredIdx === idx;
            const isWeekSelected = activeWeek === w.weekNum;
            const isWeekDimmed = activeWeek && !isWeekSelected;

            const barStyle = {
              background: 'linear-gradient(to top, #B45309, #FFC800)',
              boxShadow: isWeekSelected 
                ? '0 0 20px rgba(250, 200, 0, 0.9)'
                : `0 0 ${isHovered ? '16px' : '6px'} ${isHovered ? 'rgba(250, 200, 0, 0.75)' : 'rgba(250, 200, 0, 0.35)'}`,
            };

            return (
              <div 
                key={w.weekNum} 
                className={`flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer transition-all duration-250 ${
                  isWeekDimmed ? 'opacity-35 saturate-50' : 'opacity-100'
                }`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onSelectWeek?.(isWeekSelected ? null : w.weekNum)}
              >
                
                {/* Numerical Value above the bar */}
                <div className={`absolute -top-6 text-[10px] md:text-[11px] font-extrabold tracking-tight text-center w-full select-all transition-all duration-200 ${isHovered || isWeekSelected ? 'text-white scale-110 -translate-y-0.5' : 'text-slate-305'}`}>
                  {w.avgHours > 0 ? w.avgHours.toLocaleString('es-ES', { minimumFractionDigits: 1 }) : '0,0'}
                </div>

                {/* Solid Golden/Yellow Premium Bar */}
                <div 
                  className={`w-full transition-all duration-300 rounded-t-lg shadow relative ${isWeekSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111625]' : ''}`}
                  style={{ 
                    height: `${pct}%`,
                    background: barStyle.background,
                    boxShadow: barStyle.boxShadow,
                    transform: isHovered ? 'scaleY(1.03) scaleX(1.05)' : 'none',
                    transformOrigin: 'bottom',
                    filter: isHovered || isWeekSelected ? 'brightness(1.15)' : 'none'
                  }}
                >
                  <div className="absolute inset-0 bg-white/5 hover:bg-white/10 rounded-t-lg transition-colors" />
                </div>

                {/* Week number label */}
                <div className={`text-[10px] md:text-[11px] font-black text-center mt-2.5 block select-none transition-colors duration-200 ${isHovered || isWeekSelected ? 'text-white font-extrabold scale-105' : 'text-slate-300'}`}>
                  {w.weekNum}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis label centered */}
      <div className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
        Semana del año {activeWeek ? " • Presione la barra activa para deseleccionar" : ""}
      </div>
    </div>
  );
};


// ----------------- CHART 3: SEGUIMIENTO POR DIA (Horizontal Scrolling) -----------------
interface DailyScrollChartProps {
  records: WorkshopActivityRecord[];
  activeDay?: string | null;
  onSelectDay?: (day: string | null) => void;
}

export const DailyScrollChart: React.FC<DailyScrollChartProps> = ({ 
  records,
  activeDay,
  onSelectDay
}) => {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Let's find all the unique days in marzo and abril
  // We sort them chronologically and calculate average repair hours.
  
  const dailyData = useMemo(() => {
    // Group records by Date first
    const dayMap: Record<string, { dateStr: string; totalHours: number; count: number; month: string; dayLabel: string }> = {};
    
    records.forEach(r => {
      const monthLower = getRecordMonthLower(r.fechaIngreso);
      if (monthLower === 'marzo' || monthLower === 'abril') {
        const parts = r.fechaIngreso.split('-');
        const dayLabel = parseInt(parts[2]).toString(); // '16', '17', ... without leading 0s
        
        if (!dayMap[r.fechaIngreso]) {
          dayMap[r.fechaIngreso] = {
            dateStr: r.fechaIngreso,
            totalHours: 0,
            count: 0,
            month: monthLower,
            dayLabel
          };
        }
        
        dayMap[r.fechaIngreso].totalHours += r.horasTaller;
        dayMap[r.fechaIngreso].count++;
      }
    });

    return Object.values(dayMap)
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr))
      .map(d => ({
        ...d,
        avgHours: d.count > 0 ? Math.round((d.totalHours / d.count) * 10) / 10 : 0
      }));
  }, [records]);

  // Separate day blocks by month for rendering grouped headers and dotted lines
  const monthGroups = useMemo(() => {
    const groups: { monthName: string; days: typeof dailyData }[] = [];
    
    dailyData.forEach(d => {
      let existingGroup = groups.find(g => g.monthName === d.month);
      if (!existingGroup) {
        existingGroup = { monthName: d.month, days: [] };
        groups.push(existingGroup);
      }
      existingGroup.days.push(d);
    });

    return groups;
  }, [dailyData]);

  // Find max value overall to scale bars nicely
  const maxVal = useMemo(() => {
    const currentMax = Math.max(...dailyData.map(d => d.avgHours), 10);
    return currentMax * 1.15;
  }, [dailyData]);

  return (
    <div className={`bg-[#111625] p-5 rounded-2xl border transition-all duration-300 select-none ${
      activeDay ? 'border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.05)]' : 'border-slate-700 shadow-2xl'
    }`}>
      <ChartHeader 
        title={activeDay ? `Día: ${activeDay} (Filtrado)` : "Seguimiento por Dia"} 
        subtitle="Métrico: Tiempo promedio en taller. Presione una barra para fijar filtro por día." 
      />

      {/* Overflow Scroll Container with styled scrollbar */}
      <div className="overflow-x-auto overflow-y-hidden custom-scrollbar pb-3 pt-6 min-h-[220px]">
        <div className="flex items-end h-[180px] min-w-[1200px] w-full px-2">
          {monthGroups.map((group, groupIdx) => {
            return (
              <div 
                key={group.monthName} 
                className="flex items-end relative h-full pt-4 pb-2 border-slate-700/50"
                style={{ flexGrow: group.days.length }}
              >
                {/* Render days in this month */}
                <div className="flex items-end justify-between w-full h-full gap-4 px-3">
                  {group.days.map((d) => {
                    const pct = Math.max(5, (d.avgHours / maxVal) * 100);
                    const isHovered = hoveredDate === d.dateStr;
                    const isDaySelected = activeDay === d.dateStr;
                    const isDayDimmed = activeDay && !isDaySelected;

                    const barStyle = {
                      background: 'linear-gradient(to top, #B45309, #FFC800)',
                      boxShadow: isDaySelected 
                        ? '0 0 20px rgba(250, 200, 0, 0.9)'
                        : `0 0 ${isHovered ? '16px' : '6px'} ${isHovered ? 'rgba(250, 200, 0, 0.75)' : 'rgba(250, 200, 0, 0.35)'}`,
                    };

                    return (
                      <div 
                        key={d.dateStr} 
                        className={`flex-1 flex flex-col items-center justify-end h-full relative group min-w-[28px] cursor-pointer transition-all duration-200 ${
                          isDayDimmed ? 'opacity-35 saturate-50' : 'opacity-100'
                        }`}
                        onMouseEnter={() => setHoveredDate(d.dateStr)}
                        onMouseLeave={() => setHoveredDate(null)}
                        onClick={() => onSelectDay?.(isDaySelected ? null : d.dateStr)}
                      >
                        
                        {/* Numerical Value above the bar */}
                        <div className={`absolute -top-6 text-[9px] md:text-[10px] font-extrabold tracking-tight text-center w-full select-all transition-all duration-200 ${isHovered || isDaySelected ? 'text-white scale-110 -translate-y-0.5' : 'text-slate-300'}`}>
                          {d.avgHours > 0 ? d.avgHours.toLocaleString('es-ES', { minimumFractionDigits: 1 }) : '0,0'}
                        </div>

                        {/* Solid Golden/Yellow Premium Bar */}
                        <div 
                          className={`w-full transition-all duration-300 rounded-t-lg shadow relative ${isDaySelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111625]' : ''}`}
                          style={{ 
                            height: `${pct}%`,
                            background: barStyle.background,
                            boxShadow: barStyle.boxShadow,
                            transform: isHovered ? 'scaleY(1.03) scaleX(1.05)' : 'none',
                            transformOrigin: 'bottom',
                            filter: isHovered || isDaySelected ? 'brightness(1.15)' : 'none'
                          }}
                        >
                          <div className="absolute inset-0 bg-white/5 hover:bg-white/10 rounded-t-lg transition-colors" />
                        </div>

                        {/* Day Number Label */}
                        <div className={`text-[10px] font-black text-center mt-2.5 block select-none transition-colors duration-200 ${isHovered || isDaySelected ? 'text-white font-extrabold scale-105' : 'text-slate-300'}`}>
                          {d.dayLabel}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Centered lowercase month label spanning across this block */}
                <div className="absolute bottom-[-16px] left-0 right-0 text-center">
                  <span className="text-[10px] font-extrabold text-[#00D4FF] lowercase tracking-widest italic block">
                    {group.monthName}
                  </span>
                </div>

                {/* Draw dotted line separator on the right side of this month block */}
                {groupIdx < monthGroups.length - 1 && (
                  <div className="absolute right-[#1px] top-0 bottom-[-16px] border-r border-dotted border-white/20" />
                )}

                {/* Left side dotted separator for the first block */}
                {groupIdx === 0 && (
                  <div className="absolute left-[1px] top-0 bottom-[-16px] border-l border-dotted border-white/20" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis label centered */}
      <div className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4">
        Día {activeDay ? ` • Presione barra activa (${activeDay}) para deseleccionar` : ""}
      </div>
    </div>
  );
};// ----------------- CHART 4: TOP OFFENDERS PLACAS -----------------
interface TopOffenderPlacaChartProps {
  records: WorkshopActivityRecord[];
  activePlaca?: string | null;
  onSelectPlaca?: (placa: string | null) => void;
}

export const TopOffenderPlacaChart: React.FC<TopOffenderPlacaChartProps> = ({ 
  records, 
  activePlaca, 
  onSelectPlaca 
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const placaData = useMemo(() => {
    const map: Record<string, { totalHours: number; count: number }> = {};
    records.forEach(r => {
      const p = r.placa;
      if (p) {
        if (!map[p]) {
          map[p] = { totalHours: 0, count: 0 };
        }
        map[p].totalHours += r.horasTaller;
        map[p].count++;
      }
    });

    return Object.entries(map)
      .map(([placa, raw]) => ({
        placa,
        avgHours: raw.count > 0 ? Math.round((raw.totalHours / raw.count) * 10) / 10 : 0,
        count: raw.count
      }))
      .filter(p => p.avgHours > 0)
      .sort((a, b) => b.avgHours - a.avgHours)
      .slice(0, 14); // Display top 14 worst plates for ideal visual fit
  }, [records]);

  const maxVal = useMemo(() => {
    const currentMax = Math.max(...placaData.map(p => p.avgHours), 10);
    return currentMax * 1.15;
  }, [placaData]);

  const highestAvg = useMemo(() => {
    if (placaData.length === 0) return 1;
    return Math.max(...placaData.map(p => p.avgHours));
  }, [placaData]);

  // Dynamic traffic light colors using percentage scale relative to highest value in array
  const getTrafficLightStyle = (avgHours: number, isHovered: boolean) => {
    const valPct = highestAvg > 0 ? (avgHours / highestAvg) * 100 : 0;
    
    let bg = '';
    let glowColor = '';
    
    if (valPct >= 80) {
      bg = 'linear-gradient(to top, #7F1D1D, #EF4444)'; // Deep to bright Red
      glowColor = isHovered ? 'rgba(239, 68, 68, 0.75)' : 'rgba(239, 68, 68, 0.35)';
    } else if (valPct >= 60) {
      bg = 'linear-gradient(to top, #9A3412, #F97316)'; // Deep to bright Orange
      glowColor = isHovered ? 'rgba(249, 115, 22, 0.75)' : 'rgba(249, 115, 22, 0.35)';
    } else if (valPct >= 40) {
      bg = 'linear-gradient(to top, #854D0E, #FACC15)'; // Deep to bright Yellow
      glowColor = isHovered ? 'rgba(250, 204, 21, 0.75)' : 'rgba(250, 204, 21, 0.35)';
    } else if (valPct >= 20) {
      bg = 'linear-gradient(to top, #3F6212, #A3E635)'; // Deep to shiny Lime-Green
      glowColor = isHovered ? 'rgba(163, 230, 53, 0.75)' : 'rgba(163, 230, 53, 0.35)';
    } else {
      bg = 'linear-gradient(to top, #166534, #22C55E)'; // Safe Dark-Green to Emerald
      glowColor = isHovered ? 'rgba(34, 197, 94, 0.75)' : 'rgba(34, 197, 94, 0.35)';
    }

    return {
      background: bg,
      boxShadow: `0 0 ${isHovered ? '16px' : '6px'} ${glowColor}`,
    };
  };

  return (
    <div className={`bg-[#111625] p-5 rounded-2xl border transition-all duration-300 select-none h-[420px] flex flex-col justify-between ${activePlaca ? 'border-[#EF4444]/40 shadow-[0_0_15px_rgba(239,68,68,0.05)]' : 'border-slate-700 shadow-2xl'}`}>
      <ChartHeader 
        title={activePlaca ? `Placa: ${activePlaca} (Filtrado)` : "Placas Top Offender"} 
        subtitle="Vehículos con mayor promedio de tiempo en taller. Presione una barra para fijar filtro." 
      />

      <div className="relative pt-6 pb-2 flex-1 flex items-end justify-between w-full overflow-x-auto custom-scrollbar">
        <div className="flex items-end justify-between w-full min-w-[600px] h-[230px] gap-3 px-2 pb-1">
          {placaData.length === 0 ? (
            <div className="text-center w-full text-slate-500 text-xs font-bold py-12 uppercase tracking-wider">No hay datos de placas</div>
          ) : (
            placaData.map((p, idx) => {
              const pct = Math.max(5, (p.avgHours / maxVal) * 100);
              const isHovered = hoveredIdx === idx;
              const isSelected = activePlaca === p.placa;
              const barStyle = getTrafficLightStyle(p.avgHours, isHovered);

              return (
                <div 
                  key={p.placa} 
                  className={`flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer transition-all duration-200 ${
                    activePlaca && !isSelected ? 'opacity-35 saturate-50' : 'opacity-100'
                  }`}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => onSelectPlaca?.(isSelected ? null : p.placa)}
                >
                  
                  {/* Numerical Value above the bar */}
                  <div className={`absolute -top-6 text-[9px] md:text-[10px] font-extrabold tracking-tight text-center w-full select-all transition-all duration-200 ${isHovered || isSelected ? 'text-white scale-110 -translate-y-0.5' : 'text-slate-300'}`}>
                    {Math.round(p.avgHours)}
                  </div>

                  {/* Colored Gradual Traffic Light Bar */}
                  <div 
                    className={`w-full transition-all duration-300 rounded-t-lg shadow relative ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111625]' : ''}`}
                    style={{ 
                      height: `${pct}%`,
                      background: barStyle.background,
                      boxShadow: isSelected ? '0 0 20px rgba(239, 68, 68, 0.85)' : barStyle.boxShadow,
                      transform: isHovered ? 'scaleY(1.03) scaleX(1.05)' : 'none',
                      transformOrigin: 'bottom',
                      filter: isHovered || isSelected ? 'brightness(1.15)' : 'none'
                    }}
                  >
                    <div className="absolute inset-0 bg-white/5 hover:bg-white/10 rounded-t-lg transition-colors" />
                  </div>

                  {/* Plate label below the bar */}
                  <div className={`text-[10px] font-black text-center mt-2.5 block tracking-wide truncate max-w-full uppercase font-mono transition-colors duration-200 ${isHovered || isSelected ? 'text-white font-black scale-105' : 'text-slate-350'}`}>
                    {p.placa}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* X-axis label centered */}
      <div className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1 border-t border-white/5 pt-2">
        Placa {activePlaca ? " • Presione la barra activa para deseleccionar" : ""}
      </div>
    </div>
  );
};


// ----------------- CHART 5: TOP OFFENDERS SISTEMAS -----------------
interface TopOffenderSistemaChartProps {
  records: WorkshopActivityRecord[];
  activeSistema?: string | null;
  onSelectSistema?: (sistema: string | null) => void;
}

export const TopOffenderSistemaChart: React.FC<TopOffenderSistemaChartProps> = ({ 
  records,
  activeSistema,
  onSelectSistema
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const sistemaData = useMemo(() => {
    const map: Record<string, { totalHours: number; count: number }> = {};
    records.forEach(r => {
      const s = r.sistema;
      if (s) {
        if (!map[s]) {
          map[s] = { totalHours: 0, count: 0 };
        }
        map[s].totalHours += r.horasTaller;
        map[s].count++;
      }
    });

    return Object.entries(map)
      .map(([sistema, raw]) => ({
        sistema,
        avgHours: raw.count > 0 ? Math.round((raw.totalHours / raw.count) * 10) / 10 : 0,
        count: raw.count
      }))
      .filter(s => s.avgHours > 0)
      .sort((a, b) => b.avgHours - a.avgHours)
      .slice(0, 14); // Display top 14 worst systems for ideal visual fit
  }, [records]);

  const maxVal = useMemo(() => {
    const currentMax = Math.max(...sistemaData.map(s => s.avgHours), 10);
    return currentMax * 1.15;
  }, [sistemaData]);

  const highestAvg = useMemo(() => {
    if (sistemaData.length === 0) return 1;
    return Math.max(...sistemaData.map(s => s.avgHours));
  }, [sistemaData]);

  // Dynamic traffic light colors using percentage scale relative to highest value in array
  const getTrafficLightStyle = (avgHours: number, isHovered: boolean) => {
    const valPct = highestAvg > 0 ? (avgHours / highestAvg) * 100 : 0;
    
    let bg = '';
    let glowColor = '';
    
    if (valPct >= 80) {
      bg = 'linear-gradient(to right, #7F1D1D, #EF4444)'; // Deep to bright Red
      glowColor = isHovered ? 'rgba(239, 68, 68, 0.75)' : 'rgba(239, 68, 68, 0.35)';
    } else if (valPct >= 60) {
      bg = 'linear-gradient(to right, #9A3412, #F97316)'; // Deep to bright Orange
      glowColor = isHovered ? 'rgba(249, 115, 22, 0.75)' : 'rgba(249, 115, 22, 0.35)';
    } else if (valPct >= 40) {
      bg = 'linear-gradient(to right, #854D0E, #FACC15)'; // Deep to bright Yellow
      glowColor = isHovered ? 'rgba(250, 204, 21, 0.75)' : 'rgba(250, 204, 21, 0.35)';
    } else if (valPct >= 20) {
      bg = 'linear-gradient(to right, #3F6212, #A3E635)'; // Deep to shiny Lime-Green
      glowColor = isHovered ? 'rgba(163, 230, 53, 0.75)' : 'rgba(163, 230, 53, 0.35)';
    } else {
      bg = 'linear-gradient(to right, #166534, #22C55E)'; // Safe Dark-Green to Emerald
      glowColor = isHovered ? 'rgba(34, 197, 94, 0.75)' : 'rgba(34, 197, 94, 0.35)';
    }

    return {
      background: bg,
      boxShadow: `0 0 ${isHovered ? '16px' : '6px'} ${glowColor}`,
    };
  };

  return (
    <div className={`bg-[#111625] p-5 rounded-2xl border transition-all duration-300 select-none h-[420px] flex flex-col justify-between ${activeSistema ? 'border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.05)]' : 'border-slate-700 shadow-2xl'}`}>
      <ChartHeader 
        title={activeSistema ? `Sistema: ${activeSistema} (Filtrado)` : "Sistemas Top Offender"} 
        subtitle="Sistemas con mayor promedio de tiempo en reparación. Presione una fila para filtrar." 
      />

      {/* Rows Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar mt-4 pr-1 space-y-3.5 max-h-[300px]">
        {sistemaData.length === 0 ? (
          <div className="text-center w-full text-slate-500 text-xs font-bold py-16 uppercase tracking-wider">No hay datos de sistemas</div>
        ) : (
          sistemaData.map((s, idx) => {
            const pct = Math.max(5, (s.avgHours / maxVal) * 100);
            const isHovered = hoveredIdx === idx;
            const isSelected = activeSistema === s.sistema;
            const barStyle = getTrafficLightStyle(s.avgHours, isHovered);
            
            // Clean display label
            let displayLabel = s.sistema;
            if (displayLabel.includes(" | ")) {
              displayLabel = displayLabel.split(" | ")[0]; // Take only the specific item, omit the category
            }
            if (displayLabel.length > 28) {
              displayLabel = `${displayLabel.slice(0, 26)}..`;
            }

            return (
              <div 
                key={s.sistema} 
                className={`flex items-center text-xs group cursor-pointer transition-all duration-200 ${
                  activeSistema && !isSelected ? 'opacity-35 saturate-50' : 'opacity-100'
                }`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onSelectSistema?.(isSelected ? null : s.sistema)}
              >
                {/* Left side: System name */}
                <div 
                  className={`w-[130px] md:w-[150px] lg:w-[200px] text-right font-extrabold text-[10px] md:text-[11px] truncate pr-4 uppercase tracking-wider block transition-colors duration-200 ${isHovered || isSelected ? 'text-white font-black' : 'text-slate-350'}`}
                  title={s.sistema}
                >
                  {displayLabel}
                </div>

                {/* Right side: Progress Bar & Value */}
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1 rounded-r-lg overflow-visible relative h-4 md:h-4.5">
                    {/* Colored Gradual Traffic Light Bar */}
                    <div 
                      className={`absolute left-0 top-0 h-full transition-all duration-300 rounded-r-lg shadow ${isSelected ? 'ring-1 ring-white' : ''}`}
                      style={{ 
                        width: `${pct}%`,
                        background: barStyle.background,
                        boxShadow: isSelected ? '0 0 16px rgba(245, 158, 11, 0.85)' : barStyle.boxShadow,
                        transform: isHovered ? 'scaleX(1.02) scaleY(1.08)' : 'none',
                        transformOrigin: 'left',
                        filter: isHovered || isSelected ? 'brightness(1.15)' : 'none'
                      }}
                      title={`${s.sistema}: ${Math.round(s.avgHours)} horas`}
                    >
                      <div className="absolute inset-0 bg-white/5 hover:bg-white/10 rounded-r-lg transition-colors" />
                    </div>
                  </div>

                  {/* Numerical Value on the right */}
                  <div className={`w-10 text-left font-black text-white text-[10px] md:text-xs font-mono select-all transition-all duration-200 ${isHovered || isSelected ? 'scale-110 translate-x-1 font-bold' : ''}`}>
                    {Math.round(s.avgHours)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Axis label */}
      <div className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 select-none border-t border-white/5 pt-2">
        Métrico: Horas Promedio de Reparación {activeSistema ? " • Presione fila activa para limpiar" : ""}
      </div>
    </div>
  );
};


// ----------------- CHART 6: TOP OFFENDERS PROVEEDORES -----------------
interface TopOffenderProveedorChartProps {
  records: WorkshopActivityRecord[];
  activeProveedor?: string | null;
  onSelectProveedor?: (proveedor: string | null) => void;
}

export const TopOffenderProveedorChart: React.FC<TopOffenderProveedorChartProps> = ({ 
  records,
  activeProveedor,
  onSelectProveedor
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const proveedorData = useMemo(() => {
    const map: Record<string, { totalHours: number; count: number }> = {};
    records.forEach(r => {
      const p = r.proveedor;
      if (p) {
        if (!map[p]) {
          map[p] = { totalHours: 0, count: 0 };
        }
        map[p].totalHours += r.horasTaller;
        map[p].count++;
      }
    });

    return Object.entries(map)
      .map(([proveedor, raw]) => ({
        proveedor,
        avgHours: raw.count > 0 ? Math.round((raw.totalHours / raw.count) * 10) / 10 : 0,
        count: raw.count
      }))
      .filter(p => p.avgHours > 0)
      .sort((a, b) => b.avgHours - a.avgHours)
      .slice(0, 14); // Display top 14 worst providers
  }, [records]);

  const maxVal = useMemo(() => {
    const currentMax = Math.max(...proveedorData.map(p => p.avgHours), 10);
    return currentMax * 1.15;
  }, [proveedorData]);

  const highestAvg = useMemo(() => {
    if (proveedorData.length === 0) return 1;
    return Math.max(...proveedorData.map(p => p.avgHours));
  }, [proveedorData]);

  const getTrafficLightStyle = (avgHours: number, isHovered: boolean) => {
    const valPct = highestAvg > 0 ? (avgHours / highestAvg) * 100 : 0;
    
    let bg = '';
    let glowColor = '';
    
    if (valPct >= 80) {
      bg = 'linear-gradient(to right, #7F1D1D, #FF3B3B)'; // Deep Red to custom bright Red
      glowColor = isHovered ? 'rgba(255, 59, 59, 0.75)' : 'rgba(255, 59, 59, 0.35)';
    } else if (valPct >= 60) {
      bg = 'linear-gradient(to right, #9A3412, #FFB800)'; // Orange/Yellow
      glowColor = isHovered ? 'rgba(255, 184, 0, 0.75)' : 'rgba(255, 184, 0, 0.35)';
    } else if (valPct >= 40) {
      bg = 'linear-gradient(to right, #0B4F6C, #00D4FF)'; // Tech teal/blue
      glowColor = isHovered ? 'rgba(0, 212, 255, 0.75)' : 'rgba(0, 212, 255, 0.35)';
    } else {
      bg = 'linear-gradient(to right, #065F46, #00FF88)'; // Sleek green
      glowColor = isHovered ? 'rgba(0, 255, 136, 0.75)' : 'rgba(0, 255, 136, 0.35)';
    }

    return {
      background: bg,
      boxShadow: `0 0 ${isHovered ? '16px' : '6px'} ${glowColor}`,
    };
  };

  return (
    <div className={`bg-[#111625] p-5 rounded-2xl border transition-all duration-300 select-none h-[420px] flex flex-col justify-between animate-fade-in ${activeProveedor ? 'border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.05)]' : 'border-slate-700 shadow-2xl'}`}>
      <ChartHeader 
        title={activeProveedor ? `Proveedor: ${activeProveedor} (Filtrado)` : "Proveedores Top Offender"} 
        subtitle="Proveedores/Talleres con mayor promedio de tiempo. Presione una fila para filtrar." 
      />

      {/* Rows Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar mt-4 pr-1 space-y-3.5 max-h-[300px]">
        {proveedorData.length === 0 ? (
          <div className="text-center w-full text-slate-500 text-xs font-bold py-16 uppercase tracking-wider">No hay datos de proveedores</div>
        ) : (
          proveedorData.map((p, idx) => {
            const pct = Math.max(5, (p.avgHours / maxVal) * 100);
            const isHovered = hoveredIdx === idx;
            const isSelected = activeProveedor === p.proveedor;
            const barStyle = getTrafficLightStyle(p.avgHours, isHovered);
            
            let displayLabel = p.proveedor || 'OTRO / DESCONOCIDO';
            if (displayLabel.length > 28) {
              displayLabel = `${displayLabel.slice(0, 26)}..`;
            }

            return (
              <div 
                key={p.proveedor} 
                className={`flex items-center text-xs group cursor-pointer transition-all duration-200 ${
                  activeProveedor && !isSelected ? 'opacity-35 saturate-50' : 'opacity-100'
                }`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onSelectProveedor?.(isSelected ? null : p.proveedor)}
              >
                {/* Left side: Provider name */}
                <div 
                  className={`w-[130px] md:w-[150px] lg:w-[200px] text-right font-extrabold text-[10px] md:text-[11px] truncate pr-4 uppercase tracking-wider block transition-colors duration-200 ${isHovered || isSelected ? 'text-white font-black' : 'text-slate-350'}`}
                  title={p.proveedor}
                >
                  {displayLabel}
                </div>

                {/* Right side: Progress Bar & Value */}
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1 rounded-r-lg overflow-visible relative h-4 md:h-4.5">
                    <div 
                      className={`absolute left-0 top-0 h-full transition-all duration-300 rounded-r-lg shadow ${isSelected ? 'ring-1 ring-white' : ''}`}
                      style={{ 
                        width: `${pct}%`,
                        background: barStyle.background,
                        boxShadow: isSelected ? '0 0 16px rgba(6, 182, 212, 0.85)' : barStyle.boxShadow,
                        transform: isHovered ? 'scaleX(1.02) scaleY(1.08)' : 'none',
                        transformOrigin: 'left',
                        filter: isHovered || isSelected ? 'brightness(1.15)' : 'none'
                      }}
                      title={`${p.proveedor}: ${Math.round(p.avgHours)} horas`}
                    >
                      <div className="absolute inset-0 bg-white/5 hover:bg-white/10 rounded-r-lg transition-colors" />
                    </div>
                  </div>

                  {/* Value */}
                  <div className={`w-10 text-left font-black text-white text-[10px] md:text-xs font-mono select-all transition-all duration-200 ${isHovered || isSelected ? 'scale-110 translate-x-1 font-bold' : ''}`}>
                    {Math.round(p.avgHours)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Axis label */}
      <div className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 select-none border-t border-white/5 pt-2">
        Métrico: Horas Promedio de Reparación {activeProveedor ? " • Presione fila activa para limpiar" : ""}
      </div>
    </div>
  );
};
