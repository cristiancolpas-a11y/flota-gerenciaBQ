import React, { useEffect, useRef, useState } from 'react';

export interface FleetLoaderProps {
  show?: boolean;
  title?: string;
  subtitle?: string;
  src?: string;
}

const FleetLoader: React.FC<FleetLoaderProps> = ({
  show = true,
  title = 'CARGANDO FLOTA',
  subtitle = 'MENOS EMISIONES · AIRE LIMPIO',
  src = '/assets/aistudio/gemini_generated_video_20ef19f4_69631618.mp4',
}) => {
  const [mounted, setMounted] = useState(show);
  const [visible, setVisible] = useState(show);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (show) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 550);
      return () => clearTimeout(timer);
    }
  }, [show]);

  useEffect(() => {
    if (!mounted || videoError) return;
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    const attemptPlay = () => {
      if (cancelled || !video) return;
      video.muted = true;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Reintento breve por si el navegador bloquea el primer intento de autoplay
          setTimeout(() => {
            if (!cancelled && video) {
              video.muted = true;
              video.play().catch(() => {});
            }
          }, 250);
        });
      }
    };

    attemptPlay();
    return () => {
      cancelled = true;
    };
  }, [mounted, videoError, src]);

  if (!mounted) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={title}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && !show) {
          setMounted(false);
        }
      }}
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#07182E] via-[#0D2B4E] to-[#133B6B] transition-opacity duration-500 ease-out ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Fallback mientras el video carga para nunca mostrar pantalla negra */}
      {(!videoReady || videoError) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#07182E] via-[#0D2B4E] to-[#133B6B]">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-200/70">
            Cargando flota…
          </span>
        </div>
      )}

      {/* Video real del camión en loop */}
      {!videoError && (
        <video
          ref={videoRef}
          src={src}
          muted
          loop
          autoPlay
          playsInline
          preload="auto"
          onLoadedData={() => setVideoReady(true)}
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoError(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            videoReady ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Scrim para legibilidad del overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#061426]/90 via-[#061426]/40 to-[#061426]/65" />

      {/* Overlay principal */}
      <div className="relative z-10 mt-auto mb-14 flex w-full max-w-md flex-col items-center px-6 text-center sm:mb-20">
        <div className="w-full rounded-2xl border border-white/15 bg-[#07182E]/70 px-6 py-5 shadow-2xl backdrop-blur-md">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#FBBF24]">
            {subtitle}
          </p>
          <h2 className="mt-1.5 text-xl font-black uppercase tracking-[0.18em] text-white sm:text-2xl">
            {title}
          </h2>

          {/* Barra de carga dorada */}
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
            <div className="fleet-loader-bar h-full rounded-full bg-gradient-to-r from-[#D97706] via-[#FBBF24] to-[#FEF08A]" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetLoader;
