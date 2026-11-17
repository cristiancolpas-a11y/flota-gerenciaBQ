import React, { useMemo, useState, useEffect } from 'react';
import { WashReport, Vehicle } from '../types';
import { normalizePlate, normalizeStr, formatDate, getDriveDirectLink } from '../utils';
import {
  History,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Truck,
  MapPin,
  Eye,
  Plus,
  Camera,
  X,
  ArrowUpDown,
  Building2,
  Filter,
  Droplets,
  ChevronRight,
} from 'lucide-react';
import PhotoDropZone from './PhotoDropZone';

const MONTHS_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const parseWashTimestamp = (dateStr?: string | null): number => {
  if (!dateStr) return 0;
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const [y, m, d] = trimmed.split('T')[0].split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
    const [d, m, y] = trimmed.split('/').map(Number);
    return Date.UTC(y, m - 1, d);
  }
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const formatShortDateUTC = (dateStr?: string | null): string => {
  if (!dateStr) return '—';
  const ts = parseWashTimestamp(dateStr);
  if (!ts) return dateStr;
  const d = new Date(ts);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const diffDaysUTC = (laterTs: number, earlierTs: number): number => {
  if (!laterTs || !earlierTs) return 0;
  return Math.max(0, Math.round((laterTs - earlierTs) / (1000 * 60 * 60 * 24)));
};

const reportHasEvidence = (w: WashReport): boolean => {
  const ev = (w.evidenceUrl || w.initialEvidenceUrl || w.finalEvidenceUrl || '').toString().trim();
  return !!ev && ev.startsWith('http');
};

type ComplianceLevel = 'AL_DIA' | 'PROXIMO' | 'VENCIDO' | 'SIN_HISTORIAL';

const getComplianceLevel = (daysSinceLast: number | null): ComplianceLevel => {
  if (daysSinceLast === null) return 'SIN_HISTORIAL';
  if (daysSinceLast <= 22) return 'AL_DIA';
  if (daysSinceLast <= 30) return 'PROXIMO';
  return 'VENCIDO';
};

const getComplianceMeta = (level: ComplianceLevel) => {
  switch (level) {
    case 'AL_DIA':
      return {
        label: 'Al día',
        textClass: 'text-emerald-700',
        bgClass: 'bg-emerald-50 border-emerald-200',
        Icon: CheckCircle2,
      };
    case 'PROXIMO':
      return {
        label: 'Próximo (23-30d)',
        textClass: 'text-amber-700',
        bgClass: 'bg-amber-50 border-amber-200',
        Icon: Clock,
      };
    case 'VENCIDO':
      return {
        label: 'Atrasado (>30d)',
        textClass: 'text-rose-700',
        bgClass: 'bg-rose-50 border-rose-200',
        Icon: AlertTriangle,
      };
    case 'SIN_HISTORIAL':
    default:
      return {
        label: 'Sin registros',
        textClass: 'text-slate-500',
        bgClass: 'bg-slate-100 border-slate-200',
        Icon: AlertCircle,
      };
  }
};

export interface PlateWashSummary {
  plate: string;
  vehicle: Vehicle | null;
  cd: string;
  contractor: string;
  modelLabel: string;
  reports: WashReport[];
  totalWashes: number;
  withEvidenceCount: number;
  lastWashDate: string | null;
  lastWashTs: number;
  daysSinceLast: number | null;
  avgIntervalDays: number | null;
  minIntervalDays: number | null;
  maxIntervalDays: number | null;
  compliance: ComplianceLevel;
}

const buildPlateSummary = (
  plate: string,
  vehicle: Vehicle | null,
  rawReports: WashReport[],
  todayUtcTs: number
): PlateWashSummary => {
  const sorted = [...rawReports].sort((a, b) => parseWashTimestamp(b.date) - parseWashTimestamp(a.date));
  const datedReports = sorted.filter(r => parseWashTimestamp(r.date) > 0);
  const lastReport = datedReports[0] || sorted[0] || null;
  const lastWashTs = lastReport ? parseWashTimestamp(lastReport.date) : 0;
  const daysSinceLast = lastWashTs > 0 ? Math.max(0, Math.round((todayUtcTs - lastWashTs) / 86400000)) : null;

  const intervals: number[] = [];
  for (let i = 0; i < datedReports.length - 1; i++) {
    const tCurr = parseWashTimestamp(datedReports[i].date);
    const tPrev = parseWashTimestamp(datedReports[i + 1].date);
    if (tCurr > 0 && tPrev > 0) {
      const gap = diffDaysUTC(tCurr, tPrev);
      if (gap >= 0) intervals.push(gap);
    }
  }

  const avgIntervalDays =
    intervals.length > 0 ? Math.round(intervals.reduce((acc, n) => acc + n, 0) / intervals.length) : null;
  const minIntervalDays = intervals.length > 0 ? Math.min(...intervals) : null;
  const maxIntervalDays = intervals.length > 0 ? Math.max(...intervals) : null;

  const modelLabel = vehicle
    ? [vehicle.brand, vehicle.model].filter(Boolean).join(' ').trim() || 'Vehículo'
    : 'Vehículo no listado';

  return {
    plate,
    vehicle,
    cd: vehicle?.cd?.trim() || 'SIN CD',
    contractor: vehicle?.contractor?.trim() || 'SIN CONTRATISTA',
    modelLabel,
    reports: sorted,
    totalWashes: sorted.length,
    withEvidenceCount: sorted.filter(reportHasEvidence).length,
    lastWashDate: lastReport?.date || null,
    lastWashTs,
    daysSinceLast,
    avgIntervalDays,
    minIntervalDays,
    maxIntervalDays,
    compliance: getComplianceLevel(daysSinceLast),
  };
};

interface WashPlateTimelineDetailProps {
  summary: PlateWashSummary;
  selectedYear: number;
  onYearChange?: (year: number) => void;
  onViewDoc: (url: string | string[] | { url: string; label?: string }[], title: string) => void;
  onRegisterWashForPlate?: (plate: string) => void;
  onUploadEvidence?: (report: WashReport, file: File) => void;
}

export const WashPlateTimelineDetail: React.FC<WashPlateTimelineDetailProps> = ({
  summary,
  selectedYear,
  onYearChange,
  onViewDoc,
  onRegisterWashForPlate,
  onUploadEvidence,
}) => {
  const [uploadTargetReport, setUploadTargetReport] = useState<WashReport | null>(null);
  const [historyScope, setHistoryScope] = useState<'ALL' | 'YEAR'>('ALL');

  const nowUtc = new Date();
  const currentYearUtc = nowUtc.getUTCFullYear();
  const currentMonthUtc = nowUtc.getUTCMonth();

  const availableYears = useMemo(() => {
    const ys = new Set<number>([selectedYear, currentYearUtc]);
    summary.reports.forEach(r => {
      const ts = parseWashTimestamp(r.date);
      if (ts > 0) ys.add(new Date(ts).getUTCFullYear());
    });
    return Array.from(ys).sort((a, b) => b - a);
  }, [summary.reports, selectedYear, currentYearUtc]);

  // Cumplimiento por mes del año seleccionado (12 meses)
  const monthlyCompliance = useMemo(() => {
    return MONTHS_ES.map((monthName, idx) => {
      const matches = summary.reports.filter(r => {
        const ts = parseWashTimestamp(r.date);
        if (ts > 0) {
          const d = new Date(ts);
          return d.getUTCFullYear() === selectedYear && d.getUTCMonth() === idx;
        }
        return normalizeStr(r.month) === monthName && selectedYear === currentYearUtc;
      });
      const isFuture =
        selectedYear > currentYearUtc || (selectedYear === currentYearUtc && idx > currentMonthUtc);
      return {
        idx,
        short: MONTHS_SHORT[idx],
        full: monthName,
        count: matches.length,
        isFuture,
      };
    });
  }, [summary.reports, selectedYear, currentYearUtc, currentMonthUtc]);

  const monthsCompliedCount = useMemo(() => {
    const evaluated = monthlyCompliance.filter(m => !m.isFuture);
    const complied = evaluated.filter(m => m.count > 0).length;
    return { complied, evaluated: evaluated.length };
  }, [monthlyCompliance]);

  const timelineReports = useMemo(() => {
    if (historyScope === 'ALL') return summary.reports;
    return summary.reports.filter(r => {
      const ts = parseWashTimestamp(r.date);
      if (ts > 0) return new Date(ts).getUTCFullYear() === selectedYear;
      return false;
    });
  }, [summary.reports, historyScope, selectedYear]);

  const compMeta = getComplianceMeta(summary.compliance);
  const CompIcon = compMeta.Icon;

  const openReportPhotos = (report: WashReport) => {
    const photos: { url: string; label?: string }[] = [];
    if (report.initialEvidenceUrl && report.initialEvidenceUrl.startsWith('http')) {
      photos.push({ url: report.initialEvidenceUrl, label: 'Evidencia Inicial / Entrada' });
    }
    if (
      report.finalEvidenceUrl &&
      report.finalEvidenceUrl.startsWith('http') &&
      report.finalEvidenceUrl !== report.initialEvidenceUrl
    ) {
      photos.push({ url: report.finalEvidenceUrl, label: 'Evidencia Final / Salida' });
    }
    if (
      report.evidenceUrl &&
      report.evidenceUrl.startsWith('http') &&
      !photos.some(p => p.url === report.evidenceUrl)
    ) {
      photos.push({ url: report.evidenceUrl, label: 'Foto de Lavado' });
    }
    if (report.mapUrl && report.mapUrl.startsWith('http')) {
      photos.push({ url: report.mapUrl, label: 'Ubicación GPS' });
    }
    if (photos.length > 0) {
      onViewDoc(photos, `Evidencia de Lavado - ${summary.plate} (${formatShortDateUTC(report.date)})`);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Cabecera de la placa */}
      <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-2xl font-mono font-black text-slate-900 tracking-tight">
              {summary.plate}
            </h3>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${compMeta.textClass}`}>
              <CompIcon size={15} />
              <span>{compMeta.label}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
            <span className="font-semibold text-slate-700">{summary.cd}</span>
            <span aria-hidden="true">·</span>
            <span>{summary.contractor}</span>
            <span aria-hidden="true">·</span>
            <span>{summary.modelLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onRegisterWashForPlate && (
            <button
              type="button"
              onClick={() => onRegisterWashForPlate(summary.plate)}
              className="px-4 py-2 bg-[#0D2B4E] hover:bg-[#153e6c] text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus size={15} className="text-[#F2B705]" />
              <span>Registrar lavado</span>
            </button>
          )}
        </div>
      </div>

      {/* Métricas de frecuencia y cumplimiento */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 border-b border-slate-200">
        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Lavados históricos</p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">{summary.totalWashes}</p>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            {summary.withEvidenceCount} con evidencia
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Último lavado</p>
          <p className="text-lg font-bold text-slate-900 tabular-nums mt-1">
            {summary.lastWashDate ? formatShortDateUTC(summary.lastWashDate) : '—'}
          </p>
          <p className={`text-xs font-medium mt-0.5 tabular-nums ${compMeta.textClass}`}>
            {summary.daysSinceLast !== null ? `Hace ${summary.daysSinceLast} días` : 'Sin registros'}
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Frecuencia promedio</p>
          <p className="text-lg font-bold text-slate-900 tabular-nums mt-1">
            {summary.avgIntervalDays !== null ? `Cada ${summary.avgIntervalDays} días` : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            {summary.minIntervalDays !== null && summary.maxIntervalDays !== null
              ? `Mín ${summary.minIntervalDays}d · Máx ${summary.maxIntervalDays}d`
              : summary.totalWashes === 1
                ? 'Requiere 2+ lavados'
                : 'Sin intervalos'}
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Cumplimiento {selectedYear}</p>
          <p className="text-lg font-bold text-slate-900 tabular-nums mt-1">
            {monthsCompliedCount.complied} / {monthsCompliedCount.evaluated} meses
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Meta: 1 lavado por mes</p>
        </div>
      </div>

      {/* Matriz mensual de cumplimiento */}
      <div className="p-5 sm:p-6 border-b border-slate-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              Cobertura Mensual ({selectedYear})
            </h4>
            <p className="text-xs text-slate-500">
              Control de regla mensual por mes calendario
            </p>
          </div>
          {onYearChange && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {availableYears.map(y => (
                <button
                  key={y}
                  type="button"
                  onClick={() => onYearChange(y)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors tabular-nums cursor-pointer ${
                    selectedYear === y
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
          {monthlyCompliance.map(m => {
            const hasWash = m.count > 0;
            const cellStyle = hasWash
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : m.isFuture
                ? 'bg-slate-50 border-slate-100 text-slate-400'
                : 'bg-rose-50/70 border-rose-200 text-rose-700';

            return (
              <div
                key={m.short}
                title={`${m.full} ${selectedYear}: ${m.count} lavado(s)`}
                className={`rounded-lg border px-1.5 py-2 text-center transition-colors ${cellStyle}`}
              >
                <div className="text-[11px] font-semibold">{m.short}</div>
                <div className="text-xs font-bold tabular-nums mt-0.5">
                  {hasWash ? `${m.count}×` : m.isFuture ? '·' : '0'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Línea de tiempo cronológica */}
      <div className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              Línea de Tiempo de Lavados
            </h4>
            <p className="text-xs text-slate-500">
              Secuencia cronológica con intervalo de días entre servicios
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setHistoryScope('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                historyScope === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todo ({summary.reports.length})
            </button>
            <button
              type="button"
              onClick={() => setHistoryScope('YEAR')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                historyScope === 'YEAR'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Año {selectedYear}
            </button>
          </div>
        </div>

        {timelineReports.length === 0 ? (
          <div className="py-12 px-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
            <Droplets size={32} className="mx-auto text-slate-300" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800">
                Sin lavados registrados {historyScope === 'YEAR' ? `en ${selectedYear}` : 'para esta placa'}
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Cuando se registre un lavado para {summary.plate}, aparecerá aquí con su fecha, intervalo de frecuencia y evidencia fotográfica.
              </p>
            </div>
            {onRegisterWashForPlate && (
              <button
                type="button"
                onClick={() => onRegisterWashForPlate(summary.plate)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0D2B4E] hover:bg-[#153e6c] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus size={14} className="text-[#F2B705]" />
                <span>Registrar primer lavado</span>
              </button>
            )}
          </div>
        ) : (
          <div className="relative pl-6 space-y-0">
            {timelineReports.map((report, index) => {
              const hasEvidence = reportHasEvidence(report);
              const nextOlderReport = timelineReports[index + 1];
              const currTs = parseWashTimestamp(report.date);
              const prevTs = nextOlderReport ? parseWashTimestamp(nextOlderReport.date) : 0;
              const gapDays = currTs > 0 && prevTs > 0 ? diffDaysUTC(currTs, prevTs) : null;
              const isOverTarget = gapDays !== null && gapDays > 30;
              const thumbUrl = getDriveDirectLink(
                report.evidenceUrl || report.initialEvidenceUrl || report.finalEvidenceUrl || ''
              );

              return (
                <React.Fragment key={report.id || `${report.date}-${index}`}>
                  <div className="relative pb-2">
                    {/* Línea vertical del timeline */}
                    {index < timelineReports.length - 1 && (
                      <div
                        aria-hidden="true"
                        className="absolute -left-[17px] top-6 bottom-0 w-px bg-slate-200"
                      />
                    )}
                    {/* Nodo del evento */}
                    <div
                      aria-hidden="true"
                      className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-white ${
                        hasEvidence ? 'border-emerald-600' : 'border-amber-500'
                      }`}
                    />

                    <div className="border border-slate-200 rounded-xl p-4 bg-white hover:border-slate-300 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900 tabular-nums">
                              {formatShortDateUTC(report.date)}
                            </span>
                            <span className="text-xs text-slate-400" aria-hidden="true">·</span>
                            <span className="text-xs font-medium text-slate-600">
                              {formatDate(report.date)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                            <span>{report.month || 'Sin mes'}</span>
                            {report.week && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="tabular-nums">Semana {report.week}</span>
                              </>
                            )}
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-700 font-medium truncate">
                              {report.workshop || 'Lugar no especificado'}
                            </span>
                          </div>

                          <div className="pt-1 flex items-center gap-3 flex-wrap">
                            {hasEvidence ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                                <CheckCircle2 size={13} />
                                <span>Con evidencia fotográfica</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700">
                                <AlertCircle size={13} />
                                <span>Sin evidencia adjunta</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Acciones y miniatura */}
                        <div className="flex items-center gap-2 shrink-0">
                          {hasEvidence && thumbUrl && (
                            <button
                              type="button"
                              onClick={() => openReportPhotos(report)}
                              className="w-12 h-9 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 hover:border-[#0D2B4E] transition-colors shrink-0 cursor-pointer"
                              title="Ampliar foto del lavado"
                            >
                              <img
                                src={thumbUrl}
                                alt={`Evidencia de lavado ${summary.plate} ${report.date}`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </button>
                          )}

                          {hasEvidence ? (
                            <button
                              type="button"
                              onClick={() => openReportPhotos(report)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-[#0D2B4E] text-slate-700 hover:text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <Eye size={14} />
                              <span>Ver fotos</span>
                            </button>
                          ) : (
                            onUploadEvidence && (
                              <button
                                type="button"
                                onClick={() => setUploadTargetReport(report)}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <Camera size={14} />
                                <span>Subir foto</span>
                              </button>
                            )
                          )}

                          {report.mapUrl && report.mapUrl.startsWith('http') && (
                            <button
                              type="button"
                              onClick={() =>
                                onViewDoc(report.mapUrl, `Ubicación GPS - ${summary.plate} (${formatShortDateUTC(report.date)})`)
                              }
                              className="p-1.5 bg-cyan-50 hover:bg-cyan-600 text-cyan-700 hover:text-white border border-cyan-200 rounded-lg transition-colors cursor-pointer"
                              title="Ver mapa GPS"
                            >
                              <MapPin size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Conector de intervalo entre lavados */}
                  {gapDays !== null && (
                    <div className="relative py-2.5 flex items-center">
                      <div
                        aria-hidden="true"
                        className="absolute -left-[17px] top-0 bottom-0 w-px bg-slate-200"
                      />
                      <div
                        className={`ml-2 inline-flex items-center gap-2 text-xs font-medium tabular-nums ${
                          isOverTarget ? 'text-amber-700' : 'text-slate-500'
                        }`}
                      >
                        <Clock size={12} className={isOverTarget ? 'text-amber-600' : 'text-slate-400'} />
                        <span>
                          Intervalo: <strong className="font-semibold">{gapDays} días</strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{isOverTarget ? 'Superó meta de 30 días' : 'Dentro de frecuencia'}</span>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de carga rápida de evidencia si falta */}
      {uploadTargetReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setUploadTargetReport(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-base font-bold text-slate-900">Cargar evidencia de lavado</h4>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  {summary.plate} · {formatShortDateUTC(uploadTargetReport.date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUploadTargetReport(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <PhotoDropZone
              autoFocus
              label={`Subir evidencia para ${summary.plate}`}
              onFile={file => {
                const target = uploadTargetReport;
                setUploadTargetReport(null);
                if (onUploadEvidence && target) {
                  onUploadEvidence(target, file);
                }
              }}
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setUploadTargetReport(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
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

/* ============================================================================
   MODAL DE HISTORIAL POR PLACA (para abrir desde Estatus Flota o Lista)
   ============================================================================ */
interface WashPlateTimelineModalProps {
  plate: string;
  vehicles: Vehicle[];
  washReports: WashReport[];
  selectedYear: number;
  onYearChange?: (year: number) => void;
  onClose: () => void;
  onViewDoc: (url: string | string[] | { url: string; label?: string }[], title: string) => void;
  onRegisterWashForPlate?: (plate: string) => void;
  onUploadEvidence?: (report: WashReport, file: File) => void;
}

export const WashPlateTimelineModal: React.FC<WashPlateTimelineModalProps> = ({
  plate,
  vehicles,
  washReports,
  selectedYear,
  onYearChange,
  onClose,
  onViewDoc,
  onRegisterWashForPlate,
  onUploadEvidence,
}) => {
  const summary = useMemo(() => {
    const norm = normalizePlate(plate);
    const vehicle = vehicles.find(v => normalizePlate(v.plate) === norm) || null;
    const reports = washReports.filter(w => normalizePlate(w.plate) === norm);
    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return buildPlateSummary(vehicle?.plate || plate, vehicle, reports, todayUtc);
  }, [plate, vehicles, washReports]);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-50 shadow-2xl border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <History size={18} className="text-[#0D2B4E]" />
            <span className="text-sm font-bold text-slate-900">
              Historial de Lavados · <span className="font-mono">{summary.plate}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Cerrar historial"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <WashPlateTimelineDetail
            summary={summary}
            selectedYear={selectedYear}
            onYearChange={onYearChange}
            onViewDoc={onViewDoc}
            onRegisterWashForPlate={
              onRegisterWashForPlate
                ? p => {
                    onClose();
                    onRegisterWashForPlate(p);
                  }
                : undefined
            }
            onUploadEvidence={onUploadEvidence}
          />
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   VISTA COMPLETA DE HISTORIAL & LÍNEA DE TIEMPO POR PLACA (TAB PRINCIPAL)
   ============================================================================ */
interface WashHistoryTimelineProps {
  vehicles: Vehicle[];
  washReports: WashReport[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  filterCd: string;
  filterContractor: string;
  onFilterCdChange: (cd: string) => void;
  onFilterContractorChange: (contractor: string) => void;
  uniqueCds: string[];
  uniqueContractors: string[];
  onViewDoc: (url: string | string[] | { url: string; label?: string }[], title: string) => void;
  onRegisterWashForPlate?: (plate: string) => void;
  onUploadEvidence?: (report: WashReport, file: File) => void;
}

const WashHistoryTimeline: React.FC<WashHistoryTimelineProps> = ({
  vehicles,
  washReports,
  selectedYear,
  onYearChange,
  filterCd,
  filterContractor,
  onFilterCdChange,
  onFilterContractorChange,
  uniqueCds,
  uniqueContractors,
  onViewDoc,
  onRegisterWashForPlate,
  onUploadEvidence,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [complianceFilter, setComplianceFilter] = useState<'ALL' | ComplianceLevel>('ALL');
  const [sortBy, setSortBy] = useState<'URGENCIA' | 'FRECUENCIA' | 'CANTIDAD' | 'PLACA'>('URGENCIA');
  const [selectedPlate, setSelectedPlate] = useState<string>('');

  const todayUtcTs = useMemo(() => {
    const now = new Date();
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  }, []);

  // Construir resúmenes por placa combinando flota oficial + reportes históricos
  const allPlateSummaries = useMemo(() => {
    const reportsByPlate = new Map<string, WashReport[]>();
    washReports.forEach(w => {
      const norm = normalizePlate(w.plate);
      if (!norm) return;
      const list = reportsByPlate.get(norm) || [];
      list.push(w);
      reportsByPlate.set(norm, list);
    });

    const summaries: PlateWashSummary[] = [];
    const seen = new Set<string>();

    vehicles.forEach(v => {
      const norm = normalizePlate(v.plate);
      if (!norm || seen.has(norm)) return;
      seen.add(norm);
      const matchCd =
        filterCd === 'all' || (v.cd || '').trim().toUpperCase() === filterCd.trim().toUpperCase();
      const matchContractor =
        filterContractor === 'all' ||
        (v.contractor || '').trim().toUpperCase() === filterContractor.trim().toUpperCase();
      if (!matchCd || !matchContractor) return;

      summaries.push(buildPlateSummary(v.plate, v, reportsByPlate.get(norm) || [], todayUtcTs));
    });

    // Incluir placas registradas en reportes que no estén en maestro cuando no hay filtro específico de CD/Contratista
    if (filterCd === 'all' && filterContractor === 'all') {
      reportsByPlate.forEach((reps, norm) => {
        if (!seen.has(norm)) {
          seen.add(norm);
          const rawPlate = reps[0]?.plate || norm;
          summaries.push(buildPlateSummary(rawPlate, null, reps, todayUtcTs));
        }
      });
    }

    return summaries;
  }, [vehicles, washReports, filterCd, filterContractor, todayUtcTs]);

  // KPIs globales sobre el subconjunto de flota
  const globalStats = useMemo(() => {
    const totalPlates = allPlateSummaries.length;
    const totalWashes = allPlateSummaries.reduce((acc, s) => acc + s.totalWashes, 0);
    const withIntervals = allPlateSummaries.filter(s => s.avgIntervalDays !== null);
    const avgFleetFrequency =
      withIntervals.length > 0
        ? Math.round(
            withIntervals.reduce((acc, s) => acc + (s.avgIntervalDays || 0), 0) / withIntervals.length
          )
        : null;
    const alertCount = allPlateSummaries.filter(
      s => s.compliance === 'VENCIDO' || s.compliance === 'SIN_HISTORIAL'
    ).length;

    return { totalPlates, totalWashes, avgFleetFrequency, alertCount };
  }, [allPlateSummaries]);

  // Filtrado y ordenamiento de la lista de placas
  const filteredSummaries = useMemo(() => {
    let list = [...allPlateSummaries];

    if (complianceFilter !== 'ALL') {
      list = list.filter(s => s.compliance === complianceFilter);
    }

    if (searchTerm.trim()) {
      const q = normalizeStr(searchTerm);
      list = list.filter(
        s =>
          normalizeStr(s.plate).includes(q) ||
          normalizeStr(s.cd).includes(q) ||
          normalizeStr(s.contractor).includes(q) ||
          normalizeStr(s.modelLabel).includes(q) ||
          s.reports.some(r => r.workshop && normalizeStr(r.workshop).includes(q))
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'URGENCIA') {
        const order: Record<ComplianceLevel, number> = {
          VENCIDO: 0,
          SIN_HISTORIAL: 1,
          PROXIMO: 2,
          AL_DIA: 3,
        };
        if (order[a.compliance] !== order[b.compliance]) {
          return order[a.compliance] - order[b.compliance];
        }
        return (b.daysSinceLast ?? 9999) - (a.daysSinceLast ?? 9999);
      }
      if (sortBy === 'CANTIDAD') {
        if (b.totalWashes !== a.totalWashes) return b.totalWashes - a.totalWashes;
        return a.plate.localeCompare(b.plate);
      }
      if (sortBy === 'FRECUENCIA') {
        const fa = a.avgIntervalDays ?? 9999;
        const fb = b.avgIntervalDays ?? 9999;
        if (fa !== fb) return fa - fb;
        return a.plate.localeCompare(b.plate);
      }
      return a.plate.localeCompare(b.plate);
    });

    return list;
  }, [allPlateSummaries, complianceFilter, searchTerm, sortBy]);

  // Mantener una placa seleccionada válida
  useEffect(() => {
    if (filteredSummaries.length === 0) {
      setSelectedPlate('');
      return;
    }
    const exists = filteredSummaries.some(
      s => normalizePlate(s.plate) === normalizePlate(selectedPlate)
    );
    if (!exists) {
      // Priorizar la primera placa con al menos 1 lavado si existe, o la primera de la lista
      const firstWithHistory = filteredSummaries.find(s => s.totalWashes > 0);
      setSelectedPlate((firstWithHistory || filteredSummaries[0]).plate);
    }
  }, [filteredSummaries, selectedPlate]);

  const activeSummary = useMemo(() => {
    return (
      filteredSummaries.find(s => normalizePlate(s.plate) === normalizePlate(selectedPlate)) ||
      filteredSummaries[0] ||
      null
    );
  }, [filteredSummaries, selectedPlate]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* KPIs de frecuencia y cumplimiento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Flota monitoreada</span>
            <Truck size={17} className="text-[#0D2B4E]" />
          </div>
          <p className="text-3xl font-bold text-slate-900 tabular-nums mt-2">
            {globalStats.totalPlates}
          </p>
          <p className="text-xs text-slate-500 mt-1">Vehículos en seguimiento</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Lavados registrados</span>
            <Droplets size={17} className="text-cyan-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 tabular-nums mt-2">
            {globalStats.totalWashes}
          </p>
          <p className="text-xs text-slate-500 mt-1">Acumulado histórico total</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Frecuencia promedio</span>
            <Clock size={17} className="text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 tabular-nums mt-2">
            {globalStats.avgFleetFrequency !== null ? `${globalStats.avgFleetFrequency} d` : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Promedio entre lavados</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Requieren atención</span>
            <AlertTriangle size={17} className="text-rose-600" />
          </div>
          <p className="text-3xl font-bold text-rose-700 tabular-nums mt-2">
            {globalStats.alertCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">&gt;30 días o sin registro</p>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Filtro por cumplimiento */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'ALL', label: 'Todas' },
                { id: 'VENCIDO', label: 'Atrasadas (>30d)' },
                { id: 'PROXIMO', label: 'Próximas (23-30d)' },
                { id: 'AL_DIA', label: 'Al día' },
                { id: 'SIN_HISTORIAL', label: 'Sin registros' },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setComplianceFilter(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  complianceFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Controles de CD, Contratista, Orden y Búsqueda */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <Building2 size={14} className="text-slate-400" />
              <select
                value={filterCd}
                onChange={e => onFilterCdChange(e.target.value)}
                className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">Todos los CD</option>
                {uniqueCds.map(cd => (
                  <option key={cd} value={cd}>{cd}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <Filter size={14} className="text-slate-400" />
              <select
                value={filterContractor}
                onChange={e => onFilterContractorChange(e.target.value)}
                className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer max-w-[140px]"
              >
                <option value="all">Todos contratistas</option>
                {uniqueContractors.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <ArrowUpDown size={14} className="text-slate-400" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="URGENCIA">Orden: Prioridad cumplimiento</option>
                <option value="CANTIDAD">Orden: Más lavados</option>
                <option value="FRECUENCIA">Orden: Mejor frecuencia</option>
                <option value="PLACA">Orden: Placa A-Z</option>
              </select>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar placa, CD, taller..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-[#0D2B4E] w-48 placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
                  aria-label="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Master-Detail: Lista de placas a la izquierda + Línea de tiempo a la derecha */}
      {filteredSummaries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-3">
          <History size={36} className="mx-auto text-slate-300" />
          <div className="space-y-1">
            <p className="text-base font-semibold text-slate-800">
              No se encontraron placas con estos filtros
            </p>
            <p className="text-xs text-slate-500">
              Ajusta el filtro de cumplimiento, CD o búsqueda para consultar el historial.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setComplianceFilter('ALL');
              setSearchTerm('');
            }}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Restablecer filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Lista de placas */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Vehículos ({filteredSummaries.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Selecciona una placa para ver su línea de tiempo
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[720px] overflow-y-auto">
              {filteredSummaries.map(item => {
                const isSelected =
                  activeSummary && normalizePlate(activeSummary.plate) === normalizePlate(item.plate);
                const meta = getComplianceMeta(item.compliance);
                const StatusIcon = meta.Icon;

                return (
                  <button
                    key={item.plate}
                    type="button"
                    onClick={() => setSelectedPlate(item.plate)}
                    className={`w-full text-left px-5 py-3.5 transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`font-mono font-bold text-sm tracking-tight ${
                            isSelected ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {item.plate}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium ${
                            isSelected
                              ? item.compliance === 'AL_DIA'
                                ? 'text-emerald-300'
                                : item.compliance === 'PROXIMO'
                                  ? 'text-amber-300'
                                  : item.compliance === 'VENCIDO'
                                    ? 'text-rose-300'
                                    : 'text-slate-300'
                              : meta.textClass
                          }`}
                        >
                          <StatusIcon size={12} />
                          <span>
                            {item.daysSinceLast !== null
                              ? `${item.daysSinceLast}d`
                              : 'Sin lavados'}
                          </span>
                        </span>
                      </div>

                      <div
                        className={`text-xs truncate ${
                          isSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {item.cd} · {item.contractor}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div className="tabular-nums">
                        <div
                          className={`text-xs font-bold ${
                            isSelected ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {item.totalWashes} {item.totalWashes === 1 ? 'lavado' : 'lavados'}
                        </div>
                        <div
                          className={`text-[11px] ${
                            isSelected ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {item.avgIntervalDays !== null
                            ? `Cada ${item.avgIntervalDays}d`
                            : item.lastWashDate
                              ? formatShortDateUTC(item.lastWashDate)
                              : '—'}
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        className={isSelected ? 'text-[#F2B705]' : 'text-slate-300'}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detalle de línea de tiempo */}
          <div className="lg:col-span-7">
            {activeSummary && (
              <WashPlateTimelineDetail
                summary={activeSummary}
                selectedYear={selectedYear}
                onYearChange={onYearChange}
                onViewDoc={onViewDoc}
                onRegisterWashForPlate={onRegisterWashForPlate}
                onUploadEvidence={onUploadEvidence}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WashHistoryTimeline;
