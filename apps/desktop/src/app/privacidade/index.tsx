import { useCallback, useState } from 'react'

import {
  type AuditListing,
  auditoriaDisponivel,
  listarAuditoria,
  motivoLabel,
  quandoLabel,
  vereditoLabel
} from '@/api/auditoria'
import {
  anonymizeTitular,
  exportTitular,
  previewEliminacao,
  privacyAvailable,
  privacyErrorText,
  type PrivacyExport,
  type PrivacyTotals,
  type PrivacyResult
} from '@/api/privacy'

const ZERO: PrivacyTotals = { contatos: 0, conversas: 0, mensagens: 0, oportunidades: 0, tarefas: 0 }

function totaisDe(r: PrivacyResult): PrivacyTotals | null {
  if ('export' in r) return (r.export as PrivacyExport).totais
  if ('alcance' in r) return r.alcance as PrivacyTotals

  return null
}

/**
 * Pedido do titular (LGPD).
 *
 * Três passos, e cada um exige o anterior: buscar (o que existe), ver o alcance (o que a anonimização
 * tocaria), executar. O terceiro é destrutivo e não tem desfazer: ele só aparece depois que o alcance foi
 * visto, e o texto diz o que fica — o fato fiscal — para a confirmação ser informada.
 */
export function PrivacidadeView() {
  const [telefone, setTelefone] = useState('')
  const [totais, setTotais] = useState<PrivacyTotals | null>(null)
  const [exportado, setExportado] = useState<PrivacyExport | null>(null)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState(false)

  // r37 do GOAL V2: a trilha de auditoria, na mesma tela que trata dados pessoais.
  //
  // A trilha registra QUEM tentou o QUE sobre dados de QUEM. É o domínio de privacidade que olha para
  // isso primeiro: um admin lendo a trilha de `finance` veria decisões de um domínio que talvez não
  // governe.
  const [trilha, setTrilha] = useState<AuditListing | null>(null)
  const [trilhaErro, setTrilhaErro] = useState('')

  const carregarTrilha = useCallback(async () => {
    setTrilhaErro('')

    const r = await listarAuditoria(200)

    if (!r) {
      setTrilhaErro('Auditoria indisponível neste ambiente.')

      return
    }

    setTrilha(r)
  }, [])

  const disponivel = privacyAvailable()

  const limpar = () => {
    setTotais(null)
    setExportado(null)
    setErro('')
    setAviso('')
  }

  const buscar = useCallback(async () => {
    limpar()
    setOcupado(true)

    try {
      const r = await exportTitular(telefone)

      if ('error' in r) {
        setErro(privacyErrorText(r.error))

        return
      }

      setTotais(totaisDe(r))
      setExportado('export' in r ? r.export : null)
    } finally {
      setOcupado(false)
    }
  }, [telefone])

  const prever = useCallback(async () => {
    setAviso('')
    setOcupado(true)

    try {
      const r = await previewEliminacao(telefone)

      if ('error' in r) {
        setErro(privacyErrorText(r.error))

        return
      }

      setTotais(totaisDe(r))
      setAviso('Alcance consultado. Nada foi alterado.')
    } finally {
      setOcupado(false)
    }
  }, [telefone])

  const anonimizar = useCallback(async () => {
    setAviso('')
    setOcupado(true)

    try {
      const r = await anonymizeTitular(telefone)

      if ('error' in r) {
        setErro(privacyErrorText(r.error))

        return
      }

      if ('substituidos' in r) {
        setAviso(
          `${r.substituidos} registro(s) anonimizado(s). O telefone e o nome saíram; as vendas e lançamentos continuam com um identificador sem dono.`
        )
        setTotais(null)
        setExportado(null)
      }
    } finally {
      setOcupado(false)
    }
  }, [telefone])

  if (!disponivel) {
    return (
      <section className="b3po-page">
        <h1>Privacidade e dados pessoais</h1>
        <p>
          Esta versão do aplicativo não expõe o pedido do titular. Atualize o B-3PO para usar esta tela — o
          botão ficaria aqui sem executar nada.
        </p>
      </section>
    )
  }

  return (
    <section className="b3po-page">
      <h1>Privacidade e dados pessoais</h1>

      <p>
        Direitos do titular (LGPD, art. 18). A busca é por telefone: é o que liga a mesma pessoa entre o CRM,
        as conversas, as oportunidades e as tarefas.
      </p>

      <label>
        Telefone com DDD
        <input
          onChange={evento => {
            setTelefone(evento.target.value)
            limpar()
          }}
          placeholder="+55 11 99999-8888"
          value={telefone}
        />
      </label>

      <div className="b3po-actions">
        <button disabled={ocupado || !telefone} onClick={buscar} type="button">
          Buscar dados
        </button>
        <button disabled={ocupado || !telefone || !totais} onClick={prever} type="button">
          Ver alcance da anonimização
        </button>
      </div>

      {erro ? <p role="alert">{erro}</p> : null}
      {aviso ? <p role="status">{aviso}</p> : null}

      {exportado ? (
        <div>
          <h2>Dados encontrados</h2>
          <ul>
            <li>Contatos: {exportado.totais.contatos}</li>
            <li>Conversas: {exportado.totais.conversas}</li>
            <li>Mensagens: {exportado.totais.mensagens}</li>
            <li>Oportunidades: {exportado.totais.oportunidades}</li>
            <li>Tarefas: {exportado.totais.tarefas}</li>
          </ul>
        </div>
      ) : null}

      {totais ? (
        <div>
          <h2>Anonimizar</h2>
          <p>
            Some o que identifica a pessoa: nome, e-mail, empresa, etiquetas, texto das conversas, notas e
            títulos. <strong>Ficam as vendas e os lançamentos</strong>, com um identificador sem dono — uma
            venda é fato contábil e apagá-la quebraria o financeiro.
          </p>
          <p>Não há desfazer. O telefone e o nome não voltam.</p>
          <button disabled={ocupado} onClick={anonimizar} type="button">
            Anonimizar {totais.contatos + totais.conversas + totais.oportunidades + totais.tarefas} registro(s)
          </button>
        </div>
      ) : null}

      {/* r37 do GOAL V2: a trilha. O ledger existe desde a r35 e o canal desde a r36; sem esta seção ele
          existiria apenas para quem abrisse o JSON no disco. */}
      <div>
        <h2>Trilha de auditoria</h2>
        <p>
          Toda decisão de permissão — permitida ou negada — fica registrada. É prova, não diagnóstico: nenhuma
          entrada pode ser apagada pela interface.
        </p>

        {/* O aviso vem ANTES da lista, e por um motivo: uma lista que começa na "mais antiga que restou"
            sem dizer que houve perda daria a impressão de histórico completo. */}
        {trilha && trilha.descartadas > 0 ? (
          <p>
            <strong>{trilha.descartadas}</strong> entrada(s) antiga(s) foram descartadas por limite de espaço. A
            lista abaixo <strong>não</strong> é o histórico completo.
          </p>
        ) : null}

        {trilhaErro ? <p>{trilhaErro}</p> : null}

        <button disabled={!auditoriaDisponivel()} onClick={() => void carregarTrilha()} type="button">
          Carregar trilha
        </button>

        {trilha && trilha.entries.length === 0 ? <p>Nenhuma decisão registrada ainda.</p> : null}

        {trilha && trilha.entries.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Quando</th>
                <th>Quem</th>
                <th>Ação</th>
                <th>Recurso</th>
                <th>Veredito</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {trilha.entries.map((e, i) => (
                <tr key={i}>
                  <td>{quandoLabel(e.at)}</td>
                  {/* `—` e não vazio: uma célula em branco parece dado que não carregou. */}
                  <td>{e.actorId || '—'}</td>
                  <td>{e.action}</td>
                  <td>{e.resource}</td>
                  <td>{vereditoLabel(e.allowed)}</td>
                  <td>{motivoLabel(e.reason)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </section>
  )
}
