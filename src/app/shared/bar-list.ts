import { Component, computed, input } from '@angular/core';

export interface BarItem {
  label: string;
  value: number;
}

/** Gráfico de barras horizontais simples e acessível (a lista traz os valores em texto). */
@Component({
  selector: 'app-bar-list',
  template: `
    <ul class="space-y-2">
      @for (item of items(); track item.label) {
        <li class="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,14rem)_1fr_auto]">
          <span class="truncate text-slate-900" [title]="item.label">{{ item.label }}</span>
          <span class="h-3 rounded-full bg-navy-50" aria-hidden="true">
            <span class="block h-3 rounded-full bg-navy-600" [style.width.%]="percent(item.value)"></span>
          </span>
          <span class="w-8 text-right font-bold text-navy-900">{{ item.value }}</span>
        </li>
      }
    </ul>
  `,
})
export class BarList {
  readonly items = input.required<BarItem[]>();
  private readonly max = computed(() => Math.max(1, ...this.items().map((i) => i.value)));
  protected percent(value: number): number {
    return Math.round((value / this.max()) * 100);
  }
}
