import { computed, Service, signal } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Invite, UserProfile } from './models';

@Service()
export class AuthService {
  private readonly _user = signal<User | null>(null);
  private readonly _profile = signal<UserProfile | null>(null);

  readonly user = this._user.asReadonly();
  readonly profile = this._profile.asReadonly();
  readonly role = computed(() => this._profile()?.role ?? null);

  /** Resolve quando o estado inicial de autenticação (e o perfil) foram carregados. */
  readonly ready: Promise<void> = new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      this._user.set(user);
      this._profile.set(user ? await this.loadProfile(user.uid) : null);
      resolve();
    });
  });

  async login(email: string, password: string): Promise<UserProfile> {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    const profile = await this.loadProfile(user.uid);
    if (!profile) {
      await signOut(auth);
      throw new Error('profile-not-found');
    }
    this._user.set(user);
    this._profile.set(profile);
    return profile;
  }

  /** Cria a conta do diretor consumindo o convite de forma atômica (batch). */
  async registerWithInvite(invite: Invite, name: string, email: string, password: string) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    const profile: UserProfile = { name, email, role: 'director', schoolName: invite.schoolName };
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', user.uid), { ...profile, inviteCode: invite.code, createdAt: serverTimestamp() });
      batch.update(doc(db, 'invites', invite.code), { used: true, usedBy: user.uid, usedAt: serverTimestamp() });
      await batch.commit();
    } catch (error) {
      await user.delete().catch(() => undefined);
      throw error;
    }
    this._user.set(user);
    this._profile.set(profile);
  }

  async getInvite(code: string): Promise<Invite | null> {
    const snap = await getDoc(doc(db, 'invites', code));
    if (!snap.exists()) return null;
    return { code, ...(snap.data() as Omit<Invite, 'code'>) };
  }

  isInviteUsable(invite: Invite): boolean {
    return !invite.used && invite.expiresAt.toMillis() > Timestamp.now().toMillis();
  }

  async logout() {
    await signOut(auth);
    this._user.set(null);
    this._profile.set(null);
  }

  private async loadProfile(uid: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  }
}
