import React, { useState, useMemo } from 'react';
import { OperationalIndicator } from '../types';
import { Filter, TrendingUp, Activity, Target, AlertTriangle, CheckCircle2, XCircle, Search, Calendar, MapPin, Hash, Building2 } from 'lucide-react';

interface OperationalDashboardProps {
  indicators: OperationalIndicator[];
}

const OperationalDashboard: React.FC<OperationalDashboardProps> = ({ indicators }) => {
  const [activeCdTab, setActiveCdTab] = useState<'GALAPA' | 'LA ARENOSA' | 'all'>('GALAPA');
  const [filterCd, setFilterCd] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterWeek, setFilterWeek] = useState('all');
  const [filterIndicator, setFilterIndicator] = useState('all');

  // Filter indicators by the selected CD tab (Col B / CD field)
  const cdFilteredIndicators = useMemo(() => {
    return indicators.filter(i => {
      if (activeCdTab === 'all') return true;
      const cdUpper = (i.cd || '').toUpperCase();
      if (activeCdTab === 'GALAPA') return cdUpper.includes('GALAPA');
      if (activeCdTab === 'LA ARENOSA') return cdUpper.includes('ARENOSA') || cdUpper.includes('LA ARENOSA');
      return cdUpper === String(activeCdTab).toUpperCase();
    });
  }, [indicators, activeCdTab]);

  const galapaCount = useMemo(() => indicators.filter(i => (i.cd || '').toUpperCase().includes('GALAPA')).length, [indicators]);
  const arenosaCount = useMemo(() => indicators.filter(i => (i.cd || '').toUpperCase().includes('ARENOSA')).length, [indicators]);

  const uniqueCds = useMemo(() => Array.from(new Set(cdFilteredIndicators.map(i => i.cd))).sort(), [cdFilteredIndicators]);
  const uniqueMonths = useMemo(() => Array.from(new Set(cdFilteredIndicators.map(i => i.month))).sort(), [cdFilteredIndicators]);
  const uniqueWeeks = useMemo(() => Array.from(new Set(cdFilteredIndicators.map(i => i.week))).sort(), [cdFilteredIndicators]);
  const uniqueIndicatorNames = useMemo(() => Array.from(new Set(cdFilteredIndicators.map(i => i.indicator))).sort(), [cdFilteredIndicators]);

  const filteredData = useMemo(() => {
    return cdFilteredIndicators.filter(i => {
      const matchCd = filterCd === 'all' || i.cd === filterCd;
      const matchMonth = filterMonth === 'all' || i.month === filterMonth;
      const matchWeek = filterWeek === 'all' || i.week === filterWeek;
      const matchIndicator = filterIndicator === 'all' || i.indicator === filterIndicator;
      return matchCd && matchMonth && matchWeek && matchIndicator;
    });
  }, [cdFilteredIndicators, filterCd, filterMonth, filterWeek, filterIndicator]);

  // Matrix structure: rows = indicators, columns = month > week
  const matrixData = useMemo(() => {
    const rows: Record<string, Record<string, { 
      monthly?: { actual: number, trigger: number, meta: number }, 
      weeks: Record<string, OperationalIndicator> 
    }>> = {};
    
    // Group weekly data using filtered items
    filteredData.forEach(item => {
      // Skip records that are already monthly summaries if they exist in the sheet
      const isMonthlyInSheet = !item.week || item.week.toUpperCase().includes('TOTAL') || item.week.toUpperCase() === item.month.toUpperCase();
      if (isMonthlyInSheet) return;

      if (!rows[item.indicator]) rows[item.indicator] = {};
      if (!rows[item.indicator][item.month]) rows[item.indicator][item.month] = { weeks: {} };
      
      rows[item.indicator][item.month].weeks[item.week] = item;
    });

    // Calculate monthly summaries based on user rules
    const indicatorsToSum = ['DOCUMENTOS VENCIDOS', 'COMPARENDOS', 'VARADAS EN RUTA'];
    
    Object.entries(rows).forEach(([indicatorName, months]) => {
      Object.entries(months).forEach(([monthName, data]) => {
        const weekItems = Object.values(data.weeks);
        if (weekItems.length === 0) return;

        const shouldSum = indicatorsToSum.some(name => indicatorName.toUpperCase().includes(name));
        
        if (shouldSum) {
          data.monthly = {
            actual: weekItems.reduce((acc, curr) => acc + curr.actual, 0),
            trigger: weekItems[0].trigger, // Take from first week as reference
            meta: weekItems[0].meta
          };
        } else {
          // Average
          data.monthly = {
            actual: parseFloat((weekItems.reduce((acc, curr) => acc + curr.actual, 0) / weekItems.length).toFixed(2)),
            trigger: weekItems[0].trigger,
            meta: weekItems[0].meta
          };
        }
      });
    });

    return rows;
  }, [filteredData]);

  const monthsInMatrix = useMemo(() => {
    const months = new Set<string>();
    filteredData.forEach(i => months.add(i.month));
    const monthOrder = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    return Array.from(months).sort((a, b) => monthOrder.indexOf(a.toUpperCase()) - monthOrder.indexOf(b.toUpperCase()));
  }, [filteredData]);

  const weeksPerMonth = useMemo(() => {
    const mapping: Record<string, string[]> = {};
    filteredData.forEach(i => {
      const isMonthly = !i.week || i.week.toUpperCase().includes('TOTAL') || i.week.toUpperCase() === i.month.toUpperCase();
      if (!isMonthly) {
        if (!mapping[i.month]) mapping[i.month] = [];
        if (!mapping[i.month].includes(i.week)) mapping[i.month].push(i.week);
      }
    });
    Object.keys(mapping).forEach(m => {
      mapping[m].sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numA - numB;
      });
    });
    return mapping;
  }, [filteredData]);

  const [indicatorModes, setIndicatorModes] = useState<Record<string, 'higher' | 'lower'>>({});

  const isLowerIsBetter = (indicatorName: string) => {
    const name = indicatorName.toUpperCase();
    const lowerKeywords = [
      'DOCUMENTO', 'COMPARENDO', 'VARADA', 'ACCIDENTE', 'INCAPACIDAD',
      'AUSENTISMO', 'INDISPONIBILIDAD', 'MULTA', 'NOVEDAD', 'COSTO',
      'GASTO', 'RECLAMO', 'DEFECTO', 'MANTENIMIENTO'
    ];
    return lowerKeywords.some(kw => name.includes(kw));
  };

  const getIndicatorMode = (indicatorName: string): 'higher' | 'lower' => {
    if (indicatorModes[indicatorName]) {
      return indicatorModes[indicatorName];
    }
    return isLowerIsBetter(indicatorName) ? 'lower' : 'higher';
  };

  const getStatusColor = (actual: number, trigger: number, meta: number, indicatorName: string) => {
    const mode = getIndicatorMode(indicatorName);

    if (mode === 'higher') {
      // Mayor es mejor (ej. Check Lists, Disponibilidad, Rendimiento)
      const effectiveMeta = (meta !== undefined && meta !== null && meta > 0) ? meta : trigger;
      
      // 1. Igual o mayor a la Meta -> VERDE
      if (effectiveMeta > 0 && actual >= effectiveMeta) {
        return 'bg-emerald-100 text-emerald-800';
      }
      
      // 2. Entre Meta y Disparador -> ROJO
      if (meta > 0 && trigger > 0 && actual < meta && actual > trigger) {
        return 'bg-rose-100 text-rose-800';
      }

      // 3. Menor o igual al Disparador -> AZUL
      if (trigger > 0 && actual <= trigger) {
        return 'bg-indigo-100 text-indigo-800';
      }

      // Fallback si no hay Meta/Trigger definidos
      if (effectiveMeta > 0 && actual >= effectiveMeta) {
        return 'bg-emerald-100 text-emerald-800';
      }
      return 'bg-indigo-100 text-indigo-800';
    } else {
      // Menor es mejor (ej. Comparendos, Documentos Vencidos, Varadas)
      const effectiveMeta = (meta !== undefined && meta !== null && meta >= 0) ? meta : 0;

      // 1. Menor o igual a la Meta -> VERDE
      if (actual <= effectiveMeta) {
        return 'bg-emerald-100 text-emerald-800';
      }

      // 2. Entre Meta y Disparador -> ROJO
      if (trigger > 0 && actual > effectiveMeta && actual <= trigger) {
        return 'bg-rose-100 text-rose-800';
      }

      // 3. Mayor al Disparador -> AZUL
      if (trigger > 0 && actual > trigger) {
        return 'bg-indigo-100 text-indigo-800';
      }

      return 'bg-rose-100 text-rose-800';
    }
  };

  const formatMetaValue = (item: { meta?: number; trigger?: number } | undefined, indicatorName: string) => {
    if (!item) return '';
    const isLower = getIndicatorMode(indicatorName) === 'lower';
    const isPct = indicatorName.includes('%');

    if (item.meta !== undefined && item.meta !== null && (item.meta > 0 || isLower)) {
      return `${item.meta}${isPct ? '%' : ''}`;
    }
    if (item.trigger !== undefined && item.trigger !== null && item.trigger > 0) {
      return `${item.trigger}${isPct ? '%' : ''}`;
    }
    return '-';
  };

  const formatTriggerValue = (item: { meta?: number; trigger?: number } | undefined, indicatorName: string) => {
    if (!item) return '';
    const isPct = indicatorName.includes('%');
    if (item.trigger !== undefined && item.trigger !== null && (item.trigger > 0 || item.trigger === 0)) {
      return `${item.trigger}${isPct ? '%' : ''}`;
    }
    return '-';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-600" />
            Tablero Indicadores
          </h2>
          <p className="text-slate-500 mt-1">Matriz de control operativo por Centro de Distribución (Columna B)</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl text-slate-700 font-medium transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Imprimir Reporte</span>
          </button>
        </div>
      </div>

      {/* Tabs por Centro de Distribución (CD) */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-2">
        <button
          onClick={() => {
            setActiveCdTab('GALAPA');
            setFilterCd('all');
          }}
          className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
            activeCdTab === 'GALAPA'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>CD GALAPA</span>
          {galapaCount > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              activeCdTab === 'GALAPA' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {galapaCount}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveCdTab('LA ARENOSA');
            setFilterCd('all');
          }}
          className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
            activeCdTab === 'LA ARENOSA'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>CD LA ARENOSA</span>
          {arenosaCount > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              activeCdTab === 'LA ARENOSA' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {arenosaCount}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveCdTab('all');
            setFilterCd('all');
          }}
          className={`flex-0 min-w-[140px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
            activeCdTab === 'all'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>TODOS LOS CDS</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            activeCdTab === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {indicators.length}
          </span>
        </button>
      </div>

      {/* Secondary Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Sub-filtro CD
          </label>
          <select 
            value={filterCd}
            onChange={(e) => setFilterCd(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            <option value="all">Todos en {activeCdTab === 'all' ? 'general' : activeCdTab}</option>
            {uniqueCds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Mes
          </label>
          <select 
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            <option value="all">Todos los Meses</option>
            {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Semana
          </label>
          <select 
            value={filterWeek}
            onChange={(e) => setFilterWeek(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            <option value="all">Todas las Semanas</option>
            {uniqueWeeks.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Activity className="w-3 h-3" /> Indicador
          </label>
          <select 
            value={filterIndicator}
            onChange={(e) => setFilterIndicator(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            <option value="all">Todos los Indicadores</option>
            {uniqueIndicatorNames.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-slate-800 text-sm uppercase">
              Tablero Indicadores: {activeCdTab === 'all' ? 'Todos los CDs' : `CD ${activeCdTab}`}
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {Object.keys(matrixData).length} Indicadores en pantalla
          </span>
        </div>

        <div className="overflow-auto max-h-[75vh]">
          <table className="w-full border-collapse text-[10px] font-medium">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-100 border-b border-slate-300">
                <th colSpan={2} className="sticky left-0 z-30 p-2 text-left font-bold text-slate-700 uppercase border-r border-slate-300 bg-slate-100 w-[240px] min-w-[240px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Tablero Indicadores
                </th>
                {monthsInMatrix.map(month => (
                  <th 
                    key={month} 
                    colSpan={(weeksPerMonth[month]?.length || 0) + 1}
                    className="p-1 text-center font-bold text-slate-800 uppercase border-r border-slate-300 bg-slate-200"
                  >
                    {month.substring(0, 3)}
                  </th>
                ))}
              </tr>
              <tr className="bg-slate-50 border-b border-slate-300">
                <th colSpan={2} className="sticky left-0 z-30 border-r border-slate-300 bg-slate-50 w-[240px] min-w-[240px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"></th>
                {monthsInMatrix.map(month => (
                  <React.Fragment key={month}>
                    <th className="p-1 text-center font-bold text-slate-600 uppercase border-r border-slate-300 bg-slate-100 min-w-[60px]">
                      {month.substring(0, 3)}
                    </th>
                    {weeksPerMonth[month]?.map(week => (
                      <th key={`${month}-${week}`} className="p-1 text-center font-bold text-slate-500 uppercase border-r border-slate-300 bg-slate-50 min-w-[60px]">
                        {week.replace('Semana ', 'Sem ')}
                      </th>
                    ))}
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(matrixData).length === 0 ? (
                <tr>
                  <td colSpan={100} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 opacity-20" />
                      <p>No se encontraron datos para {activeCdTab === 'all' ? 'este tablero' : `el centro de distribución ${activeCdTab}`}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                Object.entries(matrixData).map(([indicatorName, months]) => (
                  <React.Fragment key={indicatorName}>
                    {/* Meta Row */}
                    <tr className="border-b border-slate-200">
                      <td rowSpan={3} className="sticky left-0 z-10 p-2 font-bold text-slate-800 border-r border-slate-200 bg-white w-[190px] min-w-[190px] max-w-[190px] uppercase leading-tight">
                        <div className="flex flex-col gap-1.5">
                          <span>{indicatorName}</span>
                          <div className="flex items-center gap-1">
                            <select
                              value={getIndicatorMode(indicatorName)}
                              onChange={(e) => setIndicatorModes(prev => ({ ...prev, [indicatorName]: e.target.value as 'higher' | 'lower' }))}
                              className={`text-[9px] font-bold py-1 px-1.5 rounded border transition-colors cursor-pointer w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                getIndicatorMode(indicatorName) === 'higher'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-blue-50 text-blue-800 border-blue-300'
                              }`}
                            >
                              <option value="higher">▲ Mayor es Mejor</option>
                              <option value="lower">▼ Menor es Mejor</option>
                            </select>
                          </div>
                        </div>
                      </td>
                      <td className="sticky left-[190px] z-10 p-1 font-bold text-slate-500 border-r border-slate-300 bg-slate-50 w-[50px] min-w-[50px] text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Meta</td>
                      {monthsInMatrix.map(month => (
                        <React.Fragment key={month}>
                          <td className="p-1 border-r border-slate-200 text-center text-slate-700 bg-slate-50/30">
                            {formatMetaValue(months[month]?.monthly, indicatorName)}
                          </td>
                          {weeksPerMonth[month]?.map(week => (
                            <td key={`${month}-${week}`} className="p-1 border-r border-slate-200 text-center text-slate-600">
                              {formatMetaValue(months[month]?.weeks[week], indicatorName)}
                            </td>
                          ))}
                        </React.Fragment>
                      ))}
                    </tr>
                    {/* Trigger Row */}
                    <tr className="border-b border-slate-200">
                      <td className="sticky left-[190px] z-10 p-1 font-bold text-slate-500 border-r border-slate-300 bg-slate-50 w-[50px] min-w-[50px] text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Dis</td>
                      {monthsInMatrix.map(month => (
                        <React.Fragment key={month}>
                          <td className="p-1 border-r border-slate-200 text-center text-slate-700 bg-slate-50/30">
                            {formatTriggerValue(months[month]?.monthly, indicatorName)}
                          </td>
                          {weeksPerMonth[month]?.map(week => (
                            <td key={`${month}-${week}`} className="p-1 border-r border-slate-200 text-center text-slate-600">
                              {formatTriggerValue(months[month]?.weeks[week], indicatorName)}
                            </td>
                          ))}
                        </React.Fragment>
                      ))}
                    </tr>
                    {/* Actual Row */}
                    <tr className="border-b border-slate-300">
                      <td className="sticky left-[190px] z-10 p-1 font-bold text-slate-500 border-r border-slate-300 bg-slate-50 w-[50px] min-w-[50px] text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Act</td>
                      {monthsInMatrix.map(month => (
                        <React.Fragment key={month}>
                          {/* Monthly Actual */}
                          <td className={`p-1 border-r border-slate-200 text-center font-bold ${months[month]?.monthly ? getStatusColor(months[month].monthly.actual, months[month].monthly.trigger, months[month].monthly.meta, indicatorName) : ''}`}>
                            {months[month]?.monthly ? `${months[month].monthly.actual}${indicatorName.includes('%') ? '%' : ''}` : ''}
                          </td>
                          {/* Weekly Actuals */}
                          {weeksPerMonth[month]?.map(week => {
                            const item = months[month]?.weeks[week];
                            if (!item) return <td key={`${month}-${week}`} className="p-1 border-r border-slate-200"></td>;
                            const statusClass = getStatusColor(item.actual, item.trigger, item.meta, indicatorName);
                            return (
                              <td key={`${month}-${week}`} className={`p-1 border-r border-slate-200 text-center font-bold ${statusClass}`}>
                                {item.actual}{indicatorName.includes('%') ? '%' : ''}
                              </td>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tr>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-300" />
          <span className="text-xs font-medium text-slate-600">Cumple Meta (Verde)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-rose-100 border border-rose-300" />
          <span className="text-xs font-medium text-slate-600">Entre Meta y Disparador (Rojo)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-indigo-100 border border-indigo-300" />
          <span className="text-xs font-medium text-slate-600">Fuera de Rango / Crítico (Azul)</span>
        </div>
      </div>
    </div>
  );
};

export default OperationalDashboard;

