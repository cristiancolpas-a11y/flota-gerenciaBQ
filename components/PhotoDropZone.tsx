import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Camera, Image as ImageIcon } from 'lucide-react';

interface PhotoDropZoneProps {
  onFile: (file: File) => void;
  label?: string;
  className?: string;
  autoFocus?: boolean;
}

const PhotoDropZone: React.FC<PhotoDropZoneProps> = ({
  onFile,
  label = 'Arrastra, pega o haz clic para subir la foto',
  className = '',
  autoFocus = false
}) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus && containerRef.current) {
      containerRef.current.focus();
    }
  }, [autoFocus]);

  const handleFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (f && f.type.startsWith('image/')) {
      onFile(f);
    }
  };

  // Pegar con Ctrl+V en el contenedor enfocado
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const blob = items[i].getAsFile();
        if (blob) {
          // Convertir el blob del portapapeles en File con nombre descriptivo
          const file = new File([blob], `pegado-${Date.now()}.png`, { type: blob.type });
          onFile(file);
        }
        e.preventDefault();
        break;
      }
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onPaste={handlePaste}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 ${className}
        ${dragOver ? 'border-indigo-500 bg-indigo-50/80 scale-[1.01]' : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-slate-100/70'}`}
    >
      <div className="flex justify-center items-center gap-2 mb-2 text-indigo-600">
        <UploadCloud size={28} className={dragOver ? 'scale-110 transition-transform' : ''} />
      </div>
      <p className="text-xs font-bold text-slate-700">{label}</p>
      <p className="text-[10px] text-slate-400 mt-1 font-medium">Clic · Arrastrar · Ctrl+V para pegar foto</p>
      <div className="mt-3 flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[9px] font-bold text-slate-600 shadow-xs">
          <Camera size={12} className="text-indigo-600" /> Cámara
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[9px] font-bold text-slate-600 shadow-xs">
          <ImageIcon size={12} className="text-indigo-600" /> Galería
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
};

export default PhotoDropZone;
