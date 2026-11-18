# Integrar FleetLoader (pantalla de carga con video real del camión Bavaria)

Pantalla de carga que muestra el **video real del camión** en loop, con overlay "CARGANDO FLOTA" + barra dorada, y **fade-out automático** cuando terminan de cargar los datos.

## Archivos
1. **`public/camion-flota.mp4`** — copiar el video aquí (1.4 MB, ya optimizado, loop con fade).
2. **`components/FleetLoader.tsx`** — el componente (adjunto).

## Uso en `App.tsx`

### Opción A — mientras carga la data inicial (recomendada)
```tsx
import FleetLoader from "./components/FleetLoader";
import { useState, useEffect } from "react";

export default function App() {
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // tu carga inicial (fetch de hojas, etc.)
    cargarDatosIniciales().finally(() => setCargando(false));
  }, []);

  return (
    <>
      <FleetLoader show={cargando} />
      {/* resto de la app */}
    </>
  );
}
```
> `show={cargando}`: cuando pasa a `false`, el loader hace **fade-out** solo y se desmonta. No tapa la app después.

### Opción B — mostrar siempre un mínimo (ej. 2.5s) para que el video se vea
Si la data carga muy rápido y no alcanza a verse el camión:
```tsx
useEffect(() => {
  const minTiempo = new Promise(r => setTimeout(r, 2500)); // mínimo 2.5s
  Promise.all([cargarDatosIniciales(), minTiempo]).finally(() => setCargando(false));
}, []);
```

## Props del componente
| Prop | Default | Qué hace |
|------|---------|----------|
| `show` | `true` | Al pasar a `false`, hace fade-out y se oculta. |
| `title` | `"CARGANDO FLOTA"` | Texto principal. |
| `subtitle` | `"MENOS EMISIONES · AIRE LIMPIO"` | Subtítulo. |
| `src` | `"/camion-flota.mp4"` | Ruta del video. |

## Notas
- El video va **muted** (obligatorio para autoplay en navegadores) y en **loop**. Incluye reintento de autoplay por si el navegador lo bloquea.
- Mientras el video carga, muestra un fondo azul con "Cargando flota…" (fallback), así nunca se ve negro.
- Respeta `prefers-reduced-motion` (la barra se queda quieta).
- `z-index: 9999` → queda por encima de todo mientras está visible.
- El video se sirve desde `/public`, así **no engorda el bundle** de la app y se cachea aparte. Si prefieres embeberlo en el componente dime y te paso la versión con data URI.

## Checklist
- [ ] `public/camion-flota.mp4` copiado.
- [ ] `components/FleetLoader.tsx` agregado.
- [ ] `<FleetLoader show={cargando} />` en App, con `setCargando(false)` al terminar la carga.
- [ ] Verificar que el video reproduce y hace fade-out al cargar la app.
