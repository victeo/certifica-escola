import { inject, Service } from '@angular/core';
import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { AuthService } from './auth.service';
import { certificateConfig, TextSlot } from './certificate.config';
import { Teacher } from './models';

const A4_LANDSCAPE: [number, number] = [841.89, 595.28];

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

  async generate(teacher: Teacher): Promise<Uint8Array> {
    const { template, slots, textColor } = certificateConfig;
    const schoolName = this.auth.profile()?.schoolName ?? '';
    const issuedAt = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

    const { doc, page } = await this.createBasePage(template);
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const color = rgb(...textColor);

    const draw = (slot: TextSlot, text: string) =>
      this.drawCentered(page, slot.bold ? bold : regular, text, slot, color);

    if (!template) this.drawFrame(page);
    draw(slots.title, 'CERTIFICADO');
    draw(slots.teacherName, teacher.name);
    draw(
      slots.body,
      `Certificamos que ${teacher.name}, professor(a) de ${teacher.subject} da ${schoolName}, ` +
        `concluiu o curso "${teacher.course}" com carga horária de ${teacher.workloadHours} horas.`,
    );
    draw(slots.footer, `${schoolName} - ${issuedAt}`);

    return doc.save();
  }

  private async createBasePage(template: typeof certificateConfig.template) {
    if (template?.kind === 'pdf') {
      const src = await PDFDocument.load(await this.fetchBytes(template.url));
      return { doc: src, page: src.getPage(0) };
    }
    const doc = await PDFDocument.create();
    if (!template) return { doc, page: doc.addPage(A4_LANDSCAPE) };
    const bytes = await this.fetchBytes(template.url);
    const image = template.kind === 'png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const page = doc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    return { doc, page };
  }

  private async fetchBytes(url: string): Promise<ArrayBuffer> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Não foi possível carregar o modelo do certificado (${url}).`);
    return res.arrayBuffer();
  }

  private drawFrame(page: PDFPage) {
    const { width, height } = page.getSize();
    page.drawRectangle({
      x: 24,
      y: 24,
      width: width - 48,
      height: height - 48,
      borderColor: rgb(0.2, 0.3, 0.6),
      borderWidth: 4,
    });
  }

  private drawCentered(page: PDFPage, font: PDFFont, text: string, slot: TextSlot, color: ReturnType<typeof rgb>) {
    const { width, height } = page.getSize();
    const maxWidth = (slot.maxWidth ?? 0.9) * width;
    const lineHeight = slot.size * 1.35;
    const lines = this.wrap(text, font, slot.size, maxWidth);
    lines.forEach((line, i) => {
      const lineWidth = font.widthOfTextAtSize(line, slot.size);
      page.drawText(line, {
        x: slot.x * width - lineWidth / 2,
        y: height - slot.y * height - i * lineHeight,
        size: slot.size,
        font,
        color,
      });
    });
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
