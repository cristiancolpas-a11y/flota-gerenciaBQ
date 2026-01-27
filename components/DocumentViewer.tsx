
import React, { useState } from 'react';
import { X, ExternalLink, FileText, Info, Image as ImageIcon, Loader2 } from 'lucide-react';
import { getDriveDirectLink, isImageLink } from '../utils';

interface DocumentViewerProps {
  url: string;
  title: string;
  onClose: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ url, title, onClose }) => {
  const [loading, setLoading] = useState(true);
  const isBase64 = url.startsWith('data:image');
  const isGoogleDrive = url.includes('drive.google.com');
  const isImage = isImageLink(url);

  // Para imágenes de Drive, usamos el link 'uc'
  // Para otros archivos de Drive (PDFs), usamos el link de 'preview'
  const getFrameUrl = () => {
    if (!isGoogleDrive) return url;
    if (isImage) return getDriveDirectLink(url);
    // Convertir a link de vista previa de Drive si es un documento
    return url.replace(/\/view.*$/, '/preview').replace(/\/edit.*$/, '/preview');
  };

  const displayUrl = getFrameUrl();

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[60] p-0 md:p-6">
      <div className="bg-white w-full h-full md:max-w-5xl md:h-[90vh] md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300 border-[6px] border-white/20">
        
        {/* Header del Visor */}
        <div className="bg-[#0f172a] text-white p-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#4f46e5] rounded-2xl shadow-lg">
              {isImage ? <ImageIcon size={20} /> : <FileText size={20} />}
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tighter truncate max-w-[200px] md:max-w-md">{title}</h2>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                Soporte Digital Verificado
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isBase64 && (
              <a href={url} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all" title="Abrir en pestaña nueva">
                <ExternalLink size={20} />
              </a>
            )}
            <button onClick={onClose} className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Área de Visualización */}
        <div className="flex-grow bg-slate-50 relative flex items-center justify-center overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
              <Loader2 size={40} className="text-indigo-600 animate-spin mb-3" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargando Evidencia...</p>
            </div>
          )}

          {isImage ? (
            <div className="w-full h-full p-4 md:p-10 flex items-center justify-center">
              <img 
                src={displayUrl} 
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl bg-white border-8 border-white transition-opacity duration-500"
                alt={title}
                referrerPolicy="no-referrer"
                onLoad={() => setLoading(false)}
                onError={() => setLoading(false)}
              />
            </div>
          ) : (
            <iframe 
              src={displayUrl} 
              className="w-full h-full border-none bg-white" 
              title={title}
              onLoad={() => setLoading(false)}
            />
          )}
        </div>

        {/* Footer del Visor */}
        <div className="p-4 bg-white border-t flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          <Info size={14} className="text-indigo-500" />
          VISOR DE DOCUMENTACIÓN LEGAL - BQA
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
