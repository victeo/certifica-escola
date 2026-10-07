/**
 * Layout do certificado (A4 paisagem, 2 páginas: frente e verso).
 *
 * A arte de fundo fica em `public/certificado/` (fonte editável em `design/certificado/`).
 * As posições são frações da página (0–1) a partir do canto superior esquerdo;
 * `y` é a linha de base do texto. Os textos ficam em `event.config.ts`.
 */
export const certificateConfig = {
  templates: { front: '/certificado/frente.png', back: '/certificado/verso.png' },
  colors: { navy: [0.09, 0.21, 0.49], text: [0.11, 0.14, 0.25], gold: [0.69, 0.49, 0.0] } as Record<string, [number, number, number]>,
  front: {
    title: { y: 0.27, size: 27 },
    heading: { y: 0.375, size: 46 },
    intro: { y: 0.47, size: 15, maxWidth: 0.74, lineHeight: 1.5 },
    name: { y: 0.6, size: 26, maxWidth: 0.7 },
    afterName: { y: 0.665, size: 15, maxWidth: 0.74, lineHeight: 1.5 },
    signedAt: { y: 0.725, size: 14 },
    signatures: { lineY: 0.8, labelY: 0.822, leftX: 0.27, rightX: 0.73, lineWidth: 0.3, size: 11 },
    quote: { y: 0.865, size: 10, maxWidth: 0.78, lineHeight: 1.35 },
    verification: { y: 0.935, size: 8 },
  },
  back: {
    title: { y: 0.27, size: 24 },
    heading: { y: 0.37, size: 17 },
    list: { y: 0.47, size: 15, x: 0.16, maxWidth: 0.68, lineHeight: 1.5, itemGap: 0.012 },
    verification: { y: 0.935, size: 8 },
  },
};
