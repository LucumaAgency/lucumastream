# Lucumastream · Preguntas para TikTok Live (Lucuma Agency)

Documentación maestra. Todo lo nuevo se anota en la bitácora al final.

## 1. Qué es
App Node que muestra en pantalla, durante un TikTok Live, preguntas preparadas por nosotros para generar temas de conversación. Tres piezas:

| Pieza | URL | Para qué |
|---|---|---|
| Panel | https://lucumastream.pruebalucuma.site/admin.html | Cargar preguntas, mostrar/ocultar, siguiente |
| Overlay | https://lucumastream.pruebalucuma.site/overlay.html | Fuente de navegador en OBS (fondo transparente) |
| API | https://lucumastream.pruebalucuma.site/api/... | Cargar preguntas por script / desde Claude |

Repo: https://github.com/LucumaAgency/lucumastream · Código local: `/home/claude-user/lucumastream`.

## 2. Uso en un live
1. Abrir el panel. El campo "Token admin" (arriba a la derecha) debe tener el token; queda guardado en el navegador.
2. En OBS: Fuentes → Navegador → URL del overlay. Tamaño = lienzo (1080×1920 vertical, 1920×1080 horizontal). Marcar "Actualizar navegador cuando la escena se active". Variante `overlay.html?pos=top` muestra la card arriba (útil si choca con el chat de TikTok).
3. Durante el live: **▶ Siguiente pregunta** saca la primera no usada; **Mostrar** saca una concreta; **Ocultar** quita la card; **Reiniciar usadas** limpia las marcas para el siguiente live.
4. La card aparece en OBS en máximo 3 segundos.

La card solo se ve cuando hay una pregunta activa. Si OBS no muestra nada: comprobar que el panel diga algo en "En pantalla ahora" y pulsar "Actualizar" en la fuente de navegador (OBS cachea la página).

## 3. Cargar preguntas
- **Panel**: textarea "Agregar preguntas", una por línea, tema y autor opcionales.
- **Script** (desde esta máquina, usa `~/.lucumastream.env`):
  ```
  cd /home/claude-user/lucumastream
  ./agregar.sh "SEO" <<'EOF'
  ¿Pregunta uno?
  ¿Pregunta dos?
  EOF
  ```
  El script fija el autor en **"Lucuma Agency Bot"** (regla: todo lo generado por Claude lleva ese autor). Temas usados hasta ahora: `Marketing`, `SEO`, `Desarrollo web`.

## 4. API
Lectura pública; escritura exige header `x-admin-token` (o `?token=`) igual a `ADMIN_TOKEN`.

| Método | Ruta | Cuerpo / efecto |
|---|---|---|
| GET | /api/preguntas | `{preguntas[], activaId}` |
| GET | /api/activa | `{activa}` (null si no hay) |
| GET | /api/stream | SSE `{activa,total}` al cambiar |
| POST | /api/preguntas | `{texto, tema?, autor?}` |
| POST | /api/preguntas/bulk | `{texto:"una por línea", tema?, autor?}` o `{textos:[...]}` |
| PATCH | /api/preguntas/:id | `{texto?, tema?, autor?, usada?}` |
| DELETE | /api/preguntas/:id | elimina |
| POST | /api/preguntas/:id/mostrar | activa y marca usada |
| POST | /api/siguiente | activa la primera no usada |
| POST | /api/ocultar | quita la card |
| POST | /api/reiniciar | todas como no usadas |

Pregunta: `{id, texto (≤300), autor, tema, usada, creada}`. Datos en `data/preguntas.json` (fuera del repo; sobrevive a los deploys).

## 5. Infraestructura
- **Plesk** (servidor flamboyant-sammet.66-94-108-141.plesk.page), subdominio `lucumastream.pruebalucuma.site`, Node 22. Raíz de la app = carpeta del clon, documento raíz = `public`, archivo de inicio = `server.js`, variable `ADMIN_TOKEN`. SSL Let's Encrypt activo.
- **Deploy**: Git de Plesk → Desplegar, luego Node.js → **Reiniciar app** (las variables y el código solo se aplican al reiniciar). Si Plesk pierde el registro del repo y dice "destination path already exists", borrar la carpeta `git/lucumastream` del dominio principal y volver a agregar el repo.
- **SSE**: el nginx de Plesk bufferiza `/api/stream` aunque se envíe `X-Accel-Buffering: no`; por eso el overlay además sondea `/api/activa` cada 3 s. En local el SSE funciona al instante.
- **Credenciales**: `~/.lucumastream.env` (`LUCUMASTREAM_URL`, `LUCUMASTREAM_TOKEN`). Nunca dejar `ADMIN_TOKEN` vacío: sin token cualquiera podría escribir en el live.

## 6. Diseño de la card (overlay)
Estilo pregunta de TikTok: card blanca 22 px de radio con borde degradado cian `#25F4EE` → rojo `#FE2C55`, avatar circular con iniciales del autor, nombre + hashtag del tema (o `@lucuma.agency` si no hay tema), badge "PREGUNTA" con punto rojo, ícono "Q" negro antes del texto, pie "Responde en los comentarios · EN VIVO". Fuente Inter. Animación de entrada y "pop" al cambiar de pregunta. Ancho 88 % hasta 520 px; abajo a 12 vh del borde (o arriba con `?pos=top`). Colores y tamaños en `public/overlay.html`.

## 7. Correr en local
```
npm install && cp .env.example .env   # editar ADMIN_TOKEN
npm start                             # http://localhost:3080
```

## 8. Pendientes / ideas
- Botón "aleatoria" y filtro por tema en el panel.
- Temporizador opcional que oculte la card tras N segundos.
- Varias listas (una por live) en lugar de una cola única.

## 9. Bitácora
- **2026-10-09** · Creación (API, panel, overlay). Deploy en Plesk; corregido buffering SSE con sondeo de respaldo. Script `agregar.sh`. Cargadas 63 preguntas: 3 iniciales manuales + 60 del bot (Marketing 17, SEO 26, Desarrollo web 17).
