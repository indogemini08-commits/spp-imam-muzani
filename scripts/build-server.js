import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

async function build() {
  console.log('Building serverless API bundle for Vercel...');

  // Ensure directories exist
  if (!fs.existsSync('api')) {
    fs.mkdirSync('api', { recursive: true });
  }
  if (!fs.existsSync('server/data')) {
    fs.mkdirSync('server/data', { recursive: true });
  }

  // Copy sql-wasm.wasm to api/ and server/data/ so it is always present
  const wasmSrc = path.resolve('node_modules/sql.js/dist/sql-wasm.wasm');
  if (fs.existsSync(wasmSrc)) {
    fs.copyFileSync(wasmSrc, 'api/sql-wasm.wasm');
    fs.copyFileSync(wasmSrc, 'server/data/sql-wasm.wasm');
    console.log('Copied sql-wasm.wasm to api/ and server/data/');
  }

  // Build bundle with esbuild
  await esbuild.build({
    entryPoints: ['server/src/vercel.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    outfile: 'api/index.js',
    banner: {
      js: `import { createRequire as __cr } from 'module';\nimport { fileURLToPath as __futp } from 'url';\nimport { dirname as __dname } from 'path';\nconst require = __cr(import.meta.url);\nconst __filename = __futp(import.meta.url);\nconst __dirname = __dname(__filename);\n`
    },
    external: ['sql.js']
  });

  console.log('Serverless API bundle successfully created at api/index.js');
}

build().catch(err => {
  console.error('Server build failed:', err);
  process.exit(1);
});
