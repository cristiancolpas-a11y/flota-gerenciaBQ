
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Vehicle } from '../types';
import { processImageWithWatermark, compressImage, normalizeStr, getWeekNumber, createMosaic } from '../utils';
import { 
  X, 
  Droplets, 
  Camera, 
  Save, 
  Plus, 
  Trash2, 
  Loader2, 
  Sparkles, 
  MapPin, 
  Building2, 
  Image as ImageIcon, 
  Calendar,
  ClipboardPaste,
  Upload,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface WashFormProps {
  vehicles: Vehicle[];
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialPlate?: string;
}

const WashForm: React.FC<WashFormProps> = ({ vehicles, onClose, onSubmit, initialPlate }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isProcessingMap, setIsProcessingMap] = useState(false);
  const [isDraggingEvidence, setIsDraggingEvidence] = useState(false);
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

  // File input refs
  const evidenceGalleryInputRef = useRef<HTMLInputElement>(null);
  const evidenceCameraInputRef = useRef<HTMLInputElement>(null);
  const mapGalleryInputRef = useRef<HTMLInputElement>(null);
  const mapCameraInputRef = useRef<HTMLInputElement>(null);
  const mapZoneRef = useRef<HTMLDivElement>(null);

  const [filterCd, setFilterCd] = useState<string>(() => {
    if (initialPlate) {
      const v = vehicles.find(veh => veh.plate.toUpperCase().trim() === initialPlate.toUpperCase().trim());
      if (v?.cd) return v.cd.toUpperCase().trim();
    }
    return 'all';
  });
  const [plateSearch, setPlateSearch] = useState(initialPlate || '');
  const [photos, setPhotos] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    plate: initialPlate || '',
    date: new Date().toISOString().split('T')[0],
    workshop: 'VEHIPESA',
    mapUrl: '',
  });

  const availableCds = useMemo(() => {
    const unique = Array.from(new Set(vehicles.map(v => (v.cd || "GENERAL").toUpperCase().trim()).filter(Boolean)));
    return (unique as string[]).sort((a, b) => a.localeCompare(b));
  }, [vehicles]);

  const filteredVehiclesList = useMemo(() => {
    let list = [...vehicles].filter(v => {
      const vCd = (v.cd || "GENERAL").toUpperCase().trim();
      const matchCd = filterCd === 'all' || normalizeStr(vCd) === normalizeStr(filterCd);
      return matchCd;
    });

    if (plateSearch) {
      const search = plateSearch.toUpperCase().trim();
      list = list.filter(v => v.plate.includes(search));
    }

    const sorted = list.sort((a, b) => a.plate.localeCompare(b.plate));
    
    // Auto-select if only one result and not already selected
    if (sorted.length === 1 && formData.plate !== sorted[0].plate && plateSearch.length >= 3) {
      setFormData(prev => ({ ...prev, plate: sorted[0].plate }));
    }

    return sorted;
  }, [vehicles, filterCd, plateSearch, formData.plate]);

  const handleCdChange = (val: string) => {
    setFilterCd(val);
    setFormData(prev => ({ ...prev, plate: '' }));
  };

  // Helper for coordinates
  const getCoords = (): Promise<{lat: number, lng: number} | undefined> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(undefined);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(undefined),
        { timeout: 5000 }
      );
    });
  };

  // Helper: Process multiple image files / base64s with watermark for Evidence
  const processAndAddEvidenceFiles = async (files: File[]) => {
    if (!formData.plate) {
      alert("Por favor seleccione la placa antes de añadir evidencia fotográfica.");
      return;
    }

    const remainingSlots = 4 - photos.length;
    if (remainingSlots <= 0) {
      alert("Ya ha alcanzado el límite máximo de 4 fotos.");
      return;
    }

    setIsProcessingPhoto(true);
    const coords = await getCoords();
    const newPhotos: string[] = [];
    const filesToProcess = files.slice(0, remainingSlots);

    for (const file of filesToProcess) {
      try {
        const watermarked = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const res = await processImageWithWatermark(reader.result as string, `${formData.plate}`, coords, formData.date);
              resolve(res);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = () => reject(new Error('Error al leer el archivo'));
          reader.readAsDataURL(file);
        });
        newPhotos.push(watermarked);
      } catch (err) {
        console.error("Error processing evidence file:", err);
      }
    }

    if (newPhotos.length > 0) {
      setPhotos(prev => [...prev, ...newPhotos].slice(0, 4));
      showToastNotice(`Se agregaron ${newPhotos.length} foto(s) a la evidencia`);
    }
    setIsProcessingPhoto(false);
  };

  const processAndAddEvidenceBase64 = async (base64Array: string[]) => {
    if (!formData.plate) {
      alert("Por favor seleccione la placa antes de añadir evidencia fotográfica.");
      return;
    }

    const remainingSlots = 4 - photos.length;
    if (remainingSlots <= 0) {
      alert("Ya ha alcanzado el límite máximo de 4 fotos.");
      return;
    }

    setIsProcessingPhoto(true);
    const coords = await getCoords();
    const newPhotos: string[] = [];
    const itemsToProcess = base64Array.slice(0, remainingSlots);

    for (const base64 of itemsToProcess) {
      try {
        const watermarked = await processImageWithWatermark(base64, `${formData.plate}`, coords, formData.date);
        newPhotos.push(watermarked);
      } catch (err) {
        console.error("Error processing base64 evidence:", err);
      }
    }

    if (newPhotos.length > 0) {
      setPhotos(prev => [...prev, ...newPhotos].slice(0, 4));
      showToastNotice(`Se pegaron ${newPhotos.length} foto(s) en la evidencia`);
    }
    setIsProcessingPhoto(false);
  };

  // Helper: Process single image file for Map
  const processAndSetMapFile = async (file: File) => {
    setIsProcessingMap(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(reader.result as string, 1920);
          setFormData(prev => ({ ...prev, mapUrl: compressed }));
          showToastNotice("Mapa cargado exitosamente");
        } catch (e) {
          console.error("Error compressing map:", e);
        } finally {
          setIsProcessingMap(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Error processing map file:", err);
      setIsProcessingMap(false);
    }
  };

  const processAndSetMapBase64 = async (base64: string) => {
    setIsProcessingMap(true);
    try {
      const compressed = await compressImage(base64, 1920);
      setFormData(prev => ({ ...prev, mapUrl: compressed }));
      showToastNotice("Mapa pegado exitosamente");
    } catch (err) {
      console.error("Error processing map base64:", err);
    } finally {
      setIsProcessingMap(false);
    }
  };

  const showToastNotice = (msg: string) => {
    setPasteNotice(msg);
    setTimeout(() => setPasteNotice(null), 3000);
  };

  // -------------------- MAP HANDLERS --------------------

  const handleMapInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndSetMapFile(file);
    }
    e.target.value = '';
  };

  const handleMapDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingMap(true);
  };

  const handleMapDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingMap(false);
  };

  const handleMapDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingMap(false);

    const files = Array.from(e.dataTransfer.files) as File[];
    const imageExtensions = ['.heic', '.heif', '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.gif', '.bmp'];
    const file = files.find(f => {
      const typeStr = f.type ? f.type.toLowerCase() : '';
      const nameStr = f.name ? f.name.toLowerCase() : '';
      return typeStr.startsWith('image/') || imageExtensions.some(ext => nameStr.endsWith(ext));
    });

    if (file) {
      processAndSetMapFile(file);
    }
  };

  const handlePasteMapFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find(t => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const reader = new FileReader();
            reader.onload = () => {
              processAndSetMapBase64(reader.result as string);
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
      // Fallback: try readText in case it's a base64 or URL
      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith('data:image') || text.startsWith('http'))) {
        processAndSetMapBase64(text);
        return;
      }
      alert("No se encontró ninguna imagen en el portapapeles. Copie una imagen (o captura de pantalla) e intente de nuevo.");
    } catch (err) {
      alert("Para pegar desde el portapapeles, use también la tecla Ctrl+V (o Cmd+V).");
    }
  };

  // -------------------- EVIDENCE HANDLERS --------------------

  const handleEvidenceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processAndAddEvidenceFiles(Array.from(files));
    }
    e.target.value = '';
  };

  const handleEvidenceDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingEvidence(true);
  };

  const handleEvidenceDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingEvidence(false);
  };

  const handleEvidenceDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingEvidence(false);

    if (!formData.plate) {
      alert("Seleccione la placa antes de añadir evidencia.");
      return;
    }

    const imageExtensions = ['.heic', '.heif', '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.gif', '.bmp'];
    const files = (Array.from(e.dataTransfer.files) as File[]).filter(f => {
      const typeStr = f.type ? f.type.toLowerCase() : '';
      const nameStr = f.name ? f.name.toLowerCase() : '';
      return typeStr.startsWith('image/') || imageExtensions.some(ext => nameStr.endsWith(ext));
    });

    if (files.length > 0) {
      processAndAddEvidenceFiles(files);
    }
  };

  const handlePasteEvidenceFromClipboard = async () => {
    if (!formData.plate) {
      alert("Seleccione la placa antes de pegar evidencia.");
      return;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        const base64List: string[] = [];
        for (const item of items) {
          const imageType = item.types.find(t => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            base64List.push(base64);
          }
        }
        if (base64List.length > 0) {
          processAndAddEvidenceBase64(base64List);
          return;
        }
      }
      // Fallback: try readText
      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith('data:image') || text.startsWith('http'))) {
        processAndAddEvidenceBase64([text]);
        return;
      }
      alert("No se encontró ninguna imagen en el portapapeles. Copie una imagen o captura de pantalla e intente de nuevo.");
    } catch (err) {
      alert("Para pegar desde el portapapeles, use también la tecla Ctrl+V (o Cmd+V).");
    }
  };

  // -------------------- GLOBAL PASTE LISTENER --------------------
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;

      const imageItems = Array.from(items).filter(it => it.type.startsWith('image/'));
      if (imageItems.length === 0) return;

      // Determine target: if mouse hovered or focused on map zone, or if map is empty and only 1 photo
      const activeEl = document.activeElement;
      const isOverMap = mapZoneRef.current && (mapZoneRef.current.contains(activeEl) || mapZoneRef.current.matches(':hover'));

      if (isOverMap || (!formData.mapUrl && imageItems.length === 1 && photos.length >= 4)) {
        const file = imageItems[0].getAsFile();
        if (file) {
          e.preventDefault();
          processAndSetMapFile(file);
        }
      } else {
        if (!formData.plate) {
          alert("Seleccione la placa antes de pegar fotos de evidencia.");
          return;
        }
        e.preventDefault();
        const files: File[] = [];
        for (const it of imageItems) {
          const f = it.getAsFile();
          if (f) files.push(f);
        }
        if (files.length > 0) {
          processAndAddEvidenceFiles(files);
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [formData.plate, formData.mapUrl, photos.length, formData.date]);

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const removeMap = () => {
    setFormData(prev => ({ ...prev, mapUrl: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plate || photos.length === 0 || !formData.workshop) {
      alert("Por favor complete todos los campos obligatorios: Placa, Taller y Evidencia.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const dateObj = new Date(formData.date + "T12:00:00");
      const month = dateObj.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
      const week = getWeekNumber(dateObj).toString();

      const mosaicPhotos = [...photos];
      const mergedEvidence = await createMosaic(mosaicPhotos, `LAVADO: ${formData.plate} - ${formData.date}`);
      const selectedVehicle = vehicles.find(v => v.plate === formData.plate);

      const payload = {
        ...formData,
        id: `LAV-${Date.now()}`,
        month,
        week,
        evidenceUrl: mergedEvidence,
        cd: selectedVehicle?.cd || 'GENERAL',
        contractor: selectedVehicle?.contractor || 'GENERAL',
      };
      await onSubmit(payload);
      setIsSuccess(true);
      setTimeout(onClose, 1500);
    } catch (error) {
      alert("Error al registrar el lavado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[95] p-4">
        <div className="bg-white rounded-[3rem] p-12 flex flex-col items-center text-center max-w-sm border-4 border-[#16A34A] shadow-2xl animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-[#16A34A]/10 text-[#16A34A] rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 size={48} className="animate-bounce" />
          </div>
          <h2 className="text-3xl font-black text-[#111827] uppercase tracking-tighter leading-tight">¡LAVADO REGISTRADO!</h2>
          <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mt-2">Los datos y evidencias han sido guardados con éxito.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[90] p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] sm:rounded-[3rem] w-full max-w-xl shadow-2xl border-[4px] sm:border-[6px] border-[#0D2B4E] overflow-hidden animate-in zoom-in duration-300 my-auto">
        
        {/* Modal Header */}
        <div className="bg-[#0D2B4E] p-6 sm:p-8 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#3E5A78] rounded-2xl shadow-lg border border-white/10">
              <Droplets size={24} className="text-[#F2B705]" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">REGISTRO DE LAVADO</h2>
              <p className="text-[10px] text-[#F2B705] font-black uppercase tracking-widest">Control Operativo e Higiene Vehicular</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2.5 bg-white/10 hover:bg-[#DC2626] rounded-xl transition-all text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Floating Notification Toast */}
        {pasteNotice && (
          <div className="bg-[#16A34A] text-white px-4 py-2 text-center text-xs font-black uppercase tracking-wider animate-in fade-in slide-in-from-top-2 duration-200 flex items-center justify-center gap-2">
            <CheckCircle2 size={16} />
            <span>{pasteNotice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 bg-white max-h-[80vh] overflow-y-auto">
          
          {/* Filter by CD */}
          <div className="bg-[#F1F3F5] p-5 rounded-3xl border border-slate-200">
            <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest px-1 flex items-center gap-1.5 mb-2">
              <Building2 size={13} className="text-[#0D2B4E]" /> Filtrar por Centro de Distribución (C.D.)
            </label>
            <select 
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-xs font-black uppercase text-[#111827] outline-none focus:border-[#0D2B4E] transition-all shadow-sm" 
              value={filterCd} 
              onChange={(e) => handleCdChange(e.target.value)}
            >
              <option value="all">-- TODOS LOS CENTROS --</option>
              {availableCds.map(cd => <option key={cd} value={cd}>{cd}</option>)}
            </select>
          </div>

          {/* Vehicle Plate, Workshop, Date */}
          <div className="space-y-4">
            
            {/* Plate Selector */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-end px-2">
                <label className="text-[11px] font-black text-[#111827] uppercase tracking-wider">
                  Unidad Vehicular (Placa) <span className="text-[#DC2626]">*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="BUSCAR PLACA..." 
                  className="bg-[#F1F3F5] border border-slate-200 rounded-lg px-3 py-1 text-[10px] font-black uppercase text-[#111827] placeholder-[#6B7280] outline-none focus:border-[#0D2B4E] w-32 transition-all"
                  value={plateSearch}
                  onChange={(e) => setPlateSearch(e.target.value)}
                />
              </div>
              <select 
                required 
                className="w-full bg-[#F1F3F5] border border-slate-300 rounded-2xl px-5 py-3.5 text-sm font-black text-[#111827] outline-none focus:border-[#0D2B4E] transition-all"
                value={formData.plate} 
                onChange={e => setFormData({ ...formData, plate: e.target.value })}
              >
                <option value="">-- {filteredVehiclesList.length === 0 ? 'SIN RESULTADOS' : 'SELECCIONE PLACA'} --</option>
                {filteredVehiclesList.map(v => (
                  <option key={v.id} value={v.plate}>
                    {v.plate} {v.cd ? `(${v.cd})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Workshop & Date Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-[#111827] uppercase tracking-wider px-1">
                  Taller / Lugar <span className="text-[#DC2626]">*</span>
                </label>
                <input 
                  required 
                  type="text" 
                  placeholder="VEHIPESA" 
                  className="w-full bg-[#F1F3F5] border border-slate-300 rounded-2xl px-4 py-3 text-xs font-black text-[#111827] uppercase outline-none focus:border-[#0D2B4E]" 
                  value={formData.workshop} 
                  onChange={e => setFormData({ ...formData, workshop: e.target.value.toUpperCase() })} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-[#111827] uppercase tracking-wider px-1 flex items-center gap-1.5">
                  <Calendar size={13} className="text-[#0D2B4E]" /> Fecha <span className="text-[#DC2626]">*</span>
                </label>
                <input 
                  required 
                  type="date" 
                  className="w-full bg-[#F1F3F5] border border-slate-300 rounded-2xl px-4 py-3 text-xs font-black text-[#111827] outline-none focus:border-[#0D2B4E]" 
                  value={formData.date} 
                  onChange={e => setFormData({ ...formData, date: e.target.value })} 
                />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION: MAPA / UBICACIÓN (Copiar, Arrastrar, Galería, Archivos o Cámara) */}
          {/* ========================================================================= */}
          <div className="space-y-3 pt-2" ref={mapZoneRef}>
            <div className="flex items-center justify-between px-1">
              <label className="text-[11px] font-black text-[#0D2B4E] uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={16} className="text-[#0D2B4E]" /> 1. UBICACIÓN (MAPA GPS)
              </label>
              {formData.mapUrl && (
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20 flex items-center gap-1">
                  <CheckCircle2 size={11} /> Mapa Cargado
                </span>
              )}
            </div>

            {formData.mapUrl ? (
              /* Preview of uploaded Map */
              <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 bg-[#F1F3F5] p-2 flex flex-col sm:flex-row items-center gap-3">
                <img 
                  src={formData.mapUrl} 
                  alt="Mapa de ubicación" 
                  className="w-full sm:w-36 h-28 object-cover rounded-xl border border-slate-300 shadow-sm" 
                />
                <div className="flex-1 w-full space-y-2">
                  <p className="text-xs font-black text-[#111827] uppercase">Captura de ubicación lista</p>
                  <p className="text-[10px] font-bold text-[#6B7280]">La imagen del mapa se adjuntará al reporte del lavado.</p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => mapGalleryInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-[#0D2B4E] border border-slate-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm flex items-center gap-1"
                    >
                      <Upload size={12} /> Cambiar
                    </button>
                    <button
                      type="button"
                      onClick={removeMap}
                      className="px-3 py-1.5 bg-[#DC2626]/10 hover:bg-[#DC2626]/20 text-[#DC2626] border border-[#DC2626]/30 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Dropzone + Action Buttons for Map */
              <div 
                onDragOver={handleMapDragOver}
                onDragLeave={handleMapDragLeave}
                onDrop={handleMapDrop}
                className={`p-4 rounded-2xl border-2 border-dashed transition-all text-center relative ${
                  isDraggingMap 
                    ? 'bg-[#0D2B4E]/10 border-[#0D2B4E] scale-[1.01] shadow-md' 
                    : 'bg-[#F1F3F5] border-slate-300 hover:border-[#0D2B4E]'
                }`}
              >
                {isProcessingMap ? (
                  <div className="py-6 flex flex-col items-center justify-center gap-2 text-[#0D2B4E]">
                    <Loader2 size={28} className="animate-spin" />
                    <span className="text-xs font-black uppercase tracking-wider">Procesando mapa...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col items-center justify-center">
                      <div className="p-2.5 bg-white text-[#0D2B4E] rounded-full shadow-sm border border-slate-200 mb-1.5">
                        <ImageIcon size={22} />
                      </div>
                      <p className="text-xs font-black text-[#111827] uppercase tracking-tight">
                        Arrastra o pega aquí la imagen del mapa
                      </p>
                      <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mt-0.5">
                        O usa las opciones directas:
                      </p>
                    </div>

                    {/* Action buttons: Gallery, Camera, Paste */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {/* Subir archivo / Galería */}
                      <button
                        type="button"
                        onClick={() => mapGalleryInputRef.current?.click()}
                        className="p-2.5 bg-white hover:bg-slate-100 text-[#0D2B4E] border border-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider flex flex-col sm:flex-row items-center justify-center gap-1.5 shadow-sm transition-all hover:border-[#0D2B4E]"
                      >
                        <Upload size={14} className="text-[#0D2B4E]" />
                        <span>Galería</span>
                      </button>

                      {/* Tomar foto con cámara */}
                      <button
                        type="button"
                        onClick={() => mapCameraInputRef.current?.click()}
                        className="p-2.5 bg-white hover:bg-slate-100 text-[#0D2B4E] border border-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider flex flex-col sm:flex-row items-center justify-center gap-1.5 shadow-sm transition-all hover:border-[#0D2B4E]"
                      >
                        <Camera size={14} className="text-[#3E5A78]" />
                        <span>Cámara</span>
                      </button>

                      {/* Pegar de portapapeles */}
                      <button
                        type="button"
                        onClick={handlePasteMapFromClipboard}
                        className="p-2.5 bg-white hover:bg-slate-100 text-[#0D2B4E] border border-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider flex flex-col sm:flex-row items-center justify-center gap-1.5 shadow-sm transition-all hover:border-[#0D2B4E]"
                        title="Pegar imagen copiada (Ctrl+V)"
                      >
                        <ClipboardPaste size={14} className="text-[#F2B705]" />
                        <span>Pegar</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hidden Inputs for Map */}
            <input 
              type="file" 
              accept="image/*,image/heic,image/heif,image/jpeg,image/png,image/webp" 
              ref={mapGalleryInputRef} 
              className="hidden" 
              onChange={handleMapInputChange} 
            />
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              ref={mapCameraInputRef} 
              className="hidden" 
              onChange={handleMapInputChange} 
            />
          </div>

          {/* ============================================================================== */}
          {/* SECTION: EVIDENCIA FOTOGRÁFICA (Copiar, Arrastrar, Galería, Archivos o Cámara) */}
          {/* ============================================================================== */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-black text-[#0D2B4E] uppercase tracking-wider flex items-center gap-1.5">
                <Camera size={16} className="text-[#0D2B4E]" /> 2. EVIDENCIA FOTOGRÁFICA <span className="text-[#DC2626]">*</span>
              </span>
              <span className="text-[10px] font-black text-[#111827] bg-[#F1F3F5] border border-slate-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {photos.length} / 4 fotos
              </span>
            </div>

            {/* Control Bar: Subir Galería, Tomar Cámara, Pegar Portapapeles */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={!formData.plate || isProcessingPhoto || photos.length >= 4}
                onClick={() => evidenceGalleryInputRef.current?.click()}
                className="p-2.5 bg-white hover:bg-slate-100 disabled:opacity-40 text-[#0D2B4E] border border-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider flex flex-col sm:flex-row items-center justify-center gap-1.5 shadow-sm transition-all hover:border-[#0D2B4E]"
              >
                <Upload size={14} className="text-[#0D2B4E]" />
                <span>Subir Fotos</span>
              </button>

              <button
                type="button"
                disabled={!formData.plate || isProcessingPhoto || photos.length >= 4}
                onClick={() => evidenceCameraInputRef.current?.click()}
                className="p-2.5 bg-white hover:bg-slate-100 disabled:opacity-40 text-[#0D2B4E] border border-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider flex flex-col sm:flex-row items-center justify-center gap-1.5 shadow-sm transition-all hover:border-[#0D2B4E]"
              >
                <Camera size={14} className="text-[#3E5A78]" />
                <span>Tomar Foto</span>
              </button>

              <button
                type="button"
                disabled={!formData.plate || isProcessingPhoto || photos.length >= 4}
                onClick={handlePasteEvidenceFromClipboard}
                className="p-2.5 bg-white hover:bg-slate-100 disabled:opacity-40 text-[#0D2B4E] border border-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider flex flex-col sm:flex-row items-center justify-center gap-1.5 shadow-sm transition-all hover:border-[#0D2B4E]"
                title="Pegar imagen copiada del portapapeles (Ctrl+V)"
              >
                <ClipboardPaste size={14} className="text-[#F2B705]" />
                <span>Pegar</span>
              </button>
            </div>

            {/* Evidence Dropzone & Grid */}
            <div 
              className={`p-3 rounded-2xl border-2 border-dashed transition-all relative ${
                isDraggingEvidence 
                  ? 'bg-[#0D2B4E]/10 border-[#0D2B4E] scale-[1.01] shadow-md' 
                  : 'bg-[#F1F3F5] border-slate-300'
              }`}
              onDragOver={handleEvidenceDragOver}
              onDragLeave={handleEvidenceDragLeave}
              onDrop={handleEvidenceDrop}
            >
              {isProcessingPhoto && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-[2px] rounded-xl z-20 flex flex-col items-center justify-center gap-2 text-[#0D2B4E]">
                  <Loader2 size={32} className="animate-spin text-[#0D2B4E]" />
                  <span className="text-xs font-black uppercase tracking-wider">Estampando placa y fecha en la foto...</span>
                </div>
              )}

              {isDraggingEvidence && (
                <div className="absolute inset-0 bg-[#0D2B4E]/20 backdrop-blur-[2px] rounded-xl flex flex-col items-center justify-center pointer-events-none z-10">
                  <div className="bg-white p-3 rounded-full shadow-lg border border-slate-200 animate-bounce">
                    <Camera size={28} className="text-[#0D2B4E]" />
                  </div>
                  <span className="text-[11px] font-black uppercase text-[#0D2B4E] mt-2 tracking-widest bg-white px-3 py-1 rounded-full shadow-sm">
                    Suelte las fotos de evidencia aquí
                  </span>
                </div>
              )}

              {photos.length === 0 ? (
                <div 
                  onClick={() => {
                    if (formData.plate && photos.length < 4) {
                      evidenceGalleryInputRef.current?.click();
                    } else if (!formData.plate) {
                      alert("Seleccione la placa primero.");
                    }
                  }}
                  className="py-8 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center"
                >
                  <Camera size={28} className="text-[#6B7280]" />
                  <p className="text-xs font-black text-[#111827] uppercase">
                    {formData.plate ? 'Arrastra, pega (Ctrl+V) o haz clic para subir fotos' : 'Selecciona una placa para habilitar la subida'}
                  </p>
                  <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                    Se estampa automáticamente la placa, fecha y GPS en cada imagen
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {photos.map((p, idx) => (
                    <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border-2 border-slate-300 shadow-sm group">
                      <img src={p} alt={`Evidencia ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute top-1.5 left-1.5 bg-[#0D2B4E] text-white px-2 py-0.5 rounded text-[9px] font-mono font-black">
                        #{idx + 1}
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removePhoto(idx)} 
                        className="absolute top-1.5 right-1.5 p-1.5 bg-[#DC2626] text-white rounded-lg shadow-lg hover:scale-110 transition-transform"
                        title="Eliminar foto"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}

                  {photos.length < 4 && (
                    <button 
                      type="button" 
                      disabled={!formData.plate || isProcessingPhoto} 
                      onClick={() => evidenceGalleryInputRef.current?.click()} 
                      className="w-full aspect-video rounded-xl border-2 border-dashed border-slate-300 bg-white hover:border-[#0D2B4E] hover:bg-slate-50 flex flex-col items-center justify-center gap-1.5 text-[#6B7280] hover:text-[#0D2B4E] transition-all disabled:opacity-40 shadow-inner"
                    >
                      <Plus size={24} />
                      <span className="text-[9px] font-black uppercase tracking-wider">Añadir otra ({4 - photos.length} restante)</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Hidden Inputs for Evidence */}
            <input 
              type="file" 
              accept="image/*,image/heic,image/heif,image/jpeg,image/png,image/webp" 
              multiple 
              ref={evidenceGalleryInputRef} 
              className="hidden" 
              onChange={handleEvidenceInputChange} 
            />
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              ref={evidenceCameraInputRef} 
              className="hidden" 
              onChange={handleEvidenceInputChange} 
            />
          </div>

          {/* Validation summary banner */}
          {(!formData.plate || photos.length === 0) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-amber-800 text-[11px] font-bold">
              <AlertCircle size={16} className="shrink-0 text-amber-600" />
              <span>Para registrar: Selecciona la placa y añade al menos 1 foto de evidencia.</span>
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isSubmitting || isProcessingPhoto || isProcessingMap || photos.length === 0 || !formData.plate} 
            className="w-full py-4 sm:py-5 bg-[#0D2B4E] hover:bg-[#3E5A78] text-white font-black rounded-2xl text-xs sm:text-sm uppercase tracking-wider shadow-xl disabled:opacity-40 transition-all flex items-center justify-center gap-3"
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} className="text-[#F2B705]" />}
            <span>{isSubmitting ? 'REGISTRANDO LAVADO...' : 'REGISTRAR LAVADO'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default WashForm;

