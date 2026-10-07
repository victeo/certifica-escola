// Os valores vêm do arquivo .env (ver .env.example) e são injetados em build/serve
// por scripts/ng-env.mjs via `--define process.env.FIREBASE_*`.
// Use sempre `npm start` / `npm run build` / `npm test`, nunca `ng` diretamente.

declare const process: {
  env: {
    FIREBASE_API_KEY?: string;
    FIREBASE_AUTH_DOMAIN?: string;
    FIREBASE_PROJECT_ID?: string;
    FIREBASE_APP_ID?: string;
  };
};

export const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY ?? '',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.FIREBASE_PROJECT_ID ?? '',
  appId: process.env.FIREBASE_APP_ID ?? '',
};
