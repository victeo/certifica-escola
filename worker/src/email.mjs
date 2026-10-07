/** Monta o e-mail do certificado (HTML com estilos inline + versão em texto). */

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function buildEmail({ name, code, env }) {
  const site = env.SITE_URL.replace(/\/$/, '');
  const link = `${site}/certificado/${encodeURIComponent(code)}`;
  const verify = `${site}/verificar/${encodeURIComponent(code)}`;
  const subject = `Seu certificado do ${env.EVENT_NAME}`;

  const text = [
    `Olá, ${name}!`,
    '',
    `Obrigado por participar do ${env.TRAINING_TITLE}, no ${env.EVENT_NAME} (${env.EVENT_PLACE}, ${env.EVENT_PERIOD}).`,
    'Seu certificado está pronto. Baixe o PDF em:',
    link,
    '',
    `Código de verificação: ${code}`,
    `Confira a autenticidade em: ${verify}`,
    '',
    `"${env.QUOTE_TEXT}" - ${env.QUOTE_AUTHOR}`,
  ].join('\n');

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f1e8;font-family:Georgia,'Times New Roman',serif;color:#0a0540;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1e8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dbe7ff;">
        <tr><td style="background:#17367e;border-bottom:4px solid #fcc419;padding:20px 24px;color:#ffffff;">
          <div style="font-size:20px;font-weight:bold;">Escola Espírita, a Escola que Educa</div>
          <div style="font-size:13px;color:#dbe7ff;margin-top:4px;">${esc(env.EVENT_NAME)} · ${esc(env.EVENT_PLACE)}</div>
        </td></tr>
        <tr><td style="padding:28px 24px;font-size:16px;line-height:1.6;">
          <p style="margin:0 0 16px;">Olá, <strong>${esc(name)}</strong>!</p>
          <p style="margin:0 0 16px;">Obrigado por participar do <strong>${esc(env.TRAINING_TITLE)}</strong>, no ${esc(env.EVENT_NAME)} (${esc(env.EVENT_PLACE)}, ${esc(env.EVENT_PERIOD)}). Seu certificado está pronto.</p>
          <p style="margin:24px 0;text-align:center;">
            <a href="${esc(link)}" style="display:inline-block;background:#fcc419;color:#0f2557;font-weight:bold;text-decoration:none;padding:14px 28px;border-radius:12px;font-family:Arial,sans-serif;">Baixar certificado (PDF)</a>
          </p>
          <p style="margin:0 0 8px;font-size:14px;color:#334155;">Se o botão não funcionar, copie este link no navegador:<br><a href="${esc(link)}" style="color:#1d449c;word-break:break-all;">${esc(link)}</a></p>
          <p style="margin:16px 0 0;font-size:14px;color:#334155;">Código de verificação: <strong style="letter-spacing:1px;">${esc(code)}</strong><br>
            Confira a autenticidade em <a href="${esc(verify)}" style="color:#1d449c;">${esc(verify)}</a></p>
        </td></tr>
        <tr><td style="padding:16px 24px 24px;text-align:center;font-style:italic;color:#17367e;border-top:1px solid #dbe7ff;font-size:14px;">
          “${esc(env.QUOTE_TEXT)}” — ${esc(env.QUOTE_AUTHOR)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, html, text, link };
}
