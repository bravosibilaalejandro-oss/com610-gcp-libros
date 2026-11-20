jest.mock('../src/repository', () => ({ list: jest.fn(), get: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn() }));
const request = require('supertest');
const repo = require('../src/repository');
const app = require('../src/app');
beforeEach(() => jest.clearAllMocks());
test('GET /health responde 200', async () => {
  const response = await request(app).get('/health');
  expect(response.status).toBe(200);
  expect(response.body.status).toBe('ok');
});
test('POST /libros crea un libro válido', async () => {
  const libro = { id: 1, titulo: 'Redes', autor: 'Autor', anio_publicacion: 2026 };
  repo.create.mockResolvedValue(libro);
  const response = await request(app).post('/libros').send({ titulo: ' Redes ', autor: 'Autor', anio_publicacion: 2026 });
  expect(response.status).toBe(201);
  expect(response.body).toEqual(libro);
  expect(repo.create).toHaveBeenCalledWith({ titulo: 'Redes', autor: 'Autor', anio_publicacion: 2026 });
});
test.each([
  { titulo: '', autor: 'A', anio_publicacion: 2026 },
  { titulo: 'T', autor: ' ', anio_publicacion: 2026 },
  { titulo: 'T', autor: 'A', anio_publicacion: '2026' },
  { titulo: 'T', autor: 'A', anio_publicacion: 2026.5 }
])('POST /libros rechaza datos inválidos: %j', async (bad) => {
  const response = await request(app).post('/libros').send(bad);
  expect(response.status).toBe(400);
  expect(repo.create).not.toHaveBeenCalled();
});
test('GET /libros/999 devuelve 404', async () => {
  repo.get.mockResolvedValue(null);
  const response = await request(app).get('/libros/999');
  expect(response.status).toBe(404);
});
test('GET /libros retorna colección', async () => {
  repo.list.mockResolvedValue([]);
  const response = await request(app).get('/libros');
  expect(response.status).toBe(200);
  expect(response.body).toEqual([]);
});
test('PUT /libros/3 devuelve 404 si no existe', async () => {
  repo.update.mockResolvedValue(null);
  const response = await request(app).put('/libros/3').send({ titulo: 'T', autor: 'A', anio_publicacion: 2025 });
  expect(response.status).toBe(404);
});
test('DELETE /libros/3 devuelve 404 si no existe', async () => {
  repo.remove.mockResolvedValue(false);
  const response = await request(app).delete('/libros/3');
  expect(response.status).toBe(404);
});
