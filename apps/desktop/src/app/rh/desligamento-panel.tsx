/**
 * Desligamento na tela de RH (rodada 203).
 *
 * A r187 implementou a regra, a r191 o canal, a r202 o wrapper em `src/api`. Faltava a tela — o mesmo caminho da
 * cotacao, um dominio ao lado.
 *
 * O QUE ESTA SECAO NAO FAZ
 *
 * Nao desliga ninguem. Ela responde "pode encerrar?" e "o que falta", que sao as duas perguntas que o RH precisa
 * antes de assinar. Quem decide e uma pessoa: um botao que demite por clique seria pior que nao ter botao.
 */

import { useState } from 'react'

import { avaliarOffboarding, type ItemDevolucao, type ResultadoOffboarding } from '@/api/hr'

import { Button } from '@/components/ui/button'

export interface DesligamentoPanelProps {
  copy: {
    blocked: string
    checkAll: string
    done: string
    hint: string
    pending: string
    title: string
  }
}

/** Os seis itens, na ordem em que o RH costuma conferir. */
const ITENS: { id: ItemDevolucao; label: string }[] = [
  { id: 'acesso_sistemas', label: 'Acesso a sistemas' },
  { id: 'cracha', label: 'Cracha' },
  { id: 'equipamento', label: 'Equipamento' },
  { id: 'ferramentas', label: 'Ferramentas' },
  { id: 'veiculo', label: 'Veiculo' },
  { id: 'documentos_confidenciais', label: 'Documentos confidenciais' }
]

/**
 * O id cru nao pode chegar na tela: "documentos_confidenciais" e nome de campo, nao de coisa.
 * A r203 fotografou exatamente isso antes de corrigir.
 */
function rotuloDe(item: string): string {
  return ITENS.find(i => i.id === item)?.label ?? item
}

export function DesligamentoPanel({ copy }: DesligamentoPanelProps) {
  const [concluidos, setConcluidos] = useState<ItemDevolucao[]>([])
  const [resultado, setResultado] = useState<null | ResultadoOffboarding>(null)
  const [error, setError] = useState('')

  const alternar = (item: ItemDevolucao) => {
    setConcluidos(concluidos.includes(item) ? concluidos.filter(i => i !== item) : [...concluidos, item])
    setResultado(null)
  }

  const avaliar = async () => {
    setError('')

    try {
      setResultado(await avaliarOffboarding(ITENS.map(i => i.id), concluidos))
    } catch {
      // Falha do canal nao pode derrubar a tela de RH inteira.
      setError(copy.hint)
    }
  }

  return (
    <section className="grid gap-3 rounded-lg border border-(--ui-border) p-4">
      <h2 className="text-[length:var(--conversation-caption-font-size)] font-medium text-foreground">{copy.title}</h2>
      <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.hint}</p>

      <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {ITENS.map(item => (
          <label
            className="flex items-center gap-2 text-[length:var(--conversation-caption-font-size)] text-foreground"
            key={item.id}
          >
            <input checked={concluidos.includes(item.id)} onChange={() => alternar(item.id)} type="checkbox" />
            {item.label}
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void avaliar()}>{copy.checkAll}</Button>
        <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          {concluidos.length} de {ITENS.length}
        </span>
      </div>

      {error ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)">{error}</p>
      ) : null}

      {resultado?.pode_encerrar ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-success,var(--ui-text-tertiary))">
          {copy.done}
        </p>
      ) : null}

      {resultado && !resultado.pode_encerrar ? (
        <div className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
          <p className="text-foreground">
            {copy.pending}: {resultado.pendentes.map(rotuloDe).join(', ') || '—'}
          </p>
          {resultado.bloqueia_acesso ? (
            // Acesso pendente e a unica pendencia que continua permitindo agir em nome da empresa.
            <p className="text-(--ui-danger)">{copy.blocked}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
