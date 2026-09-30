
// ─── Metadata SEO del proyecto Tierra Linda de la Pradera ─────────────
// Este archivo alimenta el layout.tsx cuando se activa este proyecto.
// Actualiza los valores cuando se defina el dominio y el contenido final.

export const tierraLindaMetadata = {
  // ─── Datos del proyecto ──────────────────────────────────────────
  projectName: 'Tierra Linda de la Pradera',
  constructora: 'Constructora Melendez',
  agency: 'MIESGROUP',

  // ─── SEO ─────────────────────────────────────────────────────────
  title: 'Tierra Linda de la Pradera | Recorrido Virtual 360° | Constructora Melendez',
  description:
    'Explora cada espacio del proyecto Tierra Linda de la Pradera con tecnologia de recorrido virtual 360°. ' +
    'Apartamentos modernos con acabados de alta calidad. Constructora Melendez.',
  keywords: [
    'Tierra Linda de la Pradera',
    'Constructora Melendez',
    'recorrido virtual 360',
    'apartamentos nuevos',
    'tour virtual arquitectonico',
    'inmobiliaria',
    'MIESGROUP',
  ],

  // ─── Open Graph / Social ─────────────────────────────────────────
  // ogImage: URL de imagen preview para redes sociales (1200x630 px recomendado)
  // Recorte 1200x630 del render HOME (CM_TLP_Cam_Juegos Infantiles_HOME.jpeg)
  ogImage: '/og-image.jpg',
  ogType: 'website' as const,

  // ─── Schema markup ───────────────────────────────────────────────
  // Para uso futuro con JSON-LD (RealEstate, LocalBusiness, etc.)
  schema: {
    type: 'RealEstateAgent',
    name: 'Tierra Linda de la Pradera — Constructora Melendez',
    address: {
      // ACTUALIZAR: direccion real del proyecto
      streetAddress: '',
      addressLocality: '',
      addressRegion: '',
      addressCountry: 'CO',
    },
  },
};
