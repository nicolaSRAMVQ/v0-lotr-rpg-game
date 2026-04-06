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
  legolas: { name: 'LEGOLAS', spd: 3.2, maxhp: 6, dmg: 8, range: 5.0, startItems: ['arco', 'lembas'] },
  gimli: { name: 'GIMLI', spd: 1.8, maxhp: 14, dmg: 15, range: 1.6, startItems: ['hacha', 'miruvor'] },
}

// ============ ITEMS ============
const WEAPONS: Record<string, { main: { icon: string; label: string; dmgMult: number; rangeMult: number }; secondary: { icon: string; label: string; dmgMult: number; rangeMult: number } }> = {
  frodo:   { main: { icon: '🗡️', label: 'Sting',     dmgMult: 1.0, rangeMult: 1.0 }, secondary: { icon: '🔪', label: 'Daga',      dmgMult: 0.7, rangeMult: 0.6 } },
  aragorn: { main: { icon: '⚔️', label: 'Andúril',   dmgMult: 1.0, rangeMult: 1.0 }, secondary: { icon: '🏹', label: 'Arco',      dmgMult: 0.7, rangeMult: 2.5 } },
  gandalf: { main: { icon: '✦',  label: 'Bastón',    dmgMult: 1.0, rangeMult: 1.0 }, secondary: { icon: '⚔️', label: 'Glamdring', dmgMult: 1.4, rangeMult: 0.7 } },
  legolas: { main: { icon: '🏹', label: 'Arco',      dmgMult: 1.0, rangeMult: 1.0 }, secondary: { icon: '🔪', label: 'Cuchillos', dmgMult: 0.9, rangeMult: 0.5 } },
  gimli:   { main: { icon: '🪓', label: 'Hacha',     dmgMult: 1.0, rangeMult: 1.0 }, secondary: { icon: '🔪', label: 'Cuchillo',  dmgMult: 0.6, rangeMult: 0.7 } },
}

const ITEMS: Record<string, { icon: string; desc: string }> = {
  lembas: { icon: '🍞', desc: 'Pan élfico. Restaura 3 HP.' },
  anillo: { icon: '💍', desc: 'El Anillo Único. Invisibilidad temporal.' },
  espada: { icon: '⚔️', desc: 'Andúril. Daño aumentado.' },
  baston: { icon: '🪄', desc: 'Bastón de mago. Área de ataque.' },
  miruvor: { icon: '🧴', desc: 'Cordial élfico. Restaura HP completo.' },
  espada_rota: { icon: '🗡️', desc: 'Espada rota. Daño reducido.' },
  arco: { icon: '🏹', desc: 'Arco élfico. Ataque a distancia.' },
  hacha: { icon: '🪓', desc: 'Hacha enana. Daño demoledor.' },
  gold: { icon: '💰', desc: 'Monedas de la Comarca.' },
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

// ============ MOD COMMANDS ============
const MOD_COMMANDS = [
  { cmd: '/horda', desc: 'Activa modo horda' },
  { cmd: '/heroe', desc: 'Modo héroe (inmortal)' },
  { cmd: '/arma espada', desc: 'Dropea espada' },
  { cmd: '/arma baculo', desc: 'Dropea báculo' },
  { cmd: '/arma daga', desc: 'Dropea daga' },
  { cmd: '/invocar gandalf', desc: 'Invoca a Gandalf' },
  { cmd: '/invocar aragorn', desc: 'Invoca a Aragorn' },
  { cmd: '/invocar legolas', desc: 'Invoca a Legolas' },
  { cmd: '/modo explorar', desc: 'Modo exploración libre' },
  { cmd: '/nazgul 1', desc: 'Spawna 1 Nazgûl' },
  { cmd: '/nazgul 3', desc: 'Spawna 3 Nazgûl' },
  { cmd: '/tienda', desc: 'Ver productos del comerciante' },
  { cmd: '/comprar lembas', desc: 'Comprar item al comerciante' },
]

// ============ TYPES ============
type TileType = 'grass' | 'path' | 'tree' | 'flower' | 'yard' | 'door' | 'mill'
type Tile = { type: TileType; variant?: number }
type Dir = 'down' | 'up' | 'left' | 'right'
type GameMode = 'exploration' | 'horde'
type TermContext = 'exploration' | 'combat' | 'interaction' | 'dialog'

interface DroppedItem {
  x: number
  y: number
  item: string
  bouncePhase: number
  amount?: number
}

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
  state: 'hunt' | 'chase_player' | 'flee_gandalf' | 'confused' | 'dying'
  dir: Dir
  frame: number
  atkT: number
  poweredUp: number
  invT: number
  deathFrame: number
  waveNum: number
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
  rayTarget: { x: number; y: number } | null
  rayFrames: number
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
  gold: number
  ringActive: number
  ringShimmer: number
  invT: number
  atkCd: number
  sweepAnim: number
  sweepAngle: number
  deathFrame: number
  daggerAnim: number
  daggerAngle: number
  staffRayAnim: number
  staffRayTarget: { x: number; y: number } | null
  xp: number
  level: number
  weaponSlot: 'main' | 'secondary'
}

interface Merchant {
  id: string
  x: number
  y: number
  dir: Dir
  frame: number
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
  maxLife: number
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
  nazgulList: Nazgul[]
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
  termInput: string
  modMenuOpen: boolean
  frameCount: number
  logs: { type: string; msg: string; time: string }[]
  gameMode: GameMode
  heroMode: boolean
  wave: number
  waveDelay: number
  droppedItems: DroppedItem[]
  screenFlash: number
  groundMarks: { x: number; y: number; alpha: number }[]
  gamePaused: boolean
  merchants: Merchant[]
  activeMerchant: string | null
}

const SOLID = new Set<TileType>(['tree', 'mill'])

const SHOPS: Record<string, { name: string; icon: string; color: string; items: { id: string; name: string; icon: string; price: number; type: 'weapon'|'armor'|'food'|'potion' }[] }> = {
  herrero: {
    name: 'Herrero Bolger', icon: '⚒️', color: '#8a6030',
    items: [
      { id: 'espada', name: 'Espada', icon: '⚔️', price: 30, type: 'weapon' },
      { id: 'hacha', name: 'Hacha', icon: '🪓', price: 35, type: 'weapon' },
      { id: 'armadura', name: 'Armadura', icon: '🛡️', price: 50, type: 'armor' },
    ]
  },
  ropero: {
    name: 'Ropero Took', icon: '👔', color: '#6060a0',
    items: [
      { id: 'capa_viaje', name: 'Capa viajero', icon: '🧥', price: 20, type: 'armor' },
      { id: 'botas', name: 'Botas élf.', icon: '👢', price: 25, type: 'armor' },
      { id: 'capucha', name: 'Capucha', icon: '🎩', price: 15, type: 'armor' },
    ]
  },
  almacenero: {
    name: 'Sam Gamyi', icon: '🌾', color: '#508030',
    items: [
      { id: 'lembas', name: 'Lembas', icon: '🍞', price: 8, type: 'food' },
      { id: 'manzana', name: 'Manzana', icon: '🍎', price: 3, type: 'food' },
      { id: 'jarron_miel', name: 'Miel', icon: '🍯', price: 12, type: 'food' },
    ]
  },
  boticario: {
    name: 'Boticar. Brandy', icon: '⚗️', color: '#208060',
    items: [
      { id: 'miruvor', name: 'Miruvor', icon: '🧴', price: 20, type: 'potion' },
      { id: 'antidoto', name: 'Antídoto', icon: '💊', price: 15, type: 'potion' },
      { id: 'elixir', name: 'Elixir hp', icon: '🧪', price: 40, type: 'potion' },
    ]
  },
}

const XP_TABLE = [0, 50, 120, 220, 360, 550, 800, 1120, 1520, 2020]
const XP_REWARDS = { nazgul: 30, villager_saved: 10 }

export default function GamePage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const minimapRef = useRef<HTMLCanvasElement>(null)
  const S = useRef<GameState | null>(null)
  const animRef = useRef<number>(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const [screen, setScreen] = useState<'charsel' | 'game' | 'dead' | 'gameover' | 'win'>('charsel')
  const [selectedChar, setSelectedChar] = useState<string | null>(null)
  const [selectedMode, setSelectedMode] = useState<GameMode>('horde')
  const [, forceUpdate] = useState(0)
  const [isCompact, setIsCompact] = useState(false)

  const log = useCallback((type: string, msg: string) => {
    if (!S.current) return
    const now = new Date()
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    S.current.logs.push({ type, msg, time })
    if (S.current.logs.length > 80) S.current.logs.shift()
    setTimeout(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
    }, 10)
  }, [])

  const notify = useCallback((text: string, color: string) => {
    if (!S.current) return
    S.current.fade = { text, color, life: 90 }
  }, [])

  const buildMap = useCallback(() => {
    const map: Tile[][] = []
    for (let y = 0; y < WH; y++) {
      map[y] = []
      for (let x = 0; x < WW; x++) {
        const variant = (x + y) % 2
        let type: TileType = 'grass'
        if (y === 38 || y === 39) type = 'path'
        if ([12, 25, 40, 55, 70, 85].includes(x) && y >= 15 && y <= 60) type = 'path'
        if (type === 'grass') {
          const r = Math.random()
          if (r < 0.02) type = 'tree'
          else if (r < 0.035) type = 'flower'
        }
        map[y][x] = { type, variant }
      }
    }

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
      let py = ty
      const targetY = ty < 38 ? 38 : 39
      while (py !== targetY && py >= 0 && py < WH) {
        if (map[py][tx].type !== 'door') map[py][tx] = { type: 'path' }
        py += py < targetY ? 1 : -1
      }
    }

    HOLES.forEach(h => placeHole(h.tx, h.ty))

    const millX = 45, millY = 31
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = millX + dx, ny = millY + dy
        if (nx >= 0 && nx < WW && ny >= 0 && ny < WH) {
          map[ny][nx] = { type: dx === 0 && dy === 0 ? 'mill' : 'yard' }
        }
      }
    }

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

  const createNazgul = useCallback((waveNum: number = 1): Nazgul => {
    const baseSpd = 0.7
    const baseHp = 20
    const spdBonus = (waveNum - 1) * 0.1
    const hpBonus = (waveNum - 1) * 2
    return {
      x: (WW - 3) * T,
      y: 38 * T,
      hp: baseHp + hpBonus,
      maxhp: baseHp + hpBonus,
      spd: baseSpd + spdBonus,
      dmg: 4,
      state: 'hunt',
      dir: 'left',
      frame: 0,
      atkT: 0,
      poweredUp: 0,
      invT: 0,
      deathFrame: 0,
      waveNum,
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
      rayTarget: null,
      rayFrames: 0,
    }
  }, [])

  const startGame = useCallback((charKey: string, mode: GameMode) => {
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
        gold: 0,
        ringActive: 0,
        ringShimmer: 0,
        invT: 0,
        atkCd: 0,
        sweepAnim: 0,
        sweepAngle: 0,
        deathFrame: 0,
        daggerAnim: 0,
        daggerAngle: 0,
        staffRayAnim: 0,
        staffRayTarget: null,
        xp: 0,
        level: 1,
        weaponSlot: 'main',
      },
      cam: { x: startX - 200, y: startY - 200 },
      villagers: spawnVillagers(),
      nazgul: null,
      nazgulList: [],
      gandalfAlly: spawnGandalfAlly(),
      invNaz: false,
      invTimer: mode === 'exploration' ? 999999 : 360,
      invWarned: false,
      keys: new Set(),
      ePrev: false,
      fx: [],
      parts: [],
      fade: null,
      dlg: { active: false, speaker: '', lines: [], lineIdx: 0, opts: [] },
      joy: { active: false, dx: 0, dy: 0 },
      gameActive: true,
      termOpen: true,
      termInput: '',
      modMenuOpen: false,
      frameCount: 0,
      logs: [],
      gameMode: mode,
      heroMode: false,
      wave: 0,
      waveDelay: 0,
      droppedItems: [],
      screenFlash: 0,
      groundMarks: [],
      gamePaused: false,
      merchants: [
        { id: 'herrero',    x: 45 * T, y: 28 * T, dir: 'down', frame: 0 },
        { id: 'ropero',     x: 55 * T, y: 28 * T, dir: 'down', frame: 0 },
        { id: 'almacenero', x: 45 * T, y: 44 * T, dir: 'down', frame: 0 },
        { id: 'boticario',  x: 55 * T, y: 44 * T, dir: 'down', frame: 0 },
      ],
      activeMerchant: null,
    }

    if (mode === 'exploration') {
      log('s', 'Modo Exploración. Usa /nazgul para invocar enemigos.')
    } else {
      log('s', 'Modo Horda. Sobrevive 10 oleadas.')
    }
    log('i', 'Bienvenido a Hobbiton. Protege a los aldeanos.')
    setScreen('game')
  }, [buildMap, spawnVillagers, spawnGandalfAlly, log])

  const revive = useCallback(() => {
    if (!S.current || !S.current.p) return
    S.current.p.hp = S.current.p.maxhp
    S.current.p.invT = 120
    S.current.p.deathFrame = 0
    S.current.gameActive = true
    log('s', 'Has renacido. ¡Continúa la lucha!')
    setScreen('game')
  }, [log])

  const restartFromSelect = useCallback(() => {
    S.current = null
    setSelectedChar(null)
    setScreen('charsel')
  }, [])

  const getNearbyItem = useCallback(() => {
    if (!S.current?.p) return null
    const p = S.current.p
    return S.current.droppedItems.find(di => {
      const dx = di.x - p.x, dy = di.y - p.y
      return Math.sqrt(dx*dx + dy*dy) < T * 2.5
    }) || null
  }, [])

  const getTermContext = useCallback((): TermContext => {
    if (!S.current || !S.current.p) return 'exploration'
    if (S.current.dlg.active) return 'dialog'

    const p = S.current.p
    const naz = S.current.nazgul

    if (naz && naz.hp > 0 && naz.state !== 'dying') {
      const dx = naz.x - p.x, dy = naz.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 12 * T) return 'combat'
    }

    for (const v of S.current.villagers) {
      if (v.state === 'captured') continue
      const dx = v.x - p.x, dy = v.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 2 * T) return 'interaction'
    }

    const g = S.current.gandalfAlly
    if (g && !g.talked) {
      const dx = g.x - p.x, dy = g.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 2.5 * T) return 'interaction'
    }

    return 'exploration'
  }, [])

  const executeCommand = useCallback((cmd: string) => {
    if (!S.current) return
    const st = S.current

    if (cmd === '/horda') {
      st.gameMode = 'horde'
      st.wave = 0
      st.waveDelay = 60
      log('s', 'Modo Horda activado.')
      notify('MODO HORDA', '#e24b4a')
    } else if (cmd === '/heroe') {
      st.heroMode = !st.heroMode
      log('s', st.heroMode ? 'Modo Héroe ON - Inmortal' : 'Modo Héroe OFF')
      notify(st.heroMode ? 'INMORTAL' : 'MORTAL', '#c8a84b')
    } else if (cmd.startsWith('/arma ')) {
      const tipo = cmd.replace('/arma ', '')
      const item = tipo === 'espada' ? 'espada' : tipo === 'baculo' ? 'baston' : 'espada_rota'
      if (st.p) {
        st.droppedItems.push({
          x: st.p.x + (Math.random() - 0.5) * T,
          y: st.p.y + (Math.random() - 0.5) * T,
          item,
          bouncePhase: 0,
        })
        log('s', `Arma dropeada: ${item}`)
      }
    } else if (cmd === '/modo explorar') {
      st.gameMode = 'exploration'
      st.nazgul = null
      st.nazgulList = []
      log('s', 'Modo Exploración activado.')
      notify('EXPLORACIÓN', '#5a8a3a')
    } else if (cmd.startsWith('/nazgul ')) {
      const n = parseInt(cmd.replace('/nazgul ', '')) || 1
      for (let i = 0; i < n; i++) {
        const naz = createNazgul(st.wave + 1)
        naz.x = (WW - 3 - i * 2) * T
        st.nazgulList.push(naz)
        if (!st.nazgul) st.nazgul = naz
      }
      log('d', `¡${n} NAZGÛL INVOCADOS!`)
      notify('⚠ NAZGÛL', '#e24b4a')
    } else if (cmd.startsWith('/invocar ')) {
      const name = cmd.replace('/invocar ', '')
      log('s', `Invocando a ${name}... (próximamente)`)
    } else if (cmd.startsWith('/comprar ')) {
      const itemId = cmd.replace('/comprar ', '').trim()
      const merchant = st.activeMerchant ? SHOPS[st.activeMerchant] : null
      if (!merchant) { log('d', 'No hay comerciante cerca. Acércate y habla primero.'); }
      else {
        const item = merchant.items.find(i => i.id === itemId)
        if (!item) { log('d', `${merchant.name} no vende eso.`); }
        else if ((st.p?.gold ?? 0) < item.price) { log('d', `No tenés MC suficiente. Necesitás ${item.price} MC.`); }
        else if (st.p) {
          st.p.gold -= item.price
          st.p.inv.push(item.id)
          log('s', `Compraste ${item.icon} ${item.name} por ${item.price} MC.`)
          notify(`${item.icon} comprado`, '#c8a84b')
        }
      }
    } else if (cmd.startsWith('/tienda')) {
      const merchant = st.activeMerchant ? SHOPS[st.activeMerchant] : null
      if (!merchant) { log('d', 'Acércate a un comerciante primero.'); }
      else {
        log('e', `=== ${merchant.name} ${merchant.icon} ===`)
        merchant.items.forEach(item => log('i', `${item.icon} ${item.name} — ${item.price} MC  /comprar ${item.id}`))
      }
    }

    st.termInput = ''
    st.modMenuOpen = false
    forceUpdate(n => n + 1)
  }, [log, notify, createNazgul])

  const openGandalfDlg = useCallback(() => {
    if (!S.current || !S.current.gandalfAlly || !S.current.p) return
    const pName = CHARS[S.current.p.char].name
    log('e', `GANDALF: El Nazgul acecha, ${pName}.`)
    log('e', `GANDALF: Quedate cerca de mi.`)
    S.current.dlg = {
      active: true,
      speaker: 'GANDALF',
      lines: [],
      lineIdx: 0,
      opts: [{ l: 'Gracias, Gandalf.', action: 'close' }],
    }
    S.current.gandalfAlly.talked = true
    forceUpdate(n => n + 1)
  }, [log])

  const openVillagerDlg = useCallback((v: Villager) => {
    if (!S.current) return
    log('e', `${v.name.toUpperCase()}: ¡Hola! Soy ${v.name}.`)
    if (v.items.length > 0) {
      log('e', `${v.name.toUpperCase()}: Tengo algo para vos...`)
    } else {
      log('e', `${v.name.toUpperCase()}: Ten cuidado por ahí.`)
    }
    const opts: { l: string; action?: string }[] = []
    if (v.items.length > 0) {
      opts.push({ l: `Recibir ${ITEMS[v.items[0]]?.icon || '?'}`, action: 'give_item' })
    }
    opts.push({ l: 'Quédate en casa', action: 'stay_home' })
    opts.push({ l: 'Adiós', action: 'close' })

    S.current.dlg = {
      active: true,
      speaker: v.name.toUpperCase(),
      lines: [],
      lineIdx: 0,
      opts,
      target: v,
    }
    forceUpdate(n => n + 1)
  }, [log])

  const advanceDlg = useCallback(() => {
    if (!S.current || !S.current.dlg.active) return
    const dlg = S.current.dlg
    if (dlg.lineIdx < dlg.lines.length - 1) {
      dlg.lineIdx++
      forceUpdate(n => n + 1)
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
        S.current.droppedItems.push({ x: S.current.p.x + (Math.random()-0.5)*T*2, y: S.current.p.y - T, item, bouncePhase: 0 })
        log('e', `${v.name} deja ${ITEMS[item]?.icon || item} en el piso.`)
        notify(`${ITEMS[item]?.icon || item} en el suelo`, '#c8a84b')
      }
      dlg.active = false
    } else if (opt.action === 'stay_home' && dlg.target) {
      dlg.target.state = 'walk'
      dlg.target.patrolIdx = 0
      dlg.target.patrol = [{ x: dlg.target.homeX, y: dlg.target.homeY }]
      log('i', `${dlg.target.name} se queda cerca de casa.`)
      dlg.active = false
    }
    forceUpdate(n => n + 1)
  }, [log, notify])

  const closeDlg = useCallback(() => {
    if (!S.current) return
    S.current.dlg.active = false
    forceUpdate(n => n + 1)
  }, [])

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
      p.ringShimmer = 300
      log('e', '¡El Anillo te hace invisible!')
      notify('💍 INVISIBLE', '#c8a84b')
      if (S.current.nazgul && S.current.nazgul.hp > 0) {
        S.current.nazgul.state = 'confused'
      }
      for (const naz of S.current.nazgulList) {
        if (naz.hp > 0) naz.state = 'confused'
      }
    } else if (item === 'miruvor') {
      p.hp = p.maxhp
      p.inv.splice(idx, 1)
      log('s', 'Bebes miruvor. HP restaurado.')
      notify('HP FULL', '#5a6a3a')
    } else if (item === 'espada' || item === 'baston') {
      notify('Pasiva activa', '#c8a84b')
    }
  }, [log, notify])

  const useRing = useCallback(() => {
    if (!S.current || !S.current.p) return
    const p = S.current.p
    const ringIdx = p.inv.indexOf('anillo')
    if (ringIdx !== -1) {
      useItem(ringIdx)
    }
  }, [useItem])

  const doSwapWeapon = useCallback(() => {
    if (!S.current?.p) return
    const p = S.current.p
    p.weaponSlot = p.weaponSlot === 'main' ? 'secondary' : 'main'
    const w = WEAPONS[p.char]?.[p.weaponSlot]
    if (w) notify(`${w.icon} ${w.label}`, '#c8a84b')
    forceUpdate(n => n + 1)
  }, [])

  const doAttack = useCallback(() => {
    if (!S.current || !S.current.p || S.current.dlg.active) return
    const p = S.current.p
    if (p.atkCd > 0) return
    const activeWeapon = WEAPONS[p.char]?.[p.weaponSlot]
    const weaponDmgMult = activeWeapon?.dmgMult ?? 1
    const weaponRangeMult = activeWeapon?.rangeMult ?? 1

    const dirAngles: Record<Dir, number> = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }

    if (p.char === 'aragorn') {
      p.atkCd = 28
      p.sweepAnim = 20
      p.sweepAngle = dirAngles[p.dir]

      for (let i = 0; i < 10; i++) {
        const angle = p.sweepAngle - Math.PI / 3 + (Math.PI * 2 / 3) * (i / 10)
        S.current.parts.push({
          x: p.x + Math.cos(angle) * T * 2,
          y: p.y + Math.sin(angle) * T * 2,
          vx: Math.cos(angle) * 1.5,
          vy: Math.sin(angle) * 1.5,
          color: '#c8a84b',
          life: 15,
          maxLife: 15,
        })
      }
    } else if (p.char === 'frodo') {
      p.atkCd = 50
      p.daggerAnim = 14
      p.daggerAngle = dirAngles[p.dir]

      for (let i = 0; i < 6; i++) {
        const angle = p.daggerAngle - Math.PI / 4 + (Math.PI / 2) * (i / 6)
        S.current.parts.push({
          x: p.x + Math.cos(angle) * T * 1.5,
          y: p.y + Math.sin(angle) * T * 1.5,
          vx: Math.cos(angle) * 1.2,
          vy: Math.sin(angle) * 1.2,
          color: '#b4d2ff',
          life: 12,
          maxLife: 12,
        })
      }
    } else if (p.char === 'gandalf') {
      p.atkCd = 90
      p.staffRayAnim = 12

      const naz = S.current.nazgul
      if (naz && naz.hp > 0 && naz.state !== 'dying') {
        const dx = naz.x - p.x, dy = naz.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const angleToNaz = Math.atan2(dy, dx)
        const playerAngle = dirAngles[p.dir]
        const angleDiff = Math.abs(Math.atan2(Math.sin(angleToNaz - playerAngle), Math.cos(angleToNaz - playerAngle)))

        if (dist < 3.5 * T && angleDiff < Math.PI / 6) {
          p.staffRayTarget = { x: naz.x, y: naz.y }
          naz.hp -= p.dmg
          naz.invT = 10

          const knockDist = 2 * T
          if (dist > 0) {
            naz.x += (dx / dist) * knockDist
            naz.y += (dy / dist) * knockDist
            naz.x = Math.max(T, Math.min((WW - 1) * T, naz.x))
            naz.y = Math.max(T, Math.min((WH - 1) * T, naz.y))
          }

          S.current.fx.push({
            x: naz.x,
            y: naz.y - 20,
            text: `-${p.dmg}`,
            color: '#ffffd0',
            vy: -1.1,
            life: 40,
          })
          log('d', `¡Destello del báculo! -${p.dmg} HP al Nazgûl. (${Math.max(0, naz.hp)}/${naz.maxhp})`)

          for (let i = 0; i < 6; i++) {
            S.current.parts.push({
              x: naz.x,
              y: naz.y,
              vx: (Math.random() - 0.5) * 3,
              vy: (Math.random() - 0.5) * 3,
              color: '#c8a84b',
              life: 15,
              maxLife: 15,
            })
          }

          if (naz.hp <= 0) {
            naz.state = 'dying'
            naz.deathFrame = 0
          }
          return
        }
      }
      p.staffRayTarget = {
        x: p.x + Math.cos(dirAngles[p.dir]) * 3.5 * T,
        y: p.y + Math.sin(dirAngles[p.dir]) * 3.5 * T
      }
      return
    }

    // Legolas: disparo de flecha a distancia con partículas doradas
    if (p.char === 'legolas') {
      p.atkCd = 35
      p.daggerAnim = 12
      p.daggerAngle = dirAngles[p.dir]
      for (let i = 0; i < 5; i++) {
        const angle = p.daggerAngle + (Math.random() - 0.5) * 0.2
        S.current.parts.push({
          x: p.x + Math.cos(angle) * T,
          y: p.y + Math.sin(angle) * T,
          vx: Math.cos(angle) * 4,
          vy: Math.sin(angle) * 4,
          color: '#d4a820',
          life: 10, maxLife: 10,
        })
      }
    }
    // Gimli: golpe de hacha en área pequeña, más daño
    if (p.char === 'gimli') {
      p.atkCd = 40
      p.sweepAnim = 18
      p.sweepAngle = dirAngles[p.dir]
      for (let i = 0; i < 8; i++) {
        const angle = p.sweepAngle - Math.PI / 4 + (Math.PI / 2) * (i / 8)
        S.current.parts.push({
          x: p.x + Math.cos(angle) * T * 1.6,
          y: p.y + Math.sin(angle) * T * 1.6,
          vx: Math.cos(angle) * 2,
          vy: Math.sin(angle) * 2,
          color: '#9a9aaa',
          life: 14, maxLife: 14,
        })
      }
    }

    const allNaz = S.current.nazgul ? [S.current.nazgul, ...S.current.nazgulList.filter(n => n !== S.current!.nazgul)] : S.current.nazgulList

    for (const naz of allNaz) {
      if (!naz || naz.hp <= 0 || naz.state === 'dying') continue
      const dx = naz.x - p.x, dy = naz.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      let effectiveRange = p.range * weaponRangeMult
      if (p.char === 'aragorn' && p.weaponSlot === 'main') effectiveRange = p.range * 1.2
      if (p.char === 'frodo' && p.weaponSlot === 'main') effectiveRange = 1.8
      if (p.char === 'legolas') effectiveRange = p.weaponSlot === 'main' ? 5.0 : 1.8
      if (p.char === 'gimli') effectiveRange = p.weaponSlot === 'main' ? 1.6 : 1.2

      if (dist < effectiveRange * T) {
        const baseDmg = p.char === 'frodo' ? 6 : p.char === 'gimli' ? p.dmg + 3 : p.dmg
        const dmg = Math.max(1, Math.round(baseDmg * weaponDmgMult))
        naz.hp -= dmg
        naz.invT = 10
        S.current.fx.push({
          x: naz.x,
          y: naz.y - 20,
          text: `-${dmg}`,
          color: p.char === 'frodo' ? '#b4d2ff' : '#e24b4a',
          vy: -1.1,
          life: 40,
        })
        log('d', `¡Atacas al Nazgûl! -${dmg} HP. (${Math.max(0, naz.hp)}/${naz.maxhp})`)

        if (naz.hp <= 0) {
          naz.state = 'dying'
          naz.deathFrame = 0
          const goldDrop = 5 + naz.waveNum * 2
          S.current.droppedItems.push({ x: naz.x + (Math.random()-0.5)*T, y: naz.y + (Math.random()-0.5)*T, item: 'gold', bouncePhase: 0, amount: goldDrop })
          S.current.fx.push({ x: naz.x, y: naz.y - 20, text: `💰 ${goldDrop} MC`, color: '#c8a84b', vy: -1.2, life: 50 })
          log('e', '¡El Nazgûl cae!')
          log('s', `💰 ${goldDrop} MC en el piso — ¡recógelos!`)
        }
      }
    }
  }, [log])

  const tryInteract = useCallback(() => {
    if (!S.current || !S.current.p) return
    const p = S.current.p

    // Detectar merchant cercano
    for (const m of S.current.merchants) {
      const dx = m.x - p.x, dy = m.y - p.y
      if (Math.sqrt(dx*dx + dy*dy) < 2.5 * T) {
        S.current.activeMerchant = m.id
        const shop = SHOPS[m.id]
        log('e', `${shop.icon} ${shop.name}: ¡Bienvenido! Escribí /tienda para ver mis productos.`)
        return
      }
    }

    const g = S.current.gandalfAlly
    if (g && !g.talked) {
      const dx = g.x - p.x, dy = g.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 2.5 * T) {
        openGandalfDlg()
        return
      }
    }

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

  const pickupNearbyItem = useCallback(() => {
    if (!S.current?.p) return
    const nearby = getNearbyItem()
    if (!nearby) { tryInteract(); return }
    const idx = S.current.droppedItems.indexOf(nearby)
    if (idx < 0) return
    if (nearby.item === 'gold') {
      const amt = nearby.amount || 5
      S.current.p.gold += amt
      log('s', `Recoges 💰 ${amt} MC. Total: ${S.current.p.gold} MC`)
      notify(`+💰 ${amt} MC`, '#c8a84b')
    } else {
      S.current.p.inv.push(nearby.item)
      log('s', `Recoges ${ITEMS[nearby.item]?.icon || nearby.item}`)
      notify(`+${ITEMS[nearby.item]?.icon || '?'}`, '#c8a84b')
    }
    S.current.droppedItems.splice(idx, 1)
    forceUpdate(n => n + 1)
  }, [getNearbyItem, tryInteract, log, notify])

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
    if (Math.abs(dx) > Math.abs(dy)) {
      entity.dir = dx > 0 ? 'right' : 'left'
    } else {
      entity.dir = dy > 0 ? 'down' : 'up'
    }
    return false
  }, [isSolid])

  const update = useCallback(() => {
    if (!S.current || !S.current.p || !S.current.gameActive || S.current.gamePaused) return
    const st = S.current
    const p = st.p!
    st.frameCount++

    if (st.screenFlash > 0) st.screenFlash--

    if (p.invT > 0) p.invT--
    if (p.atkCd > 0) p.atkCd--
    if (p.ringActive > 0) p.ringActive--
    if (p.ringShimmer > 0) p.ringShimmer--
    if (p.sweepAnim > 0) p.sweepAnim--
    if (p.daggerAnim > 0) p.daggerAnim--
    if (p.staffRayAnim > 0) p.staffRayAnim--

    if (st.frameCount === 180 && st.gameMode === 'horde') {
      log('i', 'Habla con Gandalf antes de que llegue el Nazgûl.')
    }
    if (st.frameCount === 300 && st.gameMode === 'horde') {
      log('d', 'Se escuchan cascos en la distancia...')
      st.invWarned = true
    }

    if (st.gameMode === 'horde') {
      st.invTimer--
      if (st.invTimer <= 0 && !st.nazgul) {
        st.wave = 1
        st.nazgul = createNazgul(1)
        st.invNaz = true
        log('d', '¡OLEADA 1 - UN NAZGÛL HA ENTRADO EN HOBBITON!')
        notify('⚠ OLEADA 1', '#e24b4a')
      }

      if (st.waveDelay > 0) {
        st.waveDelay--
        if (st.waveDelay === 60) {
          log('d', '¡Se acerca otra oleada!')
        }
        if (st.waveDelay === 0 && st.wave < 10) {
          st.wave++
          const count = st.wave
          for (let i = 0; i < count; i++) {
            const newNaz = createNazgul(st.wave)
            newNaz.x = (WW - 3 - i * 3) * T
            newNaz.y = (36 + (i % 3) * 2) * T
            st.nazgulList.push(newNaz)
            if (!st.nazgul) st.nazgul = newNaz
          }
          log('d', `¡OLEADA ${st.wave} — ${count} NAZGÛL!`)
          notify(`⚠ OLEADA ${st.wave} ×${count}`, '#e24b4a')
        }
      }
    }

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

    st.droppedItems = st.droppedItems.filter(di => {
      di.bouncePhase += 0.1
      return true
    })

    const canvas = canvasRef.current
    if (canvas) {
      const targetCamX = p.x - canvas.width / 2
      const targetCamY = p.y - canvas.height / 2
      st.cam.x += (targetCamX - st.cam.x) * 0.1
      st.cam.y += (targetCamY - st.cam.y) * 0.1
      st.cam.x = Math.max(0, Math.min(WW * T - canvas.width, st.cam.x))
      st.cam.y = Math.max(0, Math.min(WH * T - canvas.height, st.cam.y))
    }

    const naz = st.nazgul
    for (const v of st.villagers) {
      if (v.state === 'captured') continue

      if (naz && naz.hp > 0 && naz.state !== 'dying') {
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
        const fdx = v.x - naz.x, fdy = v.y - naz.y
        const fdist = Math.sqrt(fdx * fdx + fdy * fdy)
        if (fdist > 0) {
          const vnx = v.x + (fdx / fdist) * 1.2
          const vny = v.y + (fdy / fdist) * 1.2
          if (!isSolid(vnx, v.y) && vnx > T && vnx < (WW - 1) * T) v.x = vnx
          if (!isSolid(v.x, vny) && vny > T && vny < (WH - 1) * T) v.y = vny
          v.frame++
          if (Math.abs(fdx) > Math.abs(fdy)) {
            v.dir = fdx > 0 ? 'right' : 'left'
          } else {
            v.dir = fdy > 0 ? 'down' : 'up'
          }
        }
      } else if (v.state === 'walk') {
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

    const g = st.gandalfAlly
    if (g) {
      if (g.shieldActive > 0) g.shieldActive--
      if (g.attackCooldown > 0) g.attackCooldown--
      if (g.rayFrames > 0) g.rayFrames--

      const gpdx = p.x - g.x, gpdy = p.y - g.y
      const gpDist = Math.sqrt(gpdx * gpdx + gpdy * gpdy)

      if (naz && naz.hp > 0 && naz.state !== 'dying' && g.attackCooldown === 0) {
        const gndx = naz.x - g.x, gndy = naz.y - g.y
        const gnDist = Math.sqrt(gndx * gndx + gndy * gndy)

        if (gpDist < 4 * T && gnDist < 6 * T) {
          g.shieldActive = 120
          g.attackCooldown = 180
          g.state = 'alert'
          g.rayTarget = { x: naz.x, y: naz.y }
          g.rayFrames = 8

          naz.hp -= 8
          st.fx.push({
            x: naz.x,
            y: naz.y - 20,
            text: '-8',
            color: '#e8e0a0',
            vy: -1.1,
            life: 40,
          })

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
            naz.state = 'dying'
            naz.deathFrame = 0
          }
        }
      }

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

    const seen = new Set()
      const allNazgul = [
        ...(st.nazgul ? [st.nazgul] : []),
        ...st.nazgulList.filter(n => n !== st.nazgul)
      ].filter(n => {
        if (seen.has(n)) return false
        seen.add(n)
        return true
      })
    for (const naz of allNazgul) {
      if (!naz) continue

      if (naz.hp <= 0 && naz.state !== 'dying') {
        naz.state = 'dying'
        naz.deathFrame = 0
        log('e', '¡El Nazgûl se desvanece en las sombras!')
      }

      if (naz.state === 'dying') {
        naz.deathFrame++

        if (naz.deathFrame === 1) {
          st.screenFlash = 6
        }
        if (naz.deathFrame === 15) {
          for (let i = 0; i < 12; i++) {
            st.parts.push({
              x: naz.x,
              y: naz.y,
              vx: (Math.random() - 0.5) * 5,
              vy: (Math.random() - 0.5) * 5,
              color: Math.random() > 0.5 ? '#1a0a20' : '#3a3a3a',
              life: 50,
              maxLife: 50,
            })
          }
        }
        if (naz.deathFrame === 80) {
          st.groundMarks.push({ x: naz.x, y: naz.y, alpha: 0.6 })
          if (st.p) {
            st.p.xp += XP_REWARDS.nazgul
            const nextLvl = st.p.level
            if (nextLvl < XP_TABLE.length && st.p.xp >= XP_TABLE[nextLvl]) {
              st.p.level++
              st.p.maxhp += 1
              st.p.hp = Math.min(st.p.hp + 1, st.p.maxhp)
              st.p.dmg += 1
              log('e', `¡NIVEL ${st.p.level}! +1 HP máx, +1 DMG`)
              notify(`⭐ NIVEL ${st.p.level}`, '#c8a84b')
            }
          }
          const drops = ['lembas', 'miruvor']
          const numDrops = 1 + Math.floor(Math.random() * 2)
          for (let i = 0; i < numDrops; i++) {
            st.droppedItems.push({
              x: naz.x + (Math.random() - 0.5) * T * 2,
              y: naz.y + (Math.random() - 0.5) * T * 2,
              item: drops[Math.floor(Math.random() * drops.length)],
              bouncePhase: Math.random() * Math.PI * 2,
            })
          }
        }
        if (naz.deathFrame >= 90) {
          if (st.nazgul === naz) {
            st.nazgul = null
          }
          st.nazgulList = st.nazgulList.filter(n => n !== naz)

          const allDead = !st.nazgul && st.nazgulList.filter(n => n.state !== 'dying' && n.hp > 0).length === 0
              if (allDead) {
            if (st.gameMode === 'horde' && st.wave < 10) {
              st.waveDelay = 180
              log('s', `Oleada ${st.wave} completada. Prepárate para la siguiente...`)
            } else {
              const saved = st.villagers.filter(v => v.state !== 'captured').length
              log('e', `¡VICTORIA! Aldeanos salvados: ${saved}/8`)
              setTimeout(() => {
                st.gameActive = false
                setScreen('win')
              }, 1500)
            }
          }
        }
        continue
      }

      if (naz.hp <= 0) continue

      if (naz.atkT > 0) naz.atkT--
      if (naz.invT > 0) naz.invT--
      naz.frame++

      if (naz.state === 'confused') {
        if (p.ringActive === 0) {
          naz.state = 'hunt'
        } else {
          const randAngle = Math.random() * Math.PI * 2
          naz.x += Math.cos(randAngle) * naz.spd * 0.5
          naz.y += Math.sin(randAngle) * naz.spd * 0.5
          naz.x = Math.max(T, Math.min((WW - 1) * T, naz.x))
          naz.y = Math.max(T, Math.min((WH - 1) * T, naz.y))
          continue
        }
      }

      if (g) {
        const gndx = g.x - naz.x, gndy = g.y - naz.y
        const gnDist = Math.sqrt(gndx * gndx + gndy * gndy)
        if (gnDist < 3 * T) {
          naz.state = 'flee_gandalf'
        } else if (naz.state === 'flee_gandalf' && gnDist > 8 * T) {
          naz.state = 'hunt'
        }
      }

      if (naz.state !== 'flee_gandalf' && p.ringActive === 0) {
        const pndx = p.x - naz.x, pndy = p.y - naz.y
        const pnDist = Math.sqrt(pndx * pndx + pndy * pndy)
        if (pnDist < 12 * T) {
          naz.state = 'chase_player'
        }
      } else if (p.ringActive > 0 && naz.state === 'chase_player') {
        naz.state = 'confused'
      }

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

        const pndx = p.x - naz.x, pndy = p.y - naz.y
        const pnDist = Math.sqrt(pndx * pndx + pndy * pndy)
        if (pnDist < T * 1.0 && p.invT === 0 && naz.atkT === 0 && p.ringActive === 0) {
          if (!st.heroMode) {
            p.hp -= naz.dmg
          }
          p.invT = 60
          naz.atkT = 60
          st.fx.push({
            x: p.x,
            y: p.y - 20,
            text: st.heroMode ? 'INMUNE' : `-${naz.dmg}`,
            color: st.heroMode ? '#c8a84b' : '#e24b4a',
            vy: -1.1,
            life: 40,
          })
          if (!st.heroMode) {
            log('d', `¡El Nazgûl te ataca! -${naz.dmg} HP. (${Math.max(0, p.hp)}/${p.maxhp})`)
          }

          if (p.hp <= 0 && !st.heroMode) {
            p.deathFrame = 1
          }
        }
      } else {
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
              naz.spd = Math.min(1.8, naz.spd + 0.25)
              naz.hp = Math.min(naz.maxhp + naz.poweredUp * 3, naz.hp + 3)

              for (let i = 0; i < 6; i++) {
                st.parts.push({
                  x: closest.x,
                  y: closest.y,
                  vx: (Math.random() - 0.5) * 3,
                  vy: (Math.random() - 0.5) * 3,
                  color: '#5a1010',
                  life: 30,
                  maxLife: 30,
                })
              }

              log('d', `${closest.name} ha caído. El Nazgûl se vuelve más poderoso (${naz.poweredUp} almas).`)

              const remaining = st.villagers.filter(v => v.state !== 'captured').length
              if (remaining === 0) {
                st.gameActive = false
                setScreen('gameover')
              }
            }
          }
        } else {
          moveToward(naz, p.x, p.y, naz.spd * 0.8)
        }
      }
    }

    if (p.deathFrame > 0) {
      p.deathFrame++
      if (p.deathFrame <= 30) {
      }
      if (p.deathFrame === 30) {
        for (let i = 0; i < 12; i++) {
          st.parts.push({
            x: p.x,
            y: p.y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            color: Math.random() > 0.5 ? '#c82020' : '#c8a84b',
            life: 40,
            maxLife: 40,
          })
        }
      }
      if (p.deathFrame >= 150) {
        st.gameActive = false
        setScreen('dead')
      }
    }

    st.fx = st.fx.filter(f => {
      f.y += f.vy
      f.life--
      return f.life > 0
    })

    st.parts = st.parts.filter(pt => {
      pt.x += pt.vx
      pt.y += pt.vy
      pt.life--
      return pt.life > 0
    })

    st.groundMarks = st.groundMarks.filter(gm => {
      gm.alpha -= 0.001
      return gm.alpha > 0
    })

    if (st.fade && st.fade.life > 0) {
      st.fade.life--
    }
  }, [isSolid, moveToward, createNazgul, log, notify])

  const drawSprite = useCallback((
    ctx: CanvasRenderingContext2D,
    char: string,
    dir: Dir,
    frame: number,
    px: number,
    py: number,
    sc: number,
    extraColor?: string,
    weaponSlot?: 'main' | 'secondary'
  ) => {
    const legAnim = [-1, 0, 1, 0][frame % 4]
    ctx.save()
    ctx.translate(px, py)

    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.beginPath()
    ctx.ellipse(0, 8 * sc, 6 * sc, 3 * sc, 0, 0, Math.PI * 2)
    ctx.fill()

    const flip = dir === 'left' ? -1 : 1
    ctx.scale(flip, 1)

    if (char === 'frodo') {
      ctx.fillStyle = '#4a6020'
      ctx.fillRect(-5 * sc, -8 * sc, 10 * sc, 10 * sc)
      ctx.fillStyle = '#3a4818'
      ctx.fillRect(-3 * sc, 2 * sc, 3 * sc, 6 * sc + legAnim * sc)
      ctx.fillRect(0, 2 * sc, 3 * sc, 6 * sc - legAnim * sc)
      ctx.fillStyle = '#6a4020'
      ctx.fillRect(-3 * sc, 7 * sc + legAnim * sc, 3 * sc, 2 * sc)
      ctx.fillRect(0, 7 * sc - legAnim * sc, 3 * sc, 2 * sc)
      ctx.fillStyle = '#d4a070'
      ctx.fillRect(-4 * sc, -14 * sc, 8 * sc, 7 * sc)
      ctx.fillStyle = '#5a3010'
      ctx.fillRect(-4 * sc, -15 * sc, 8 * sc, 3 * sc)
      ctx.fillRect(-5 * sc, -13 * sc, 2 * sc, 3 * sc)
      ctx.fillRect(3 * sc, -13 * sc, 2 * sc, 3 * sc)
      // Arma en mano según slot
      if (weaponSlot === 'secondary') {
        ctx.fillStyle = '#8a8890'
        ctx.fillRect(5 * sc, -6 * sc, 1.5 * sc, 8 * sc)
        ctx.fillStyle = '#6a4010'
        ctx.fillRect(4 * sc, -7 * sc, 3 * sc, 2 * sc)
      } else {
        ctx.fillStyle = '#b4d2ff'
        ctx.fillRect(5 * sc, -8 * sc, 1.5 * sc, 10 * sc)
      }
      ctx.fillStyle = '#2a1810'
      if (dir === 'down' || dir === 'left' || dir === 'right') {
        ctx.fillRect(-2 * sc, -11 * sc, 1.5 * sc, 1.5 * sc)
        ctx.fillRect(1 * sc, -11 * sc, 1.5 * sc, 1.5 * sc)
      }
    } else if (char === 'aragorn') {
      // Arco si secondary
      if (weaponSlot === 'secondary') {
        ctx.strokeStyle = '#6a4010'; ctx.lineWidth = 1.5 * sc
        ctx.beginPath(); ctx.arc(-9 * sc, -6 * sc, 10 * sc, -0.7, 0.7); ctx.stroke()
        ctx.strokeStyle = '#c8a84b'; ctx.lineWidth = 0.8 * sc
        ctx.beginPath(); ctx.moveTo(-9 * sc, -15 * sc); ctx.lineTo(-9 * sc, 3 * sc); ctx.stroke()
      }
      ctx.fillStyle = '#4a3a20'
      ctx.fillRect(-6 * sc, -8 * sc, 12 * sc, 12 * sc)
      ctx.fillStyle = '#6a5a30'
      ctx.fillRect(-4 * sc, -6 * sc, 8 * sc, 6 * sc)
      ctx.fillStyle = '#2a1a08'
      ctx.fillRect(-5 * sc, 2 * sc, 10 * sc, 2 * sc)
      ctx.fillStyle = '#5a5a5a'
      ctx.fillRect(-5 * sc, -2 * sc, 2 * sc, 4 * sc)
      ctx.fillRect(3 * sc, -2 * sc, 2 * sc, 4 * sc)
      ctx.fillStyle = '#3a2a18'
      ctx.fillRect(-3 * sc, 4 * sc, 3 * sc, 5 * sc + legAnim * sc)
      ctx.fillRect(0, 4 * sc, 3 * sc, 5 * sc - legAnim * sc)
      ctx.fillStyle = '#9a9aa0'
      ctx.fillRect(6 * sc, -10 * sc, 2 * sc, 14 * sc)
      ctx.fillStyle = '#c8a84b'
      ctx.fillRect(5 * sc, 3 * sc, 4 * sc, 3 * sc)
      ctx.fillStyle = '#d4a070'
      ctx.fillRect(-4 * sc, -16 * sc, 8 * sc, 8 * sc)
      ctx.fillStyle = '#4a2810'
      ctx.fillRect(-3 * sc, -10 * sc, 6 * sc, 3 * sc)
      ctx.fillStyle = '#3a2010'
      ctx.fillRect(-4 * sc, -17 * sc, 8 * sc, 3 * sc)
      ctx.fillStyle = '#c8a84b'
      for (let i = 0; i < 3; i++) {
        ctx.fillRect((-2 + i * 2) * sc, -18 * sc, 1 * sc, 1 * sc)
      }
      ctx.fillStyle = '#2a1810'
      if (dir === 'down' || dir === 'left' || dir === 'right') {
        ctx.fillRect(-2 * sc, -13 * sc, 1.5 * sc, 1.5 * sc)
        ctx.fillRect(1 * sc, -13 * sc, 1.5 * sc, 1.5 * sc)
      }
    } else if (char === 'gandalf' || char === 'gandalf_npc') {
      ctx.fillStyle = '#888888'
      ctx.fillRect(-6 * sc, -10 * sc, 12 * sc, 16 * sc)
      ctx.fillStyle = '#6a6a6a'
      ctx.fillRect(-4 * sc, 0, 2 * sc, 6 * sc)
      ctx.fillRect(2 * sc, 0, 2 * sc, 6 * sc)
      ctx.fillStyle = '#4a4040'
      ctx.fillRect(-5 * sc, -2 * sc, 10 * sc, 2 * sc)
      if (weaponSlot === 'secondary') {
        // Glamdring — espada élfica larga plateada
        ctx.fillStyle = '#9a9ab8'
        ctx.fillRect(7 * sc, -22 * sc, 2 * sc, 26 * sc)
        ctx.fillStyle = '#c8c8e0'
        ctx.fillRect(6 * sc, -22 * sc, 4 * sc, 3 * sc)
        ctx.fillStyle = '#c8a84b'
        ctx.fillRect(5 * sc, -10 * sc, 6 * sc, 2 * sc)
      } else {
        ctx.fillStyle = '#6a4a20'
        ctx.fillRect(7 * sc, -18 * sc, 2 * sc, 24 * sc)
        ctx.fillStyle = '#c8a84b'
        ctx.beginPath()
        ctx.arc(8 * sc, -19 * sc, 2.5 * sc, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = '#d4a080'
      ctx.fillRect(-4 * sc, -18 * sc, 8 * sc, 8 * sc)
      ctx.fillStyle = '#e8e8e0'
      ctx.fillRect(-3 * sc, -12 * sc, 6 * sc, 6 * sc)
      ctx.fillRect(-2 * sc, -6 * sc, 4 * sc, 4 * sc)
      ctx.fillStyle = '#606060'
      ctx.beginPath()
      ctx.moveTo(-6 * sc, -18 * sc)
      ctx.lineTo(0, -28 * sc)
      ctx.lineTo(6 * sc, -18 * sc)
      ctx.fill()
      ctx.fillStyle = '#808080'
      ctx.fillRect(-8 * sc, -18 * sc, 16 * sc, 2 * sc)
      ctx.fillStyle = '#2a2a40'
      if (dir === 'down' || dir === 'left' || dir === 'right') {
        ctx.fillRect(-2 * sc, -16 * sc, 1.5 * sc, 1.5 * sc)
        ctx.fillRect(1 * sc, -16 * sc, 1.5 * sc, 1.5 * sc)
      }
    } else if (char === 'nazgul') {
      const pulse = 0.7 + 0.3 * Math.sin(frame * 0.15)
      ctx.fillStyle = `rgba(10,5,20,${pulse})`
      ctx.fillRect(-7 * sc, -12 * sc, 14 * sc, 20 * sc)
      ctx.fillStyle = `rgba(35,0,0,${pulse})`
      ctx.fillRect(-5 * sc, -18 * sc, 10 * sc, 8 * sc)
      ctx.beginPath()
      ctx.moveTo(-5 * sc, -18 * sc)
      ctx.lineTo(0, -22 * sc)
      ctx.lineTo(5 * sc, -18 * sc)
      ctx.fill()
      ctx.fillStyle = '#ff6020'
      ctx.beginPath()
      ctx.arc(-2 * sc, -14 * sc, 1.5 * sc, 0, Math.PI * 2)
      ctx.arc(2 * sc, -14 * sc, 1.5 * sc, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(100,100,120,0.8)'
      ctx.fillRect(8 * sc, -16 * sc, 2 * sc, 18 * sc)
      ctx.fillStyle = 'rgba(20,0,40,0.4)'
      ctx.fillRect(-10 * sc, -5 * sc, 4 * sc, 8 * sc)
      ctx.fillRect(6 * sc, -5 * sc, 4 * sc, 8 * sc)
    } else if (char === 'legolas') {
      // Cuerpo élfico
      ctx.fillStyle = '#3a5820'
      ctx.fillRect(-5 * sc, -8 * sc, 10 * sc, 11 * sc)
      ctx.fillStyle = '#2a4010'
      ctx.fillRect(-3 * sc, 3 * sc, 3 * sc, 5 * sc + legAnim * sc)
      ctx.fillRect(0, 3 * sc, 3 * sc, 5 * sc - legAnim * sc)
      // Piel clara élfica
      ctx.fillStyle = '#e8d0a0'
      ctx.fillRect(-3 * sc, -16 * sc, 6 * sc, 8 * sc)
      // Pelo dorado largo
      ctx.fillStyle = '#d4a820'
      ctx.fillRect(-4 * sc, -17 * sc, 8 * sc, 3 * sc)
      ctx.fillRect(-4 * sc, -14 * sc, 2 * sc, 8 * sc)
      ctx.fillRect(2 * sc, -14 * sc, 2 * sc, 8 * sc)
      if (weaponSlot === 'secondary') {
        // Cuchillos élficos — dos dagas cruzadas
        ctx.strokeStyle = '#9a9ab0'
        ctx.lineWidth = 1.5 * sc
        ctx.beginPath(); ctx.moveTo(5 * sc, -14 * sc); ctx.lineTo(10 * sc, -4 * sc); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(10 * sc, -14 * sc); ctx.lineTo(5 * sc, -4 * sc); ctx.stroke()
        ctx.fillStyle = '#6a4010'
        ctx.fillRect(6 * sc, -15 * sc, 2 * sc, 2 * sc)
        ctx.fillRect(9 * sc, -15 * sc, 2 * sc, 2 * sc)
      } else {
        // Arco élfico
        ctx.strokeStyle = '#6a4010'
        ctx.lineWidth = 1.5 * sc
        ctx.beginPath(); ctx.arc(8 * sc, -8 * sc, 10 * sc, -0.8, 0.8); ctx.stroke()
        ctx.strokeStyle = '#c8c870'
        ctx.lineWidth = 0.8 * sc
        ctx.beginPath(); ctx.moveTo(8 * sc, -17 * sc); ctx.lineTo(8 * sc, 1 * sc); ctx.stroke()
      }
      // Ojos
      ctx.fillStyle = '#1a2808'
      if (dir === 'down' || dir === 'left' || dir === 'right') {
        ctx.fillRect(-1.5 * sc, -12 * sc, 1.5 * sc, 1.5 * sc)
        ctx.fillRect(1 * sc, -12 * sc, 1.5 * sc, 1.5 * sc)
      }
    } else if (char === 'gimli') {
      // Armadura enana marrón/gris
      ctx.fillStyle = '#5a4020'
      ctx.fillRect(-7 * sc, -6 * sc, 14 * sc, 13 * sc)
      ctx.fillStyle = '#7a6030'
      ctx.fillRect(-5 * sc, -4 * sc, 10 * sc, 7 * sc)
      // Piernas cortas y anchas
      ctx.fillStyle = '#4a3018'
      ctx.fillRect(-4 * sc, 6 * sc, 4 * sc, 5 * sc + legAnim * sc)
      ctx.fillRect(0, 6 * sc, 4 * sc, 5 * sc - legAnim * sc)
      // Cabeza + barba
      ctx.fillStyle = '#c08040'
      ctx.fillRect(-4 * sc, -14 * sc, 8 * sc, 8 * sc)
      ctx.fillStyle = '#8a5020'
      ctx.fillRect(-4 * sc, -8 * sc, 8 * sc, 6 * sc)
      ctx.fillRect(-3 * sc, -2 * sc, 6 * sc, 4 * sc)
      // Casco de hierro
      ctx.fillStyle = '#8a8890'
      ctx.fillRect(-5 * sc, -15 * sc, 10 * sc, 2 * sc)
      ctx.fillRect(-6 * sc, -13 * sc, 12 * sc, 3 * sc)
      // Arma según slot
      if (weaponSlot === 'secondary') {
        // Cuchillo de combate enano
        ctx.strokeStyle = '#9a9ab0'
        ctx.lineWidth = 2 * sc
        ctx.beginPath(); ctx.moveTo(5 * sc, -12 * sc); ctx.lineTo(9 * sc, -2 * sc); ctx.stroke()
        ctx.fillStyle = '#6a4010'
        ctx.fillRect(4 * sc, -14 * sc, 3 * sc, 2 * sc)
      } else {
        // Hacha doble sobre hombro
        ctx.fillStyle = '#8a8890'
        ctx.fillRect(6 * sc, -12 * sc, 2 * sc, 14 * sc)
        ctx.fillStyle = '#c08020'
        ctx.fillRect(4 * sc, -14 * sc, 6 * sc, 4 * sc)
      }
      // Ojos profundos
      ctx.fillStyle = '#1a0800'
      if (dir !== 'up') {
        ctx.fillRect(-2 * sc, -9 * sc, 1.5 * sc, 1.5 * sc)
        ctx.fillRect(0.5 * sc, -9 * sc, 1.5 * sc, 1.5 * sc)
      }
    } else if (char === 'villager') {
      const color = extraColor || '#8a6030'
      ctx.fillStyle = color
      ctx.fillRect(-4 * sc, -6 * sc, 8 * sc, 8 * sc)
      ctx.fillStyle = '#5a4020'
      ctx.fillRect(-2 * sc, 2 * sc, 2 * sc, 5 * sc + legAnim * sc * 0.5)
      ctx.fillRect(0, 2 * sc, 2 * sc, 5 * sc - legAnim * sc * 0.5)
      ctx.fillStyle = '#d4a070'
      ctx.fillRect(-3 * sc, -12 * sc, 6 * sc, 6 * sc)
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

    const MW = 64, MH = 64
    mctx.fillStyle = '#0a0804'
    mctx.fillRect(0, 0, MW, MH)

    const st = S.current
    const scaleX = MW / WW
    const scaleY = MH / WH

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
          mctx.fillRect(tx * scaleX, ty * scaleY, Math.ceil(scaleX), Math.ceil(scaleY))
        }
      }
    }

    for (const v of st.villagers) {
      const mx = (v.x / T) * scaleX, my = (v.y / T) * scaleY
      mctx.fillStyle = v.state === 'captured' ? '#5a1010' : v.state === 'flee' ? '#e08040' : '#8aaa6e'
      mctx.fillRect(mx - 1, my - 1, 2, 2)
    }

    if (st.gandalfAlly) {
      const mx = (st.gandalfAlly.x / T) * scaleX, my = (st.gandalfAlly.y / T) * scaleY
      mctx.fillStyle = '#e8e0a0'
      mctx.fillRect(mx - 1.5, my - 1.5, 3, 3)
    }

  const allNazForMap = [
      ...(st.nazgul && st.nazgul.hp > 0 ? [st.nazgul] : []),
      ...st.nazgulList.filter(n => n !== st.nazgul && n.hp > 0)
    ]
    allNazForMap.forEach(naz => {
      const mx = (naz.x / T) * scaleX, my = (naz.y / T) * scaleY
      mctx.fillStyle = Math.floor(Date.now() / 180) % 2 === 0 ? '#ff4020' : '#8a2010'
      mctx.fillRect(mx - 2, my - 2, 4, 4)
    })

    if (st.p) {
      const mx = (st.p.x / T) * scaleX, my = (st.p.y / T) * scaleY
      mctx.fillStyle = '#c8a84b'
      mctx.beginPath()
      mctx.arc(mx, my, 2.5, 0, Math.PI * 2)
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

    if (st.screenFlash > 0) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      return
    }

    if (p.deathFrame > 80) {
      const fadeAlpha = Math.min(1, (p.deathFrame - 80) / 70)
      ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      if (p.deathFrame < 150) return
    }

    ctx.fillStyle = '#0a0804'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const startTX = Math.max(0, Math.floor(sx / T) - 1)
    const endTX = Math.min(WW, Math.ceil((sx + canvas.width) / T) + 1)
    const startTY = Math.max(0, Math.floor(sy / T) - 1)
    const endTY = Math.min(WH, Math.ceil((sy + canvas.height) / T) + 1)

    for (let ty = startTY; ty < endTY; ty++) {
      for (let tx = startTX; tx < endTX; tx++) {
        drawTile(ctx, tx, ty, st.map[ty][tx], sx, sy)
      }
    }

    for (const gm of st.groundMarks) {
      ctx.fillStyle = `rgba(20,5,30,${gm.alpha})`
      ctx.beginPath()
      ctx.arc(gm.x - sx, gm.y - sy, 20, 0, Math.PI * 2)
      ctx.fill()
    }

    for (const di of st.droppedItems) {
      const bounce = Math.sin(di.bouncePhase) * 3
      const ddx = di.x - p.x, ddy = di.y - p.y
      const ddist = Math.sqrt(ddx*ddx + ddy*ddy)
      if (ddist < T * 2) {
        ctx.font = 'bold 9px monospace'
        ctx.fillStyle = '#c8a84b'
        ctx.textAlign = 'center'
        ctx.fillText('📦', di.x - sx, di.y - sy - 18 + bounce)
      }
      ctx.font = '16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(ITEMS[di.item]?.icon || '?', di.x - sx, di.y - sy - 8 + bounce)
    }

    for (const pt of st.parts) {
      ctx.fillStyle = pt.color
      ctx.globalAlpha = pt.life / pt.maxLife
      ctx.fillRect(pt.x - sx - 2, pt.y - sy - 2, 4, 4)
    }
    ctx.globalAlpha = 1

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
        ctx.font = '7px monospace'
        ctx.fillStyle = '#5a1010'
        ctx.textAlign = 'center'
        ctx.fillText(v.name, vx, vy + 20)
      }
    }

    for (const v of st.villagers) {
      if (v.state === 'captured') continue
      const vx = v.x - sx, vy = v.y - sy
      drawSprite(ctx, 'villager', v.dir, v.frame, vx, vy, 1.8, v.color)

      if (v.hat) {
        ctx.fillStyle = '#2a1808'
        ctx.fillRect(vx - 5, vy - 26, 10, 4)
        ctx.fillRect(vx - 3, vy - 30, 6, 4)
      }

      if (v.state === 'flee') {
        ctx.font = 'bold 12px sans-serif'
        ctx.fillStyle = '#e24b4a'
        ctx.textAlign = 'center'
        ctx.fillText('!', vx, vy - 35)
      }

      ctx.font = '7px monospace'
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      const nameWidth = ctx.measureText(v.name).width + 6
      ctx.fillRect(vx - nameWidth / 2, vy + 12, nameWidth, 10)
      ctx.fillStyle = v.state === 'flee' ? '#e08040' : '#8aaa6e'
      ctx.textAlign = 'center'
      ctx.fillText(v.name, vx, vy + 20)
    }

    const g = st.gandalfAlly
    if (g) {
      const gx = g.x - sx, gy = g.y - sy

      if (g.shieldActive > 0) {
        const pulse = 0.5 + 0.5 * Math.sin(st.frameCount * 0.2)
        ctx.strokeStyle = `rgba(232,224,160,${pulse})`
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(gx, gy, 40, 0, Math.PI * 2)
        ctx.stroke()

        ctx.fillStyle = `rgba(232,224,160,${pulse * 0.15})`
        ctx.beginPath()
        ctx.arc(gx, gy, 60, 0, Math.PI * 2)
        ctx.fill()
      }

      if (g.rayFrames > 0 && g.rayTarget) {
        const gradient = ctx.createLinearGradient(gx + 16, gy - 38, g.rayTarget.x - sx, g.rayTarget.y - sy)
        gradient.addColorStop(0, '#ffffd0')
        gradient.addColorStop(1, '#c8a84b')
        ctx.strokeStyle = gradient
        ctx.lineWidth = 4
        ctx.globalAlpha = g.rayFrames / 8
        ctx.beginPath()
        ctx.moveTo(gx + 16, gy - 38)
        ctx.lineTo(g.rayTarget.x - sx, g.rayTarget.y - sy)
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      drawSprite(ctx, 'gandalf_npc', g.dir, g.frame, gx, gy, 2)

      ctx.font = 'bold 7px monospace'
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fillRect(gx - 25, gy + 12, 50, 10)
      ctx.fillStyle = '#e8e0a0'
      ctx.textAlign = 'center'
      ctx.fillText('GANDALF', gx, gy + 20)

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

    const allNazToRender = [
      ...(st.nazgul ? [st.nazgul] : []),
      ...st.nazgulList.filter(n => n !== st.nazgul)
    ]
    for (const naz of allNazToRender) {
    if (!naz || (naz.hp <= 0 && naz.state !== 'dying')) continue
      const nx = naz.x - sx, ny = naz.y - sy

      if (naz.state === 'dying') {
        const deathProgress = Math.min(1, naz.deathFrame / 90)
        const scale = naz.deathFrame < 15 ? 1 : 
                     naz.deathFrame < 50 ? 1 + ((naz.deathFrame - 15) / 35) * 0.4 :
                     1.4 - ((naz.deathFrame - 50) / 40) * 0.4
        const alpha = naz.deathFrame < 15 ? 1 :
                     naz.deathFrame < 50 ? 1 - ((naz.deathFrame - 15) / 35) * 0.8 :
                     0.2 - ((naz.deathFrame - 50) / 40) * 0.2
        ctx.globalAlpha = Math.max(0, alpha)
        ctx.save()
        ctx.translate(nx, ny)
        ctx.scale(scale, scale)
        ctx.translate(-nx, -ny)
        drawSprite(ctx, 'nazgul', naz.dir, naz.frame, nx, ny, 2.2)
        ctx.restore()
        ctx.globalAlpha = 1
      } else {
        if (naz.invT > 0 && naz.invT % 4 < 2) {
          ctx.globalAlpha = 0.5
        }

        drawSprite(ctx, 'nazgul', naz.dir, naz.frame, nx, ny, 2.2)
        ctx.globalAlpha = 1

        ctx.fillStyle = '#2a0a0a'
        ctx.fillRect(nx - 20, ny - 45, 40, 6)
        ctx.fillStyle = '#c82020'
        ctx.fillRect(nx - 19, ny - 44, 38 * (naz.hp / naz.maxhp), 4)

        ctx.font = 'bold 8px monospace'
        ctx.fillStyle = '#ff6040'
        ctx.textAlign = 'center'
        ctx.fillText('NAZGÛL', nx, ny + 25)

        if (naz.poweredUp > 0) {
          ctx.fillStyle = '#c82020'
          ctx.fillText(`ALMAS: ${naz.poweredUp}`, nx, ny + 35)
        }
      }
    }

    // Render merchants
    if (st.merchants && st.merchants.length > 0) {
      for (const m of st.merchants) {
        const mx = m.x - sx, my = m.y - sy
        const shop = SHOPS[m.id]
        // Cuerpo hobbit genérico con color de tienda
        ctx.fillStyle = shop.color
        ctx.fillRect(mx - 4 * 1.5, my - 6 * 1.5, 8 * 1.5, 8 * 1.5)
        ctx.fillStyle = '#d4a070'
        ctx.fillRect(mx - 3 * 1.5, my - 12 * 1.5, 6 * 1.5, 6 * 1.5)
        ctx.fillStyle = '#3a2010'
        ctx.fillRect(mx - 3 * 1.5, my - 13 * 1.5, 6 * 1.5, 2 * 1.5)
        // Ícono sobre la cabeza
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(shop.icon, mx, my - 18)
        // Nombre debajo
        ctx.font = '7px monospace'
        ctx.fillStyle = '#c8a84b'
        ctx.fillText(shop.name.split(' ')[0], mx, my + 16)
        // Indicador E cuando jugador está cerca
        if (p) {
          const pdx = m.x - p.x, pdy = m.y - p.y
          if (Math.sqrt(pdx*pdx + pdy*pdy) < 2.5 * T) {
            ctx.font = 'bold 10px monospace'
            ctx.fillStyle = '#c8a84b'
            ctx.fillText('[E]', mx, my - 28)
          }
        }
      }
    }

    const px = p.x - sx, py = p.y - sy

    if (p.char === 'aragorn' && p.sweepAnim > 0) {
      const progress = p.sweepAnim / 20
      ctx.strokeStyle = `rgba(200,168,75,${progress * 0.6})`
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(px, py, T * 2.4, p.sweepAngle - Math.PI / 3, p.sweepAngle + Math.PI / 3)
      ctx.stroke()
    }

    if (p.char === 'frodo' && p.daggerAnim > 0) {
      const progress = p.daggerAnim / 14
      ctx.strokeStyle = `rgba(180,210,255,${progress * 0.7})`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(px, py, T * 1.8, p.daggerAngle - Math.PI / 4, p.daggerAngle + Math.PI / 4)
      ctx.stroke()
    }

    if (p.char === 'gandalf' && p.staffRayAnim > 0 && p.staffRayTarget) {
      const progress = p.staffRayAnim / 12
      const gradient = ctx.createLinearGradient(px + 16, py - 20, p.staffRayTarget.x - sx, p.staffRayTarget.y - sy)
      gradient.addColorStop(0, '#ffffd0')
      gradient.addColorStop(1, '#c8a84b')
      ctx.strokeStyle = gradient
      ctx.lineWidth = 4
      ctx.globalAlpha = progress
      ctx.beginPath()
      ctx.moveTo(px + 14, py - 36)
      ctx.lineTo(p.staffRayTarget.x - sx, p.staffRayTarget.y - sy)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    if (p.char === 'frodo' && p.ringShimmer > 0) {
      const shimmerAlpha = (p.ringShimmer / 300) * (0.3 + 0.2 * Math.sin(st.frameCount * 0.3))
      ctx.strokeStyle = `rgba(200,168,75,${shimmerAlpha})`
      ctx.lineWidth = 2
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.arc(px, py, 15 + i * 5 + Math.sin(st.frameCount * 0.1 + i) * 2, 0, Math.PI * 2)
        ctx.stroke()
      }
      if (st.frameCount % 5 === 0) {
        st.parts.push({
          x: p.x + (Math.random() - 0.5) * 30,
          y: p.y + (Math.random() - 0.5) * 30,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -0.5 - Math.random() * 0.5,
          color: '#c8a84b',
          life: 20,
          maxLife: 20,
        })
      }
    }

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

    if (p.deathFrame > 0 && p.deathFrame <= 30) {
      const shrink = 1 - (p.deathFrame / 30) * 0.7
      ctx.save()
      ctx.translate(px, py)
      ctx.scale(1, shrink)
      ctx.translate(-px, -py)
      if (p.deathFrame % 4 < 2) {
        ctx.globalAlpha = 0.5
      }
      drawSprite(ctx, p.char, p.dir, p.frame, px, py, 2, undefined, p.weaponSlot)
      ctx.restore()
    } else if (p.deathFrame === 0) {
      if (p.invT > 0 && p.invT % 6 < 3) {
        ctx.globalAlpha = 0.5
      }
      drawSprite(ctx, p.char, p.dir, p.frame, px, py, 2, undefined, p.weaponSlot)
    }
    ctx.globalAlpha = 1

    if (p.deathFrame === 0) {
      ctx.font = 'bold 9px monospace'
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      const pName = CHARS[p.char].name
      const pNameWidth = ctx.measureText(pName).width + 8
      ctx.fillRect(px - pNameWidth / 2, py + 12, pNameWidth, 12)
      ctx.fillStyle = '#c8a84b'
      ctx.textAlign = 'center'
      ctx.fillText(pName, px, py + 22)
    }

    for (const f of st.fx) {
      ctx.font = 'bold 12px monospace'
      ctx.fillStyle = f.color
      ctx.globalAlpha = f.life / 40
      ctx.textAlign = 'center'
      ctx.fillText(f.text, f.x - sx, f.y - sy)
    }
    ctx.globalAlpha = 1

    if (st.fade && st.fade.life > 0) {
      ctx.font = 'bold 14px monospace'
      ctx.fillStyle = st.fade.color
      ctx.globalAlpha = st.fade.life / 90
      ctx.textAlign = 'center'
      ctx.fillText(st.fade.text, canvas.width / 2, 60)
      ctx.globalAlpha = 1
    }

    drawMinimap()
  }, [drawTile, drawSprite, drawMinimap])

  const loop = useCallback(() => {
    if (screen === 'game' && S.current?.gameActive) {
      update()
    }
    render()
    animRef.current = requestAnimationFrame(loop)
  }, [screen, update, render])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!S.current) return

      if (document.activeElement?.tagName === 'INPUT') return

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
        if (S.current) {
          S.current.modMenuOpen = false
          forceUpdate(n => n + 1)
        }
      }

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

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth
        canvasRef.current.height = window.innerHeight
      }
      setIsCompact(window.innerHeight < 700)
    }

    setTimeout(handleResize, 50)
    setTimeout(handleResize, 200)
    handleResize()
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', () => setTimeout(handleResize, 100))
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [screen])

  useEffect(() => {
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [loop])

  const joystickRef = useRef<HTMLDivElement>(null)
  const [thumbPos, setThumbPos] = useState({ x: 0, y: 0 })
  const joystickPointerId = useRef<number | null>(null)

  const handleJoystickPointerDown = (e: React.PointerEvent) => {
    if (joystickPointerId.current !== null) return
    e.preventDefault()
    e.stopPropagation()
    joystickPointerId.current = e.pointerId
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

    if (!S.current || !joystickRef.current) return
    const rect = joystickRef.current.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const dx = e.clientX - rect.left - centerX
    const dy = e.clientY - rect.top - centerY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const maxDist = 36
    const clampedX = dist > maxDist ? (dx / dist) * maxDist : dx
    const clampedY = dist > maxDist ? (dy / dist) * maxDist : dy
    setThumbPos({ x: clampedX, y: clampedY })
    S.current.joy = { active: true, dx: clampedX, dy: clampedY }
  }

  const handleJoystickPointerMove = (e: React.PointerEvent) => {
    if (e.pointerId !== joystickPointerId.current) return
    e.preventDefault()
    e.stopPropagation()
    if (!S.current?.joy.active || !joystickRef.current) return
    const rect = joystickRef.current.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const dx = e.clientX - rect.left - centerX
    const dy = e.clientY - rect.top - centerY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const maxDist = 36
    const clampedX = dist > maxDist ? (dx / dist) * maxDist : dx
    const clampedY = dist > maxDist ? (dy / dist) * maxDist : dy
    setThumbPos({ x: clampedX, y: clampedY })
    S.current.joy = { active: true, dx: clampedX, dy: clampedY }
  }

  const handleJoystickPointerUp = (e: React.PointerEvent) => {
    if (e.pointerId !== joystickPointerId.current) return
    joystickPointerId.current = null
    if (!S.current) return
    setThumbPos({ x: 0, y: 0 })
    S.current.joy = { active: false, dx: 0, dy: 0 }
  }

  const handleTermInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!S.current) return
    const val = e.target.value
    S.current.termInput = val
    S.current.modMenuOpen = val.startsWith('/')
    forceUpdate(n => n + 1)
  }

  const handleTermKeyDown = (e: React.KeyboardEvent) => {
    if (!S.current) return
    if (e.key === 'Enter' && S.current.termInput.trim()) {
      executeCommand(S.current.termInput.trim())
    }
    if (e.key === 'Escape') {
      S.current.modMenuOpen = false
      S.current.termInput = ''
      forceUpdate(n => n + 1)
    }
  }

  const savedCount = S.current ? S.current.villagers.filter(v => v.state !== 'captured').length : 8
  const termContext = S.current ? getTermContext() : 'exploration'
  const filteredMods = S.current?.termInput
    ? MOD_COMMANDS.filter(m => m.cmd.startsWith(S.current!.termInput))
    : MOD_COMMANDS

  const [invPanelOpen, setInvPanelOpen] = useState(false)

  return (
    <div
      ref={rootRef}
      className="relative w-full bg-[#0a0804] overflow-hidden select-none"
      style={{ touchAction: 'manipulation', height: '100dvh' }}
    >
      {screen === 'game' && S.current?.p && (
        <div className="absolute top-0 left-0 right-0 px-2 pt-1 pb-1 z-10" style={{ background: 'linear-gradient(to bottom, rgba(10,8,4,0.85) 80%, transparent)' }}>
          <div className="flex items-start justify-between">
            <div className="rounded-lg border border-[rgba(200,168,75,0.3)] overflow-hidden bg-[rgba(0,0,0,0.5)]">
              <canvas ref={minimapRef} width={64} height={64} className="block" />
            </div>

            <div className="text-right">
              <div className="text-[#c8a84b] text-sm tracking-[1px] font-bold">
                {S.current.gameMode === 'horde' && S.current.wave > 0 
                  ? `OLEADA ${S.current.wave}/10`
                  : CHARS[S.current.p.char].name
                }
              </div>
              <div className="flex gap-0.5 justify-end mt-0.5">
                {Array.from({ length: S.current.p.maxhp }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${i < S.current!.p!.hp ? 'bg-[#5a8a3a]' : 'bg-[#3a2a20]'}`}
                  />
                ))}
              </div>
              <div className="text-[#8aaa6e] text-xs mt-0.5 font-medium">
                Aldeanos: {savedCount}/8
              </div>
              <div className="text-[#c8a84b] text-xs font-medium">
                💰 {S.current.p.gold} MC
              </div>
              {S.current.p && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[#c8a84b] text-[10px] font-bold">Nv.{S.current.p.level}</span>
                  <div className="w-16 h-1.5 rounded-full bg-[#2a2010]">
                    <div
                      className="h-full rounded-full bg-[#c8a84b] transition-all"
                      style={{ width: `${Math.min(100, ((S.current.p.xp - (XP_TABLE[S.current.p.level - 1] || 0)) / ((XP_TABLE[S.current.p.level] || XP_TABLE[XP_TABLE.length-1]) - (XP_TABLE[S.current.p.level - 1] || 0))) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {S.current.heroMode && (
                <div className="text-[#c8a84b] text-[10px] animate-pulse">INMORTAL</div>
              )}
              {S.current.p.ringActive > 0 && (
                <div className="text-[#c8a84b] text-[10px] animate-pulse">INVISIBLE</div>
              )}
            </div>
          </div>
        </div>
      )}

      {screen === 'game' && S.current && (
        <div 
          className="absolute left-2 right-2 rounded-lg border border-[#2a3a1a] overflow-hidden flex flex-col z-10"
          style={{ background: 'rgba(10,10,10,0.85)', top: '86px' }}
        >
          <div
            ref={logRef}
            className="px-2 py-1"
            style={{
              height: '44px',
              overflowY: 'auto',
              overflowX: 'hidden',
              scrollbarWidth: 'none',
            }}
          >
            {S.current.logs.map((l, i) => (
              <div
                key={i}
                style={{
                  fontSize: '11px',
                  lineHeight: '20px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontFamily: 'monospace',
                  color: l.type === 'i' ? '#8aaa6e' :
                         l.type === 'e' ? '#c8a84b' :
                         l.type === 'd' ? '#e24b4a' :
                         '#5a6a3a'
                }}
              >
                <span style={{ color: '#3a4a2a', marginRight: '4px' }}>[{l.time}]</span>
                {l.msg}
              </div>
            ))}
          </div>

          <div className="flex-none flex items-center h-8 px-2 border-t border-[#2a3a1a]" style={{ background: '#0a0a0a' }}>
            <span className="text-[#5a6a3a] mr-2 text-sm">{'>'}</span>
            <input
              ref={inputRef}
              type="text"
              value={S.current.termInput}
              onChange={handleTermInput}
              onKeyDown={handleTermKeyDown}
              onFocus={() => { if (S.current) S.current.gamePaused = true }}
              onBlur={() => { if (S.current) S.current.gamePaused = false }}
              placeholder="/mods o escribe aquí..."
              className="flex-1 bg-transparent text-[#8aaa6e] outline-none placeholder:text-[#3a4a2a]"
              style={{ fontSize: '16px' }}
            />
          </div>

          {S.current.dlg.active ? (
            <div className="flex-none flex gap-2 p-1.5 border-t border-[#2a3a1a]" style={{ background: 'rgba(0,0,0,0.5)' }}>
              {S.current.dlg.opts.map((opt, i) => (
                <button
                  key={i}
                  onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); selectDlgOpt(opt) }}
                  onClick={() => selectDlgOpt(opt)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium active:scale-95 transition-all"
                  style={{ background: 'rgba(200,168,75,0.12)', color: '#c8a84b', border: '1px solid #4a3a20' }}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          ) : termContext === 'interaction' ? (
            <div className="flex-none flex gap-2 p-1.5 border-t border-[#2a3a1a]" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <button
                onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); tryInteract() }}
                onClick={(e) => { e.preventDefault(); tryInteract() }}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium active:scale-95 transition-all"
                style={{ background: 'rgba(90,138,58,0.2)', color: '#8aaa6e', border: '1px solid #3a4a2a' }}
              >
                Hablar
              </button>
              <button
                onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); closeDlg() }}
                onClick={(e) => { e.preventDefault(); closeDlg() }}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium active:scale-95 transition-all"
                style={{ background: 'rgba(60,50,40,0.3)', color: '#6a5a4a', border: '1px solid #3a3a2a' }}
              >
                Ignorar
              </button>
            </div>
          ) : null}
        </div>
      )}

      <div className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="block w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        />

        {screen !== 'game' && (
          <canvas ref={minimapRef} width={64} height={64} className="hidden" />
        )}
      </div>

      {screen === 'game' && S.current && (
        <div className="absolute bottom-0 left-0 right-0 px-2 pb-2 pt-2 flex items-end justify-between gap-2 z-10" style={{ background: 'linear-gradient(to top, rgba(10,8,4,0.92) 70%, transparent)' }}>

          {invPanelOpen && S.current?.p && (
            <div
              className="absolute bottom-full right-3 mb-1 w-[200px] rounded-xl border border-[rgba(200,168,75,0.3)] overflow-hidden z-30"
              style={{ background: 'rgba(10,12,8,0.97)' }}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(200,168,75,0.15)]">
                <span className="text-[#c8a84b] text-xs font-bold tracking-wider">INVENTARIO</span>
                <button onTouchStart={(e) => { e.preventDefault(); setInvPanelOpen(false) }} onClick={() => setInvPanelOpen(false)} className="text-[#5a6a3a] text-xs px-1">✕</button>
              </div>
              {S.current.p.inv.length === 0 ? (
                <div className="text-[#5a6a3a] text-xs text-center py-3">Vacío</div>
              ) : (
                <div className="flex flex-wrap gap-2 p-2">
                  {Object.entries(S.current.p.inv.reduce((acc: Record<string,number>, item) => { acc[item] = (acc[item]||0)+1; return acc }, {})).map(([item, count]) => (
                    <button
                      key={item}
                      onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); const idx = S.current!.p!.inv.indexOf(item); useItem(idx); setInvPanelOpen(false) }}
                      onClick={() => { const idx = S.current!.p!.inv.indexOf(item); useItem(idx); setInvPanelOpen(false) }}
                      className="relative flex flex-col items-center gap-0.5 p-2 rounded-lg bg-[rgba(40,30,20,0.8)] border border-[rgba(200,168,75,0.2)] active:scale-95 transition-all"
                    >
                      <span style={{ fontSize: '20px' }}>{ITEMS[item]?.icon || '?'}</span>
                      <span className="text-[#c8a84b] text-[9px] capitalize">{item}</span>
                      {count > 1 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#c8a84b] text-[#1a1408] text-[9px] font-bold flex items-center justify-center">{count}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div
            ref={joystickRef}
            className="rounded-full bg-[rgba(200,168,75,0.08)] border-2 border-[rgba(200,168,75,0.2)] flex items-center justify-center flex-shrink-0"
            style={{ width: 80, height: 80, touchAction: 'none', opacity: 0.85 }}
            onPointerDown={handleJoystickPointerDown}
            onPointerMove={handleJoystickPointerMove}
            onPointerUp={handleJoystickPointerUp}
            onPointerCancel={handleJoystickPointerUp}
          >
            <div
              className="w-10 h-10 rounded-full bg-[rgba(200,168,75,0.25)] border border-[rgba(200,168,75,0.5)]"
              style={{ transform: `translate(${thumbPos.x}px, ${thumbPos.y}px)`, pointerEvents: 'none' }}
            />
          </div>

          <div className="flex flex-col gap-2 items-end">
            <div className="flex gap-2 items-center">
              <button
                onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); doAttack() }}
                onClick={(e) => { e.preventDefault(); doAttack() }}
                className="w-14 h-14 rounded-2xl bg-[#6a1a1a] border-2 border-[#8a2a2a] flex items-center justify-center text-2xl active:bg-[#8a2a2a] active:scale-95 transition-all"
                title={`Atacar — ${WEAPONS[S.current.p?.char||'']?.[S.current.p?.weaponSlot||'main']?.label || 'Atacar'}`}
              >
                {WEAPONS[S.current.p?.char||'']?.[S.current.p?.weaponSlot||'main']?.icon || '⚔️'}
              </button>

              <button
                onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); doSwapWeapon() }}
                onClick={(e) => { e.preventDefault(); doSwapWeapon() }}
                className="w-10 h-10 rounded-xl bg-[#1a2010] border-2 border-[#3a4a20] flex items-center justify-center text-lg active:bg-[#2a3020] active:scale-95 transition-all"
                title="Cambiar arma"
              >
                {WEAPONS[S.current.p?.char||'']?.[S.current.p?.weaponSlot === 'main' ? 'secondary' : 'main']?.icon || '🔄'}
              </button>

              <button
                onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); if (S.current?.p) { S.current.p.invT = Math.max(S.current.p.invT, 60); log('s', 'Te pones en guardia.'); notify('DEFENSA', '#5a8a3a') } }}
                onClick={(e) => { e.preventDefault(); if (S.current?.p) { S.current.p.invT = Math.max(S.current.p.invT, 60); log('s', 'Te pones en guardia.'); notify('DEFENSA', '#5a8a3a') } }}
                className="w-14 h-14 rounded-2xl bg-[#1a3040] border-2 border-[#2a4a5a] flex items-center justify-center text-2xl active:bg-[#2a4050] active:scale-95 transition-all"
                title="Defender"
              >
                🛡️
              </button>

              {S.current.p?.inv.includes('anillo') && (
                <button
                  onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); useRing() }}
                  onClick={(e) => { e.preventDefault(); useRing() }}
                  className="w-14 h-14 rounded-2xl bg-[#2a2010] border-2 border-[#c8a84b] flex items-center justify-center text-2xl active:bg-[#3a3020] active:scale-95 transition-all animate-pulse"
                  title="Usar Anillo"
                >
                  💍
                </button>
              )}
            </div>

            <div className="flex gap-2 items-center">
              <button
                onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); const idx = S.current?.p?.inv.indexOf('miruvor') ?? -1; if (idx >= 0) useItem(idx) }}
                onClick={(e) => { e.preventDefault(); const idx = S.current?.p?.inv.indexOf('miruvor') ?? -1; if (idx >= 0) useItem(idx) }}
                className="w-12 h-12 rounded-xl bg-[#1a3020] border-2 border-[#2a4a30] flex items-center justify-center text-lg active:bg-[#2a4030] active:scale-95 transition-all"
                title="Poción"
              >🧴</button>

              <button
                onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); const idx = S.current?.p?.inv.indexOf('lembas') ?? -1; if (idx >= 0) useItem(idx) }}
                onClick={(e) => { e.preventDefault(); const idx = S.current?.p?.inv.indexOf('lembas') ?? -1; if (idx >= 0) useItem(idx) }}
                className="w-12 h-12 rounded-xl bg-[#2a2010] border-2 border-[#4a3a20] flex items-center justify-center text-lg active:bg-[#3a3020] active:scale-95 transition-all"
                title="Lembas"
              >🍞</button>

              <button
                onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); pickupNearbyItem() }}
                onClick={(e) => { e.preventDefault(); pickupNearbyItem() }}
                className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-lg active:scale-95 transition-all ${getNearbyItem() ? 'bg-[#1a2a10] border-[#3a5a20]' : 'bg-[#102030] border-[#2a3a4a] active:bg-[#1a2a3a]'}`}
                title={getNearbyItem() ? 'Recoger item' : 'Hablar'}
              >{getNearbyItem() ? '📦' : '💬'}</button>

              <button
                onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); setInvPanelOpen(v => !v) }}
                onClick={(e) => { e.preventDefault(); setInvPanelOpen(v => !v) }}
                className="w-12 h-12 rounded-xl bg-[#1a1a2a] border-2 border-[#2a2a4a] flex items-center justify-center text-lg active:bg-[#2a2a3a] active:scale-95 transition-all"
                title="Inventario"
              >
                🎒
                {(S.current.p?.inv.length ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#c8a84b] text-[#1a1408] text-[9px] font-bold flex items-center justify-center">
                    {S.current.p?.inv.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === 'game' && S.current?.modMenuOpen && (
        <div 
          className="absolute inset-0 z-40 flex items-center justify-center bg-[rgba(0,0,0,0.7)]"
          onClick={() => {
            if (S.current) S.current.modMenuOpen = false
            forceUpdate(n => n + 1)
          }}
        >
          <div 
            className="w-[90%] max-w-[320px] rounded-xl border border-[#3a4a2a] p-4"
            style={{ background: 'rgba(10,12,8,0.98)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[#5a8a3a] text-xs font-bold tracking-wider mb-3">COMANDOS /MODS</div>
            <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto">
              {filteredMods.map((m, i) => (
                <button
                  key={i}
                  onClick={() => executeCommand(m.cmd)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[rgba(90,138,58,0.2)] rounded-lg flex justify-between items-center"
                >
                  <span className="text-[#8aaa6e] font-mono">{m.cmd}</span>
                  <span className="text-[#5a6a3a] text-xs">{m.desc}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center mt-3 h-10 px-3 rounded-lg border border-[#2a3a1a] bg-[rgba(0,0,0,0.3)]">
              <span className="text-[#5a6a3a] mr-2">›</span>
              <input
                ref={inputRef}
                type="text"
                value={S.current.termInput}
                onChange={handleTermInput}
                onKeyDown={handleTermKeyDown}
                onFocus={() => { if (S.current) S.current.gamePaused = true }}
                onBlur={() => { if (S.current) S.current.gamePaused = false }}
                placeholder="/comando..."
                className="flex-1 bg-transparent text-[#8aaa6e] outline-none placeholder:text-[#3a4a2a]"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>
        </div>
      )}

      {screen === 'charsel' && (
        <div className="absolute inset-0 bg-[rgba(10,8,4,0.98)] flex flex-col items-center justify-center p-4">
          <h1 className="text-[#c8a84b] text-2xl font-bold tracking-wider mb-2">
            TIERRA MEDIA
          </h1>
          <p className="text-[#6a5a3a] text-sm mb-4">Elige tu héroe</p>

          <div className="flex gap-4 flex-wrap justify-center mb-4">
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

          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setSelectedMode('exploration')}
              className={`px-4 py-2 rounded-lg border transition-all text-sm ${selectedMode === 'exploration'
                ? 'border-[#5a8a3a] bg-[rgba(90,138,58,0.2)] text-[#8aaa6e]'
                : 'border-[rgba(90,138,58,0.3)] text-[#5a6a3a] hover:border-[rgba(90,138,58,0.5)]'
              }`}
            >
              Exploración
            </button>
            <button
              onClick={() => setSelectedMode('horde')}
              className={`px-4 py-2 rounded-lg border transition-all text-sm ${selectedMode === 'horde'
                ? 'border-[#e24b4a] bg-[rgba(226,75,74,0.2)] text-[#e24b4a]'
                : 'border-[rgba(226,75,74,0.3)] text-[#8a4040] hover:border-[rgba(226,75,74,0.5)]'
              }`}
            >
              Horda
            </button>
          </div>
          <p className="text-[#5a6a3a] text-[10px] mb-4 text-center max-w-xs">
            {selectedMode === 'exploration' 
              ? 'Explora La Comarca libremente. Usa /nazgul para invocar enemigos.'
              : 'Sobrevive 10 oleadas de Nazgûl. Protege a los aldeanos.'
            }
          </p>

          {selectedChar && (
            <button
              onClick={() => startGame(selectedChar, selectedMode)}
              className="px-8 py-3 bg-[#c8a84b] text-[#1a1408] font-bold rounded-lg hover:bg-[#d8b85b] transition-colors"
            >
              COMENZAR
            </button>
          )}
        </div>
      )}

      {screen === 'dead' && (
        <div className="absolute inset-0 bg-[rgba(60,5,5,0.93)] flex flex-col items-center justify-center">
          <h1 className="text-[#c82020] text-3xl font-bold mb-4">HAS CAIDO</h1>
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

      {screen === 'gameover' && (
        <div className="absolute inset-0 bg-[rgba(5,2,2,0.97)] flex flex-col items-center justify-center p-4">
          <div className="text-[#4a1010] text-xs tracking-widest mb-2">
            LA COMARCA HA CAIDO
          </div>
          <h1 className="text-[#8a2020] text-2xl font-bold mb-4">
            TODOS HAN SIDO CAPTURADOS
          </h1>
          <p className="text-[#6a4040] text-sm italic mb-6 text-center max-w-xs">
            La oscuridad se cierne sobre la Comarca. Los hobbits han perdido toda esperanza...
          </p>
          <button
            onClick={restartFromSelect}
            className="px-8 py-3 bg-[#4a2020] text-[#c8a0a0] font-bold rounded-lg hover:bg-[#5a2828] transition-colors"
          >
            INTENTAR DE NUEVO
          </button>
        </div>
      )}

      {screen === 'win' && (
        <div className="absolute inset-0 bg-[rgba(4,30,20,0.96)] flex flex-col items-center justify-center p-4">
          <h1 className="text-[#c8a84b] text-3xl font-bold mb-4">VICTORIA</h1>
          <p className="text-[#5a8a3a] text-lg mb-2">
            Aldeanos salvados: {savedCount}/8
          </p>
          {S.current?.gameMode === 'horde' && (
            <p className="text-[#8aaa6e] text-sm mb-2">
              Oleadas completadas: {S.current.wave}/10
            </p>
          )}
          <p className="text-[#4a6a3a] text-sm italic mb-6 text-center max-w-xs">
            La Comarca está a salvo. La luz ha vencido a la oscuridad.
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

function CharPreview({ charKey }: { charKey: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, 64, 64)

    const sc = 1.5
    const px = 32, py = 40

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
    } else if (charKey === 'legolas') {
      ctx.fillStyle = '#3a5820'
      ctx.fillRect(-5 * sc, -8 * sc, 10 * sc, 11 * sc)
      ctx.fillStyle = '#e8d0a0'
      ctx.fillRect(-3 * sc, -16 * sc, 6 * sc, 8 * sc)
      ctx.fillStyle = '#d4a820'
      ctx.fillRect(-4 * sc, -17 * sc, 8 * sc, 3 * sc)
      ctx.strokeStyle = '#6a4010'
      ctx.lineWidth = 1.5 * sc
      ctx.beginPath()
      ctx.arc(8 * sc, -8 * sc, 10 * sc, -0.8, 0.8)
      ctx.stroke()
    } else if (charKey === 'gimli') {
      ctx.fillStyle = '#5a4020'
      ctx.fillRect(-7 * sc, -6 * sc, 14 * sc, 10 * sc)
      ctx.fillStyle = '#c08040'
      ctx.fillRect(-4 * sc, -14 * sc, 8 * sc, 8 * sc)
      ctx.fillStyle = '#8a5020'
      ctx.fillRect(-4 * sc, -7 * sc, 8 * sc, 5 * sc)
      ctx.fillStyle = '#8a8890'
      ctx.fillRect(-5 * sc, -17 * sc, 10 * sc, 4 * sc)
      ctx.fillRect(6 * sc, -14 * sc, 2 * sc, 16 * sc)
      ctx.fillRect(4 * sc, -14 * sc, 6 * sc, 4 * sc)
    }

    ctx.restore()
  }, [charKey])

  return <canvas ref={canvasRef} width={64} height={64} />
}
