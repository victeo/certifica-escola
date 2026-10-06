import { Component } from '@angular/core';

/** Moldura das telas públicas (login, convite, verificação). */
@Component({
  selector: 'app-auth-shell',
  template: `
    <div class="grid min-h-dvh lg:grid-cols-2">
      <aside class="relative hidden overflow-hidden bg-chalk-800 p-12 text-white lg:flex lg:flex-col lg:justify-between" aria-hidden="true">
        <div class="absolute inset-4 rounded-3xl border-4 border-dashed border-white/15"></div>
        <p class="relative font-display text-2xl">🎓 Certifica Escola</p>
        <div class="relative">
          <p class="font-display text-5xl leading-tight">
            Quem ensina<br />merece ser<br /><span class="text-pencil-400">reconhecido.</span>
          </p>
          <p class="mt-4 max-w-sm text-lg text-emerald-50/90">
            Cadastre seus professores e emita certificados autênticos em segundos.
          </p>
        </div>
        <p class="relative text-4xl tracking-widest">📚 ✏️ 🍎 🔔</p>
      </aside>
      <main class="flex items-center justify-center p-5 sm:p-10">
        <div class="w-full max-w-md">
          <p class="mb-6 font-display text-2xl text-navy-800 lg:hidden"><span aria-hidden="true">🎓</span> Certifica Escola</p>
          <div class="card shadow-lg"><ng-content /></div>
        </div>
      </main>
    </div>
  `,
})
export class AuthShell {}
