import React, { useState } from 'react';
import { ForkliftAuditDashboard } from './ForkliftAuditDashboard';
import { ForkliftClosureModule } from './ForkliftClosureModule';
import { ShieldCheck, CheckSquare } from 'lucide-react';

interface ForkliftStandardModuleProps {
  onRefreshParent?: () => void;
}

export const ForkliftStandardModule: React.FC<ForkliftStandardModuleProps> = ({ onRefreshParent }) => {
  const [tab, setTab] = useState<'auditoria' | 'cierre'>('auditoria');

  return (
    <div className="space-y-4">
      {/* Barra de Pestañas */}
      <div className="flex items-center gap-2 mb-4 bg-slate-900/60 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md w-fit shadow-xl">
        <button
          onClick={() => setTab('auditoria')}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-200 ${
            tab === 'auditoria'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ShieldCheck size={16} /> Auditoría
        </button>
        <button
          onClick={() => setTab('cierre')}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-200 ${
            tab === 'cierre'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <CheckSquare size={16} /> Cierre
        </button>
      </div>

      {/* Contenido de la pestaña activa */}
      {tab === 'auditoria' && <ForkliftAuditDashboard onRefreshParent={onRefreshParent} />}
      {tab === 'cierre' && <ForkliftClosureModule onRefreshParent={onRefreshParent} />}
    </div>
  );
};
