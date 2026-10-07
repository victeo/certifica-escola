/** Exporta linhas para CSV (separador `;` e BOM, para abrir direto no Excel em pt-BR). */
export function downloadCsv(filename: string, header: string[], rows: unknown[][]): void {
  const lines = [header, ...rows].map((row) => row.map(cell).join(';'));
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function cell(value: unknown): string {
  let text = value == null ? '' : String(value);
  // Evita injeção de fórmulas em planilhas (=, +, -, @).
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
