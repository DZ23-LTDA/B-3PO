import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { MODULOS_BUSCAVEIS } from '@/lib/b3po-modulos'
import { buscarModulos, moverSelecao, semResultado } from '@/lib/global-search'

/**
 * Busca.
 *
 * O §13:450 (r98 do GOAL V2): *"Busca global deve encontrar funções sem exigir conhecimento do menu."*
 *
 * A FRASE QUANDO NÃO ACHA É O PONTO
 *
 * O catálogo desta busca é **o menu do produto** (22 módulos). O **CRM não está nele** — vem do menu do
 * núcleo (r94). Quem procura "cliente" e não acha precisa saber **que existe algo parecido em outro lugar**,
 * senão a busca vira um beco sem saída com uma frase educada.
 *
 * Por isso o "sem resultado" desta tela **não é o genérico**: ele diz o que tentar **e** que há módulos fora
 * deste catálogo.
 *
 * O TECLADO É O CAMINHO PRINCIPAL
 *
 * Quem procura um módulo pelo nome já está com a mão no teclado. A lista responde a setas e Enter, e o campo
 * recebe o foco ao abrir — **sem clique**.
 */
export function BuscaView() {
  const [termo, setTermo] = useState('')
  const [selecionado, setSelecionado] = useState(0)
  const navegar = useNavigate()
  const campo = useRef<HTMLInputElement>(null)

  const resultados = useMemo(() => buscarModulos(MODULOS_BUSCAVEIS, termo), [termo])

  // O foco vai para o campo ao abrir: uma busca que exige um clique antes de digitar é uma busca que
  // perdeu o ponto.
  useEffect(() => {
    campo.current?.focus()
  }, [])

  // O índice não pode apontar para fora depois que a lista encolhe.
  useEffect(() => {
    setSelecionado(0)
  }, [termo])

  const abrir = (path: string) => {
    navegar(path)
  }

  const aoTeclar = (evento: React.KeyboardEvent) => {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault()
      setSelecionado(moverSelecao(selecionado, 1, resultados.length))
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault()
      setSelecionado(moverSelecao(selecionado, -1, resultados.length))
    } else if (evento.key === 'Enter') {
      evento.preventDefault()

      const alvo = resultados[selecionado]

      if (alvo) abrir(alvo.path)
    }
  }

  const grupos = [...new Set(resultados.map(r => r.grupo))]

  return (
    <main aria-label="Busca de módulos" className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">Busca</h1>
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          Encontre um módulo sem saber onde ele está no menu.
        </p>
      </header>

      <input
        className="w-full rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-3 py-2 text-foreground outline-none focus:border-(--ui-accent)"
        onChange={evento => setTermo(evento.target.value)}
        onKeyDown={aoTeclar}
        placeholder="cliente, caminhão, lgpd…"
        ref={campo}
        value={termo}
      />

      {resultados.length === 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
            {semResultado(termo, MODULOS_BUSCAVEIS)}
          </p>
          {/* A lacuna do CRM, dita NA TELA: o catálogo é o menu do produto, e o CRM vem do núcleo. */}
          <p className="text-xs text-(--ui-text-tertiary)">
            O CRM e os módulos do runtime (Agentes do runtime, Mensageria, Tarefas agendadas) ficam no menu do
            núcleo, fora desta busca.
          </p>
        </div>
      ) : (
        <section className="rounded-lg border border-(--ui-border) p-2">
          <ul aria-label="Resultados" className="flex flex-col">
            {grupos.map(grupo => (
              <li key={grupo}>
                {/* O grupo é cabeçalho: o resultado precisa dizer ONDE o módulo mora. */}
                <span className="px-2 py-1 text-xs text-(--ui-text-tertiary)">{grupo}</span>
                <ul>
                  {resultados
                    .filter(r => r.grupo === grupo)
                    .map(r => {
                      const indice = resultados.indexOf(r)
                      const ativo = indice === selecionado

                      return (
                        <li key={r.path}>
                          <button
                            className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-xs ${
                              ativo ? 'bg-(--ui-bg-secondary) text-foreground' : 'text-(--ui-text-secondary)'
                            }`}
                            onClick={() => abrir(r.path)}
                            type="button"
                          >
                            <span>{r.label}</span>
                            {/* O motivo ajuda a entender um resultado que parece fora de lugar. */}
                            {r.motivo === 'sinonimo' ? (
                              <span className="text-(--ui-text-tertiary)">por sinônimo</span>
                            ) : null}
                          </button>
                        </li>
                      )
                    })}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-(--ui-text-tertiary)">↑ ↓ para escolher · Enter para abrir</p>
    </main>
  )
}
