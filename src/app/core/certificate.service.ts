import { inject, Service } from '@angular/core';
import { doc as fsDoc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { AuthService } from './auth.service';
import { certificateConfig as cfg } from './certificate.config';
import { eventFullName, training } from './event.config';
import { db } from './firebase';
import { IssuedCertificate, Teacher } from './models';

// Sem caracteres ambíguos (0/O, 1/I).
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
}

interface DrawOptions {
  y: number;
  size: number;
  font: PDFFont;
  color?: keyof typeof cfg.colors;
  x?: number;
  maxWidth?: number;
  lineHeight?: number;
  align?: 'center' | 'left';
}

@Service()
export class CertificateService {
  private readonly auth = inject(AuthService);

  async download(teacher: Teacher): Promise<void> {
    const bytes = await this.generate(teacher);
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `certificado-${this.slug(teacher.name)}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  verificationUrl(code: string): string {
    return `${location.origin}/verificar/${code}`;
  }

  async getIssued(code: string): Promise<IssuedCertificate | null> {
    const snap = await getDoc(fsDoc(db, 'certificates', code));
    return snap.exists() ? { code, ...(snap.data() as Omit<IssuedCertificate, 'code'>) } : null;
  }

  /** Registra a emissão (cada download gera um novo código) e devolve o código. */
  private async register(teacher: Teacher): Promise<string> {
    const profile = this.auth.profile();
    const code = Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
    await setDoc(fsDoc(db, 'certificates', code), {
      directorId: this.auth.user()?.uid,
      teacherId: teacher.id,
      teacherName: teacher.name,
      eventName: eventFullName,
      period: training.period,
      hours: training.hours,
      schoolName: profile?.schoolName ?? '',
      directorName: profile?.name ?? '',
      issuedAt: serverTimestamp(),
    });
    return code;
  }

  async generate(teacher: Teacher): Promise<Uint8Array> {
    const [frontBg, backBg] = await Promise.all([
      this.fetchBytes(cfg.templates.front),
      this.fetchBytes(cfg.templates.back),
    ]);
    const code = await this.register(teacher);

    const doc = await PDFDocument.create();
    const fonts: Fonts = {
      regular: await doc.embedFont(StandardFonts.TimesRoman),
      bold: await doc.embedFont(StandardFonts.TimesRomanBold),
      italic: await doc.embedFont(StandardFonts.TimesRomanItalic),
    };
    const verification = `Código de verificação: ${code}  -  ${this.verificationUrl(code)}`;

    this.drawFront(await this.newPage(doc, frontBg), fonts, teacher.name, verification);
    this.drawBack(await this.newPage(doc, backBg), fonts, verification);
    return doc.save();
  }

  private drawFront(page: PDFPage, f: Fonts, name: string, verification: string) {
    const c = cfg.front;
    this.text(page, training.title, { ...c.title, font: f.bold, color: 'navy' });
    this.text(page, 'CERTIFICADO', { ...c.heading, font: f.regular, color: 'gold' });
    this.text(page, `${training.issuer}, Entidade patrocinadora do ${eventFullName.toUpperCase()}, certifica que`, {
      ...c.intro,
      font: f.regular,
    });
    const nameWidth = this.text(page, name, { ...c.name, font: f.bold, color: 'navy' });
    const { width, height } = page.getSize();
    const lineHalf = Math.max(nameWidth, 0.4 * width) / 2 + 12;
    page.drawLine({
      start: { x: width / 2 - lineHalf, y: height - (c.name.y + 0.012) * height },
      end: { x: width / 2 + lineHalf, y: height - (c.name.y + 0.012) * height },
      thickness: 0.8,
      color: this.color('gold'),
    });
    this.text(page, `participou deste Evento, com duração de ${training.hours} horas, entre os dias ${training.period}.`, {
      ...c.afterName,
      font: f.regular,
    });
    this.text(page, training.signedAt, { ...c.signedAt, font: f.regular });

    const sig = c.signatures;
    for (const [x, label] of [
      [sig.leftX, training.signatureLabels.left],
      [sig.rightX, training.signatureLabels.right],
    ] as const) {
      const half = (sig.lineWidth * width) / 2;
      page.drawLine({
        start: { x: x * width - half, y: height - sig.lineY * height },
        end: { x: x * width + half, y: height - sig.lineY * height },
        thickness: 0.9,
        color: this.color('text'),
      });
      this.text(page, label, { x, y: sig.labelY, size: sig.size, font: f.bold });
    }

    this.text(page, `“${training.quote.text}”`, { ...c.quote, font: f.italic, color: 'navy' });
    this.text(page, `- ${training.quote.author}`, {
      y: c.quote.y + 0.035,
      size: c.quote.size,
      font: f.bold,
      color: 'navy',
    });
    this.text(page, verification, { ...c.verification, font: f.regular });
  }

  private drawBack(page: PDFPage, f: Fonts, verification: string) {
    const c = cfg.back;
    this.text(page, `${training.title} ${training.year}`, { ...c.title, font: f.bold, color: 'navy' });
    this.text(page, 'CONTEÚDO PROGRAMÁTICO:', { ...c.heading, font: f.bold, color: 'navy' });

    const { width, height } = page.getSize();
    let y = c.list.y;
    for (const item of training.program) {
      const lines = this.wrap(item, f.regular, c.list.size, c.list.maxWidth * width - 18);
      lines.forEach((line, i) => {
        if (i === 0) {
          page.drawText('•', {
            x: c.list.x * width,
            y: height - y * height,
            size: c.list.size,
            font: f.bold,
            color: this.color('gold'),
          });
        }
        page.drawText(line, {
          x: c.list.x * width + 18,
          y: height - y * height,
          size: c.list.size,
          font: f.regular,
          color: this.color('text'),
        });
        y += (c.list.size * c.list.lineHeight) / height;
      });
      y += c.list.itemGap;
    }
    this.text(page, verification, { ...c.verification, font: f.regular });
  }

  private async newPage(doc: PDFDocument, png: ArrayBuffer): Promise<PDFPage> {
    const image = await doc.embedPng(png);
    const page = doc.addPage([841.89, 595.28]);
    page.drawImage(image, { x: 0, y: 0, width: 841.89, height: 595.28 });
    return page;
  }

  /** Desenha texto (com quebra de linha) e devolve a largura da linha mais larga. */
  private text(page: PDFPage, text: string, o: DrawOptions): number {
    const { width, height } = page.getSize();
    const maxWidth = (o.maxWidth ?? 0.9) * width;
    const lineHeight = o.size * (o.lineHeight ?? 1.35);
    const lines = this.wrap(text, o.font, o.size, maxWidth);
    let widest = 0;
    lines.forEach((line, i) => {
      const lineWidth = o.font.widthOfTextAtSize(line, o.size);
      widest = Math.max(widest, lineWidth);
      page.drawText(line, {
        x: o.align === 'left' ? (o.x ?? 0) * width : (o.x ?? 0.5) * width - lineWidth / 2,
        y: height - o.y * height - i * lineHeight,
        size: o.size,
        font: o.font,
        color: this.color(o.color ?? 'text'),
      });
    });
    return widest;
  }

  private color(name: keyof typeof cfg.colors) {
    const [r, g, b] = cfg.colors[name];
    return rgb(r, g, b);
  }

  private async fetchBytes(url: string): Promise<ArrayBuffer> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Não foi possível carregar o modelo do certificado (${url}).`);
    return res.arrayBuffer();
  }

  private wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const lines: string[] = [];
    let current = '';
    for (const word of text.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  private slug(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
