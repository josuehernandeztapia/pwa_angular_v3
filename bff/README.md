# Conductores BFF – Configuración (Claves PENDIENTES)

Este BFF expone endpoints para voz (AVI) y ahora para Casos/Adjuntos (Wizard 4 fotos). Las claves están pendientes – usa `.env` basado en `.env.example`.

## Variables de entorno

Copia `bff/.env.example` a `bff/.env` y completa cuando se tengan las credenciales:

- App
  - `PORT` (default 3000)
  - `PWA_URL` (CORS)
- Base de datos (opcional en dev)
  - `NEON_DATABASE_URL` – si no se define, el BFF usa memoria en `CasesService`
- S3 Presign (pendiente)
  - `AWS_ACCESS_KEY_ID` = `__PENDING__`
  - `AWS_SECRET_ACCESS_KEY` = `__PENDING__`
  - `AWS_REGION` (ej. `us-east-1`)
  - `AWS_S3_BUCKET` = `__PENDING__`
  - `S3_UPLOAD_URL` (opcional)
- OpenAI (pendiente)
  - `OPENAI_API_KEY` = `__PENDING__`

> Nota: mientras las claves estén pendientes, el endpoint de presign devuelve un stub de carga y el OCR devuelve una **confianza simulada** basada en el nombre del archivo (por ejemplo, archivos que contengan `low|blurry|bad` → baja confianza; `novin|noodo|noevi` → marca campos faltantes).

## Endpoints nuevos (Casos)

- `POST /api/cases` – crea caso
- `GET /api/cases/:id` – obtiene caso
- `POST /api/cases/:id/attachments/presign` – presign (stub en dev)
- `POST /api/cases/:id/attachments/register` – registra adjunto
- `POST /api/cases/:id/attachments/:attId/ocr` – OCR (stub)

## Desarrollo

```bash
# en la raíz del monorepo
npm run bff:dev
```

Swagger: `http://localhost:3000/docs`

## Producción (cuando haya claves)

- Cambiar presign stub a AWS SDK v3 (S3) en `CasesService`.
- Habilitar `NEON_DATABASE_URL` para persistencia real.
- Enrutar OCR a OpenAI Vision (reutilizando `OPENAI_API_KEY`).

