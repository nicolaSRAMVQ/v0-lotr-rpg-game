import { useState, useEffect, useCallback } from 'react'

export interface GameStats {
  totalWaves: number
  totalKills: number
  totalDeaths: number
  timePlayed: number
  favoriteChar: string
  lastPlayedChar: string
  highScores: Array<{
    char: string
    wave: number
    kills: number
    timestamp: number
  }>
  achievements: string[]
}

const DEFAULT_STATS: GameStats = {
  totalWaves: 0,
  totalKills: 0,
  totalDeaths: 0,
  timePlayed: 0,
  favoriteChar: '',
  lastPlayedChar: 'frodo',
  highScores: [],
  achievements: [],
}

export const useGameStats = () => {
  const [stats, setStats] = useState<GameStats>(DEFAULT_STATS)
  const [loaded, setLoaded] = useState(false)

  // Cargar stats del localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lotr_game_stats')
    if (saved) {
      try {
        setStats(JSON.parse(saved))
      } catch (e) {
        console.log('[v0] Error loading stats:', e)
      }
    }
    setLoaded(true)
  }, [])

  // Guardar stats en localStorage cuando cambien
  useEffect(() => {
    if (loaded) {
      localStorage.setItem('lotr_game_stats', JSON.stringify(stats))
    }
  }, [stats, loaded])

  // Agregar ola completada
  const addWave = useCallback((char: string, kills: number) => {
    setStats(prev => ({
      ...prev,
      totalWaves: prev.totalWaves + 1,
      totalKills: prev.totalKills + kills,
      lastPlayedChar: char,
      favoriteChar: prev.favoriteChar || char,
      highScores: [
        {
          char,
          wave: prev.totalWaves + 1,
          kills,
          timestamp: Date.now(),
        },
        ...prev.highScores,
      ].slice(0, 10), // Top 10
    }))
  }, [])

  // Agregar muerte
  const addDeath = useCallback(() => {
    setStats(prev => ({
      ...prev,
      totalDeaths: prev.totalDeaths + 1,
    }))
  }, [])

  // Aumentar tiempo de juego
  const addPlayTime = useCallback((minutes: number) => {
    setStats(prev => ({
      ...prev,
      timePlayed: prev.timePlayed + minutes,
    }))
  }, [])

  // Agregar achievement
  const addAchievement = useCallback((achievementId: string) => {
    setStats(prev => {
      if (prev.achievements.includes(achievementId)) return prev
      return {
        ...prev,
        achievements: [...prev.achievements, achievementId],
      }
    })
  }, [])

  // Resetear stats
  const resetStats = useCallback(() => {
    setStats(DEFAULT_STATS)
    localStorage.removeItem('lotr_game_stats')
  }, [])

  return {
    stats,
    loaded,
    addWave,
    addDeath,
    addPlayTime,
    addAchievement,
    resetStats,
  }
}
