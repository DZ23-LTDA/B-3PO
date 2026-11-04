import { useCallback, useEffect, useState } from 'react'

import {
  TRIGGER_LABEL,
  automationsAvailable,
  createRule,
  listRules,
  listTools,
  listTriggers,
  setRuleActive,
  type AutomationRuleRow,
  type ToolOption
} from '@/api/automations'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { useI18n } from '@/i18n/context'

/**
 * Automações.
 *
 * Duas coisas que a tela deixa explícitas, porque errar qualquer uma cria regra que não roda:
 *
 * 1. **A ação vem do catálogo real** — não de uma lista escrita aqui. Se a ferramenta não existe, ela
 *    não aparece; se aparecesse, a regra salvaria e falharia em silêncio no disparo.
 * 2. **A regra roda com o ator escolhido**, não com o dono. Um ator sem escopo para a ação faz a regra
 *    falhar em toda execução, e o aviso diz isso antes de salvar.
 */
export function AutomacoesView() {
  const { t } = useI18n()
  const copy = t.settings.automacoes

  const [regras, setRegras] = useState<AutomationRuleRow[] | null>(null)
  const [gatilhos, setGatilhos] = useState<string[]>([])
  const [acoes, setAcoes] = useState<ToolOption[]>([])
  const [failure, setFailure] = useState<null | string>(null)
  const [ocupado, setOcupado] = useState(false)

  const [nome, setNome] = useState('')
  const [gatilho, setGatilho] = useState('venda.faturada')
  const [acao, setAcao] = useState('')

  const disponivel = automationsAvailable()

  const carregar = useCallback(async () => {
    try {
      const [r, g, a] = await Promise.all([listRules(), listTriggers(), listTools()])

      setRegras(r)
      setGatilhos(g)
      setAcoes(a)
      setAcao(atual => atual || (a[0]?.name ?? ''))
      setFailure(null)
    } catch {
      setFailure(copy.loadFailed)
      setRegras([])
    }
  }, [copy.loadFailed])

  useEffect(() => {
    if (disponivel) void carregar()
  }, [carregar, disponivel])

  async function criar() {
    if (!nome.trim() || !acao) {
      setFailure(copy.nameRequired)

      return
    }

    setOcupado(true)

    try {
      // O ator fica com o dono: e quem tem escopo para tudo. Trocar exige a tela de agentes.
      const r = await createRule({ action_name: acao, actor_id: 'owner', name: nome.trim(), trigger: gatilho })

      if ('error' in r) {
        setFailure(traduz(r.error, copy))
      } else {
        setNome('')
        await carregar()
      }
    } finally {
      setOcupado(false)
    }
  }

  async function alternar(id: string, ativo: boolean) {
    setOcupado(true)

    try {
      const r = await setRuleActive(id, ativo)

      if ('error' in r) setFailure(traduz(r.error, copy))
      else await carregar()
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">{copy.title}</h1>
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.hint}</p>
      </header>

      {!disponivel ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.unavailable}</p>
      ) : (
        <>
          <section className="flex flex-col gap-3 rounded-lg border border-(--ui-border) p-4">
            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.name}</span>
              <input
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={e => setNome(e.target.value)}
                value={nome}
              />
            </label>

            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.when}</span>
              <select
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={e => setGatilho(e.target.value)}
                value={gatilho}
              >
                {gatilhos.map(g => (
                  <option key={g} value={g}>
                    {TRIGGER_LABEL[g] ?? g}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.then}</span>
              <select
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={e => setAcao(e.target.value)}
                value={acao}
              >
                {acoes.map(a => (
                  <option key={a.name} value={a.name}>
                    {a.description}
                  </option>
                ))}
              </select>
              {acoes.length === 0 ? (
                <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-warning, #d09b2c)">
                  {copy.noActions}
                </span>
              ) : null}
            </label>

            <div className="flex items-center justify-between">
              <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                {copy.actorNote}
              </span>
              <Button disabled={ocupado || acoes.length === 0} onClick={() => void criar()}>
                {copy.create}
              </Button>
            </div>
          </section>

          {failure ? <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)">{failure}</p> : null}

          {regras === null ? (
            <Loader />
          ) : regras.length === 0 ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.empty}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {regras.map(r => (
                <li className="flex items-center justify-between gap-3 rounded-lg border border-(--ui-border) px-3 py-2" key={r.id}>
                  <div className="flex flex-col">
                    <span className={r.active ? 'font-medium text-foreground' : 'font-medium text-(--ui-text-tertiary)'}>
                      {r.name}
                      {r.active ? '' : ` · ${copy.inactive}`}
                    </span>
                    <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                      {TRIGGER_LABEL[r.trigger] ?? r.trigger} → {r.action_name}
                    </span>
                  </div>
                  <Button disabled={ocupado} onClick={() => void alternar(r.id, !r.active)} variant="ghost">
                    {r.active ? copy.disable : copy.enable}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function traduz(chave: string, copy: Record<string, string>): string {
  const mapa: Record<string, string> = {
    acao_obrigatoria: copy['errAction'] ?? chave,
    ator_obrigatorio: copy['errActor'] ?? chave,
    automacoes_indisponiveis: copy['unavailable'] ?? chave,
    gatilho_invalido: copy['errTrigger'] ?? chave,
    nome_obrigatorio: copy['nameRequired'] ?? chave,
    regra_duplicada: copy['errDuplicate'] ?? chave,
    regra_nao_encontrada: copy['errNotFound'] ?? chave,
    estado_invalido: copy['errState'] ?? chave
  }

  return mapa[chave] ?? chave
}
