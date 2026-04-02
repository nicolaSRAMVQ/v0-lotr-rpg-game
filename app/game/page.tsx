'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

// ============ CONSTANTS ============
const T = 32
const WW = 100
const WH = 80

// ============ CHARACTERS ============
const CHARS: Record<string, { name: string; spd: number; maxhp: number; dmg: number; range: number; startItems: string[] }> = {
  frodo: { name: 'FRODO', spd: 2.8, maxhp: 6, dmg: 6, range: 2.4, startItems: ['anillo', 'lembas'] },
  aragorn: { name: 'ARAGORN', spd: 2.5, maxhp: 10, dmg: 10, range: 2.4, startItems: ['espada'] },
  gandalf: { name: 'GANDALF', spd: 2.0, maxhp: 8, dmg: 12, range: 3.5, startItems: ['baston', 'miruvor'] },
}

// ============ ITEMS ============
const ITEMS: Record<string, { icon: string; desc: string }> = {
  lembas: { icon: '🍞', desc: 'Pan élfico. Restaura 3 HP.' },
  anillo: { icon: '💍', desc: 'El Anillo Único. Invisibilidad temporal.' },
  espada: { icon: '⚔️', desc: 'Andúril. Daño aumentado.' },
  baston: { icon: '🪄', desc: 'Bastón de mago. Área de ataque.' },
  miruvor: { icon: '🧴', desc: 'Cordial élfico. Restaura HP completo.' },
}

// ============ VILLAGER DEFINITIONS ============
const VILLAGER_DEFS = [
  { name: 'Rosie', color: '#c87060', hat: false, items: ['lembas'] },
  { name: 'Fatty', color: '#8a6030', hat: true, items: ['miruvor'] },
  { name: 'Lobelia', color: '#9060a0', hat: true, items: ['lembas'] },
  { name: 'Poppy', color: '#60a070', hat: false, items: [] },
  { name: 'Ted', color: '#607080', hat: true, items: [] },
  { name: 'Ponto', color: '#805030', hat: true, items: [] },
  { name: 'Milo', color: '#506830', hat: false, items: ['lembas'] },
  { name: 'Pearl', color: '#a07050', hat: false, items: [] },
]

// ============ HOBBIT HOLES ============
const HOLES = [
  { tx: 15, ty: 22 }, { tx: 25, ty: 18 }, { tx: 38, ty: 24 }, { tx: 50, ty: 20 },
  { tx: 62, ty: 22 }, { tx: 72, ty: 18 }, { tx: 18, ty: 55 }, { tx: 30, ty: 52 },
  { tx: 45, ty: 58 }, { tx: 60, ty: 54 }, { tx: 75, ty: 56 }, { tx: 82, ty: 22 },
]

// ============ TYPES ============
type TileType = 'grass' | 'path' | 'tree' | 'flower' | 'yard' | 'door' | 'mill'
type Tile = { type: TileType; variant?: number }
type Dir = 'down' | 'up' | 'left' | 'right'

interface Villager {
  name: string
  color: string
  hat: boolean
  items: string[]
  x: number
  y: number
  hp: number
  maxhp: number
  state: 'walk' | 'flee' | 'captured'
  dir: Dir
  frame: number
  patrol: { x: number; y: number }[]
  patrolIdx: number
  patrolTimer: number
  screamed: boolean
  homeX: number
  homeY: number
}

interface Nazgul {
  x: number
  y: number
  hp: number
  maxhp: number
  spd: number
  dmg: number
  state: 'hunt' | 'chase_player' | 'flee_gandalf'
  dir: Dir
  frame: number
  atkT: number
  poweredUp: number
  invT: number
}

interface GandalfAlly {
  x: number
  y: number
  hp: number
  maxhp: number
  state: 'idle' | 'alert'
  dir: Dir
  frame: number
  patrol: { x: number; y: number }[]
  patrolIdx: number
  patrolTimer: number
  shieldActive: number
  attackCooldown: number
  talked: boolean
}

interface Player {
  char: string
  x: number
  y: number
  hp: number
  maxhp: number
  spd: number
  dmg: number
  range: number
  dir: Dir
  frame: number
  inv: string[]
  ringActive: number
  invT: number
  atkCd: number
}

interface FX {
  x: number
  y: number
  text: string
  color: string
  vy: number
  life: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  life: number
}

interface DlgState {
  active: boolean
  speaker: string
  lines: string[]
  lineIdx: number
  opts: { l: string; action?: string }[]
  target?: Villager
}

interface GameState {
  map: Tile[][]
  p: Player | null
  cam: { x: number; y: number }
  villagers: Villager[]
  nazgul: Nazgul | null
  gandalfAlly: GandalfAlly | null
  invNaz: boolean
  invTimer: number
  invWarned: boolean
  keys: Set<string>
  ePrev: boolean
  fx: FX[]
  parts: Particle[]
  fade: { text: string; color: string; life: number } | null
  dlg: DlgState
  joy: { active: boolean; dx: number; dy: number }
  gameActive: boolean
  termOpen: boolean
  frameCount: number
  logs: { type: string; msg: string; time: string }[]
}

const SOLID = new Set<TileType>(['tree', 'mill'])

export default function GamePage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const minimapRef = useRef<HTMLCanvasElement>(null)
  const S = useRef<GameState | null>(null)
  const animRef = useRef<number>(0)

  const [screen, setScreen] = useState<'charsel' | 'game' | 'dead' | 'gameover' | 'win'>('charsel')
  const [selectedChar, setSelectedChar] = useState<string | null>(null)

  // ============ HELPERS ============
  const log = useCallback((type: string, msg: string) => {
    if (!S.current) return
    const now = new Date()
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    S.current.logs.push({ type, msg, time })
    if (S.current.logs.length > 80) S.current.logs.shift()
  }, [])

  const notify = useCallback((text: string, color: string) => {
    if (!S.current) return
    S.current.fade = { text, color, life: 90 }
  }, [])

  // ============ MAP BUILDING ============
  const buildMap = useCallback(() => {
    const map: Tile[][] = []
    for (let y = 0; y < WH; y++) {
      map[y] = []
      for (let x = 0; x < WW; x++) {
        const variant = (x + y) % 2
        let type: TileType = 'grass'
        // Roads
        if (y === 38 || y === 39) type = 'path'
        if ([12, 25, 40, 55, 70, 85].includes(x) && y >= 15 && y <= 60) type = 'path'
        // Random trees and flowers
        if (type === 'grass') {
          const r = Math.random()
          if (r < 0.02) type = 'tree'
          else if (r < 0.035) type = 'flower'
        }
        map[y][x] = { type, variant }
      }
    }

    // Place hobbit holes
    const placeHole = (tx: number, ty: number) => {
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const nx = tx + dx, ny = ty + dy
          if (nx >= 0 && nx < WW && ny >= 0 && ny < WH && Math.abs(dx) + Math.abs(dy) <= 4) {
            if (map[ny][nx].type !== 'path') map[ny][nx] = { type: 'yard' }
          }
        }
      }
      if (ty >= 0 && ty < WH && tx >= 0 && tx < WW) map[ty][tx] = { type: 'door' }
      // Path to main road
      let py = ty
      const targetY = ty < 38 ? 38 : 39
      while (py !== targetY && py >= 0 && py < WH) {
        if (map[py][tx].type !== 'door') map[py][tx] = { type: 'path' }
        py += py < targetY ? 1 : -1
      }
    }

    HOLES.forEach(h => placeHole(h.tx, h.ty))

    // Mill
    const millX = 45, millY = 31
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = millX + dx, ny = millY + dy
        if (nx >= 0 && nx < WW && ny >= 0 && ny < WH) {
          map[ny][nx] = { type: dx === 0 && dy === 0 ? 'mill' : 'yard' }
        }
      }
    }

    // Plaza
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const nx = 50 + dx, ny = 35 + dy
        if (nx >= 0 && nx < WW && ny >= 0 && ny < WH) {
          map[ny][nx] = { type: 'yard' }
        }
      }
    }

    return map
  }, [])

  const isSolid = useCallback((x: number, y: number): boolean => {
    if (!S.current) return true
    const tx = Math.floor(x / T), ty = Math.floor(y / T)
    if (tx < 0 || tx >= WW || ty < 0 || ty >= WH) return true
    return SOLID.has(S.current.map[ty][tx].type)
  }, [])

  // ============ SPAWN FUNCTIONS ============
  const spawnVillagers = useCallback((): Villager[] => {
    return VILLAGER_DEFS.map((def, i) => {
      const hole = HOLES[i]
      const x = hole.tx * T, y = hole.ty * T
      const patrol = [
        { x: x - T * 2, y },
        { x, y: y - T * 2 },
        { x: x + T * 2, y },
        { x, y: y + T * 2 },
      ]
      return {
        ...def,
        x, y,
        hp: 3, maxhp: 3,
        state: 'walk' as const,
        dir: 'down' as Dir,
        frame: 0,
        patrol,
        patrolIdx: 0,
        patrolTimer: 80,
        screamed: false,
        homeX: x,
        homeY: y,
      }
    })
  }, [])

  const spawnNazgul = useCallback((): Nazgul => {
    return {
      x: (WW - 3) * T,
      y: 38 * T,
      hp: 20,
      maxhp: 20,
      spd: 1.1,
      dmg: 4,
      state: 'hunt',
      dir: 'left',
      frame: 0,
      atkT: 0,
      poweredUp: 0,
      invT: 0,
    }
  }, [])

  const spawnGandalfAlly = useCallback((): GandalfAlly => {
    const x = 20 * T, y = 38 * T
    return {
      x, y,
      hp: 30,
      maxhp: 30,
      state: 'idle',
      dir: 'down',
      frame: 0,
      patrol: [
        { x: 18 * T, y: 38 * T },
        { x: 22 * T, y: 38 * T },
        { x: 20 * T, y: 40 * T },
        { x: 20 * T, y: 36 * T },
      ],
      patrolIdx: 0,
      patrolTimer: 100,
      shieldActive: 0,
      attackCooldown: 0,
      talked: false,
    }
  }, [])

  // ============ GAME START ============
  const startGame = useCallback((charKey: string) => {
    const charDef = CHARS[charKey]
    const map = buildMap()
    const startX = 50 * T, startY = 38 * T

    S.current = {
      map,
      p: {
        char: charKey,
        x: startX,
        y: startY,
        hp: charDef.maxhp,
        maxhp: charDef.maxhp,
        spd: charDef.spd,
        dmg: charDef.dmg,
        range: charDef.range,
        dir: 'down',
        frame: 0,
        inv: [...charDef.startItems],
        ringActive: 0,
        invT: 0,
        atkCd: 0,
      },
      cam: { x: startX - 200, y: startY - 200 },
      villagers: spawnVillagers(),
      nazgul: null,
      gandalfAlly: spawnGandalfAlly(),
      invNaz: false,
      invTimer: 360,
      invWarned: false,
      keys: new Set(),
      ePrev: false,
      fx: [],
      parts: [],
      fade: null,
      dlg: { active: false, speaker: '', lines: [], lineIdx: 0, opts: [] },
      joy: { active: false, dx: 0, dy: 0 },
      gameActive: true,
      termOpen: false,
      frameCount: 0,
      logs: [],
    }

    log('s', 'Bienvenido a Hobbiton. Protege a los aldeanos.')
    setScreen('game')
  }, [buildMap, spawnVillagers, spawnGandalfAlly, log])

  const revive = useCallback(() => {
    if (!S.current || !S.current.p) return
    S.current.p.hp = S.current.p.maxhp
    S.current.p.invT = 120
    S.current.gameActive = true
    log('s', 'Has renacido. ¡Continúa la lucha!')
    setScreen('game')
  }, [log])

  const restartFromSelect = useCallback(() => {
    S.current = null
    setSelectedChar(null)
    setScreen('charsel')
  }, [])

  // ============ DIALOG SYSTEM ============
  const openGandalfDlg = useCallback(() => {
    if (!S.current || !S.current.gandalfAlly || !S.current.p) return
    const pName = CHARS[S.current.p.char].name
    S.current.dlg = {
      active: true,
      speaker: 'GANDALF',
      lines: [`El Nazgûl acecha, ${pName}. Quédate cerca de mí cuando te persiga. Lo mantendré a raya con mi báculo.`],
      lineIdx: 0,
      opts: [{ l: 'Gracias, Gandalf.', action: 'close' }],
    }
    S.current.gandalfAlly.talked = true
    log('n', 'Gandalf te habla sobre el peligro que se acerca.')
  }, [log])

  const openVillagerDlg = useCallback((v: Villager) => {
    if (!S.current) return
    const lines = [
      `¡Hola, viajero! Soy ${v.name}.`,
      v.items.length > 0 ? `Tengo algo que podría ayudarte...` : `Ten cuidado por ahí.`,
    ]
    const opts: { l: string; action?: string }[] = []
    if (v.items.length > 0) {
      opts.push({ l: `Recibir ${ITEMS[v.items[0]]?.icon || '?'}`, action: 'give_item' })
    }
    opts.push({ l: 'Quédate en casa', action: 'stay_home' })
    opts.push({ l: 'Adiós', action: 'close' })

    S.current.dlg = {
      active: true,
      speaker: v.name.toUpperCase(),
      lines,
      lineIdx: 0,
      opts,
      target: v,
    }
    log('n', `${v.name} te saluda.`)
  }, [log])

  const advanceDlg = useCallback(() => {
    if (!S.current || !S.current.dlg.active) return
    const dlg = S.current.dlg
    if (dlg.lineIdx < dlg.lines.length - 1) {
      dlg.lineIdx++
    }
  }, [])

  const selectDlgOpt = useCallback((opt: { l: string; action?: string }) => {
    if (!S.current) return
    const dlg = S.current.dlg
    if (opt.action === 'close') {
      dlg.active = false
    } else if (opt.action === 'give_item' && dlg.target) {
      const v = dlg.target
      if (v.items.length > 0 && S.current.p && S.current.p.inv.length < 5) {
        const item = v.items.shift()!
        S.current.p.inv.push(item)
        log('e', `${v.name} te da ${ITEMS[item]?.icon || item}.`)
        notify(`+${ITEMS[item]?.icon || item}`, '#c8a84b')
      }
      dlg.active = false
    } else if (opt.action === 'stay_home' && dlg.target) {
      dlg.target.state = 'walk'
      dlg.target.patrolIdx = 0
      dlg.target.patrol = [{ x: dlg.target.homeX, y: dlg.target.homeY }]
      log('n', `${dlg.target.name} se queda cerca de casa.`)
      dlg.active = false
    }
  }, [log, notify])

  const closeDlg = useCallback(() => {
    if (!S.current) return
    S.current.dlg.active = false
  }, [])

  // ============ ITEM USE ============
  const useItem = useCallback((idx: number) => {
    if (!S.current || !S.current.p) return
    const p = S.current.p
    const item = p.inv[idx]
    if (!item) return

    if (item === 'lembas') {
      p.hp = Math.min(p.maxhp, p.hp + 3)
      p.inv.splice(idx, 1)
      log('s', 'Comes pan lembas. +3 HP.')
      notify('+3 HP', '#5a6a3a')
    } else if (item === 'anillo') {
      p.ringActive = 300
      p.inv.splice(idx, 1)
      log('e', '¡El Anillo te hace invisible!')
      notify('💍 INVISIBLE', '#c8a84b')
    } else if (item === 'miruvor') {
      p.hp = p.maxhp
      p.inv.splice(idx, 1)
      log('s', 'Bebes miruvor. HP restaurado.')
      notify('HP FULL', '#5a6a3a')
    } else if (item === 'espada' || item === 'baston') {
      notify('Pasiva activa', '#c8a84b')
    }
  }, [log, notify])

  // ============ ATTACK ============
  const doAttack = useCallback(() => {
    if (!S.current || !S.current.p || S.current.dlg.active) return
    const p = S.current.p
    if (p.atkCd > 0) return
    p.atkCd = 28

    const naz = S.current.nazgul
    if (naz && naz.hp > 0) {
      const dx = naz.x - p.x, dy = naz.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < p.range * T) {
        naz.hp -= p.dmg
        naz.invT = 10
        S.current.fx.push({
          x: naz.x,
          y: naz.y - 20,
          text: `-${p.dmg}`,
          color: '#e24b4a',
          vy: -1.1,
          life: 40,
        })
        log('d', `¡Atacas al Nazgûl! -${p.dmg} HP. (${Math.max(0, naz.hp)}/${naz.maxhp})`)

        if (naz.hp <= 0) {
          // Victory!
          for (let i = 0; i < 8; i++) {
            S.current.parts.push({
              x: naz.x,
              y: naz.y,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              color: '#2a0a30',
              life: 40,
            })
          }
          const saved = S.current.villagers.filter(v => v.state !== 'captured').length
          log('e', `¡NAZGÛL DERROTADO! La Comarca está a salvo. Aldeanos salvados: ${saved}/8`)
          S.current.gameActive = false
          setScreen('win')
        }
      }
    }
  }, [log])

  // ============ INTERACTION ============
  const tryInteract = useCallback(() => {
    if (!S.current || !S.current.p) return
    const p = S.current.p

    // Check Gandalf
    const g = S.current.gandalfAlly
    if (g && !g.talked) {
      const dx = g.x - p.x, dy = g.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 2.5 * T) {
        openGandalfDlg()
        return
      }
    }

    // Check villagers
    for (const v of S.current.villagers) {
      if (v.state === 'captured') continue
      const dx = v.x - p.x, dy = v.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 2 * T) {
        openVillagerDlg(v)
        return
      }
    }
  }, [openGandalfDlg, openVillagerDlg])

  // ============ MOVEMENT HELPER ============
  const moveToward = useCallback((entity: { x: number; y: number; dir: Dir }, tx: number, ty: number, spd: number) => {
    const dx = tx - entity.x, dy = ty - entity.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < spd) {
      entity.x = tx
      entity.y = ty
      return true
    }
    const nx = entity.x + (dx / dist) * spd
    const ny = entity.y + (dy / dist) * spd
    if (!isSolid(nx, entity.y)) entity.x = nx
    if (!isSolid(entity.x, ny)) entity.y = ny
    // Update direction
    if (Math.abs(dx) > Math.abs(dy)) {
      entity.dir = dx > 0 ? 'right' : 'left'
    } else {
      entity.dir = dy > 0 ? 'down' : 'up'
    }
    return false
  }, [isSolid])

  // ============ UPDATE ============
  const update = useCallback(() => {
    if (!S.current || !S.current.p || !S.current.gameActive) return
    const st = S.current
    const p = st.p!
    st.frameCount++

    // Timers
    if (p.invT > 0) p.invT--
    if (p.atkCd > 0) p.atkCd--
    if (p.ringActive > 0) p.ringActive--

    // Scheduled events
    if (st.frameCount === 180) {
      log('i', 'Habla con Gandalf antes de que llegue el Nazgûl.')
    }
    if (st.frameCount === 300) {
      log('d', 'Se escuchan cascos en la distancia...')
      st.invWarned = true
    }

    // Spawn Nazgul
    st.invTimer--
    if (st.invTimer <= 0 && !st.nazgul) {
      st.nazgul = spawnNazgul()
      st.invNaz = true
      log('d', '¡UN NAZGÛL HA ENTRADO EN HOBBITON!')
      notify('⚠️ NAZGÛL', '#e24b4a')
    }

    // Player movement
    let dx = 0, dy = 0
    if (st.joy.active) {
      const mag = Math.sqrt(st.joy.dx * st.joy.dx + st.joy.dy * st.joy.dy)
      if (mag > 8) {
        dx = st.joy.dx / mag
        dy = st.joy.dy / mag
      }
    } else {
      if (st.keys.has('ArrowUp') || st.keys.has('w') || st.keys.has('W')) dy = -1
      if (st.keys.has('ArrowDown') || st.keys.has('s') || st.keys.has('S')) dy = 1
      if (st.keys.has('ArrowLeft') || st.keys.has('a') || st.keys.has('A')) dx = -1
      if (st.keys.has('ArrowRight') || st.keys.has('d') || st.keys.has('D')) dx = 1
    }

    if (dx !== 0 || dy !== 0) {
      const mag = Math.sqrt(dx * dx + dy * dy)
      dx /= mag
      dy /= mag
      const nx = p.x + dx * p.spd
      const ny = p.y + dy * p.spd
      if (!isSolid(nx, p.y)) p.x = nx
      if (!isSolid(p.x, ny)) p.y = ny
      p.frame++
      if (Math.abs(dx) > Math.abs(dy)) {
        p.dir = dx > 0 ? 'right' : 'left'
      } else {
        p.dir = dy > 0 ? 'down' : 'up'
      }
    }

    // Camera follow
    const canvas = canvasRef.current
    if (canvas) {
      const targetCamX = p.x - canvas.width / 2
      const targetCamY = p.y - canvas.height / 2
      st.cam.x += (targetCamX - st.cam.x) * 0.1
      st.cam.y += (targetCamY - st.cam.y) * 0.1
      st.cam.x = Math.max(0, Math.min(WW * T - canvas.width, st.cam.x))
      st.cam.y = Math.max(0, Math.min(WH * T - canvas.height, st.cam.y))
    }

    // Villager AI
    const naz = st.nazgul
    for (const v of st.villagers) {
      if (v.state === 'captured') continue

      // Check flee
      if (naz && naz.hp > 0) {
        const vdx = naz.x - v.x, vdy = naz.y - v.y
        const vdist = Math.sqrt(vdx * vdx + vdy * vdy)
        if (vdist < 6 * T) {
          if (v.state !== 'flee') {
            v.state = 'flee'
            if (!v.screamed) {
              log('d', `${v.name}: ¡¡UN NAZGÛL!!`)
              v.screamed = true
            }
          }
        } else if (v.state === 'flee' && vdist > 10 * T) {
          v.state = 'walk'
        }
      }

      if (v.state === 'flee' && naz) {
        // Flee away from nazgul
        const fdx = v.x - naz.x, fdy = v.y - naz.y
        const fdist = Math.sqrt(fdx * fdx + fdy * fdy)
        if (fdist > 0) {
          const nx = v.x + (fdx / fdist) * 1.2
          const ny = v.y + (fdy / fdist) * 1.2
          if (!isSolid(nx, v.y) && nx > T && nx < (WW - 1) * T) v.x = nx
          if (!isSolid(v.x, ny) && ny > T && ny < (WH - 1) * T) v.y = ny
          v.frame++
          if (Math.abs(fdx) > Math.abs(fdy)) {
            v.dir = fdx > 0 ? 'right' : 'left'
          } else {
            v.dir = fdy > 0 ? 'down' : 'up'
          }
        }
      } else if (v.state === 'walk') {
        // Patrol
        v.patrolTimer--
        if (v.patrolTimer <= 0) {
          v.patrolIdx = (v.patrolIdx + 1) % v.patrol.length
          v.patrolTimer = 80
        }
        const target = v.patrol[v.patrolIdx]
        const arrived = moveToward(v, target.x, target.y, 0.5)
        if (!arrived) v.frame++
      }
    }

    // Gandalf Ally AI
    const g = st.gandalfAlly
    if (g) {
      if (g.shieldActive > 0) g.shieldActive--
      if (g.attackCooldown > 0) g.attackCooldown--

      // Check if player nearby and nazgul approaching
      const gpdx = p.x - g.x, gpdy = p.y - g.y
      const gpDist = Math.sqrt(gpdx * gpdx + gpdy * gpdy)

      if (naz && naz.hp > 0 && g.attackCooldown === 0) {
        const gndx = naz.x - g.x, gndy = naz.y - g.y
        const gnDist = Math.sqrt(gndx * gndx + gndy * gndy)

        if (gpDist < 4 * T && gnDist < 6 * T) {
          // Activate shield!
          g.shieldActive = 120
          g.attackCooldown = 180
          g.state = 'alert'

          // Damage and knockback nazgul
          naz.hp -= 8
          st.fx.push({
            x: naz.x,
            y: naz.y - 20,
            text: '-8',
            color: '#e8e0a0',
            vy: -1.1,
            life: 40,
          })

          // Knockback
          const kbDist = Math.sqrt(gndx * gndx + gndy * gndy)
          if (kbDist > 0) {
            naz.x += (gndx / kbDist) * T * 3
            naz.y += (gndy / kbDist) * T * 3
            naz.x = Math.max(T, Math.min((WW - 1) * T, naz.x))
            naz.y = Math.max(T, Math.min((WH - 1) * T, naz.y))
          }
          naz.state = 'flee_gandalf'

          log('e', 'Gandalf: ¡Atrás, criatura de la oscuridad! -8 HP al Nazgûl')
          notify('✦ GANDALF TE PROTEGE ✦', '#e8e0a0')

          if (naz.hp <= 0) {
            const saved = st.villagers.filter(v => v.state !== 'captured').length
            log('e', `¡NAZGÛL DERROTADO! La Comarca está a salvo. Aldeanos salvados: ${saved}/8`)
            st.gameActive = false
            setScreen('win')
          }
        }
      }

      // Patrol when idle
      if (g.shieldActive === 0) {
        g.state = 'idle'
        g.patrolTimer--
        if (g.patrolTimer <= 0) {
          g.patrolIdx = (g.patrolIdx + 1) % g.patrol.length
          g.patrolTimer = 100
        }
        const target = g.patrol[g.patrolIdx]
        const arrived = moveToward(g, target.x, target.y, 0.4)
        if (!arrived) g.frame++
      }
    }

    // Nazgul AI
    if (naz && naz.hp > 0) {
      if (naz.atkT > 0) naz.atkT--
      if (naz.invT > 0) naz.invT--
      naz.frame++

      // Check if should flee gandalf
      if (g) {
        const gndx = g.x - naz.x, gndy = g.y - naz.y
        const gnDist = Math.sqrt(gndx * gndx + gndy * gndy)
        if (gnDist < 3 * T) {
          naz.state = 'flee_gandalf'
        } else if (naz.state === 'flee_gandalf' && gnDist > 8 * T) {
          naz.state = 'hunt'
        }
      }

      // Check if should chase player
      if (naz.state !== 'flee_gandalf' && p.ringActive === 0) {
        const pndx = p.x - naz.x, pndy = p.y - naz.y
        const pnDist = Math.sqrt(pndx * pndx + pndy * pndy)
        if (pnDist < 12 * T) {
          naz.state = 'chase_player'
        }
      } else if (p.ringActive > 0 && naz.state === 'chase_player') {
        naz.state = 'hunt'
      }

      // Execute state
      if (naz.state === 'flee_gandalf' && g) {
        const fdx = naz.x - g.x, fdy = naz.y - g.y
        const fdist = Math.sqrt(fdx * fdx + fdy * fdy)
        if (fdist > 0) {
          naz.x += (fdx / fdist) * naz.spd
          naz.y += (fdy / fdist) * naz.spd
          naz.x = Math.max(T, Math.min((WW - 1) * T, naz.x))
          naz.y = Math.max(T, Math.min((WH - 1) * T, naz.y))
        }
      } else if (naz.state === 'chase_player') {
        moveToward(naz, p.x, p.y, naz.spd)

        // Attack player
        const pndx = p.x - naz.x, pndy = p.y - naz.y
        const pnDist = Math.sqrt(pndx * pndx + pndy * pndy)
        if (pnDist < T * 1.0 && p.invT === 0 && naz.atkT === 0 && p.ringActive === 0) {
          p.hp -= naz.dmg
          p.invT = 60
          naz.atkT = 60
          st.fx.push({
            x: p.x,
            y: p.y - 20,
            text: `-${naz.dmg}`,
            color: '#e24b4a',
            vy: -1.1,
            life: 40,
          })
          log('d', `¡El Nazgûl te ataca! -${naz.dmg} HP. (${Math.max(0, p.hp)}/${p.maxhp})`)

          if (p.hp <= 0) {
            st.gameActive = false
            setScreen('dead')
          }
        }
      } else {
        // Hunt villagers
        let closest: Villager | null = null
        let closestDist = Infinity
        for (const v of st.villagers) {
          if (v.state === 'captured') continue
          const vdx = v.x - naz.x, vdy = v.y - naz.y
          const vdist = Math.sqrt(vdx * vdx + vdy * vdy)
          if (vdist < closestDist) {
            closestDist = vdist
            closest = v
          }
        }

        if (closest) {
          moveToward(naz, closest.x, closest.y, naz.spd)

          // Attack villager
          if (closestDist < T * 1.0 && naz.atkT === 0) {
            closest.hp--
            naz.atkT = 80
            st.fx.push({
              x: closest.x,
              y: closest.y - 20,
              text: '-1',
              color: '#e24b4a',
              vy: -1.1,
              life: 40,
            })

            if (closest.hp <= 0) {
              closest.state = 'captured'
              naz.poweredUp++
              naz.spd = Math.min(1.6, naz.spd + 0.08)
              naz.hp = Math.min(naz.maxhp + naz.poweredUp * 3, naz.hp + 3)

              // Burst particles
              for (let i = 0; i < 6; i++) {
                st.parts.push({
                  x: closest.x,
                  y: closest.y,
                  vx: (Math.random() - 0.5) * 3,
                  vy: (Math.random() - 0.5) * 3,
                  color: '#5a1010',
                  life: 30,
                })
              }

              log('d', `${closest.name} ha caído. El Nazgûl se vuelve más poderoso (${naz.poweredUp} almas).`)

              // Check game over
              const remaining = st.villagers.filter(v => v.state !== 'captured').length
              if (remaining === 0) {
                st.gameActive = false
                setScreen('gameover')
              }
            }
          }
        } else {
          // No villagers left, chase player slowly
          moveToward(naz, p.x, p.y, naz.spd * 0.8)
        }
      }
    }

    // Update FX
    st.fx = st.fx.filter(f => {
      f.y += f.vy
      f.life--
      return f.life > 0
    })

    // Update particles
    st.parts = st.parts.filter(pt => {
      pt.x += pt.vx
      pt.y += pt.vy
      pt.life--
      return pt.life > 0
    })

    // Fade
    if (st.fade && st.fade.life > 0) {
      st.fade.life--
    }
  }, [isSolid, moveToward, spawnNazgul, log, notify])

  // ============ DRAWING ============
  const drawSprite = useCallback((
    ctx: CanvasRenderingContext2D,
    char: string,
    dir: Dir,
    frame: number,
    px: number,
    py: number,
    sc: number,
    extraColor?: string
  ) => {
    const legAnim = [-1, 0, 1, 0][frame % 4]
    ctx.save()
    ctx.translate(px, py)

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.beginPath()
    ctx.ellipse(0, 8 * sc, 6 * sc, 3 * sc, 0, 0, Math.PI * 2)
    ctx.fill()

    const flip = dir === 'left' ? -1 : 1
    ctx.scale(flip, 1)

    if (char === 'frodo') {
      // Body/cloak
      ctx.fillStyle = '#4a6020'
      ctx.fillRect(-5 * sc, -8 * sc, 10 * sc, 10 * sc)
      // Legs
      ctx.fillStyle = '#3a4818'
      ctx.fillRect(-3 * sc, 2 * sc, 3 * sc, 6 * sc + legAnim * sc)
      ctx.fillRect(0, 2 * sc, 3 * sc, 6 * sc - legAnim * sc)
      // Shoes
      ctx.fillStyle = '#6a4020'
      ctx.fillRect(-3 * sc, 7 * sc + legAnim * sc, 3 * sc, 2 * sc)
      ctx.fillRect(0, 7 * sc - legAnim * sc, 3 * sc, 2 * sc)
      // Head
      ctx.fillStyle = '#d4a070'
      ctx.fillRect(-4 * sc, -14 * sc, 8 * sc, 7 * sc)
      // Hair
      ctx.fillStyle = '#5a3010'
      ctx.fillRect(-4 * sc, -15 * sc, 8 * sc, 3 * sc)
      ctx.fillRect(-5 * sc, -13 * sc, 2 * sc, 3 * sc)
      ctx.fillRect(3 * sc, -13 * sc, 2 * sc, 3 * sc)
      // Eyes
      ctx.fillStyle = '#2a1810'
      if (dir === 'down' || dir === 'left' || dir === 'right') {
        ctx.fillRect(-2 * sc, -11 * sc, 1.5 * sc, 1.5 * sc)
        ctx.fillRect(1 * sc, -11 * sc, 1.5 * sc, 1.5 * sc)
      }
    } else if (char === 'aragorn') {
      // Armor body
      ctx.fillStyle = '#4a3a20'
      ctx.fillRect(-6 * sc, -8 * sc, 12 * sc, 12 * sc)
      // Chest plate
      ctx.fillStyle = '#6a5a30'
      ctx.fillRect(-4 * sc, -6 * sc, 8 * sc, 6 * sc)
      // Belt
      ctx.fillStyle = '#2a1a08'
      ctx.fillRect(-5 * sc, 2 * sc, 10 * sc, 2 * sc)
      // Chain mail hint
      ctx.fillStyle = '#5a5a5a'
      ctx.fillRect(-5 * sc, -2 * sc, 2 * sc, 4 * sc)
      ctx.fillRect(3 * sc, -2 * sc, 2 * sc, 4 * sc)
      // Legs
      ctx.fillStyle = '#3a2a18'
      ctx.fillRect(-3 * sc, 4 * sc, 3 * sc, 5 * sc + legAnim * sc)
      ctx.fillRect(0, 4 * sc, 3 * sc, 5 * sc - legAnim * sc)
      // Sword on right side
      ctx.fillStyle = '#9a9aa0'
      ctx.fillRect(6 * sc, -10 * sc, 2 * sc, 14 * sc)
      ctx.fillStyle = '#c8a84b'
      ctx.fillRect(5 * sc, 3 * sc, 4 * sc, 3 * sc)
      // Head
      ctx.fillStyle = '#d4a070'
      ctx.fillRect(-4 * sc, -16 * sc, 8 * sc, 8 * sc)
      // Beard
      ctx.fillStyle = '#4a2810'
      ctx.fillRect(-3 * sc, -10 * sc, 6 * sc, 3 * sc)
      // Hair
      ctx.fillStyle = '#3a2010'
      ctx.fillRect(-4 * sc, -17 * sc, 8 * sc, 3 * sc)
      // Crown dots
      ctx.fillStyle = '#c8a84b'
      for (let i = 0; i < 3; i++) {
        ctx.fillRect((-2 + i * 2) * sc, -18 * sc, 1 * sc, 1 * sc)
      }
      // Eyes
      ctx.fillStyle = '#2a1810'
      if (dir === 'down' || dir === 'left' || dir === 'right') {
        ctx.fillRect(-2 * sc, -13 * sc, 1.5 * sc, 1.5 * sc)
        ctx.fillRect(1 * sc, -13 * sc, 1.5 * sc, 1.5 * sc)
      }
    } else if (char === 'gandalf' || char === 'gandalf_npc') {
      // Robe
      ctx.fillStyle = '#888888'
      ctx.fillRect(-6 * sc, -10 * sc, 12 * sc, 16 * sc)
      // Shadow fold
      ctx.fillStyle = '#6a6a6a'
      ctx.fillRect(-4 * sc, 0, 2 * sc, 6 * sc)
      ctx.fillRect(2 * sc, 0, 2 * sc, 6 * sc)
      // Belt
      ctx.fillStyle = '#4a4040'
      ctx.fillRect(-5 * sc, -2 * sc, 10 * sc, 2 * sc)
      // Staff
      ctx.fillStyle = '#6a4a20'
      ctx.fillRect(7 * sc, -18 * sc, 2 * sc, 24 * sc)
      ctx.fillStyle = '#c8a84b'
      ctx.beginPath()
      ctx.arc(8 * sc, -19 * sc, 2.5 * sc, 0, Math.PI * 2)
      ctx.fill()
      // Head
      ctx.fillStyle = '#d4a080'
      ctx.fillRect(-4 * sc, -18 * sc, 8 * sc, 8 * sc)
      // Beard
      ctx.fillStyle = '#e8e8e0'
      ctx.fillRect(-3 * sc, -12 * sc, 6 * sc, 6 * sc)
      ctx.fillRect(-2 * sc, -6 * sc, 4 * sc, 4 * sc)
      // Hat
      ctx.fillStyle = '#606060'
      ctx.beginPath()
      ctx.moveTo(-6 * sc, -18 * sc)
      ctx.lineTo(0, -28 * sc)
      ctx.lineTo(6 * sc, -18 * sc)
      ctx.fill()
      ctx.fillStyle = '#808080'
      ctx.fillRect(-8 * sc, -18 * sc, 16 * sc, 2 * sc)
      // Eyes
      ctx.fillStyle = '#2a2a40'
      if (dir === 'down' || dir === 'left' || dir === 'right') {
        ctx.fillRect(-2 * sc, -16 * sc, 1.5 * sc, 1.5 * sc)
        ctx.fillRect(1 * sc, -16 * sc, 1.5 * sc, 1.5 * sc)
      }
    } else if (char === 'nazgul') {
      const pulse = 0.7 + 0.3 * Math.sin(frame * 0.15)
      // Cloak
      ctx.fillStyle = `rgba(10,5,20,${pulse})`
      ctx.fillRect(-7 * sc, -12 * sc, 14 * sc, 20 * sc)
      // Hood
      ctx.fillStyle = `rgba(35,0,0,${pulse})`
      ctx.fillRect(-5 * sc, -18 * sc, 10 * sc, 8 * sc)
      ctx.beginPath()
      ctx.moveTo(-5 * sc, -18 * sc)
      ctx.lineTo(0, -22 * sc)
      ctx.lineTo(5 * sc, -18 * sc)
      ctx.fill()
      // Eyes
      ctx.fillStyle = '#ff6020'
      ctx.beginPath()
      ctx.arc(-2 * sc, -14 * sc, 1.5 * sc, 0, Math.PI * 2)
      ctx.arc(2 * sc, -14 * sc, 1.5 * sc, 0, Math.PI * 2)
      ctx.fill()
      // Sword
      ctx.fillStyle = 'rgba(100,100,120,0.8)'
      ctx.fillRect(8 * sc, -16 * sc, 2 * sc, 18 * sc)
      // Wisps
      ctx.fillStyle = 'rgba(20,0,40,0.4)'
      ctx.fillRect(-10 * sc, -5 * sc, 4 * sc, 8 * sc)
      ctx.fillRect(6 * sc, -5 * sc, 4 * sc, 8 * sc)
    } else if (char === 'villager') {
      // Generic villager with custom color
      const color = extraColor || '#8a6030'
      ctx.fillStyle = color
      ctx.fillRect(-4 * sc, -6 * sc, 8 * sc, 8 * sc)
      // Legs
      ctx.fillStyle = '#5a4020'
      ctx.fillRect(-2 * sc, 2 * sc, 2 * sc, 5 * sc + legAnim * sc * 0.5)
      ctx.fillRect(0, 2 * sc, 2 * sc, 5 * sc - legAnim * sc * 0.5)
      // Head
      ctx.fillStyle = '#d4a070'
      ctx.fillRect(-3 * sc, -12 * sc, 6 * sc, 6 * sc)
      // Eyes
      ctx.fillStyle = '#2a1810'
      if (dir === 'down' || dir === 'left' || dir === 'right') {
        ctx.fillRect(-1.5 * sc, -9 * sc, 1 * sc, 1 * sc)
        ctx.fillRect(0.5 * sc, -9 * sc, 1 * sc, 1 * sc)
      }
    }

    ctx.restore()
  }, [])

  const drawTile = useCallback((
    ctx: CanvasRenderingContext2D,
    tx: number,
    ty: number,
    tile: Tile,
    sx: number,
    sy: number
  ) => {
    const x = tx * T - sx, y = ty * T - sy

    switch (tile.type) {
      case 'grass':
        ctx.fillStyle = tile.variant === 0 ? '#2d3d1a' : '#354820'
        ctx.fillRect(x, y, T, T)
        break
      case 'path':
        ctx.fillStyle = '#c8b46e'
        ctx.fillRect(x, y, T, T)
        ctx.fillStyle = '#b8a45e'
        ctx.fillRect(x + 2, y + 2, 4, 4)
        ctx.fillRect(x + 20, y + 14, 6, 6)
        break
      case 'tree':
        ctx.fillStyle = '#354820'
        ctx.fillRect(x, y, T, T)
        ctx.fillStyle = '#5a3010'
        ctx.fillRect(x + 12, y + 18, 8, 14)
        ctx.fillStyle = '#1a4010'
        ctx.beginPath()
        ctx.arc(x + 16, y + 12, 12, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#2a5018'
        ctx.beginPath()
        ctx.arc(x + 14, y + 8, 6, 0, Math.PI * 2)
        ctx.fill()
        break
      case 'flower':
        ctx.fillStyle = tile.variant === 0 ? '#2d3d1a' : '#354820'
        ctx.fillRect(x, y, T, T)
        ctx.fillStyle = '#e8a0b0'
        ctx.beginPath()
        ctx.arc(x + 8, y + 12, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#f0e060'
        ctx.beginPath()
        ctx.arc(x + 20, y + 20, 3, 0, Math.PI * 2)
        ctx.fill()
        break
      case 'yard':
        ctx.fillStyle = '#3a4818'
        ctx.fillRect(x, y, T, T)
        break
      case 'door':
        ctx.fillStyle = '#3a4818'
        ctx.fillRect(x, y, T, T)
        // Hobbit hole door
        ctx.fillStyle = '#2a3a10'
        ctx.beginPath()
        ctx.arc(x + 16, y + 20, 14, Math.PI, 0, true)
        ctx.fill()
        ctx.fillStyle = '#6a5030'
        ctx.beginPath()
        ctx.arc(x + 16, y + 20, 10, Math.PI, 0, true)
        ctx.fill()
        ctx.fillStyle = '#4a3820'
        ctx.fillRect(x + 6, y + 10, 20, 22)
        ctx.fillStyle = '#c8a84b'
        ctx.beginPath()
        ctx.arc(x + 22, y + 20, 2, 0, Math.PI * 2)
        ctx.fill()
        break
      case 'mill':
        ctx.fillStyle = '#7a6040'
        ctx.fillRect(x, y, T, T)
        ctx.fillStyle = '#5a4030'
        ctx.fillRect(x + 8, y, 16, T)
        // Mill blades hint
        ctx.strokeStyle = '#8a7050'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x + 16, y + 8)
        ctx.lineTo(x + 16, y - 8)
        ctx.moveTo(x + 8, y + 16)
        ctx.lineTo(x + 24, y + 16)
        ctx.stroke()
        break
    }
  }, [])

  const drawMinimap = useCallback(() => {
    const mctx = minimapRef.current?.getContext('2d')
    if (!mctx || !S.current) return

    mctx.fillStyle = '#0a0804'
    mctx.fillRect(0, 0, 100, 70)

    const st = S.current
    const scale = 100 / WW

    // Draw tiles
    for (let ty = 0; ty < WH; ty++) {
      for (let tx = 0; tx < WW; tx++) {
        const tile = st.map[ty][tx]
        let color = '#2a3a18'
        if (tile.type === 'path') color = '#c8b46e'
        else if (tile.type === 'tree') color = '#1a4010'
        else if (tile.type === 'yard') color = '#3a4818'
        else if (tile.type === 'door') color = '#6a5030'
        else if (tile.type === 'mill') color = '#7a6040'

        if (tile.type !== 'grass') {
          mctx.fillStyle = color
          mctx.fillRect(tx * scale, ty * scale * (70 / WH), scale, scale * (70 / WH))
        }
      }
    }

    // Villagers
    for (const v of st.villagers) {
      const mx = (v.x / T) * scale, my = (v.y / T) * scale * (70 / WH)
      mctx.fillStyle = v.state === 'captured' ? '#5a1010' : v.state === 'flee' ? '#e08040' : '#8aaa6e'
      mctx.fillRect(mx - 1, my - 1, 2, 2)
    }

    // Gandalf
    if (st.gandalfAlly) {
      const mx = (st.gandalfAlly.x / T) * scale, my = (st.gandalfAlly.y / T) * scale * (70 / WH)
      mctx.fillStyle = '#e8e0a0'
      mctx.fillRect(mx - 1.5, my - 1.5, 3, 3)
    }

    // Nazgul
    if (st.nazgul && st.nazgul.hp > 0) {
      const mx = (st.nazgul.x / T) * scale, my = (st.nazgul.y / T) * scale * (70 / WH)
      mctx.fillStyle = Math.floor(Date.now() / 180) % 2 === 0 ? '#ff4020' : '#8a2010'
      mctx.fillRect(mx - 2.5, my - 2.5, 5, 5)
    }

    // Player
    if (st.p) {
      const mx = (st.p.x / T) * scale, my = (st.p.y / T) * scale * (70 / WH)
      mctx.fillStyle = '#c8a84b'
      mctx.beginPath()
      mctx.arc(mx, my, 3, 0, Math.PI * 2)
      mctx.fill()
    }
  }, [])

  const render = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !S.current || !S.current.p) return

    const st = S.current
    const p = st.p!
    const canvas = canvasRef.current!
    const sx = st.cam.x, sy = st.cam.y

    // Clear
    ctx.fillStyle = '#0a0804'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Calculate visible tiles
    const startTX = Math.max(0, Math.floor(sx / T) - 1)
    const endTX = Math.min(WW, Math.ceil((sx + canvas.width) / T) + 1)
    const startTY = Math.max(0, Math.floor(sy / T) - 1)
    const endTY = Math.min(WH, Math.ceil((sy + canvas.height) / T) + 1)

    // Draw tiles
    for (let ty = startTY; ty < endTY; ty++) {
      for (let tx = startTX; tx < endTX; tx++) {
        drawTile(ctx, tx, ty, st.map[ty][tx], sx, sy)
      }
    }

    // Draw particles
    for (const pt of st.parts) {
      ctx.fillStyle = pt.color
      ctx.globalAlpha = pt.life / 30
      ctx.fillRect(pt.x - sx - 2, pt.y - sy - 2, 4, 4)
    }
    ctx.globalAlpha = 1

    // Draw captured marks
    for (const v of st.villagers) {
      if (v.state === 'captured') {
        ctx.strokeStyle = '#8a2020'
        ctx.lineWidth = 2
        const vx = v.x - sx, vy = v.y - sy
        ctx.beginPath()
        ctx.moveTo(vx - 8, vy - 8)
        ctx.lineTo(vx + 8, vy + 8)
        ctx.moveTo(vx + 8, vy - 8)
        ctx.lineTo(vx - 8, vy + 8)
        ctx.stroke()
        // Name
        ctx.font = '7px monospace'
        ctx.fillStyle = '#5a1010'
        ctx.textAlign = 'center'
        ctx.fillText(v.name, vx, vy + 20)
      }
    }

    // Draw villagers
    for (const v of st.villagers) {
      if (v.state === 'captured') continue
      const vx = v.x - sx, vy = v.y - sy
      drawSprite(ctx, 'villager', v.dir, v.frame, vx, vy, 1.8, v.color)

      // Hat
      if (v.hat) {
        ctx.fillStyle = '#2a1808'
        ctx.fillRect(vx - 5, vy - 26, 10, 4)
        ctx.fillRect(vx - 3, vy - 30, 6, 4)
      }

      // Flee indicator
      if (v.state === 'flee') {
        ctx.font = 'bold 12px sans-serif'
        ctx.fillStyle = '#e24b4a'
        ctx.textAlign = 'center'
        ctx.fillText('!', vx, vy - 35)
      }

      // Name label
      ctx.font = '7px monospace'
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      const nameWidth = ctx.measureText(v.name).width + 6
      ctx.fillRect(vx - nameWidth / 2, vy + 12, nameWidth, 10)
      ctx.fillStyle = v.state === 'flee' ? '#e08040' : '#8aaa6e'
      ctx.textAlign = 'center'
      ctx.fillText(v.name, vx, vy + 20)
    }

    // Draw Gandalf ally
    const g = st.gandalfAlly
    if (g) {
      const gx = g.x - sx, gy = g.y - sy

      // Shield effect
      if (g.shieldActive > 0) {
        const pulse = 0.5 + 0.5 * Math.sin(st.frameCount * 0.2)
        ctx.strokeStyle = `rgba(232,224,160,${pulse})`
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(gx, gy, 40, 0, Math.PI * 2)
        ctx.stroke()
        ctx.strokeStyle = `rgba(255,255,200,${pulse * 0.4})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(gx, gy, 50, 0, Math.PI * 2)
        ctx.stroke()
      }

      drawSprite(ctx, 'gandalf_npc', g.dir, g.frame, gx, gy, 2)

      // Name label
      ctx.font = 'bold 7px monospace'
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fillRect(gx - 25, gy + 12, 50, 10)
      ctx.fillStyle = '#e8e0a0'
      ctx.textAlign = 'center'
      ctx.fillText('GANDALF', gx, gy + 20)

      // Interact hint
      if (!g.talked && p) {
        const gdx = g.x - p.x, gdy = g.y - p.y
        const gDist = Math.sqrt(gdx * gdx + gdy * gdy)
        if (gDist < 2.5 * T) {
          ctx.font = 'bold 10px monospace'
          ctx.fillStyle = '#c8a84b'
          ctx.fillText('[E]', gx, gy - 35)
        }
      }
    }

    // Draw Nazgul
    const naz = st.nazgul
    if (naz && naz.hp > 0) {
      const nx = naz.x - sx, ny = naz.y - sy

      // Flash when hit
      if (naz.invT > 0 && naz.invT % 4 < 2) {
        ctx.globalAlpha = 0.5
      }

      drawSprite(ctx, 'nazgul', naz.dir, naz.frame, nx, ny, 2.2)
      ctx.globalAlpha = 1

      // HP bar
      ctx.fillStyle = '#2a0a0a'
      ctx.fillRect(nx - 20, ny - 45, 40, 6)
      ctx.fillStyle = '#c82020'
      ctx.fillRect(nx - 19, ny - 44, 38 * (naz.hp / naz.maxhp), 4)

      // Name
      ctx.font = 'bold 8px monospace'
      ctx.fillStyle = '#ff6040'
      ctx.textAlign = 'center'
      ctx.fillText('NAZGÛL', nx, ny + 25)

      // Souls count
      if (naz.poweredUp > 0) {
        ctx.fillStyle = '#c82020'
        ctx.fillText(`ALMAS: ${naz.poweredUp}`, nx, ny + 35)
      }
    }

    // Draw player
    const px = p.x - sx, py = p.y - sy

    // Invisibility effect
    if (p.ringActive > 0) {
      ctx.globalAlpha = 0.4
      ctx.strokeStyle = '#c8a84b'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.arc(px, py, 20, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Flash when hit
    if (p.invT > 0 && p.invT % 6 < 3) {
      ctx.globalAlpha = 0.5
    }

    drawSprite(ctx, p.char, p.dir, p.frame, px, py, 2)
    ctx.globalAlpha = 1

    // Player name
    ctx.font = 'bold 9px monospace'
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    const pName = CHARS[p.char].name
    const pNameWidth = ctx.measureText(pName).width + 8
    ctx.fillRect(px - pNameWidth / 2, py + 12, pNameWidth, 12)
    ctx.fillStyle = '#c8a84b'
    ctx.textAlign = 'center'
    ctx.fillText(pName, px, py + 22)

    // Draw floating text FX
    for (const f of st.fx) {
      ctx.font = 'bold 12px monospace'
      ctx.fillStyle = f.color
      ctx.globalAlpha = f.life / 40
      ctx.textAlign = 'center'
      ctx.fillText(f.text, f.x - sx, f.y - sy)
    }
    ctx.globalAlpha = 1

    // Draw fade notification
    if (st.fade && st.fade.life > 0) {
      ctx.font = 'bold 14px monospace'
      ctx.fillStyle = st.fade.color
      ctx.globalAlpha = st.fade.life / 90
      ctx.textAlign = 'center'
      ctx.fillText(st.fade.text, canvas.width / 2, 60)
      ctx.globalAlpha = 1
    }

    // Draw minimap
    drawMinimap()
  }, [drawTile, drawSprite, drawMinimap])

  // ============ GAME LOOP ============
  const loop = useCallback(() => {
    if (screen === 'game' && S.current?.gameActive) {
      update()
    }
    render()
    animRef.current = requestAnimationFrame(loop)
  }, [screen, update, render])

  // ============ INPUT SETUP ============
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!S.current) return
      S.current.keys.add(e.key)

      if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault()
        if (S.current.dlg.active) {
          advanceDlg()
        } else {
          doAttack()
        }
      }

      if ((e.key === 'e' || e.key === 'E') && !S.current.ePrev) {
        S.current.ePrev = true
        if (S.current.dlg.active) {
          closeDlg()
        } else {
          tryInteract()
        }
      }

      if (e.key === 'Escape') {
        closeDlg()
      }

      // Number keys for inventory
      if (e.key >= '1' && e.key <= '5') {
        useItem(parseInt(e.key) - 1)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!S.current) return
      S.current.keys.delete(e.key)
      if (e.key === 'e' || e.key === 'E') {
        S.current.ePrev = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [advanceDlg, doAttack, closeDlg, tryInteract, useItem])

  // ============ RESIZE ============
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && rootRef.current) {
        canvasRef.current.width = rootRef.current.offsetWidth
        canvasRef.current.height = rootRef.current.offsetHeight
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ============ GAME LOOP START ============
  useEffect(() => {
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [loop])

  // ============ JOYSTICK HANDLERS ============
  const joystickRef = useRef<HTMLDivElement>(null)
  const [thumbPos, setThumbPos] = useState({ x: 0, y: 0 })

  const handleJoystickStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    if (!S.current || !joystickRef.current) return
    const rect = joystickRef.current.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const dx = clientX - rect.left - centerX
    const dy = clientY - rect.top - centerY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const maxDist = 36

    const clampedX = dist > maxDist ? (dx / dist) * maxDist : dx
    const clampedY = dist > maxDist ? (dy / dist) * maxDist : dy

    setThumbPos({ x: clampedX, y: clampedY })
    S.current.joy = { active: true, dx: clampedX, dy: clampedY }
  }

  const handleJoystickMove = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    if (!S.current?.joy.active || !joystickRef.current) return
    const rect = joystickRef.current.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const dx = clientX - rect.left - centerX
    const dy = clientY - rect.top - centerY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const maxDist = 36

    const clampedX = dist > maxDist ? (dx / dist) * maxDist : dx
    const clampedY = dist > maxDist ? (dy / dist) * maxDist : dy

    setThumbPos({ x: clampedX, y: clampedY })
    S.current.joy = { active: true, dx: clampedX, dy: clampedY }
  }

  const handleJoystickEnd = () => {
    if (!S.current) return
    setThumbPos({ x: 0, y: 0 })
    S.current.joy = { active: false, dx: 0, dy: 0 }
  }

  // ============ RENDER ============
  const savedCount = S.current ? S.current.villagers.filter(v => v.state !== 'captured').length : 8

  return (
    <div
      ref={rootRef}
      className="relative w-full h-[640px] bg-[#0a0804] rounded-lg overflow-hidden select-none"
      style={{ touchAction: 'none' }}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Minimap */}
      {screen === 'game' && (
        <div className="absolute top-2.5 left-2.5 rounded border border-[rgba(200,168,75,0.3)] overflow-hidden">
          <canvas ref={minimapRef} width={100} height={70} />
        </div>
      )}

      {/* Stats Box */}
      {screen === 'game' && S.current?.p && (
        <div className="absolute top-2.5 right-2.5 text-right pointer-events-none">
          <div className="text-[#c8a84b] text-[9px] tracking-[2px] font-bold">
            {CHARS[S.current.p.char].name}
          </div>
          <div className="flex gap-1 justify-end mt-1">
            {Array.from({ length: S.current.p.maxhp }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${i < S.current!.p!.hp ? 'bg-[#5a8a3a]' : 'bg-[#3a2a20]'
                  }`}
              />
            ))}
          </div>
          <div className="text-[#5a8a3a] text-[8px] mt-1">
            Aldeanos: {savedCount}/8
          </div>
          {S.current.p.ringActive > 0 && (
            <div className="text-[#c8a84b] text-[8px] animate-pulse">
              💍 INVISIBLE
            </div>
          )}
        </div>
      )}

      {/* Inventory */}
      {screen === 'game' && S.current?.p && (
        <div className="absolute top-16 right-2.5 flex flex-col gap-1">
          {S.current.p.inv.map((item, i) => (
            <button
              key={i}
              onClick={() => useItem(i)}
              className="w-7 h-7 bg-[rgba(40,30,20,0.8)] border border-[rgba(200,168,75,0.3)] rounded flex items-center justify-center text-sm hover:bg-[rgba(60,50,40,0.8)] transition-colors"
              title={ITEMS[item]?.desc}
            >
              {ITEMS[item]?.icon || '?'}
            </button>
          ))}
        </div>
      )}

      {/* Joystick */}
      {screen === 'game' && (
        <div
          ref={joystickRef}
          className="absolute bottom-8 left-4 w-[90px] h-[90px] rounded-full bg-[rgba(200,168,75,0.07)] border-2 border-[rgba(200,168,75,0.18)] flex items-center justify-center"
          onTouchStart={handleJoystickStart}
          onTouchMove={handleJoystickMove}
          onTouchEnd={handleJoystickEnd}
          onMouseDown={handleJoystickStart}
          onMouseMove={handleJoystickMove}
          onMouseUp={handleJoystickEnd}
          onMouseLeave={handleJoystickEnd}
        >
          <div
            className="w-9 h-9 rounded-full bg-[rgba(200,168,75,0.22)] border border-[rgba(200,168,75,0.4)]"
            style={{
              transform: `translate(${thumbPos.x}px, ${thumbPos.y}px)`,
            }}
          />
        </div>
      )}

      {/* Attack Button */}
      {screen === 'game' && (
        <button
          onClick={doAttack}
          className="absolute bottom-8 right-[85px] w-[52px] h-[52px] rounded-full bg-[rgba(180,40,40,0.22)] border-2 border-[rgba(220,80,80,0.4)] flex items-center justify-center text-lg active:bg-[rgba(180,40,40,0.4)] transition-colors"
        >
          ⚔
        </button>
      )}

      {/* Interact Button */}
      {screen === 'game' && (
        <button
          onClick={tryInteract}
          className="absolute bottom-8 right-6 w-[52px] h-[52px] rounded-full bg-[rgba(100,160,100,0.22)] border-2 border-[rgba(140,200,140,0.4)] flex items-center justify-center text-lg font-bold text-[#8aaa6e] active:bg-[rgba(100,160,100,0.4)] transition-colors"
        >
          E
        </button>
      )}

      {/* Terminal */}
      {screen === 'game' && (
        <div className="absolute bottom-0 left-0 right-0 bg-[rgba(10,8,4,0.95)] border-t border-[rgba(200,168,75,0.2)]">
          <button
            onClick={() => {
              if (S.current) S.current.termOpen = !S.current.termOpen
            }}
            className="w-full px-3 py-1 flex items-center gap-2 text-[10px] text-[#5a6a3a]"
          >
            <span className="w-2 h-2 rounded-full bg-[#5a8a3a]" />
            TERMINAL
            <span className="ml-auto">{S.current?.termOpen ? '▼' : '▲'}</span>
          </button>
          {S.current?.termOpen && (
            <div className="h-[100px] overflow-y-auto px-3 pb-2 font-mono text-[10px]">
              {S.current.logs.map((l, i) => (
                <div
                  key={i}
                  className={
                    l.type === 'i' ? 'text-[#5a6a3a]' :
                      l.type === 'e' ? 'text-[#c8a84b]' :
                        l.type === 'd' ? 'text-[#e24b4a]' :
                          l.type === 'n' ? 'text-[#8aaa6e]' :
                            'text-[#6a5a3a]'
                  }
                >
                  [{l.time}] {l.msg}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialog Box */}
      {screen === 'game' && S.current?.dlg.active && (
        <div className="absolute bottom-0 left-0 right-0 bg-[rgba(20,18,14,0.97)] border-t-2 border-[#c8a84b] p-4">
          <div className="text-[#c8a84b] text-xs font-bold tracking-wider mb-2">
            {S.current.dlg.speaker}
          </div>
          <div className="text-[#e8e0d0] text-sm mb-3">
            {S.current.dlg.lines[S.current.dlg.lineIdx]}
          </div>
          {S.current.dlg.lineIdx === S.current.dlg.lines.length - 1 && (
            <div className="flex flex-wrap gap-2">
              {S.current.dlg.opts.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => selectDlgOpt(opt)}
                  className="px-3 py-1 bg-[rgba(200,168,75,0.15)] border border-[rgba(200,168,75,0.4)] rounded text-[#c8a84b] text-xs hover:bg-[rgba(200,168,75,0.25)] transition-colors"
                >
                  {opt.l}
                </button>
              ))}
            </div>
          )}
          {S.current.dlg.lineIdx < S.current.dlg.lines.length - 1 && (
            <button
              onClick={advanceDlg}
              className="text-[#8a8a6a] text-xs animate-pulse"
            >
              [ESPACIO] Continuar...
            </button>
          )}
        </div>
      )}

      {/* Character Selection */}
      {screen === 'charsel' && (
        <div className="absolute inset-0 bg-[rgba(10,8,4,0.98)] flex flex-col items-center justify-center p-4">
          <h1 className="text-[#c8a84b] text-2xl font-bold tracking-wider mb-2">
            TIERRA MEDIA
          </h1>
          <p className="text-[#6a5a3a] text-sm mb-6">Elige tu héroe</p>
          <div className="flex gap-4 flex-wrap justify-center">
            {Object.entries(CHARS).map(([key, char]) => (
              <button
                key={key}
                onClick={() => setSelectedChar(key)}
                className={`p-4 rounded-lg border-2 transition-all ${selectedChar === key
                    ? 'border-[#c8a84b] bg-[rgba(200,168,75,0.15)]'
                    : 'border-[rgba(200,168,75,0.3)] bg-[rgba(40,30,20,0.5)] hover:border-[rgba(200,168,75,0.5)]'
                  }`}
              >
                <div className="w-16 h-16 flex items-center justify-center mb-2">
                  <CharPreview charKey={key} />
                </div>
                <div className="text-[#c8a84b] text-xs font-bold tracking-wider">
                  {char.name}
                </div>
                <div className="text-[#5a6a3a] text-[10px] mt-1">
                  HP: {char.maxhp} | DMG: {char.dmg}
                </div>
              </button>
            ))}
          </div>
          {selectedChar && (
            <button
              onClick={() => startGame(selectedChar)}
              className="mt-6 px-8 py-3 bg-[#c8a84b] text-[#1a1408] font-bold rounded-lg hover:bg-[#d8b85b] transition-colors"
            >
              COMENZAR
            </button>
          )}
        </div>
      )}

      {/* Dead Screen */}
      {screen === 'dead' && (
        <div className="absolute inset-0 bg-[rgba(60,5,5,0.93)] flex flex-col items-center justify-center">
          <h1 className="text-[#c82020] text-3xl font-bold mb-4">¡HAS CAÍDO!</h1>
          <p className="text-[#8a4040] text-sm mb-6">
            Pero la esperanza no se ha perdido...
          </p>
          <button
            onClick={revive}
            className="px-8 py-3 bg-[#8a3030] text-[#e8d0d0] font-bold rounded-lg hover:bg-[#a04040] transition-colors"
          >
            RENACER
          </button>
        </div>
      )}

      {/* Game Over Screen */}
      {screen === 'gameover' && (
        <div className="absolute inset-0 bg-[rgba(5,2,2,0.97)] flex flex-col items-center justify-center p-4">
          <div className="text-[#4a1010] text-xs tracking-widest mb-2">
            LA COMARCA HA CAÍDO
          </div>
          <h1 className="text-[#8a2020] text-2xl font-bold mb-4">
            TODOS HAN SIDO CAPTURADOS
          </h1>
          <p className="text-[#6a4040] text-sm italic mb-6 text-center max-w-xs">
            &ldquo;La oscuridad se cierne sobre la Comarca. Los hobbits han perdido toda esperanza...&rdquo;
          </p>
          <button
            onClick={restartFromSelect}
            className="px-8 py-3 bg-[#4a2020] text-[#c8a0a0] font-bold rounded-lg hover:bg-[#5a2828] transition-colors"
          >
            INTENTAR DE NUEVO
          </button>
        </div>
      )}

      {/* Win Screen */}
      {screen === 'win' && (
        <div className="absolute inset-0 bg-[rgba(4,30,20,0.96)] flex flex-col items-center justify-center p-4">
          <h1 className="text-[#c8a84b] text-3xl font-bold mb-4">¡VICTORIA!</h1>
          <p className="text-[#5a8a3a] text-lg mb-2">
            Aldeanos salvados: {savedCount}/8
          </p>
          <p className="text-[#4a6a3a] text-sm italic mb-6 text-center max-w-xs">
            &ldquo;La Comarca está a salvo. La luz ha vencido a la oscuridad.&rdquo;
          </p>
          <button
            onClick={restartFromSelect}
            className="px-8 py-3 bg-[#3a5a30] text-[#e8e0d0] font-bold rounded-lg hover:bg-[#4a6a40] transition-colors"
          >
            JUGAR DE NUEVO
          </button>
        </div>
      )}
    </div>
  )
}

// Character preview component for selection screen
function CharPreview({ charKey }: { charKey: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, 64, 64)

    const sc = 1.5
    const px = 32, py = 40

    // Draw character sprite
    ctx.save()
    ctx.translate(px, py)

    if (charKey === 'frodo') {
      ctx.fillStyle = '#4a6020'
      ctx.fillRect(-5 * sc, -8 * sc, 10 * sc, 10 * sc)
      ctx.fillStyle = '#3a4818'
      ctx.fillRect(-3 * sc, 2 * sc, 3 * sc, 6 * sc)
      ctx.fillRect(0, 2 * sc, 3 * sc, 6 * sc)
      ctx.fillStyle = '#d4a070'
      ctx.fillRect(-4 * sc, -14 * sc, 8 * sc, 7 * sc)
      ctx.fillStyle = '#5a3010'
      ctx.fillRect(-4 * sc, -15 * sc, 8 * sc, 3 * sc)
    } else if (charKey === 'aragorn') {
      ctx.fillStyle = '#4a3a20'
      ctx.fillRect(-6 * sc, -8 * sc, 12 * sc, 12 * sc)
      ctx.fillStyle = '#6a5a30'
      ctx.fillRect(-4 * sc, -6 * sc, 8 * sc, 6 * sc)
      ctx.fillStyle = '#3a2a18'
      ctx.fillRect(-3 * sc, 4 * sc, 3 * sc, 5 * sc)
      ctx.fillRect(0, 4 * sc, 3 * sc, 5 * sc)
      ctx.fillStyle = '#d4a070'
      ctx.fillRect(-4 * sc, -16 * sc, 8 * sc, 8 * sc)
      ctx.fillStyle = '#4a2810'
      ctx.fillRect(-3 * sc, -10 * sc, 6 * sc, 3 * sc)
      ctx.fillStyle = '#9a9aa0'
      ctx.fillRect(6 * sc, -10 * sc, 2 * sc, 14 * sc)
    } else if (charKey === 'gandalf') {
      ctx.fillStyle = '#888888'
      ctx.fillRect(-6 * sc, -10 * sc, 12 * sc, 16 * sc)
      ctx.fillStyle = '#6a4a20'
      ctx.fillRect(7 * sc, -18 * sc, 2 * sc, 24 * sc)
      ctx.fillStyle = '#c8a84b'
      ctx.beginPath()
      ctx.arc(8 * sc, -19 * sc, 2.5 * sc, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#d4a080'
      ctx.fillRect(-4 * sc, -18 * sc, 8 * sc, 8 * sc)
      ctx.fillStyle = '#e8e8e0'
      ctx.fillRect(-3 * sc, -12 * sc, 6 * sc, 6 * sc)
      ctx.fillStyle = '#606060'
      ctx.beginPath()
      ctx.moveTo(-6 * sc, -18 * sc)
      ctx.lineTo(0, -28 * sc)
      ctx.lineTo(6 * sc, -18 * sc)
      ctx.fill()
    }

    ctx.restore()
  }, [charKey])

  return <canvas ref={canvasRef} width={64} height={64} />
}
