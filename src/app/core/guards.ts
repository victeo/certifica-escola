import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from './models';

export const roleGuard =
  (role: Role): CanActivateFn =>
  async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    await auth.ready;
    if (auth.role() === role) return true;
    return router.createUrlTree(['/login']);
  };

export const homeRedirect: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready;
  const role = auth.role();
  return router.createUrlTree([role === 'admin' ? '/admin' : role === 'director' ? '/diretor' : '/login']);
};
