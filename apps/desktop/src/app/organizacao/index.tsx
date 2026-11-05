import { useCallback, useEffect, useState } from 'react'

import {
  definirEstrutura,
  estruturaDaEmpresa,
  estruturasDefinidas,
  organizacaoDisponivel,
  organizacaoErroText,
  resumoDaEstrutura,
  sugestaoDoSetor,
  type DepartamentoRow,
  type EstruturaRow,
  type SugestaoRow
} from '@/api/organizacao'
import { Button } from '@/components/ui/button'

/**
 * Estrutura da organização.
 *
 * O DESENHO DA EMPRESA (r91 do GOAL V2) — e o tipo que fecha os três do §12.
 *
 * O QUE ESTA TELA NÃO É
 *
 * **Não é o cadastro.** Nome, CNPJ e endereço vivem em `companies-store`; aqui mora **quem faz o quê**. A
 * separação é a da r88: **cadastro muda quando a empresa muda; desenho muda quando a operação muda**.
 *
 * A SUGESTÃO VEM DO PROCESSO PRINCIPAL
 *
 * Escolher "Distribuidora de gás" **pergunta** ao processo principal, em vez de ler um catálogo embutido no
 * bundle. Se o produto mudar a sugestão, esta tela muda junto — **sem precisar de build**.
 *
 * E O SETOR DESCONHECIDO É DITO
 *
 * O produto conhece três setores. Para qualquer outro, a tela **não inventa**: diz que não conhece e deixa a
 * pessoa montar à mão.
 */
export function OrganizacaoView() {
  const [estruturas, setEstruturas] = useState<EstruturaRow[]>([])
  const [companyId, setCompanyId] = useState('')
  const [setor, setSetor] = useState('distribuidora_gas')
  const [sugestao, setSugestao] = useState<SugestaoRow>({ departamentos: null, setores: [] })
  const [departamentos, setDepartamentos] = useState<DepartamentoRow[]>([])
  const [falha, setFalha] = useState('')
  const [aviso, setAviso] = useState('')

  const disponivel = organizacaoDisponivel()

  const carregar = useCallback(async () => {
    setEstruturas(await estruturasDefinidas())
  }, [])

  useEffect(() => {
    if (!disponivel) return

    void carregar()
  }, [carregar, disponivel])

  // A sugestão é buscada quando o setor muda — e é o processo principal quem responde.
  useEffect(() => {
    if (!disponivel) return

    void (async () => {
      const s = await sugestaoDoSetor(setor)

      setSugestao(s)
      // Copiar para o editor: a pessoa pode ajustar a sugestão, e ajustar é o ponto.
      setDepartamentos(s.departamentos ?? [])
    })()
  }, [setor, disponivel])

  const carregarDaEmpresa = async () => {
    setFalha('')
    setAviso('')

    if (!companyId.trim()) {
      setFalha(organizacaoErroText('company_obrigatoria'))

      return
    }

    const e = await estruturaDaEmpresa(companyId)

    if (!e) {
      // `null` é resposta: ninguém desenhou ainda. Vai direto para a sugestão, sem erro.
      setAviso('Esta empresa ainda não tem estrutura. Escolha um setor e ajuste a sugestão.')

      return
    }

    setSetor(e.setor)
    setDepartamentos(e.departamentos)
    setAviso(`Estrutura carregada: ${resumoDaEstrutura(e)}`)
  }

  const salvar = async () => {
    setFalha('')
    setAviso('')

    const r = await definirEstrutura(companyId, { departamentos, setor })

    if ('error' in r) {
      setFalha(organizacaoErroText(r.error))
    } else {
      setEstruturas(r.estruturas)
      setAviso(`Salvo: ${resumoDaEstrutura(r.estrutura)}`)
    }
  }

  const ajustar = (indice: number, campo: 'faz' | 'nome', valor: string) => {
    setDepartamentos(departamentos.map((d, i) => (i === indice ? { ...d, [campo]: valor } : d)))
  }

  const remover = (indice: number) => {
    setDepartamentos(departamentos.filter((_, i) => i !== indice))
  }

  const adicionar = () => {
    setDepartamentos([...departamentos, { faz: '', nome: '' }])
  }

  if (!disponivel) {
    return (
      <main aria-label="Estrutura da organização" className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-foreground">Organização</h1>
        </header>
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          Organização indisponível neste ambiente.
        </p>
      </main>
    )
  }

  return (
    <main aria-label="Estrutura da organização" className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">Organização</h1>
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          Quem faz o quê. O desenho é diferente do cadastro: cadastro muda quando a empresa muda; isto muda
          quando a operação muda.
        </p>
      </header>

      <section className="rounded-lg border border-(--ui-border) p-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-(--ui-text-tertiary)">Empresa</span>
            <input
  aria-label="Empresa"
              className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
              onChange={event => setCompanyId(event.target.value)}
              placeholder="id da empresa"
              value={companyId}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-(--ui-text-tertiary)">Setor</span>
            <select
  aria-label="Setor"
              className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
              onChange={event => setSetor(event.target.value)}
              value={setor}
            >
              {sugestao.setores.map(s => (
                <option key={s.setor} value={s.setor}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <Button onClick={() => void carregarDaEmpresa()} variant="ghost">
              Carregar
            </Button>
          </div>
        </div>

        {/* O setor escolhido não tem sugestão: a tela DIZ isso em vez de mostrar uma lista vazia sem motivo. */}
        {sugestao.departamentos === null ? (
          <p className="mt-2 text-xs text-(--ui-text-tertiary)">
            O produto não conhece este setor — monte a estrutura à mão. É melhor que uma sugestão inventada.
          </p>
        ) : null}

        {falha ? <p className="mt-2 text-xs text-(--ui-warning)">{falha}</p> : null}
        {aviso ? <p className="mt-2 text-xs text-(--ui-text-tertiary)">{aviso}</p> : null}
      </section>

      <section className="rounded-lg border border-(--ui-border) p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-foreground">Departamentos</h2>
          <button
            className="rounded-md border border-(--ui-border) px-2 py-0.5 text-xs text-foreground hover:border-(--ui-accent)"
            onClick={adicionar}
            type="button"
          >
            + departamento
          </button>
        </div>

        <ul className="mt-2 flex flex-col gap-2">
          {departamentos.map((d, i) => (
            <li className="flex flex-wrap items-center gap-1" key={`${d.nome}-${i}`}>
              <input
                className="w-32 rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-0.5 text-xs text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => ajustar(i, 'nome', event.target.value)}
                placeholder="nome"
                value={d.nome}
              />
              <input
                className="w-72 rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-0.5 text-xs text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => ajustar(i, 'faz', event.target.value)}
                placeholder="o que ele entrega"
                value={d.faz}
              />
              {/* O aviso é ao lado do campo, não no rodapé: um departamento sem função é uma caixa. */}
              {d.faz.trim() ? null : <span className="text-xs text-(--ui-warning)">sem função</span>}
              <button
                className="rounded-md border border-(--ui-border) px-2 py-0.5 text-xs text-foreground hover:border-(--ui-accent)"
                onClick={() => remover(i)}
                type="button"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-3">
          <Button onClick={() => void salvar()} variant="ghost">
            Salvar estrutura
          </Button>
        </div>
      </section>

      {estruturas.length > 0 ? (
        <section className="rounded-lg border border-(--ui-border) p-4">
          <h2 className="text-sm font-medium text-foreground">Empresas com estrutura</h2>
          <ul className="mt-2 flex flex-col gap-1 text-xs text-(--ui-text-tertiary)">
            {estruturas.map(e => (
              <li key={e.company_id}>
                {e.company_id} · {resumoDaEstrutura(e)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  )
}
