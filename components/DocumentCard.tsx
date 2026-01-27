
import React from 'react';
import { VehicleDocument } from '../types';
import { calculateStatus, formatDate } from '../utils';
import { Calendar, Clock, Eye, ShieldCheck } from 'lucide-react';

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
      badge: 'bg-emerald-500 text-white',
      iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-indigo-200',
      label: 'VIGENTE',
      btn: 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200'
    },
    warning: {
      bg: 'bg-amber-50/20',
      border: 'border-amber-200',
      badge: 'bg-amber-500 text-white',
      iconBg: 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-200',
      label: 'POR VENCER',
      btn: 'bg-amber-600 text-white hover:bg-amber-700 hover:shadow-amber-200'
    },
    expired: {
      bg: 'bg-slate-50/50',
      border: 'border-slate-200',
      badge: 'bg-slate-400 text-white',
      iconBg: 'bg-gradient-to-br from-slate-400 to-slate-500 text-white shadow-slate-100',
      label: !hasDate ? 'SIN REGISTRO' : 'VENCIDO',
      btn: 'bg-slate-200 text-slate-400 cursor-not-allowed'
    }
  };

  const currentStyle = styles[status];

  return (
    <div className={`group relative p-6 rounded-[2.5rem] border-2 transition-all duration-500 hover:shadow-2xl flex flex-col h-full ${currentStyle.bg} ${currentStyle.border}`}>
      
      {/* Badge de Días Flotante */}
      {hasDate && doc.daysPending !== undefined && (
        <div className={`absolute -top-3 right-8 px-4 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-lg border-2 border-white transition-transform group-hover:scale-110 z-10 ${doc.daysPending < 30 ? 'bg-rose-500 text-white' : 'bg-white text-slate-500 border-slate-100'}`}>
           <Clock size={12} /> {doc.daysPending} DÍAS
        </div>
      )}

      <div className="flex justify-between items-start mb-8">
        <div className={`p-4 rounded-2xl transition-all duration-500 shadow-xl group-hover:rotate-6 ${currentStyle.iconBg}`}>
          {React.cloneElement(icon as React.ReactElement, { size: 24 })}
        </div>
        <span className={`px-3 py-1 rounded-lg text-[8px] font-black tracking-[0.15em] uppercase shadow-sm ${currentStyle.badge}`}>
          {currentStyle.label}
        </span>
      </div>
      
      <div className="flex-grow space-y-4">
        <h3 className="font-black text-slate-800 text-[13px] uppercase tracking-widest leading-none border-l-4 border-indigo-500 pl-3">
          {title}
        </h3>
        
        <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50">
          <div className="flex items-center gap-3">
            <Calendar size={14} className="text-slate-400" />
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Vencimiento</span>
              <span className={`text-[11px] font-black tracking-tight ${hasDate ? 'text-slate-700' : 'text-rose-400 italic'}`}>
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
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[9px] font-black transition-all uppercase tracking-[0.2em] shadow-lg ${currentStyle.btn}`}
          >
            <Eye size={16} /> VER SOPORTE
          </button>
        ) : (
          <div className="w-full py-3.5 bg-slate-100/50 text-slate-300 rounded-2xl text-[9px] font-black text-center uppercase tracking-[0.2em] border border-dashed border-slate-200">
            NO ADJUNTO
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentCard;
