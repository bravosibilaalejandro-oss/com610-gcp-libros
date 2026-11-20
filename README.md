# COM610 — Segundo parcial: API REST de libros en Google Cloud

**Adaptación de AWS a Google Cloud:** EC2 → **Compute Engine (VM Ubuntu)**, RDS MySQL → **Cloud SQL for MySQL**, security groups → **reglas de firewall VPC**, registro de imágenes → **GitHub Container Registry (GHCR)**. Código y pipeline para ambos ejercicios.

> **Estado:** código preparado; infraestructura, despliegue público, ejecuciones de Actions y capturas reales requieren aprovisionamiento en una cuenta de Google Cloud y publicación del repositorio. No se afirma que la API ya esté desplegada.

## Endpoints

| Método | Ruta | Resultado |
|---|---|---|
| GET | `/health` | 200 `{ "status": "ok", "version": "..." }` |
| GET | `/libros` | 200 lista desde MySQL |
| GET | `/libros/:id` | 200 o 404 |
| POST | `/libros` | 201 o 400 |
| PUT | `/libros/:id` | 200, 400 o 404 |
| DELETE | `/libros/:id` | 204 o 404 |

Ejemplo de cuerpo JSON: `{ "titulo": "Redes", "autor": "Autor", "anio_publicacion": 2026 }`.

## Pruebas locales

Requiere Node.js 22 o posterior.

```bash
npm ci
npm test
cp .env.example .env # configurar con credenciales propias; NO subir .env
npm start
curl http://127.0.0.1:3000/health
```

**Para completar el requisito del examen, ejecutar `npm install` localmente y subir el archivo `package-lock.json`.** En esta entrega parcial los workflows generan un lockfile temporal en el runner solo si falta, antes de ejecutar `npm ci`, para permitir probar el código desde GitHub sin preparar Windows. Este lockfile temporal NO sustituye al archivo exigido dentro del repositorio. La prueba automatizada no necesita Cloud SQL: simula el repositorio de datos. `GET /libros` sí requiere MySQL en ejecución.

## Infraestructura Google Cloud — Tema 4

1. Crear proyecto GCP con facturación activada, habilitar **Compute Engine API**, **Cloud SQL Admin API** y **Service Networking API**.
2. Configurar una VPC y subred regional. Configurar **Private Services Access** con rango reservado y conexión de peering para Cloud SQL. Crear instancia **Cloud SQL MySQL 8** **solo con IP privada**, en la misma región de la VM, y una base `biblioteca` con usuario de privilegios mínimos. Ejecutar `db.sql` desde la VM o Cloud SQL Studio. Cloud SQL no usa los grupos de seguridad de EC2: no asignarle IP pública y limitar la conectividad a la VPC privada autorizada. Ajustar IAM, rutas y controles de red según el entorno.
3. Crear VM **Compute Engine** con Ubuntu en esa VPC. Asignar IP externa **estática** para que la dirección no cambie durante revisión. Instalar `docker.io`, `nginx`, `curl`; habilitar y arrancar Docker y Nginx.
4. Crear firewall VPC para **TCP 80** desde `0.0.0.0/0` solo a la VM identificada por etiqueta de red; para **TCP 22** solo desde **tu IP pública/32**. No abrir 3000 ni 3306 a Internet. El CD usa un runner autoalojado dentro de la propia VM; no requiere SSH desde GitHub.
5. Configurar `/etc/com610/api.env` en VM con modo `640` y propietario/grupo `root:docker` (directorio `root:docker` con modo `750`), para el runner dedicado miembro de `docker`; variables privadas `DB_HOST` (IP privada SQL), `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `PORT=3000`, `HOST=0.0.0.0`. Este archivo **no entra al repositorio ni a Docker**. Cuenta y permisos de Docker del usuario de despliegue deben limitarse.
6. Copiar `infra/nginx.conf` a `/etc/nginx/sites-available/com610`, activarlo en `sites-enabled`, desactivar el sitio predeterminado y ejecutar `nginx -t && systemctl reload nginx`. Nginx publica solo puerto 80 y reenvía a `127.0.0.1:3000`. Docker publica exclusivamente al loopback del host.

## CI/CD — Tema 5

- `.github/workflows/ci.yml`: genera lockfile temporal si falta, después ejecuta `npm ci` y `npm test` en `push` y `pull_request` hacia main.
- `.github/workflows/cd.yml`: **test → publish → deploy**, solo en `push` a main; el trabajo `deploy` se omite hasta definir la variable de repositorio `DEPLOY_ENABLED=true` después de instalar el runner de producción. Publica imagen `ghcr.io/OWNER/REPO:<SHA>` mediante `GITHUB_TOKEN` y ejecuta `infra/deploy.sh` en un runner autoalojado en la VM (`self-hosted`, `linux`, `x64`, `com610-prod`).
- `infra/deploy.sh`: descarga imagen candidata, la ejecuta en puerto **127.0.0.1:3001** y comprueba `/health` y `/libros` antes de reemplazar el servicio. Comprueba de nuevo en 3000; ante error, intenta restaurar la imagen anterior. No garantiza cero tiempo de inactividad en el momento del reemplazo.
- No son necesarios secretos SSH de GitHub Actions con esta modalidad; se usa el `GITHUB_TOKEN` automático con permisos mínimos para publicar y descargar el paquete. La contraseña de Cloud SQL se guarda **solo en la VM**. Revisar permisos del paquete GHCR para que el repositorio tenga acceso de Actions.
- Instalar y registrar el runner de GitHub Actions **en la VM**, con etiqueta personalizada `com610-prod`, como servicio del sistema; el usuario dedicado del runner necesita acceso a Docker y lectura de `/etc/com610/api.env`. Tras preparar Cloud SQL, Nginx y Docker, hacer un `push` a `main` para disparar el primer CD.

**Conectividad de CI/CD:** el trabajo `deploy` ya está preparado para ejecutarse en un runner **autoalojado en la VM**, etiquetado `com610-prod`. Por eso NO hace falta abrir SSH a las IP de GitHub ni configurar claves SSH en Actions. No permitir que flujos disparados por PR de desconocidos se ejecuten en este runner de producción. El archivo `/etc/com610/api.env` debe ser legible por el usuario del runner (por ejemplo, propietario `root`, grupo `docker` y permisos `640`; su directorio también debe permitir acceso al grupo).

## Verificación y evidencia de CRUD

Reemplazar `IP_PUBLICA` por la IP de la VM y ejecutar desde un equipo externo:

```bash
curl http://IP_PUBLICA/health
curl http://IP_PUBLICA/libros
curl -X POST http://IP_PUBLICA/libros -H 'Content-Type: application/json' -d '{"titulo":"Redes","autor":"A. Ejemplo","anio_publicacion":2026}'
curl -X PUT http://IP_PUBLICA/libros/1 -H 'Content-Type: application/json' -d '{"titulo":"Redes 2","autor":"A. Ejemplo","anio_publicacion":2025}'
curl http://IP_PUBLICA/libros/1
curl -X DELETE http://IP_PUBLICA/libros/1
```

Consultar `SELECT * FROM biblioteca.libros;` desde Cloud SQL para comprobar persistencia. Capturar la prueba antes y después de las operaciones, ocultando secretos. Para demostrar nueva versión, realizar un cambio y comprobar la propiedad `version` en `/health` después del CD.

**URL pública de la API:** Pendiente de aprovisionamiento.

**Ejecución exitosa CI:** Pendiente de publicación y ejecución.

**Ejecución exitosa CD:** Pendiente de publicación y despliegue.

Para evitar cargos, eliminar recursos después de la revisión del docente.

## Guía práctica de entrega

Ver [`PASOS-PARA-ENTREGAR.md`](PASOS-PARA-ENTREGAR.md) para una secuencia detallada de configuración y la lista de comprobaciones previas a eCampus.

## Estado de la entrega parcial y requisitos pendientes

Este repositorio presenta código fuente, tests, modelo SQL, contenedor, y flujos de CI y publicación de imagen. **No se han obtenido todavía resultados reales de las pruebas ni de Actions ni se ha desplegado la API**. Al subir los archivos a GitHub, revisa la pestaña Actions para ver resultados auténticos. Para la evaluación completa falta: `package-lock.json` versionado, VM Compute Engine, instancia privada Cloud SQL, runner, evidencia de CRUD y despliegue, URL pública en README, y conformidad del docente con usar Google Cloud en lugar de AWS. No inventar evidencia ni direcciones de la API.

Consulta [INFORME-DE-AVANCE.md](INFORME-DE-AVANCE.md) para explicar de manera transparente el estado del proyecto.
