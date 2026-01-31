import React from 'react';
import { VehicleDocument } from '../types';
import { calculateStatus, formatDate } from '../utils';
import { Calendar, Clock, Eye, ShieldCheck, Info } from 'lucide-react';

interface DocumentCardProps {
  title: string;
  doc: VehicleDocument;
  icon: React.ReactNode;
  onViewDoc?: (url: string, title: string) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ title, doc, icon, onViewDoc }) => {
  const hasDate = !!doc.expiryDate;
  const status = hasDate ? calculateStatus(doc.expiryDate) : 'expired';
  
  const styles = {
    active: {
      bg: 'bg-white',
      border: 'border-slate-100',
      badge: 'bg-[#10b981] text-white',
      iconBg: 'bg-gradient-to-br from-[#4f46e5] to-[#6366f1] text-white shadow-[#6366f1]/20',
      label: 'VIGENTE',
      dateColor: 'text-slate-700',
      btn: 'bg-[#4f46e5] text-white hover:bg-[#4338ca] shadow-lg shadow-indigo-100'
    },
    warning: {
      bg: 'bg-amber-50/10',
      border: 'border-amber-100',
      badge: 'bg-amber-500 text-white',
      iconBg: 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-200',
      label: 'POR VENCER',
      dateColor: 'text-amber-700',
      btn: 'bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-100'
    },
    expired: {
      bg: 'bg-white',
      border: 'border-slate-200',
      badge: 'bg-[#94a3b8] text-white',
      iconBg: 'bg-gradient-to-br from-slate-400 to-slate-500 text-white shadow-slate-100',
      label: !hasDate ? 'SIN REGISTRO' : 'VENCIDO',
      dateColor: 'text-rose-500 font-black',
      btn: 'bg-slate-100 text-slate-400 cursor-not-allowed'
    }
  };

  const currentStyle = styles[status];

  return (
    <div className={`relative p-7 rounded-[3rem] border transition-all duration-500 hover:shadow-2xl flex flex-col h-full bg-white ${currentStyle.border}`}>
      
      {/* Burbuja de Días Flotante (Exacta a la imagen) */}
      {hasDate && doc.daysPending !== undefined && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-10 px-4 py-1.5 bg-white rounded-full text-[10px] font-black text-slate-500 flex items-center gap-2 shadow-xl border border-slate-50 z-20">
           <Clock size={14} className="text-slate-400" /> {doc.daysPending} DÍAS
        </div>
      )}

      <div className="flex justify-between items-start mb-8">
        <div className={`p-4 rounded-2xl transition-all duration-500 shadow-xl ${currentStyle.iconBg}`}>
          {/* Fix: casting to any to allow size prop on cloned element */}
          {React.cloneElement(icon as React.ReactElement<any>, { size: 24 })}
        </div>
        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase shadow-sm ${currentStyle.badge}`}>
          {currentStyle.label}
        </span>
      </div>
      
      <div className="flex-grow space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 bg-[#4f46e5] rounded-full"></div>
          <h3 className="font-black text-slate-900 text-[13px] uppercase tracking-widest leading-none">
            {title}
          </h3>
        </div>
        
        <div className="bg-[#f8fafc] rounded-3xl p-6 border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Calendar size={16} className="text-slate-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Vencimiento</span>
              <span className={`text-[11px] font-black tracking-tight ${currentStyle.dateColor}`}>
                {hasDate ? formatDate(doc.expiryDate) : 'PENDIENTE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        {doc.url ? (
          <button 
            onClick={() => onViewDoc?.(doc.url!, title)}
            className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-[9px] font-black transition-all uppercase tracking-[0.2em] ${currentStyle.btn}`}
          >
            <Eye size={18} /> VER SOPORTE
          </button>
        ) : (
          <div className="w-full py-4 bg-slate-50 text-slate-300 rounded-2xl text-[9px] font-black text-center uppercase tracking-[0.2em] border-2 border-dashed border-slate-200">
            NO ADJUNTO
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentCard;