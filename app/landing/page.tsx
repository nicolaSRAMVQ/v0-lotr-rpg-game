'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Stats {
  totalWaves: number
  totalKills: number
  totalDeaths: number
  timePlayed: number
  favoriteChar: string
  highScores: Array<{ char: string; wave: number; kills: number }>
}

export default function Landing() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [selectedChar, setSelectedChar] = useState<string>('frodo')
  const [showStats, setShowStats] = useState(false)

  const CHARS = {
    frodo: { name: 'Frodo', desc: 'Pequeño pero valiente. +5% velocidad, vulnerabilidad media.', emoji: '🧝' },
    aragorn: { name: 'Aragorn', desc: 'Ranger legendario. Equilibrio perfecto, +10% daño crítico.', emoji: '🗡️' },
    gandalf: { name: 'Gandalf', desc: 'Mago poderoso. Hechizos devastadores, velocidad baja.', emoji: '🧙' },
    legolas: { name: 'Legolas', desc: 'Arquero élfico. Máximo rango, velocidad de ataque lenta.', emoji: '🏹' },
    gimli: { name: 'Gimli', desc: 'Enano guerrero. Daño máximo, armadura pesada.', emoji: '🪓' },
  }

  useEffect(() => {
    const saved = localStorage.getItem('lotr_stats')
    if (saved) {
      try {
        setStats(JSON.parse(saved))
      } catch (e) {}
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1410] via-[#2d2416] to-[#1a1410] text-[#e8dcc8] font-mono overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;utf8,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect fill="%23c8a84b" x="10" y="10" width="8" height="8" opacity="0.5"/></svg>')] animate-pulse"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-[#c8a84b] mb-2 drop-shadow-lg">
            THE FELLOWSHIP
          </h1>
          <p className="text-[#a0956b] text-lg">Una aventura en la Tierra Media</p>
        </div>

        {/* Main Content Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-6xl">
          {/* Character Selection */}
          <div className="lg:col-span-2">
            <div className="bg-[rgba(45,36,22,0.8)] border-2 border-[#c8a84b] rounded-lg p-6">
              <h2 className="text-2xl font-bold text-[#c8a84b] mb-6">Elige tu Personaje</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {Object.entries(CHARS).map(([key, char]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedChar(key)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedChar === key
                        ? 'border-[#c8a84b] bg-[rgba(200,168,75,0.2)]'
                        : 'border-[#5a6a3a] hover:border-[#8a9a5a]'
                    }`}
                  >
                    <div className="text-4xl mb-2">{char.emoji}</div>
                    <div className="font-bold text-sm">{char.name}</div>
                  </button>
                ))}
              </div>

              {/* Character Info */}
              <div className="bg-[rgba(0,0,0,0.3)] border-l-4 border-[#c8a84b] p-4 mb-6">
                <h3 className="font-bold text-[#c8a84b] mb-2">{CHARS[selectedChar as keyof typeof CHARS].name}</h3>
                <p className="text-sm text-[#a0956b]">{CHARS[selectedChar as keyof typeof CHARS].desc}</p>
              </div>

              {/* Play Button */}
              <Link
                href={`/game?char=${selectedChar}`}
                className="w-full block text-center bg-[#c8a84b] text-[#1a1410] py-3 rounded-lg font-bold hover:bg-[#d4b86b] transition-all text-lg"
              >
                ▶ COMENZAR AVENTURA
              </Link>
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-[rgba(45,36,22,0.8)] border-2 border-[#5a6a3a] rounded-lg p-6">
              <button
                onClick={() => setShowStats(!showStats)}
                className="w-full text-left font-bold text-[#c8a84b] mb-4 hover:text-[#d4b86b] transition"
              >
                {showStats ? '▼' : '▶'} Estadísticas
              </button>

              {showStats && stats && (
                <div className="space-y-3 text-sm">
                  <div className="border-b border-[#5a6a3a] pb-2">
                    <div className="text-[#a0956b]">Olas Completadas</div>
                    <div className="text-[#c8a84b] font-bold">{stats.totalWaves}</div>
                  </div>
                  <div className="border-b border-[#5a6a3a] pb-2">
                    <div className="text-[#a0956b]">Enemigos Derrotados</div>
                    <div className="text-[#c8a84b] font-bold">{stats.totalKills}</div>
                  </div>
                  <div className="border-b border-[#5a6a3a] pb-2">
                    <div className="text-[#a0956b]">Vidas Perdidas</div>
                    <div className="text-[#c83030] font-bold">{stats.totalDeaths}</div>
                  </div>
                  <div className="border-b border-[#5a6a3a] pb-2">
                    <div className="text-[#a0956b]">Tiempo Jugado</div>
                    <div className="text-[#c8a84b] font-bold">{Math.floor(stats.timePlayed / 60)}h</div>
                  </div>
                  {stats.favoriteChar && (
                    <div>
                      <div className="text-[#a0956b]">Favorito</div>
                      <div className="text-[#c8a84b] font-bold">{stats.favoriteChar}</div>
                    </div>
                  )}
                </div>
              )}

              {!stats && showStats && (
                <div className="text-[#a0956b] text-sm text-center py-4">
                  Sin estadísticas aún.
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-[rgba(90,106,58,0.2)] border-2 border-[#5a6a3a] rounded-lg p-4 mt-6 text-xs">
              <div className="font-bold text-[#a0956b] mb-2">OBJETIVO</div>
              <p className="text-[#8a9a6a]">Sobrevive todas las oleadas de Nazgúl. Recluta aliados. ¡Gana!</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-[#5a6a3a] text-sm">
          <p>v2.0 - Build with ❤️ for Middle Earth</p>
        </div>
      </div>
    </div>
  )
}
