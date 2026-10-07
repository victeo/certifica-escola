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

/** Conteúdo do certificado (frente e verso). Altere aqui a cada edição. */
export const training = {
  title: 'TREINAMENTO ESCOLA ESPÍRITA',
  year: 2026,
  issuer: 'A Direção das Obras Sociais do Centro Espírita Irmão Áureo',
  hours: 30,
  period: '18 a 20/09/2026',
  signedAt: 'Goiânia, 20 de Setembro de 2026.',
  signatureLabels: { left: 'OSCEIA', right: 'PARTICIPANTE' },
  program: [
    'Vivência nas turmas de Educação Básica - Educação Infantil e Ensino Fundamental.',
    'Oficinas pedagógicas nas diversas áreas de conhecimento',
    'Palestra: Emmanuel Educando almas à luz do Evangelho.',
  ],
  quote: {
    text: 'Creio que o homem é justificado não por sua fé, mas por suas obras, que a prática do bem é a lei superior; que a santidade é o alvo que devemos chegar...',
    author: 'Eurípedes Barsanulfo',
  },
} as const;
