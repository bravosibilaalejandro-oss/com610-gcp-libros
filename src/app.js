const express = require('express');
const repo = require('./repository');
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

function parseId(value) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 4294967295 ? id : null;
}
function validateBook(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const { titulo, autor, anio_publicacion } = body;
  if (typeof titulo !== 'string' || !titulo.trim() || titulo.trim().length > 255) return null;
  if (typeof autor !== 'string' || !autor.trim() || autor.trim().length > 255) return null;
  if (!Number.isInteger(anio_publicacion) || anio_publicacion < 0 || anio_publicacion > 9999) return null;
  return { titulo: titulo.trim(), autor: autor.trim(), anio_publicacion };
}
const handle = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
app.get('/health', (req, res) => res.json({ status: 'ok', version: process.env.APP_VERSION || 'local' }));
app.get('/libros', handle(async (req, res) => res.json(await repo.list())));
app.get('/libros/:id', handle(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID inválido' });
  const libro = await repo.get(id);
  return libro ? res.json(libro) : res.status(404).json({ error: 'Libro no encontrado' });
}));
app.post('/libros', handle(async (req, res) => {
  const input = validateBook(req.body);
  if (!input) return res.status(400).json({ error: 'Datos inválidos' });
  return res.status(201).json(await repo.create(input));
}));
app.put('/libros/:id', handle(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID inválido' });
  const input = validateBook(req.body);
  if (!input) return res.status(400).json({ error: 'Datos inválidos' });
  const libro = await repo.update(id, input);
  return libro ? res.json(libro) : res.status(404).json({ error: 'Libro no encontrado' });
}));
app.delete('/libros/:id', handle(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID inválido' });
  return (await repo.remove(id)) ? res.status(204).end() : res.status(404).json({ error: 'Libro no encontrado' });
}));
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  console.error('Error inesperado:', err.message);
  return res.status(500).json({ error: 'Error interno' });
});
module.exports = app;
