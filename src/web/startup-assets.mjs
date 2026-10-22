// This runs on emitted Rollup chunks, not source imports or guessed filenames.
export function verifyStartupAssets(bundle) {
  const chunks = Object.values(bundle).filter(item => item.type === 'chunk');
  const files = new Map(chunks.map(chunk => [chunk.fileName, chunk]));
  const entries = chunks.filter(chunk => chunk.isEntry);
  if (entries.length !== 1) throw new Error('Expected one editor entry chunk.');
  function visit(dynamic) {
    const seen = new Set();
    function walk(chunk) {
      if (seen.has(chunk)) return;
      seen.add(chunk);
      for (const name of [...chunk.imports, ...(dynamic ? chunk.dynamicImports : [])]) {
        const dependency = files.get(name);
        if (!dependency) throw new Error(`Missing emitted dependency: ${name}`);
        walk(dependency);
      }
    }
    walk(entries[0]); return seen;
  }
  const staticChunks = visit(false), reachable = visit(true);
  const deferredOnly = path => /\/src\/web\/(print-view|inline-html|png-export)\.ts$/.test(path)
    || /\/node_modules\/(hast-util-raw|html-to-image)\//.test(path);
  for (const chunk of staticChunks) for (const path of Object.keys(chunk.modules)) {
    if (deferredOnly(path.replaceAll('\\', '/'))) throw new Error(`Deferred dependency enters startup: ${path}`);
  }
  for (const module of ['print-view', 'inline-html', 'png-export']) {
    if (![...reachable].some(chunk => Object.keys(chunk.modules).some(path => path.replaceAll('\\', '/').endsWith(`/src/web/${module}.ts`)))) {
      throw new Error(`Missing deferred module: ${module}`);
    }
  }
  return { staticChunks: staticChunks.size, staticBytes: [...staticChunks].reduce((bytes, chunk) => bytes + new TextEncoder().encode(chunk.code).length, 0) };
}
