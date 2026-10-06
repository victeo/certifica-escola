const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/email-already-in-use': 'Este e-mail já possui cadastro.',
  'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/too-many-requests': 'Muitas tentativas. Tente novamente em instantes.',
  'permission-denied': 'Você não tem permissão para esta ação (convite inválido, usado ou expirado?).',
  'profile-not-found': 'Seu cadastro não foi encontrado. Fale com o administrador.',
};

export function errorMessage(error: unknown): string {
  const code = (error as { code?: string; message?: string })?.code ?? (error as Error)?.message ?? '';
  return MESSAGES[code] ?? MESSAGES[code.replace('firestore/', '')] ?? 'Ocorreu um erro inesperado. Tente novamente.';
}
