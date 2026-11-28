import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';

const isTds = (id: string) => /\/node_modules\/\.pnpm\/@toss\+tds-(?:mobile|mobile-ait)@[^/]+\/node_modules\/@toss\/tds-(?:mobile|mobile-ait)\//.test(id);
function provenance(): Plugin {
  return {
    name: 'tds-provenance',
    generateBundle(_, bundle) {
      const entries = Object.values(bundle).filter(item => item.type === 'chunk' && item.name === 'tds-vendor');
      if (entries.length !== 1 || entries[0].type !== 'chunk') throw new Error('TDS chunk missing');
      const chunk = entries[0];
      const modules = Object.keys(chunk.modules);
      if (!modules.length || modules.some(id => !isTds(id))) throw new Error('Non-TDS module in TDS chunk: ' + modules.filter(id => !isTds(id)).join(', '));
      this.emitFile({ type: 'asset', fileName: 'tds-provenance.json', source: JSON.stringify({ file: chunk.fileName, sha256: createHash('sha256').update(chunk.code).digest('hex'), modules: modules.map(id => id.slice(id.lastIndexOf('/node_modules/'))) }) });
    },
  };
}
export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const api = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_BASE_URL;
    if (!api) throw new Error('VITE_API_BASE_URL is required for production builds');
    try { if (new URL(api).protocol !== 'https:') throw new Error('not HTTPS'); }
    catch { throw new Error('VITE_API_BASE_URL must be an HTTPS URL'); }
  }
  return {
  plugins: [react(), provenance()],
  build: { rollupOptions: { output: { onlyExplicitManualChunks: true, manualChunks(id) {
    if (isTds(id)) return 'tds-vendor';
  } } } },
  };
});
