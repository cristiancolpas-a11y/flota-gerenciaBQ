import React, { useState } from 'react';
import { WashReport } from '../types';
import { formatDate, getDriveDirectLink } from '../utils';
import { Droplets, Calendar, Hash, MapPin, Eye, Camera, X } from 'lucide-react';
import PhotoDropZone from './PhotoDropZone';

interface WashCardProps {
  report: WashReport;
  onViewDoc: (url: string | string[] | {url: string, label?: string}[], title: string) => void;
  onUploadEvidence?: (report: WashReport, file: File) => void;
}

export const washNeedsEvidence = (w: WashReport): boolean => {
  const ev = (w.evidenceUrl || '').toString().trim();
  return !ev || !ev.startsWith('http');
};

const WashCard: React.FC<WashCardProps> = ({ report, onViewDoc, onUploadEvidence }) => {
  const needsEvidence = washNeedsEvidence(report);
  const [showUploadModal, setShowUploadModal] = useState(false);

  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden group hover:shadow-2xl transition-all duration-500 relative">
      {/* Header with Plate */}
      <div className="bg-[#0f172a] p-6 flex items-center justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400">
            <Droplets size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white tracking-tighter">{report.plate}</h3>
            <div className="flex items-center gap-2 text-indigo-400/60 text-[8px] font-black uppercase tracking-widest">
              <Hash size={10} />
              <span>WASH-{report.id}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 relative z-10">
          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
            needsEvidence 
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
              : report.status === 'CERRADO' 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' 
                : 'bg-amber-500/20 text-amber-400 border-amber-500/20'
          }`}>
            {needsEvidence ? 'SIN EVIDENCIA' : (report.status === 'CERRADO' ? 'LIMPIEZA EXITOSA' : 'LIMPIEZA PENDIENTE')}
          </span>
          <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">SEMANA {report.week}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-6">
        {/* Date and Month */}
        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-3xl border border-slate-100">
          <div className="flex items-center gap-3 text-slate-600">
            <Calendar size={18} className="text-indigo-600" />
            <span className="text-[10px] font-black uppercase tracking-wide">{formatDate(report.date)}</span>
          </div>
          <span className="px-4 py-1.5 bg-white text-slate-400 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-slate-100 shadow-sm">
            {report.month}
          </span>
        </div>

        {/* Visual Support Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">SOPORTE VISUAL DE LIMPIEZA</h4>
            <div className="flex gap-2">
              {!needsEvidence && (
                <button 
                  onClick={() => onViewDoc(report.evidenceUrl, `Evidencia ${report.plate}`)}
                  className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2"
                >
                  <Eye size={14} /> <span className="text-[8px] font-black">VER FOTO</span>
                </button>
              )}
              {report.mapUrl && (
                <button 
                  onClick={() => onViewDoc(report.mapUrl, `Ubicación ${report.plate}`)}
                  className="p-2 bg-cyan-50 text-cyan-600 rounded-xl hover:bg-cyan-600 hover:text-white transition-all flex items-center gap-2"
                >
                  <MapPin size={14} /> <span className="text-[8px] font-black">MAPA</span>
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {/* Sub Grid: Map (Col G) and Evidence Preview / Upload button */}
            <div className="grid grid-cols-2 gap-3">
              {/* Map Column G */}
              {report.mapUrl ? (
                <div 
                  onClick={() => onViewDoc(report.mapUrl, `Ubicación GPS - ${report.plate}`)}
                  className="aspect-video rounded-2xl overflow-hidden bg-slate-50 border-2 border-slate-100 cursor-pointer relative group/mini shadow-sm"
                >
                  <img src={getDriveDirectLink(report.mapUrl)} className="w-full h-full object-cover transition-transform duration-500 group-hover/mini:scale-110" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/mini:opacity-100 transition-opacity flex items-center justify-center">
                    <MapPin size={20} className="text-white" />
                  </div>
                  <div className="absolute bottom-2 left-2">
                    <span className="px-2 py-1 bg-cyan-500 text-white text-[7px] font-black rounded-lg uppercase tracking-widest">MAPA GPS</span>
                  </div>
                </div>
              ) : (
                <div className="aspect-video rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-[9px] font-bold">
                  Sin mapa
                </div>
              )}
              
              {/* Evidence Column F (mini preview) OR Upload button */}
              {needsEvidence ? (
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="aspect-video rounded-2xl border-2 border-dashed border-rose-300 bg-rose-50/70 hover:bg-rose-100/90 cursor-pointer flex flex-col items-center justify-center gap-1.5 p-2 transition-all group/upload text-center shadow-xs"
                >
                  <span className="text-base group-hover/upload:scale-110 transition-transform">📷</span>
                  <span className="text-[8px] font-black text-rose-700 uppercase tracking-wider leading-tight">
                    Cargar Evidencia
                  </span>
                  <span className="text-[7px] text-rose-500 font-medium">
                    Clic · Arrastrar · Ctrl+V
                  </span>
                </button>
              ) : (
                <div 
                  onClick={() => onViewDoc(report.evidenceUrl, `Evidencia - ${report.plate}`)}
                  className="aspect-video rounded-2xl overflow-hidden bg-slate-50 border-2 border-slate-100 cursor-pointer relative group/mini shadow-sm"
                >
                  <img src={getDriveDirectLink(report.evidenceUrl)} className="w-full h-full object-cover transition-transform duration-500 group-hover/mini:scale-110" referrerPolicy="no-referrer" />
                  <div className="absolute bottom-2 left-2">
                    <span className="px-2 py-1 bg-indigo-500 text-white text-[7px] font-black rounded-lg uppercase tracking-widest">EVIDENCIA</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Workshop Info */}
        {report.workshop && (
          <div className="flex items-center gap-3 text-slate-400 pt-2 border-t border-slate-100">
            <MapPin size={14} />
            <span className="text-[9px] font-bold uppercase tracking-widest truncate">{report.workshop}</span>
          </div>
        )}
      </div>

      {/* Upload Evidence Modal with Drag & Drop + Paste */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                  <Camera size={20} />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 tracking-tight">Cargar Evidencia</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Placa: <span className="text-slate-800">{report.plate}</span> · Fecha: <span className="text-slate-800">{formatDate(report.date)}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <PhotoDropZone
              autoFocus
              label={`Cargar foto de evidencia para ${report.plate}`}
              onFile={(file) => {
                setShowUploadModal(false);
                if (onUploadEvidence) {
                  onUploadEvidence(report, file);
                }
              }}
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WashCard;
