# Certifica Escola

Admin convida diretores por link; diretores cadastram seus professores (salvos no Firestore) e baixam os certificados em PDF.

Angular 22 + Firebase (Auth, Firestore, Hosting). Certificados são gerados no navegador com `pdf-lib`.

## Configuração (uma vez)

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com) e ative **Authentication → E-mail/senha** e **Firestore**.
2. Registre um app Web e cole a config em `src/app/core/firebase.config.ts`; ajuste o ID do projeto em `.firebaserc`.
3. Publique as regras: `npx firebase login && npx firebase deploy --only firestore`.
4. **Crie o primeiro admin** (não há tela para isso, por segurança):
   - Authentication → *Add user* (e-mail e senha) e copie o UID.
   - Firestore → coleção `users` → documento com esse UID:
     `{ name: "Seu nome", email: "...", role: "admin", schoolName: "Administração" }`.

## Fluxo

- Admin entra em `/login`, vai em **Convidar diretor(a)**, informa a escola e envia o link `/convite/<código>` (válido por 7 dias, uso único).
- O diretor abre o link, cria a conta e cadastra professores (nome, e-mail, CPF, disciplina, curso, carga horária).
- **Baixar certificado** gera o PDF do professor, com a assinatura do diretor (nome e escola) e um **código de verificação**. Cada download registra a emissão em `certificates/{código}`.
- Qualquer pessoa confere a autenticidade em `/verificar/<código>` (link impresso no certificado).
- O admin vê, na própria tela, os convites, os diretores (com nº de professores) e os professores de todas as escolas.

## Modelo do certificado

Por padrão sai um certificado simples com moldura. Para usar a sua arte, coloque o arquivo em `public/certificado/` e ajuste `src/app/core/certificate.config.ts` (`template` e posições dos textos).

## Deploy

```
npm run deploy           # build + hosting + regras do Firestore
npm run deploy:hosting   # só o site
npm run deploy:regras    # só firestore.rules
```

Primeiro rode `npx firebase login` (ou exporte `FIREBASE_TOKEN`, gerado com `npx firebase login:ci`). O script se recusa a publicar enquanto `firebase.config.ts` e `.firebaserc` ainda tiverem os valores de exemplo.

## Desenvolvimento

`npm start` · `npm test` (requer Node ≥ 22.22.3).
