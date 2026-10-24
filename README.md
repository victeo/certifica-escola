# 🎓 Certifica Escola

[![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)](https://angular.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_%7C_Firestore_%7C_Hosting-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![Licença: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-green.svg)](LICENSE)

Sistema web para **emitir certificados em PDF para professores** que participam de um encontro de formação. O administrador convida os diretores das escolas por link, cada diretor cadastra seus professores e baixa os certificados, e qualquer pessoa pode **verificar a autenticidade** de um certificado por código.

Criado para o Encontro Fraterno Auta de Souza (Goiânia-GO). Nome do evento, edição, datas e textos ficam em um único arquivo de configuração, então dá para adaptá-lo a outros eventos.

## ✨ Funcionalidades

**Administrador** (`/admin`)
- **Visão geral** com totais de escolas, diretores, professores e certificados, gráfico por escola e alertas (convites pendentes ou expirados, escolas sem professores, professores sem certificado).
- **Escolas e convites**: gera links de convite (`/convite/<código>`, uso único, validade de 7 dias), com opções de ver, renovar e excluir. Permite renomear escolas e editar ou remover diretores.
- **Professores**: lista única com busca, filtros, ordenação, agrupamento (por escola, diretor ou disciplina), seleção em lote, edição, exclusão e exportação CSV.
- **Relatórios** com exportação CSV e impressão: professores por escola ou disciplina, diretores, escolas sem professores, certificados emitidos, convites e cadastros por mês.

**Diretor** (`/diretor`)
- Indicadores de professores, disciplinas e certificados emitidos.
- Cadastro, edição e exclusão (individual ou em lote) de professores, com busca, filtros e exportação CSV.
- **Geração do certificado em PDF** (frente e verso) com código de verificação. Cada download registra a emissão.

**Público** (`/verificar/<código>`)
- Qualquer pessoa confere se um certificado é autêntico pelo link ou código impresso nele.

## 🧱 Stack

- **Angular 22** com Signals e componentes standalone
- **Firebase**: Authentication (e-mail/senha), Firestore e Hosting
- **pdf-lib**: os PDFs são gerados no navegador, sem servidor
- Arte do certificado feita no Canva e exportada em PNG

## 🚀 Como rodar

**Pré-requisitos:** Node.js ≥ 22.22.3 e um projeto Firebase.

```bash
git clone https://github.com/victeo/certifica-escola.git
cd certifica-escola
npm install
```

### 1. Configure o Firebase
1. No [Firebase Console](https://console.firebase.google.com), crie um projeto e ative **Authentication → E-mail/senha** e o **Firestore**.
2. Copie `.env.example` para `.env` e preencha com a configuração do app Web (Configurações do projeto → Seus apps). O `.env` e os arquivos gerados a partir dele (`firebase.config.ts`, `.firebaserc`) não vão para o Git e são recriados a cada `start`, `build`, `test` e `deploy`.
3. Publique as regras: `npx firebase login && npx firebase deploy --only firestore`.

### 2. Crie o primeiro administrador
Por segurança, as regras do Firestore impedem criar o primeiro admin pelo navegador.

1. No Console: Configurações do projeto → Contas de serviço → **Gerar nova chave privada**. Guarde o JSON **fora do repositório** e aponte `FIREBASE_SERVICE_ACCOUNT_FILE` para ele no `.env`.
2. Rode:
   ```bash
   npm run create-admin -- --email voce@exemplo.com --name "Seu nome"
   ```
   Sem `ADMIN_PASSWORD` no ambiente, uma senha forte é gerada e exibida uma única vez. Se o e-mail já existir, o usuário é apenas promovido.

### 3. Execute

| Comando | O que faz |
| --- | --- |
| `npm start` | Servidor de desenvolvimento |
| `npm test` | Testes unitários |
| `npm run build` | Build de produção |
| `npm run deploy` | Build + hosting + regras do Firestore |
| `npm run deploy:hosting` | Publica só o site |
| `npm run deploy:regras` | Publica só o `firestore.rules` |

Antes do deploy, rode `npx firebase login` (ou defina `FIREBASE_TOKEN` no `.env`, gerado com `npx firebase login:ci`). O script se recusa a publicar enquanto o `.env` tiver os valores de exemplo.

## 🎨 Personalizando para o seu evento

- **Textos do evento** (nome, edição, datas, horas, frase): `src/app/core/event.config.ts`.
- **Arte do certificado**: substitua `public/certificado/frente.png` e `verso.png` (A4 paisagem). Título, assinaturas e conteúdo programático fazem parte da imagem.
- **Posição dos textos dinâmicos** (nome, data, código): `src/app/core/certificate.config.ts`.

As artes incluídas neste repositório pertencem ao evento original. Troque-as pelas suas ao reutilizar o projeto.

## 📁 Estrutura

```
src/app/
├── core/     # serviços, modelos, regras de negócio e configuração do evento/certificado
├── pages/    # admin, director, accept-invite, login e verify
└── shared/   # componentes reutilizáveis (cabeçalho, modal, listas, formulários)
scripts/      # create-admin, deploy e carregamento do .env
firestore.rules
```

## 🤝 Contribuindo

Sugestões e pull requests são bem-vindos. Abra uma issue descrevendo a ideia ou o problema antes de mudanças grandes.

## 📄 Licença

O código é distribuído sob a licença [MIT](LICENSE). A arte e os textos do certificado do evento original não estão cobertos por ela.

---
Feito por [Victor Teodoro](https://github.com/victeo).
