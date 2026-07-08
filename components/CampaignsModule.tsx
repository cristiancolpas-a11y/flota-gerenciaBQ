import React, { useState, useEffect } from 'react';
import { Vehicle, Driver } from '../types';
import { 
  ChevronLeft, Sparkles, Link, ExternalLink, Settings, Check, X,
  Layers, Disc, Shield, Activity, Zap, AlertTriangle
} from 'lucide-react';
import { cn } from '../utils';

interface CampaignsModuleProps {
  onBack: () => void;
  vehicles: Vehicle[];
  drivers: Driver[];
}

interface CampaignCardInfo {
  id: string;
  name: string;
  sheetName: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  hoverColor: string;
  borderColor: string;
}

const DEFAULT_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1HZXNev6Wbek7YPX_47sx7KXfi6H4S15f1rc6rmQ18MY/edit?usp=sharing';

const CAMPAIGNS_LIST: CampaignCardInfo[] = [
  {
    id: 'esteras',
    name: 'ESTERAS Y CARPAS',
    sheetName: 'ESTERAS/CARPAS',
    subtitle: 'CAMPAÑA DE AJUSTE',
    description: 'Control de protección superior, lonas, carpas protectoras y sistemas de tensión de correas.',
    icon: Layers,
    color: 'from-blue-600/20 to-blue-500/5 text-blue-400',
    borderColor: 'border-blue-500/30 hover:border-blue-500/60',
    hoverColor: 'hover:border-blue-500/50 hover:bg-blue-950/20'
  },
  {
    id: 'llantas',
    name: 'RECAMBIO DE LLANTAS',
    sheetName: 'RECAMBIO DE LLANTAS',
    subtitle: 'CAMPAÑA DE NEUMÁTICOS',
    description: 'Seguimiento de profundidad de labrado, presiones y control de vida útil de llantas.',
    icon: Disc,
    color: 'from-violet-600/20 to-violet-500/5 text-violet-400',
    borderColor: 'border-violet-500/30 hover:border-violet-500/60',
    hoverColor: 'hover:border-violet-500/50 hover:bg-violet-950/20'
  },
  {
    id: 'estructuras',
    name: 'ESTRUCTURAS INTERNAS',
    sheetName: 'ESTRUCTURA',
    subtitle: 'CAMPAÑA DE SOLDADURAS',
    description: 'Inspección de soldaduras de vigas, seguros, cierres traseros y estado general de pisos de carga.',
    icon: Shield,
    color: 'from-indigo-600/20 to-indigo-500/5 text-indigo-400',
    borderColor: 'border-indigo-500/30 hover:border-indigo-500/60',
    hoverColor: 'hover:border-indigo-500/50 hover:bg-indigo-950/20'
  },
  {
    id: 'frenos',
    name: 'SISTEMA DE FRENOS',
    sheetName: 'FRENOS',
    subtitle: 'CAMPAÑA DE SEGURIDAD',
    description: 'Monitoreo de niveles de líquido de frenos, respuesta de pedal y desgaste de pastillas/zapatas.',
    icon: Activity,
    color: 'from-rose-600/20 to-rose-500/5 text-rose-400',
    borderColor: 'border-rose-500/30 hover:border-rose-500/60',
    hoverColor: 'hover:border-rose-500/50 hover:bg-rose-950/20'
  },
  {
    id: 'luces',
    name: 'SISTEMA DE LUCES',
    sheetName: 'LUCES',
    subtitle: 'CAMPAÑA DE ELECTRICIDAD',
    description: 'Auditoría de farolas delanteras, traseras, direccionales, luces estroboscópicas y alarmas.',
    icon: Zap,
    color: 'from-amber-600/20 to-amber-500/5 text-amber-400',
    borderColor: 'border-amber-500/30 hover:border-amber-500/60',
    hoverColor: 'hover:border-amber-500/50 hover:bg-amber-950/20'
  },
  {
    id: 'portaconos',
    name: 'SOPORTES PORTACONOS',
    sheetName: 'PORTACONOS',
    subtitle: 'CAMPAÑA DE SEÑALIZACIÓN',
    description: 'Verificación de soportes portaconos, pines de seguridad y dotación de cono vial.',
    icon: AlertTriangle,
    color: 'from-emerald-600/20 to-emerald-500/5 text-emerald-400',
    borderColor: 'border-emerald-500/30 hover:border-emerald-500/60',
    hoverColor: 'hover:border-emerald-500/50 hover:bg-emerald-950/20'
  }
];

export const CampaignsModule: React.FC<CampaignsModuleProps> = ({ onBack }) => {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempLink, setTempLink] = useState('');
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);

  // Load custom links from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('campaign_sheet_links');
    if (saved) {
      try {
        setLinks(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading campaign links:', e);
      }
    }
  }, []);

  const handleEditClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setEditingId(id);
    setTempLink(links[id] || '');
  };

  const handleSaveLink = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updatedLinks = { ...links, [id]: tempLink.trim() };
    setLinks(updatedLinks);
    localStorage.setItem('campaign_sheet_links', JSON.stringify(updatedLinks));
    setEditingId(null);
    setSaveSuccessId(id);
    setTimeout(() => setSaveSuccessId(null), 2000);
  };

  const handleCancelLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setTempLink('');
  };

  const handleCardClick = (id: string) => {
    if (editingId) return; // Ignore card click if editing link
    const url = links[id] || DEFAULT_SPREADSHEET_URL;
    window.open(url, '_blank');
  };

  return (
    <div className="flex-grow bg-[#050811] min-h-screen p-4 md:p-12 overflow-y-auto custom-scrollbar relative">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full filter blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full filter blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto space-y-12 relative z-10 pb-32">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-8">
          <div className="space-y-3">
            <div>
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all duration-300 active:scale-95"
              >
                <ChevronLeft size={14} /> Menú Principal
              </button>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter flex items-center gap-4 mt-2">
              <Sparkles className="text-violet-400 animate-pulse" size={40} /> CAMPAÑAS ESPECIALES
            </h1>
            <p className="text-slate-400 font-bold text-xs md:text-sm uppercase tracking-widest">
              SISTEMA DE ACCESO DIRECTO • CADA CAMPAÑA TIENE SU PROPIA HOJA
            </p>
          </div>

          <div className="bg-violet-600/10 border border-violet-500/20 p-4 rounded-2xl max-w-sm">
            <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-1">💡 ENLACES CONFIGURABLES</p>
            <p className="text-[9px] text-slate-400 leading-normal uppercase font-bold">
              Haz clic en cualquier tarjeta para abrir su hoja de cálculo correspondiente. Usa el botón de configuración para cambiar el enlace a cada pestaña específica.
            </p>
          </div>
        </div>

        {/* Campaign Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {CAMPAIGNS_LIST.map((camp) => {
            const hasLink = !!links[camp.id];
            const isEditing = editingId === camp.id;
            const isSaved = saveSuccessId === camp.id;
            const IconComponent = camp.icon;
            const targetUrl = links[camp.id] || DEFAULT_SPREADSHEET_URL;

            return (
              <div
                key={camp.id}
                onClick={() => handleCardClick(camp.id)}
                className={cn(
                  "group bg-white/[0.02] border p-8 rounded-[2.5rem] transition-all duration-500 flex flex-col justify-between shadow-2xl relative overflow-hidden cursor-pointer",
                  camp.borderColor,
                  camp.hoverColor,
                  "hover:-translate-y-2 hover:shadow-violet-500/5"
                )}
              >
                {/* Glowing subtle background */}
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-white/[0.02] rounded-full group-hover:scale-150 transition-all duration-700"></div>

                <div className="space-y-6">
                  {/* Top Row: Icon and Link Settings */}
                  <div className="flex justify-between items-start">
                    <div className={cn(
                      "w-16 h-16 bg-gradient-to-br rounded-2xl flex items-center justify-center border shadow-lg group-hover:scale-110 transition-transform duration-500",
                      camp.color
                    )}>
                      <IconComponent size={28} />
                    </div>

                    {/* Config Link Button */}
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={(e) => handleEditClick(e, camp.id)}
                        className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white rounded-xl transition-all"
                        title="Configurar Enlace de Hoja"
                      >
                        <Settings size={16} />
                      </button>
                    )}
                  </div>

                  {/* Campaign Titles */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-violet-400 tracking-widest uppercase block">
                      {camp.subtitle}
                    </span>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none group-hover:text-violet-400 transition-colors">
                      {camp.name}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider leading-relaxed">
                    {camp.description}
                  </p>
                </div>

                {/* Link Configurator / Action Button */}
                <div 
                  className="mt-8 pt-6 border-t border-white/5 space-y-4"
                  onClick={(e) => e.stopPropagation()} // Prevent clicking inner elements from triggering card click
                >
                  {isEditing ? (
                    <div className="space-y-3 animate-in fade-in duration-300">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                        Pegar Enlace de Google Sheets:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={tempLink}
                          onChange={(e) => setTempLink(e.target.value)}
                          placeholder="https://docs.google.com/spreadsheets/..."
                          className="flex-grow bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                        />
                        <button
                          type="button"
                          onClick={(e) => handleSaveLink(e, camp.id)}
                          className="p-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-all font-black uppercase text-[10px] tracking-widest flex items-center gap-1 shrink-0"
                        >
                          <Check size={14} /> OK
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelLink}
                          className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all border border-white/10 shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => handleCardClick(camp.id)}
                        className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-black text-[10px] uppercase tracking-widest py-3 px-4 rounded-xl shadow-lg shadow-violet-600/20 hover:shadow-violet-600/30 transition-all duration-300"
                      >
                        Abrir Campaña <ExternalLink size={12} />
                      </button>
                      
                      {/* Link status indicator */}
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest text-center mt-1">
                        {hasLink ? "Enlace Personalizado Configurado" : "Usando Enlace de Plantilla General"}
                      </p>
                    </div>
                  )}

                  {/* Micro Feedback Message */}
                  {isSaved && (
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1 animate-in fade-in duration-300">
                      <Check size={10} /> ¡Enlace guardado correctamente!
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
