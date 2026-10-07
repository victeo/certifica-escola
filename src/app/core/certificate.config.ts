/**
 * Layout do certificado (A4 paisagem, 2 páginas: frente e verso).
 *
 * A arte vem do Canva (exportada em PNG para `public/certificado/`) e já contém título,
 * assinaturas, frase de Eurípedes e conteúdo programático: para alterar esses textos, edite
 * o design no Canva e exporte de novo. O sistema escreve por cima apenas o que varia
 * (texto com o nome, data e código de verificação), nas posições abaixo.
 *
 * As posições são frações da página (0–1) a partir do canto superior esquerdo;
 * `y` é a linha de base do texto. Textos e dados do evento ficam em `event.config.ts`.
 */
export const certificateConfig = {
  templates: { front: '/certificado/frente.png', back: '/certificado/verso.png' },
  colors: {
    navy: [0.04, 0.02, 0.25],
    text: [0.04, 0.02, 0.25],
    gold: [0.7, 0.55, 0.23],
  } as Record<string, [number, number, number]>,
  front: {
    intro: { y: 0.36, size: 17, maxWidth: 0.72, lineHeight: 1.55 },
    name: { y: 0.53, size: 30, maxWidth: 0.72 },
    afterName: { y: 0.6, size: 16, maxWidth: 0.8, lineHeight: 1.55 },
    signedAt: { y: 0.665, size: 15 },
    verification: { y: 0.978, size: 7 },
  },
  back: {
    verification: { y: 0.978, size: 7 },
  },
};
