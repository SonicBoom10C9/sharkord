import { ensureServerDirs } from './src/helpers/ensure-server-dirs';
import { loadEmbeds } from './src/utils/embeds';

// this needs to be done before running tests in the CI to make sure the necessary directories and migrations are in place

await ensureServerDirs();
await loadEmbeds();
