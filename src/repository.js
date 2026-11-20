const { getPool } = require('./db');
const fields = 'id, titulo, autor, anio_publicacion';
async function list() {
  const [rows] = await getPool().execute(`SELECT ${fields} FROM libros ORDER BY id`);
  return rows;
}
async function get(id) {
  const [rows] = await getPool().execute(`SELECT ${fields} FROM libros WHERE id = ?`, [id]);
  return rows[0] || null;
}
async function create(input) {
  const [result] = await getPool().execute('INSERT INTO libros (titulo, autor, anio_publicacion) VALUES (?, ?, ?)', [input.titulo, input.autor, input.anio_publicacion]);
  return get(result.insertId);
}
async function update(id, input) {
  const [result] = await getPool().execute('UPDATE libros SET titulo = ?, autor = ?, anio_publicacion = ? WHERE id = ?', [input.titulo, input.autor, input.anio_publicacion, id]);
  if (!result.affectedRows) return null;
  return get(id);
}
async function remove(id) {
  const [result] = await getPool().execute('DELETE FROM libros WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
module.exports = { list, get, create, update, remove };
