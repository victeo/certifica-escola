/**
 * Modelo do certificado.
 *
 * Coloque a arte em `public/certificado/` (PNG, JPG ou PDF) e aponte `template` para ela,
 * por exemplo: { url: '/certificado/modelo.png', kind: 'png' }.
 * Com `template: null` é gerado um certificado simples com moldura.
 *
 * As posições são frações da página (0–1), medidas a partir do canto superior esquerdo.
 * `x` é o centro horizontal do texto; `y` é a linha de base.
 */
export interface TemplateSource {
  url: string;
  kind: 'png' | 'jpg' | 'pdf';
}

export interface TextSlot {
  x: number;
  y: number;
  size: number;
  /** Largura máxima como fração da página; o texto quebra linha ao passar disso. */
  maxWidth?: number;
  bold?: boolean;
}

export const certificateConfig: {
  template: TemplateSource | null;
  slots: {
    title: TextSlot;
    teacherName: TextSlot;
    body: TextSlot;
    footer: TextSlot;
    quote: TextSlot;
    signature: TextSlot;
    verification: TextSlot;
  };
  textColor: [number, number, number];
} = {
  template: null,
  textColor: [0.1, 0.1, 0.15],
  slots: {
    title: { x: 0.5, y: 0.25, size: 40, bold: true },
    teacherName: { x: 0.5, y: 0.45, size: 30, bold: true, maxWidth: 0.8 },
    body: { x: 0.5, y: 0.56, size: 16, maxWidth: 0.7 },
    footer: { x: 0.5, y: 0.68, size: 12 },
    quote: { x: 0.5, y: 0.76, size: 11, maxWidth: 0.8 },
    signature: { x: 0.5, y: 0.87, size: 12, maxWidth: 0.4 },
    verification: { x: 0.5, y: 0.94, size: 9, maxWidth: 0.9 },
  },
};
