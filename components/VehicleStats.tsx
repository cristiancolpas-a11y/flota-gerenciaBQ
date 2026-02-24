import React from 'react';
import { Truck, Shield, Wrench, CreditCard, Flame } from 'lucide-react';

interface VehicleStatsProps {
  total: number;
  soatWarning: number;
  rtmWarning: number;
  plcWarning: number;
  extWarning: number;
}

const VehicleStats: React.FC<VehicleStatsProps> = ({ total, soatWarning, rtmWarning, plcWarning, extWarning }) => {
  return (
    <div className="flex flex-col lg:flex-row items-stretch gap-4 mb-8">
      {/* Total Flota Card */}
      <div className="bg-indigo-600 rounded-[2rem] p-6 flex flex-col items-center justify-center text-white shadow-2xl shadow-indigo-600/30 min-w-[200px] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-colors"></div>
        <Truck size={28} className="mb-3 opacity-60" />
        <p className="text-[9px] font-black uppercase tracking-[0.4em] mb-1 opacity-80">TOTAL FLOTA</p>
        <p className="text-4xl font-black tracking-tighter leading-none">{total}</p>
      </div>

      {/* Warning Cards Grid */}
      <div className="flex-grow grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center group hover:shadow-xl transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-rose-50 rounded-full blur-2xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <Shield size={20} className="text-rose-500 mb-2 group-hover:scale-110 transition-transform relative z-10" />
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">VENCE SOAT</p>
          <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none relative z-10">{soatWarning}</p>
        </div>

        <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center group hover:shadow-xl transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-50 rounded-full blur-2xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <Wrench size={20} className="text-amber-500 mb-2 group-hover:scale-110 transition-transform relative z-10" />
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">VENCE RTM</p>
          <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none relative z-10">{rtmWarning}</p>
        </div>

        <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center group hover:shadow-xl transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-full blur-2xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <CreditCard size={20} className="text-indigo-500 mb-2 group-hover:scale-110 transition-transform relative z-10" />
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">VENCE PLC</p>
          <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none relative z-10">{plcWarning}</p>
        </div>

        <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center group hover:shadow-xl transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-50 rounded-full blur-2xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <Flame size={20} className="text-orange-500 mb-2 group-hover:scale-110 transition-transform relative z-10" />
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">VENCE EXT</p>
          <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none relative z-10">{extWarning}</p>
        </div>
      </div>
    </div>
  );
};

export default VehicleStats;
