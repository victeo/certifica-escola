// URL do Worker de envio de e-mails (definida no .env como MAIL_WORKER_URL e injetada pelo build).
declare const process: { env: { MAIL_WORKER_URL?: string } };

export const mailWorkerUrl: string = (process.env.MAIL_WORKER_URL ?? '').replace(/\/$/, '');
