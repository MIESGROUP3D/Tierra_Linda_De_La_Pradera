'use client';

/* ─────────────────────────────────────────────────────────────────────
 *  Ediciones del modo debug (?debug=1) sobre hotspots y boton de variante.
 *
 *  Guarda, por escena, los spots arrastrados, los nuevos y los borrados.
 *  Persiste en localStorage: sobrevive a recargas y a cambios de escena
 *  hasta que se exporta y se pega en tour.config.ts (o se descarta).
 *  Nunca se aplica fuera de debug ni en produccion.
 *  ───────────────────────────────────────────────────────────────── */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HotspotConfig, SceneConfig } from './tour-types';

export interface SpotPos {
  pitch: number;
  yaw: number;
}

interface DebugEditsState {
  /** sceneId -> hotspotId -> nueva posicion (spots que ya estaban en config) */
  moved: Record<string, Record<string, SpotPos>>;
  /** sceneId -> spots creados en debug */
  added: Record<string, HotspotConfig[]>;
  /** sceneId -> ids de spots de config borrados */
  removed: Record<string, string[]>;
  /** sceneId -> nueva posicion del boton de variante */
  variantBtn: Record<string, SpotPos>;
  /** Sube al agregar/borrar: el visor se reconstruye para mostrarlo */
  rev: number;

  moveHotspot: (sceneId: string, hotspotId: string, pos: SpotPos) => void;
  addHotspot: (sceneId: string, hs: HotspotConfig) => void;
  updateAdded: (sceneId: string, hotspotId: string, patch: Partial<HotspotConfig>) => void;
  removeHotspot: (sceneId: string, hotspotId: string) => void;
  moveVariantButton: (sceneId: string, pos: SpotPos) => void;
  clearScene: (sceneId: string) => void;
  clearAll: () => void;
  /** Fuerza reconstruir la escena (p.ej. tras fijar el boton de variante desde el panel) */
  bump: () => void;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
/** Normaliza yaw a (-180, 180] y redondea a 1 decimal, como en config. */
export const normPos = ({ pitch, yaw }: SpotPos): SpotPos => {
  let y = ((yaw + 180) % 360 + 360) % 360 - 180;
  if (y === -180) y = 180;
  return { pitch: round1(pitch), yaw: round1(y) };
};

const omit = <T>(rec: Record<string, T>, key: string) => {
  const next = { ...rec };
  delete next[key];
  return next;
};

export const useDebugEdits = create<DebugEditsState>()(
  persist(
    (set) => ({
      moved: {},
      added: {},
      removed: {},
      variantBtn: {},
      rev: 0,

      moveHotspot: (sceneId, hotspotId, pos) =>
        set((s) => {
          const p = normPos(pos);
          // Si es un spot nuevo, se actualiza en `added`
          if ((s.added[sceneId] ?? []).some((h) => h.id === hotspotId)) {
            return {
              added: {
                ...s.added,
                [sceneId]: s.added[sceneId].map((h) => (h.id === hotspotId ? { ...h, ...p } : h)),
              },
            };
          }
          return { moved: { ...s.moved, [sceneId]: { ...(s.moved[sceneId] ?? {}), [hotspotId]: p } } };
        }),

      addHotspot: (sceneId, hs) =>
        set((s) => ({
          added: { ...s.added, [sceneId]: [...(s.added[sceneId] ?? []), { ...hs, ...normPos(hs) }] },
          rev: s.rev + 1,
        })),

      updateAdded: (sceneId, hotspotId, patch) =>
        set((s) => ({
          added: {
            ...s.added,
            [sceneId]: (s.added[sceneId] ?? []).map((h) => (h.id === hotspotId ? { ...h, ...patch } : h)),
          },
          rev: s.rev + 1,
        })),

      removeHotspot: (sceneId, hotspotId) =>
        set((s) => {
          const isAdded = (s.added[sceneId] ?? []).some((h) => h.id === hotspotId);
          if (isAdded) {
            return {
              added: { ...s.added, [sceneId]: s.added[sceneId].filter((h) => h.id !== hotspotId) },
              rev: s.rev + 1,
            };
          }
          const movedScene = omit(s.moved[sceneId] ?? {}, hotspotId);
          return {
            removed: { ...s.removed, [sceneId]: [...new Set([...(s.removed[sceneId] ?? []), hotspotId])] },
            moved: { ...s.moved, [sceneId]: movedScene },
            rev: s.rev + 1,
          };
        }),

      moveVariantButton: (sceneId, pos) =>
        set((s) => ({ variantBtn: { ...s.variantBtn, [sceneId]: normPos(pos) } })),

      clearScene: (sceneId) =>
        set((s) => ({
          moved: omit(s.moved, sceneId),
          added: omit(s.added, sceneId),
          removed: omit(s.removed, sceneId),
          variantBtn: omit(s.variantBtn, sceneId),
          rev: s.rev + 1,
        })),

      clearAll: () => set((s) => ({ moved: {}, added: {}, removed: {}, variantBtn: {}, rev: s.rev + 1 })),

      bump: () => set((s) => ({ rev: s.rev + 1 })),
    }),
    {
      name: 'tour-debug-edits-v1',
      partialize: (s) => ({ moved: s.moved, added: s.added, removed: s.removed, variantBtn: s.variantBtn }),
    },
  ),
);

type EditsSnapshot = Pick<DebugEditsState, 'moved' | 'added' | 'removed' | 'variantBtn'>;

export type SpotStatus = 'config' | 'moved' | 'added';

/** Hotspots de la escena con las ediciones de debug aplicadas. */
export function effectiveHotspots(
  scene: SceneConfig,
  edits: EditsSnapshot,
): (HotspotConfig & { status: SpotStatus })[] {
  const moved = edits.moved[scene.id] ?? {};
  const removed = new Set(edits.removed[scene.id] ?? []);
  const inConfig = new Set((scene.hotspots ?? []).map((h) => h.id));
  const same = (a: SpotPos, b: SpotPos) => a.pitch === b.pitch && a.yaw === b.yaw;
  return [
    ...(scene.hotspots ?? [])
      .filter((h) => !removed.has(h.id))
      .map((h) =>
        moved[h.id] && !same(moved[h.id], h)
          ? { ...h, ...moved[h.id], status: 'moved' as const }
          : { ...h, status: 'config' as const },
      ),
    // Un spot nuevo que ya se pego en tour.config.ts deja de contar como nuevo
    ...(edits.added[scene.id] ?? []).filter((h) => !inConfig.has(h.id)).map((h) => ({ ...h, status: 'added' as const })),
  ];
}

export function effectiveVariantButton(scene: SceneConfig, edits: EditsSnapshot): SpotPos | undefined {
  return edits.variantBtn[scene.id] ?? scene.variantButton;
}

/** Hay cambios pendientes de pasar a tour.config.ts (ignora los ya pegados). */
export function sceneHasEdits(scene: SceneConfig, edits: EditsSnapshot): boolean {
  const vb = edits.variantBtn[scene.id];
  return (
    effectiveHotspots(scene, edits).some((h) => h.status !== 'config') ||
    (edits.removed[scene.id] ?? []).some((id) => (scene.hotspots ?? []).some((h) => h.id === id)) ||
    Boolean(vb && !(scene.variantButton && vb.pitch === scene.variantButton.pitch && vb.yaw === scene.variantButton.yaw))
  );
}

/** Debug activo y fuera de produccion. */
export function debugEditsEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    typeof window !== 'undefined' &&
    window.location.search.includes('debug=1')
  );
}
