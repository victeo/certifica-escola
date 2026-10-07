# Worker de e-mail (Cloudflare)

Envia o certificado por e-mail (Resend) para o professor. Roda no plano **gratuito** do Cloudflare Workers e guarda a chave do Resend como segredo, fora do app e do Git.

## Como funciona

1. O app (diretor/admin logado) chama `POST /send` com `{ teacherId, certificateCode }` e o token de login do Firebase.
2. O Worker lê o professor, o certificado e o perfil de quem chama **no Firestore usando o token do usuário**: as `firestore.rules` decidem se o acesso é permitido (diretor dono do professor, ou admin).
3. O destinatário é o e-mail **cadastrado do professor**; nada do pedido define para onde o e-mail vai.
4. O e-mail leva o link `SITE_URL/certificado/<código>` (a página gera o PDF) e o código de verificação. O diretor recebe Reply-To e, se `BCC_DIRECTOR = "true"`, cópia oculta.

## Configuração (uma vez)

1. Em `wrangler.toml`, ajuste `FIREBASE_PROJECT_ID`, `ALLOWED_ORIGINS` e `SITE_URL` para o seu projeto. `FROM_EMAIL` deve ser de um domínio **verificado no Resend** (`notificacao@osceia.org.br`).
2. Entre na conta Cloudflare, grave a chave do Resend e publique:

   ```bash
   cd worker
   npx wrangler login
   npx wrangler secret put RESEND_API_KEY     # cole a chave (começa com re_)
   npx wrangler deploy
   ```

3. Copie a URL exibida (`https://escola-espirita-mailer.<usuario>.workers.dev`) para `MAIL_WORKER_URL` no `.env` do app e publique o site de novo (`npm run deploy:hosting`).
4. Publique as regras (`npm run deploy:regras`): elas permitem gravar a data do último envio no professor.

Sem `MAIL_WORKER_URL` os botões de e-mail não aparecem.

## Limites e cuidados

- **Resend gratuito:** 100 e-mails/dia e 3.000/mês. Ao estourar, o app interrompe o lote e avisa.
- O Worker limita 20 envios por minuto por usuário (melhor esforço, por instância).
- Textos do e-mail (evento, período, frase) ficam em `[vars]` do `wrangler.toml`; mantenha em sincronia com `src/app/core/event.config.ts`.
- `ALLOWED_ORIGINS` só deve conter o seu site (e `http://localhost:4200` para desenvolvimento).

## Testes

```bash
npm run test:worker    # na raiz do projeto (Node 22+)
```
