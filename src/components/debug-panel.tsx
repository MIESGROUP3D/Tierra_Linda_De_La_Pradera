'use client';

/* ─────────────────────────────────────────────────────────────────────
 *  DEBUG PANEL — herramienta integral para construir proyectos rapido
 *
 *  Activacion:  ?debug=1  en la URL
 *
 *  Funciones:
 *    • Crosshair fijo con yaw/pitch/hfov en vivo
 *    • Salto rapido entre apartamentos y escenas (no toca el sidebar)
 *    • Spots ARRASTRABLES en el panorama: al soltarlos se guarda su vista y
 *      pitch/yaw (localStorage, ver lib/debug-edits-store.ts)
 *    • "Agregar spot en el crosshair" → spot nuevo, arrastrable, con destino
 *    • "Fijar variantButton aqui" → marca posicion del boton de variante
 *    • "Copiar cambios" → snippet de TODAS las vistas editadas
 *    • Validacion de conexiones (hotspots a escenas inexistentes, falta
 *      de reciprocidad A↔B, escenas huerfanas sin entrada)
 *    • Export de la escena actual como snippet TS listo para pegar
 *    • Export del floor plan completo
 *    • Atajo de teclado: D para colapsar/expandir, S para escena rapida
 *  ───────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTourStore } from '@/lib/tour-store';
import {
  useDebugEdits,
  effectiveHotspots,
  effectiveVariantButton,
  sceneHasEdits,
} from '@/lib/debug-edits-store';
import type { HotspotConfig, SceneConfig, ApartmentConfig, PlaybackAnimation } from '@/lib/tour-types';
import {
  PAN_SPEED,
  TRANSITION_SPEED,
  STATIC_HOLD_MS,
  PLAYBACK_HFOV,
  panDurationMs,
  transitionDurationMs,
} from '@/lib/playback-utils';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const CYAN = '#5DD5F0';

type BtnTone = 'cyan' | 'ghost' | 'green' | 'warn' | 'danger';
function btn(tone: BtnTone, extra?: React.CSSProperties): React.CSSProperties {
  const tones: Record<BtnTone, { bg: string; bd: string; fg: string }> = {
    cyan: { bg: 'rgba(93,213,240,0.16)', bd: 'rgba(93,213,240,0.5)', fg: CYAN },
    ghost: { bg: 'rgba(255,255,255,0.05)', bd: 'rgba(255, 255, 255,0.3)', fg: '#FFFFFF' },
    green: { bg: 'rgba(80,200,120,0.16)', bd: 'rgba(80,200,120,0.5)', fg: '#80E090' },
    warn: { bg: 'rgba(255,180,80,0.14)', bd: 'rgba(255,180,80,0.45)', fg: '#FFC080' },
    danger: { bg: 'rgba(255,80,80,0.14)', bd: 'rgba(255,80,80,0.45)', fg: '#FF8888' },
  };
  const t = tones[tone];
  return {
    padding: '6px 9px',
    fontSize: 10,
    fontWeight: 700,
    background: t.bg,
    border: `1px solid ${t.bd}`,
    borderRadius: 5,
    color: t.fg,
    cursor: 'pointer',
    fontFamily: MONO,
    ...extra,
  };
}

const labelStyle: React.CSSProperties = {
  fontSize: 9,
  opacity: 0.5,
  letterSpacing: 1,
  textTransform: 'uppercase',
  marginBottom: 5,
};

type PanoHandle = {
  getPitch: () => number;
  getYaw: () => number;
  getHfov: () => number;
  lookAt?: (pitch?: number, yaw?: number, hfov?: number, speed?: number) => void;
};

interface DebugPanelProps {
  /** Ref al viewer activo para leer pitch/yaw/hfov */
  viewerHandle: React.RefObject<PanoHandle | null>;
}

type Tab = 'hotspots' | 'variants' | 'playback' | 'plan' | 'export' | 'check';

/** Prefijo comun de dos ids hasta el ultimo '-' (tl-tf-cocina / tl-tf-balcon → 'tl-tf-'). */
function commonIdPrefix(a: string, b: string): string {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const cut = a.slice(0, i).lastIndexOf('-');
  return cut >= 0 ? a.slice(0, cut + 1) : '';
}

/** Id legible para un spot nuevo: tl-tf-cocina + tl-tf-balcon → tl-tf-cocina-to-balcon */
function spotIdFor(sceneId: string, targetId: string, taken: Set<string>): string {
  const prefix = commonIdPrefix(sceneId, targetId);
  const base = `${sceneId}-to-${targetId.slice(prefix.length)}`;
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

function hotspotSnippet(h: HotspotConfig, indent: string): string {
  const q = (s: string) => s.replace(/'/g, "\\'");
  return [
    `${indent}{`,
    `${indent}  id: '${q(h.id)}',`,
    `${indent}  pitch: ${h.pitch}, yaw: ${h.yaw},`,
    `${indent}  type: '${h.type}',`,
    `${indent}  label: '${q(h.label)}',`,
    ...(h.description ? [`${indent}  description: '${q(h.description)}',`] : []),
    ...(h.targetSceneId ? [`${indent}  targetSceneId: '${h.targetSceneId}',`] : []),
    `${indent}},`,
  ].join('\n');
}

export default function DebugPanel({ viewerHandle }: DebugPanelProps) {
  const debugEnabled =
    typeof window !== 'undefined' && window.location.search.includes('debug=1');

  const selectedApartment = useTourStore((s) => s.selectedApartment);
  const setApartment = useTourStore((s) => s.setApartment);
  const setApartmentAtScene = useTourStore((s) => s.setApartmentAtScene);
  const currentSceneId = useTourStore((s) => s.currentSceneId);
  const setCurrentScene = useTourStore((s) => s.setCurrentScene);
  const config = useTourStore((s) => s.config);

  const allApartments: ApartmentConfig[] = useMemo(
    () => config.buildings.flatMap((b) => b.apartments),
    [config],
  );
  const currentScene: SceneConfig | undefined = selectedApartment?.scenes.find(
    (s) => s.id === currentSceneId,
  );

  /* ── Ediciones guardadas (spots arrastrados / nuevos / borrados) ── */
  const edits = useDebugEdits(
    useShallow((s) => ({ moved: s.moved, added: s.added, removed: s.removed, variantBtn: s.variantBtn })),
  );
  const debugActions = useDebugEdits(
    useShallow((s) => ({
      addHotspot: s.addHotspot,
      updateAdded: s.updateAdded,
      removeHotspot: s.removeHotspot,
      moveVariantButton: s.moveVariantButton,
      clearScene: s.clearScene,
      clearAll: s.clearAll,
      bump: s.bump,
    })),
  );
  const spots = useMemo(
    () => (currentScene ? effectiveHotspots(currentScene, edits) : []),
    [currentScene, edits],
  );
  const editedScenes = useMemo(
    () => (selectedApartment?.scenes ?? []).filter((s) => sceneHasEdits(s, edits)),
    [selectedApartment, edits],
  );

  /* ── Live coords del viewer ─────────────────────────────────── */
  const [coords, setCoords] = useState<{ yaw: number; pitch: number; hfov: number } | null>(null);

  useEffect(() => {
    if (!debugEnabled) return;
    const interval = setInterval(() => {
      const v = viewerHandle.current;
      if (!v) return;
      try {
        setCoords({
          yaw: Math.round(v.getYaw() * 10) / 10,
          pitch: Math.round(v.getPitch() * 10) / 10,
          hfov: Math.round(v.getHfov() * 10) / 10,
        });
      } catch {
        /* ignore */
      }
    }, 100);
    return () => clearInterval(interval);
  }, [debugEnabled, viewerHandle]);

  /* ── State del panel ────────────────────────────────────────── */
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<Tab>('hotspots');
  const [copied, setCopied] = useState<string | null>(null);

  // Keyframes de reproducción por escena (persisten al cambiar de escena para
  // poder construir las animaciones sin perder trabajo). Clave = sceneId.
  const [playbackDrafts, setPlaybackDrafts] = useState<Record<string, PlaybackAnimation[]>>({});
  const [pendingFrom, setPendingFrom] = useState<{ pitch: number; yaw: number } | null>(null);
  const previewRef = useRef(false);
  const [previewing, setPreviewing] = useState(false);

  // Ajustes de velocidad/HFOV del modo reproducción (afectan la preview y se
  // exportan como bloque `playback` para pegar en tour.config.ts).
  const [pbSettings, setPbSettings] = useState(() => ({
    panSpeed: config.playback?.panSpeed ?? PAN_SPEED,
    transitionSpeed: config.playback?.transitionSpeed ?? TRANSITION_SPEED,
    staticHoldMs: config.playback?.staticHoldMs ?? STATIC_HOLD_MS,
    hfov: config.playback?.hfov ?? PLAYBACK_HFOV,
  }));

  // Al cambiar de escena solo se limpia el FROM pendiente. Los spots editados y
  // los playbackDrafts se conservan por escena.
  useEffect(() => {
    setPendingFrom(null);
    previewRef.current = false;
    setPreviewing(false);
  }, [currentSceneId]);

  /* ── Atajos de teclado ─────────────────────────────────────── */
  useEffect(() => {
    if (!debugEnabled) return;
    const onKey = (e: KeyboardEvent) => {
      // Solo si el foco no esta en un input/textarea
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        return;
      }
      if (e.key === 'd' || e.key === 'D') {
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [debugEnabled]);

  const copy = useCallback((text: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* ignore */
    }
  }, []);

  /* ── Acciones ───────────────────────────────────────────────── */
  // Spot nuevo en el crosshair; queda en el panorama para arrastrarlo
  const addSpotHere = useCallback(() => {
    if (!coords || !currentSceneId) return;
    const n = (edits.added[currentSceneId] ?? []).length + 1;
    debugActions.addHotspot(currentSceneId, {
      id: `${currentSceneId}-nuevo-${Date.now().toString(36)}`,
      label: `Nuevo ${n}`,
      pitch: coords.pitch,
      yaw: coords.yaw,
      type: 'scene',
      targetSceneId: '',
    });
  }, [coords, currentSceneId, edits.added, debugActions]);

  // Al elegir destino: id y label salen de la escena destino
  const setSpotTarget = useCallback(
    (spotId: string, targetId: string) => {
      const target = selectedApartment?.scenes.find((s) => s.id === targetId);
      const taken = new Set(spots.filter((h) => h.id !== spotId).map((h) => h.id));
      debugActions.updateAdded(currentSceneId, spotId, {
        targetSceneId: targetId,
        ...(target
          ? {
              id: spotIdFor(currentSceneId, targetId, taken),
              label: target.name,
              description: `Ir a ${target.name.toLowerCase()}`,
            }
          : {}),
      });
    },
    [selectedApartment, spots, currentSceneId, debugActions],
  );

  const setVariantBtnHere = useCallback(() => {
    if (!coords) return;
    debugActions.moveVariantButton(currentSceneId, { pitch: coords.pitch, yaw: coords.yaw });
    debugActions.bump();
  }, [coords, currentSceneId, debugActions]);

  /* ── Playback: captura de keyframes ─────────────────────────── */
  const pbAnims = playbackDrafts[currentSceneId] ?? [];

  const markFrom = useCallback(() => {
    if (coords) setPendingFrom({ pitch: coords.pitch, yaw: coords.yaw });
  }, [coords]);

  const addSegment = useCallback(() => {
    if (!coords) return;
    const to = { pitch: coords.pitch, yaw: coords.yaw };
    const from = pendingFrom ?? to;
    setPlaybackDrafts((prev) => ({
      ...prev,
      [currentSceneId]: [...(prev[currentSceneId] ?? []), { from, to }],
    }));
    setPendingFrom(null);
  }, [coords, pendingFrom, currentSceneId]);

  const addStaticHold = useCallback(() => {
    if (!coords) return;
    const p = { pitch: coords.pitch, yaw: coords.yaw };
    setPlaybackDrafts((prev) => ({
      ...prev,
      [currentSceneId]: [...(prev[currentSceneId] ?? []), { from: p, to: p }],
    }));
  }, [coords, currentSceneId]);

  const genFromExits = useCallback(() => {
    if (!currentScene) return;
    const hs = spots;
    if (!hs.length) return;
    const r1 = (n: number) => Math.round(n * 10) / 10;
    const sorted = [...hs].sort((a, b) => a.yaw - b.yaw);
    const anims: PlaybackAnimation[] = sorted.map((h) => ({
      from: { pitch: r1(h.pitch), yaw: r1(h.yaw) },
      to: { pitch: r1(h.pitch), yaw: r1(h.yaw) },
    }));
    setPlaybackDrafts((prev) => ({ ...prev, [currentSceneId]: anims }));
  }, [currentScene, currentSceneId, spots]);

  const removeLastSegment = useCallback(() => {
    setPlaybackDrafts((prev) => ({
      ...prev,
      [currentSceneId]: (prev[currentSceneId] ?? []).slice(0, -1),
    }));
  }, [currentSceneId]);

  const clearSceneAnims = useCallback(() => {
    setPlaybackDrafts((prev) => ({ ...prev, [currentSceneId]: [] }));
    setPendingFrom(null);
  }, [currentSceneId]);

  const previewPlayback = useCallback(async () => {
    const v = viewerHandle.current;
    const anims = playbackDrafts[currentSceneId] ?? [];
    if (!v?.lookAt || !anims.length) return;
    previewRef.current = true;
    setPreviewing(true);
    const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));
    const hf = pbSettings.hfov;
    try {
      v.lookAt(anims[0].from.pitch, anims[0].from.yaw, hf, 600);
      await wait(650);
      for (let i = 0; i < anims.length; i++) {
        if (!previewRef.current) return;
        const a = anims[i];
        const panMs = panDurationMs(a, pbSettings);
        v.lookAt(a.to.pitch, a.to.yaw, hf, panMs);
        await wait(panMs);
        const next = anims[i + 1];
        if (next) {
          if (!previewRef.current) return;
          const tMs = transitionDurationMs(a.to, next.from, pbSettings);
          v.lookAt(next.from.pitch, next.from.yaw, hf, tMs);
          await wait(tMs);
        }
      }
    } finally {
      previewRef.current = false;
      setPreviewing(false);
    }
  }, [viewerHandle, playbackDrafts, currentSceneId, pbSettings]);

  const stopPreview = useCallback(() => {
    previewRef.current = false;
    setPreviewing(false);
  }, []);

  const exportPlaybackScene = useCallback(() => {
    const anims = playbackDrafts[currentSceneId] ?? [];
    if (!anims.length) return '// (sin tramos) — captura o genera algunos primero';
    const lines = anims
      .map(
        (a) =>
          `        { from: { pitch: ${a.from.pitch}, yaw: ${a.from.yaw} }, to: { pitch: ${a.to.pitch}, yaw: ${a.to.yaw} } },`,
      )
      .join('\n');
    return `// ${currentScene?.name ?? currentSceneId}\n      playbackAnimations: [\n${lines}\n      ],`;
  }, [playbackDrafts, currentSceneId, currentScene]);

  const exportPlaybackSettings = useCallback(() => {
    const { panSpeed, transitionSpeed, staticHoldMs, hfov } = pbSettings;
    return `  playback: { panSpeed: ${panSpeed}, transitionSpeed: ${transitionSpeed}, staticHoldMs: ${staticHoldMs}, hfov: ${hfov} },`;
  }, [pbSettings]);

  const exportPlaybackAll = useCallback(() => {
    const entries = Object.entries(playbackDrafts).filter(([, a]) => a.length);
    if (!entries.length) return '// (no hay animaciones capturadas en ninguna escena)';
    return entries
      .map(([sid, anims]) => {
        const name = selectedApartment?.scenes.find((s) => s.id === sid)?.name ?? sid;
        const lines = anims
          .map(
            (a) =>
              `  { from: { pitch: ${a.from.pitch}, yaw: ${a.from.yaw} }, to: { pitch: ${a.to.pitch}, yaw: ${a.to.yaw} } },`,
          )
          .join('\n');
        return `// ${name} (${sid})\nplaybackAnimations: [\n${lines}\n],`;
      })
      .join('\n\n');
  }, [playbackDrafts, selectedApartment]);

  /* ── Validacion de conexiones (con las ediciones de debug aplicadas) ── */
  const validation = useMemo(() => {
    if (!selectedApartment) return null;
    const scenes = selectedApartment.scenes.map((s) => ({ ...s, hotspots: effectiveHotspots(s, edits) }));
    const sceneIds = new Set(scenes.map((s) => s.id));
    const issues: { kind: 'broken' | 'missing-reciprocal' | 'orphan'; msg: string }[] = [];

    // Hotspots que apuntan a escenas inexistentes
    scenes.forEach((s) => {
      s.hotspots.forEach((h) => {
        if (h.type === 'scene' && h.targetSceneId && !sceneIds.has(h.targetSceneId)) {
          issues.push({
            kind: 'broken',
            msg: `${s.id}: hotspot "${h.label}" apunta a escena inexistente "${h.targetSceneId}"`,
          });
        }
      });
    });

    // Reciprocidad: si A tiene hotspot a B, ¿B tiene hotspot a A?
    scenes.forEach((s) => {
      s.hotspots.forEach((h) => {
        if (h.type !== 'scene' || !h.targetSceneId) return;
        const target = scenes.find((x) => x.id === h.targetSceneId);
        if (!target) return;
        const reciprocal = target.hotspots.some(
          (rh) => rh.type === 'scene' && rh.targetSceneId === s.id,
        );
        if (!reciprocal) {
          issues.push({
            kind: 'missing-reciprocal',
            msg: `${s.id} → ${target.id}: falta el camino de regreso ${target.id} → ${s.id}`,
          });
        }
      });
    });

    // Escenas huerfanas: nadie llega a ellas (excepto la primera)
    const firstSceneId = scenes[0]?.id;
    scenes.forEach((s) => {
      if (s.id === firstSceneId) return;
      const hasInbound = scenes.some((other) =>
        other.hotspots.some((h) => h.type === 'scene' && h.targetSceneId === s.id),
      );
      if (!hasInbound) {
        issues.push({ kind: 'orphan', msg: `${s.id} no tiene ningun hotspot entrante` });
      }
    });

    return { issues, byKind: { broken: 0, 'missing-reciprocal': 0, orphan: 0 } };
  }, [selectedApartment, edits]);

  if (validation) {
    validation.issues.forEach((i) => (validation.byKind[i.kind] += 1));
  }

  /* ── Snippet exporters ─────────────────────────────────────── */
  const exportSceneSnippet = useCallback(() => {
    if (!currentScene) return '';
    const hsLines = spots.map(({ status: _s, ...h }) => hotspotSnippet(h, '        ')).join('\n');
    const vb = effectiveVariantButton(currentScene, edits);
    const vbLine = vb ? `      variantButton: { pitch: ${vb.pitch}, yaw: ${vb.yaw} },\n` : '';
    return `// Escena: ${currentScene.name} (${currentScene.id})
    {
      id: '${currentScene.id}',
      name: '${currentScene.name}',
      description: '${currentScene.description ?? ''}',
      panorama: PANO('${currentScene.panorama.split('/').pop()}'),
      defaultView: { pitch: ${currentScene.defaultView?.pitch ?? 0}, yaw: ${currentScene.defaultView?.yaw ?? 0}, hfov: ${currentScene.defaultView?.hfov ?? 100} },
${vbLine}      hotspots: [
${hsLines}
      ],
    },`;
  }, [currentScene, spots, edits]);

  // Todas las vistas con cambios: bloque hotspots completo (y variantButton si se movio)
  const exportEditedScenes = useCallback(() => {
    if (!editedScenes.length) return '// (sin cambios guardados)';
    return editedScenes
      .map((s) => {
        const hs = effectiveHotspots(s, edits).map(({ status: _s, ...h }) => hotspotSnippet(h, '  ')).join('\n');
        const vb = edits.variantBtn[s.id];
        return [
          `// ── VISTA ${s.name.toUpperCase()} (${s.id}) ──`,
          ...(vb ? [`variantButton: { pitch: ${vb.pitch}, yaw: ${vb.yaw} },`] : []),
          `hotspots: [`,
          hs,
          `],`,
        ].join('\n');
      })
      .join('\n\n');
  }, [editedScenes, edits]);

  const exportFloorPlanSnippet = useCallback(() => {
    const rooms = selectedApartment?.floorPlan?.rooms ?? [];
    if (!rooms.length) return '// No hay rooms en este apartamento';
    const lines = rooms.map(
      (r) => `        {
          id: '${r.id}',
          sceneId: '${r.sceneId}',
          label: '${r.label}',
          x: ${r.x}, y: ${r.y}, width: ${r.width}, height: ${r.height},
          dotX: ${r.dotX ?? 50}, dotY: ${r.dotY ?? 50},
          adjacentTo: [${(r.adjacentTo ?? []).map((a) => `'${a}'`).join(', ')}],
        },`,
    );
    return `// Floor plan: ${selectedApartment?.name ?? ''}
floorPlan: {
  width: ${selectedApartment?.floorPlan?.width ?? 1000},
  height: ${selectedApartment?.floorPlan?.height ?? 800},
  background: '${selectedApartment?.floorPlan?.background ?? 'transparent'}',
  ${selectedApartment?.floorPlan?.backgroundImage ? `backgroundImage: '${selectedApartment.floorPlan.backgroundImage}',` : ''}
  rooms: [
${lines.join('\n')}
  ],
},`;
  }, [selectedApartment]);

  if (!debugEnabled) return null;
  if (!coords) return null;

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <>
      {/* Crosshair central */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 199,
          pointerEvents: 'none',
          width: 80,
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            border: '2px solid #5DD5F0',
            borderRadius: '50%',
            boxShadow:
              '0 0 12px rgba(93,213,240,0.6), inset 0 0 8px rgba(93,213,240,0.3)',
            opacity: 0.85,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 36,
            height: 36,
            border: '1px solid rgba(93,213,240,0.6)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 80,
            height: 1,
            background:
              'linear-gradient(to right, transparent 0%, rgba(93,213,240,0.9) 30%, rgba(93,213,240,0.9) 70%, transparent 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 1,
            height: 80,
            background:
              'linear-gradient(to bottom, transparent 0%, rgba(93,213,240,0.9) 30%, rgba(93,213,240,0.9) 70%, transparent 100%)',
          }}
        />
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: '#FFFFFF',
            boxShadow: '0 0 6px #5DD5F0, 0 0 2px #FFF',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '100%',
            marginTop: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.85)',
            border: '1px solid rgba(93,213,240,0.5)',
            borderRadius: 6,
            padding: '4px 10px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: 12,
            color: '#5DD5F0',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
          }}
        >
          <span style={{ opacity: 0.6 }}>yaw </span>
          <b style={{ color: '#FFF' }}>{coords.yaw}</b>
          <span style={{ opacity: 0.4, margin: '0 6px' }}>·</span>
          <span style={{ opacity: 0.6 }}>pitch </span>
          <b style={{ color: '#FFF' }}>{coords.pitch}</b>
        </div>
      </div>

      {/* PANEL principal */}
      <div
        style={{
          position: 'absolute',
          top: 70,
          left: 12,
          zIndex: 200,
          background: 'rgba(0,0,0,0.9)',
          border: '1px solid rgba(255, 255, 255,0.35)',
          borderRadius: 10,
          minWidth: collapsed ? 200 : 360,
          maxWidth: 420,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          fontSize: 12,
          color: '#FFFFFF',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        {/* Header con escena selector + collapse */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 10px',
            borderBottom: collapsed ? 'none' : '1px solid rgba(255, 255, 255,0.18)',
          }}
        >
          <button
            onClick={() => setCollapsed((c) => !c)}
            title="Colapsar / expandir (tecla D)"
            style={{
              padding: '2px 8px',
              fontSize: 11,
              fontWeight: 700,
              background: 'rgba(93,213,240,0.18)',
              border: '1px solid rgba(93,213,240,0.5)',
              borderRadius: 4,
              color: '#5DD5F0',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {collapsed ? '▶' : '▼'} DEBUG
          </button>

          {!collapsed && (
            <>
              {/* Apartamento selector */}
              <select
                value={selectedApartment?.id ?? ''}
                onChange={(e) => {
                  const apt = allApartments.find((a) => a.id === e.target.value);
                  if (apt) setApartmentAtScene(apt, apt.scenes[0]?.id ?? '');
                }}
                title="Saltar a otro apartamento"
                style={{
                  flex: 0,
                  background: 'rgba(255,255,255,0.05)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255,0.25)',
                  borderRadius: 4,
                  padding: '3px 4px',
                  fontSize: 10,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                {allApartments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>

              {/* Escena selector */}
              <select
                value={currentSceneId}
                onChange={(e) => setCurrentScene(e.target.value)}
                title="Saltar a otra escena"
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.05)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255,0.25)',
                  borderRadius: 4,
                  padding: '3px 4px',
                  fontSize: 10,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                {(selectedApartment?.scenes ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        {!collapsed && (
          <>
            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid rgba(255, 255, 255,0.18)',
                background: 'rgba(0,0,0,0.3)',
              }}
            >
              {[
                { id: 'hotspots' as Tab, label: 'Hotspots', count: spots.length },
                { id: 'variants' as Tab, label: 'Variante', count: currentScene?.variants?.length ?? 0 },
                { id: 'playback' as Tab, label: 'Play', count: pbAnims.length },
                { id: 'plan' as Tab, label: 'Floor', count: selectedApartment?.floorPlan?.rooms?.length ?? 0 },
                { id: 'export' as Tab, label: 'Export' },
                { id: 'check' as Tab, label: 'Check', count: validation?.issues.length ?? 0 },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    flex: 1,
                    padding: '6px 4px',
                    fontSize: 10,
                    fontWeight: tab === t.id ? 700 : 500,
                    border: 'none',
                    background: tab === t.id ? 'rgba(255, 255, 255,0.1)' : 'transparent',
                    color: tab === t.id ? '#FFFFFF' : 'rgba(255, 255, 255,0.55)',
                    cursor: 'pointer',
                    borderBottom: tab === t.id ? '2px solid #5DD5F0' : '2px solid transparent',
                    fontFamily: 'inherit',
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                  }}
                >
                  {t.label}
                  {t.count !== undefined && (
                    <span style={{ marginLeft: 4, opacity: 0.7, fontSize: 9 }}>({t.count})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Live coords resumen */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderBottom: '1px solid rgba(255, 255, 255,0.18)',
                background: 'rgba(93,213,240,0.04)',
              }}
            >
              <div style={{ fontSize: 11 }}>
                <span style={{ opacity: 0.55 }}>yaw </span>
                <b style={{ fontSize: 13 }}>{coords.yaw}</b>
                <span style={{ opacity: 0.3, margin: '0 6px' }}>·</span>
                <span style={{ opacity: 0.55 }}>pitch </span>
                <b style={{ fontSize: 13 }}>{coords.pitch}</b>
                <span style={{ opacity: 0.3, margin: '0 6px' }}>·</span>
                <span style={{ opacity: 0.55 }}>hfov </span>
                <span style={{ opacity: 0.85 }}>{coords.hfov}</span>
              </div>
              <button
                onClick={() => copy(`pitch: ${coords.pitch}, yaw: ${coords.yaw}`, 'pair')}
                title="Copiar pitch/yaw del crosshair"
                style={{
                  padding: '3px 9px',
                  fontSize: 10,
                  background: 'rgba(93,213,240,0.18)',
                  border: '1px solid rgba(93,213,240,0.5)',
                  borderRadius: 4,
                  color: '#5DD5F0',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: 700,
                }}
              >
                {copied === 'pair' ? '✓' : 'copy p/y'}
              </button>
            </div>

            {/* Tab content */}
            <div style={{ maxHeight: 380, overflowY: 'auto', padding: '8px 10px' }}>
              {tab === 'hotspots' && (
                <>
                  <div
                    style={{
                      fontSize: 10,
                      opacity: 0.75,
                      padding: 6,
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: 4,
                      marginBottom: 8,
                      lineHeight: 1.5,
                    }}
                  >
                    <b style={{ color: CYAN }}>Arrastra los spots</b> en el panorama: al soltarlos se
                    guarda la vista y el pitch/yaw (sobrevive a recargas). Un click sin arrastrar
                    sigue navegando.
                  </div>

                  <button onClick={addSpotHere} style={btn('cyan', { width: '100%', border: '1px dashed rgba(93,213,240,0.5)', fontSize: 11, marginBottom: 8 })}>
                    + Agregar spot en el crosshair
                  </button>

                  <div style={labelStyle}>Spots de esta vista ({spots.length})</div>
                  {spots.length === 0 && (
                    <div style={{ opacity: 0.5, fontSize: 10, padding: 4, textAlign: 'center' }}>
                      Esta vista no tiene spots todavía.
                    </div>
                  )}
                  {spots.map((h) => {
                    const dYaw = Math.round((coords.yaw - h.yaw) * 10) / 10;
                    const aligned = Math.abs(dYaw) < 3;
                    const badge =
                      h.status === 'added'
                        ? { txt: 'NUEVO', fg: '#80E090', bg: 'rgba(80,200,120,0.14)' }
                        : h.status === 'moved'
                          ? { txt: 'MOVIDO', fg: '#FFC080', bg: 'rgba(255,180,80,0.14)' }
                          : null;
                    return (
                      <div
                        key={h.id}
                        style={{
                          background: aligned ? 'rgba(93,213,240,0.12)' : 'rgba(255,255,255,0.04)',
                          border: aligned ? '1px solid rgba(93,213,240,0.4)' : '1px solid transparent',
                          borderRadius: 4,
                          padding: '5px 7px',
                          marginBottom: 3,
                          fontSize: 10,
                        }}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 6, alignItems: 'center' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                            {badge && (
                              <span style={{ fontSize: 8, color: badge.fg, background: badge.bg, padding: '1px 4px', borderRadius: 3, marginRight: 5 }}>
                                {badge.txt}
                              </span>
                            )}
                            {h.label}
                          </span>
                          <span style={{ opacity: 0.8, fontSize: 9 }}>
                            p:{h.pitch} y:{h.yaw}
                          </span>
                          <button
                            onClick={() => { try { viewerHandle.current?.lookAt?.(h.pitch, h.yaw, 100); } catch {} }}
                            title="Apuntar la camara al spot"
                            style={btn('ghost', { padding: '1px 6px', fontSize: 9 })}
                          >
                            go
                          </button>
                          <button
                            onClick={() => debugActions.removeHotspot(currentSceneId, h.id)}
                            title="Borrar este spot"
                            style={btn('danger', { padding: '1px 6px', fontSize: 9 })}
                          >
                            ×
                          </button>
                        </div>
                        {h.status === 'added' && (
                          <select
                            value={h.targetSceneId ?? ''}
                            onChange={(e) => setSpotTarget(h.id, e.target.value)}
                            style={{
                              width: '100%',
                              marginTop: 4,
                              background: 'rgba(0,0,0,0.4)',
                              border: `1px solid ${h.targetSceneId ? 'rgba(255, 255, 255,0.2)' : 'rgba(255,180,80,0.6)'}`,
                              borderRadius: 3,
                              color: '#FFFFFF',
                              padding: '2px 5px',
                              fontSize: 10,
                              fontFamily: 'inherit',
                            }}
                          >
                            <option value="">-- ¿a qué vista lleva? --</option>
                            {(selectedApartment?.scenes ?? [])
                              .filter((s) => s.id !== currentSceneId)
                              .map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                          </select>
                        )}
                      </div>
                    );
                  })}

                  {/* Cambios guardados en todas las vistas */}
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255, 255, 255,0.18)' }}>
                    <div style={labelStyle}>Cambios guardados ({editedScenes.length} vistas)</div>
                    {editedScenes.length === 0 ? (
                      <div style={{ opacity: 0.5, fontSize: 10, padding: 4 }}>Aún no has movido ni creado spots.</div>
                    ) : (
                      <>
                        {editedScenes.map((s) => (
                          <div
                            key={s.id}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, padding: '2px 0' }}
                          >
                            <button
                              onClick={() => setCurrentScene(s.id)}
                              title="Ir a esta vista"
                              style={{ background: 'none', border: 'none', color: s.id === currentSceneId ? CYAN : '#FFFFFF', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, padding: 0, textAlign: 'left' }}
                            >
                              {s.name}
                            </button>
                            <button
                              onClick={() => debugActions.clearScene(s.id)}
                              title="Descartar los cambios de esta vista"
                              style={btn('warn', { padding: '1px 6px', fontSize: 9 })}
                            >
                              descartar
                            </button>
                          </div>
                        ))}
                        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                          <button onClick={() => copy(exportEditedScenes(), 'edited')} style={btn('green', { flex: 1 })}>
                            {copied === 'edited' ? '✓ copiado' : 'Copiar cambios (todas las vistas)'}
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('¿Descartar los cambios de TODAS las vistas?')) debugActions.clearAll();
                            }}
                            style={btn('danger')}
                          >
                            descartar todo
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {tab === 'variants' && (
                <>
                  {currentScene?.variants && currentScene.variants.length > 0 ? (
                    <>
                      <div
                        style={{
                          fontSize: 9,
                          opacity: 0.55,
                          letterSpacing: 1,
                          marginBottom: 6,
                        }}
                      >
                        VARIANTES ({currentScene.variants.length})
                      </div>
                      {currentScene.variants.map((v) => (
                        <div
                          key={v.id}
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            borderRadius: 4,
                            padding: '5px 7px',
                            marginBottom: 3,
                            fontSize: 10,
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{v.label}</div>
                          <div style={{ opacity: 0.6, fontSize: 9 }}>
                            {v.linkSceneId ? `→ link a ${v.linkSceneId}` : v.panorama?.split('/').pop()}
                          </div>
                        </div>
                      ))}

                      <div
                        style={{
                          marginTop: 10,
                          paddingTop: 8,
                          borderTop: '1px solid rgba(255, 255, 255,0.18)',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            opacity: 0.55,
                            letterSpacing: 1,
                            marginBottom: 4,
                          }}
                        >
                          BOTON DE VARIANTE
                        </div>
                        <div
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            borderRadius: 4,
                            padding: '5px 7px',
                            marginBottom: 6,
                            fontSize: 10,
                            opacity: 0.85,
                          }}
                        >
                          en config:{' '}
                          {currentScene.variantButton
                            ? `p:${currentScene.variantButton.pitch}, y:${currentScene.variantButton.yaw}`
                            : '(no fijado)'}
                        </div>
                        {edits.variantBtn[currentSceneId] && (
                          <div
                            style={{
                              background: 'rgba(255,180,80,0.12)',
                              border: '1px solid rgba(255,180,80,0.4)',
                              borderRadius: 4,
                              padding: '5px 7px',
                              marginBottom: 6,
                              fontSize: 10,
                            }}
                          >
                            <b style={{ color: '#FFC080' }}>movido:</b> p:{edits.variantBtn[currentSceneId].pitch}, y:
                            {edits.variantBtn[currentSceneId].yaw}
                          </div>
                        )}
                        <div style={{ fontSize: 9, opacity: 0.6, marginBottom: 6 }}>
                          También puedes arrastrar el botón directamente en el panorama.
                        </div>
                        <button
                          onClick={setVariantBtnHere}
                          style={{
                            width: '100%',
                            padding: '5px 10px',
                            fontSize: 10,
                            background: 'rgba(93,213,240,0.15)',
                            border: '1px dashed rgba(93,213,240,0.5)',
                            borderRadius: 4,
                            color: '#5DD5F0',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            fontWeight: 700,
                          }}
                        >
                          + Fijar boton de variante en el crosshair
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ opacity: 0.55, fontSize: 11, padding: 8 }}>
                      Esta escena no tiene variantes definidas.
                    </div>
                  )}
                </>
              )}

              {tab === 'playback' && (
                <>
                  <div
                    style={{
                      fontSize: 10,
                      opacity: 0.7,
                      padding: 6,
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: 4,
                      marginBottom: 8,
                      lineHeight: 1.5,
                    }}
                  >
                    Recorrido <b style={{ color: CYAN }}>hacia las salidas</b>. Ajusta
                    velocidad/HFOV, captura tramos o genéralos desde los hotspots,
                    previsualiza y exporta.
                  </div>

                  {/* Ajustes de velocidad / HFOV */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255, 255, 255,0.18)', borderRadius: 6, padding: 7, marginBottom: 8 }}>
                    <div style={labelStyle}>Velocidad / HFOV (preview + export)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                      {([
                        ['Pan °/s', 'panSpeed', 1, 40, 1],
                        ['Transición °/s', 'transitionSpeed', 2, 80, 1],
                        ['Toma fija (ms)', 'staticHoldMs', 500, 8000, 100],
                        ['HFOV', 'hfov', 60, 150, 1],
                      ] as const).map(([label, key, min, max, step]) => (
                        <label key={key} style={{ fontSize: 9, opacity: 0.85, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span>{label}: <b style={{ color: CYAN }}>{pbSettings[key]}</b></span>
                          <input
                            type="range" min={min} max={max} step={step} value={pbSettings[key]}
                            onChange={(e) => setPbSettings((s) => ({ ...s, [key]: Number(e.target.value) }))}
                            style={{ width: '100%', accentColor: CYAN }}
                          />
                        </label>
                      ))}
                    </div>
                    <button onClick={() => copy(exportPlaybackSettings(), 'pb-settings')} style={btn('cyan', { width: '100%', marginTop: 7 })}>
                      {copied === 'pb-settings' ? '✓ ajustes copiados' : 'Copiar ajustes (bloque playback)'}
                    </button>
                  </div>

                  {/* Autogenerar + toma estática */}
                  <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                    <button onClick={genFromExits} title="Crea una toma por cada salida (hotspot), ordenadas por yaw" style={btn('cyan', { flex: 1 })}>
                      ⚡ Generar desde salidas
                    </button>
                    <button onClick={addStaticHold} title="Agrega una toma estática mirando hacia el crosshair" style={btn('ghost')}>
                      + estática
                    </button>
                  </div>

                  {/* Captura from → to */}
                  <div style={{ display: 'flex', gap: 4, marginBottom: 6, padding: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 6, border: '1px solid rgba(255, 255, 255,0.18)' }}>
                    <button onClick={markFrom} title="Marca la vista actual como inicio del tramo" style={btn('cyan', { flex: 1, border: '1px dashed rgba(93,213,240,0.5)', background: pendingFrom ? 'rgba(93,213,240,0.28)' : 'rgba(93,213,240,0.12)' })}>
                      {pendingFrom ? `FROM ✓ (y:${pendingFrom.yaw})` : '① Marcar inicio'}
                    </button>
                    <button onClick={addSegment} title="Agrega el tramo desde el inicio marcado hasta la vista actual" style={btn('cyan', { flex: 1, border: '1px dashed rgba(93,213,240,0.5)', background: 'rgba(93,213,240,0.12)' })}>
                      ② Agregar tramo → aquí
                    </button>
                  </div>

                  <button
                    onClick={previewing ? stopPreview : previewPlayback}
                    disabled={!pbAnims.length}
                    style={btn(previewing ? 'danger' : 'green', { width: '100%', padding: '7px 10px', fontSize: 11, marginBottom: 8, cursor: pbAnims.length ? 'pointer' : 'not-allowed', opacity: pbAnims.length ? 1 : 0.4 })}
                  >
                    {previewing ? '■ Detener preview' : '▶ Previsualizar recorrido'}
                  </button>

                  {pbAnims.length > 0 ? (
                    <>
                      <div style={labelStyle}>Tramos ({pbAnims.length})</div>
                      {pbAnims.map((a, i) => {
                        const isStatic = Math.abs(a.from.yaw - a.to.yaw) < 1 && Math.abs(a.from.pitch - a.to.pitch) < 1;
                        return (
                          <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 5, padding: '4px 7px', marginBottom: 3, fontSize: 10, display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ opacity: 0.45, minWidth: 16 }}>{i + 1}</span>
                            <span style={{ flex: 1, fontSize: 9 }}>
                              {isStatic ? (<>mira <b>y:{a.to.yaw}</b> p:{a.to.pitch}</>) : (<>y:{a.from.yaw}→<b>{a.to.yaw}</b> · p:{a.from.pitch}→{a.to.pitch}</>)}
                            </span>
                            <button onClick={() => { try { viewerHandle.current?.lookAt?.(a.from.pitch, a.from.yaw, pbSettings.hfov, 400); } catch {} }} title="Apuntar al inicio de este tramo" style={btn('ghost', { padding: '1px 7px', fontSize: 9 })}>go</button>
                          </div>
                        );
                      })}
                      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                        <button onClick={removeLastSegment} style={btn('warn', { flex: 1 })}>↶ Quitar último</button>
                        <button onClick={clearSceneAnims} style={btn('danger', { flex: 1 })}>× Limpiar escena</button>
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                        <button onClick={() => copy(exportPlaybackScene(), 'pb-scene')} style={btn('cyan', { flex: 1 })}>
                          {copied === 'pb-scene' ? '✓ copiado' : 'Copiar esta escena'}
                        </button>
                        <button onClick={() => copy(exportPlaybackAll(), 'pb-all')} title="Exporta las animaciones de todas las escenas capturadas" style={btn('cyan', { flex: 1, background: 'rgba(93,213,240,0.1)' })}>
                          {copied === 'pb-all' ? '✓ copiado' : 'Copiar TODAS'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ opacity: 0.5, fontSize: 10, padding: 4, textAlign: 'center' }}>
                      Sin tramos aún. Usa <b style={{ color: CYAN }}>⚡ Generar desde salidas</b> o captura con ① / ②.
                    </div>
                  )}
                </>
              )}

              {tab === 'plan' && (
                <>
                  <div
                    style={{
                      fontSize: 9,
                      opacity: 0.55,
                      letterSpacing: 1,
                      marginBottom: 6,
                    }}
                  >
                    FLOOR PLAN — {selectedApartment?.floorPlan?.rooms?.length ?? 0} ROOMS
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      opacity: 0.7,
                      padding: 6,
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: 4,
                      marginBottom: 6,
                      lineHeight: 1.5,
                    }}
                  >
                    Para mover las burbujas, abre el Floor Plan (icono mapa en la sidebar) y
                    expandelo. Veras el modo arrastre activo. El boton{' '}
                    <b style={{ color: '#5DD5F0' }}>copiar todo</b> trae el snippet ya hecho.
                  </div>
                  {(selectedApartment?.floorPlan?.rooms ?? []).map((r) => (
                    <div
                      key={r.id}
                      style={{
                        background: r.sceneId === currentSceneId
                          ? 'rgba(93,213,240,0.12)'
                          : 'rgba(255,255,255,0.04)',
                        border: r.sceneId === currentSceneId
                          ? '1px solid rgba(93,213,240,0.4)'
                          : '1px solid transparent',
                        borderRadius: 4,
                        padding: '5px 7px',
                        marginBottom: 3,
                        fontSize: 10,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{r.label}</span>
                      <span style={{ opacity: 0.7, fontSize: 9 }}>
                        dx:{r.dotX} dy:{r.dotY}
                      </span>
                    </div>
                  ))}
                </>
              )}

              {tab === 'export' && (
                <>
                  <button
                    onClick={() => copy(exportSceneSnippet(), 'export-scene')}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      fontSize: 11,
                      background: 'rgba(93,213,240,0.18)',
                      border: '1px solid rgba(93,213,240,0.5)',
                      borderRadius: 5,
                      color: '#5DD5F0',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontWeight: 700,
                      marginBottom: 6,
                      textAlign: 'left',
                    }}
                  >
                    {copied === 'export-scene'
                      ? '✓ Escena copiada (spots editados + variantButton incluidos)'
                      : 'Exportar escena actual completa'}
                  </button>
                  <button
                    onClick={() => copy(exportFloorPlanSnippet(), 'export-plan')}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      fontSize: 11,
                      background: 'rgba(93,213,240,0.18)',
                      border: '1px solid rgba(93,213,240,0.5)',
                      borderRadius: 5,
                      color: '#5DD5F0',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontWeight: 700,
                      marginBottom: 6,
                      textAlign: 'left',
                    }}
                  >
                    {copied === 'export-plan' ? '✓ Floor plan copiado' : 'Exportar floor plan completo'}
                  </button>
                  <div
                    style={{
                      fontSize: 9,
                      opacity: 0.5,
                      lineHeight: 1.5,
                      padding: 6,
                      marginTop: 4,
                    }}
                  >
                    Los snippets vienen en formato TS listo para pegar en{' '}
                    <code style={{ color: '#5DD5F0' }}>tour.config.ts</code>. Ajusta el helper{' '}
                    <code>PANO()</code> al de tu proyecto y los <code>defaultView</code> manualmente
                    si quieres una vista inicial concreta.
                  </div>
                </>
              )}

              {tab === 'check' && (
                <>
                  {validation && validation.issues.length === 0 ? (
                    <div
                      style={{
                        padding: 8,
                        background: 'rgba(80,200,120,0.12)',
                        border: '1px solid rgba(80,200,120,0.4)',
                        borderRadius: 4,
                        color: '#80E090',
                        fontSize: 11,
                        textAlign: 'center',
                      }}
                    >
                      ✓ Sin problemas detectados en este apartamento
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 6, fontSize: 9 }}>
                        <span
                          style={{
                            background: 'rgba(255,80,80,0.15)',
                            color: '#FF8888',
                            padding: '2px 6px',
                            borderRadius: 3,
                          }}
                        >
                          rotos: {validation?.byKind.broken ?? 0}
                        </span>
                        <span
                          style={{
                            background: 'rgba(255,180,80,0.15)',
                            color: '#FFC080',
                            padding: '2px 6px',
                            borderRadius: 3,
                          }}
                        >
                          sin vuelta: {validation?.byKind['missing-reciprocal'] ?? 0}
                        </span>
                        <span
                          style={{
                            background: 'rgba(180,180,180,0.15)',
                            color: '#CCCCCC',
                            padding: '2px 6px',
                            borderRadius: 3,
                          }}
                        >
                          huerfanas: {validation?.byKind.orphan ?? 0}
                        </span>
                      </div>
                      {validation?.issues.map((i, idx) => (
                        <div
                          key={idx}
                          style={{
                            fontSize: 9,
                            padding: '4px 6px',
                            marginBottom: 3,
                            background:
                              i.kind === 'broken'
                                ? 'rgba(255,80,80,0.08)'
                                : i.kind === 'missing-reciprocal'
                                  ? 'rgba(255,180,80,0.08)'
                                  : 'rgba(180,180,180,0.08)',
                            borderLeft:
                              i.kind === 'broken'
                                ? '2px solid #FF8888'
                                : i.kind === 'missing-reciprocal'
                                  ? '2px solid #FFC080'
                                  : '2px solid #888',
                            borderRadius: 3,
                            color: '#FFFFFF',
                            lineHeight: 1.4,
                          }}
                        >
                          {i.msg}
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Hint footer */}
            <div
              style={{
                fontSize: 9,
                opacity: 0.4,
                padding: '4px 10px 8px',
                borderTop: '1px solid rgba(255, 255, 255,0.1)',
                lineHeight: 1.4,
              }}
            >
              <kbd
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  padding: '0 4px',
                  borderRadius: 2,
                }}
              >
                D
              </kbd>{' '}
              colapsa · arrastra la escena para apuntar · usa los dropdowns para saltar
            </div>
          </>
        )}
      </div>
    </>
  );
}
