import { Routes } from '@angular/router';
import { homeRedirect, roleGuard } from './core/guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [homeRedirect], children: [] },
  { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.Login) },
  {
    path: 'convite/:code',
    loadComponent: () => import('./pages/accept-invite/accept-invite').then((m) => m.AcceptInvite),
  },
  {
    path: 'admin',
    canActivate: [roleGuard('admin')],
    loadComponent: () => import('./pages/admin/admin').then((m) => m.Admin),
  },
  {
    path: 'diretor',
    canActivate: [roleGuard('director')],
    loadComponent: () => import('./pages/director/director').then((m) => m.Director),
  },
  { path: '**', redirectTo: '' },
];
