# Informe de avance — Segundo examen parcial COM610

## Tema 4 — API REST de libros (implementación en código)

El repositorio contiene una API Node.js + Express para libros, con rutas GET /health, GET /libros, GET /libros/:id, POST /libros, PUT /libros/:id y DELETE /libros/:id. Incluye validación de datos, respuestas HTTP previstas, conexión MySQL por variables de entorno y consultas parametrizadas. El archivo `db.sql` crea la tabla de libros. Se documenta la adaptación planteada de Amazon EC2 a Google Compute Engine y de RDS a Cloud SQL.

## Tema 5 — Automatización (implementación en código)

Incluye pruebas con Jest y Supertest que usan dobles de prueba del repositorio, `Dockerfile`, `.github/workflows/ci.yml` y `.github/workflows/cd.yml`. Los flujos están preparados para pruebas y publicación de imagen con SHA. El despliegue queda deshabilitado hasta configurar un runner propio en una VM y activar `DEPLOY_ENABLED=true`.

## Pendiente de implementación/verificación real

- Creación y configuración de la VM y Cloud SQL privadas; permisos y firewall.
- Ejecución real del CRUD y comprobación de persistencia en la nube.
- Registro del runner y despliegue de producción, con Nginx.
- Evidencias auténticas, URL pública y enlaces a ejecuciones exitosas.
- Incluir `package-lock.json` versionado (puede generarse con `npm install`).
- Confirmación docente de que se admite Google Cloud en lugar de AWS.

> **Entrega parcial:** el código está preparado, pero no se afirma que la infraestructura, CI/CD o API hayan sido probados o estén activos. La calificación de esta entrega depende de los criterios y del docente.
