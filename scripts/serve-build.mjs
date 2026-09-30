// Servidor estático para probar el build (out/) con el mismo basePath que
// GitHub Pages. Usa NEXT_PUBLIC_BASE_PATH (el del build), p.ej.:
//   NEXT_PUBLIC_BASE_PATH=/Tierra_Linda_De_La_Pradera node scripts/serve-build.mjs
import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { join, extname } from 'path';

const ROOT = join(process.cwd(), 'out');
const PORT = 4000;
const PREFIX = process.env.NEXT_PUBLIC_BASE_PATH ?? '/Tierra_Linda_De_La_Pradera';

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.txt': 'text/plain',
  '.ico': 'image/x-icon', '.webp': 'image/webp',
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent((req.url || '/').split('?')[0]);
    if (path.startsWith(PREFIX)) path = path.slice(PREFIX.length) || '/';
    let filePath = join(ROOT, path);

    try {
      const s = await stat(filePath);
      if (s.isDirectory()) filePath = join(filePath, 'index.html');
    } catch {
      // ruta sin extensión → intentar como carpeta con index.html
      if (!extname(filePath)) filePath = join(filePath, 'index.html');
    }

    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': TYPES[extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(PORT, () => console.log(`Sirviendo out/ en http://localhost:${PORT}${PREFIX}/`));
