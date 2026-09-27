import { buildApp } from './app.js';
import { env } from './utils/env.js';

async function startServer() {
  const app = await buildApp();

  try {
    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });
    app.log.info(`Server running at http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}, closing server...`);
      await app.close();
      process.exit(0);
    });
  }
}

startServer();
