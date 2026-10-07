import { Component, effect, ElementRef, input, model, viewChild } from '@angular/core';

/** Diálogo modal acessível (elemento nativo <dialog>: foco preso e Esc fecha). */
@Component({
  selector: 'app-modal',
  template: `
    <dialog
      #dlg
      class="m-auto w-[min(92vw,34rem)] rounded-2xl border border-navy-100 bg-white p-0 shadow-2xl backdrop:bg-slate-900/50"
      [attr.aria-labelledby]="'modal-title'"
      (close)="open.set(false)"
      (click)="onBackdrop($event)"
    >
      <div class="p-5 sm:p-6">
        <div class="mb-4 flex items-start justify-between gap-4">
          <h2 id="modal-title" class="font-display text-xl font-semibold text-navy-900">{{ heading() }}</h2>
          <button type="button" class="btn-ghost btn-sm" (click)="open.set(false)" aria-label="Fechar">✕</button>
        </div>
        @if (open()) {
          <ng-content />
        }
      </div>
    </dialog>
  `,
})
export class Modal {
  readonly heading = input.required<string>();
  readonly open = model(false);
  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    effect(() => {
      const el = this.dlg().nativeElement;
      if (this.open() && !el.open) el.showModal();
      else if (!this.open() && el.open) el.close();
    });
  }

  protected onBackdrop(event: MouseEvent) {
    if (event.target === this.dlg().nativeElement) this.open.set(false);
  }
}
