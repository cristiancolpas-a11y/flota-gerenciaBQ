
import React from 'react';
import { Calibration } from '../types';
import { formatDate } from '../utils';
import { Settings2, Calendar, Eye, Clock, ShieldCheck, Scale, MapPin } from 'lucide-react';

interface CalibrationCardProps {
  calibration: Calibration;
  onViewDoc: (url: string, title: string) => void;
}

const CalibrationCard: React.FC<CalibrationCardProps> = ({ calibration, onViewDoc }) => {
  const styles = {
    active: {
      bg: 'bg-emerald-50/30',
      border: 'border-emerald-100',
      badge: 'bg-emerald-500 text-white',
      label: 'VIGENTE',
      icon: 'text-emerald-600'
    },
    warning: {
      bg: 'bg-amber-50/30',
      border: 'border-amber-100',
      badge: 'bg-amber-500 text-white',
      label: 'POR VENCER',
      icon: 'text-amber-600'
    },
    expired: {
      bg: 'bg-rose-50/30',
      border: 'border-rose-100',
      badge: 'bg-rose-500 text-white',
      label: 'VENCIDO',
      icon: 'text-rose-600'
    }
  };

  const hasExpiry = !!calibration.expiryDate;
  const s = styles[calibration.status];

  return (
    <div className={`p-8 rounded-[2.5rem] border-2 transition-all hover:shadow-2xl hover:-translate-y-1 bg-white group ${s.border}`}>
      <div className="flex justify-between items-start mb-8">
        <div className={`p-4 rounded-2xl bg-slate-50 shadow-sm transition-transform group-hover:rotate-6 ${s.icon}`}>
          <Scale size={24} />
        </div>
        <div className="flex flex-col items-end">
          <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase shadow-sm ${s.badge}`}>
            {s.label}
          </span>
          {hasExpiry && calibration.daysPending !== undefined && (
            <span className="text-[10px] font-black text-slate-400 mt-2 flex items-center gap-1.5">
              <Clock size={12} /> {calibration.daysPending} DÍAS RESTANTES
            </span>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter mb-2">{calibration.equipment}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-[#0f172a] text-white rounded-lg font-mono font-black text-[10px] tracking-tight shadow-sm">
              {calibration.plate}
            </span>
            {calibration.cd && (
              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-100 flex items-center gap-1">
                <MapPin size={10} /> {calibration.cd}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Últ. Calibración</span>
             <span className="text-[10px] font-black text-slate-700 leading-none">{formatDate(calibration.calibrationDate)}</span>
          </div>
          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vencimiento</span>
             <span className="text-[10px] font-black text-slate-700 leading-none">{hasExpiry ? formatDate(calibration.expiryDate) : 'S/D'}</span>
          </div>
        </div>

        {calibration.certificateUrl ? (
          <button 
            onClick={() => onViewDoc(calibration.certificateUrl!, `${calibration.plate} - ${calibration.equipment}`)}
            className="w-full flex items-center justify-center gap-3 py-4 bg-[#0f172a] text-white rounded-2xl text-[10px] font-black transition-all uppercase tracking-[0.2em] shadow-lg hover:bg-indigo-600 active:scale-95 group"
          >
            <Eye size={16} className="group-hover:scale-110 transition-transform" /> 
            VER CERTIFICADO
          </button>
        ) : (
          <div className="w-full py-4 bg-slate-100 text-slate-300 rounded-2xl text-[10px] font-black text-center uppercase tracking-[0.2em] border border-dashed border-slate-200">
            SIN CERTIFICADO ADJUNTO
          </div>
        )}
      </div>
    </div>
  );
};

export default CalibrationCard;
