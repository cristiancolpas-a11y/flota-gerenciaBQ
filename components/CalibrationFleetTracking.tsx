import React, { useState, useMemo } from 'react';
import { Calibration, Vehicle } from '../types';
import { normalizePlate } from '../utils';
import Papa from 'papaparse';
import { 
  Disc, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  TrendingUp, 
  Building2, 
  UserCircle, 
  Search, 
  Download, 
  FileSpreadsheet, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Car, 
  Clock, 
  Filter, 
  Layers, 
  Sparkles, 
  Table as TableIcon, 
  BarChart3,
  ArrowRight
} from 'lucide-react';

interface CalibrationFleetTrackingProps {
  vehicles: Vehicle[];
  calibrations: Calibration[];
  selectedMonth: string;
  selectedYear: number;
  onMonthChange: (month: string) => void;
  onYearChange: (year: number) => void;
  onRegisterCalibrationForPlate: (plate: string) => void;
  onViewDoc: (url: string, title: string) => void;
  filterCd: string;
  filterContractor: string;
  onFilterCdChange: (cd: string) => void;
  onFilterContractorChange: (contractor: string) => void;
  uniqueCds: string[];
  uniqueContractors: string[];
}

const MONTHS = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

const MONTHS_SHORT = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'
];

const CalibrationFleetTracking: React.FC<CalibrationFleetTrackingProps> = ({
  vehicles,
  calibrations,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  onRegisterCalibrationForPlate,
  onViewDoc,
  filterCd,
  filterContractor,
  onFilterCdChange,
  onFilterContractorChange,
  uniqueCds,
  uniqueContractors
}) => {
  const [subTab, setSubTab] = useState<'pendientes' | 'meses' | 'matriz'>('pendientes');
  const [searchPending, setSearchPending] = useState('');
  const [searchMatrix, setSearchMatrix] = useState('');

  const currentMonthIdx = useMemo(() => {
    const idx = MONTHS.indexOf(selectedMonth.toUpperCase());
    return idx >= 0 ? idx : new Date().getMonth();
  }, [selectedMonth]);

  // Filtrado de la flota base
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchCd = filterCd === 'all' || (v.cd || '').trim().toUpperCase() === filterCd.trim().toUpperCase();
      const matchContractor = filterContractor === 'all' || (v.contractor || '').trim().toUpperCase() === filterContractor.trim().toUpperCase();
      return matchCd && matchContractor;
    });
  }, [vehicles, filterCd, filterContractor]);

  // 1. Estado mensual para el mes y año seleccionado
  const monthlyStatus = useMemo(() => {
    // Buscar calibraciones correspondientes al año y mes seleccionados
    const calibrationsThisMonth = calibrations.filter(c => {
      if (c.calibrationDate) {
        const d = new Date(c.calibrationDate + 'T12:00:00');
        if (!isNaN(d.getTime())) {
          return d.getFullYear() === selectedYear && d.getMonth() === currentMonthIdx;
        }
      }
      // Fallback a campos month y year
      const matchM = (c.month || '').toUpperCase() === MONTHS[currentMonthIdx];
      const matchY = c.year ? c.year === selectedYear : true;
      return matchM && matchY;
    });

    const calibratedPlatesMap = new Map<string, Calibration>();
    calibrationsThisMonth.forEach(c => {
      if (c.plate) {
        calibratedPlatesMap.set(normalizePlate(c.plate), c);
      }
    });

    const calibrados: { vehicle: Vehicle; calibration?: Calibration }[] = [];
    const pendientes: Vehicle[] = [];

    filteredVehicles.forEach(v => {
      const p = normalizePlate(v.plate);
      if (calibratedPlatesMap.has(p)) {
        calibrados.push({ vehicle: v, calibration: calibratedPlatesMap.get(p) });
      } else {
        pendientes.push(v);
      }
    });

    const totalFlota = filteredVehicles.length;
    const porcentaje = totalFlota > 0 ? Math.round((calibrados.length / totalFlota) * 100) : 0;

    return {
      totalFlota,
      calibrados,
      pendientes,
      porcentaje,
      calibrationsCount: calibrationsThisMonth.length
    };
  }, [filteredVehicles, calibrations, selectedYear, currentMonthIdx]);

  // 2. Avance de los 12 meses del año seleccionado
  const annualMonthlyProgress = useMemo(() => {
    return MONTHS.map((monthName, monthIndex) => {
      const monthCalibrations = calibrations.filter(c => {
        if (c.calibrationDate) {
          const d = new Date(c.calibrationDate + 'T12:00:00');
          if (!isNaN(d.getTime())) {
            return d.getFullYear() === selectedYear && d.getMonth() === monthIndex;
          }
        }
        const matchM = (c.month || '').toUpperCase() === monthName;
        const matchY = c.year ? c.year === selectedYear : true;
        return matchM && matchY;
      });

      const calibratedSet = new Set(monthCalibrations.map(c => normalizePlate(c.plate)));
      let calCount = 0;
      filteredVehicles.forEach(v => {
        if (calibratedSet.has(normalizePlate(v.plate))) calCount++;
      });

      const total = filteredVehicles.length;
      const pendCount = Math.max(0, total - calCount);
      const pct = total > 0 ? Math.round((calCount / total) * 100) : 0;

      return {
        monthName,
        monthIndex,
        shortName: MONTHS_SHORT[monthIndex],
        calibrados: calCount,
        pendientes: pendCount,
        total,
        porcentaje: pct,
        isCurrent: monthIndex === currentMonthIdx
      };
    });
  }, [filteredVehicles, calibrations, selectedYear, currentMonthIdx]);

  // 3. Matriz de Flota × 12 Meses
  const fleetMatrix = useMemo(() => {
    // Precalcular por placa y por mes si existe calibración
    const matrixData = filteredVehicles.map(vehicle => {
      const p = normalizePlate(vehicle.plate);
      
      const monthsData = MONTHS.map((monthName, monthIndex) => {
        const cal = calibrations.find(c => {
          if (normalizePlate(c.plate) !== p) return false;
          if (c.calibrationDate) {
            const d = new Date(c.calibrationDate + 'T12:00:00');
            if (!isNaN(d.getTime())) {
              return d.getFullYear() === selectedYear && d.getMonth() === monthIndex;
            }
          }
          const matchM = (c.month || '').toUpperCase() === monthName;
          const matchY = c.year ? c.year === selectedYear : true;
          return matchM && matchY;
        });

        return {
          monthIndex,
          monthName,
          calibrated: !!cal,
          calibration: cal
        };
      });

      const totalCalibratedInYear = monthsData.filter(m => m.calibrated).length;

      return {
        vehicle,
        monthsData,
        totalCalibratedInYear,
        adherencePct: Math.round((totalCalibratedInYear / 12) * 100)
      };
    });

    return matrixData;
  }, [filteredVehicles, calibrations, selectedYear]);

  // Filtrado en listas
  const filteredPendingList = useMemo(() => {
    if (!searchPending) return monthlyStatus.pendientes;
    const s = searchPending.toUpperCase().trim();
    return monthlyStatus.pendientes.filter(v => 
      v.plate.toUpperCase().includes(s) || 
      (v.cd || '').toUpperCase().includes(s) ||
      (v.contractor || '').toUpperCase().includes(s)
    );
  }, [monthlyStatus.pendientes, searchPending]);

  const filteredMatrixList = useMemo(() => {
    if (!searchMatrix) return fleetMatrix;
    const s = searchMatrix.toUpperCase().trim();
    return fleetMatrix.filter(row => 
      row.vehicle.plate.toUpperCase().includes(s) || 
      (row.vehicle.cd || '').toUpperCase().includes(s) ||
      (row.vehicle.contractor || '').toUpperCase().includes(s)
    );
  }, [fleetMatrix, searchMatrix]);

  // Exportar pendientes del mes a CSV
  const handleExportPendingCsv = () => {
    if (monthlyStatus.pendientes.length === 0) {
      alert(`No hay vehículos pendientes de calibración para ${MONTHS[currentMonthIdx]} ${selectedYear}.`);
      return;
    }

    const data = monthlyStatus.pendientes.map((v, idx) => ({
      "#": idx + 1,
      "MES EVALUADO": `${MONTHS[currentMonthIdx]} ${selectedYear}`,
      "PLACA": v.plate,
      "CENTRO DE DISTRIBUCIÓN (CD)": v.cd || 'GENERAL',
      "CONTRATISTA": v.contractor || 'GENERAL',
      "TIPO / MODELO": v.brand ? `${v.brand} ${v.model || ''}` : (v.model || 'VEHÍCULO'),
      "ESTADO DE CALIBRACIÓN": "PENDIENTE",
      "ACCIÓN REQUERIDA": "CALIBRACIÓN MENSUAL OBLIGATORIA"
    }));

    const csv = Papa.unparse(data, { delimiter: ";" });
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `CALIBRACIONES_PENDIENTES_${MONTHS[currentMonthIdx]}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Exportar Matriz Anual a CSV
  const handleExportMatrixCsv = () => {
    const data = fleetMatrix.map((row, idx) => {
      const obj: Record<string, any> = {
        "#": idx + 1,
        "PLACA": row.vehicle.plate,
        "CD": row.vehicle.cd || 'GENERAL',
        "CONTRATISTA": row.vehicle.contractor || 'GENERAL',
      };
      MONTHS.forEach((m, i) => {
        obj[m] = row.monthsData[i].calibrated ? "CALIBRADO" : "PENDIENTE";
      });
      obj["TOTAL MESES CALIBRADOS (DE 12)"] = row.totalCalibratedInYear;
      obj["% CUMPLIMIENTO ANUAL"] = `${row.adherencePct}%`;
      return obj;
    });

    const csv = Papa.unparse(data, { delimiter: ";" });
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `MATRIZ_ANUAL_CALIBRACIONES_FLOTA_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Selector de Mes, Año y Filtros */}
      <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
            <Calendar size={20} className="text-indigo-600" />
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">MES EVALUADO</span>
              <div className="flex items-center gap-2">
                <select 
                  className="bg-transparent font-black text-xs uppercase outline-none cursor-pointer text-slate-800"
                  value={MONTHS[currentMonthIdx]}
                  onChange={e => onMonthChange(e.target.value)}
                >
                  {MONTHS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <span className="text-slate-300">|</span>
                <select 
                  className="bg-transparent font-black text-xs uppercase outline-none cursor-pointer text-slate-800"
                  value={selectedYear}
                  onChange={e => onYearChange(parseInt(e.target.value))}
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
            <Building2 size={18} className="text-indigo-500" />
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">CENTRO (CD)</span>
              <select 
                className="bg-transparent font-black text-xs uppercase outline-none cursor-pointer text-slate-800"
                value={filterCd}
                onChange={e => onFilterCdChange(e.target.value)}
              >
                <option value="all">TODOS LOS CD ({uniqueCds.length})</option>
                {uniqueCds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
            <UserCircle size={18} className="text-indigo-500" />
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">CONTRATISTA</span>
              <select 
                className="bg-transparent font-black text-xs uppercase outline-none cursor-pointer text-slate-800 max-w-[150px]"
                value={filterContractor}
                onChange={e => onFilterContractorChange(e.target.value)}
              >
                <option value="all">TODOS ({uniqueContractors.length})</option>
                {uniqueContractors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Pestañas de la vista Seguimiento */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl self-stretch lg:self-auto justify-center">
          <button
            onClick={() => setSubTab('pendientes')}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              subTab === 'pendientes' ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertCircle size={14} className={subTab === 'pendientes' ? 'text-rose-400' : ''} />
            Pendientes del Mes ({monthlyStatus.pendientes.length})
          </button>
          <button
            onClick={() => setSubTab('meses')}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              subTab === 'meses' ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 size={14} className={subTab === 'meses' ? 'text-indigo-400' : ''} />
            Avance por Mes
          </button>
          <button
            onClick={() => setSubTab('matriz')}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              subTab === 'matriz' ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <TableIcon size={14} className={subTab === 'matriz' ? 'text-emerald-400' : ''} />
            Matriz Placa × Mes
          </button>
        </div>
      </div>

      {/* Tarjetas KPI de Estado del Mes Seleccionado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Flota */}
        <div className="bg-white rounded-[2.5rem] p-7 border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3.5 bg-slate-100 rounded-2xl text-slate-700">
              <Car size={24} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-3 py-1 bg-slate-50 rounded-lg">FLOTA ACTIVA</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Flota</p>
            <h3 className="text-4xl font-black text-slate-900 mt-1">{monthlyStatus.totalFlota}</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1">Vehículos a calibrar en {MONTHS[currentMonthIdx]}</p>
          </div>
        </div>

        {/* Calibrados */}
        <div className="bg-white rounded-[2.5rem] p-7 border-2 border-emerald-100 shadow-sm flex flex-col justify-between group hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3.5 bg-emerald-50 rounded-2xl text-emerald-600">
              <CheckCircle2 size={24} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 px-3 py-1 bg-emerald-50 rounded-lg">CUMPLIMIENTO</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Calibrados Este Mes</p>
            <h3 className="text-4xl font-black text-emerald-600 mt-1">{monthlyStatus.calibrados.length}</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1">
              Con al menos 1 calibración registrada
            </p>
          </div>
        </div>

        {/* Pendientes */}
        <div className="bg-white rounded-[2.5rem] p-7 border-2 border-rose-100 shadow-sm flex flex-col justify-between group hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3.5 bg-rose-50 rounded-2xl text-rose-600">
              <AlertCircle size={24} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-rose-600 px-3 py-1 bg-rose-50 rounded-lg">POR GESTIONAR</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Pendientes Este Mes</p>
            <h3 className="text-4xl font-black text-rose-600 mt-1">{monthlyStatus.pendientes.length}</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1">Sin registro en {MONTHS[currentMonthIdx]}</p>
          </div>
        </div>

        {/* % Avance */}
        <div className="bg-gradient-to-br from-[#0f172a] to-indigo-950 rounded-[2.5rem] p-7 text-white shadow-xl shadow-indigo-950/20 flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3.5 bg-indigo-600/50 rounded-2xl text-indigo-200">
              <TrendingUp size={24} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300 px-3 py-1 bg-white/10 rounded-lg">AVANCE FLOTA</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">% Avance Mes</p>
            <h3 className="text-4xl font-black text-white mt-1">{monthlyStatus.porcentaje}%</h3>
            <div className="w-full bg-white/10 h-2.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-emerald-400 h-full rounded-full transition-all duration-700"
                style={{ width: `${monthlyStatus.porcentaje}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CONTENIDO SEGÚN SUB-PESTAÑA */}

      {/* VISTA 1: LISTA DE PENDIENTES DEL MES ACTUAL */}
      {subTab === 'pendientes' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                  <AlertCircle size={24} className="text-rose-500" />
                  Vehículos Pendientes en {MONTHS[currentMonthIdx]} {selectedYear}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  Lista de vehículos de la flota que aún NO registran calibración en este mes
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-grow sm:flex-grow-0">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="BUSCAR PLACA / CD..."
                    className="pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black uppercase outline-none focus:border-indigo-500 w-full sm:w-64"
                    value={searchPending}
                    onChange={e => setSearchPending(e.target.value)}
                  />
                </div>

                <button
                  onClick={handleExportPendingCsv}
                  className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  title="Descargar lista en CSV"
                >
                  <FileSpreadsheet size={16} />
                  <span>Exportar Pendientes ({monthlyStatus.pendientes.length})</span>
                </button>
              </div>
            </div>

            {filteredPendingList.length === 0 ? (
              <div className="bg-emerald-50/50 rounded-[2rem] p-16 text-center border-2 border-dashed border-emerald-200">
                <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-3" />
                <h4 className="text-lg font-black text-emerald-900 uppercase tracking-tight">
                  {monthlyStatus.pendientes.length === 0 ? '¡Toda la flota está calibrada este mes!' : 'No hay coincidencias con la búsqueda'}
                </h4>
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-1">
                  {monthlyStatus.pendientes.length === 0 
                    ? `100% de cumplimiento alcanzado para ${MONTHS[currentMonthIdx]} ${selectedYear}.`
                    : 'Intente buscar con otro término.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="py-4 px-4">#</th>
                      <th className="py-4 px-4">Placa</th>
                      <th className="py-4 px-4">Centro (CD)</th>
                      <th className="py-4 px-4">Contratista</th>
                      <th className="py-4 px-4">Tipo / Marca</th>
                      <th className="py-4 px-4 text-center">Estado Mes</th>
                      <th className="py-4 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-[11px] font-bold">
                    {filteredPendingList.map((veh, idx) => (
                      <tr key={veh.id || veh.plate} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-4 px-4 font-mono text-slate-400 text-[10px]">{idx + 1}</td>
                        <td className="py-4 px-4 font-mono font-black text-slate-900 text-sm">
                          <span className="px-3 py-1.5 bg-[#0f172a] text-white rounded-xl shadow-sm">
                            {veh.plate}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase">
                            {veh.cd || 'GENERAL'}
                          </span>
                        </td>
                        <td className="py-4 px-4 uppercase text-slate-600">{veh.contractor || 'GENERAL'}</td>
                        <td className="py-4 px-4 uppercase text-slate-400 text-[10px]">{veh.brand ? `${veh.brand} ${veh.model || ''}` : (veh.model || 'VEHÍCULO')}</td>
                        <td className="py-4 px-4 text-center">
                          <span className="px-3 py-1 bg-rose-500 text-white rounded-full text-[9px] font-black tracking-widest uppercase shadow-sm">
                            PENDIENTE
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => onRegisterCalibrationForPlate(veh.plate)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
                          >
                            <Plus size={14} />
                            <span>Calibrar</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA 2: CUADRÍCULA / SEGUIMIENTO POR MESES (12 MESES) */}
      {subTab === 'meses' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                  <BarChart3 size={24} className="text-indigo-600" />
                  Avance Mensual de Calibración de Flota ({selectedYear})
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  Resumen de cumplimiento mes a mes para la flota de {filteredVehicles.length} vehículos
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase">Año:</span>
                <select 
                  className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 text-xs font-black uppercase outline-none cursor-pointer"
                  value={selectedYear}
                  onChange={e => onYearChange(parseInt(e.target.value))}
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grilla de 12 Meses */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {annualMonthlyProgress.map((m) => {
                const isSelected = m.monthIndex === currentMonthIdx;
                const isComplete = m.porcentaje === 100 && m.total > 0;
                
                return (
                  <div
                    key={m.monthName}
                    onClick={() => {
                      onMonthChange(m.monthName);
                      setSubTab('pendientes');
                    }}
                    className={`p-6 rounded-[2rem] border-2 transition-all cursor-pointer group hover:scale-[1.02] hover:shadow-xl relative overflow-hidden ${
                      isSelected 
                        ? 'bg-indigo-50/50 border-indigo-500 shadow-lg shadow-indigo-500/10' 
                        : 'bg-white border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-indigo-600 animate-ping"></div>
                    )}

                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">MES {m.monthIndex + 1}</span>
                        <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">{m.monthName}</h4>
                      </div>
                      <span className={`text-xl font-black ${
                        isComplete ? 'text-emerald-600' : m.porcentaje >= 75 ? 'text-indigo-600' : m.porcentaje > 0 ? 'text-amber-600' : 'text-slate-400'
                      }`}>
                        {m.porcentaje}%
                      </span>
                    </div>

                    {/* Barra de progreso */}
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-4">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isComplete ? 'bg-emerald-500' : m.porcentaje >= 75 ? 'bg-indigo-600' : m.porcentaje > 0 ? 'bg-amber-500' : 'bg-slate-300'
                        }`}
                        style={{ width: `${m.porcentaje}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[10px]">
                      <div>
                        <span className="text-slate-400 font-bold uppercase block text-[8px]">Calibrados</span>
                        <span className="font-black text-emerald-600 text-sm">{m.calibrados}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 font-bold uppercase block text-[8px]">Pendientes</span>
                        <span className="font-black text-rose-600 text-sm">{m.pendientes}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100/60 flex items-center justify-between text-[9px] font-black text-indigo-600 uppercase tracking-wider">
                      <span>Ver detalles</span>
                      <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VISTA 3: MATRIZ PLACA × 12 MESES (SEGUIMIENTO TIPO CALENDARIO ANUAL) */}
      {subTab === 'matriz' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                  <TableIcon size={24} className="text-indigo-600" />
                  Matriz Anual: Placa × Mes ({selectedYear})
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  🟢 Celda verde: Calibrado en ese mes • ⚪ Celda vacía: Pendiente
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-grow sm:flex-grow-0">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="BUSCAR VEHÍCULO..."
                    className="pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black uppercase outline-none focus:border-indigo-500 w-full sm:w-64"
                    value={searchMatrix}
                    onChange={e => setSearchMatrix(e.target.value)}
                  />
                </div>

                <button
                  onClick={handleExportMatrixCsv}
                  className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <FileSpreadsheet size={16} />
                  <span>Exportar Matriz</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                    <th className="py-4 px-3 text-left">Placa</th>
                    <th className="py-4 px-3 text-left">CD</th>
                    {MONTHS_SHORT.map((m, idx) => (
                      <th 
                        key={m} 
                        className={`py-4 px-2 ${idx === currentMonthIdx ? 'bg-indigo-100 text-indigo-900 rounded-t-xl font-extrabold' : ''}`}
                      >
                        {m}
                      </th>
                    ))}
                    <th className="py-4 px-3 text-right">Anual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredMatrixList.map((row) => (
                    <tr key={row.vehicle.plate} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-left font-mono font-black text-slate-900 whitespace-nowrap">
                        {row.vehicle.plate}
                      </td>
                      <td className="py-3 px-3 text-left text-[10px] font-bold uppercase text-slate-500 whitespace-nowrap">
                        {row.vehicle.cd || 'GENERAL'}
                      </td>
                      {row.monthsData.map((m, mIdx) => (
                        <td 
                          key={mIdx} 
                          className={`py-2 px-1.5 text-center ${mIdx === currentMonthIdx ? 'bg-indigo-50/40' : ''}`}
                        >
                          {m.calibrated ? (
                            <button
                              onClick={() => {
                                if (m.calibration?.certificateUrl) {
                                  onViewDoc(m.calibration.certificateUrl, `Calibración ${row.vehicle.plate} - ${m.monthName}`);
                                }
                              }}
                              className="w-7 h-7 rounded-xl bg-emerald-500 text-white font-black text-[10px] inline-flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-all cursor-pointer mx-auto"
                              title={`Calibrado en ${m.monthName} ${selectedYear}`}
                            >
                              ✓
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                onMonthChange(m.monthName);
                                onRegisterCalibrationForPlate(row.vehicle.plate);
                              }}
                              className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-300 hover:text-rose-600 font-black text-[10px] inline-flex items-center justify-center transition-all cursor-pointer mx-auto"
                              title={`Sin calibrar en ${m.monthName}. Click para registrar.`}
                            >
                              -
                            </button>
                          )}
                        </td>
                      ))}
                      <td className="py-3 px-3 text-right font-black">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] ${
                          row.totalCalibratedInYear >= 10 ? 'bg-emerald-100 text-emerald-800' : row.totalCalibratedInYear >= 6 ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {row.totalCalibratedInYear}/12
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalibrationFleetTracking;
