import 'dotenv/config';
import app from './app';
import { logger } from './logger';

const PORT = parseInt(process.env.PORT ?? '4000', 10);

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'ShockLens API server started');
});
