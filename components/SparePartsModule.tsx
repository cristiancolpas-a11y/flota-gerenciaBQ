import React, { useState, useMemo } from 'react';
import { SparePartRecord, SparePartDefinition } from '../types';
import { 
  Package, AlertTriangle, CheckCircle2, Search, Plus, 
  RefreshCw, Filter, Download, Building2, Store, 
  User, Calendar, FileText, ArrowUpDown, X, Loader2,
  Boxes, ShieldAlert, BarChart3, ChevronDown
} from 'lucide-react';
import Papa from 'papaparse';

export const SPARE_PARTS_PROVIDERS = [
  'Renting Colombia',
  'Navitrans',
  'ALD'
];

export const SPARE_PARTS_WORKSHOPS = [
  'Vehipesa',
  'Electronic Systems',
  'Todofibra',
  'ETM',
  'Country Motors',
  'Tecnibenz'
];

export const SPARE_PARTS_CATALOG: SparePartDefinition[] = [
  { name: 'Cinturones de seguridad', min: 4, unit: 'UND' },
  { name: 'Motor de arranque', min: 3, unit: 'UND' },
  { name: 'Kit de embrague', min: 2, unit: 'UND' },
  { name: 'Alternador', min: 2, unit: 'UND' },
  { name: 'Caja de dirección', min: 1, unit: 'UND' },
  { name: 'Selector de cambios', min: 3, unit: 'UND' },
  { name: 'Espejo auxiliar', min: 4, unit: 'UND' },
  { name: 'Espejo principal (Juego izquierdo y derecho)', min: 4, unit: 'JUEGO' },
  { name: 'Cocuyos de direccionales', min: 6, unit: 'UND' },
  { name: 'Manija de puerta externa (juego izquierda y derecha)', min: 3, unit: 'JUEGO' },
  { name: 'Guayas de puerta externa', min: 3, unit: 'UND' },
  { name: 'Juego bandas de freno con su ancho', min: 3, unit: 'JUEGO' },
  { name: 'Tapa combustible', min: 4, unit: 'UND' },
  { name: 'Manija elevavidrios', min: 6, unit: 'UND' },
  { name: 'Racor de aire', min: 6, unit: 'UND' },
  { name: 'Cámara de aire (juego delantera y trasera)', min: 3, unit: 'JUEGO' },
  { name: 'Pito principal', min: 4, unit: 'UND' },
  { name: 'Alarma de reversa', min: 4, unit: 'UND' },
  { name: 'Bombillo farola', min: 24, unit: 'UND' },
  { name: 'Bombillo 1 filamento', min: 24, unit: 'UND' },
  { name: 'Bombillo 2 filamentos', min: 24, unit: 'UND' },
  { name: 'Fusibles (varios amperajes)', min: 24, unit: 'UND' },
  { name: 'Stop (juego izquierdo y derecho)', min: 3, unit: 'PAR' },
  { name: 'Farolas (juego izquierdo y derecho)', min: 3, unit: 'PAR' },
  { name: 'Switch de encendido', min: 3, unit: 'UND' },
  { name: 'Buje de muelle (juego delantero y trasero)', min: 3, unit: 'JUEGO' },
  { name: 'Chapa cortina', min: 6, unit: 'UND' },
  { name: 'Estribos (juego acceso cabina - izquierdo y derecho)', min: 2, unit: 'JUEGO' },
  { name: 'Juego Plumillas', min: 6, unit: 'PAR' },
  { name: 'Juego de rieles (Izquierdo y Derecho)', min: 2, unit: 'JUEGO' },
  { name: 'Juego de rodamientos para carrocería', min: 2, unit: 'JUEGO' },
  { name: 'Juego de deslizadores para carrocería', min: 2, unit: 'JUEGO' }
];

interface SparePartsModuleProps {
  records: SparePartRecord[];
  onRefresh: () => void;
  onSubmitRecord: (data: Partial<SparePartRecord>) => Promise<boolean>;
  loading?: boolean;
}

export const SparePartsModule: React.FC<SparePartsModuleProps> = ({
  records,
  onRefresh,
  onSubmitRecord,
  loading = false
}) => {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkshop, setSelectedWorkshop] = useState<string>('ALL');
  const [selectedProvider, setSelectedProvider] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    inspector: '',
    proveedor: SPARE_PARTS_PROVIDERS[0] || 'Renting Colombia',
    taller: SPARE_PARTS_WORKSHOPS[0] || 'Vehipesa',
    repuesto: SPARE_PARTS_CATALOG[0]?.name || '',
    cantidad: 0,
    minimo: SPARE_PARTS_CATALOG[0]?.min || 4,
    und: SPARE_PARTS_CATALOG[0]?.unit || 'UND',
    observacion: ''
  });

  // Handle part selection to auto-complete min and unit
  const handlePartChange = (partName: string) => {
    const found = SPARE_PARTS_CATALOG.find(p => p.name === partName);
    if (found) {
      setFormData(prev => ({
        ...prev,
        repuesto: found.name,
        minimo: found.min,
        und: found.unit
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        repuesto: partName
      }));
    }
  };

  // Live status calculation for form preview
  const liveStatus = useMemo(() => {
    const cant = Number(formData.cantidad) || 0;
    const min = Number(formData.minimo) || 0;
    return cant < min ? 'ALERTA' : 'OK';
  }, [formData.cantidad, formData.minimo]);

  // Filtered records
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

  // Metrics
  const stats = useMemo(() => {
    const total = records.length;
    let alerts = 0;
    let ok = 0;
    const workshopCountMap: Record<string, { total: number; alerts: number }> = {};

    records.forEach(r => {
      const isAlert = r.estado?.toUpperCase().includes('ALERTA') || (r.cantidad < r.minimo);
      if (isAlert) alerts++;
      else ok++;

      const ws = r.taller || 'Sin taller';
      if (!workshopCountMap[ws]) {
        workshopCountMap[ws] = { total: 0, alerts: 0 };
      }
      workshopCountMap[ws].total++;
      if (isAlert) workshopCountMap[ws].alerts++;
    });

    return {
      total,
      alerts,
      ok,
      alertPct: total > 0 ? Math.round((alerts / total) * 100) : 0,
      workshopCountMap
    };
  }, [records]);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.repuesto) {
      setFeedback({ type: 'error', message: 'Debe seleccionar un repuesto.' });
      return;
    }
    if (!formData.inspector.trim()) {
      setFeedback({ type: 'error', message: 'El nombre del inspector es obligatorio.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const success = await onSubmitRecord({
        fecha: formData.fecha,
        inspector: formData.inspector.trim(),
        proveedor: formData.proveedor,
        taller: formData.taller,
        repuesto: formData.repuesto,
        cantidad: Number(formData.cantidad) || 0,
        minimo: Number(formData.minimo) || 0,
        und: formData.und,
        estado: liveStatus,
        observacion: formData.observacion.trim()
      });

      if (success) {
        setFeedback({ 
          type: 'success', 
          message: `Inspección registrada con éxito. Estado: ${liveStatus}` 
        });
        setTimeout(() => {
          setShowModal(false);
          setFeedback(null);
          // Reset form cantidad and observacion
          setFormData(prev => ({
            ...prev,
            cantidad: 0,
            observacion: ''
          }));
        }, 1200);
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: 'No se pudo guardar la inspección en el servidor.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error de conexión.' });
    } finally {
      setIsSubmitting(false);
    }
  };

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
      OBSERVACION: r.observacion
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
    <div id="spare-parts-module" className="space-y-6 animate-fade-in text-slate-100">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/60 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Boxes className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">REPUESTOS</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Inspección de Stock en Talleres
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Auditoría y control de stock mínimo de repuestos críticos en talleres de mantenimiento.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              id="btn-refresh-spare-parts"
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-sm font-medium transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>

            <button
              id="btn-export-spare-parts"
              onClick={handleExportCSV}
              disabled={records.length === 0}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-sm font-medium transition shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>

            <button
              id="btn-new-spare-part-inspection"
              onClick={() => {
                setFeedback(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-lg shadow-indigo-600/30 border border-indigo-400/40"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Inspección</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inspections */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Total Inspecciones</p>
            <h3 className="text-2xl font-bold text-white mt-1">{stats.total}</h3>
            <p className="text-xs text-slate-400 mt-1">Registros en hoja REPUESTO</p>
          </div>
          <div className="p-3 bg-slate-800 rounded-lg text-slate-300 border border-slate-700">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>

        {/* In Alert */}
        <div className="bg-rose-950/40 border border-rose-800/50 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs uppercase font-semibold text-rose-300 tracking-wider">Repuestos en ALERTA</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-bold text-rose-200">{stats.alerts}</h3>
              <span className="text-xs font-semibold text-rose-300 bg-rose-900/60 px-2 py-0.5 rounded-full border border-rose-700/50">
                {stats.alertPct}%
              </span>
            </div>
            <p className="text-xs text-rose-300/80 mt-1">Por debajo del mínimo requerido</p>
          </div>
          <div className="p-3 bg-rose-900/40 rounded-lg text-rose-400 border border-rose-700/60">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* In OK */}
        <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs uppercase font-semibold text-emerald-300 tracking-wider">Repuestos en OK</p>
            <h3 className="text-2xl font-bold text-emerald-200 mt-1">{stats.ok}</h3>
            <p className="text-xs text-emerald-300/80 mt-1">Stock cumple o supera el mínimo</p>
          </div>
          <div className="p-3 bg-emerald-900/40 rounded-lg text-emerald-400 border border-emerald-700/60">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Talleres Evaluados */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Talleres Registrados</p>
            <h3 className="text-2xl font-bold text-indigo-300 mt-1">
              {Object.keys(stats.workshopCountMap).length}
            </h3>
            <p className="text-xs text-slate-400 mt-1">Red de talleres auditados</p>
          </div>
          <div className="p-3 bg-indigo-950/60 rounded-lg text-indigo-400 border border-indigo-800/60">
            <Store className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
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
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
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

          {/* Filters */}
          <div className="flex flex-wrap gap-2.5 items-center">
            {/* Filter by Workshop */}
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1">
              <Store className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="select-filter-workshop"
                value={selectedWorkshop}
                onChange={(e) => setSelectedWorkshop(e.target.value)}
                className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer py-1"
              >
                <option value="ALL" className="bg-slate-800">Todos los Talleres</option>
                {SPARE_PARTS_WORKSHOPS.map(ws => (
                  <option key={ws} value={ws} className="bg-slate-800">{ws}</option>
                ))}
              </select>
            </div>

            {/* Filter by Provider */}
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="select-filter-provider"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer py-1"
              >
                <option value="ALL" className="bg-slate-800">Todos los Proveedores</option>
                {SPARE_PARTS_PROVIDERS.map(prov => (
                  <option key={prov} value={prov} className="bg-slate-800">{prov}</option>
                ))}
              </select>
            </div>

            {/* Filter by Status */}
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="select-filter-status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer py-1"
              >
                <option value="ALL" className="bg-slate-800">Todos los Estados</option>
                <option value="ALERTA" className="bg-slate-800 text-rose-400">⚠️ Solo ALERTA</option>
                <option value="OK" className="bg-slate-800 text-emerald-400">✓ Solo OK</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
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

      {/* Main Table Layout */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Inspecciones de Stock</h2>
            <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full border border-slate-700">
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
                <th className="py-3 px-4">Observación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Boxes className="w-10 h-10 text-slate-600 stroke-1" />
                      <p className="text-base font-medium text-slate-400">No hay registros de inspección disponibles</p>
                      <p className="text-xs text-slate-500">
                        {searchTerm || selectedWorkshop !== 'ALL' || selectedStatus !== 'ALL'
                          ? 'Intenta ajustar los filtros de búsqueda.'
                          : 'Haz clic en "Nueva Inspección" para registrar el primer repuesto.'}
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
                      <td className="py-3 px-4 font-medium text-slate-100 min-w-[220px]">
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

      {/* Modal / Formulario de Nueva Inspección */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div 
            id="modal-spare-part-form"
            className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 text-slate-100"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                  <Boxes className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Registrar Inspección de Repuesto</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Auditoría individual de stock en taller</p>
                </div>
              </div>
              <button
                onClick={() => !isSubmitting && setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Fecha */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Fecha de Inspección *
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="form-spare-fecha"
                      type="date"
                      required
                      value={formData.fecha}
                      onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                {/* Inspector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Inspector (Nombre) *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="form-spare-inspector"
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez"
                      value={formData.inspector}
                      onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                {/* Proveedor */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Proveedor *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      id="form-spare-proveedor"
                      required
                      value={formData.proveedor}
                      onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                    >
                      {SPARE_PARTS_PROVIDERS.map(p => (
                        <option key={p} value={p} className="bg-slate-800">{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Taller */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Taller *
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      id="form-spare-taller"
                      required
                      value={formData.taller}
                      onChange={(e) => setFormData({ ...formData, taller: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                    >
                      {SPARE_PARTS_WORKSHOPS.map(w => (
                        <option key={w} value={w} className="bg-slate-800">{w}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Repuesto Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Repuesto Crítico *
                </label>
                <div className="relative">
                  <Package className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    id="form-spare-repuesto"
                    required
                    value={formData.repuesto}
                    onChange={(e) => handlePartChange(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                  >
                    {SPARE_PARTS_CATALOG.map(p => (
                      <option key={p.name} value={p.name} className="bg-slate-800">
                        {p.name} (Mín: {p.min} {p.unit})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cantidad, Mínimo y Unidad */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                {/* Cantidad Encontrada */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Cant. Encontrada *
                  </label>
                  <input
                    id="form-spare-cantidad"
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={formData.cantidad}
                    onChange={(e) => setFormData({ ...formData, cantidad: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-lg font-bold text-white focus:outline-none focus:border-indigo-500 transition text-center"
                  />
                </div>

                {/* Mínimo Requerido (Autocompletado) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Mín. Requerido
                  </label>
                  <input
                    id="form-spare-minimo"
                    type="number"
                    readOnly
                    value={formData.minimo}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-lg font-bold text-slate-300 text-center cursor-not-allowed"
                  />
                </div>

                {/* Unidad (Autocompletado) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Unidad (UND/JUEGO)
                  </label>
                  <input
                    id="form-spare-und"
                    type="text"
                    readOnly
                    value={formData.und}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-semibold text-slate-300 text-center cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Live Status Preview Banner */}
              <div className="pt-1">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Resultado de la Evaluación de Stock:
                </label>
                {liveStatus === 'ALERTA' ? (
                  <div className="flex items-center justify-between p-3.5 bg-rose-950/60 border border-rose-600/70 rounded-xl text-rose-200">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-rose-600/30 rounded-lg text-rose-300">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-rose-200">ESTADO: ALERTA</p>
                        <p className="text-xs text-rose-300/90">
                          Stock insuficiente ({formData.cantidad} &lt; mínimo de {formData.minimo} {formData.und}). Faltan {formData.minimo - formData.cantidad} {formData.und}.
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-rose-600 text-white text-xs font-extrabold rounded-lg shadow-sm">
                      ALERTA
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3.5 bg-emerald-950/60 border border-emerald-600/70 rounded-xl text-emerald-200">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-emerald-600/30 rounded-lg text-emerald-300">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-emerald-200">ESTADO: OK</p>
                        <p className="text-xs text-emerald-300/90">
                          Stock suficiente ({formData.cantidad} &ge; mínimo de {formData.minimo} {formData.und}).
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-extrabold rounded-lg shadow-sm">
                      OK
                    </span>
                  </div>
                )}
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Observaciones (Opcional)
                </label>
                <textarea
                  id="form-spare-observacion"
                  rows={2}
                  placeholder="Detalles sobre estado físico, ubicación en bodega, pedido en tránsito..."
                  value={formData.observacion}
                  onChange={(e) => setFormData({ ...formData, observacion: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition resize-none"
                />
              </div>

              {/* Feedback messages */}
              {feedback && (
                <div className={`p-3 rounded-xl text-xs font-medium border ${
                  feedback.type === 'success' 
                    ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200' 
                    : 'bg-rose-950/80 border-rose-700 text-rose-200'
                }`}>
                  {feedback.message}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  id="btn-submit-spare-part"
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando en Servidor...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Guardar Inspección</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
