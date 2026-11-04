import { useCallback, useEffect, useState } from 'react'

import {
  STATUS_LABEL,
  approvePost,
  createCampaign,
  createPost,
  indicators,
  listCampaigns,
  listPosts,
  marketingAvailable,
  moneyLabel,
  percentLabel,
  type CampaignRow,
  type MarketingIndicators,
  type PostRow
} from '@/api/marketing'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { useI18n } from '@/i18n/context'

/**
 * Marketing.
 *
 * A tela separa dois assuntos que costumam ser misturados: **campanha** (dinheiro, métrica) e
 * **conteúdo** (calendário editorial). Cada um tem o seu estado vazio, porque "nenhuma campanha" e
 * "nenhum conteúdo" pedem ações diferentes.
 *
 * Não há botão de publicar. O status para em `aprovado` porque publicar exige integração real com a
 * API de cada canal — um botão que não publica de verdade ensina o usuário a não confiar na tela.
 */
export function MarketingView() {
  const { t } = useI18n()
  const copy = t.settings.marketing

  const [campanhas, setCampanhas] = useState<CampaignRow[] | null>(null)
  const [posts, setPosts] = useState<PostRow[] | null>(null)
  const [ind, setInd] = useState<MarketingIndicators | null>(null)
  const [failure, setFailure] = useState<null | string>(null)
  const [ocupado, setOcupado] = useState(false)

  const [nome, setNome] = useState('')
  const [conteudo, setConteudo] = useState('')

  const disponivel = marketingAvailable()

  const carregar = useCallback(async () => {
    try {
      setCampanhas(await listCampaigns())
      setPosts(await listPosts())
      setInd(await indicators())
      setFailure(null)
    } catch {
      setFailure(copy.loadFailed)
      setCampanhas([])
      setPosts([])
    }
  }, [copy.loadFailed])

  useEffect(() => {
    if (disponivel) void carregar()
  }, [carregar, disponivel])

  async function criarCampanha() {
    if (!nome.trim()) {
      setFailure(copy.nameRequired)

      return
    }

    setOcupado(true)

    try {
      // Sem data de fim: campanha aberta é válida; prazo inventado não é.
      const r = await createCampaign({ channel: 'instagram', name: nome.trim(), starts_at: Date.now() })

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

  async function criarConteudo() {
    if (!conteudo.trim()) {
      setFailure(copy.contentRequired)

      return
    }

    setOcupado(true)

    try {
      // O conteúdo nasce rascunho; aprovar exige data e é ato separado.
      const r = await createPost({ content: conteudo.trim(), scheduled_for: Date.now() + 86_400_000 })

      if ('error' in r) {
        setFailure(traduz(r.error, copy))
      } else {
        setConteudo('')
        await carregar()
      }
    } finally {
      setOcupado(false)
    }
  }

  async function aprovar(id: string) {
    setOcupado(true)

    try {
      const r = await approvePost(id)

      if ('error' in r) {
        setFailure(traduz(r.error, copy))
      } else {
        await carregar()
      }
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
          {ind ? (
            <div className="grid grid-cols-4 gap-3">
              <Cartao rotulo={copy.active} valor={String(ind.ativas)} />
              <Cartao destaque={ind.agendadasVencidas > 0} rotulo={copy.staleScheduled} valor={String(ind.agendadasVencidas)} />
              <Cartao rotulo={copy.leads} valor={String(ind.leads)} />
              <Cartao rotulo={copy.spend} valor={moneyLabel(ind.spendTotalCents)} />
            </div>
          ) : null}

          {ind && ind.agendadasVencidas > 0 ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-warning, #d09b2c)">
              {copy.staleScheduledHint}
            </p>
          ) : null}

          {failure ? <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)">{failure}</p> : null}

          <section className="flex flex-col gap-3 rounded-lg border border-(--ui-border) p-4">
            <h2 className="text-sm font-semibold text-foreground">{copy.campaigns}</h2>

            <div className="flex gap-2">
              <input
                className="flex-1 rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={e => setNome(e.target.value)}
                placeholder={copy.namePlaceholder}
                value={nome}
              />
              <Button disabled={ocupado} onClick={() => void criarCampanha()}>
                {copy.create}
              </Button>
            </div>

            {campanhas === null ? (
              <Loader />
            ) : campanhas.length === 0 ? (
              <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.noCampaigns}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {campanhas.map(c => (
                  <li className="flex items-center justify-between gap-3 rounded border border-(--ui-border) px-3 py-2" key={c.id}>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{c.name}</span>
                      <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                        {STATUS_LABEL[c.status]} · {c.channel} · CTR {percentLabel(c.ctr)} · {moneyLabel(c.spend_cents)}
                      </span>
                    </div>
                    {c.estourou ? (
                      <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-warning, #d09b2c)">
                        {copy.overBudget}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-(--ui-border) p-4">
            <h2 className="text-sm font-semibold text-foreground">{copy.editorial}</h2>

            <div className="flex gap-2">
              <input
                className="flex-1 rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={e => setConteudo(e.target.value)}
                placeholder={copy.contentPlaceholder}
                value={conteudo}
              />
              <Button disabled={ocupado} onClick={() => void criarConteudo()}>
                {copy.create}
              </Button>
            </div>

            {posts === null ? (
              <Loader />
            ) : posts.length === 0 ? (
              <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.noPosts}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {posts.map(p => (
                  <li className="flex items-center justify-between gap-3 rounded border border-(--ui-border) px-3 py-2" key={p.id}>
                    <div className="flex flex-col">
                      <span className="text-foreground">{p.content}</span>
                      <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                        {p.status === 'aprovado' ? copy.approved : copy.draft}
                      </span>
                    </div>
                    {p.status === 'rascunho' ? (
                      <Button disabled={ocupado} onClick={() => void aprovar(p.id)} variant="ghost">
                        {copy.approve}
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.noPublishNote}</p>
          </section>
        </>
      )}
    </div>
  )
}

function traduz(chave: string, copy: Record<string, string>): string {
  const mapa: Record<string, string> = {
    campanha_inexistente: copy['errCampaignMissing'] ?? chave,
    canal_invalido: copy['errChannel'] ?? chave,
    conteudo_obrigatorio: copy['errContent'] ?? chave,
    data_obrigatoria_para_aprovar: copy['errDateRequired'] ?? chave,
    fim_antes_do_inicio: copy['errEndBeforeStart'] ?? chave,
    inicio_obrigatorio: copy['errStart'] ?? chave,
    marketing_indisponivel: copy['unavailable'] ?? chave,
    nome_obrigatorio: copy['errName'] ?? chave,
    status_invalido: copy['errStatus'] ?? chave
  }

  return mapa[chave] ?? chave
}

function Cartao({ destaque, rotulo, valor }: { destaque?: boolean; rotulo: string; valor: string }) {
  return (
    <div
      className={
        destaque
          ? 'flex flex-col rounded-lg border border-(--ui-warning, #d09b2c) px-3 py-2'
          : 'flex flex-col rounded-lg border border-(--ui-border) px-3 py-2'
      }
    >
      <span className="text-lg font-semibold text-foreground">{valor}</span>
      <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{rotulo}</span>
    </div>
  )
}
