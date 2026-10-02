import { TourConfig } from '@/lib/tour-types';
import { assetPath } from '@/lib/asset-path';

// ============================================================
//  TIERRA LINDA DE LA PRADERA — CONSTRUCTORA MELENDEZ
//  Producido por MIESGROUP para Constructora Melendez
//
//  TOUR DISPONIBLE:
//    tierraLindaTipoF — Apartamento Tipo F (el Tipo G existe en planos, sin 360)
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
const PANO_F = (path: string) => assetPath(`/projects/melendez/tierra-linda-de-la-pradera/panoramas/tipo-f/${path}`);
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
//  TOUR — APARTAMENTO TIPO F
//
//  Escenas: Sala Comedor · Cocina · Balcon · Estudio · Alcoba Principal
//           Vestier Alcoba Principal · Alcoba Auxiliar · Opcion Multiple
//  Panoramas: public/projects/melendez/tierra-linda-de-la-pradera/panoramas/tipo-f/
//    sala-comedor.jpg · cocina.jpg · balcon.jpg · estudio.jpg
//    alcoba-principal.jpg · vestier-alcoba-principal.jpg · alcoba-auxiliar.jpg
//    opcion-multiple-habitacion.jpg · opcion-multiple-sala-tv.jpg
//
//  Hotspots calibrados arrastrando en ?debug=1 ("Copiar cambios").
// ============================================================
export const tierraLindaTipoF: TourConfig = {

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
          id: 'tl-tipo-f',
          name: 'Apartamento Tipo F',
          description: 'Sala Comedor · Cocina · Balcón · Estudio · 2 Alcobas · Opción Múltiple',
          floor: 0,
          position: 0,
          // Datos del plano comercial "Apartamento Tipo F" (la opcion multiple
          // puede ser una 3a alcoba con el kit opcional)
          bedrooms: 2,
          bathrooms: 2,
          area: 68.66,
          areaPrivada: 60.90,
          // Sobre la torre del render HOME (calibrado con ?debug=1)
          hotspotX: 49.5, hotspotY: 30.6,
          cardDir: 'left',

          scenes: [

            // --- ESCENA: SALA COMEDOR ---
            {
              id: 'tl-tf-sala-comedor',
              name: 'Sala Comedor',
              description: 'Sala y comedor integrados',
              panorama: PANO_F('sala-comedor.jpg'),
              defaultView: { pitch: 0, yaw: 0, hfov: 100 },
              playbackAnimations: [
                { from: { pitch: -0.3, yaw: 88.1 }, to: { pitch: -0.7, yaw: 162.6 } },
                { from: { pitch: -6.5, yaw: -51.4 }, to: { pitch: -6.5, yaw: -51.4 } },
                { from: { pitch: -1.1, yaw: 35.8 }, to: { pitch: -1.1, yaw: 35.8 } },
              ],
              hotspots: [
                {
                  id: 'tl-tf-sala-to-balcon',
                  pitch: -1.6, yaw: -12.9,
                  type: 'scene',
                  label: 'Balcón',
                  description: 'Ir al balcón',
                  targetSceneId: 'tl-tf-balcon',
                },
                {
                  id: 'tl-tf-sala-to-cocina',
                  pitch: -2, yaw: 170.5,
                  type: 'scene',
                  label: 'Cocina',
                  description: 'Ir a la cocina',
                  targetSceneId: 'tl-tf-cocina',
                },
                {
                  id: 'tl-tf-sala-to-estudio',
                  pitch: -1, yaw: -109.6,
                  type: 'scene',
                  label: 'Estudio',
                  description: 'Ir al estudio',
                  targetSceneId: 'tl-tf-estudio',
                },
                {
                  id: 'tl-tf-sala-to-alcoba-principal',
                  pitch: 0.3, yaw: -94.5,
                  type: 'scene',
                  label: 'Alcoba Principal',
                  description: 'Ir a la alcoba principal',
                  targetSceneId: 'tl-tf-alcoba-principal',
                },
              ],
            },

            // --- ESCENA: COCINA ---
            {
              id: 'tl-tf-cocina',
              name: 'Cocina',
              description: 'Cocina',
              panorama: PANO_F('cocina.jpg'),
              defaultView: { pitch: 0, yaw: 0, hfov: 100 },
              playbackAnimations: [
                { from: { pitch: -7.1, yaw: 154.3 }, to: { pitch: -6.9, yaw: -43 } },
              ],
              hotspots: [
                {
                  id: 'tl-tf-cocina-to-balcon',
                  pitch: -1.2, yaw: -6.7,
                  type: 'scene',
                  label: 'Balcón',
                  description: 'Ir a balcón',
                  targetSceneId: 'tl-tf-balcon',
                },
                {
                  id: 'tl-tf-cocina-to-sala-comedor',
                  pitch: -19.9, yaw: 0.4,
                  type: 'scene',
                  label: 'Sala Comedor',
                  description: 'Ir a sala comedor',
                  targetSceneId: 'tl-tf-sala-comedor',
                },
              ],
            },

            // --- ESCENA: BALCON ---
            {
              id: 'tl-tf-balcon',
              name: 'Balcón',
              description: 'Balcón',
              panorama: PANO_F('balcon.jpg'),
              defaultView: { pitch: 0, yaw: 0, hfov: 100 },
              playbackAnimations: [
                { from: { pitch: -0.9, yaw: 2.9 }, to: { pitch: -2.9, yaw: 139.5 } },
              ],
              hotspots: [
                {
                  id: 'tl-tf-balcon-to-sala-comedor',
                  pitch: -25, yaw: 151.1,
                  type: 'scene',
                  label: 'Sala Comedor',
                  description: 'Ir a sala comedor',
                  targetSceneId: 'tl-tf-sala-comedor',
                },
                {
                  id: 'tl-tf-balcon-to-cocina',
                  pitch: -3.1, yaw: 169.4,
                  type: 'scene',
                  label: 'Cocina',
                  description: 'Ir a cocina',
                  targetSceneId: 'tl-tf-cocina',
                },
              ],
            },

            // --- ESCENA: ESTUDIO ---
            {
              id: 'tl-tf-estudio',
              name: 'Estudio',
              description: 'Estudio',
              panorama: PANO_F('estudio.jpg'),
              defaultView: { pitch: 0, yaw: 0, hfov: 100 },
              playbackAnimations: [
                { from: { pitch: -5.2, yaw: 109.3 }, to: { pitch: -4.9, yaw: -91.1 } },
              ],
              hotspots: [
                {
                  id: 'tl-tf-estudio-to-opcion-multiple',
                  pitch: -3.9, yaw: -16.4,
                  type: 'scene',
                  label: 'Opción Múltiple',
                  description: 'Ir a opción múltiple',
                  targetSceneId: 'tl-tf-opcion-multiple',
                },
                {
                  id: 'tl-tf-estudio-to-alcoba-auxiliar',
                  pitch: -4.5, yaw: -41,
                  type: 'scene',
                  label: 'Alcoba Auxiliar',
                  description: 'Ir a alcoba auxiliar',
                  targetSceneId: 'tl-tf-alcoba-auxiliar',
                },
                {
                  id: 'tl-tf-estudio-to-alcoba-principal',
                  pitch: -4.7, yaw: -55.9,
                  type: 'scene',
                  label: 'Alcoba Principal',
                  description: 'Ir a alcoba principal',
                  targetSceneId: 'tl-tf-alcoba-principal',
                },
                {
                  id: 'tl-tf-estudio-to-sala-comedor',
                  pitch: -4.8, yaw: 57.6,
                  type: 'scene',
                  label: 'Sala Comedor',
                  description: 'Ir a sala comedor',
                  targetSceneId: 'tl-tf-sala-comedor',
                },
              ],
            },

            // --- ESCENA: ALCOBA PRINCIPAL ---
            {
              id: 'tl-tf-alcoba-principal',
              videoScreen: {
                src: assetPath('/projects/melendez/tierra-linda-de-la-pradera/videos/televisor-opcion-multiple-hd.mp4'),
                corners: [
                  { yaw: 110.14334, pitch: 24.14486 },
                  { yaw: 162.22057, pitch: 8.45527 },
                  { yaw: 162.52379, pitch: -17.27616 },
                  { yaw: 110.55080, pitch: -44.10058 },
                ],
              },
              name: 'Alcoba Principal',
              description: 'Alcoba principal',
              panorama: PANO_F('alcoba-principal.jpg'),
              defaultView: { pitch: 0, yaw: 0, hfov: 100 },
              playbackAnimations: [
                { from: { pitch: -0.8, yaw: -100.1 }, to: { pitch: -1.2, yaw: 172.7 } },
              ],
              hotspots: [
                {
                  id: 'tl-tf-alcoba-principal-to-vestier',
                  pitch: -2.6, yaw: -157.4,
                  type: 'scene',
                  label: 'Vestier Alcoba Principal',
                  description: 'Ir a vestier alcoba principal',
                  targetSceneId: 'tl-tf-vestier',
                },
                {
                  id: 'tl-tf-alcoba-principal-to-sala-comedor',
                  pitch: -3.5, yaw: 85.9,
                  type: 'scene',
                  label: 'Sala Comedor',
                  description: 'Ir a sala comedor',
                  targetSceneId: 'tl-tf-sala-comedor',
                },
                {
                  id: 'tl-tf-alcoba-principal-to-opcion-multiple',
                  pitch: -2.6, yaw: 70.1,
                  type: 'scene',
                  label: 'Opción Múltiple',
                  description: 'Ir a opción múltiple',
                  targetSceneId: 'tl-tf-opcion-multiple',
                },
                {
                  id: 'tl-tf-alcoba-principal-to-auxiliar',
                  pitch: -3, yaw: 57.8,
                  type: 'scene',
                  label: 'Alcoba Auxiliar',
                  description: 'Ir a alcoba auxiliar',
                  targetSceneId: 'tl-tf-alcoba-auxiliar',
                },
                {
                  id: 'tl-tf-alcoba-principal-to-estudio',
                  pitch: -21.6, yaw: 90.1,
                  type: 'scene',
                  label: 'Estudio',
                  description: 'Ir a estudio',
                  targetSceneId: 'tl-tf-estudio',
                },
              ],
            },

            // --- ESCENA: VESTIER ALCOBA PRINCIPAL ---
            {
              id: 'tl-tf-vestier',
              name: 'Vestier Alcoba Principal',
              description: 'Vestier de la alcoba principal',
              panorama: PANO_F('vestier-alcoba-principal.jpg'),
              defaultView: { pitch: 0, yaw: 0, hfov: 100 },
              playbackAnimations: [
                { from: { pitch: -2.6, yaw: 129 }, to: { pitch: -1.8, yaw: -73.9 } },
              ],
              hotspots: [
                {
                  id: 'tl-tf-vestier-to-alcoba-principal',
                  pitch: -6.2, yaw: -15.5,
                  type: 'scene',
                  label: 'Alcoba Principal',
                  description: 'Ir a alcoba principal',
                  targetSceneId: 'tl-tf-alcoba-principal',
                },
              ],
            },

            // --- ESCENA: ALCOBA AUXILIAR ---
            {
              id: 'tl-tf-alcoba-auxiliar',
              videoScreen: {
                src: assetPath('/projects/melendez/tierra-linda-de-la-pradera/videos/televisor-opcion-multiple-hd.mp4'),
                corners: [
                  { yaw: 10.51685, pitch: 6.56426 },
                  { yaw: 27.71416, pitch: 16.09181 },
                  { yaw: 27.23132, pitch: -30.19590 },
                  { yaw: 10.32959, pitch: -12.89450 },
                ],
              },
              name: 'Alcoba Auxiliar',
              description: 'Segunda alcoba',
              panorama: PANO_F('alcoba-auxiliar.jpg'),
              defaultView: { pitch: 0, yaw: 0, hfov: 100 },
              playbackAnimations: [
                { from: { pitch: 0.6, yaw: 0.6 }, to: { pitch: -2.3, yaw: -67 } },
              ],
              hotspots: [
                {
                  id: 'tl-tf-alcoba-auxiliar-to-estudio',
                  pitch: -5.1, yaw: 161.3,
                  type: 'scene',
                  label: 'Estudio',
                  description: 'Ir a estudio',
                  targetSceneId: 'tl-tf-estudio',
                },
                {
                  id: 'tl-tf-alcoba-auxiliar-to-principal',
                  pitch: -3, yaw: -155.1,
                  type: 'scene',
                  label: 'Alcoba Principal',
                  description: 'Ir a alcoba principal',
                  targetSceneId: 'tl-tf-alcoba-principal',
                },
              ],
            },

            // --- ESCENA: OPCION MULTIPLE ---
            // Mismo espacio con dos amoblamientos: se alterna el panorama en
            // la misma escena (no navega a otra, a diferencia de Valle Alto).
            // PENDIENTE: ubicar variantButton con ?debug=1
            {
              id: 'tl-tf-opcion-multiple',
              videoScreen: {
                src: assetPath('/projects/melendez/tierra-linda-de-la-pradera/videos/televisor-opcion-multiple-hd.mp4'),
                variantId: 'habitacion',
                // Inner TV bezel, calibrated on the equirectangular panorama.
                corners: [
                  { yaw: -64.92530, pitch: 29.54943 },
                  { yaw: -14.05205, pitch: 8.77466 },
                  { yaw: -13.93376, pitch: -17.31794 },
                  { yaw: -64.37422, pitch: -49.39698 },
                ],
              },
              name: 'Opción Múltiple',
              description: 'Espacio flexible: habitación o sala de TV',
              panorama: PANO_F('opcion-multiple-habitacion.jpg'),
              defaultView: { pitch: 0, yaw: 0, hfov: 100 },
              playbackAnimations: [
                { from: { pitch: -2.4, yaw: 86.8 }, to: { pitch: -3.8, yaw: -26.4 } },
              ],
              variants: [
                {
                  id: 'habitacion',
                  label: 'Como habitación',
                  panorama: PANO_F('opcion-multiple-habitacion.jpg'),
                },
                {
                  id: 'sala-tv',
                  label: 'Como sala de TV',
                  panorama: PANO_F('opcion-multiple-sala-tv.jpg'),
                  videoScreen: {
                    src: assetPath('/projects/melendez/tierra-linda-de-la-pradera/videos/televisor-opcion-multiple-hd.mp4'),
                    variantId: 'sala-tv',
                    corners: [
                      { yaw: 120.72818, pitch: 4.71852 },
                      { yaw: 160.55318, pitch: 8.56696 },
                      { yaw: 160.48268, pitch: -30.12045 },
                      { yaw: 120.37208, pitch: -17.32428 },
                    ],
                  },
                },
              ],
              variantButton: { pitch: -10, yaw: 0 },
              hotspots: [
                {
                  id: 'tl-tf-opcion-multiple-to-estudio',
                  pitch: -6.7, yaw: 172.5,
                  type: 'scene',
                  label: 'Estudio',
                  description: 'Ir a estudio',
                  targetSceneId: 'tl-tf-estudio',
                },
              ],
            },

          ],

          // --- PLANO DE PLANTA TIPO F ---
          // Imagen: plano comercial Tipo F recortado y rellenado a 3:2 (el SVG del
          // mini-plano es 3:2), para que dotX/dotY coincidan con la imagen.
          // Original: _source-assets/.../branding/"Apto tipo G-100.jpg" (nombres
          // cruzados en la entrega: ese archivo contiene el plano del Tipo F).
          // dotX/dotY en % de la imagen; los rects (espacio 1000x600) son el area de click.
          floorPlan: {
            width: 1000,
            height: 600,
            background: 'transparent',
            backgroundImage: PLAN('apto-tipo-f.jpg'),
            rooms: [
              {
                id: 'fp-tf-sala-comedor',
                sceneId: 'tl-tf-sala-comedor',
                label: 'Sala Comedor',
                x: 635, y: 326, width: 40, height: 40,
                dotX: 65.5, dotY: 57.7,
                radarYawOffset: 0,
                adjacentTo: ['tl-tf-cocina', 'tl-tf-balcon', 'tl-tf-estudio', 'tl-tf-opcion-multiple'],
              },
              {
                id: 'fp-tf-cocina',
                sceneId: 'tl-tf-cocina',
                label: 'Cocina',
                x: 637, y: 423, width: 40, height: 40,
                dotX: 65.7, dotY: 73.9,
                radarYawOffset: 0,
                adjacentTo: ['tl-tf-sala-comedor'],
              },
              {
                id: 'fp-tf-balcon',
                sceneId: 'tl-tf-balcon',
                label: 'Balcón',
                x: 608, y: 221, width: 40, height: 40,
                dotX: 62.8, dotY: 40.2,
                radarYawOffset: 0,
                adjacentTo: ['tl-tf-sala-comedor'],
              },
              {
                id: 'fp-tf-estudio',
                sceneId: 'tl-tf-estudio',
                label: 'Estudio',
                x: 484, y: 398, width: 40, height: 40,
                dotX: 50.4, dotY: 69.6,
                radarYawOffset: 0,
                adjacentTo: ['tl-tf-sala-comedor', 'tl-tf-alcoba-principal', 'tl-tf-alcoba-auxiliar', 'tl-tf-opcion-multiple'],
              },
              {
                id: 'fp-tf-alcoba-principal',
                sceneId: 'tl-tf-alcoba-principal',
                label: 'Alcoba Principal',
                x: 319, y: 342, width: 40, height: 40,
                dotX: 33.9, dotY: 60.4,
                radarYawOffset: 0,
                adjacentTo: ['tl-tf-estudio', 'tl-tf-vestier'],
              },
              {
                id: 'fp-tf-vestier',
                sceneId: 'tl-tf-vestier',
                label: 'Vestier',
                x: 276, y: 484, width: 40, height: 40,
                dotX: 29.6, dotY: 84,
                radarYawOffset: 0,
                adjacentTo: ['tl-tf-alcoba-principal'],
              },
              {
                id: 'fp-tf-alcoba-auxiliar',
                sceneId: 'tl-tf-alcoba-auxiliar',
                label: 'Alcoba Auxiliar',
                x: 389, y: 288, width: 40, height: 40,
                dotX: 40.9, dotY: 51.3,
                radarYawOffset: 0,
                adjacentTo: ['tl-tf-estudio', 'tl-tf-opcion-multiple'],
              },
              {
                id: 'fp-tf-opcion-multiple',
                sceneId: 'tl-tf-opcion-multiple',
                variantId: 'habitacion',
                label: 'Opción Múltiple',
                x: 667, y: 76, width: 40, height: 40,
                dotX: 68.7, dotY: 16,
                radarYawOffset: 0,
                adjacentTo: ['tl-tf-sala-comedor', 'tl-tf-estudio', 'tl-tf-alcoba-auxiliar'],
              },
              {
                id: 'fp-tf-estar-tv',
                sceneId: 'tl-tf-opcion-multiple',
                variantId: 'sala-tv',
                label: 'Estar TV',
                x: 445, y: 287.8, width: 40, height: 40,
                dotX: 46.5, dotY: 51.3,
                radarYawOffset: 0,
                adjacentTo: ['tl-tf-sala-comedor', 'tl-tf-estudio', 'tl-tf-alcoba-auxiliar'],
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
  playback: { hfov: 120 },

  // ─── Plantas arquitectonicas (menu "Plantas" del sidebar) ────────────
  // Imagen completa de la entrega (NAS 05 - Auxiliary Files). OJO: el archivo
  // del cliente se llama "Apto tipo G-100.jpg" pero contiene el Tipo F.
  plantas: [
    {
      id: 'planta-tipo-f',
      src: PLAN('planta-tipo-f.jpg'),
      title: 'Apartamento Tipo F',
      caption: 'Área construida 68,66 m² · Área privada 60,90 m²',
    },
  ],
};

export default tierraLindaTipoF;
