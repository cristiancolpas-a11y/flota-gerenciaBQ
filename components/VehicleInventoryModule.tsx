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
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Grid,
  Table as TableIcon,
  Sparkles,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { Vehicle, VehicleInventory } from '../types';
import { 
  fetchVehicleInventoryFromSheet, 
  submitVehicleInventory 
} from '../services/sheetService';
import { normalizePlate, getDriveDirectLink } from '../utils';

interface VehicleInventoryModuleProps {
  vehicles: Vehicle[];
  onRefreshParent?: () => void;
}

// Parsea fechas de varios formatos a timestamp UTC para ordenación cronológica exacta
const parseDateToTimestamp = (dateStr: string): number => {
  if (!dateStr) return 0;
  const trimmed = dateStr.trim();
  // Formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parts = trimmed.split('T')[0].split('-');
    return new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))).getTime();
  }
  // Formato DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
    const parts = trimmed.split('/');
    return new Date(Date.UTC(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))).getTime();
  }
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

// Formato de fecha en dd/mm/yyyy respetando UTC para evitar desfases de zona horaria
const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr || dateStr === '—') return '—';
  if (dateStr === 'TODAS') return 'Todas las fechas';
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parts = trimmed.split('T')[0].split('-');
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
    const parts = trimmed.split('/');
    return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
  }
  const ts = parseDateToTimestamp(trimmed);
  if (ts > 0) {
    const d = new Date(ts);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
  }
  return dateStr;
};

// Función de compresión para subidas directas (~1600px, JPEG 0.85)
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

interface LightboxItem {
  label: string;
  url: string;
  isNovelty?: boolean;
}

interface LightboxState {
  vehicle: VehicleInventory;
  cd: string;
  photos: LightboxItem[];
  currentIndex: number;
}

export const VehicleInventoryModule: React.FC<VehicleInventoryModuleProps> = ({ vehicles, onRefreshParent }) => {
  const [inventories, setInventories] = useState<VehicleInventory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Pestaña activa: Galería por CD (por defecto), Tabla Detallada o Nuevo Registro
  const [activeTab, setActiveTab] = useState<'galeria' | 'tabla' | 'registro'>('galeria');

  // Filtros de navegación
  const [selectedDay, setSelectedDay] = useState<string>(''); // Vacío hasta cargar datos
  const [filterCd, setFilterCd] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [onlyNovelties, setOnlyNovelties] = useState<boolean>(false);

  // Visor / Lightbox interactivo dentro de la app
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  // Formulario Estados (Paso 1 de 1)
  const [fechaForm, setFechaForm] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedPlate, setSelectedPlate] = useState<string>('');
  const [inspector, setInspector] = useState<string>('');
  
  // 6 Fotos fijas (Frontal, Laterales, Trasera, Estribos)
  const [fotoFrontal, setFotoFrontal] = useState<string>('');
  const [fotoLateralIzq, setFotoLateralIzq] = useState<string>('');
  const [fotoLateralDer, setFotoLateralDer] = useState<string>('');
  const [fotoTrasera, setFotoTrasera] = useState<string>('');
  const [fotoEstriboIzq, setFotoEstriboIzq] = useState<string>('');
  const [fotoEstriboDer, setFotoEstriboDer] = useState<string>('');

  // Patio: Conteo y Tacos
  const [carretillas, setCarretillas] = useState<number | string>(0);
  const [conos, setConos] = useState<number | string>(0);
  const [estadoTacos, setEstadoTacos] = useState<string>('');
  const [tacos, setTacos] = useState<string>('');

  // Fotos de Novedades (1-3)
  const [fotoNovedad1, setFotoNovedad1] = useState<string>('');
  const [fotoNovedad2, setFotoNovedad2] = useState<string>('');
  const [fotoNovedad3, setFotoNovedad3] = useState<string>('');
  const [observacion, setObservacion] = useState<string>('');

  // Refs de archivos
  const frontalRef = useRef<HTMLInputElement | null>(null);
  const latIzqRef = useRef<HTMLInputElement | null>(null);
  const latDerRef = useRef<HTMLInputElement | null>(null);
  const traseraRef = useRef<HTMLInputElement | null>(null);
  const estriboIzqRef = useRef<HTMLInputElement | null>(null);
  const estriboDerRef = useRef<HTMLInputElement | null>(null);
  const nov1Ref = useRef<HTMLInputElement | null>(null);
  const nov2Ref = useRef<HTMLInputElement | null>(null);
  const nov3Ref = useRef<HTMLInputElement | null>(null);

  // Cruzar placa con la lista de vehículos para obtener el CD
  const cdDePlaca = (placa: string): string => {
    if (!placa) return 'SIN CD';
    const norm = normalizePlate(placa);
    const v = vehicles.find(x => normalizePlate(x.plate) === norm);
    return v?.cd?.trim() || 'SIN CD';
  };

  // Cargar inventarios desde la hoja
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

  // Fechas reales disponibles en la hoja, ordenadas de más reciente a más antigua
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    inventories.forEach(inv => {
      if (inv.fecha && inv.fecha.trim()) {
        set.add(inv.fecha.trim());
      }
    });
    return Array.from(set).sort((a, b) => parseDateToTimestamp(b) - parseDateToTimestamp(a));
  }, [inventories]);

  // Al cargar las fechas, seleccionar por defecto el día más reciente con registros
  useEffect(() => {
    if (availableDates.length > 0) {
      if (!selectedDay || (!availableDates.includes(selectedDay) && selectedDay !== 'TODAS')) {
        setSelectedDay(availableDates[0]);
      }
    } else {
      setSelectedDay('TODAS');
    }
  }, [availableDates]);

  // Lista de CDs disponibles entre vehículos y los inventarios existentes
  const availableCds = useMemo(() => {
    const set = new Set<string>();
    vehicles.forEach(v => {
      if (v.cd && v.cd.trim()) set.add(v.cd.trim());
    });
    inventories.forEach(inv => {
      const cd = cdDePlaca(inv.plate);
      if (cd) set.add(cd);
    });
    const list = Array.from(set).sort();
    return list;
  }, [vehicles, inventories]);

  // Lista de placas de vehículos ordenadas para el formulario
  const vehiclePlates = useMemo(() => {
    const list = vehicles.map(v => v.plate).filter(Boolean);
    inventories.forEach(inv => {
      if (inv.plate && !list.includes(inv.plate)) list.push(inv.plate);
    });
    return Array.from(new Set(list)).sort();
  }, [vehicles, inventories]);

  // Manejo de carga de fotos
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

  // Guardar nuevo registro
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
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
      fecha: fechaForm || new Date().toISOString().split('T')[0],
      plate: selectedPlate.toUpperCase().trim(),
      inspector: inspector.trim(),
      fotoFrontal,
      fotoLateralIzq,
      fotoLateralDer,
      fotoTrasera,
      carretillas: Number(carretillas) || 0,
      conos: Number(conos) || 0,
      fotoEstriboIzq,
      fotoEstriboDer,
      fotoNovedad1,
      fotoNovedad2,
      fotoNovedad3,
      observacion: observacion.trim(),
      estadoTacos: estadoTacos.trim(),
      tacos: tacos.trim()
    };

    setInventories(prev => [payload, ...prev]);

    try {
      const ok = await submitVehicleInventory(payload);
      if (ok) {
        setSubmitSuccess(true);
        setTimeout(() => setSubmitSuccess(false), 5000);

        setFotoFrontal('');
        setFotoLateralIzq('');
        setFotoLateralDer('');
        setFotoTrasera('');
        setFotoEstriboIzq('');
        setFotoEstriboDer('');
        setFotoNovedad1('');
        setFotoNovedad2('');
        setFotoNovedad3('');
        setObservacion('');
        setEstadoTacos('');
        setTacos('');
        setCarretillas(0);
        setConos(0);

        loadInventories(true);
        if (onRefreshParent) onRefreshParent();
        setActiveTab('galeria');
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

  // Construir array de fotos válidas de un vehículo para el Lightbox
  const getVehiclePhotos = (inv: VehicleInventory): LightboxItem[] => {
    const list: LightboxItem[] = [];
    if (inv.fotoFrontal) list.push({ label: 'Foto Frontal', url: inv.fotoFrontal });
    if (inv.fotoLateralIzq) list.push({ label: 'Foto Lateral Izq.', url: inv.fotoLateralIzq });
    if (inv.fotoLateralDer) list.push({ label: 'Foto Lateral Der.', url: inv.fotoLateralDer });
    if (inv.fotoTrasera) list.push({ label: 'Foto Trasera', url: inv.fotoTrasera });
    if (inv.fotoEstriboIzq) list.push({ label: 'Foto Estribo Izq.', url: inv.fotoEstriboIzq });
    if (inv.fotoEstriboDer) list.push({ label: 'Foto Estribo Der.', url: inv.fotoEstriboDer });
    if (inv.fotoNovedad1) list.push({ label: 'Novedad 1', url: inv.fotoNovedad1, isNovelty: true });
    if (inv.fotoNovedad2) list.push({ label: 'Novedad 2', url: inv.fotoNovedad2, isNovelty: true });
    if (inv.fotoNovedad3) list.push({ label: 'Novedad 3', url: inv.fotoNovedad3, isNovelty: true });
    return list;
  };

  // Abrir Lightbox en una foto específica
  const openLightboxAtPhoto = (inv: VehicleInventory, targetUrl: string) => {
    const photos = getVehiclePhotos(inv);
    let idx = photos.findIndex(p => p.url === targetUrl);
    if (idx === -1) idx = 0;
    setLightbox({
      vehicle: inv,
      cd: cdDePlaca(inv.plate),
      photos,
      currentIndex: idx
    });
  };

  // Atajos de teclado para el visor (Esc, Flechas)
  useEffect(() => {
    if (!lightbox) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      else if (e.key === 'ArrowLeft') {
        setLightbox(prev => prev ? {
          ...prev,
          currentIndex: (prev.currentIndex - 1 + prev.photos.length) % prev.photos.length
        } : null);
      } else if (e.key === 'ArrowRight') {
        setLightbox(prev => prev ? {
          ...prev,
          currentIndex: (prev.currentIndex + 1) % prev.photos.length
        } : null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightbox]);

  // Filtrado de inventarios según día, CD, búsqueda y novedades
  const filteredInventories = useMemo(() => {
    return inventories.filter(inv => {
      // 1. Filtro por Día
      if (selectedDay && selectedDay !== 'TODAS') {
        const invDateTrim = (inv.fecha || '').trim();
        if (invDateTrim !== selectedDay) {
          const tsInv = parseDateToTimestamp(invDateTrim);
          const tsSel = parseDateToTimestamp(selectedDay);
          if (tsInv !== tsSel || tsInv === 0) return false;
        }
      }

      // 2. Filtro por CD
      const cd = cdDePlaca(inv.plate);
      if (filterCd !== 'TODOS' && cd !== filterCd) {
        return false;
      }

      // 3. Filtro "Solo con novedad"
      if (onlyNovelties) {
        const hasNov = Boolean(
          inv.fotoNovedad1 || 
          inv.fotoNovedad2 || 
          inv.fotoNovedad3 || 
          (inv.observacion && inv.observacion.trim().length > 0)
        );
        if (!hasNov) return false;
      }

      // 4. Búsqueda por placa, inspector o palabras clave
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const inPlate = (inv.plate || '').toLowerCase().includes(q);
        const inInsp = (inv.inspector || '').toLowerCase().includes(q);
        const inObs = (inv.observacion || '').toLowerCase().includes(q);
        const inTacos = (inv.tacos || '').toLowerCase().includes(q) || (inv.estadoTacos || '').toLowerCase().includes(q);
        if (!inPlate && !inInsp && !inObs && !inTacos) return false;
      }

      return true;
    }).sort((a, b) => {
      const tsB = parseDateToTimestamp(b.fecha);
      const tsA = parseDateToTimestamp(a.fecha);
      if (tsB !== tsA) return tsB - tsA;
      return (a.plate || '').localeCompare(b.plate || '');
    });
  }, [inventories, selectedDay, filterCd, onlyNovelties, searchTerm, vehicles]);

  // Agrupación por CD para el layout visual
  const groupedByCd = useMemo(() => {
    const groups: Record<string, VehicleInventory[]> = {};
    filteredInventories.forEach(inv => {
      const cd = cdDePlaca(inv.plate);
      if (!groups[cd]) groups[cd] = [];
      groups[cd].push(inv);
    });

    const sortedCds = Object.keys(groups).sort((a, b) => {
      if (a === 'SIN CD') return 1;
      if (b === 'SIN CD') return -1;
      return a.localeCompare(b);
    });

    return sortedCds.map(cd => ({
      cd,
      items: groups[cd]
    }));
  }, [filteredInventories, vehicles]);

  return (
    <div className="space-y-6 animate-fadeIn pb-16 font-sans text-slate-800">
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
              Gestión de Flota • Galería Fotográfica de Patio
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Inventario Diario de Vehículos
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Plataforma de inspección visual perimetral. Revisa las fotografías de cada vehículo agrupadas por Centro de Distribución y por fecha sin salir de la app.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="inventario-refresh-btn"
              onClick={() => loadInventories(true)}
              disabled={isRefreshing}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold tracking-wider uppercase shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Sincronizando...' : 'Sincronizar'}
            </button>

            <button
              onClick={() => setActiveTab(activeTab === 'registro' ? 'galeria' : 'registro')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2 shadow-sm ${
                activeTab === 'registro'
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                  : 'bg-white/15 hover:bg-white/25 text-white'
              }`}
            >
              <Plus size={16} />
              {activeTab === 'registro' ? 'Volver a Galería' : 'Nuevo Registro'}
            </button>
          </div>
        </div>

        {/* NAVEGACIÓN ENTRE VISTAS */}
        <div className="relative z-10 flex items-center gap-2 mt-6 pt-5 border-t border-white/15">
          <button
            onClick={() => setActiveTab('galeria')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'galeria'
                ? 'bg-white text-slate-900 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Grid size={15} />
            Galería por CD
          </button>
          <button
            onClick={() => setActiveTab('tabla')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'tabla'
                ? 'bg-white text-slate-900 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <TableIcon size={15} />
            Tabla Detallada
          </button>
          <button
            onClick={() => setActiveTab('registro')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'registro'
                ? 'bg-white text-slate-900 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Camera size={15} />
            Registrar Inventario
          </button>
        </div>
      </div>

      {/* MENSAJES DE ESTADO */}
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

      {/* =========================================================================
          SECCIÓN DE FILTROS Y SELECTOR DE DÍA (Para Galería y Tabla)
          ========================================================================= */}
      {activeTab !== 'registro' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* SELECTOR DE DÍA PRINCIPAL */}
            <div className="flex-1">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar size={14} className="text-emerald-600" />
                Fecha de Inspección (Día)
              </label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 hover:border-emerald-500 text-slate-900 text-xs rounded-xl px-3 py-2.5 font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm transition-colors"
              >
                {availableDates.map(dateKey => (
                  <option key={dateKey} value={dateKey}>
                    📅 {formatDisplayDate(dateKey)}
                  </option>
                ))}
                <option value="TODAS">🗓️ Todas las fechas (Histórico completo)</option>
              </select>
            </div>

            {/* SELECTOR DE CD */}
            <div className="flex-1">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <MapPin size={14} className="text-emerald-600" />
                Centro de Distribución (CD)
              </label>
              <select
                value={filterCd}
                onChange={(e) => setFilterCd(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 hover:border-emerald-500 text-slate-900 text-xs rounded-xl px-3 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm transition-colors"
              >
                <option value="TODOS">Todos los CD ({availableCds.length})</option>
                {availableCds.map(cd => (
                  <option key={cd} value={cd}>{cd}</option>
                ))}
              </select>
            </div>

            {/* BÚSQUEDA POR PLACA O INSPECTOR */}
            <div className="flex-1">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Search size={14} className="text-slate-500" />
                Buscar por Placa / Inspector
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ej: COVCN100, inspector..."
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl pl-9 pr-3 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* TOGGLE: SOLO CON NOVEDADES */}
            <div className="lg:w-48 flex items-end">
              <button
                type="button"
                onClick={() => setOnlyNovelties(!onlyNovelties)}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                  onlyNovelties
                    ? 'bg-rose-50 border-rose-300 text-rose-700 font-black shadow-sm ring-2 ring-rose-200'
                    : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <AlertCircle size={14} className={onlyNovelties ? 'text-rose-600' : 'text-slate-400'} />
                Solo con novedad
              </button>
            </div>
          </div>

          {/* BARRA DE CONTADOR Y ESTADO */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="font-bold text-slate-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span>
                Mostrando <strong className="text-slate-900">{filteredInventories.length}</strong> {filteredInventories.length === 1 ? 'vehículo' : 'vehículos'}
                {selectedDay !== 'TODAS' ? ` del ${formatDisplayDate(selectedDay)}` : ' (Todas las fechas)'}
              </span>
            </div>

            {groupedByCd.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 font-medium">
                <span className="font-bold text-slate-600">Patios:</span>
                {groupedByCd.map(g => (
                  <span key={g.cd} className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-bold">
                    {g.cd} ({g.items.length})
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          VISTA 1: GALERÍA POR CD (Principal)
          ========================================================================= */}
      {activeTab === 'galeria' && (
        <div className="space-y-8">
          {isLoading ? (
            <div className="p-16 text-center text-slate-600 bg-white rounded-3xl border border-slate-200/80 shadow-sm">
              <RefreshCw size={32} className="animate-spin mx-auto text-emerald-600 mb-3" />
              <p className="text-base font-bold text-slate-800">Cargando inventarios y fotografías...</p>
              <p className="text-xs text-slate-500 mt-1">Sincronizando con Google Sheets</p>
            </div>
          ) : filteredInventories.length === 0 ? (
            <div className="p-16 text-center text-slate-600 bg-white rounded-3xl border border-slate-200/80 shadow-sm">
              <CheckCircle2 size={40} className="mx-auto text-slate-400 mb-3" />
              <p className="text-lg font-bold text-slate-800">No se encontraron inventarios</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No hay registros con los filtros seleccionados para el día {formatDisplayDate(selectedDay)}. Intenta seleccionar otra fecha o borrar los términos de búsqueda.
              </p>
              <button
                onClick={() => {
                  setSelectedDay('TODAS');
                  setFilterCd('TODOS');
                  setSearchTerm('');
                  setOnlyNovelties(false);
                }}
                className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Ver todas las fechas
              </button>
            </div>
          ) : (
            groupedByCd.map(({ cd, items }) => (
              <div key={cd} className="space-y-4">
                {/* ENCABEZADO DE CADA CD */}
                <div className="flex items-center justify-between bg-slate-100/80 p-3 sm:px-5 sm:py-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-sm">
                      <MapPin size={16} className="text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                        {cd}
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          — {items.length} {items.length === 1 ? 'vehículo inspeccionado' : 'vehículos inspeccionados'}
                        </span>
                      </h2>
                    </div>
                  </div>

                  <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 shadow-xs">
                    {cd === 'SIN CD' ? 'Pendiente asignar' : 'Flota Asignada'}
                  </span>
                </div>

                {/* CUADRÍCULA DE VEHÍCULOS DE ESTE CD */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {items.map((inv, idx) => (
                    <VehicleCard
                      key={`${inv.plate}-${inv.fecha}-${idx}`}
                      inventory={inv}
                      cd={cd}
                      onOpenPhoto={(targetUrl) => openLightboxAtPhoto(inv, targetUrl)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* =========================================================================
          VISTA 2: TABLA DETALLADA
          ========================================================================= */}
      {activeTab === 'tabla' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-black uppercase tracking-wider text-slate-900">
              Listado Tabular ({filteredInventories.length} registros)
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Haz clic en cualquier foto para abrirla ampliada
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50/50">
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Placa</th>
                  <th className="p-3">CD</th>
                  <th className="p-3">Inspector</th>
                  <th className="p-3 text-center">Carretillas</th>
                  <th className="p-3 text-center">Conos</th>
                  <th className="p-3">Estado Tacos</th>
                  <th className="p-3">Tacos</th>
                  <th className="p-3">Observación</th>
                  <th className="p-3">Fotografías</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredInventories.map((inv, idx) => {
                  const cd = cdDePlaca(inv.plate);
                  const photos = getVehiclePhotos(inv);
                  return (
                    <tr 
                      key={`${inv.plate}-${inv.fecha}-${idx}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="p-3 font-medium text-slate-600 whitespace-nowrap">
                        {formatDisplayDate(inv.fecha)}
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-black tracking-wider">
                          {inv.plate}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {cd}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{inv.inspector || '—'}</td>
                      <td className="p-3 text-center font-black text-emerald-700">{inv.carretillas}</td>
                      <td className="p-3 text-center font-black text-amber-700">{inv.conos}</td>
                      <td className="p-3 whitespace-nowrap">
                        {inv.estadoTacos ? (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {inv.estadoTacos}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-3 font-medium text-slate-700 whitespace-nowrap">
                        {inv.tacos || '—'}
                      </td>
                      <td className="p-3 max-w-xs truncate text-slate-700" title={inv.observacion || '—'}>
                        {inv.observacion ? (
                          <span className="text-slate-800 font-medium">
                            {inv.observacion}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                          {photos.map((p, pIdx) => (
                            <button
                              key={pIdx}
                              onClick={() => openLightboxAtPhoto(inv, p.url)}
                              className="relative group w-8 h-8 rounded-lg overflow-hidden border border-slate-200 hover:scale-125 transition-transform shrink-0 bg-slate-900"
                              title={`${p.label} (Clic para ampliar)`}
                            >
                              <img
                                src={getDriveDirectLink(p.url)}
                                alt={p.label}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          VISTA 3: NUEVO REGISTRO DE INVENTARIO DIARIO (FORMULARIO)
          ========================================================================= */}
      {activeTab === 'registro' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-5 sm:p-7 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Sparkles size={20} className="text-amber-500" />
                Nuevo Registro de Inventario
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Completa los datos y toma las fotografías directamente con tu dispositivo.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('galeria')}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancelar y volver
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* SECCIÓN 1: DATOS GENERALES */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-500" />
                  Fecha del Inventario *
                </label>
                <input
                  type="date"
                  required
                  value={fechaForm}
                  onChange={(e) => setFechaForm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

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
                    <option key={pl} value={pl}>
                      {pl} {vehicles.find(v => v.plate === pl)?.cd ? `(${vehicles.find(v => v.plate === pl)?.cd})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <User size={14} className="text-slate-500" />
                  Nombre del Inspector *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nombre del inspector"
                  value={inspector}
                  onChange={(e) => setInspector(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* SECCIÓN 2: 6 FOTOGRAFÍAS FIJAS */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Camera size={16} className="text-emerald-600" />
                  Fotografías Fijas del Vehículo y Estribos (Frontal, Laterales y Trasera obligatorias)
                </label>
                <span className="text-[11px] text-slate-600 font-medium">
                  Resolución ~1600px • Calidad 85%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
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

                <PhotoCard 
                  label="4. TRASERA *"
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

                <PhotoCard 
                  label="5. ESTRIBO IZQUIERDO"
                  photoUrl={fotoEstriboIzq}
                  onTakeClick={() => estriboIzqRef.current?.click()}
                  onRemove={() => setFotoEstriboIzq('')}
                />
                <input
                  ref={estriboIzqRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handlePhotoUpload(e, setFotoEstriboIzq)}
                  className="hidden"
                />

                <PhotoCard 
                  label="6. ESTRIBO DERECHO"
                  photoUrl={fotoEstriboDer}
                  onTakeClick={() => estriboDerRef.current?.click()}
                  onRemove={() => setFotoEstriboDer('')}
                />
                <input
                  ref={estriboDerRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handlePhotoUpload(e, setFotoEstriboDer)}
                  className="hidden"
                />
              </div>
            </div>

            {/* SECCIÓN 3: CONTEOS DE PATIO Y ESTADO TACOS */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Cantidad Carretillas *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={carretillas}
                  onChange={(e) => setCarretillas(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 font-black focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Cantidad Conos *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={conos}
                  onChange={(e) => setConos(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 font-black focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Estado Tacos
                </label>
                <input
                  type="text"
                  placeholder="Ej: BUENO, REGULAR..."
                  value={estadoTacos}
                  onChange={(e) => setEstadoTacos(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Tacos (ID / Registro)
                </label>
                <input
                  type="text"
                  placeholder="Código o número"
                  value={tacos}
                  onChange={(e) => setTacos(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* SECCIÓN 4: FOTOGRAFÍAS DE NOVEDADES */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                Fotografías de Novedades (Opcional - hasta 3 fotos de evidencia)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              </div>
            </div>

            {/* SECCIÓN 5: OBSERVACIONES */}
            <div className="pt-2">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Observación / Detalle de Novedades
              </label>
              <textarea
                rows={2}
                placeholder="Describe cualquier golpe, rayón, faltante de equipo o detalle relevante..."
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400"
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Enviando a Google Sheets...
                  </>
                ) : (
                  <>
                    <Upload size={18} className="text-emerald-300" />
                    Guardar Inventario
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          LIGHTBOX / VISOR DE FOTOS INTERACTIVO DENTRO DE LA APP
          ========================================================================= */}
      {lightbox && (
        <LightboxModal
          lightbox={lightbox}
          onClose={() => setLightbox(null)}
          onPrev={() => setLightbox(prev => prev ? {
            ...prev,
            currentIndex: (prev.currentIndex - 1 + prev.photos.length) % prev.photos.length
          } : null)}
          onNext={() => setLightbox(prev => prev ? {
            ...prev,
            currentIndex: (prev.currentIndex + 1) % prev.photos.length
          } : null)}
          onSelectIndex={(idx) => setLightbox(prev => prev ? { ...prev, currentIndex: idx } : null)}
        />
      )}
    </div>
  );
};

// =========================================================================
// TARJETA DE VEHÍCULO (Para la vista Galería por CD)
// =========================================================================
interface VehicleCardProps {
  inventory: VehicleInventory;
  cd: string;
  onOpenPhoto: (url: string) => void;
}

const VehicleCard: React.FC<VehicleCardProps> = ({ inventory, cd, onOpenPhoto }) => {
  const hasNovelties = Boolean(
    inventory.fotoNovedad1 || 
    inventory.fotoNovedad2 || 
    inventory.fotoNovedad3 || 
    (inventory.observacion && inventory.observacion.trim().length > 0)
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-4 sm:p-5 space-y-4">
      {/* Cabecera del vehículo */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-xl bg-slate-900 text-white text-xs font-black tracking-wider shadow-xs">
              {inventory.plate}
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-bold flex items-center gap-1">
              <MapPin size={11} className="text-emerald-600" />
              {cd}
            </span>
            {hasNovelties && (
              <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase">
                Con novedad
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            <span>📅 {formatDisplayDate(inventory.fecha)}</span>
            <span>•</span>
            <span>👤 <strong className="text-slate-700">{inventory.inspector || '—'}</strong></span>
          </p>
        </div>

        {/* Patio: Carretillas y Conos */}
        <div className="flex items-center gap-2 text-right">
          <div className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">Carretillas</span>
            <span className="text-xs font-black text-emerald-700">{inventory.carretillas}</span>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">Conos</span>
            <span className="text-xs font-black text-amber-700">{inventory.conos}</span>
          </div>
        </div>
      </div>

      {/* Tacos & Observación */}
      {(inventory.estadoTacos || inventory.tacos || inventory.observacion) && (
        <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-150 space-y-1.5 text-xs">
          {(inventory.estadoTacos || inventory.tacos) && (
            <div className="flex items-center gap-3 text-[11px]">
              <div>
                <span className="font-bold text-slate-500">Estado Tacos:</span>{' '}
                <span className="font-black text-slate-800">{inventory.estadoTacos || '—'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500">Tacos (ID):</span>{' '}
                <span className="font-bold text-slate-800">{inventory.tacos || '—'}</span>
              </div>
            </div>
          )}
          {inventory.observacion && (
            <div className="text-slate-700 font-medium">
              <span className="font-bold text-slate-600 uppercase text-[10px]">Observación:</span>{' '}
              {inventory.observacion}
            </div>
          )}
        </div>
      )}

      {/* Cuadrícula de fotos del vehículo */}
      <div>
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-2">
          Fotografías del Vehículo (clic para ampliar en visor)
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-2">
          <ThumbnailImage 
            title="Frontal" 
            url={inventory.fotoFrontal} 
            onClick={() => onOpenPhoto(inventory.fotoFrontal)} 
          />
          <ThumbnailImage 
            title="Lateral Izq." 
            url={inventory.fotoLateralIzq} 
            onClick={() => onOpenPhoto(inventory.fotoLateralIzq)} 
          />
          <ThumbnailImage 
            title="Lateral Der." 
            url={inventory.fotoLateralDer} 
            onClick={() => onOpenPhoto(inventory.fotoLateralDer)} 
          />
          <ThumbnailImage 
            title="Trasera" 
            url={inventory.fotoTrasera} 
            onClick={() => onOpenPhoto(inventory.fotoTrasera)} 
          />
          <ThumbnailImage 
            title="Estribo Izq." 
            url={inventory.fotoEstriboIzq} 
            onClick={() => onOpenPhoto(inventory.fotoEstriboIzq)} 
          />
          <ThumbnailImage 
            title="Estribo Der." 
            url={inventory.fotoEstriboDer} 
            onClick={() => onOpenPhoto(inventory.fotoEstriboDer)} 
          />

          {/* Fotos de Novedades si existen */}
          {inventory.fotoNovedad1 && (
            <ThumbnailImage 
              title="Novedad 1" 
              url={inventory.fotoNovedad1} 
              isNovelty 
              onClick={() => onOpenPhoto(inventory.fotoNovedad1)} 
            />
          )}
          {inventory.fotoNovedad2 && (
            <ThumbnailImage 
              title="Novedad 2" 
              url={inventory.fotoNovedad2} 
              isNovelty 
              onClick={() => onOpenPhoto(inventory.fotoNovedad2)} 
            />
          )}
          {inventory.fotoNovedad3 && (
            <ThumbnailImage 
              title="Novedad 3" 
              url={inventory.fotoNovedad3} 
              isNovelty 
              onClick={() => onOpenPhoto(inventory.fotoNovedad3)} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// MINIATURA DE FOTO CON MANEJO DE ERROR Y LINK DIRECTO DE DRIVE
// =========================================================================
interface ThumbnailImageProps {
  title: string;
  url: string;
  isNovelty?: boolean;
  onClick: () => void;
}

const ThumbnailImage: React.FC<ThumbnailImageProps> = ({ title, url, isNovelty, onClick }) => {
  const [hasError, setHasError] = useState(false);
  const directUrl = useMemo(() => getDriveDirectLink(url), [url]);

  if (!url || hasError) {
    return (
      <div className={`aspect-video rounded-xl border ${isNovelty ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-slate-100/70'} flex flex-col items-center justify-center p-2 text-center text-slate-400 select-none`}>
        <ImageIcon size={18} className="opacity-40 mb-1" />
        <span className="text-[9px] font-bold text-slate-500 truncate w-full">{title}</span>
        <span className="text-[8px] text-slate-400">{hasError ? 'No disponible' : 'Sin foto'}</span>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className={`group relative aspect-video rounded-xl overflow-hidden border cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] bg-slate-900 ${
        isNovelty ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-200 hover:border-slate-400'
      }`}
    >
      <img
        src={directUrl}
        alt={title}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setHasError(true)}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90 pointer-events-none" />
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white pointer-events-none">
        <Maximize2 size={16} className="drop-shadow" />
      </div>
      <div className="absolute bottom-1.5 inset-x-2 flex items-center justify-between text-white text-[9px] font-bold pointer-events-none">
        <span className="truncate drop-shadow">{title}</span>
        {isNovelty && (
          <span className="bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded shrink-0">
            Novedad
          </span>
        )}
      </div>
    </div>
  );
};

// =========================================================================
// LIGHTBOX / VISOR INTERACTIVO A PANTALLA COMPLETA
// =========================================================================
interface LightboxModalProps {
  lightbox: LightboxState;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSelectIndex: (idx: number) => void;
}

const LightboxModal: React.FC<LightboxModalProps> = ({ 
  lightbox, 
  onClose, 
  onPrev, 
  onNext, 
  onSelectIndex 
}) => {
  const currentPhoto = lightbox.photos[lightbox.currentIndex];
  const [imgError, setImgError] = useState(false);
  const directUrl = useMemo(() => {
    setImgError(false);
    return getDriveDirectLink(currentPhoto?.url || '');
  }, [currentPhoto]);

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col justify-between p-3 sm:p-6 text-white animate-fadeIn"
      onClick={onClose}
    >
      {/* Lightbox Header */}
      <div 
        className="flex items-center justify-between gap-3 border-b border-white/10 pb-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="px-3 py-1 rounded-lg bg-white text-slate-950 text-xs font-black tracking-wider shadow">
            {lightbox.vehicle.plate}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
            <MapPin size={12} />
            {lightbox.cd}
          </span>
          <span className="text-xs text-slate-300">
            📅 {formatDisplayDate(lightbox.vehicle.fecha)}
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            • 👤 {lightbox.vehicle.inspector || '—'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-white flex items-center gap-1.5 justify-end">
              {currentPhoto?.isNovelty && <span className="text-rose-400">⚠️</span>}
              {currentPhoto?.label}
            </p>
            <p className="text-[10px] text-slate-400">
              Foto {lightbox.currentIndex + 1} de {lightbox.photos.length}
            </p>
          </div>

          {currentPhoto?.url && (
            <a
              href={currentPhoto.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              title="Abrir enlace original en Drive"
            >
              <ExternalLink size={18} />
            </a>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-rose-600/80 text-white transition-colors"
            title="Cerrar visor (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Lightbox Body with Left/Right Arrows */}
      <div 
        className="relative flex-1 flex items-center justify-center p-2 sm:p-4 my-auto select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {lightbox.photos.length > 1 && (
          <button
            onClick={onPrev}
            className="absolute left-2 sm:left-4 z-10 p-3 sm:p-4 rounded-2xl bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all hover:scale-105 active:scale-95 shadow-xl cursor-pointer"
            title="Foto anterior (←)"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        <div className="max-w-5xl max-h-[72vh] flex flex-col items-center justify-center">
          {imgError ? (
            <div className="p-8 text-center bg-slate-900 rounded-2xl border border-white/10 max-w-md">
              <AlertCircle size={40} className="mx-auto text-amber-400 mb-2" />
              <p className="text-sm font-bold text-white">No se pudo cargar la vista previa directa</p>
              <p className="text-xs text-slate-400 mt-1">El archivo puede estar restringido en Drive.</p>
              {currentPhoto?.url && (
                <a
                  href={currentPhoto.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all"
                >
                  <ExternalLink size={14} />
                  Abrir directamente en Drive
                </a>
              )}
            </div>
          ) : (
            <img
              src={directUrl}
              alt={currentPhoto?.label}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="max-h-[72vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          )}
          <div className="sm:hidden text-center mt-2">
            <span className="text-xs font-bold text-white">{currentPhoto?.label}</span>
            <span className="text-[10px] text-slate-400 ml-2">({lightbox.currentIndex + 1} de {lightbox.photos.length})</span>
          </div>
        </div>

        {lightbox.photos.length > 1 && (
          <button
            onClick={onNext}
            className="absolute right-2 sm:right-4 z-10 p-3 sm:p-4 rounded-2xl bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all hover:scale-105 active:scale-95 shadow-xl cursor-pointer"
            title="Foto siguiente (→)"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>

      {/* Tira inferior de miniaturas para salto rápido */}
      <div 
        className="border-t border-white/10 pt-3 flex items-center justify-center gap-2 overflow-x-auto pb-1"
        onClick={(e) => e.stopPropagation()}
      >
        {lightbox.photos.map((p, idx) => {
          const isActive = idx === lightbox.currentIndex;
          const thumbUrl = getDriveDirectLink(p.url);
          return (
            <button
              key={`${p.label}-${idx}`}
              onClick={() => onSelectIndex(idx)}
              className={`relative rounded-lg overflow-hidden border-2 transition-all shrink-0 w-14 h-11 cursor-pointer ${
                isActive 
                  ? 'border-emerald-400 ring-2 ring-emerald-400/50 scale-105' 
                  : 'border-white/20 opacity-60 hover:opacity-100'
              }`}
              title={p.label}
            >
              <img
                src={thumbUrl}
                alt={p.label}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[7px] text-white truncate px-0.5 text-center font-bold">
                {p.label.replace('Foto ', '')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// =========================================================================
// TARJETA DE CAPTURA DE FOTO PARA EL FORMULARIO
// =========================================================================
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
