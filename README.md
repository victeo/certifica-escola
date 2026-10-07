# Escola Espírita, a Escola que Educa

Certificados para professores que participam do **Encontro Fraterno Auta de Souza** (Goiânia-GO). Nomes, edição, datas e a frase de Eurípedes Barsanulfo ficam em `src/app/core/event.config.ts`.

Admin convida diretores por link; diretores cadastram seus professores (salvos no Firestore) e baixam os certificados em PDF.

Angular 22 + Firebase (Auth, Firestore, Hosting). Certificados são gerados no navegador com `pdf-lib`.

## Configuração (uma vez)

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com) e ative **Authentication → E-mail/senha** e **Firestore**.
2. Copie `.env.example` para `.env` e preencha com a configuração do app Web (Console Firebase > Configurações do projeto > Seus apps); é o único lugar com credenciais. (O `.env` e os arquivos gerados `src/app/core/firebase.config.ts` e `.firebaserc` nunca vão para o Git; são recriados a cada `npm start`, `build`, `test` e `deploy`).
3. Publique as regras: `npx firebase login && npx firebase deploy --only firestore`.
4. **Crie o primeiro admin** (não há tela para isso, por segurança; as regras do Firestore impedem criá-lo pelo navegador):
   - Console Firebase > Configurações do projeto > Contas de serviço > *Gerar nova chave privada*. Guarde o JSON **fora do repositório** e aponte `FIREBASE_SERVICE_ACCOUNT_FILE` para ele no `.env`.
   - Rode `npm run create-admin -- --email voce@exemplo.com --name "Seu nome"`. Sem `ADMIN_PASSWORD` no ambiente, uma senha forte é gerada e exibida uma única vez. Se o e-mail já existir no Authentication, o usuário é apenas promovido.

## Fluxo

- Admin entra em `/login`, vai em **Convidar diretor(a)**, informa a escola e envia o link `/convite/<código>` (válido por 7 dias, uso único).
- O diretor abre o link, cria a conta e cadastra professores (nome, e-mail e disciplina opcional).
- **Baixar certificado** gera o PDF do professor, com a assinatura do diretor (nome e escola) e um **código de verificação**. Cada download registra a emissão em `certificates/{código}`.
- Qualquer pessoa confere a autenticidade em `/verificar/<código>` (link impresso no certificado).
- O admin vê, na própria tela, os convites, os diretores (com nº de professores) e os professores de todas as escolas.

## Modelo do certificado

PDF de 2 páginas (frente e verso). A arte vem do Canva e fica em `public/certificado/frente.png` e `verso.png` (exportadas em PNG, A4 paisagem); título, assinaturas, frase de Eurípedes e conteúdo programático fazem parte dela, então para mudá-los edite o design no Canva e exporte de novo. O sistema escreve por cima só o que varia: texto com o nome do participante, data e código de verificação. Esses textos, as horas e o período ficam em `src/app/core/event.config.ts` (`training`); as posições, em `src/app/core/certificate.config.ts`.

## Deploy

```
npm run deploy           # build + hosting + regras do Firestore
npm run deploy:hosting   # só o site
npm run deploy:regras    # só firestore.rules
```

Primeiro rode `npx firebase login` (ou defina `FIREBASE_TOKEN` no `.env`, gerado com `npx firebase login:ci`). O script se recusa a publicar enquanto o `.env` ainda tiver os valores de exemplo.

## Desenvolvimento

`npm start` · `npm test` (requer Node ≥ 22.22.3).
