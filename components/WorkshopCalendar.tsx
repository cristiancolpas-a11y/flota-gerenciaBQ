
import React, { useMemo } from 'react';
import { Report } from '../types';
import { normalizePlate } from '../utils';
import { ChevronLeft, ChevronRight, Store, CheckCircle2, Clock } from 'lucide-react';

interface WorkshopCalendarProps {
  visits: Report[];
  selectedMonth: string;
  selectedYear: number;
  onMonthChange: (month: string) => void;
  onYearChange: (year: number) => void;
  onViewDoc: (url: string, title: string) => void;
  onManageClosure: (visit: Report) => void;
  searchTerm: string;
}

const WorkshopCalendar: React.FC<WorkshopCalendarProps> = ({ 
  visits, 
  selectedMonth, 
  selectedYear, 
  onMonthChange, 
  onYearChange,
  onViewDoc,
  onManageClosure,
  searchTerm
}) => {
  const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  
  const monthIndex = months.indexOf(selectedMonth);
  
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, monthIndex + 1, 0).getDate();
  }, [selectedYear, monthIndex]);

  const firstDayOfMonth = useMemo(() => {
    return new Date(selectedYear, monthIndex, 1).getDay();
  }, [selectedYear, monthIndex]);

  const calendarDays = useMemo(() => {
    const days = [];
    // Previous month padding
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }, [daysInMonth, firstDayOfMonth]);

  const getVisitsForDay = (day: number) => {
    const dateStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return visits.filter(v => v.date === dateStr && normalizePlate(v.plate).includes(normalizePlate(searchTerm)));
  };

  const handlePrevMonth = () => {
    if (monthIndex === 0) {
      onMonthChange(months[11]);
      onYearChange(selectedYear - 1);
    } else {
      onMonthChange(months[monthIndex - 1]);
    }
  };

  const handleNextMonth = () => {
    if (monthIndex === 11) {
      onMonthChange(months[0]);
      onYearChange(selectedYear + 1);
    } else {
      onMonthChange(months[monthIndex + 1]);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
      {/* Calendar Header */}
      <div className="bg-[#0f172a] p-6 flex items-center justify-between text-white">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl">
            <Store size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tighter">{selectedMonth} {selectedYear}</h3>
            <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest">Calendario de Visitas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-white/10 rounded-xl transition-all">
            <ChevronLeft size={24} />
          </button>
          <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-xl transition-all">
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        <div className="grid grid-cols-7 mb-2">
          {['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'].map(day => (
            <div key={day} className="text-center py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, idx) => (
            <div 
              key={idx} 
              className={`min-h-[120px] rounded-2xl border p-2 transition-all ${day ? 'bg-white border-slate-100' : 'bg-slate-50/50 border-transparent'}`}
            >
              {day && (
                <>
                  <span className="text-xs font-black text-slate-400 mb-2 block">{day}</span>
                  <div className="space-y-1">
                    {getVisitsForDay(day).map(visit => (
                      <div 
                        key={visit.id}
                        onClick={() => visit.status === 'ABIERTO' ? onManageClosure(visit) : null}
                        className={`p-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter cursor-pointer transition-all hover:scale-105 ${visit.status === 'CERRADO' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200 shadow-sm'}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">{visit.plate}</span>
                          {visit.status === 'CERRADO' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
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
    </div>
  );
};

export default WorkshopCalendar;
