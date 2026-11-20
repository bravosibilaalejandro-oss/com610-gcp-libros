# Pasos para entregar — COM610 en Google Cloud

**Importante:** El enunciado original exige AWS; solicita al docente autorización para sustituir EC2 por Compute Engine y RDS por Cloud SQL antes de presentar el examen con esta alternativa.

## 1. Preparación local (Windows, PowerShell o VS Code)

1. Descomprime `com610-gcp-libros.zip`.
2. Instala Node.js 22 y Git, si no los tienes.
3. Abre una terminal dentro de la carpeta `com610-gcp-libros`.
4. Ejecuta:

   ```bash
   npm install
   npm test
   ```

   `npm install` debe crear **package-lock.json**. No utilices `npm ci` hasta que ese archivo exista.
5. Comprueba que NO tienes ningún archivo `.env`, `.pem`, `.key`, contraseñas ni tokens listos para subir.

## 2. Repositorio público GitHub

1. En `https://github.com/new` crea el repositorio `com610-gcp-libros` como **Public**, vacío (sin README generado).
2. En la carpeta del proyecto ejecuta, sustituyendo USUARIO por tu usuario GitHub:

   ```bash
   git init
   git branch -M main
   git add .
   git commit -m "COM610: API libros, CI/CD y Google Cloud"
   git remote add origin https://github.com/USUARIO/com610-gcp-libros.git
   git push -u origin main
   ```

   Si Git pide identidad, configura `git config --global user.name "Tu nombre"` y `git config --global user.email "tu-correo@example.com"`.
3. Verifica que en GitHub aparecen `package-lock.json`, `.github/workflows/ci.yml`, `.github/workflows/cd.yml` y `evidencias/README.md`.

## 3. Google Cloud (las instancias pueden generar cargos)

1. Crea o selecciona proyecto en `https://console.cloud.google.com` y activa la facturación.
2. Habilita las APIs Compute Engine, Cloud SQL Admin y Service Networking.
3. Configura VPC privada y acceso a servicios privados (Private Services Access) para Cloud SQL.
4. Crea **Cloud SQL for MySQL 8** con **IP privada**, sin IP pública, en la misma VPC y región que usarás para la VM. Configura una base `biblioteca` y credenciales de usuario de aplicación con privilegios mínimos. Puedes crear la base/tabla desde Cloud SQL Studio con el contenido de `db.sql`.
5. Crea VM Ubuntu en **Compute Engine** con IP pública estática, en la misma VPC y región. Etiqueta los recursos con iniciales. Comprueba las cuotas disponibles y estima costos antes de elegir tamaños.
6. En firewall permite **TCP 80 desde Internet** a la VM; **TCP 22 únicamente desde tu dirección IP pública**. No publiques 3000 ni 3306. La VM debe poder conectar a la IP privada de Cloud SQL por TCP 3306.

Documentación oficial: `https://docs.cloud.google.com/sql/docs/mysql/connect-compute-engine`.

## 4. Preparar la VM

Conéctate a la VM por SSH desde la consola de GCP y ejecuta:

```bash
sudo apt update
sudo apt install -y docker.io nginx curl git default-mysql-client
sudo systemctl enable --now docker nginx
```

Clona tu repositorio:

```bash
git clone https://github.com/USUARIO/com610-gcp-libros.git
cd com610-gcp-libros
```

Si no creaste la tabla con Cloud SQL Studio, usa `db.sql` desde la VM (se te pedirá la contraseña por prompt):

```bash
mysql -h IP_PRIVADA_SQL -u USUARIO_ADMIN -p < db.sql
```

Configura el proxy inverso:

```bash
sudo cp infra/nginx.conf /etc/nginx/sites-available/com610
sudo ln -sfn /etc/nginx/sites-available/com610 /etc/nginx/sites-enabled/com610
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Prepara archivo de variables en la VM (NO en el repositorio):

```bash
sudo install -d -o root -g docker -m 750 /etc/com610
sudo nano /etc/com610/api.env
```

Contenido de `/etc/com610/api.env` con TUS VALORES REALES solo en la VM:

```dotenv
PORT=3000
HOST=0.0.0.0
DB_HOST=IP_PRIVADA_SQL
DB_PORT=3306
DB_USER=USUARIO_APP
DB_PASSWORD=TU_CONTRASENA_PRIVADA
DB_NAME=biblioteca
```

Después:

```bash
sudo chown root:docker /etc/com610/api.env
sudo chmod 640 /etc/com610/api.env
```

**Nunca compartas ni subas ese archivo.**

## 5. Runner GitHub Actions instalado en la VM

1. En GitHub abre **Settings → Actions → Runners → New self-hosted runner** para tu repositorio.
2. Selecciona Linux x64 y ejecuta EN LA VM las instrucciones que GitHub te muestra, bajo un usuario dedicado y no root.
3. Durante `./config.sh` agrega la etiqueta personalizada **`com610-prod`**. Si es necesario, usa `--labels com610-prod`.
4. Agrega el usuario del runner al grupo `docker`: `sudo usermod -aG docker USUARIO_DEL_RUNNER`; reinicia su sesión / servicio para que se apliquen los grupos.
5. Instala el runner como servicio siguiendo las instrucciones de GitHub (`sudo ./svc.sh install` y `sudo ./svc.sh start`). Comprueba que aparezca **Online**.
6. Mantén los workflows de `pull_request` en runners de GitHub, nunca en el runner de producción. El CD del proyecto ejecuta su trabajo `deploy` solo con push a `main`.

Este método **no requiere abrir SSH desde Internet para los runners de GitHub** ni crear secretos de claves SSH en Actions. `GITHUB_TOKEN` se genera automáticamente.

## 6. Ejecutar y demostrar CI/CD

1. Una vez lista la infraestructura, haz un cambio pequeño (por ejemplo, en README) y ejecuta `git add . && git commit -m "Despliegue inicial" && git push`.
2. En GitHub > Actions deben figurar CI y CD. Comprueba **test, publish y deploy en verde**.
3. La imagen publicada debe figurar como `ghcr.io/USUARIO/com610-gcp-libros:<SHA_DEL_COMMIT>`.
4. Desde tu propia computadora verifica:

   ```bash
   curl http://IP_PUBLICA_VM/health
   curl http://IP_PUBLICA_VM/libros
   curl -X POST http://IP_PUBLICA_VM/libros -H 'Content-Type: application/json' -d '{"titulo":"Redes","autor":"Estudiante","anio_publicacion":2026}'
   ```

   Copia el `id` devuelto por POST y úsalo para GET/PUT/DELETE. Valida en Cloud SQL que los cambios persisten.
5. Cambia algo visible (ej. versión vía nuevo commit), ejecuta otro `push` y captura un CD exitoso con valor `version` actualizado en `/health`.
6. Toma capturas auténticas sin mostrar credenciales: VM/firewall, Cloud SQL privada, CRUD/persistencia, `npm test`, imagen GHCR, CI y CD, y guárdalas en `evidencias/`.
7. Actualiza README con URL pública de la API y enlaces a ejecuciones exitosas de CI y CD; `git add . && git commit && git push`. Verifica que el último CD también quede verde.

## 7. Entrega en eCampus

- Revisa el repositorio en una ventana incógnita: debe abrir sin iniciar sesión.
- Abre `http://IP_PUBLICA_VM/health` y `/libros` desde una red externa.
- Mantén la VM y Cloud SQL encendidos hasta finalizar revisión (vigila costos).
- En eCampus entrega **solo** `https://github.com/USUARIO/com610-gcp-libros`.
