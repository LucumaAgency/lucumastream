# Preguntas para TikTok Live · Lucuma Agency

API + panel + overlay para mostrar en pantalla preguntas preparadas por nosotros durante un TikTok Live (genera temas de conversación).

## Correr
```
npm install
cp .env.example .env   # edita ADMIN_TOKEN
npm start              # http://localhost:3080
```
- Panel: `/admin.html` (pega el token arriba a la derecha; se guarda en el navegador).
- Overlay: `/overlay.html` → fuente de navegador en OBS / TikTok Live Studio (1080×1920, fondo transparente). `?pos=top` para mostrar arriba.

## API
| Método | Ruta | Descripción |
|---|---|---|
| GET | /api/preguntas | lista + activaId |
| GET | /api/activa | pregunta en pantalla |
| GET | /api/stream | SSE: emite `{activa,total}` al cambiar |
| POST | /api/preguntas | `{texto, tema?, autor?}` |
| POST | /api/preguntas/bulk | `{texto:"una por línea"}` o `{textos:[...]}` |
| PATCH | /api/preguntas/:id | `{texto?, tema?, autor?, usada?}` |
| DELETE | /api/preguntas/:id | |
| POST | /api/preguntas/:id/mostrar | la pone en pantalla y la marca usada |
| POST | /api/siguiente | muestra la primera no usada |
| POST | /api/ocultar | quita la card |
| POST | /api/reiniciar | todas como no usadas |

Escritura requiere header `x-admin-token` (o `?token=`) si `ADMIN_TOKEN` está definido. Datos en `data/preguntas.json`.

## Deploy (Plesk Node, como scrabble)
Documento raíz `public`, archivo de inicio `server.js`, variables `PORT` y `ADMIN_TOKEN`.
