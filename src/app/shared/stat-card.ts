import { Component, input } from '@angular/core';

@Component({
  selector: 'app-stat',
  template: `
    <div class="rounded-2xl border border-navy-100 bg-white p-4 shadow-sm">
      <p class="text-sm font-bold text-slate-700">{{ label() }}</p>
      <p class="font-display text-3xl font-semibold text-navy-900">{{ value() }}</p>
      @if (hint()) {
        <p class="mt-1 text-xs text-slate-700">{{ hint() }}</p>
      }
    </div>
  `,
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input('');
}
