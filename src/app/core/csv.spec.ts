import { downloadCsv } from './csv';

describe('downloadCsv', () => {
  it('escapes separators/quotes and neutralizes spreadsheet formulas', async () => {
    let blob!: Blob;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => ((blob = b as Blob), 'blob:x'));
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    downloadCsv('teste', ['Nome', 'Nota'], [['Ana; "A"', '=SUM(A1)'], ['Bia', 3]]);

    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]); // BOM para o Excel
    const text = await blob.text();
    expect(text.startsWith('Nome;Nota')).toBe(true);
    expect(text).toContain('"Ana; ""A""";\'=SUM(A1)');
    expect(text).toContain('Bia;3');
  });
});
