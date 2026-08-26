import React, { useState, useMemo, useEffect } from 'react';
import { SparePartRecord } from '../types';
import { 
  Package, AlertTriangle, CheckCircle2, Search, Plus, Minus,
  RefreshCw, Filter, Download, Building2, Store, 
  User, Calendar, FileText, X, Loader2,
  Boxes, ShieldAlert, BarChart3, ChevronDown, ListChecks,
  CheckCheck, Info, Mail, Camera, Image as ImageIcon, Eye, ExternalLink
} from 'lucide-react';
import Papa from 'papaparse';
import { submitSparePartInspection } from '../services/sheetService';

export const SPARE_PARTS_PROVIDERS = [
  'Renting Colombia',
  'Navitrans',
  'ALD'
];

export const SPARE_PARTS_WORKSHOPS = [
  'ELECTRONIC',
  'VEHIPESA',
  'TODOFIBRA'
];

export const STOCK_POR_TALLER: Record<string, { repuesto: string; minimo: number; und: string }[]> = {
  "ELECTRONIC": [
    { repuesto: "Cinturones de seguridad", minimo: 4, und: "UND" },
    { repuesto: "Motor de arranque", minimo: 3, und: "UND" },
    { repuesto: "Kit de embrague", minimo: 2, und: "UND" },
    { repuesto: "Alternador", minimo: 2, und: "UND" },
    { repuesto: "Caja de dirección", minimo: 1, und: "UND" },
    { repuesto: "Selector de cambios", minimo: 3, und: "UND" },
    { repuesto: "Espejo auxiliar", minimo: 4, und: "UND" },
    { repuesto: "Espejo principal (Juego izquierdo y derecho)", minimo: 4, und: "JUEGO" },
    { repuesto: "Cocuyos de direccionales", minimo: 6, und: "UND" },
    { repuesto: "Guayas de puerta externa", minimo: 3, und: "UND" },
    { repuesto: "Juego bandas de freno con suncho", minimo: 3, und: "JUEGO" },
    { repuesto: "Tapa combustible", minimo: 4, und: "UND" },
    { repuesto: "Manija elevavidrios", minimo: 6, und: "UND" },
    { repuesto: "Racor de aire", minimo: 6, und: "UND" },
    { repuesto: "Cámara de aire (juego delantera y trasera)", minimo: 3, und: "JUEGO" },
    { repuesto: "Pito principal", minimo: 4, und: "UND" },
    { repuesto: "Alarma de reversa", minimo: 4, und: "UND" },
    { repuesto: "Bombillo farola", minimo: 24, und: "UND" },
    { repuesto: "Bombillo 1 filamento", minimo: 24, und: "UND" },
    { repuesto: "Bombillo 2 filamentos", minimo: 24, und: "UND" },
    { repuesto: "Fusibles (varios amperajes)", minimo: 24, und: "UND" },
    { repuesto: "Stop (juego izquierdo y derecho)", minimo: 3, und: "PAR" },
    { repuesto: "Farolas (juego izquierdo y derecho)", minimo: 3, und: "PAR" },
    { repuesto: "Switch de encendido", minimo: 3, und: "UND" },
    { repuesto: "Buje de muelle (juego delantero y trasero)", minimo: 3, und: "JUEGO" },
    { repuesto: "Juego Plumillas", minimo: 6, und: "PAR" }
  ],
  "VEHIPESA": [
    { repuesto: "Manija de puerta externa (juego izquierda y derecha)", minimo: 3, und: "JUEGO" },
    { repuesto: "Guayas de puerta externa", minimo: 3, und: "UND" },
    { repuesto: "Manija elevavidrios", minimo: 6, und: "UND" },
    { repuesto: "Chapa cortina", minimo: 6, und: "UND" },
    { repuesto: "Estribos (juego acceso cabina - Izquierdo y Derecho)", minimo: 2, und: "JUEGO" },
    { repuesto: "Juego Plumillas", minimo: 6, und: "PAR" },
    { repuesto: "Juego de rieles (Izquierdo y Derecho)", minimo: 2, und: "JUEGO" },
    { repuesto: "Juego de rodamientos para carrocería", minimo: 2, und: "JUEGO" },
    { repuesto: "Juego de deslizadores para carrocería", minimo: 2, und: "JUEGO" }
  ],
  "TODOFIBRA": [
    { repuesto: "Manija de puerta externa (juego izquierda y derecha)", minimo: 3, und: "JUEGO" },
    { repuesto: "Guayas de puerta externa", minimo: 3, und: "UND" },
    { repuesto: "Manija elevavidrios", minimo: 6, und: "UND" },
    { repuesto: "Chapa cortina", minimo: 6, und: "UND" },
    { repuesto: "Estribos (juego acceso cabina - Izquierdo y Derecho)", minimo: 2, und: "JUEGO" },
    { repuesto: "Juego Plumillas", minimo: 6, und: "PAR" },
    { repuesto: "Juego de rieles (Izquierdo y Derecho)", minimo: 2, und: "JUEGO" },
    { repuesto: "Juego de rodamientos para carrocería", minimo: 2, und: "JUEGO" },
    { repuesto: "Juego de deslizadores para carrocería", minimo: 2, und: "JUEGO" }
  ]
};

interface SparePartsModuleProps {
  records: SparePartRecord[];
  onRefresh: () => void;
  onSubmitRecord?: (data: Partial<SparePartRecord>) => Promise<boolean>;
  onSubmitInspection?: (inspection: {
    fecha: string;
    inspector: string;
    proveedor: string;
    taller: string;
    items: { repuesto: string; cantidad: number; minimo: number; und: string; observacion?: string }[];
    evidencia?: string;
  }) => Promise<boolean>;
  loading?: boolean;
}

export const SparePartsModule: React.FC<SparePartsModuleProps> = ({
  records,
  onRefresh,
  onSubmitRecord,
  onSubmitInspection,
  loading = false
}) => {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkshop, setSelectedWorkshop] = useState<string>('ALL');
  const [selectedProvider, setSelectedProvider] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedEvidenceView, setSelectedEvidenceView] = useState<{ url: string; title: string } | null>(null);

  // Form State for Full Inspection
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [inspector, setInspector] = useState<string>('');
  const [proveedor, setProveedor] = useState<string>(SPARE_PARTS_PROVIDERS[0] || 'Renting Colombia');
  const [tallerSeleccionado, setTallerSeleccionado] = useState<string>(SPARE_PARTS_WORKSHOPS[0] || 'ELECTRONIC');
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});
  const [evidencia, setEvidencia] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState<boolean>(false);

  // Reset quantities when selected workshop changes
  useEffect(() => {
    const items = STOCK_POR_TALLER[tallerSeleccionado] || [];
    const initialCant: Record<string, number> = {};
    const initialObs: Record<string, string> = {};
    items.forEach(item => {
      initialCant[item.repuesto] = 0;
      initialObs[item.repuesto] = '';
    });
    setCantidades(initialCant);
    setObservaciones(initialObs);
  }, [tallerSeleccionado]);

  // Current items for the selected workshop in the inspection form
  const currentInspectionItems = useMemo(() => {
    return STOCK_POR_TALLER[tallerSeleccionado] || [];
  }, [tallerSeleccionado]);

  // Real-time metrics inside current inspection form
  const inspectionSummary = useMemo(() => {
    let alertCount = 0;
    let okCount = 0;
    currentInspectionItems.forEach(item => {
      const cant = Number(cantidades[item.repuesto] ?? 0);
      if (cant < item.minimo) {
        alertCount++;
      } else {
        okCount++;
      }
    });
    return {
      total: currentInspectionItems.length,
      alertCount,
      okCount
    };
  }, [currentInspectionItems, cantidades]);

  // Handler for image compression (Canvas max 1000px, 0.7 JPEG)
  const handleEvidenciaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    const reader = new FileReader();

    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 1000;
        const maxH = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxW) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          }
        } else {
          if (height > maxH) {
            width = Math.round((width * maxH) / height);
            height = maxH;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', 0.7);
        setEvidencia(compressed);
        setIsCompressing(false);
      };

      img.onerror = () => {
        setEvidencia(result);
        setIsCompressing(false);
      };

      img.src = result;
    };

    reader.readAsDataURL(file);
  };

  // Handler for Saving Full Inspection in a single batch call
  const handleGuardarInspeccion = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = STOCK_POR_TALLER[tallerSeleccionado] || [];

    if (!inspector.trim()) {
      alert("Por favor completa el nombre del inspector.");
      setFeedback({ type: 'error', message: 'El nombre del inspector es obligatorio.' });
      return;
    }

    if (!tallerSeleccionado) {
      alert("Por favor selecciona un taller.");
      setFeedback({ type: 'error', message: 'Debe seleccionar un taller para inspeccionar.' });
      return;
    }

    if (items.length === 0) {
      alert("No hay ítems configurados para este taller.");
      return;
    }

    const inspectionItems = items.map(it => ({
      repuesto: it.repuesto,
      cantidad: Number(cantidades[it.repuesto] ?? 0),
      minimo: it.minimo,
      und: it.und,
      observacion: (observaciones[it.repuesto] || '').trim()
    }));

    setIsSubmitting(true);
    setFeedback(null);

    try {
      let ok = false;
      const payload = {
        fecha,
        inspector: inspector.trim(),
        proveedor,
        taller: tallerSeleccionado,
        items: inspectionItems,
        evidencia: evidencia || undefined
      };

      if (onSubmitInspection) {
        ok = await onSubmitInspection(payload);
      } else {
        ok = await submitSparePartInspection(payload);
      }

      if (ok) {
        const alertCount = inspectionItems.filter(it => it.cantidad < it.minimo).length;
        const msg = alertCount > 0 
          ? `Inspección guardada correctamente (${inspectionItems.length} ítems). Se envió alerta por correo a edgar.arrieta@ab-inbev.com por ${alertCount} repuesto(s) en déficit.`
          : `Inspección guardada correctamente (${inspectionItems.length} ítems). Todo el stock está en nivel óptimo (OK).`;

        alert(msg);
        setFeedback({
          type: 'success',
          message: msg
        });

        // Recargar datos y cerrar modal
        onRefresh();
        setTimeout(() => {
          setShowModal(false);
          setFeedback(null);
          setEvidencia('');
          // Reset quantities to 0
          const resetCant: Record<string, number> = {};
          const resetObs: Record<string, string> = {};
          items.forEach(item => {
            resetCant[item.repuesto] = 0;
            resetObs[item.repuesto] = '';
          });
          setCantidades(resetCant);
          setObservaciones(resetObs);
        }, 1200);
      } else {
        alert("Error al guardar la inspección. Revisa la conexión.");
        setFeedback({
          type: 'error',
          message: "Ocurrió un error al enviar la inspección completa a la hoja REPUESTO. Verifica tu conexión a internet o el script."
        });
      }
    } catch (err: any) {
      console.error("Error guardando inspección de repuestos:", err);
      alert("Error al guardar la inspección. Revisa la conexión.");
      setFeedback({
        type: 'error',
        message: `Error al guardar inspección: ${err?.message || 'Error de conexión'}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered records for results table
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (selectedWorkshop !== 'ALL' && r.taller?.toUpperCase() !== selectedWorkshop.toUpperCase()) {
        return false;
      }
      if (selectedProvider !== 'ALL' && r.proveedor?.toUpperCase() !== selectedProvider.toUpperCase()) {
        return false;
      }
      if (selectedStatus !== 'ALL') {
        const isAlert = r.estado?.toUpperCase().includes('ALERTA') || (r.cantidad < r.minimo);
        if (selectedStatus === 'ALERTA' && !isAlert) return false;
        if (selectedStatus === 'OK' && isAlert) return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchRepuesto = (r.repuesto || '').toLowerCase().includes(q);
        const matchInspector = (r.inspector || '').toLowerCase().includes(q);
        const matchTaller = (r.taller || '').toLowerCase().includes(q);
        const matchProv = (r.proveedor || '').toLowerCase().includes(q);
        const matchObs = (r.observacion || '').toLowerCase().includes(q);
        return matchRepuesto || matchInspector || matchTaller || matchProv || matchObs;
      }
      return true;
    });
  }, [records, selectedWorkshop, selectedProvider, selectedStatus, searchTerm]);

  // Overall metrics and breakdown by workshop
  const stats = useMemo(() => {
    const total = records.length;
    let alerts = 0;
    let ok = 0;

    const workshopSummary: Record<string, { total: number; alerts: number; ok: number; lastDate: string }> = {};

    SPARE_PARTS_WORKSHOPS.forEach(ws => {
      workshopSummary[ws] = { total: 0, alerts: 0, ok: 0, lastDate: '' };
    });

    records.forEach(r => {
      const isAlert = r.estado?.toUpperCase().includes('ALERTA') || (r.cantidad < r.minimo);
      if (isAlert) alerts++;
      else ok++;

      const ws = (r.taller || '').toUpperCase();
      const matchedKey = SPARE_PARTS_WORKSHOPS.find(w => w.toUpperCase() === ws) || ws;
      
      if (!workshopSummary[matchedKey]) {
        workshopSummary[matchedKey] = { total: 0, alerts: 0, ok: 0, lastDate: '' };
      }
      workshopSummary[matchedKey].total++;
      if (isAlert) {
        workshopSummary[matchedKey].alerts++;
      } else {
        workshopSummary[matchedKey].ok++;
      }
      if (r.fecha && (!workshopSummary[matchedKey].lastDate || r.fecha > workshopSummary[matchedKey].lastDate)) {
        workshopSummary[matchedKey].lastDate = r.fecha;
      }
    });

    return {
      total,
      alerts,
      ok,
      alertPct: total > 0 ? Math.round((alerts / total) * 100) : 0,
      workshopSummary
    };
  }, [records]);

  // Export CSV
  const handleExportCSV = () => {
    if (records.length === 0) return;
    const csvData = records.map(r => ({
      FECHA: r.fecha,
      INSPECTOR: r.inspector,
      PROVEEDOR: r.proveedor,
      TALLER: r.taller,
      REPUESTO: r.repuesto,
      'CANTIDAD ENCONTRADA': r.cantidad,
      'MINIMO REQUERIDO': r.minimo,
      UND: r.und,
      ESTADO: r.estado,
      OBSERVACION: r.observacion,
      EVIDENCIA: r.evidencia || ''
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `INSPECCION_REPUESTOS_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="spare-parts-module" className="space-y-6 animate-fade-in text-slate-100 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/60 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400 shrink-0">
              <Boxes className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">REPUESTOS</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Inspección de Stock por Taller
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Auditoría del stock crítico de repuestos por taller (ELECTRONIC, VEHIPESA, TODOFIBRA).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            <button
              id="btn-refresh-spare-parts"
              onClick={onRefresh}
              disabled={loading}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs sm:text-sm font-medium transition shadow-sm disabled:opacity-50 min-h-[42px]"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>

            <button
              id="btn-export-spare-parts"
              onClick={handleExportCSV}
              disabled={records.length === 0}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs sm:text-sm font-medium transition shadow-sm disabled:opacity-50 min-h-[42px]"
            >
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>

            <button
              id="btn-new-spare-part-inspection"
              onClick={() => {
                setFeedback(null);
                setEvidencia('');
                setShowModal(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold transition shadow-lg shadow-indigo-600/30 border border-indigo-400/40 min-h-[42px]"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Inspección de Taller</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: Total Inspections, Global Alerts, OK, and Workshop Count */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Inspections */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] sm:text-xs uppercase font-semibold text-slate-400 tracking-wider">Total Ítems</p>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">{stats.total}</h3>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">En hoja REPUESTO</p>
          </div>
          <div className="p-2.5 sm:p-3 bg-slate-800 rounded-lg text-slate-300 border border-slate-700">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* In Alert */}
        <div className="bg-rose-950/40 border border-rose-800/50 rounded-xl p-3 sm:p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] sm:text-xs uppercase font-semibold text-rose-300 tracking-wider">En ALERTA</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <h3 className="text-xl sm:text-2xl font-bold text-rose-200">{stats.alerts}</h3>
              <span className="text-[10px] sm:text-xs font-semibold text-rose-300 bg-rose-900/60 px-1.5 py-0.5 rounded-full border border-rose-700/50">
                {stats.alertPct}%
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-rose-300/80 mt-0.5">&lt; mínimo</p>
          </div>
          <div className="p-2.5 sm:p-3 bg-rose-900/40 rounded-lg text-rose-400 border border-rose-700/60">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* In OK */}
        <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-3 sm:p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] sm:text-xs uppercase font-semibold text-emerald-300 tracking-wider">En OK</p>
            <h3 className="text-xl sm:text-2xl font-bold text-emerald-200 mt-1">{stats.ok}</h3>
            <p className="text-[10px] sm:text-xs text-emerald-300/80 mt-0.5">Stock óptimo</p>
          </div>
          <div className="p-2.5 sm:p-3 bg-emerald-900/40 rounded-lg text-emerald-400 border border-emerald-700/60">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Talleres Activos */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] sm:text-xs uppercase font-semibold text-slate-400 tracking-wider">Talleres</p>
            <h3 className="text-xl sm:text-2xl font-bold text-indigo-300 mt-1">
              {SPARE_PARTS_WORKSHOPS.length}
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">ELECTRONIC, VEHIPESA...</p>
          </div>
          <div className="p-2.5 sm:p-3 bg-indigo-950/60 rounded-lg text-indigo-400 border border-indigo-800/60">
            <Store className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Cards de Resumen de Repuestos en ALERTA por Taller */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {SPARE_PARTS_WORKSHOPS.map(ws => {
          const wsStats = stats.workshopSummary[ws] || { total: 0, alerts: 0, ok: 0, lastDate: '' };
          const configCount = (STOCK_POR_TALLER[ws] || []).length;
          const isFiltered = selectedWorkshop === ws;

          return (
            <div 
              key={ws}
              onClick={() => setSelectedWorkshop(isFiltered ? 'ALL' : ws)}
              className={`cursor-pointer rounded-2xl p-4 border transition-all shadow-md ${
                isFiltered
                  ? 'bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-500/50'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">{ws}</h4>
                    <p className="text-[11px] text-slate-400">{configCount} repuestos en catálogo</p>
                  </div>
                </div>
                {isFiltered && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-600 text-white">
                    Filtro activo
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3">
                <div className="bg-rose-950/40 border border-rose-800/40 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] font-semibold text-rose-300 uppercase tracking-wider">En Alerta</p>
                  <p className="text-xl font-bold text-rose-200 mt-0.5">{wsStats.alerts}</p>
                </div>
                <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">En OK</p>
                  <p className="text-xl font-bold text-emerald-200 mt-0.5">{wsStats.ok}</p>
                </div>
              </div>

              {wsStats.lastDate && (
                <p className="text-[11px] text-slate-400 mt-2.5 text-right font-mono">
                  Última inspección: <span className="text-slate-300">{wsStats.lastDate}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="input-search-spare-parts"
              type="text"
              placeholder="Buscar por repuesto, inspector, taller o proveedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 sm:py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Filter by Workshop */}
            <div className="flex-1 sm:flex-initial flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5">
              <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                id="select-filter-workshop"
                value={selectedWorkshop}
                onChange={(e) => setSelectedWorkshop(e.target.value)}
                className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer w-full"
              >
                <option value="ALL" className="bg-slate-800">Todos los Talleres</option>
                {SPARE_PARTS_WORKSHOPS.map(ws => (
                  <option key={ws} value={ws} className="bg-slate-800">{ws}</option>
                ))}
              </select>
            </div>

            {/* Filter by Provider */}
            <div className="flex-1 sm:flex-initial flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                id="select-filter-provider"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer w-full"
              >
                <option value="ALL" className="bg-slate-800">Todos los Proveedores</option>
                {SPARE_PARTS_PROVIDERS.map(prov => (
                  <option key={prov} value={prov} className="bg-slate-800">{prov}</option>
                ))}
              </select>
            </div>

            {/* Filter by Status */}
            <div className="flex-1 sm:flex-initial flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                id="select-filter-status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer w-full"
              >
                <option value="ALL" className="bg-slate-800">Todos los Estados</option>
                <option value="ALERTA" className="bg-slate-800 text-rose-400">⚠️ Solo ALERTA</option>
                <option value="OK" className="bg-slate-800 text-emerald-400">✓ Solo OK</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Badges */}
        {(selectedWorkshop !== 'ALL' || selectedProvider !== 'ALL' || selectedStatus !== 'ALL' || searchTerm) && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400 flex-wrap">
            <span>Filtros activos:</span>
            {selectedWorkshop !== 'ALL' && (
              <span className="px-2 py-0.5 bg-indigo-900/50 text-indigo-300 rounded-md border border-indigo-700/50 flex items-center gap-1">
                Taller: {selectedWorkshop}
                <button onClick={() => setSelectedWorkshop('ALL')}><X className="w-3 h-3 hover:text-white" /></button>
              </span>
            )}
            {selectedProvider !== 'ALL' && (
              <span className="px-2 py-0.5 bg-indigo-900/50 text-indigo-300 rounded-md border border-indigo-700/50 flex items-center gap-1">
                Proveedor: {selectedProvider}
                <button onClick={() => setSelectedProvider('ALL')}><X className="w-3 h-3 hover:text-white" /></button>
              </span>
            )}
            {selectedStatus !== 'ALL' && (
              <span className="px-2 py-0.5 bg-indigo-900/50 text-indigo-300 rounded-md border border-indigo-700/50 flex items-center gap-1">
                Estado: {selectedStatus}
                <button onClick={() => setSelectedStatus('ALL')}><X className="w-3 h-3 hover:text-white" /></button>
              </span>
            )}
            {searchTerm && (
              <span className="px-2 py-0.5 bg-indigo-900/50 text-indigo-300 rounded-md border border-indigo-700/50 flex items-center gap-1">
                Texto: "{searchTerm}"
                <button onClick={() => setSearchTerm('')}><X className="w-3 h-3 hover:text-white" /></button>
              </span>
            )}
            <button
              onClick={() => {
                setSelectedWorkshop('ALL');
                setSelectedProvider('ALL');
                setSelectedStatus('ALL');
                setSearchTerm('');
              }}
              className="text-xs text-indigo-400 hover:underline ml-auto"
            >
              Limpiar todos
            </button>
          </div>
        )}
      </div>

      {/* Main Table: Resultados de Inspección de Stock */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Inspecciones Registradas (Hoja REPUESTO)</h2>
            <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full border border-slate-700 font-mono">
              {filteredRecords.length} de {records.length}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Filas resaltadas en rojo corresponden a stock bajo alerta (&lt; mínimo)
          </p>
        </div>

        <div className="overflow-x-auto">
          <table id="table-spare-parts" className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Inspector</th>
                <th className="py-3 px-4">Proveedor</th>
                <th className="py-3 px-4">Taller</th>
                <th className="py-3 px-4">Repuesto</th>
                <th className="py-3 px-4 text-center">Cant. Encontrada</th>
                <th className="py-3 px-4 text-center">Mín. Requerido</th>
                <th className="py-3 px-4 text-center">Unidad</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Evidencia</th>
                <th className="py-3 px-4">Observación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Boxes className="w-10 h-10 text-slate-600 stroke-1" />
                      <p className="text-base font-medium text-slate-400">No hay registros de inspección disponibles</p>
                      <p className="text-xs text-slate-500">
                        {searchTerm || selectedWorkshop !== 'ALL' || selectedStatus !== 'ALL'
                          ? 'Intenta ajustar los filtros de búsqueda.'
                          : 'Haz clic en "Nueva Inspección de Taller" para auditar el stock completo.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item, idx) => {
                  const isAlert = item.estado?.toUpperCase().includes('ALERTA') || (item.cantidad < item.minimo);
                  const deficit = item.minimo - item.cantidad;

                  return (
                    <tr 
                      key={item.id || `rep-${idx}`}
                      className={`transition-colors ${
                        isAlert 
                          ? 'bg-rose-950/30 hover:bg-rose-950/50 border-l-4 border-rose-500' 
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-xs text-slate-300 whitespace-nowrap">
                        {item.fecha || '-'}
                      </td>
                      <td className="py-3 px-4 font-medium text-white whitespace-nowrap">
                        {item.inspector || '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 text-xs rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                          {item.proveedor || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-200">
                          {item.taller || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-100 min-w-[200px]">
                        {item.repuesto}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`inline-block font-bold text-base px-2.5 py-0.5 rounded-lg ${
                          isAlert 
                            ? 'text-rose-300 bg-rose-900/50 border border-rose-700/60' 
                            : 'text-emerald-300 bg-emerald-900/40 border border-emerald-700/40'
                        }`}>
                          {item.cantidad}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-300 whitespace-nowrap">
                        {item.minimo}
                      </td>
                      <td className="py-3 px-4 text-center text-xs text-slate-400 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                          {item.und || 'UND'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isAlert ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-600/30 text-rose-200 border border-rose-500/50 shadow-sm animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                            ALERTA (-{deficit > 0 ? deficit : 0})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600/20 text-emerald-300 border border-emerald-500/40">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            OK
                          </span>
                        )}
                      </td>
                      {/* Evidencia Column */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {item.evidencia ? (
                          <button
                            type="button"
                            onClick={() => setSelectedEvidenceView({
                              url: item.evidencia || '',
                              title: `Evidencia - Taller ${item.taller} (${item.fecha})`
                            })}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-900/40 hover:bg-indigo-900/70 text-indigo-300 border border-indigo-700/60 text-xs font-semibold transition shadow-sm"
                            title="Ver fotografía de evidencia"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Ver Foto</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400 max-w-xs truncate" title={item.observacion}>
                        {item.observacion || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PARA VER FOTOGRAFÍA DE EVIDENCIA */}
      {selectedEvidenceView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-4 sm:p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  {selectedEvidenceView.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvidenceView(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-black/60 rounded-xl p-2 min-h-[250px]">
              <img
                src={selectedEvidenceView.url}
                alt="Evidencia repuestos"
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow"
              />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              {selectedEvidenceView.url.startsWith('http') ? (
                <a
                  href={selectedEvidenceView.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir enlace original
                </a>
              ) : <span />}
              <button
                type="button"
                onClick={() => setSelectedEvidenceView(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORMULARIO MODAL DE INSPECCIÓN COMPLETA POR TALLER (100% RESPONSIVE EN MÓVIL + EVIDENCIAS) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div 
            id="modal-spare-part-full-inspection"
            className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-4xl w-full p-3.5 sm:p-6 shadow-2xl space-y-4 my-2 sm:my-6 text-slate-100 max-h-[96vh] sm:max-h-[92vh] flex flex-col min-w-0"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 sm:pb-4 shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="p-2 sm:p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30 shrink-0">
                  <ListChecks className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-xl font-bold text-white truncate">Inspección de Stock Completo</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                    Taller: <strong className="text-indigo-300 font-bold">{tallerSeleccionado}</strong> ({currentInspectionItems.length} repuestos)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isSubmitting && setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0 ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleGuardarInspeccion} className="flex flex-col flex-1 overflow-hidden space-y-3.5 sm:space-y-4 min-w-0">
              {/* Campos Generales de la Inspección (Responsivo: 1 col móvil, 2 col tablet, 4 col desktop) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 bg-slate-950/80 p-3 sm:p-4 rounded-xl border border-slate-800 shrink-0">
                {/* Fecha */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    Fecha *
                  </label>
                  <input
                    id="form-inspection-fecha"
                    type="date"
                    required
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 transition min-h-[38px]"
                  />
                </div>

                {/* Inspector */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    Inspector *
                  </label>
                  <input
                    id="form-inspection-inspector"
                    type="text"
                    required
                    placeholder="Nombre del inspector"
                    value={inspector}
                    onChange={(e) => setInspector(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition min-h-[38px]"
                  />
                </div>

                {/* Proveedor */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                    Proveedor *
                  </label>
                  <select
                    id="form-inspection-proveedor"
                    required
                    value={proveedor}
                    onChange={(e) => setProveedor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 transition cursor-pointer min-h-[38px]"
                  >
                    {SPARE_PARTS_PROVIDERS.map(p => (
                      <option key={p} value={p} className="bg-slate-800">{p}</option>
                    ))}
                  </select>
                </div>

                {/* Taller */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-indigo-400" />
                    Taller Auditado *
                  </label>
                  <select
                    id="form-inspection-taller"
                    required
                    value={tallerSeleccionado}
                    onChange={(e) => setTallerSeleccionado(e.target.value)}
                    className="w-full px-3 py-2 bg-indigo-900/40 border border-indigo-500 rounded-lg text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition cursor-pointer min-h-[38px]"
                  >
                    {SPARE_PARTS_WORKSHOPS.map(w => (
                      <option key={w} value={w} className="bg-slate-800">{w}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SECCIÓN DE CARGA DE EVIDENCIA (FOTOGRAFÍA) */}
              <div className="bg-slate-950/80 p-3 sm:p-4 rounded-xl border border-slate-800 shrink-0 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-indigo-400" />
                    Evidencia Fotográfica de la Inspección (Opcional)
                  </label>
                  {evidencia && (
                    <button
                      type="button"
                      onClick={() => setEvidencia('')}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 self-start sm:self-auto font-medium"
                    >
                      <X className="w-3.5 h-3.5" />
                      Quitar fotografía
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  <label className="cursor-pointer flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold transition shadow-sm min-h-[42px]">
                    <Camera className="w-4 h-4 text-indigo-400" />
                    <span>{evidencia ? 'Cambiar Fotografía' : 'Tomar Foto o Cargar Evidencia'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleEvidenciaChange}
                      className="hidden"
                    />
                  </label>

                  {isCompressing && (
                    <div className="flex items-center gap-2 text-xs text-indigo-300">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                      <span>Optimizando imagen...</span>
                    </div>
                  )}

                  {evidencia && !isCompressing && (
                    <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700/80 p-2 rounded-xl">
                      <img
                        src={evidencia}
                        alt="Vista previa evidencia"
                        className="h-12 w-16 object-cover rounded-lg border border-slate-700"
                      />
                      <div className="text-[11px] text-emerald-400 font-medium">
                        ✓ Foto lista para guardar
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status bar inside inspection header */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-800/60 rounded-lg border border-slate-700/60 text-xs shrink-0 flex-wrap gap-2">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className="font-semibold text-slate-300 text-[11px] sm:text-xs">
                    Catálogo de <strong className="text-white">{tallerSeleccionado}</strong>:
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-bold text-[11px]">
                    {inspectionSummary.okCount} en OK
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/60 font-bold text-[11px]">
                    {inspectionSummary.alertCount} en ALERTA
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Digita la cantidad encontrada para cada repuesto
                </p>
              </div>

              {/* LISTA DE REPUESTOS DEL TALLER (ADAPTATIVA: Cards táctiles en Móvil, Tabla en Desktop) */}
              <div className="flex-1 overflow-y-auto border border-slate-800 rounded-xl shadow-inner min-h-[220px] p-2 sm:p-0 bg-slate-950/40">
                {/* 1. Vista Móvil: Cards táctiles independientes (pantallas < 768px) */}
                <div className="block md:hidden space-y-2.5">
                  {currentInspectionItems.map((item, index) => {
                    const cantidad = cantidades[item.repuesto] ?? 0;
                    const isAlert = cantidad < item.minimo;
                    const deficit = item.minimo - cantidad;

                    return (
                      <div
                        key={item.repuesto}
                        className={`p-3 rounded-xl border transition-all ${
                          isAlert
                            ? 'bg-rose-950/30 border-rose-800/60 ring-1 ring-rose-500/20'
                            : 'bg-slate-900/90 border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-800/60">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                              #{index + 1}
                            </span>
                            <h4 className="font-bold text-white text-xs leading-snug">
                              {item.repuesto}
                            </h4>
                          </div>
                          {isAlert ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-600/30 text-rose-200 border border-rose-500/60 shrink-0">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              ALERTA (-{deficit > 0 ? deficit : 0})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-600/20 text-emerald-300 border border-emerald-500/50 shrink-0">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              OK
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2.5 items-center">
                          <div className="text-[11px] text-slate-400 space-y-1">
                            <div>
                              Mínimo: <span className="font-bold font-mono text-slate-200 text-xs">{item.minimo}</span>
                            </div>
                            <div>
                              Unidad: <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">{item.und}</span>
                            </div>
                          </div>

                          {/* Control de Cantidad con botones +/- en Celular */}
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const current = cantidades[item.repuesto] ?? 0;
                                setCantidades({
                                  ...cantidades,
                                  [item.repuesto]: Math.max(0, current - 1)
                                });
                              }}
                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center border border-slate-700 active:scale-95 transition text-sm font-bold"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>

                            <input
                              type="number"
                              inputMode="numeric"
                              min="0"
                              step="1"
                              value={cantidades[item.repuesto] ?? 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setCantidades({
                                  ...cantidades,
                                  [item.repuesto]: isNaN(val) ? 0 : Math.max(0, val)
                                });
                              }}
                              className={`w-14 h-8 text-center font-bold rounded-lg border text-sm focus:outline-none transition ${
                                isAlert 
                                  ? 'bg-rose-950 border-rose-600 text-rose-200 focus:border-rose-400' 
                                  : 'bg-slate-800 border-slate-700 text-emerald-300 focus:border-emerald-500'
                              }`}
                            />

                            <button
                              type="button"
                              onClick={() => {
                                const current = cantidades[item.repuesto] ?? 0;
                                setCantidades({
                                  ...cantidades,
                                  [item.repuesto]: current + 1
                                });
                              }}
                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center border border-slate-700 active:scale-95 transition text-sm font-bold"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Observación en Móvil */}
                        <div className="pt-2">
                          <input
                            type="text"
                            placeholder="Observación opcional..."
                            value={observaciones[item.repuesto] || ''}
                            onChange={(e) => setObservaciones({
                              ...observaciones,
                              [item.repuesto]: e.target.value
                            })}
                            className="w-full px-2.5 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. Vista Desktop / Tablet: Tabla estructurada (pantallas >= 768px) */}
                <table className="hidden md:table w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Nombre del Repuesto</th>
                      <th className="py-2.5 px-3 text-center">Mín. Requerido</th>
                      <th className="py-2.5 px-3 text-center">Unidad</th>
                      <th className="py-2.5 px-3 text-center w-36">Cantidad Encontrada</th>
                      <th className="py-2.5 px-3 text-center w-24">Estado</th>
                      <th className="py-2.5 px-3">Observación (Opcional)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {currentInspectionItems.map((item, index) => {
                      const cantidad = cantidades[item.repuesto] ?? 0;
                      const isAlert = cantidad < item.minimo;

                      return (
                        <tr 
                          key={item.repuesto}
                          className={`transition-colors ${
                            isAlert 
                              ? 'bg-rose-950/20 hover:bg-rose-950/30' 
                              : 'bg-slate-900/30 hover:bg-slate-800/40'
                          }`}
                        >
                          {/* Index */}
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                            {index + 1}
                          </td>

                          {/* Nombre del Repuesto */}
                          <td className="py-2.5 px-3 font-semibold text-white">
                            {item.repuesto}
                          </td>

                          {/* Mínimo Requerido (Solo lectura) */}
                          <td className="py-2.5 px-3 text-center font-bold text-slate-300 font-mono text-sm">
                            {item.minimo}
                          </td>

                          {/* Unidad (Solo lectura) */}
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                            <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700">
                              {item.und}
                            </span>
                          </td>

                          {/* Campo Editable: Cantidad Encontrada */}
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              inputMode="numeric"
                              min="0"
                              step="1"
                              value={cantidades[item.repuesto] ?? 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setCantidades({
                                  ...cantidades,
                                  [item.repuesto]: isNaN(val) ? 0 : Math.max(0, val)
                                });
                              }}
                              className={`w-28 px-3 py-1.5 text-center font-bold rounded-lg border text-sm focus:outline-none transition ${
                                isAlert 
                                  ? 'bg-rose-950 border-rose-600 text-rose-200 focus:border-rose-400' 
                                  : 'bg-slate-800 border-slate-700 text-emerald-300 focus:border-emerald-500'
                              }`}
                            />
                          </td>

                          {/* Indicador de Estado en Vivo (ALERTA en rojo / OK en verde) */}
                          <td className="py-2.5 px-3 text-center">
                            {isAlert ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-extrabold bg-rose-600/30 text-rose-200 border border-rose-500/60 shadow-sm">
                                <AlertTriangle className="w-3 h-3 text-rose-400" />
                                ALERTA
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-extrabold bg-emerald-600/20 text-emerald-300 border border-emerald-500/50">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                OK
                              </span>
                            )}
                          </td>

                          {/* Observación */}
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              placeholder="Opcional..."
                              value={observaciones[item.repuesto] || ''}
                              onChange={(e) => setObservaciones({
                                ...observaciones,
                                [item.repuesto]: e.target.value
                              })}
                              className="w-full px-2.5 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Alert notice if there are items under minimum */}
              {inspectionSummary.alertCount > 0 && (
                <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-200 flex items-center gap-2.5 shrink-0">
                  <Mail className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    Se detectaron <strong>{inspectionSummary.alertCount} repuesto(s) en ALERTA</strong>. Al guardar, se enviará automáticamente un correo con la tabla de faltantes a <strong>edgar.arrieta@ab-inbev.com</strong>.
                  </span>
                </div>
              )}

              {/* Feedback messages */}
              {feedback && (
                <div className={`p-3 rounded-xl text-xs font-semibold border shrink-0 ${
                  feedback.type === 'success' 
                    ? 'bg-emerald-950/90 border-emerald-600 text-emerald-200' 
                    : 'bg-rose-950/90 border-rose-600 text-rose-200'
                }`}>
                  {feedback.message}
                </div>
              )}

              {/* Modal Actions: Responsivo en móvil (en columna o fila) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-800 shrink-0">
                <p className="text-[11px] sm:text-xs text-slate-400 text-center sm:text-left">
                  Se enviarán <strong>{currentInspectionItems.length}</strong> registros en lote a la hoja REPUESTO.
                </p>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs sm:text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50 border border-slate-700/50 min-h-[42px]"
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn-submit-full-inspection"
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm transition shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[42px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Guardando inspección...</span>
                      </>
                    ) : (
                      <>
                        <CheckCheck className="w-4 h-4" />
                        <span>Guardar inspección</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
