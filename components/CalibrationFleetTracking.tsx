import React, { useState, useMemo } from 'react';
import { Calibration, Vehicle } from '../types';
import { normalizePlate, formatDate } from '../utils';
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
  Plus, 
  Car, 
  Clock, 
  Table as TableIcon, 
  BarChart3,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Eye,
  CheckCircle,
  HelpCircle
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

export interface FleetSemaforoStatus {
  vehicle: Vehicle;
  plate: string;
  cd: string;
  contractor: string;
  typeModel: string;
  estado: 'VIGENTE' | 'POR_VENCER' | 'VENCIDA';
  color: 'verde' | 'amarillo' | 'rojo';
  ultimaCalibracion: Date | null;
  ultimaCalibracionStr: string;
  diasTranscurridos: number | null;
  diasRestantes: number | null;
  motivo: string;
  calibration: Calibration | null;
}

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
  // Pestaña activa: Estatus Flota (Semáforo 15d), Pendientes del Mes, Avance por Mes, Matriz Placa × Mes
  const [subTab, setSubTab] = useState<'estatus' | 'pendientes' | 'meses' | 'matriz'>('estatus');
  
  // Filtros internos
  const [filterStatusSemaforo, setFilterStatusSemaforo] = useState<'all' | 'verde' | 'amarillo' | 'rojo' | 'sin_calibrar'>('all');
  const [searchSemaforo, setSearchSemaforo] = useState('');
  const [searchPending, setSearchPending] = useState('');
  const [searchMatrix, setSearchMatrix] = useState('');

  const currentMonthIdx = useMemo(() => {
    const idx = MONTHS.indexOf(selectedMonth.toUpperCase());
    return idx >= 0 ? idx : new Date().getMonth();
  }, [selectedMonth]);

  // Filtrado de la flota base por CD y Contratista
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchCd = filterCd === 'all' || (v.cd || '').trim().toUpperCase() === filterCd.trim().toUpperCase();
      const matchContractor = filterContractor === 'all' || (v.contractor || '').trim().toUpperCase() === filterContractor.trim().toUpperCase();
      return matchCd && matchContractor;
    });
  }, [vehicles, filterCd, filterContractor]);

  // =========================================================================
  // 1. SEMÁFORO DE 15 DÍAS DE TODA LA FLOTA
  // =========================================================================
  const semaforoFleetData = useMemo(() => {
    const hoy = new Date();
    const hoyMidnight = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 12, 0, 0);

    const items: FleetSemaforoStatus[] = filteredVehicles.map(vehicle => {
      const p = normalizePlate(vehicle.plate);
      
      // Buscar la última calibración registrada para esta placa
      const misCalibs = calibrations
        .filter(c => normalizePlate(c.plate) === p && c.calibrationDate)
        .map(c => {
          const d = new Date(c.calibrationDate + 'T12:00:00');
          return { cal: c, dateObj: d };
        })
        .filter(item => !isNaN(item.dateObj.getTime()))
        .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

      const typeModel = vehicle.brand ? `${vehicle.brand} ${vehicle.model || ''}`.trim() : (vehicle.model || 'VEHÍCULO');
      const cd = vehicle.cd || 'GENERAL';
      const contractor = vehicle.contractor || 'GENERAL';

      // Si NUNCA se ha calibrado: ROJO / VENCIDA / SIN CALIBRAR
      if (misCalibs.length === 0) {
        return {
          vehicle,
          plate: vehicle.plate,
          cd,
          contractor,
          typeModel,
          estado: 'VENCIDA',
          color: 'rojo',
          ultimaCalibracion: null,
          ultimaCalibracionStr: '',
          diasTranscurridos: null,
          diasRestantes: null,
          motivo: 'SIN CALIBRAR',
          calibration: null
        };
      }

      const ultima = misCalibs[0];
      const ultimaMidnight = new Date(ultima.dateObj.getFullYear(), ultima.dateObj.getMonth(), ultima.dateObj.getDate(), 12, 0, 0);
      const diffTime = hoyMidnight.getTime() - ultimaMidnight.getTime();
      const diasTranscurridos = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diasRestantes = 15 - diasTranscurridos;

      let estado: 'VIGENTE' | 'POR_VENCER' | 'VENCIDA';
      let color: 'verde' | 'amarillo' | 'rojo';
      let motivo = '';

      if (diasRestantes >= 6) {
        estado = 'VIGENTE';
        color = 'verde';
        motivo = `Faltan ${diasRestantes} días`;
      } else if (diasRestantes >= 1) {
        estado = 'POR_VENCER';
        color = 'amarillo';
        motivo = `Vence en ${diasRestantes} día(s)`;
      } else {
        estado = 'VENCIDA';
        color = 'rojo';
        motivo = diasRestantes === 0 ? 'Vence hoy' : `Vencida hace ${Math.abs(diasRestantes)} día(s)`;
      }

      return {
        vehicle,
        plate: vehicle.plate,
        cd,
        contractor,
        typeModel,
        estado,
        color,
        ultimaCalibracion: ultima.dateObj,
        ultimaCalibracionStr: ultima.cal.calibrationDate,
        diasTranscurridos,
        diasRestantes,
        motivo,
        calibration: ultima.cal
      };
    });

    return items;
  }, [filteredVehicles, calibrations]);

  // KPIs del Semáforo 15 Días
  const semaforoStats = useMemo(() => {
    const total = semaforoFleetData.length;
    const vigentes = semaforoFleetData.filter(d => d.estado === 'VIGENTE').length;
    const porVencer = semaforoFleetData.filter(d => d.estado === 'POR_VENCER').length;
    const vencidas = semaforoFleetData.filter(d => d.estado === 'VENCIDA').length;
    const sinCalibrar = semaforoFleetData.filter(d => !d.ultimaCalibracion).length;
    const calibrados = total - sinCalibrar;

    const pctVigentes = total > 0 ? Math.round((vigentes / total) * 100) : 0;
    const pctCalibrados = total > 0 ? Math.round((calibrados / total) * 100) : 0;

    return {
      total,
      vigentes,
      porVencer,
      vencidas,
      sinCalibrar,
      calibrados,
      pctVigentes,
      pctCalibrados
    };
  }, [semaforoFleetData]);

  // Lista filtrada y ordenada por urgencia (Rojas -> Amarillas -> Verdes)
  const filteredSemaforoList = useMemo(() => {
    let list = [...semaforoFleetData];

    if (filterStatusSemaforo !== 'all') {
      if (filterStatusSemaforo === 'sin_calibrar') {
        list = list.filter(item => !item.ultimaCalibracion);
      } else {
        list = list.filter(item => item.color === filterStatusSemaforo);
      }
    }

    if (searchSemaforo) {
      const s = searchSemaforo.toUpperCase().trim();
      list = list.filter(item => 
        item.plate.toUpperCase().includes(s) ||
        item.cd.toUpperCase().includes(s) ||
        item.contractor.toUpperCase().includes(s) ||
        item.typeModel.toUpperCase().includes(s)
      );
    }

    // Ordenar por urgencia: primero VENCIDAS/SIN CALIBRAR (rojo), luego POR VENCER (amarillo), luego VIGENTES (verde)
    list.sort((a, b) => {
      const orderScore = { rojo: 1, amarillo: 2, verde: 3 };
      const scoreA = orderScore[a.color];
      const scoreB = orderScore[b.color];

      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }

      // Mismo color:
      if (a.color === 'rojo') {
        // Sin calibrar primero
        if (!a.ultimaCalibracion && b.ultimaCalibracion) return -1;
        if (a.ultimaCalibracion && !b.ultimaCalibracion) return 1;
        // Ambas vencidas: la que tiene menor diasRestantes (más vencida) primero
        return (a.diasRestantes ?? 0) - (b.diasRestantes ?? 0);
      }

      if (a.color === 'amarillo') {
        return (a.diasRestantes ?? 0) - (b.diasRestantes ?? 0);
      }

      // Verde
      return (a.diasRestantes ?? 0) - (b.diasRestantes ?? 0);
    });

    return list;
  }, [semaforoFleetData, filterStatusSemaforo, searchSemaforo]);

  // Exportar Semáforo Flota a CSV
  const handleExportSemaforoCsv = () => {
    const data = filteredSemaforoList.map((item, idx) => ({
      "#": idx + 1,
      "PLACA": item.plate,
      "CENTRO DE DISTRIBUCIÓN (CD)": item.cd,
      "CONTRATISTA": item.contractor,
      "TIPO / MODELO": item.typeModel,
      "ÚLTIMA CALIBRACIÓN": item.ultimaCalibracion ? item.ultimaCalibracionStr : "SIN CALIBRAR",
      "DÍAS TRANSCURRIDOS": item.diasTranscurridos !== null ? item.diasTranscurridos : "N/A",
      "DÍAS RESTANTES (CICLO 15D)": item.diasRestantes !== null ? item.diasRestantes : "N/A",
      "ESTADO SEMÁFORO": item.estado,
      "COLOR": item.color.toUpperCase(),
      "DETALLE": item.motivo || (item.estado === 'VIGENTE' ? `Vigente (+${item.diasRestantes} días)` : '')
    }));

    const csv = Papa.unparse(data, { delimiter: ";" });
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ESTATUS_CALIBRACION_FLOTA_15DIAS_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =========================================================================
  // 2. ESTADO MENSUAL (MES Y AÑO SELECCIONADO)
  // =========================================================================
  const monthlyStatus = useMemo(() => {
    const calibrationsThisMonth = calibrations.filter(c => {
      if (c.calibrationDate) {
        const d = new Date(c.calibrationDate + 'T12:00:00');
        if (!isNaN(d.getTime())) {
          return d.getFullYear() === selectedYear && d.getMonth() === currentMonthIdx;
        }
      }
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

  // =========================================================================
  // 3. AVANCE DE LOS 12 MESES DEL AÑO SELECCIONADO
  // =========================================================================
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

  // =========================================================================
  // 4. MATRIZ DE FLOTA × 12 MESES
  // =========================================================================
  const fleetMatrix = useMemo(() => {
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
      {/* Barra Superior: Selector de Mes, Año, CD, Contratista y Pestañas */}
      <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
            <Calendar size={20} className="text-indigo-600" />
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">PERIODO EVALUADO</span>
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

        {/* Selector de Sub-Pestañas */}
        <div className="flex flex-wrap items-center bg-slate-100 p-1.5 rounded-2xl self-stretch xl:self-auto justify-center gap-1">
          <button
            onClick={() => setSubTab('estatus')}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              subTab === 'estatus' ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity size={14} className={subTab === 'estatus' ? 'text-emerald-400' : ''} />
            Estatus Flota (15 Días)
          </button>
          <button
            onClick={() => setSubTab('pendientes')}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              subTab === 'pendientes' ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertCircle size={14} className={subTab === 'pendientes' ? 'text-rose-400' : ''} />
            Pendientes Mes ({monthlyStatus.pendientes.length})
          </button>
          <button
            onClick={() => setSubTab('meses')}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              subTab === 'meses' ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 size={14} className={subTab === 'meses' ? 'text-indigo-400' : ''} />
            Avance Anual
          </button>
          <button
            onClick={() => setSubTab('matriz')}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              subTab === 'matriz' ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <TableIcon size={14} className={subTab === 'matriz' ? 'text-indigo-300' : ''} />
            Matriz Placa × Mes
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* VISTA 1: ESTATUS FLOTA COMPLETA (SEMÁFORO 15 DÍAS) */}
      {/* ================================================================= */}
      {subTab === 'estatus' && (
        <div className="space-y-8">
          {/* Tarjetas KPI de Semáforo 15 Días */}
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
                <h3 className="text-4xl font-black text-slate-900 mt-1">{semaforoStats.total}</h3>
                <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase mt-2 pt-2 border-t border-slate-100">
                  <span>Calibrados: <b className="text-slate-900">{semaforoStats.calibrados}</b></span>
                  <span>Sin Calibrar: <b className="text-rose-600">{semaforoStats.sinCalibrar}</b></span>
                </div>
              </div>
            </div>

            {/* Vigentes (Verde) */}
            <div 
              onClick={() => setFilterStatusSemaforo(filterStatusSemaforo === 'verde' ? 'all' : 'verde')}
              className={`bg-white rounded-[2.5rem] p-7 border-2 shadow-sm flex flex-col justify-between cursor-pointer group hover:shadow-lg transition-all ${
                filterStatusSemaforo === 'verde' ? 'border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20' : 'border-emerald-100 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3.5 bg-emerald-50 rounded-2xl text-emerald-600">
                  <CheckCircle2 size={24} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 px-3 py-1 bg-emerald-100/70 rounded-lg flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  VIGENTES
                </span>
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">En Rango (&gt; 5 Días)</p>
                <h3 className="text-4xl font-black text-emerald-600 mt-1">{semaforoStats.vigentes}</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1">
                  {semaforoStats.pctVigentes}% de la flota al día (0 a 9 días transcurridos)
                </p>
              </div>
            </div>

            {/* Por Vencer (Amarillo) */}
            <div 
              onClick={() => setFilterStatusSemaforo(filterStatusSemaforo === 'amarillo' ? 'all' : 'amarillo')}
              className={`bg-white rounded-[2.5rem] p-7 border-2 shadow-sm flex flex-col justify-between cursor-pointer group hover:shadow-lg transition-all ${
                filterStatusSemaforo === 'amarillo' ? 'border-amber-500 bg-amber-50/30 ring-2 ring-amber-500/20' : 'border-amber-100 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3.5 bg-amber-50 rounded-2xl text-amber-600">
                  <Clock size={24} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-800 px-3 py-1 bg-amber-100/80 rounded-lg flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  POR VENCER
                </span>
              </div>
              <div>
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Próximos (1 a 5 Días)</p>
                <h3 className="text-4xl font-black text-amber-600 mt-1">{semaforoStats.porVencer}</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1">
                  Requieren calibración esta semana (10 a 14 días)
                </p>
              </div>
            </div>

            {/* Vencidas / Sin Calibrar (Rojo) */}
            <div 
              onClick={() => setFilterStatusSemaforo(filterStatusSemaforo === 'rojo' ? 'all' : 'rojo')}
              className={`bg-white rounded-[2.5rem] p-7 border-2 shadow-sm flex flex-col justify-between cursor-pointer group hover:shadow-lg transition-all ${
                filterStatusSemaforo === 'rojo' ? 'border-rose-500 bg-rose-50/30 ring-2 ring-rose-500/20' : 'border-rose-100 hover:border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3.5 bg-rose-50 rounded-2xl text-rose-600">
                  <AlertCircle size={24} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-rose-800 px-3 py-1 bg-rose-100/80 rounded-lg flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  VENCIDAS / SIN CALIBRAR
                </span>
              </div>
              <div>
                <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Fuera de Rango (≥ 15 Días)</p>
                <h3 className="text-4xl font-black text-rose-600 mt-1">{semaforoStats.vencidas}</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1">
                  Incluye {semaforoStats.sinCalibrar} nunca calibradas
                </p>
              </div>
            </div>
          </div>

          {/* Tabla de TODAS las placas con Semáforo */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                  <ShieldAlert size={24} className="text-indigo-600" />
                  Estatus de Calibración de Toda la Flota (Ciclo 15 Días)
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  🟢 Faltan &gt; 5 días (Vigente) • 🟡 Faltan 1–5 días (Por Vencer) • 🔴 Vencida (≥ 15 días o Sin Calibrar)
                </p>
              </div>

              {/* Controles y Búsqueda */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                {/* Botones de filtro rápido */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
                  <button
                    onClick={() => setFilterStatusSemaforo('all')}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                      filterStatusSemaforo === 'all' ? 'bg-[#0f172a] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Todos ({semaforoStats.total})
                  </button>
                  <button
                    onClick={() => setFilterStatusSemaforo('verde')}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                      filterStatusSemaforo === 'verde' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Vigentes ({semaforoStats.vigentes})
                  </button>
                  <button
                    onClick={() => setFilterStatusSemaforo('amarillo')}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                      filterStatusSemaforo === 'amarillo' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 hover:bg-amber-50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    Por Vencer ({semaforoStats.porVencer})
                  </button>
                  <button
                    onClick={() => setFilterStatusSemaforo('rojo')}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                      filterStatusSemaforo === 'rojo' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    Vencidas ({semaforoStats.vencidas})
                  </button>
                </div>

                <div className="relative flex-grow lg:flex-grow-0">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="BUSCAR PLACA / CD..."
                    className="pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black uppercase outline-none focus:border-indigo-500 w-full sm:w-56"
                    value={searchSemaforo}
                    onChange={e => setSearchSemaforo(e.target.value)}
                  />
                </div>

                <button
                  onClick={handleExportSemaforoCsv}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  title="Descargar reporte completo en CSV"
                >
                  <FileSpreadsheet size={16} />
                  <span>Exportar Semáforo ({filteredSemaforoList.length})</span>
                </button>
              </div>
            </div>

            {/* Tabla */}
            {filteredSemaforoList.length === 0 ? (
              <div className="bg-slate-50 rounded-[2rem] p-16 text-center border-2 border-dashed border-slate-200">
                <Disc size={48} className="mx-auto text-slate-300 mb-3" />
                <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                  No se encontraron vehículos con los filtros aplicados
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  Pruebe a cambiar el estado del semáforo o el término de búsqueda.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                      <th className="py-4 px-4">#</th>
                      <th className="py-4 px-4">Placa</th>
                      <th className="py-4 px-4">Centro (CD)</th>
                      <th className="py-4 px-4">Contratista</th>
                      <th className="py-4 px-4">Tipo / Modelo</th>
                      <th className="py-4 px-4">Última Calibración</th>
                      <th className="py-4 px-4 text-center">Días Restantes</th>
                      <th className="py-4 px-4 text-center">Estado Semáforo</th>
                      <th className="py-4 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] font-bold">
                    {filteredSemaforoList.map((item, idx) => {
                      const isVerde = item.color === 'verde';
                      const isAmarillo = item.color === 'amarillo';
                      const isRojo = item.color === 'rojo';
                      const sinCalib = !item.ultimaCalibracion;

                      return (
                        <tr 
                          key={item.plate} 
                          className={`transition-colors group hover:bg-slate-50/80 ${
                            isRojo ? 'bg-rose-50/20' : isAmarillo ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          <td className="py-4 px-4 font-mono text-slate-400 text-[10px]">{idx + 1}</td>
                          
                          {/* Placa */}
                          <td className="py-4 px-4">
                            <span className="px-3 py-1.5 bg-[#0f172a] text-white rounded-xl shadow-xs font-mono font-black text-xs inline-block">
                              {item.plate}
                            </span>
                          </td>

                          {/* CD */}
                          <td className="py-4 px-4">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black uppercase">
                              {item.cd}
                            </span>
                          </td>

                          {/* Contratista */}
                          <td className="py-4 px-4 uppercase text-slate-600">{item.contractor}</td>

                          {/* Tipo / Modelo */}
                          <td className="py-4 px-4 uppercase text-slate-400 text-[10px]">{item.typeModel}</td>

                          {/* Última Calibración */}
                          <td className="py-4 px-4">
                            {item.ultimaCalibracion ? (
                              <div className="flex flex-col">
                                <span className="font-black text-slate-800 text-[11px]">
                                  {formatDate(item.ultimaCalibracionStr)}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400">
                                  Hace {item.diasTranscurridos} día(s)
                                </span>
                              </div>
                            ) : (
                              <span className="px-2.5 py-1 bg-rose-100 text-rose-700 rounded-lg text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                                <AlertTriangle size={11} />
                                SIN CALIBRAR
                              </span>
                            )}
                          </td>

                          {/* Días Restantes */}
                          <td className="py-4 px-4 text-center">
                            {sinCalib ? (
                              <span className="text-slate-300 font-mono font-bold">-</span>
                            ) : isVerde ? (
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-xl font-mono font-black text-[11px] border border-emerald-200">
                                +{item.diasRestantes} días
                              </span>
                            ) : isAmarillo ? (
                              <span className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-xl font-mono font-black text-[11px] border border-amber-200">
                                +{item.diasRestantes} día(s)
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-xl font-mono font-black text-[11px] border border-rose-200">
                                {item.diasRestantes === 0 ? 'Vence hoy' : `${item.diasRestantes} días`}
                              </span>
                            )}
                          </td>

                          {/* Estado Semáforo */}
                          <td className="py-4 px-4 text-center">
                            {isVerde ? (
                              <span className="px-3 py-1 bg-emerald-100/80 text-emerald-800 rounded-full text-[9px] font-black tracking-widest uppercase inline-flex items-center gap-1.5 shadow-xs">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                VIGENTE
                              </span>
                            ) : isAmarillo ? (
                              <span className="px-3 py-1 bg-amber-100/90 text-amber-900 rounded-full text-[9px] font-black tracking-widest uppercase inline-flex items-center gap-1.5 shadow-xs">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                POR VENCER
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-rose-500 text-white rounded-full text-[9px] font-black tracking-widest uppercase inline-flex items-center gap-1.5 shadow-xs">
                                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                                {sinCalib ? 'SIN CALIBRAR' : 'VENCIDA'}
                              </span>
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {item.calibration?.certificateUrl && (
                                <button
                                  onClick={() => onViewDoc(item.calibration!.certificateUrl, `Calibración ${item.plate}`)}
                                  className="p-2 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl transition-all"
                                  title="Ver certificado o evidencia previa"
                                >
                                  <Eye size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => onRegisterCalibrationForPlate(item.plate)}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-xs ${
                                  isRojo 
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 hover:scale-105 active:scale-95'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 hover:scale-105 active:scale-95'
                                }`}
                              >
                                <Plus size={13} />
                                <span>Calibrar</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* VISTA 2: LISTA DE PENDIENTES DEL MES SELECCIONADO */}
      {/* ================================================================= */}
      {subTab === 'pendientes' && (
        <div className="space-y-6">
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
                  Con registro en {MONTHS[currentMonthIdx]}
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

      {/* ================================================================= */}
      {/* VISTA 3: CUADRÍCULA / SEGUIMIENTO POR MESES (12 MESES) */}
      {/* ================================================================= */}
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

      {/* ================================================================= */}
      {/* VISTA 4: MATRIZ PLACA × 12 MESES */}
      {/* ================================================================= */}
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
