#!/usr/bin/env bash
set -Eeuo pipefail
# Usage: deploy.sh ghcr.io/owner/repo:sha; env file provisioned separately on VM.
IMAGE="${1:?Se requiere la imagen}"; ENV_FILE=/etc/com610/api.env
[[ -f "$ENV_FILE" ]] || { echo 'Falta /etc/com610/api.env' >&2; exit 1; }
previous=$(docker inspect --format '{{.Config.Image}}' com610-api 2>/dev/null || true)
function checks() {
  local port="$1"
  curl --fail --silent --show-error --max-time 5 "http://127.0.0.1:${port}/health" | grep -q '"status":"ok"'
  curl --fail --silent --show-error --max-time 5 "http://127.0.0.1:${port}/libros" >/dev/null
}
function restore() {
  echo 'Despliegue fallido; restaurando versión anterior.' >&2
  docker rm -f com610-api >/dev/null 2>&1 || true
  if [[ -n "$previous" ]]; then
    docker run -d --restart unless-stopped --name com610-api       --env-file "$ENV_FILE" -e APP_VERSION="${previous##*:}"       -p 127.0.0.1:3000:3000 "$previous" >/dev/null
  fi
}
trap restore ERR
# Validar candidata mientras la versión anterior sigue activa.
docker pull "$IMAGE"
docker rm -f com610-candidate >/dev/null 2>&1 || true
docker run -d --name com610-candidate --env-file "$ENV_FILE"   -e APP_VERSION="${IMAGE##*:}" -p 127.0.0.1:3001:3000 "$IMAGE" >/dev/null
ready=0
for i in {1..20}; do if checks 3001; then ready=1; break; fi; sleep 2; done
if [[ "$ready" != 1 ]]; then docker logs com610-candidate >&2 || true; false; fi
docker rm -f com610-candidate >/dev/null
docker rm -f com610-api >/dev/null 2>&1 || true
docker run -d --restart unless-stopped --name com610-api   --env-file "$ENV_FILE" -e APP_VERSION="${IMAGE##*:}"   -p 127.0.0.1:3000:3000 "$IMAGE" >/dev/null
ready=0
for i in {1..20}; do if checks 3000; then ready=1; break; fi; sleep 2; done
[[ "$ready" == 1 ]]
trap - ERR
echo "Despliegue verificado: $IMAGE"
