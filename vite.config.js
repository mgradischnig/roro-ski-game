import { defineConfig } from 'vite';
import { resolve } from 'path';
import { tmpdir } from 'os';

// Move Vite's dependency cache out of Dropbox to prevent file locking issues
const cacheDir = resolve(tmpdir(), 'vite-roro-ski-cache');

export default defineConfig({
  cacheDir,
});
