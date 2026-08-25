import React, { useMemo } from 'react';
import { Calibration } from '../types';
import { normalizePlate } from '../utils';
import { ChevronLeft, ChevronRight, Disc, CheckCircle2, AlertCircle } from 'lucide-react';

interface CalibrationCalendarProps {
  calibrations: Calibration[];
  selectedMonth: string;
  selectedYear: number;
  onMonthChange: (month: string) => void;
  onYearChange: (year: number) => void;
  onViewDoc: (url: string, title: string) => void;
  onUpdateEvidence: (calibration: Calibration) => void;
  searchTerm?: string;
}

const MONTHS = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

const CalibrationCalendar: React.FC<CalibrationCalendarProps> = ({
  calibrations,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  onViewDoc,
  onUpdateEvidence,
  searchTerm = ''
}) => {
  const currentMonthIndex = MONTHS.indexOf(selectedMonth);

  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      onMonthChange(MONTHS[11]);
      onYearChange(selectedYear - 1);
    } else {
      onMonthChange(MONTHS[currentMonthIndex - 1]);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      onMonthChange(MONTHS[0]);
      onYearChange(selectedYear + 1);
    } else {
      onMonthChange(MONTHS[currentMonthIndex + 1]);
    }
  };

  const calendarDays = useMemo(() => {
    if (currentMonthIndex === -1) return [];
    const firstDay = new Date(selectedYear, currentMonthIndex, 1).getDay();
    const daysInMonth = new Date(selectedYear, currentMonthIndex + 1, 0).getDate();
    
    // Convert Sunday=0 to Monday=0 format
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    
    const days = [];
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }, [selectedYear, currentMonthIndex]);

  const getCalibrationsForDay = (day: number) => {
    const targetDateStr = `${selectedYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calibrations.filter(c => {
      const matchSearch = !searchTerm || normalizePlate(c.plate).includes(normalizePlate(searchTerm));
      return c.calibrationDate === targetDateStr && matchSearch;
    });
  };

  const calibrationsWithoutExactDay = useMemo(() => {
    return calibrations.filter(c => {
      const matchSearch = !searchTerm || normalizePlate(c.plate).includes(normalizePlate(searchTerm));
      if (!matchSearch) return false;
      if (!c.calibrationDate) return c.month === selectedMonth;
      const d = new Date(c.calibrationDate + 'T12:00:00');
      return isNaN(d.getTime()) && c.month === selectedMonth;
    });
  }, [calibrations, selectedMonth, searchTerm]);

  return (
    <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden">
      {/* Calendar Header */}
      <div className="bg-[#0f172a] p-8 flex items-center justify-between text-white">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-lg shadow-indigo-900/20">
            <Disc size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">{selectedMonth} {selectedYear}</h3>
            <p className="text-[10px] text-indigo-300 font-black uppercase tracking-[0.2em] mt-1">
              Cronograma de Calibraciones ({calibrations.length} registros)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handlePrevMonth} className="p-3 hover:bg-white/10 rounded-2xl transition-all active:scale-90">
            <ChevronLeft size={28} />
          </button>
          <button onClick={handleNextMonth} className="p-3 hover:bg-white/10 rounded-2xl transition-all active:scale-90">
            <ChevronRight size={28} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="p-8">
        <div className="grid grid-cols-7 gap-4 mb-4">
          {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map(d => (
            <div key={d} className="text-center font-black text-xs text-slate-400 uppercase tracking-widest py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-4">
          {calendarDays.map((day, idx) => (
            <div 
              key={idx} 
              className={`min-h-[140px] rounded-[2rem] border-2 p-3 transition-all ${day ? 'bg-white border-slate-50 shadow-sm' : 'bg-slate-50/30 border-transparent'}`}
            >
              {day && (
                <>
                  <span className="text-sm font-black text-slate-300 mb-3 block ml-1">{day}</span>
                  <div className="space-y-2">
                    {getCalibrationsForDay(day).map(cal => (
                      <div 
                        key={cal.id}
                        onClick={() => {
                          if (cal.certificateUrl) {
                            onViewDoc(cal.certificateUrl, `Certificado Calibración - ${cal.plate}`);
                          } else {
                            onUpdateEvidence(cal);
                          }
                        }}
                        className={`group px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight cursor-pointer transition-all hover:scale-[1.03] active:scale-95 flex items-center justify-between gap-2 ${cal.estado === 'COMPLETADO' ? 'bg-emerald-500 text-white border border-emerald-600 shadow-sm' : 'bg-rose-500 text-white border border-rose-600 shadow-sm'}`}
                      >
                        <span className="truncate font-mono">{cal.plate}</span>
                        <div className="shrink-0">
                          {cal.estado === 'COMPLETADO' ? (
                            <CheckCircle2 size={12} className="text-white" />
                          ) : (
                            <AlertCircle size={12} className="text-white animate-pulse" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Calibrations Without Specific Day */}
      {calibrationsWithoutExactDay.length > 0 && (
        <div className="p-8 bg-slate-50 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest">Registros de {selectedMonth} sin fecha exacta ({calibrationsWithoutExactDay.length})</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {calibrationsWithoutExactDay.map(cal => (
              <div 
                key={cal.id}
                onClick={() => {
                  if (cal.certificateUrl) {
                    onViewDoc(cal.certificateUrl, `Certificado Calibración - ${cal.plate}`);
                  } else {
                    onUpdateEvidence(cal);
                  }
                }}
                className={`group px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-tight cursor-pointer transition-all hover:scale-[1.03] active:scale-95 flex items-center justify-between gap-3 ${cal.estado === 'COMPLETADO' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'}`}
              >
                <span className="truncate font-mono">{cal.plate}</span>
                {cal.estado === 'COMPLETADO' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} className="animate-pulse" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalibrationCalendar;
