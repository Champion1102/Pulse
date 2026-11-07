import { networkInterfaces } from 'os';
import { createApp } from './app';
import { hydrate } from './config/hydrate';
import { DocumentStore, NullDocumentStore } from './infrastructure/persistence/DocumentStore';
import { PostgresDocumentStore } from './infrastructure/persistence/PostgresDocumentStore';

async function main() {
  const port = Number(process.env.PORT ?? 3000);

  let store: DocumentStore = new NullDocumentStore();
  if (process.env.DATABASE_URL) {
    const pg = new PostgresDocumentStore(process.env.DATABASE_URL);
    await pg.init();
    store = pg;
  }

  const { http, container } = createApp({ store });
  const counts = await hydrate(container);

  http.listen(port, () => {
    const lan = Object.values(networkInterfaces())
      .flat()
      .find((i) => i && i.family === 'IPv4' && !i.internal)?.address;
    console.log(`Pulse running on http://localhost:${port}`);
    if (lan) console.log(`Students on the same Wi-Fi: http://${lan}:${port}`);
    console.log(`Storage: ${store.name}${Object.keys(counts).length ? ` (loaded ${JSON.stringify(counts)})` : ''}`);
    console.log(`AI drafts: ${container.drafts.providerName}`);
    if (store.name === 'memory') console.log('Note: no DATABASE_URL set, data is lost on restart.');
  });

  const shutdown = async () => {
    http.close();
    await store.flush();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
