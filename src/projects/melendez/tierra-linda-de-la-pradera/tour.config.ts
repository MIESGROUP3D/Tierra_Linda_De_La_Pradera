import { TourConfig } from '@/lib/tour-types';
import { assetPath } from '@/lib/asset-path';

// ============================================================
//  TIERRA LINDA DE LA PRADERA — CONSTRUCTORA MELENDEZ
//  Producido por MIESGROUP para Constructora Melendez
//
//  TOUR DISPONIBLE:
//    tierraLindaTipoG — Apartamento Tipo G (el Tipo F existe en planos, sin 360)
//
//  PALETA (la del logo): blanco #FFFFFF · cafe oscuro #766E6B ·
//    gris oscuro #333333 · rojo #E3000F
//
//  PENDIENTE:
//    - (hotspots de las 8 escenas calibrados arrastrando en ?debug=1)
//    - Puntos del plano: ubicados a ojo, afinar con ?debug=1
//
//  ACTIVACION:
//    Importado como default en src/lib/tour-store.ts
// ============================================================

// --- Rutas base de assets ---
const PANO_G = (path: string) => assetPath(`/projects/melendez/tierra-linda-de-la-pradera/panoramas/tipo-g/${path}`);
const PLAN   = (path: string) => assetPath(`/projects/melendez/tierra-linda-de-la-pradera/floor-plans/${path}`);
const BRAND  = (path: string) => assetPath(`/projects/melendez/branding/${path}`);

// --- Marca ---
const sharedBrand = {
  name: 'Tierra Linda de la Pradera',
  tagline: 'Constructora Meléndez',
  logo: BRAND('LogoTierraLindaHorizontal.png'),
  website: 'https://www.constructoramelendez.com',
};

// --- Tema visual (paleta del logo) ---
const sharedTheme = {
  primary: '#E3000F',
  secondary: '#FFFFFF',
  panelBg: 'rgba(51, 51, 51, 0.90)',
  textPrimary: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.50)',
  borderColor: 'rgba(118, 110, 107, 0.45)',
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
};

// ============================================================
//  TOUR — APARTAMENTO TIPO G
//
//  Escenas: Sala Comedor · Cocina · Balcon · Estudio · Alcoba Principal
//           Vestier Alcoba Principal · Alcoba Auxiliar · Opcion Multiple
//  Panoramas: public/projects/melendez/tierra-linda-de-la-pradera/panoramas/tipo-g/
//    sala-comedor.jpg · cocina.jpg · balcon.jpg · estudio.jpg
//    alcoba-principal.jpg · vestier-alcoba-principal.jpg · alcoba-auxiliar.jpg
//    opcion-multiple-habitacion.jpg · opcion-multiple-sala-tv.jpg
//
//  Hotspots calibrados arrastrando en ?debug=1 ("Copiar cambios").
// ============================================================
export const tierraLindaTipoG: TourConfig = {

  brand: sharedBrand,
  theme: sharedTheme,

  buildings: [
    {
      id: 'tierra-linda',
      name: 'Tierra Linda de la Pradera',
      floors: 1,
      apartmentsPerFloor: 1,

      apartments: [
        {
          id: 'tl-tipo-g',
          name: 'Apartamento Tipo G',
          description: 'Sala Comedor · Cocina · Balcón · Estudio · 2 Alcobas · Opción Múltiple',
          floor: 0,
          position: 0,
          // Datos del plano comercial "Apartamento Tipo G" (la opcion multiple
          // puede ser una 3a alcoba con el kit opcional)
          bedrooms: 2,
          bathrooms: 2,
          area: 69.83,
          areaPrivada: 60.34,
          // Sobre la torre central del render HOME (afinar con ?debug=1)
          hotspotX: 62, hotspotY: 32,
          cardDir: 'left',

          scenes: [

            // --- ESCENA: SALA COMEDOR ---
            {
              id: 'tl-tg-sala-comedor',
              name: 'Sala Comedor',
              description: 'Sala y comedor integrados',
              panorama: PANO_G('sala-comedor.jpg'),
              defaultView: { pitch: 0, yaw: 0, hfov: 100 },
              hotspots: [
                {
                  id: 'tl-tg-sala-to-balcon',
                  pitch: -1.6, yaw: -12.9,
                  type: 'scene',
                  label: 'Balcón',
                  description: 'Ir al balcón',
                  targetSceneId: 'tl-tg-balcon',
                },
                {
                  id: 'tl-tg-sala-to-cocina',
                  pitch: -2, yaw: 170.5,
                  type: 'scene',
                  label: 'Cocina',
                  description: 'Ir a la cocina',
                  targetSceneId: 'tl-tg-cocina',
                },
                {
                  id: 'tl-tg-sala-to-estudio',
                  pitch: -1, yaw: -109.6,
                  type: 'scene',
                  label: 'Estudio',
                  description: 'Ir al estudio',
                  targetSceneId: 'tl-tg-estudio',
                },
                {
                  id: 'tl-tg-sala-to-alcoba-principal',
                  pitch: 0.3, yaw: -94.5,
                  type: 'scene',
                  label: 'Alcoba Principal',
                  description: 'Ir a la alcoba principal',
                  targetSceneId: 'tl-tg-alcoba-principal',
                },
              ],
            },

            // --- ESCENA: COCINA ---
            {
              id: 'tl-tg-cocina',
              name: 'Cocina',
              description: 'Cocina',
              panorama: PANO_G('cocina.jpg'),
              defaultView: { pitch: 0, yaw: 0, hfov: 100 },
              hotspots: [
                {
                  id: 'tl-tg-cocina-to-balcon',
                  pitch: -1.2, yaw: -6.7,
                  type: 'scene',
                  label: 'Balcón',
                  description: 'Ir a balcón',
                  targetSceneId: 'tl-tg-balcon',
                },
                {
                  id: 'tl-tg-cocina-to-sala-comedor',
                  pitch: -19.9, yaw: 0.4,
                  type: 'scene',
                  label: 'Sala Comedor',
                  description: 'Ir a sala comedor',
                  targetSceneId: 'tl-tg-sala-comedor',
                },
              ],
            },

            // --- ESCENA: BALCON ---
            {
              id: 'tl-tg-balcon',
              name: 'Balcón',
              description: 'Balcón',
              panorama: PANO_G('balcon.jpg'),
              defaultView: { pitch: 0, yaw: 0, hfov: 100 },
              hotspots: [
                {
                  id: 'tl-tg-balcon-to-sala-comedor',
                  pitch: -25, yaw: 151.1,
                  type: 'scene',
                  label: 'Sala Comedor',
                  description: 'Ir a sala comedor',
                  targetSceneId: 'tl-tg-sala-comedor',
                },
                {
                  id: 'tl-tg-balcon-to-cocina',
                  pitch: -3.1, yaw: 169.4,
                  type: 'scene',
                  label: 'Cocina',
                  description: 'Ir a cocina',
                  targetSceneId: 'tl-tg-cocina',
                },
              ],
            },

            // --- ESCENA: ESTUDIO ---
            {
              id: 'tl-tg-estudio',
              name: 'Estudio',
              description: 'Estudio',
              panorama: PANO_G('estudio.jpg'),
              defaultView: { pitch: 0, yaw: 0, hfov: 100 },
              hotspots: [
                {
                  id: 'tl-tg-estudio-to-opcion-multiple',
                  pitch: -3.9, yaw: -16.4,
                  type: 'scene',
                  label: 'Opción Múltiple',
                  description: 'Ir a opción múltiple',
                  targetSceneId: 'tl-tg-opcion-multiple',
                },
                {
                  id: 'tl-tg-estudio-to-alcoba-auxiliar',
                  pitch: -4.5, yaw: -41,
                  type: 'scene',
                  label: 'Alcoba Auxiliar',
                  description: 'Ir a alcoba auxiliar',
                  targetSceneId: 'tl-tg-alcoba-auxiliar',
                },
                {
                  id: 'tl-tg-estudio-to-alcoba-principal',
                  pitch: -4.7, yaw: -55.9,
                  type: 'scene',
                  label: 'Alcoba Principal',
                  description: 'Ir a alcoba principal',
                  targetSceneId: 'tl-tg-alcoba-principal',
                },
                {
                  id: 'tl-tg-estudio-to-sala-comedor',
                  pitch: -4.8, yaw: 57.6,
                  type: 'scene',
                  label: 'Sala Comedor',
                  description: 'Ir a sala comedor',
                  targetSceneId: 'tl-tg-sala-comedor',
                },
              ],
            },

            // --- ESCENA: ALCOBA PRINCIPAL ---
            {
              id: 'tl-tg-alcoba-principal',
              name: 'Alcoba Principal',
              description: 'Alcoba principal',
              panorama: PANO_G('alcoba-principal.jpg'),
              defaultView: { pitch: 0, yaw: 0, hfov: 100 },
              hotspots: [
                {
                  id: 'tl-tg-alcoba-principal-to-vestier',
                  pitch: -2.6, yaw: -157.4,
                  type: 'scene',
                  label: 'Vestier Alcoba Principal',
                  description: 'Ir a vestier alcoba principal',
                  targetSceneId: 'tl-tg-vestier',
                },
                {
                  id: 'tl-tg-alcoba-principal-to-sala-comedor',
                  pitch: -3.5, yaw: 85.9,
                  type: 'scene',
                  label: 'Sala Comedor',
                  description: 'Ir a sala comedor',
                  targetSceneId: 'tl-tg-sala-comedor',
                },
                {
                  id: 'tl-tg-alcoba-principal-to-opcion-multiple',
                  pitch: -2.6, yaw: 70.1,
                  type: 'scene',
                  label: 'Opción Múltiple',
                  description: 'Ir a opción múltiple',
                  targetSceneId: 'tl-tg-opcion-multiple',
                },
                {
                  id: 'tl-tg-alcoba-principal-to-auxiliar',
                  pitch: -3, yaw: 57.8,
                  type: 'scene',
                  label: 'Alcoba Auxiliar',
                  description: 'Ir a alcoba auxiliar',
                  targetSceneId: 'tl-tg-alcoba-auxiliar',
                },
                {
                  id: 'tl-tg-alcoba-principal-to-estudio',
                  pitch: -21.6, yaw: 90.1,
                  type: 'scene',
                  label: 'Estudio',
                  description: 'Ir a estudio',
                  targetSceneId: 'tl-tg-estudio',
                },
              ],
            },

            // --- ESCENA: VESTIER ALCOBA PRINCIPAL ---
            {
              id: 'tl-tg-vestier',
              name: 'Vestier Alcoba Principal',
              description: 'Vestier de la alcoba principal',
              panorama: PANO_G('vestier-alcoba-principal.jpg'),
              defaultView: { pitch: 0, yaw: 0, hfov: 100 },
              hotspots: [
                {
                  id: 'tl-tg-vestier-to-alcoba-principal',
                  pitch: -6.2, yaw: -15.5,
                  type: 'scene',
                  label: 'Alcoba Principal',
                  description: 'Ir a alcoba principal',
                  targetSceneId: 'tl-tg-alcoba-principal',
                },
              ],
            },

            // --- ESCENA: ALCOBA AUXILIAR ---
            {
              id: 'tl-tg-alcoba-auxiliar',
              name: 'Alcoba Auxiliar',
              description: 'Segunda alcoba',
              panorama: PANO_G('alcoba-auxiliar.jpg'),
              defaultView: { pitch: 0, yaw: 0, hfov: 100 },
              hotspots: [
                {
                  id: 'tl-tg-alcoba-auxiliar-to-estudio',
                  pitch: -5.1, yaw: 161.3,
                  type: 'scene',
                  label: 'Estudio',
                  description: 'Ir a estudio',
                  targetSceneId: 'tl-tg-estudio',
                },
                {
                  id: 'tl-tg-alcoba-auxiliar-to-principal',
                  pitch: -3, yaw: -155.1,
                  type: 'scene',
                  label: 'Alcoba Principal',
                  description: 'Ir a alcoba principal',
                  targetSceneId: 'tl-tg-alcoba-principal',
                },
              ],
            },

            // --- ESCENA: OPCION MULTIPLE ---
            // Mismo espacio con dos amoblamientos: se alterna el panorama en
            // la misma escena (no navega a otra, a diferencia de Valle Alto).
            // PENDIENTE: ubicar variantButton con ?debug=1
            {
              id: 'tl-tg-opcion-multiple',
              name: 'Opción Múltiple',
              description: 'Espacio flexible: habitación o sala de TV',
              panorama: PANO_G('opcion-multiple-habitacion.jpg'),
              defaultView: { pitch: 0, yaw: 0, hfov: 100 },
              variants: [
                {
                  id: 'habitacion',
                  label: 'Como habitación',
                  panorama: PANO_G('opcion-multiple-habitacion.jpg'),
                },
                {
                  id: 'sala-tv',
                  label: 'Como sala de TV',
                  panorama: PANO_G('opcion-multiple-sala-tv.jpg'),
                },
              ],
              variantButton: { pitch: -10, yaw: 0 },
              hotspots: [
                {
                  id: 'tl-tg-opcion-multiple-to-estudio',
                  pitch: -6.7, yaw: 172.5,
                  type: 'scene',
                  label: 'Estudio',
                  description: 'Ir a estudio',
                  targetSceneId: 'tl-tg-estudio',
                },
              ],
            },

          ],

          // --- PLANO DE PLANTA TIPO G ---
          // Imagen: plano comercial Tipo G recortado y rellenado a 3:2 (el SVG del
          // mini-plano es 3:2), para que dotX/dotY coincidan con la imagen.
          // Original: _source-assets/.../branding/"Apto Tipo F -100.jpg" (nombre
          // cruzado en la entrega: ese archivo contiene el Tipo G).
          // dotX/dotY en % de la imagen; los rects (espacio 1000x600) son el area de click.
          floorPlan: {
            width: 1000,
            height: 600,
            background: 'transparent',
            backgroundImage: PLAN('apto-tipo-g.jpg'),
            rooms: [
              {
                id: 'fp-tg-sala-comedor',
                sceneId: 'tl-tg-sala-comedor',
                label: 'Sala Comedor',
                x: 680, y: 319, width: 40, height: 40,
                dotX: 70.0, dotY: 56.5,
                adjacentTo: ['tl-tg-cocina', 'tl-tg-balcon', 'tl-tg-estudio', 'tl-tg-opcion-multiple'],
              },
              {
                id: 'fp-tg-cocina',
                sceneId: 'tl-tg-cocina',
                label: 'Cocina',
                x: 649, y: 456, width: 40, height: 40,
                dotX: 66.9, dotY: 79.4,
                adjacentTo: ['tl-tg-sala-comedor'],
              },
              {
                id: 'fp-tg-balcon',
                sceneId: 'tl-tg-balcon',
                label: 'Balcón',
                x: 614, y: 231, width: 40, height: 40,
                dotX: 63.4, dotY: 41.8,
                adjacentTo: ['tl-tg-sala-comedor'],
              },
              {
                id: 'fp-tg-estudio',
                sceneId: 'tl-tg-estudio',
                label: 'Estudio',
                x: 473, y: 411, width: 40, height: 40,
                dotX: 49.3, dotY: 71.8,
                adjacentTo: ['tl-tg-sala-comedor', 'tl-tg-alcoba-principal', 'tl-tg-alcoba-auxiliar', 'tl-tg-opcion-multiple'],
              },
              {
                id: 'fp-tg-alcoba-principal',
                sceneId: 'tl-tg-alcoba-principal',
                label: 'Alcoba Principal',
                x: 261, y: 418, width: 40, height: 40,
                dotX: 28.1, dotY: 72.9,
                adjacentTo: ['tl-tg-estudio', 'tl-tg-vestier'],
              },
              {
                id: 'fp-tg-vestier',
                sceneId: 'tl-tg-vestier',
                label: 'Vestier',
                x: 202, y: 524, width: 40, height: 40,
                dotX: 22.2, dotY: 90.6,
                adjacentTo: ['tl-tg-alcoba-principal'],
              },
              {
                id: 'fp-tg-alcoba-auxiliar',
                sceneId: 'tl-tg-alcoba-auxiliar',
                label: 'Alcoba Auxiliar',
                x: 320, y: 262, width: 40, height: 40,
                dotX: 34.0, dotY: 47.1,
                adjacentTo: ['tl-tg-estudio', 'tl-tg-opcion-multiple'],
              },
              {
                id: 'fp-tg-opcion-multiple',
                sceneId: 'tl-tg-opcion-multiple',
                label: 'Opción Múltiple',
                x: 476, y: 284, width: 40, height: 40,
                dotX: 49.6, dotY: 50.6,
                adjacentTo: ['tl-tg-sala-comedor', 'tl-tg-estudio', 'tl-tg-alcoba-auxiliar'],
              },
            ],
          },
        },
      ],
    },
  ],

  autoRotateSpeed: -0.5,
  showFloorPlan: true,
  showWelcome: true,
};

export default tierraLindaTipoG;
