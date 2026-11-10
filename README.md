# HOST · Raspá y Ganá 🔥

Micrositio **independiente** del menú de HOST, con su propio repositorio de GitHub y dirección de GitHub Pages. Usa la misma paleta que el menú (`#090909`, `#ed171f`, `#ff7b00`, `#ffc329`), tipografías **Anton** y **Barlow**, y estilo oscuro con fuego.

## Archivos

- `index.html` — página del juego.
- `style.css` — diseño adaptable a celular y PC.
- `game.js` — raspado por `canvas`, con mouse o pantalla táctil.
- `config.js` — ejemplos de premios y pesos para la **demo**.
- `assets/logo-host.png` — **copiá aquí tu logo original** desde el proyecto del menú HOST. No se incluye un logo inventado. Si falta, aparece la palabra HOST como respaldo.

## Publicar en un repositorio nuevo

1. Crear un repositorio público en GitHub, por ejemplo `host-raspa-y-gana`.
2. Subir `index.html`, `style.css`, `game.js`, `config.js` y la carpeta `assets` a la raíz del repositorio. ¡No subir el `.zip` sin descomprimir!
3. Copiar el logo original del menú en `assets/logo-host.png`.
4. Ir a **Settings → Pages** y elegir **Deploy from a branch**, `main` y `/(root)`; guardar.
5. GitHub Pages mostrará la URL pública que corresponde a tu nombre de usuario y al nombre del repositorio. No hace falta modificar el repositorio del menú.

## Probar localmente

Abrí `index.html` en el navegador. Para una prueba más completa, se puede servir la carpeta con `python -m http.server 8000` y entrar a `http://localhost:8000`.

## IMPORTANTE: versión de prueba, no campaña real

Esta entrega es una **demo visual y funcional del raspado**. Se puede jugar tantas veces como se quiera, los resultados se determinan en JavaScript en el navegador y los premios son ejemplos no canjeables. No existe cupón verdadero ni registro de ganadores. **No la publiques como promoción con premios reales todavía.**

Para habilitar una promoción con premios reales hay que definir las reglas comerciales (participaciones por persona, condición de compra, premios y vigencia) y agregar backend de validación. Una opción es **Supabase**, sin mezclar los repositorios:

- Crear tablas nuevas y separadas para campaña, participaciones, premios y cupones.
- Validar identificación del cliente y límites de participación en el servidor, no en `localStorage`.
- Seleccionar el resultado una sola vez, en una operación atómica, y guardarlo ANTES de mostrar el raspado.
- Generar un código de premio único, controlar stock, expiración, canje y evitar premios duplicados.
- Usar un panel administrador con autenticación y autorización; RLS para las tablas expuestas.
- Nunca publicar una `service_role` key ni otra credencial privada en este repositorio de GitHub Pages.

La pantalla y la mecánica ya están listas para conectarles esa lógica, una vez definidos premios y reglas.