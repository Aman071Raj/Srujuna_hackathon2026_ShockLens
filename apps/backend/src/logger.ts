import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  // Redact sensitive financial and personal fields from logs
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'body.password',
      'body.currentPassword',
      'body.newPassword',
    ],
    censor: '[REDACTED]',
  },
});
