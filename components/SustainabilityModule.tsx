import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, LineChart, Line, ReferenceLine, Label, PieChart, Pie, Cell
} from 'recharts';
import Papa from 'papaparse';
import { RefreshCw, LayoutGrid, AlertTriangle, TrendingUp, CheckCircle, Flame, Factory, MapPin, Truck } from 'lucide-react';

interface SustainabilityRecord {
  mes: string;
  fecha: string;
  nMes: number;
  cd: string;
  transportista: string;
  placa: string;
  marca: string;
  modelo: string;
  año: string;
  antiguedad: number;
  km: number;
  hl: number;
  gal: number;
  kmHl: number;
  kgCo2Km: number;
  kgCo2Hl: number;
  factorEmision: number;
  eficienciaTermica: number;
  meta: number;
}

const SustainabilityModule: React.FC = () => {
  const [data, setData] = useState<SustainabilityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterCd, setFilterCd] = useState<string>('all');
  const [filterMes, setFilterMes] = useState<string>('all');
  const [filterMarca, setFilterMarca] = useState<string>('all');
  const [filterModelo, setFilterModelo] = useState<string>('all');
  const [filterAno, setFilterAno] = useState<string>('all');
  const [filterPlaca, setFilterPlaca] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'kmHl' | 'kgCo2Hl'>('kmHl');

  const sheetUrl = "https://docs.google.com/spreadsheets/d/14CoYberdpPMv2Houlwdk4_G2HUU3QVUfqZEOqUULkuw/gviz/tq?tqx=out:csv&gid=1400514338";

  const clearFilters = () => {
    setFilterCd('all');
    setFilterMes('all');
    setFilterMarca('all');
    setFilterModelo('all');
    setFilterAno('all');
    setFilterPlaca('all');
  };

  const fetchData = async (forceRefetch = false) => {
    if (!forceRefetch) {
       setIsLoading(true);
    }
    setError(null);
    try {
      const cacheKey = 'sustainability_data_cache';
      const cacheTimeKey = 'sustainability_data_cache_time';
      
      if (!forceRefetch) {
        const cachedData = sessionStorage.getItem(cacheKey);
        const cachedTime = sessionStorage.getItem(cacheTimeKey);
        if (cachedData && cachedTime && (Date.now() - parseInt(cachedTime, 10) < 5 * 60 * 1000)) {
          setData(JSON.parse(cachedData));
          setIsLoading(false);
          return;
        }
      }

      const targetUrl = `${sheetUrl}&t=${Date.now()}`;
      const response = await fetch(targetUrl);
      
      if (!response.ok) {
        throw new Error('No se pudo conectar a Google Sheets.');
      }
      
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          const rows = results.data as string[][];
          
          if (!rows || rows.length <= 1) {
            setError("El documento está vacío.");
            setIsLoading(false);
            return;
          }

          const parsedData: SustainabilityRecord[] = [];
          
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            
            const numField = (val: string) => {
              if (!val) return 0;
              let cleanStr = val.toString().replace(/[^0-9.,-]/g, '').replace(',', '.');
              const num = parseFloat(cleanStr);
              return isNaN(num) ? 0 : num;
            };

            const mes = row[1] || '';
            const fecha = row[2] || '';
            const nMes = numField(row[3]);
            const cd = row[4] || '';
            const transportista = row[5] || '';
            const placa = row[6] || '';
            const marca = row[7] || '';
            const modelo = row[8] || '';
            const año = row[9] || '';
            const antiguedad = numField(row[10]);
            const km = numField(row[11]);
            const hl = numField(row[12]);
            const gal = numField(row[13]);
            const kmHl = numField(row[14]);
            const kgCo2Km = numField(row[15]);
            const kgCo2Hl = numField(row[16]);
            const factorEmision = numField(row[17]);
            const eficienciaTermica = numField(row[18]);
            const meta = numField(row[19]);

            if (placa && mes) {
              parsedData.push({
                mes, fecha, nMes, cd, transportista, placa, marca, modelo, año,
                antiguedad, km, hl, gal, kmHl, kgCo2Km, kgCo2Hl, factorEmision, eficienciaTermica, meta
              });
            }
          }

          sessionStorage.setItem(cacheKey, JSON.stringify(parsedData));
          sessionStorage.setItem(cacheTimeKey, Date.now().toString());

          setData(parsedData);
          setIsLoading(false);
        },
        error: (err) => {
          console.error(err);
          setError("Error al procesar el archivo CSV.");
          setIsLoading(false);
        }
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al cargar los datos.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const {
    filteredData,
    placas,
    cds,
    meses,
    marcas,
    modelos,
    anos,
    kpis,
    cdChart,
    trendChart,
    marcaChart,
    modeloChart,
    topPlatesChart,
    anoChart
  } = useMemo(() => {
    // Collect dropdown values
    const cds = [...new Set(data.map(d => d.cd))].filter(Boolean).sort();
    const meses = [...new Set(data.map(d => d.mes))].filter(Boolean);
    const marcas = Array.from(new Set(data.map(d => String(d.marca)))).filter(Boolean).sort();
    const modelos = Array.from(new Set(data.map(d => String(d.modelo)))).filter(Boolean).sort();
    const anos = Array.from(new Set(data.map(d => String(d.año)))).filter(Boolean).sort((a: string, b: string) => b.localeCompare(a));
    const placas = Array.from(new Set(data.map(d => String(d.placa)))).filter(Boolean).sort();
    
    // Sort meses based on nMes
    meses.sort((a, b) => {
      const nA = data.find(d => d.mes === a)?.nMes || 0;
      const nB = data.find(d => d.mes === b)?.nMes || 0;
      return nA - nB;
    });

    let filtered = data;
    if (filterCd !== 'all') filtered = filtered.filter(d => d.cd === filterCd);
    if (filterMes !== 'all') filtered = filtered.filter(d => d.mes === filterMes);
    if (filterMarca !== 'all') filtered = filtered.filter(d => d.marca === filterMarca);
    if (filterModelo !== 'all') filtered = filtered.filter(d => d.modelo === filterModelo);
    if (filterAno !== 'all') filtered = filtered.filter(d => d.año === filterAno);
    if (filterPlaca !== 'all') filtered = filtered.filter(d => d.placa === filterPlaca);

    // Calc KPIs
    let avgValue = 0;
    let avgMeta = activeTab === 'kmHl' ? 0.73 : 0.85; // Standard values
    if (filtered.length > 0) {
      if (activeTab === 'kmHl') {
        avgValue = filtered.reduce((acc, curr) => acc + curr.kmHl, 0) / filtered.length;
        avgMeta = filtered.reduce((acc, curr) => acc + curr.meta, 0) / filtered.length || 0.73;
      } else {
        avgValue = filtered.reduce((acc, curr) => acc + curr.kgCo2Hl, 0) / filtered.length;
        // In CO2/HL tab, the standard target (Meta) is 0.85 kg CO2/HL, which we can also allow to scale
        // Let's make it 0.85 as standard for environmental metric target, or dynamic if desired
        avgMeta = 0.85;
      }
    }

    const cump = activeTab === 'kmHl'
      ? (avgMeta > 0 ? (avgValue / avgMeta) * 100 : 0)
      : (avgValue > 0 ? (avgMeta / avgValue) * 100 : 0);
    const cumpDiff = activeTab === 'kmHl' ? cump - 100 : ((avgMeta - avgValue) / avgMeta) * 100;
    const isCompliant = activeTab === 'kmHl' ? avgValue >= avgMeta : avgValue <= avgMeta;

    // Calc aggregated data helper (average of the parsed active metric)
    const calcAvg = (groupKey: keyof SustainabilityRecord) => {
      const group: Record<string, { sum: number, count: number }> = {};
      filtered.forEach(d => {
        const val = String(d[groupKey]);
        if (!val) return;
        if (!group[val]) group[val] = { sum: 0, count: 0 };
        const recordVal = activeTab === 'kmHl' ? d.kmHl : d.kgCo2Hl;
        group[val].sum += recordVal;
        group[val].count += 1;
      });
      return Object.entries(group).map(([name, g]) => ({
        name,
        value: Math.round((g.sum / g.count) * 1000) / 1000
      }));
    };

    // Chart Data
    const cdChart = calcAvg('cd').sort((a, b) => b.value - a.value);
    
    // Trend Chart (by Month) Grouped sequentially
    const trendMap: Record<string, { sum: number, count: number, nMes: number }> = {};
    filtered.forEach(d => {
      if (!d.mes) return;
      if (!trendMap[d.mes]) trendMap[d.mes] = { sum: 0, count: 0, nMes: d.nMes };
      const recordVal = activeTab === 'kmHl' ? d.kmHl : d.kgCo2Hl;
      trendMap[d.mes].sum += recordVal;
      trendMap[d.mes].count += 1;
    });
    const trendChart = Object.entries(trendMap)
      .sort((a, b) => a[1].nMes - b[1].nMes)
      .map(([name, g]) => ({
        name: name.split(' ')[0], // only month name, e.g. "ENERO"
        value: Math.round((g.sum / g.count) * 1000) / 1000
      }));

    const marcaChart = calcAvg('marca').sort((a, b) => b.value - a.value);
    const modeloChart = calcAvg('modelo').sort((a, b) => b.value - a.value);
    const anoChartBase = calcAvg('año').sort((a, b) => b.value - a.value);
    const maxAnoValue = Math.max(...anoChartBase.map(d => d.value), 0);
    const anoChart = anoChartBase.map(d => ({
      ...d,
      spacer: (maxAnoValue - d.value) / 2
    }));

    // All Placas
    const topPlatesChart = calcAvg('placa')
      .sort((a, b) => b.value - a.value);

    return {
      filteredData: filtered,
      placas,
      cds, meses, marcas, modelos, anos,
      kpis: {
        avgKmHl: avgValue, // backward compatibility
        avgValue,
        avgMeta,
        count: filtered.length,
        cumpDiff,
        isCompliant
      },
      cdChart,
      trendChart,
      marcaChart,
      modeloChart,
      topPlatesChart,
      anoChart
    };
  }, [data, filterCd, filterMes, filterMarca, filterModelo, filterAno, filterPlaca, activeTab]);

  const LoadingState = () => (
    <div className="flex flex-col items-center justify-center p-20 space-y-6">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
        <div className="absolute inset-4 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full animate-spin"></div>
        <div className="absolute inset-6 bg-slate-900 rounded-full flex items-center justify-center">
          <Factory size={24} className="text-emerald-400 animate-pulse" />
        </div>
      </div>
      <div className="text-center">
        <h3 className="text-xl font-black uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          Sincronizando Módulo
        </h3>
        <p className="text-slate-400 text-sm mt-2 uppercase font-bold tracking-wider">
          Calculando emisiones y KM/HL
        </p>
      </div>
    </div>
  );

  const tabConfig = {
    kmHl: {
      color: '#3B82F6', // Blue
      accentColor: '#10B981', // Emerald
      textColor: 'text-emerald-400',
      label: 'KM/HL',
      metricLabel: 'KM/HL PROMEDIO',
      metaLabel: 'META KM/HL',
      descLabel: 'Eficiencia de Combustible',
      titleLabel: 'Rendimiento de Combustible',
      cdColor: '#3B82F6',
      trendColor: '#10B981',
      modelColor: '#06B6D4',
      marcaColor: '#F59E0B',
      placaColor: '#6366F1',
      anoColor: '#FDE047',
      hoverBorder: 'hover:border-slate-500/30'
    },
    kgCo2Hl: {
      color: '#10B981', // Emerald
      accentColor: '#8B5CF6', // Violet
      textColor: 'text-violet-400',
      label: 'KG CO2/HL',
      metricLabel: 'KG CO2/HL PROMEDIO',
      metaLabel: 'META KG CO2/HL',
      descLabel: 'Control de Emisiones',
      titleLabel: 'Huella de Carbono',
      cdColor: '#059669', // Dark Emerald
      trendColor: '#8B5CF6', // Violet
      modelColor: '#EC4899', // Pink
      marcaColor: '#3B82F6', // Blue
      placaColor: '#F59E0B', // Amber
      anoColor: '#EF4444', // Red
      hoverBorder: 'hover:border-slate-500/30'
    }
  }[activeTab];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-8 rounded-[3rem] border border-slate-700/50 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-[2rem] flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Factory size={36} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                Dashboard Sostenibilidad
              </h1>
              <p className="text-emerald-400 font-bold text-sm uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                <Flame size={14} /> Análisis de Emisiones y Rendimiento KM/HL
              </p>
            </div>
          </div>
          <button 
            onClick={() => fetchData(true)}
            title="Refrescar Datos"
            className="p-4 bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 border border-slate-700 hover:border-emerald-500/50 rounded-2xl transition-all duration-300 shadow-xl"
          >
            <RefreshCw size={24} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <div className="bg-rose-500/10 border border-rose-500/30 p-8 rounded-[3rem] text-center max-w-2xl mx-auto shadow-2xl">
          <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto justify-center mb-6" />
          <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">Error de conexión</h2>
          <p className="text-rose-400 font-medium">{error}</p>
          <button onClick={() => fetchData()} className="mt-8 px-8 py-4 bg-rose-500 hover:bg-rose-600 text-white font-black uppercase tracking-wider rounded-xl transition-all">Reintentar Conexión</button>
        </div>
      ) : (
        <>
          {/* Section Tabs */}
          <div className="flex bg-[#1E293B] p-1.5 rounded-2xl border border-slate-700/50 max-w-sm mb-6 shadow-xl relative z-10">
            <button
              onClick={() => setActiveTab('kmHl')}
              className={`flex-1 py-3 px-5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'kmHl'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              KM/HL Actual
            </button>
            <button
              onClick={() => setActiveTab('kgCo2Hl')}
              className={`flex-1 py-3 px-5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'kgCo2Hl'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              KG CO2/HL
            </button>
          </div>

          {/* Top Row: Filters and KPIs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            {/* Filters block */}
            <div className="lg:col-span-6 bg-[#1E293B] p-6 rounded-[2rem] border border-slate-700 shadow-2xl flex flex-col gap-6 relative z-20 h-full">
              <div className="flex flex-wrap flex-col lg:flex-row items-start lg:items-center gap-4">
                <select 
                  value={filterCd} 
                  onChange={(e) => setFilterCd(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider outline-none focus:border-blue-500 transition-colors shadow-inner min-w-[120px]"
                >
                  <option value="all">TODOS LOS CD</option>
                  {cds.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select 
                  value={filterMes} 
                  onChange={(e) => setFilterMes(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider outline-none focus:border-emerald-500 transition-colors shadow-inner min-w-[120px]"
                >
                  <option value="all">TODOS LOS MESES</option>
                  {meses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select 
                  value={filterMarca} 
                  onChange={(e) => setFilterMarca(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider outline-none focus:border-orange-500 transition-colors shadow-inner min-w-[120px]"
                >
                  <option value="all">TODAS LAS MARCAS</option>
                  {marcas.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select 
                  value={filterModelo} 
                  onChange={(e) => setFilterModelo(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider outline-none focus:border-blue-500 transition-colors shadow-inner min-w-[120px]"
                >
                  <option value="all">TODOS LOS MODELOS</option>
                  {modelos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select 
                  value={filterAno} 
                  onChange={(e) => setFilterAno(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider outline-none focus:border-emerald-500 transition-colors shadow-inner min-w-[120px]"
                >
                  <option value="all">TODOS LOS AÑOS</option>
                  {anos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select 
                  value={filterPlaca} 
                  onChange={(e) => setFilterPlaca(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider outline-none focus:border-purple-500 transition-colors shadow-inner min-w-[120px]"
                >
                  <option value="all">TODAS LAS PLACAS</option>
                  {placas.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                
                <button 
                  onClick={clearFilters}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap"
                >
                  Limpiar Filtros
                </button>
              </div>
              
              {/* Active Filters Indicator */}
              {(filterCd !== 'all' || filterMes !== 'all' || filterMarca !== 'all' || filterModelo !== 'all' || filterAno !== 'all' || filterPlaca !== 'all') && (
                <div className="flex flex-wrap gap-2 items-center mt-auto border-t border-slate-700/50 pt-4">
                  <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest mr-2">Filtros Activos:</span>
                  {filterCd !== 'all' && <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider">CD: {filterCd}</span>}
                  {filterMes !== 'all' && <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider">MES: {filterMes}</span>}
                  {filterMarca !== 'all' && <span className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider">MARCA: {filterMarca}</span>}
                  {filterModelo !== 'all' && <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider">MODELO: {filterModelo}</span>}
                  {filterAno !== 'all' && <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider">AÑO: {filterAno}</span>}
                  {filterPlaca !== 'all' && <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider">PLACA: {filterPlaca}</span>}
                </div>
              )}
            </div>

            {/* KPI: Meta */}
            <div className={`lg:col-span-2 bg-[#1E293B] p-6 rounded-[2.5rem] border ${activeTab === 'kmHl' ? 'border-emerald-500/30' : 'border-violet-500/30'} shadow-2xl relative overflow-hidden group flex flex-col justify-center h-full min-h-[160px]`}>
              <div className="relative z-10 space-y-3 flex flex-col items-center text-center">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${activeTab === 'kmHl' ? 'bg-emerald-400' : 'bg-violet-400'}`}></div> {tabConfig.metaLabel}
                </div>
                <h2 className={`text-5xl font-black ${activeTab === 'kmHl' ? 'text-emerald-400' : 'text-violet-400'}`}>{kpis.avgMeta.toFixed(2)}</h2>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-4">{tabConfig.descLabel}</p>
              </div>
            </div>

            {/* KPI: MTD Gauge */}
            <div className={`lg:col-span-4 bg-gradient-to-br from-[#1E293B] to-[#1E1B4B] p-6 rounded-[2.5rem] border ${activeTab === 'kmHl' ? 'border-blue-500/30' : 'border-emerald-500/30'} shadow-2xl relative overflow-hidden group flex flex-col justify-between h-full min-h-[220px]`}>
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
              <div className="relative z-10 mb-2">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${activeTab === 'kmHl' ? 'bg-blue-400' : 'bg-emerald-400'} animate-pulse`}></div> MTD PROMEDIO {tabConfig.label}
                </div>
              </div>
              <div className="relative z-10 flex-grow w-full flex flex-col items-center justify-end font-sans">
                <div className="w-full h-[150px] relative mb-2 mt-4 flex justify-center">
                  <ResponsiveContainer width={300} height={150}>
                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <Pie
                        data={[
                          { value: Math.min(kpis.avgValue, kpis.avgMeta) },
                          { value: Math.max(0.001, kpis.avgMeta - kpis.avgValue) }
                        ]}
                        cx="50%"
                        cy="100%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius={105}
                        outerRadius={140}
                        dataKey="value"
                        stroke="none"
                        isAnimationActive={false}
                      >
                        <Cell fill={kpis.isCompliant ? "#10B981" : "#EF4444"} />
                        <Cell fill="#334155" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute bottom-2 left-0 w-full flex flex-col items-center justify-end">
                    <span className="text-5xl font-black text-white leading-none">{kpis.avgValue.toFixed(2)}</span>
                  </div>
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-4">META: {kpis.avgMeta.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Row 2: Modelo & CD */}
            <div className={`bg-[#1E293B] p-8 rounded-[3rem] border border-slate-700/50 shadow-2xl group relative ${tabConfig.hoverBorder} transition-colors lg:col-span-8`}>
              <h3 className="text-sm font-black uppercase flex items-center gap-3 mb-6 text-slate-300 tracking-widest">
                <LayoutGrid size={16} style={{ color: tabConfig.modelColor }} /> {tabConfig.label} Por Modelo
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modeloChart} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 10 }} onClick={(data) => data?.activeLabel !== undefined && data?.activeLabel !== null && setFilterModelo(String(data.activeLabel))} style={{ cursor: 'pointer' }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 900 }} />
                    <Tooltip cursor={{ fill: '#334155', opacity: 0.2 }} contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '16px' }} />
                    <ReferenceLine x={kpis.avgMeta} stroke="#EF4444" strokeDasharray="5 5" strokeWidth={2}>
                      <Label value={`META: ${kpis.avgMeta.toFixed(2)}`} position="insideTopRight" fill="#EF4444" fontSize={10} fontWeight={900} />
                    </ReferenceLine>
                    <Bar dataKey="value" fill={tabConfig.modelColor} radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false}>
                      <LabelList dataKey="value" position="right" fill="#F1F5F9" fontSize={10} fontWeight={900} formatter={(val: number) => val.toFixed(2)} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={`bg-[#1E293B] p-8 rounded-[3rem] border border-slate-700/50 shadow-2xl group relative ${tabConfig.hoverBorder} transition-colors lg:col-span-4`}>
              <h3 className="text-sm font-black uppercase flex items-center gap-3 mb-6 text-slate-300 tracking-widest">
                <MapPin size={16} style={{ color: tabConfig.cdColor }} /> {tabConfig.label} Por CD
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cdChart} margin={{ top: 20, right: 10, left: -25, bottom: 20 }} onClick={(data) => data?.activeLabel !== undefined && data?.activeLabel !== null && setFilterCd(String(data.activeLabel))} style={{ cursor: 'pointer' }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 900 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                    <Tooltip cursor={{ fill: '#334155', opacity: 0.2 }} contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '16px' }} />
                    <ReferenceLine y={kpis.avgMeta} stroke="#EF4444" strokeDasharray="5 5" strokeWidth={2}>
                      <Label value={`META`} position="insideTopLeft" fill="#EF4444" fontSize={10} fontWeight={900} />
                    </ReferenceLine>
                    <Bar dataKey="value" fill={tabConfig.cdColor} radius={[4, 4, 0, 0]} barSize={40} isAnimationActive={false}>
                       <LabelList dataKey="value" position="top" fill="#F1F5F9" fontSize={10} fontWeight={900} formatter={(val: number) => val.toFixed(2)} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Row 3: Tendencia Mensual */}
            <div className={`bg-[#1E293B] p-8 rounded-[3rem] border border-slate-700/50 shadow-2xl group relative ${tabConfig.hoverBorder} transition-colors lg:col-span-12`}>
              <h3 className="text-sm font-black uppercase flex items-center gap-3 mb-6 text-slate-300 tracking-widest">
                <LayoutGrid size={16} style={{ color: tabConfig.trendColor }} /> Tendencia Mensual {tabConfig.label}
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendChart} margin={{ top: 20, right: 10, left: -25, bottom: 20 }} onClick={(data) => data?.activeLabel !== undefined && data?.activeLabel !== null && setFilterMes(String(data.activeLabel))} style={{ cursor: 'pointer' }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 900 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                    <Tooltip cursor={{ fill: '#334155', opacity: 0.2 }} contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '16px', fontSize: '10px', fontWeight: 900 }} />
                    <ReferenceLine y={kpis.avgMeta} stroke="#EF4444" strokeDasharray="5 5" strokeWidth={2}>
                      <Label value={`META: ${kpis.avgMeta.toFixed(2)}`} position="insideTopLeft" fill="#EF4444" fontSize={10} fontWeight={900} />
                    </ReferenceLine>
                    <Bar dataKey="value" fill={tabConfig.trendColor} radius={[4, 4, 0, 0]} barSize={40} isAnimationActive={false}>
                      <LabelList dataKey="value" position="top" fill="#F1F5F9" fontSize={10} fontWeight={900} formatter={(val: number) => val.toFixed(2)} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Row 4: Año & Marca */}
            <div className={`bg-[#1E293B] p-8 rounded-[3rem] border border-slate-700/50 shadow-2xl group relative ${tabConfig.hoverBorder} transition-colors lg:col-span-6 flex flex-col`}>
              <h3 className="text-sm font-black uppercase flex items-center gap-3 mb-6 text-slate-300 tracking-widest text-center justify-center">
                <CheckCircle size={16} style={{ color: tabConfig.anoColor }} /> {tabConfig.label} Por Año (Antigüedad)
              </h3>
              <div className="h-[300px] overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar flex-grow">
                <div style={{ height: `${Math.max(300, anoChart.length * 40)}px`, minHeight: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={anoChart} layout="vertical" margin={{ top: 20, right: 30, left: 60, bottom: 20 }} onClick={(data) => data?.activeLabel !== undefined && data?.activeLabel !== null && setFilterAno(String(data.activeLabel))} style={{ cursor: 'pointer' }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#F1F5F9', fontSize: 13, fontWeight: 900 }} />
                      <Tooltip cursor={{ fill: '#334155', opacity: 0.2 }} contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '16px' }} />
                      <Bar dataKey="spacer" stackId="a" fill="transparent" isAnimationActive={false} />
                      <Bar dataKey="value" stackId="a" fill={tabConfig.anoColor} barSize={30} isAnimationActive={false}>
                         <LabelList dataKey="value" position="center" fill="#1E293B" fontSize={12} fontWeight={900} formatter={(val: number) => val.toFixed(2)} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className={`bg-[#1E293B] p-8 rounded-[3rem] border border-slate-700/50 shadow-2xl group relative ${tabConfig.hoverBorder} transition-colors lg:col-span-6`}>
              <h3 className="text-sm font-black uppercase flex items-center gap-3 mb-6 text-slate-300 tracking-widest">
                <Truck size={16} style={{ color: tabConfig.marcaColor }} /> {tabConfig.label} Por Marca
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={marcaChart} layout="vertical" margin={{ top: 20, right: 30, left: 80, bottom: 20 }} onClick={(data) => data?.activeLabel !== undefined && data?.activeLabel !== null && setFilterMarca(String(data.activeLabel))} style={{ cursor: 'pointer' }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 900 }} />
                    <Tooltip cursor={{ fill: '#334155', opacity: 0.2 }} contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '16px' }} />
                    <ReferenceLine x={kpis.avgMeta} stroke="#EF4444" strokeDasharray="5 5" strokeWidth={2}>
                      <Label value={`META: ${kpis.avgMeta.toFixed(2)}`} position="insideTopRight" fill="#EF4444" fontSize={10} fontWeight={900} />
                    </ReferenceLine>
                    <Bar dataKey="value" fill={tabConfig.marcaColor} radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false}>
                      <LabelList dataKey="value" position="right" fill="#F1F5F9" fontSize={10} fontWeight={900} formatter={(val: number) => val.toFixed(2)} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Row 5: KM/HL Por Placa */}
            <div className={`bg-[#1E293B] p-8 rounded-[3rem] border border-slate-700/50 shadow-2xl group relative ${tabConfig.hoverBorder} transition-colors lg:col-span-12`}>
              <h3 className="text-sm font-black uppercase flex items-center gap-3 mb-6 text-slate-300 tracking-widest">
                <AlertTriangle size={16} style={{ color: tabConfig.placaColor }} /> {tabConfig.label} Por Placa
              </h3>
              <div className="h-[350px] overflow-x-auto overflow-y-hidden pb-2 custom-scrollbar">
                <div style={{ width: `${Math.max(100, topPlatesChart.length * 40)}px`, minWidth: '100%', height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topPlatesChart} margin={{ top: 20, right: 10, left: -25, bottom: 20 }} onClick={(data) => data?.activeLabel !== undefined && data?.activeLabel !== null && setFilterPlaca(String(data.activeLabel))} style={{ cursor: 'pointer' }}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 9, fontWeight: 900 }} interval={0} angle={-35} textAnchor="end" />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                      <Tooltip cursor={{ fill: '#334155', opacity: 0.2 }} contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '16px' }} />
                      <ReferenceLine y={kpis.avgMeta} stroke="#EF4444" strokeDasharray="5 5" strokeWidth={2}>
                        <Label value={`META`} position="insideTopLeft" fill="#EF4444" fontSize={10} fontWeight={900} />
                      </ReferenceLine>
                      <Bar dataKey="value" fill={tabConfig.placaColor} radius={[4, 4, 0, 0]} barSize={25} isAnimationActive={false}>
                         <LabelList dataKey="value" position="top" fill="#F1F5F9" fontSize={9} fontWeight={900} formatter={(val: number) => val.toFixed(2)} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default SustainabilityModule;
