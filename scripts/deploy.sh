#!/usr/bin/env bash
# Deploy no Firebase.
#
# Uso:
#   scripts/deploy.sh [tudo|hosting|regras]     (padrão: tudo)
#
# Autenticação: rode `npx firebase login` uma vez, ou exporte FIREBASE_TOKEN
# (gerado com `npx firebase login:ci`) para uso em CI.
set -euo pipefail

cd "$(dirname "$0")/.."

TARGET="${1:-tudo}"
case "$TARGET" in
  tudo)    ONLY="hosting,firestore" ;;
  hosting) ONLY="hosting" ;;
  regras)  ONLY="firestore" ;;
  *) echo "Uso: $0 [tudo|hosting|regras]" >&2; exit 1 ;;
esac

# Sincroniza configuração a partir do .env
node scripts/set-env.mjs

# Trava: não publica com credenciais ainda não preenchidas.
if grep -q "SUA_API_KEY\|SEU_PROJETO\|SEU_APP_ID" src/app/core/firebase.config.ts .firebaserc; then
  echo "Erro: preencha o arquivo .env (ou variáveis de ambiente) e o .firebaserc com os dados do seu projeto Firebase." >&2
  exit 1
fi

TOKEN_ARGS=()
if [[ -n "${FIREBASE_TOKEN:-}" ]]; then
  TOKEN_ARGS=(--token "$FIREBASE_TOKEN")
fi

if [[ "$ONLY" == *hosting* ]]; then
  echo "==> Instalando dependências"
  npm ci
  echo "==> Build de produção"
  npm run build
fi

echo "==> Deploy ($ONLY)"
npx firebase deploy --only "$ONLY" "${TOKEN_ARGS[@]}"
