
import React, { useState, useEffect } from 'react';
import { Driver } from '../types';
import { formatDate, getDriveDirectLink } from '../utils';
import { 
  CreditCard, 
  ShieldCheck, 
  Stethoscope, 
  Calendar, 
  Eye, 
  IdCard,
  UserCircle,
  Briefcase,
  Building2,
  Clock,
  History,
  FileBadge,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface DriverCardProps {
  driver: Driver;
  onViewDoc: (url: string | string[], title: string) => void;
}

const DriverCard: React.FC<DriverCardProps> = ({ driver, onViewDoc }) => {
  const [imageState, setImageState] = useState<'loading' | 'success' | 'error'>('loading');

  const docs = [
    { title: 'Licencia Conducción', doc: driver.license, icon: <CreditCard size={18} /> },
    { title: 'Manejo Defensivo', doc: driver.defensiveDriving, icon: <ShieldCheck size={18} /> },
    { title: 'Exámenes Médicos', doc: driver.medicalExam, icon: <Stethoscope size={18} /> }
  ];

  const directPhotoUrl = driver.photoUrl ? getDriveDirectLink(driver.photoUrl) : null;

  useEffect(() => {
    if (directPhotoUrl) setImageState('loading');
    else setImageState('error');
  }, [directPhotoUrl]);

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden transition-all hover:shadow-indigo-500/10 mb-8 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col lg:flex-row min-h-[400px]">
        
        {/* COLUMNA 1: PERFIL */}
        <div className="lg:w-[320px] bg-[#0f172a] p-8 flex flex-col items-center shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          
          <div className="relative z-10">
            <div className="w-40 h-40 rounded-[2.5rem] border-[8px] border-white/10 shadow-2xl overflow-hidden bg-slate-800 flex items-center justify-center relative group">
              {directPhotoUrl && imageState !== 'error' ? (
                <img 
                  src={directPhotoUrl} 
                  className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${imageState === 'success' ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setImageState('success')}
                  onError={() => setImageState('error')}
                />
              ) : (
                <UserCircle size={80} className="text-slate-600" />
              )}
              <div className="absolute bottom-3 right-3 bg-emerald-500 p-1.5 rounded-lg shadow-lg border-2 border-white">
                 <CheckCircle2 size={12} className="text-white" />
              </div>
            </div>
          </div>
          
          <div className="text-center mt-6 w-full z-10">
            <h2 className="text-xl font-black text-white uppercase tracking-tighter leading-tight mb-3 drop-shadow-md">
              {driver.name}
            </h2>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/20 text-indigo-400 rounded-xl text-[9px] font-black tracking-widest uppercase border border-indigo-500/30 backdrop-blur-sm">
              <IdCard size={14} /> CC {driver.identification}
            </div>
          </div>
        </div>

        {/* COLUMNA 2: INFORMACIÓN */}
        <div className="flex-grow p-8 bg-white flex flex-col">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-slate-100 pb-6">
              <div>
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-2 mb-1">
                   <History size={14} className="text-indigo-600" /> Expediente Laboral
                </h3>
                <p className="text-[10px] font-bold text-slate-500">Estado: {driver.status || 'Activo en Flota'}</p>
              </div>
              <div className="flex items-center gap-2">
                 <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-xl text-[8px] font-black uppercase tracking-widest border border-emerald-200 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    {driver.status || 'CONTRATO VIGENTE'}
                 </span>
              </div>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-10">
              {[
                { label: 'Centro Distribución', value: driver.cd || 'ARENOSA', icon: <Building2 className="text-indigo-500" /> },
                { label: 'Cargo', value: driver.position || 'CONDUCTOR', icon: <Briefcase size={16} className="text-indigo-500" /> },
                { label: 'Fecha Ingreso', value: formatDate(driver.hireDate), icon: <Calendar size={16} className="text-indigo-500" /> },
                { label: 'Identificación', value: driver.identification, icon: <IdCard size={16} className="text-indigo-500" /> },
                { label: 'Experiencia', value: driver.experienceTime || 'N/A', icon: <Clock size={16} className="text-indigo-500" /> },
                { label: 'Exp. Licencia', value: formatDate(driver.licenseIssueDate), icon: <FileBadge size={16} className="text-indigo-500" /> }
              ].map((item, i) => (
                <div key={i} className="group">
                   <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                      {React.cloneElement(item.icon as React.ReactElement, { size: 14 })} {item.label}
                   </p>
                   <p className="text-sm font-black text-slate-800 uppercase tracking-tight">
                      {item.value}
                   </p>
                </div>
              ))}
           </div>

           {/* DOCUMENTOS */}
           <div className="mt-auto grid grid-cols-1 md:grid-cols-3 gap-4">
              {docs.map((item, idx) => {
                const hasDate = !!item.doc.expiryDate;
                const status = hasDate ? item.doc.status : 'expired';
                
                const styles = {
                  active: { box: 'border-emerald-100 bg-emerald-50/20', badge: 'bg-emerald-600 text-white', label: 'VIGENTE', icon: 'text-emerald-600', btn: 'bg-white text-emerald-700 border-emerald-200' },
                  warning: { box: 'border-amber-100 bg-amber-50/20', badge: 'bg-amber-500 text-white', label: 'PRÓXIMO', icon: 'text-amber-600', btn: 'bg-white text-amber-700 border-amber-200' },
                  expired: { box: 'border-slate-100 bg-slate-50', badge: 'bg-slate-400 text-white', label: 'PENDIENTE', icon: 'text-slate-400', btn: 'bg-slate-100 text-slate-400' }
                };

                const s = styles[status === 'critical' ? 'warning' : status];

                return (
                  <div key={idx} className={`p-5 rounded-[1.8rem] border-2 transition-all hover:shadow-lg flex flex-col ${s.box}`}>
                     <div className="flex justify-between items-start mb-4">
                        <div className={`p-2.5 rounded-xl bg-white shadow-sm ${s.icon}`}>
                           {item.icon}
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-[8px] font-black tracking-widest uppercase ${s.badge}`}>
                           {s.label}
                        </span>
                     </div>
                     <h5 className="text-[10px] font-black text-slate-800 uppercase mb-0.5 tracking-tight">{item.title}</h5>
                     <p className="text-[9px] font-bold text-slate-500 mb-4">{hasDate ? formatDate(item.doc.expiryDate) : 'S/D'}</p>
                     
                     {item.doc.url ? (
                       <div className="space-y-2">
                         <div 
                           onClick={() => onViewDoc(item.doc.url!, `${driver.name} - ${item.title}`)}
                           className="aspect-video rounded-xl overflow-hidden bg-white border border-slate-100 cursor-pointer group/mini relative"
                         >
                           <img 
                             src={getDriveDirectLink(item.doc.url)} 
                             className="w-full h-full object-cover transition-transform group-hover/mini:scale-110" 
                             referrerPolicy="no-referrer" 
                           />
                           <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/mini:opacity-100 transition-opacity flex items-center justify-center">
                             <Eye size={16} className="text-white" />
                           </div>
                         </div>
                         <button 
                           onClick={() => onViewDoc(item.doc.url!, `${driver.name} - ${item.title}`)}
                           className={`w-full py-2.5 rounded-xl text-[9px] font-black transition-all uppercase tracking-widest border ${s.btn}`}
                         >
                           VER SOPORTE
                         </button>
                       </div>
                     ) : (
                       <div className="w-full py-2.5 rounded-xl text-[9px] font-black text-center uppercase tracking-widest bg-slate-100 text-slate-300">
                          PENDIENTE
                       </div>
                     )}
                  </div>
                );
              })}
           </div>
        </div>
      </div>
    </div>
  );
};

export default DriverCard;
