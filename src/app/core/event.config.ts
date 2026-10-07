/** Identidade do site e do evento. Altere aqui para a próxima edição do encontro. */
export const siteName = 'Escola Espírita, a Escola que Educa';

export const eventConfig = {
  edition: '5861º',
  name: 'Encontro Fraterno Auta de Souza',
  city: 'Goiânia-GO',
  dates: '19 e 20 de setembro de 2026',
} as const;

export const eventFullName = `${eventConfig.edition} ${eventConfig.name}`;

export const quote = {
  text: 'Poderoso é o sol da verdade',
  author: 'Eurípedes Barsanulfo',
} as const;

/**
 * Dados variáveis do certificado. Título, assinaturas, frase de Eurípedes e conteúdo
 * programático fazem parte da arte (Canva) em `public/certificado/`.
 */
export const training = {
  issuer: 'A Direção das Obras Sociais do Centro Espírita Irmão Áureo',
  hours: 30,
  period: '18 a 20/09/2026',
  signedAt: 'Goiânia, 20 de Setembro de 2026.',
} as const;
