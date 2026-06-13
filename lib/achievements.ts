export interface Achievement {
  id: string
  name: string
  desc: string
  emoji: string
  condition: 'waves' | 'kills' | 'time' | 'custom'
  target: number
}

export const ACHIEVEMENTS: Record<string, Achievement> = {
  first_blood: {
    id: 'first_blood',
    name: 'Primera Sangre',
    desc: 'Derrota tu primer Nazgúl',
    emoji: '🔴',
    condition: 'kills',
    target: 1,
  },
  wave_survivor: {
    id: 'wave_survivor',
    name: 'Superviviente',
    desc: 'Completa 5 olas',
    emoji: '🛡️',
    condition: 'waves',
    target: 5,
  },
  wave_master: {
    id: 'wave_master',
    name: 'Maestro de Olas',
    desc: 'Completa 20 olas',
    emoji: '👑',
    condition: 'waves',
    target: 20,
  },
  slayer: {
    id: 'slayer',
    name: 'Cazador',
    desc: 'Derrota 100 Nazgúl',
    emoji: '⚔️',
    condition: 'kills',
    target: 100,
  },
  warrior: {
    id: 'warrior',
    name: 'Guerrero Legendario',
    desc: 'Derrota 500 Nazgúl',
    emoji: '🗡️',
    condition: 'kills',
    target: 500,
  },
  marathon: {
    id: 'marathon',
    name: 'Maratón',
    desc: 'Juega 10 horas totales',
    emoji: '⏱️',
    condition: 'time',
    target: 10,
  },
  all_chars: {
    id: 'all_chars',
    name: 'Aventurero Universal',
    desc: 'Juega con todos los personajes',
    emoji: '🎭',
    condition: 'custom',
    target: 5,
  },
  gandalf_master: {
    id: 'gandalf_master',
    name: 'Hechicero Supremo',
    desc: 'Completa 15 olas con Gandalf',
    emoji: '✨',
    condition: 'custom',
    target: 15,
  },
  gimli_basher: {
    id: 'gimli_basher',
    name: 'Aplastador Enano',
    desc: 'Completa 15 olas con Gimli',
    emoji: '💥',
    condition: 'custom',
    target: 15,
  },
  legolas_archer: {
    id: 'legolas_archer',
    name: 'Arquero Élfico',
    desc: 'Completa 15 olas con Legolas',
    emoji: '🎯',
    condition: 'custom',
    target: 15,
  },
  speedrun: {
    id: 'speedrun',
    name: 'Velocista',
    desc: 'Completa 10 olas en menos de 15 minutos',
    emoji: '⚡',
    condition: 'custom',
    target: 0,
  },
}

export const checkAchievements = (
  stats: any,
  newAchievements: Set<string>
): string[] => {
  const unlocked: string[] = []

  // First Blood
  if (stats.totalKills >= 1 && !newAchievements.has('first_blood')) {
    unlocked.push('first_blood')
  }

  // Wave Survivor
  if (stats.totalWaves >= 5 && !newAchievements.has('wave_survivor')) {
    unlocked.push('wave_survivor')
  }

  // Wave Master
  if (stats.totalWaves >= 20 && !newAchievements.has('wave_master')) {
    unlocked.push('wave_master')
  }

  // Slayer
  if (stats.totalKills >= 100 && !newAchievements.has('slayer')) {
    unlocked.push('slayer')
  }

  // Warrior
  if (stats.totalKills >= 500 && !newAchievements.has('warrior')) {
    unlocked.push('warrior')
  }

  // Marathon
  if (stats.timePlayed >= 10 && !newAchievements.has('marathon')) {
    unlocked.push('marathon')
  }

  return unlocked
}
