# LOTR RPG — Documento del juego

RPG de acción 2D top-down ambientado en la Tierra Media, renderizado en `<canvas>` con arte pseudo-pixel procedural (sin sprites externos). Todo el juego vive en **un solo archivo**: `app/game/page.tsx` (~5600 líneas), con una landing en `app/page.tsx`.

## Stack técnico

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4** para HUD/overlays (el mundo se dibuja en canvas)
- Render: `requestAnimationFrame` + canvas 2D, tiles de 32px, mapa de 90x70 tiles por región
- Audio: Web Audio API generado por código (música por región + SFX)
- Guardado: `localStorage` (progreso, XP, oro, inventario, región, jefes derrotados)
- Sin dependencias de juego externas

## Cómo correr

```bash
pnpm install
pnpm dev        # http://localhost:3000 → landing, /game → juego
```

## Flujo de pantallas

`charsel` (elegir héroe) → `mode` (Exploración / Horda) → `difficulty` (Fácil / Normal / Difícil) → `game`

| Dificultad | HP jugador | Daño enemigo | Enemigos extra |
|---|---|---|---|
| Fácil | x1.2 | x0.8 | +1 |
| Normal | x1.0 | x1.0 | +1 |
| Difícil | x0.85 | x1.3 | +2 |

## Controles

| Tecla | Acción |
|---|---|
| WASD / Flechas | Moverse |
| Espacio | Atacar (barrido con arco de ataque) |
| E | Interactuar (NPCs, cofres, portales, Elrond, comerciante) |
| Q | Cambiar arma (principal / secundaria) |
| I | Inventario |
| M | Mapa de la Tierra Media (viaje rápido) |
| T | Terminal de comandos mod |
| Escape | Cerrar paneles / diálogo |

También hay botones táctiles en el HUD (mobile-first).

## Personajes jugables

| Héroe | HP | DMG | Velocidad | Rango | Ítems iniciales | Arma secundaria |
|---|---|---|---|---|---|---|
| Frodo | 6 | 6 | 2.8 | 2.4 | anillo, lembas | Daga |
| Aragorn | 10 | 10 | 2.5 | 2.4 | espada | Arco (rango x2.5) |
| Gandalf | 8 | 12 | 2.0 | 3.5 | bastón, miruvor | Glamdring (dmg x1.4) |
| Legolas | 6 | 8 | 3.2 | 5.0 | arco, lembas | Cuchillos |
| Gimli | 14 | 15 | 1.8 | 1.6 | hacha, miruvor | Cuchillo |

El anillo de Frodo da **invisibilidad 10s**. Gandalf y Legolas tienen hechizos exclusivos (Escudo Istari, Fuego Istari, Luz de Eärendil / Lluvia de Flechas).

## Regiones y misión principal

Viaje lineal oeste→este: **La Comarca → Bosque Cerrado → Rivendel**. Se cruza por portales al borde este de cada mapa; cada región descubierta queda desbloqueada (`unlocked`) para viaje rápido.

- **La Comarca**: región viva — aldeanos con roles (recolector, constructor, artesano), prosperidad con tope sostenible, jardines, festivales con fuegos artificiales. Comerciante y NPCs con misiones.
- **Bosque Cerrado**: emboscadas de arañas, niebla, enemigos más duros.
- **Rivendel**: refugio sin jefe. Elrond otorga una bendición y el **Concilio de Elrond** da un boon único por personaje (+HP/+DMG/oro).

### Mapa mundial (tecla M / botón del HUD)

Overlay "Mapa de la Tierra Media": muestra las 3 regiones en línea, con estado actual (AQUÍ), bloqueadas (candado) y jefe presente. Elegir una región desbloqueada ejecuta `travelToRegion` con fundido rápido — permite saltos no adyacentes.

## Enemigos (bestiario)

| Enemigo | HP | Vel | DMG | Nota |
|---|---|---|---|---|
| Nazgûl | 5 | 1.0 | 1 | Huye de Gandalf, se confunde con Luz de Eärendil |
| Warg | 4 | 1.7 | 1 | Rápido |
| Orco | 6 | 0.85 | 2 | Tanque básico |
| Araña | 4 | 1.2 | 1 | Telaraña ralentiza (`webSlow`) |
| Tumulario | 7 | 0.6 | 2 | Lento y duro |

### Jefes de región (`REGION_BOSSES`)

Aparecen al avanzar hacia el este de la región (una vez por partida, persistido en `bossTriggered`). Render agrandado (`sizeMult`), nombre y barra de vida grande.

| Región | Jefe | HP | DMG | Tamaño | XP | Oro |
|---|---|---|---|---|---|---|
| Comarca | El Rey Brujo de Angmar (nazgul) | 70 | 3 | x1.9 | 220 | 120 |
| Bosque | La Reina Araña (spider) | 90 | 2 | x2.2 | 280 | 160 |
| Rivendel | — (refugio) | | | | | |

## Progresión: XP y niveles

- XP por matar enemigos (`XP_REWARDS`: nazgul 30, aldeano salvado 10; jefes dan su propio XP).
- Tabla de niveles (`XP_TABLE`): 0, 50, 120, 220, 360, 550, 800, 1120, 1520, 2020.
- Subir de nivel da recompensas de stats; nivel y XP se muestran en el HUD y se **persisten en el guardado**.

## Cofres del tesoro (`REGION_CHESTS`)

Cofres fijos por región, se abren con **E**, dan oro + ítem; el estado `opened` persiste en la partida.

- Comarca: 2 cofres (elixir, lembas)
- Bosque: 3 cofres (miruvor, elixir, lembas)
- Rivendel: 2 cofres (miruvor, elixir)

## Ítems

- **Consumibles**: lembas (+3 HP), miruvor (HP completo), manzana (+2), miel enana (+1 HP máx 60s), antídoto, elixir (+5 HP máx permanente)
- **Armas**: espada Andúril (+4), bastón (+5, rango), arco (+3, rango largo), hacha (+6), espada rota (-2)
- **Armaduras**: armadura (+3 HP máx), capa de viaje (+15% vel), botas élficas (+20% vel), capucha (sigilo ante Nazgûl)
- **Especiales**: Anillo Único (invisibilidad 10s), oro (moneda para el comerciante)
- **Hechizos**: Escudo Istari, Fuego Istari, Luz de Eärendil (Gandalf); Lluvia de Flechas (Legolas)

## Modos de juego

- **Exploración**: misión principal hacia Rivendel, regiones, jefes, cofres, NPCs.
- **Horda**: oleadas crecientes de enemigos en la Comarca; los Nazgûl capturan aldeanos.

## Terminal de comandos mod (tecla T)

`/horda`, `/heroe` (inmortal), `/arma espada|baculo|daga`, `/invocar gandalf|aragorn|legolas`, `/modo explorar`, `/nazgul 1|3`, `/tienda`, `/comprar <item>`.

## Sistema de guardado (`localStorage`)

`SaveData` persiste: personaje, HP/maxHP, **XP y nivel**, oro, inventario, arma activa, región actual, **regiones desbloqueadas (`unlocked`)**, **jefes ya aparecidos (`bossTriggered`)**, dificultad, modo y progreso de misión.

## Arquitectura del código (`app/game/page.tsx`)

Orientación por bloques (los números de línea son aproximados):

| Bloque | Contenido |
|---|---|
| ~79–170 | `CHARS`, `WEAPONS`, `DIFFICULTIES`, `ITEMS`, `VILLAGER_DEFS`, `MOD_COMMANDS` |
| ~171–430 | Tipos e interfaces: `Tile`, `Villager`, `ShireState`, `Nazgul`, `Chest`, `Player`, `REGION_ORDER`, `REGION_BOSSES`, `REGION_CHESTS`, `ENEMY_DEFS` |
| ~600–700 | Tienda, `XP_TABLE`, `XP_REWARDS`, definición de `REGIONS` |
| ~700–1100 | `buildMap` por región (tiles, portales), guardado/carga (`saveGame`, `SaveData`) |
| ~1100–2400 | Lógica de update: movimiento, combate, IA de enemigos, emboscadas, disparador de jefe, transición de región (`regionTransition`, flag `fast`), `travelToRegion`, Comarca viva |
| ~2400–3000 | `spawnChests`, `spawnBoss`, `spawnHeroCompanions`, `tryInteract` (NPCs, cofres, Elrond, Concilio) |
| ~3000–4900 | Render canvas: tiles, entidades, jefes agrandados, cofres, partículas, clima, HUD in-canvas |
| ~4950–5140 | Input: keydown (Espacio/E/M/Escape/T), gestión de `screenRef` para closures |
| ~5140–5600 | JSX: pantallas (charsel/mode/difficulty), HUD, inventario, terminal mod, **overlay del mapa mundial**, diálogos |

### Patrones importantes

- Todo el estado del juego vive en un ref mutable (`S.current`, tipo `GameState`) — React solo maneja pantallas/overlays con `useState`.
- El keydown handler tiene closures: usar `screenRef.current` (no `screen`) para leer la pantalla actual.
- El estado `st.p` es el jugador; `st.nazgulList` es la lista de enemigos (todos los tipos, no solo Nazgûl); `st.chests` los cofres.
- Los jefes son `Nazgul` con `isBoss`, `bossName`, `sizeMult`.
- La transición de región (`st.regionTransition`) tiene fases `out`→`in` y un flag `fast` para el viaje por mapa.

## Ideas pendientes / próximos pasos

- Más regiones al este (Moria, Lothlórien, Rohan, Mordor) — solo hay que extender `REGION_ORDER`, `REGIONS`, `REGION_BOSSES`, `REGION_CHESTS` y `buildMap`.
- Jefe con mecánicas propias (invocar esbirros usa `summonCd`, ya existe el campo).
- Balance de XP/recompensas por dificultad.
- Compañeros héroes reclutables tras el Concilio (base ya existe: `HeroCompanion`).
