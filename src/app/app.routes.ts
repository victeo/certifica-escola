import { Routes } from '@angular/router';
import { homeRedirect, roleGuard } from './core/guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [homeRedirect], children: [] },
  { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.Login) },
  {
    path: 'convite/:code',
    loadComponent: () => import('./pages/accept-invite/accept-invite').then((m) => m.AcceptInvite),
  },
  { path: 'verificar/:code', loadComponent: () => import('./pages/verify/verify').then((m) => m.Verify) },
  {
    path: 'admin',
    canActivate: [roleGuard('admin')],
    loadComponent: () => import('./pages/admin/admin-shell').then((m) => m.AdminShell),
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./pages/admin/overview').then((m) => m.AdminOverview) },
      { path: 'escolas', loadComponent: () => import('./pages/admin/schools').then((m) => m.AdminSchools) },
      { path: 'professores', loadComponent: () => import('./pages/admin/teachers').then((m) => m.AdminTeachers) },
      { path: 'relatorios', loadComponent: () => import('./pages/admin/reports').then((m) => m.AdminReports) },
    ],
  },
  {
    path: 'diretor',
    canActivate: [roleGuard('director')],
    loadComponent: () => import('./pages/director/director').then((m) => m.Director),
  },
  { path: '**', redirectTo: '' },
];
