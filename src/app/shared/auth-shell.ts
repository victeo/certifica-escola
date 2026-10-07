import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { eventConfig, eventFullName, quote, siteName } from '../core/event.config';

/** Moldura das telas públicas (login, convite, verificação). */
@Component({
  selector: 'app-auth-shell',
  imports: [NgOptimizedImage],
  template: `
    <div class="grid min-h-dvh lg:grid-cols-2">
      <aside class="relative hidden overflow-hidden bg-navy-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div class="absolute inset-0 bg-linear-to-br from-navy-900 via-navy-800 to-pencil-500/70" aria-hidden="true"></div>
        <div class="absolute -bottom-24 -right-24 size-96 rounded-full bg-pencil-300/30 blur-3xl" aria-hidden="true"></div>
        <p class="relative font-display text-2xl">{{ siteName }}</p>
        <figure class="relative">
          <img ngSrc="euripedes-barsanulfo.png" width="300" height="400" alt="Retrato de Eurípedes Barsanulfo"
            class="mb-6 h-40 w-auto rounded-2xl border-4 border-pencil-300 object-cover shadow-xl" priority />
          <blockquote class="font-display text-4xl leading-tight xl:text-5xl">
            “{{ quote.text }}”
          </blockquote>
          <figcaption class="mt-3 text-lg text-pencil-300">— {{ quote.author }}</figcaption>
          <p class="mt-6 max-w-md text-base text-navy-100">
            Educador e médium espírita, fundou em 1907, em Sacramento (MG), o Colégio Allan Kardec,
            a primeira escola espírita do Brasil e do mundo.
          </p>
        </figure>
        <p class="relative text-sm text-navy-100">{{ eventFullName }} · {{ event.city }} · {{ event.dates }}</p>
      </aside>
      <main class="flex items-center justify-center p-5 sm:p-10">
        <div class="w-full max-w-md">
          <div class="mb-6 flex items-center gap-4 lg:hidden">
            <img ngSrc="euripedes-barsanulfo.png" width="300" height="400" alt="Retrato de Eurípedes Barsanulfo"
              class="size-20 shrink-0 rounded-full border-4 border-pencil-400 object-cover object-top shadow-md" priority />
            <div>
              <p class="font-display text-xl leading-tight text-navy-800">{{ siteName }}</p>
              <p class="mt-1 text-sm text-slate-700">“{{ quote.text }}” — {{ quote.author }}</p>
            </div>
          </div>
          <div class="card shadow-lg"><ng-content /></div>
        </div>
      </main>
    </div>
  `,
})
export class AuthShell {
  protected readonly siteName = siteName;
  protected readonly event = eventConfig;
  protected readonly eventFullName = eventFullName;
  protected readonly quote = quote;
}
