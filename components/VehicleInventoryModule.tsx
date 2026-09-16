import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  RefreshCw, 
  Truck, 
  User, 
  Calendar, 
  Image as ImageIcon, 
  Plus, 
  Eye, 
  Filter, 
  ShieldCheck, 
  ExternalLink,
  Layers,
  FileText,
  Clock,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { Vehicle, VehicleInventory } from '../types';
import { 
  fetchVehicleInventoryFromSheet, 
  submitVehicleInventory 
} from '../services/sheetService';

interface VehicleInventoryModuleProps {
  vehicles: Vehicle[];
  onRefreshParent?: () => void;
}

// Función de compresión con alta calidad (~1600px en lado mayor, JPEG 0.85, manteniendo relación de aspecto)
const comprimirFoto = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const maxLado = 1600;
      const scale = Math.min(1, maxLado / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(ev.target?.result as string);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = ev.target?.result as string;
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export const VehicleInventoryModule: React.FC<VehicleInventoryModuleProps> = ({ vehicles, onRefreshParent }) => {
  const [inventories, setInventories] = useState<VehicleInventory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Formulario Estados
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedPlate, setSelectedPlate] = useState<string>('');
  const [inspector, setInspector] = useState<string>('');
  
  // 4 Fotos fijas obligatorias
  const [fotoFrontal, setFotoFrontal] = useState<string>('');
  const [fotoLateralIzq, setFotoLateralIzq] = useState<string>('');
  const [fotoLateralDer, setFotoLateralDer] = useState<string>('');
  const [fotoTrasera, setFotoTrasera] = useState<string>('');

  // Conteo
  const [carretillas, setCarretillas] = useState<number | string>(0);
  const [conos, setConos] = useState<number | string>(0);

  // Novedades adicionales opcionales
  const [novedad, setNovedad] = useState<string>('');
  const [fotoNovedad1, setFotoNovedad1] = useState<string>('');
  const [fotoNovedad2, setFotoNovedad2] = useState<string>('');
  const [fotoNovedad3, setFotoNovedad3] = useState<string>('');
  const [fotoNovedad4, setFotoNovedad4] = useState<string>('');

  // Observación
  const [observacion, setObservacion] = useState<string>('');

  // Referencias para inputs de cámara
  const frontalRef = useRef<HTMLInputElement | null>(null);
  const latIzqRef = useRef<HTMLInputElement | null>(null);
  const latDerRef = useRef<HTMLInputElement | null>(null);
  const traseraRef = useRef<HTMLInputElement | null>(null);

  const nov1Ref = useRef<HTMLInputElement | null>(null);
  const nov2Ref = useRef<HTMLInputElement | null>(null);
  const nov3Ref = useRef<HTMLInputElement | null>(null);
  const nov4Ref = useRef<HTMLInputElement | null>(null);

  // Filtros de la tabla
  const [filterPlate, setFilterPlate] = useState<string>('TODAS');
  const [filterDate, setFilterDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal de visualización de fotos / galería completa
  const [selectedInventoryView, setSelectedInventoryView] = useState<VehicleInventory | null>(null);
  const [modalImageZoom, setModalImageZoom] = useState<string | null>(null);

  // Carga de inventarios guardados
  const loadInventories = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await fetchVehicleInventoryFromSheet();
      setInventories(data);
    } catch (e) {
      console.error("Error al cargar inventarios de vehículos:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadInventories();
  }, []);

  // Lista de placas de vehículos ordenadas
  const vehiclePlates = useMemo(() => {
    const list = vehicles.map(v => v.plate).filter(Boolean);
    // Agregar también placas que puedan estar ya en los inventarios si no están en la lista
    inventories.forEach(inv => {
      if (inv.plate && !list.includes(inv.plate)) list.push(inv.plate);
    });
    return Array.from(new Set(list)).sort();
  }, [vehicles, inventories]);

  // Manejo de carga y compresión de archivos
  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>, 
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await comprimirFoto(file);
      setter(base64);
    } catch (err) {
      console.error("Error al procesar foto:", err);
      alert("No se pudo procesar la fotografía seleccionada.");
    }
  };

  // Envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedPlate) {
      setErrorMessage('Por favor selecciona la placa del vehículo.');
      return;
    }

    if (!inspector.trim()) {
      setErrorMessage('Por favor ingresa el nombre del inspector responsable.');
      return;
    }

    if (!fotoFrontal || !fotoLateralIzq || !fotoLateralDer || !fotoTrasera) {
      setErrorMessage('Las 4 fotos fijas del vehículo (Frontal, Lateral Izq, Lateral Der, Trasera) son obligatorias.');
      return;
    }

    setIsSubmitting(true);

    const payload: VehicleInventory = {
      fecha: fecha || new Date().toISOString().split('T')[0],
      plate: selectedPlate.toUpperCase().trim(),
      inspector: inspector.trim(),
      fotoFrontal,
      fotoLateralIzq,
      fotoLateralDer,
      fotoTrasera,
      carretillas: Number(carretillas) || 0,
      conos: Number(conos) || 0,
      novedad: novedad.trim(),
      fotoNovedad1,
      fotoNovedad2,
      fotoNovedad3,
      fotoNovedad4,
      observacion: observacion.trim()
    };

    // Actualización optimista en la lista local para respuesta inmediata
    setInventories(prev => [payload, ...prev]);

    try {
      const ok = await submitVehicleInventory(payload);
      if (ok) {
        setSubmitSuccess(true);
        setTimeout(() => setSubmitSuccess(false), 5000);

        // Limpiar fotos y campos secundarios
        setFotoFrontal('');
        setFotoLateralIzq('');
        setFotoLateralDer('');
        setFotoTrasera('');
        setFotoNovedad1('');
        setFotoNovedad2('');
        setFotoNovedad3('');
        setFotoNovedad4('');
        setNovedad('');
        setObservacion('');
        setCarretillas(0);
        setConos(0);

        // Recargar tabla de datos
        loadInventories(true);
        if (onRefreshParent) onRefreshParent();
      } else {
        setErrorMessage('El servidor no confirmó el guardado, pero el registro se intentó sincronizar.');
      }
    } catch (err) {
      console.error("Error al guardar inventario:", err);
      setErrorMessage('Hubo un inconveniente al conectar con el servidor. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrado y ordenamiento de inventarios guardados
  const filteredInventories = useMemo(() => {
    return inventories
      .filter(inv => {
        if (filterPlate !== 'TODAS' && inv.plate !== filterPlate) return false;
        if (filterDate && !inv.fecha.includes(filterDate)) return false;
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const inPlate = (inv.plate || '').toLowerCase().includes(q);
          const inInsp = (inv.inspector || '').toLowerCase().includes(q);
          const inNov = (inv.novedad || '').toLowerCase().includes(q);
          const inObs = (inv.observacion || '').toLowerCase().includes(q);
          if (!inPlate && !inInsp && !inNov && !inObs) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [inventories, filterPlate, filterDate, searchTerm]);

  return (
    <div className="space-y-8 animate-fadeIn pb-16 font-sans text-slate-800">
      {/* HEADER DE MARCA */}
      <div 
        id="inventario-vehiculos-header" 
        className="rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden"
        style={{ backgroundColor: '#0D2B4E' }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-emerald-300 backdrop-blur-md">
              <ShieldCheck size={14} className="text-emerald-400" />
              Sección Gestión • Registro Fotográfico de Flota
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Inventario Diario de Vehículos
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Documenta el estado visual perimetral de cada unidad con 4 fotos de alta calidad, conteo de elementos de patio (carretillas y conos) y novedades con evidencia fotográfica.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="inventario-refresh-btn"
              onClick={() => loadInventories(true)}
              disabled={isRefreshing}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold tracking-wider uppercase shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Actualizando...' : 'Sincronizar'}
            </button>
          </div>
        </div>
      </div>

      {/* MENSAJE DE ÉXITO O ERROR */}
      {submitSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
          <div className="text-sm font-bold">
            ¡Inventario registrado exitosamente en la hoja INVENTARIO DIARIO! Las fotos han sido enviadas.
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 animate-fadeIn">
          <AlertTriangle size={22} className="text-rose-600 shrink-0" />
          <div className="text-sm font-bold">{errorMessage}</div>
        </div>
      )}

      {/* FORMULARIO DE REGISTRO */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-5 sm:p-7 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Sparkles size={20} className="text-amber-500" />
              Nuevo Registro de Inventario
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Completa los datos y toma las fotografías directamente con tu teléfono celular.
            </p>
          </div>
          <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            Paso 1 de 1
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECCIÓN 1: DATOS GENERALES */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Fecha */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-500" />
                Fecha del Inventario *
              </label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            {/* Placa */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Truck size={14} className="text-slate-500" />
                Placa del Vehículo *
              </label>
              <select
                required
                value={selectedPlate}
                onChange={(e) => setSelectedPlate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
              >
                <option value="">-- Seleccionar Placa --</option>
                {vehiclePlates.map(pl => (
                  <option key={pl} value={pl}>{pl}</option>
                ))}
              </select>
            </div>

            {/* Inspector */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User size={14} className="text-slate-500" />
                Nombre del Inspector *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Juan Pérez"
                value={inspector}
                onChange={(e) => setInspector(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* SECCIÓN 2: 4 FOTOS FIJAS DEL VEHÍCULO (OBLIGATORIAS) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Camera size={16} className="text-emerald-600" />
                Fotografías Fijas del Vehículo (4 Obligatorias)
              </label>
              <span className="text-[11px] text-slate-600 font-medium">
                Alta resolución ~1600px • Calidad 85%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Foto Frontal */}
              <PhotoCard 
                label="1. FOTO FRONTAL *"
                photoUrl={fotoFrontal}
                onTakeClick={() => frontalRef.current?.click()}
                onRemove={() => setFotoFrontal('')}
              />
              <input
                ref={frontalRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handlePhotoUpload(e, setFotoFrontal)}
                className="hidden"
              />

              {/* Foto Lateral Izq */}
              <PhotoCard 
                label="2. LATERAL IZQUIERDO *"
                photoUrl={fotoLateralIzq}
                onTakeClick={() => latIzqRef.current?.click()}
                onRemove={() => setFotoLateralIzq('')}
              />
              <input
                ref={latIzqRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handlePhotoUpload(e, setFotoLateralIzq)}
                className="hidden"
              />

              {/* Foto Lateral Der */}
              <PhotoCard 
                label="3. LATERAL DERECHO *"
                photoUrl={fotoLateralDer}
                onTakeClick={() => latDerRef.current?.click()}
                onRemove={() => setFotoLateralDer('')}
              />
              <input
                ref={latDerRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handlePhotoUpload(e, setFotoLateralDer)}
                className="hidden"
              />

              {/* Foto Trasera */}
              <PhotoCard 
                label="4. FOTO TRASERA *"
                photoUrl={fotoTrasera}
                onTakeClick={() => traseraRef.current?.click()}
                onRemove={() => setFotoTrasera('')}
              />
              <input
                ref={traseraRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handlePhotoUpload(e, setFotoTrasera)}
                className="hidden"
              />
            </div>
          </div>

          {/* SECCIÓN 3: CONTEO DE ELEMENTOS (CARRETILLAS Y CONOS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                Conteo de Carretillas
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={carretillas}
                  onChange={(e) => setCarretillas(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-white border border-slate-200 text-slate-900 text-base font-black rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Unidades</span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                Conteo de Conos
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={conos}
                  onChange={(e) => setConos(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-white border border-slate-200 text-slate-900 text-base font-black rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Unidades</span>
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: NOVEDADES ADICIONALES (OPCIONAL) */}
          <div className="space-y-3 pt-2 bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/70">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-900 mb-1">
                Novedades Adicionales (Opcional)
              </label>
              <p className="text-[11px] text-slate-600 mb-2">
                Describe cualquier golpe, raspón, rotura o faltante, y adjunta hasta 4 fotos de respaldo.
              </p>
              <textarea
                rows={2}
                placeholder="Detalla aquí cualquier novedad encontrada en la inspección..."
                value={novedad}
                onChange={(e) => setNovedad(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400"
              />
            </div>

            {/* Hasta 4 fotos de novedad */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {/* Foto Novedad 1 */}
              <PhotoCard 
                label="Foto Novedad 1"
                photoUrl={fotoNovedad1}
                onTakeClick={() => nov1Ref.current?.click()}
                onRemove={() => setFotoNovedad1('')}
                compact
              />
              <input
                ref={nov1Ref}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handlePhotoUpload(e, setFotoNovedad1)}
                className="hidden"
              />

              {/* Foto Novedad 2 */}
              <PhotoCard 
                label="Foto Novedad 2"
                photoUrl={fotoNovedad2}
                onTakeClick={() => nov2Ref.current?.click()}
                onRemove={() => setFotoNovedad2('')}
                compact
              />
              <input
                ref={nov2Ref}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handlePhotoUpload(e, setFotoNovedad2)}
                className="hidden"
              />

              {/* Foto Novedad 3 */}
              <PhotoCard 
                label="Foto Novedad 3"
                photoUrl={fotoNovedad3}
                onTakeClick={() => nov3Ref.current?.click()}
                onRemove={() => setFotoNovedad3('')}
                compact
              />
              <input
                ref={nov3Ref}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handlePhotoUpload(e, setFotoNovedad3)}
                className="hidden"
              />

              {/* Foto Novedad 4 */}
              <PhotoCard 
                label="Foto Novedad 4"
                photoUrl={fotoNovedad4}
                onTakeClick={() => nov4Ref.current?.click()}
                onRemove={() => setFotoNovedad4('')}
                compact
              />
              <input
                ref={nov4Ref}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handlePhotoUpload(e, setFotoNovedad4)}
                className="hidden"
              />
            </div>
          </div>

          {/* SECCIÓN 5: OBSERVACIÓN GENERAL */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <FileText size={14} className="text-slate-500" />
              Observación General (Opcional)
            </label>
            <input
              type="text"
              placeholder="Notas generales del turno o comentarios adicionales..."
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400"
            />
          </div>

          {/* BOTÓN GUARDAR INVENTARIO */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-3.5 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
              style={{ backgroundColor: '#0D2B4E' }}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={18} className="animate-spin text-emerald-400" />
                  Guardando y subiendo fotos...
                </>
              ) : (
                <>
                  <Upload size={18} className="text-emerald-400" />
                  Guardar Inventario
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* TABLA DE INVENTARIOS GUARDADOS */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden space-y-4 p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900">
              Historial de Inventarios Registrados ({filteredInventories.length})
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Haz clic en cualquier fila para abrir la galería completa de fotos en alta resolución.
            </p>
          </div>
        </div>

        {/* Filtros de la tabla */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Filtro por Placa */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
              Filtrar por Placa
            </label>
            <select
              value={filterPlate}
              onChange={(e) => setFilterPlate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="TODAS">Todas las Placas</option>
              {vehiclePlates.map(pl => (
                <option key={pl} value={pl}>{pl}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Fecha */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
              Filtrar por Fecha
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Buscador */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
              Buscar por Inspector o Novedad
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar palabra clave..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-9 pr-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* CONTENIDO: TABLA DESKTOP / TARJETAS MÓVIL */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-600">
            <RefreshCw size={28} className="animate-spin mx-auto text-emerald-600 mb-3" />
            <p className="text-sm font-bold">Cargando inventarios guardados...</p>
          </div>
        ) : filteredInventories.length === 0 ? (
          <div className="p-12 text-center text-slate-600">
            <CheckCircle2 size={36} className="mx-auto text-slate-400 mb-2" />
            <p className="text-base font-bold text-slate-800">No hay registros de inventario</p>
            <p className="text-xs mt-1 text-slate-600">
              Usa el formulario superior para registrar el primer inventario diario.
            </p>
          </div>
        ) : (
          <>
            {/* VISTA MÓVIL (TARJETAS) */}
            <div className="grid grid-cols-1 gap-3 sm:hidden">
              {filteredInventories.map((inv, idx) => (
                <div
                  key={`${inv.plate}-${inv.fecha}-${idx}`}
                  onClick={() => setSelectedInventoryView(inv)}
                  className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3 active:scale-98 transition-transform cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-black tracking-wider">
                      {inv.plate}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Calendar size={12} />
                      {inv.fecha}
                    </span>
                  </div>

                  <div className="text-xs text-slate-700">
                    <span className="font-bold">Inspector:</span> {inv.inspector || 'No especificado'}
                  </div>

                  <div className="flex items-center gap-4 text-xs font-bold text-slate-800">
                    <div>Carretillas: <span className="text-emerald-700 font-black">{inv.carretillas}</span></div>
                    <div>Conos: <span className="text-amber-700 font-black">{inv.conos}</span></div>
                  </div>

                  {inv.novedad && (
                    <div className="text-xs bg-rose-50 text-rose-800 p-2 rounded-xl border border-rose-100">
                      <span className="font-bold">Novedad:</span> {inv.novedad}
                    </div>
                  )}

                  {/* Miniaturas de fotos */}
                  <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                    {inv.fotoFrontal && <img src={inv.fotoFrontal} alt="Frontal" className="w-10 h-10 object-cover rounded-lg border border-slate-200" />}
                    {inv.fotoLateralIzq && <img src={inv.fotoLateralIzq} alt="Lat Izq" className="w-10 h-10 object-cover rounded-lg border border-slate-200" />}
                    {inv.fotoLateralDer && <img src={inv.fotoLateralDer} alt="Lat Der" className="w-10 h-10 object-cover rounded-lg border border-slate-200" />}
                    {inv.fotoTrasera && <img src={inv.fotoTrasera} alt="Trasera" className="w-10 h-10 object-cover rounded-lg border border-slate-200" />}
                    <span className="text-[10px] font-bold text-indigo-600 ml-auto flex items-center gap-1">
                      <Eye size={12} /> Ver todo
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* VISTA DESKTOP (TABLA) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50/50">
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Placa</th>
                    <th className="p-3">Inspector</th>
                    <th className="p-3 text-center">Carretillas</th>
                    <th className="p-3 text-center">Conos</th>
                    <th className="p-3">Novedad</th>
                    <th className="p-3">Fotos Principales</th>
                    <th className="p-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredInventories.map((inv, idx) => (
                    <tr 
                      key={`${inv.plate}-${inv.fecha}-${idx}`}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setSelectedInventoryView(inv)}
                    >
                      <td className="p-3 font-medium text-slate-600 whitespace-nowrap">{inv.fecha}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-white text-xs font-black tracking-wider">
                          {inv.plate}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{inv.inspector || '-'}</td>
                      <td className="p-3 text-center font-black text-emerald-700">{inv.carretillas}</td>
                      <td className="p-3 text-center font-black text-amber-700">{inv.conos}</td>
                      <td className="p-3 max-w-xs truncate text-slate-700" title={inv.novedad || 'Sin novedades'}>
                        {inv.novedad ? (
                          <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md">
                            {inv.novedad}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">OK / Sin novedad</span>
                        )}
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          {inv.fotoFrontal && (
                            <img 
                              src={inv.fotoFrontal} 
                              alt="Frontal" 
                              onClick={() => setModalImageZoom(inv.fotoFrontal)}
                              className="w-8 h-8 object-cover rounded-md border border-slate-200 hover:scale-125 transition-transform cursor-pointer" 
                              title="Frontal"
                            />
                          )}
                          {inv.fotoLateralIzq && (
                            <img 
                              src={inv.fotoLateralIzq} 
                              alt="Lateral Izq" 
                              onClick={() => setModalImageZoom(inv.fotoLateralIzq)}
                              className="w-8 h-8 object-cover rounded-md border border-slate-200 hover:scale-125 transition-transform cursor-pointer" 
                              title="Lateral Izquierdo"
                            />
                          )}
                          {inv.fotoLateralDer && (
                            <img 
                              src={inv.fotoLateralDer} 
                              alt="Lateral Der" 
                              onClick={() => setModalImageZoom(inv.fotoLateralDer)}
                              className="w-8 h-8 object-cover rounded-md border border-slate-200 hover:scale-125 transition-transform cursor-pointer" 
                              title="Lateral Derecho"
                            />
                          )}
                          {inv.fotoTrasera && (
                            <img 
                              src={inv.fotoTrasera} 
                              alt="Trasera" 
                              onClick={() => setModalImageZoom(inv.fotoTrasera)}
                              className="w-8 h-8 object-cover rounded-md border border-slate-200 hover:scale-125 transition-transform cursor-pointer" 
                              title="Trasera"
                            />
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInventoryView(inv);
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ml-auto"
                        >
                          <Eye size={13} />
                          Ver Galería
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* MODAL DE GALERÍA COMPLETA DEL INVENTARIO */}
      {selectedInventoryView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 space-y-6">
            {/* Header del modal */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  Detalle del Inventario
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Vehículo {selectedInventoryView.plate}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span>📅 {selectedInventoryView.fecha}</span>
                  <span>•</span>
                  <span>👤 Inspector: {selectedInventoryView.inspector || 'No registrado'}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedInventoryView(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteos y novedades */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Carretillas</span>
                <div className="text-xl font-black text-emerald-700 mt-0.5">{selectedInventoryView.carretillas}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Conos</span>
                <div className="text-xl font-black text-amber-700 mt-0.5">{selectedInventoryView.conos}</div>
              </div>
              <div className="col-span-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Novedad Registrada</span>
                <div className="text-xs font-semibold text-slate-800 mt-0.5 truncate">
                  {selectedInventoryView.novedad || 'Sin novedades'}
                </div>
              </div>
            </div>

            {selectedInventoryView.observacion && (
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs">
                <span className="font-bold text-slate-600 block mb-0.5 uppercase text-[10px]">Observación General:</span>
                <p className="text-slate-800 font-medium">{selectedInventoryView.observacion}</p>
              </div>
            )}

            {/* 4 Fotos Principales */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Camera size={14} className="text-emerald-600" />
                Fotografías Fijas del Vehículo
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <GalleryCard title="Frontal" url={selectedInventoryView.fotoFrontal} onZoom={() => setModalImageZoom(selectedInventoryView.fotoFrontal)} />
                <GalleryCard title="Lateral Izquierdo" url={selectedInventoryView.fotoLateralIzq} onZoom={() => setModalImageZoom(selectedInventoryView.fotoLateralIzq)} />
                <GalleryCard title="Lateral Derecho" url={selectedInventoryView.fotoLateralDer} onZoom={() => setModalImageZoom(selectedInventoryView.fotoLateralDer)} />
                <GalleryCard title="Trasera" url={selectedInventoryView.fotoTrasera} onZoom={() => setModalImageZoom(selectedInventoryView.fotoTrasera)} />
              </div>
            </div>

            {/* Fotos de Novedades si existen */}
            {(selectedInventoryView.fotoNovedad1 || selectedInventoryView.fotoNovedad2 || selectedInventoryView.fotoNovedad3 || selectedInventoryView.fotoNovedad4) && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-rose-600" />
                  Fotografías de Novedades
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {selectedInventoryView.fotoNovedad1 && <GalleryCard title="Novedad 1" url={selectedInventoryView.fotoNovedad1} onZoom={() => setModalImageZoom(selectedInventoryView.fotoNovedad1)} />}
                  {selectedInventoryView.fotoNovedad2 && <GalleryCard title="Novedad 2" url={selectedInventoryView.fotoNovedad2} onZoom={() => setModalImageZoom(selectedInventoryView.fotoNovedad2)} />}
                  {selectedInventoryView.fotoNovedad3 && <GalleryCard title="Novedad 3" url={selectedInventoryView.fotoNovedad3} onZoom={() => setModalImageZoom(selectedInventoryView.fotoNovedad3)} />}
                  {selectedInventoryView.fotoNovedad4 && <GalleryCard title="Novedad 4" url={selectedInventoryView.fotoNovedad4} onZoom={() => setModalImageZoom(selectedInventoryView.fotoNovedad4)} />}
                </div>
              </div>
            )}

            {/* Footer Modal */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedInventoryView(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Cerrar Galería
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ZOOM DE FOTO INDIVIDUAL */}
      {modalImageZoom && (
        <div 
          onClick={() => setModalImageZoom(null)}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setModalImageZoom(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 p-2"
            >
              <X size={26} />
            </button>
            <img 
              src={modalImageZoom} 
              alt="Zoom" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" 
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Componente para tarjeta de carga/captura de foto
interface PhotoCardProps {
  label: string;
  photoUrl: string;
  onTakeClick: () => void;
  onRemove: () => void;
  compact?: boolean;
}

const PhotoCard: React.FC<PhotoCardProps> = ({ label, photoUrl, onTakeClick, onRemove, compact = false }) => {
  return (
    <div className={`rounded-2xl border ${photoUrl ? 'border-emerald-300 bg-emerald-50/30' : 'border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100/70'} p-3 flex flex-col justify-between transition-all group`}>
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 block mb-2 truncate">
        {label}
      </span>

      {photoUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 mb-2">
          <img 
            src={photoUrl} 
            alt={label} 
            className={`w-full ${compact ? 'h-24' : 'h-32'} object-cover`}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={onTakeClick}
              className="px-2 py-1 bg-white text-slate-900 rounded-lg text-[10px] font-bold shadow"
            >
              Cambiar
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="px-2 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold shadow"
            >
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <div 
          onClick={onTakeClick}
          className={`flex flex-col items-center justify-center cursor-pointer ${compact ? 'py-4' : 'py-6'} text-slate-500 hover:text-emerald-600 transition-colors`}
        >
          <div className="w-10 h-10 rounded-full bg-slate-200/70 group-hover:bg-emerald-100 flex items-center justify-center text-slate-600 group-hover:text-emerald-600 mb-2 transition-colors">
            <Camera size={20} />
          </div>
          <span className="text-[11px] font-bold text-center">Abrir Cámara</span>
          <span className="text-[9px] text-slate-400 text-center">o seleccionar</span>
        </div>
      )}
    </div>
  );
};

// Componente para tarjeta de galería
const GalleryCard: React.FC<{ title: string; url: string; onZoom: () => void }> = ({ title, url, onZoom }) => {
  if (!url) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-slate-400">
        <ImageIcon size={20} className="mx-auto mb-1 opacity-50" />
        <span className="text-[10px] font-bold">{title}</span>
        <p className="text-[9px]">Sin foto</p>
      </div>
    );
  }

  return (
    <div 
      onClick={onZoom}
      className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 cursor-pointer shadow-sm hover:shadow-md transition-all"
    >
      <img src={url} alt={title} className="w-full h-32 object-cover" />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1 text-xs font-bold">
        <Maximize2 size={16} />
        <span>Ampliar</span>
      </div>
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white text-[10px] font-bold truncate">
        {title}
      </div>
    </div>
  );
};
