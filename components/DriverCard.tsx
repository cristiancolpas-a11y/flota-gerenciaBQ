
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
  onViewDoc: (url: string, title: string) => void;
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
    <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden transition-all hover:shadow-indigo-500/10 mb-12 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col lg:flex-row min-h-[500px]">
        
        {/* COLUMNA 1: PERFIL - ALTO CONTRASTE (OSCURO) */}
        <div className="lg:w-[400px] bg-[#0f172a] p-12 flex flex-col items-center shrink-0 relative overflow-hidden">
          {/* Decoración de fondo */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          
          <div className="relative z-10">
            <div className="w-56 h-56 rounded-[3rem] border-[10px] border-white/10 shadow-2xl overflow-hidden bg-slate-800 flex items-center justify-center relative group">
              {directPhotoUrl && imageState !== 'error' ? (
                <img 
                  src={directPhotoUrl} 
                  className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${imageState === 'success' ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setImageState('success')}
                  onError={() => setImageState('error')}
                />
              ) : (
                <UserCircle size={120} className="text-slate-600" />
              )}
              
              {/* Overlay de estado en foto */}
              <div className="absolute bottom-4 right-4 bg-emerald-500 p-2 rounded-xl shadow-lg border-2 border-white">
                 <CheckCircle2 size={16} className="text-white" />
              </div>
            </div>
          </div>
          
          <div className="text-center mt-10 w-full z-10">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight mb-4 drop-shadow-md">
              {driver.name}
            </h2>
            <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-indigo-600/20 text-indigo-400 rounded-2xl text-xs font-black tracking-widest uppercase border border-indigo-500/30 backdrop-blur-sm">
              <IdCard size={16} /> CC {driver.identification}
            </div>
            
            <div className="mt-10 space-y-4">
               <div className="p-5 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md text-left transition-all hover:bg-white/10">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2">Cargo Registrado</p>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-500/40">
                      <Briefcase size={20}/>
                    </div>
                    <p className="text-lg font-black text-white uppercase tracking-tight">{driver.position || 'CONDUCTOR'}</p>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* COLUMNA 2: INFORMACIÓN Y DOCUMENTACIÓN (CLARO) */}
        <div className="flex-grow p-12 bg-white flex flex-col">
           {/* Header de la Hoja de Vida */}
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-slate-100 pb-8">
              <div>
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-3 mb-2">
                   <History size={18} className="text-indigo-600" /> Expediente Laboral
                </h3>
                <p className="text-xs font-bold text-slate-500">Última actualización: {new Date().toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                 <span className="px-5 py-2 bg-emerald-100 text-emerald-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-200 shadow-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    CONTRATO ACTIVO
                 </span>
              </div>
           </div>

           {/* Datos Principales */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
              {[
                { label: 'Centro de Distribución', value: driver.cd || 'ARENOSA', icon: <Building2 className="text-indigo-500" /> },
                { label: 'Contratista / Operación', value: driver.contractor || 'LOGISTICOS INT', icon: <UserCircle className="text-indigo-500" /> },
                { label: 'Fecha de Ingreso', value: formatDate(driver.hireDate), icon: <Calendar className="text-indigo-500" /> },
                { 
                  label: 'Antigüedad', 
                  value: driver.hireDate ? `${Math.floor((new Date().getTime() - new Date(driver.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365))} AÑOS` : '0 AÑOS', 
                  icon: <Clock className="text-indigo-500" />,
                  isHighlight: true 
                }
              ].map((item, i) => (
                <div key={i} className="group transition-all">
                   <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                      {item.icon} {item.label}
                   </p>
                   <p className={`text-xl font-black uppercase tracking-tight ${item.isHighlight ? 'text-indigo-600' : 'text-slate-800'}`}>
                      {item.value}
                   </p>
                   <div className="w-8 h-1 bg-slate-100 mt-3 group-hover:w-full group-hover:bg-indigo-500 transition-all duration-500"></div>
                </div>
              ))}
           </div>

           {/* SECCIÓN DOCUMENTOS PREMIUM */}
           <div className="mt-auto">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-[2px] flex-grow bg-slate-100"></div>
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.4em] flex items-center gap-3">
                   <FileBadge size={20} className="text-indigo-600" /> Soportes Digitales (PDF/IMG)
                </h4>
                <div className="h-[2px] flex-grow bg-slate-100"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {docs.map((item, idx) => {
                   const hasDate = !!item.doc.expiryDate;
                   const status = hasDate ? item.doc.status : 'expired';
                   
                   const styles = {
                     active: { 
                       box: 'border-emerald-100 bg-emerald-50/30', 
                       badge: 'bg-emerald-600 text-white', 
                       label: 'VIGENTE', 
                       icon: 'text-emerald-600',
                       btn: 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-600 hover:text-white'
                     },
                     warning: { 
                       box: 'border-amber-100 bg-amber-50/30', 
                       badge: 'bg-amber-500 text-white', 
                       label: 'PRONTO VENCER', 
                       icon: 'text-amber-600',
                       btn: 'bg-white text-amber-700 border-amber-200 hover:bg-amber-600 hover:text-white'
                     },
                     expired: { 
                       box: 'border-slate-100 bg-slate-50', 
                       badge: 'bg-slate-400 text-white', 
                       label: !hasDate ? 'SIN CARGAR' : 'VENCIDO', 
                       icon: 'text-slate-400',
                       btn: 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                     }
                   };

                   const s = styles[status];

                   return (
                     <div key={idx} className={`p-6 rounded-[2.5rem] border-2 transition-all hover:shadow-2xl hover:-translate-y-1 group ${s.box}`}>
                        <div className="flex justify-between items-start mb-6">
                           <div className={`p-4 rounded-2xl bg-white shadow-sm transition-transform group-hover:scale-110 ${s.icon}`}>
                              {item.icon}
                           </div>
                           <div className="flex flex-col items-end">
                              <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase shadow-sm ${s.badge}`}>
                                 {s.label}
                              </span>
                              {hasDate && (
                                <span className="text-[10px] font-black text-slate-400 mt-2 flex items-center gap-1">
                                   <Clock size={10}/> {item.doc.daysPending} DIAS
                                </span>
                              )}
                           </div>
                        </div>

                        <h5 className="text-[12px] font-black text-slate-800 uppercase mb-1 tracking-tight">{item.title}</h5>
                        <p className="text-[11px] font-bold text-slate-500 mb-6">{hasDate ? formatDate(item.doc.expiryDate) : 'Información pendiente'}</p>
                        
                        {item.doc.url ? (
                          <button 
                            onClick={() => onViewDoc(item.doc.url!, `${driver.name} - ${item.title}`)}
                            className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl text-[10px] font-black transition-all uppercase tracking-[0.15em] border shadow-sm ${s.btn}`}
                          >
                            <Eye size={16} /> VER DOCUMENTO
                          </button>
                        ) : (
                          <div className={`w-full py-3.5 rounded-2xl text-[10px] font-black text-center uppercase tracking-[0.15em] border ${s.btn}`}>
                             PENDIENTE DE CARGA
                          </div>
                        )}
                     </div>
                   );
                 })}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default DriverCard;
