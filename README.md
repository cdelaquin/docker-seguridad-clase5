📘 Proyecto: Seguridad y Optimización de Imágenes Docker (Clase 5)
🎯 Objetivo del Proyecto
Este proyecto implementa un proceso de análisis, optimización y endurecimiento de imágenes Docker utilizando:
•	Multi-stage builds
•	Imagen base Alpine
•	Usuario non-root
•	Health checks
•	Labels de metadata
•	Escaneos con Trivy
Se optimiza una aplicación Node.js existente, comparando una imagen baseline (insegura) contra una imagen optimizada siguiendo buenas prácticas de seguridad.
________________________________________
🧱 Tecnologías Utilizadas
•	Node.js 18
•	Node.js 18-alpine (imagen optimizada)
•	Docker y Docker Compose
•	Trivy (escaneo de vulnerabilidades)
•	Linux Alpine
•	cURL / wget
________________________________________
🔍 PARTE 1 — Baseline (antes de optimizar)
📦 Construcción de la imagen baseline
docker build -f Dockerfile.baseline -t mi-app:baseline .
📏 Tamaño de la imagen baseline
mi-app:baseline   1.1GB
🔎 Vulnerabilidades (Baseline)
Comando:
trivy image --severity CRITICAL,HIGH mi-app:baseline
Resultado:
•	CRITICAL: 0
•	HIGH: 2
Origen: node-pkg (dependencias del proyecto)
👤 Usuario de la imagen baseline
docker run --rm mi-app:baseline whoami
Resultado:
root
📸 Captura: docs/screenshots/whoami-baseline.png
________________________________________
🔧 PARTE 2 — Optimizaciones Aplicadas
1️⃣ Multi-Stage Build
•	Antes: Imagen única con dependencias de build
•	Después:
o	Stage 1: build con dependencias
o	Stage 2: solo runtime
•	Beneficio: Reducción de tamaño masiva
________________________________________
2️⃣ Imagen Base Alpine
•	Antes: node:18 (~1.1GB)
•	Después: node:18-alpine (~156MB)
•	Beneficio: -85% peso + menor superficie de ataque
________________________________________
3️⃣ Usuario Non-Root
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001
USER appuser
•	Antes: root
•	Después: appuser
•	Beneficio: Previene escalación de privilegios
________________________________________
4️⃣ Labels de Metadata
LABEL maintainer="tu-nombre" \
      version="1.0-optimizado" \
      description="Backend Node.js optimizado" \
      security.scan="trivy" \
      security.non-root="true"
________________________________________
5️⃣ Health Check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1
•	Permite que Docker detecte si el contenedor está en estado healthy.
________________________________________
🚀 PARTE 3 — Imagen Optimizada
🏗️ Construcción
docker build -t mi-app:optimizado .
📏 Tamaño de la imagen optimizada
mi-app:optimizado   156MB
________________________________________
🔎 Vulnerabilidades (Optimizada)
Comando:
trivy image --severity CRITICAL,HIGH mi-app:optimizado
Resultado:
•	CRITICAL: 0
•	HIGH: 2
👉 Las vulnerabilidades restantes provienen de dependencias de Node.js (no del sistema operativo)
👉 Todas las vulnerabilidades de Alpine/base system fueron removidas: ✔️
________________________________________
📊 PARTE 4 — Tabla Comparativa
Métrica	Baseline	Optimizada	Mejora
Tamaño imagen	1.1GB	156MB	-85%
Vulnerabilidades CRITICAL	0	0	✔ Igual
Vulnerabilidades HIGH	2	2	Se mantienen (node-pkg)
Usuario	root	appuser	✔ non-root
Multi-stage build	No	Sí	✔
Imagen base	node:18	node:18-alpine	✔
Healthcheck	No	Sí	✔
Labels	No	Sí	✔
________________________________________
🧪 PARTE 5 — Verificación Final
Health Check
docker run -d --name seguridad-app -p 5000:5000 mi-app:optimizado
docker ps
Debe mostrar:
healthy
📸 Captura: docs/screenshots/docker-ps-healthy.png
________________________________________
Probar endpoint /api/health
curl http://localhost:5000/api/health
________________________________________
Usuario Non-Root
docker exec seguridad-app whoami
Resultado:
appuser
📸 Captura: docs/screenshots/whoami-nonroot.png
________________________________________
📸 PARTE 6 — Capturas de Pantalla Incluidas
Todas las capturas están en:
docs/screenshots/
Incluye:
✔ trivy-baseline.png
✔ trivy-optimizado.png
✔ docker-images.png
✔ docker-ps-healthy.png
✔ whoami-nonroot.png
________________________________________
📁 Estructura del Proyecto
docker-seguridad-clase5/
├── Dockerfile
├── Dockerfile.baseline
├── docker-compose.yml
├── .dockerignore
├── server.js
├── package.json
├── scans/
│   ├── baseline-scan.json
│   └── optimizado-scan.json
├── docs/
│   └── screenshots/
└── README.md
________________________________________
🎓 Checklist de Seguridad
•	
•  Multi-stage build
•  •  Imagen Alpine
•  •  Usuario non-root
•  •  Healthcheck
•  •  Labels de seguridad
•  •  .dockerignore optimizado
•  •  Trivy baseline
•  •  Trivy optimizado
•  •  Comparación en README
•  Capturas incluidas
