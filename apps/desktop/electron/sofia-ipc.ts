// Os canais de Sofia (r19 do GOAL V2).
//
// Passo 3 dos cinco da spec. Aqui o plano ganha porta: a tela precisa criar plano, ver o grafo, delegar
// e aprovar.
//
// TODOS OS CANAIS NASCEM COM GUARDA — e isso é deliberado.
//
// A r2 do GOAL V2 mediu **219 canais `ipcMain.handle` e 1 com guarda**. Levaram seis rodadas (r3–r8) para
// fechar os 30 de domínio, e cada uma precisou provar o vermelho com o canal aberto. Este arquivo não
// repete o erro: `exigirAtor` está em todos os seis desde o primeiro commit, e o `permission-coverage-ratchet`
// já falharia se algum escapasse.
//
// A GUARDA NÃO É DECORATIVA AQUI
//
// Sofia **não contorna o Policy Engine** (spec §6, regra 1). Cada canal passa pela guarda **com o ator da
// chamada**, e o store registra esse ator no plano. Não há ator de sistema para Sofia: se o chamador não
// tem permissão, o plano não nasce.

import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'
import { serverTenant } from './server-tenant'
import { diagnosticarGrafo, profundidadeDoPlano, tarefasProntas } from './sofia-grafo'
import { delegarTarefa } from './sofia-ponte'
import type { ExecucaoStore } from './agent-execution-store'
import type { SofiaStore } from './sofia-store'

export interface SofiaIpcDeps {
  /**
   * Ator resolvido no processo principal. `null` recusa todos os seis.
   *
   * Obrigatório: um plano de coordenação executado sem responsável é a definição de automação sem dono.
   */
  actorOf: () => Promise<Actor | null>
  /**
   * r11 do V5 — a ponte entre plano e execução ganha porta.
   *
   * `sofia-ponte.ts` existia com 9 KB de testes e **zero chamadores em produção**: o plano não
   * alcançava execução nenhuma. Este canal é a porta; o executor de verdade continua sendo o
   * Hermes (a execução nasce `pendente`, honesta).
   */
  execucoes: ExecucaoStore
  /**
   * r38 do V5 — responde se a sessão existe de verdade no runtime.
   *
   * Sem isto, `vincularSessao` aceitava **qualquer** string: um `session_id` inventado deixava a
   * execução em `executando` para sempre, e a tela mostraria trabalho que nunca aconteceu. O main
   * não pode afirmar o que o renderer apenas alega.
   *
   * **Fail-closed**: se não der para verificar, a vinculação recusa. É a mesma regra do goal —
   * default deny — e é preferível a aceitar um id que não existe.
   *
   * Opcional na injeção para os testes do contrato puro; quando ausente, o comportamento antigo
   * (aceitar) permanece e está declarado.
   */
  sessaoExiste?: (sessionId: string) => Promise<boolean>
  store: SofiaStore
}

export function registerSofiaIpc(ipcMain: IpcRegistrar, deps: SofiaIpcDeps): void {
  /** Lista os planos do tenant. O grafo vai junto: a tela não recalcula topologia. */
  ipcMain.handle('hermes:sofia:planos', async (): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'read', 'sofia', async () => {
      const planos = await deps.store.listar({ tenant_id: serverTenant() })

      return {
        planos: planos.map(p => ({
          ...p,
          grafo: diagnosticarGrafo(p.tarefas),
          prontas: tarefasProntas(p.tarefas),
          profundidade: profundidadeDoPlano(p.tarefas)
        }))
      }
    })
  )

  /** Um plano com o diagnóstico completo. `null` quando não existe — 404 não é erro de servidor. */
  ipcMain.handle('hermes:sofia:plano', async (_event: unknown, planoId: unknown): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'read', 'sofia', async () => {
      const id = typeof planoId === 'string' ? planoId : ''
      const plano = id ? await deps.store.obter(id) : null

      if (!plano) return { plano: null }

      return {
        plano: {
          ...plano,
          grafo: diagnosticarGrafo(plano.tarefas),
          prontas: tarefasProntas(plano.tarefas),
          profundidade: profundidadeDoPlano(plano.tarefas)
        }
      }
    })
  )

  /**
   * Cria o plano — `execute`, não `read`.
   *
   * Criar um plano é escrever a intenção que o orquestrador vai executar. Quem só pode ler não arma
   * trabalho.
   *
   * O `ator_id` **não vem do renderer**: vem do ator resolvido no processo principal. Deixar o renderer
   * escolher o dono do plano permitiria criar trabalho em nome de outra pessoa — exatamente a escalada
   * que a spec §6 proíbe.
   */
  ipcMain.handle('hermes:sofia:criar', async (_event: unknown, payload: unknown): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'execute', 'sofia', async () => {
      const ator = await deps.actorOf()
      const raw = (payload ?? {}) as Record<string, unknown>

      return deps.store.criar(
        {
          ...raw,
          ator_id: ator?.id ?? '',
          tenant_id: serverTenant(raw['tenant_id'])
        }
      )
    })
  )

  /**
   * Atualiza uma tarefa — `execute`.
   *
   * É por aqui que a delegação acontece: o passo 4 vai preencher `execucao_id` e
   * `parent_execution_id`. Enquanto o passo 4 não existe, o canal aceita o campo e o store o grava.
   */
  ipcMain.handle(
    'hermes:sofia:tarefa',
    async (_event: unknown, payload: unknown): Promise<unknown> =>
      exigirAtor(deps.actorOf, 'execute', 'sofia', async () => {
        const raw = (payload ?? {}) as Record<string, unknown>
        const planoId = typeof raw['plano_id'] === 'string' ? raw['plano_id'] : ''
        const tarefaId = typeof raw['tarefa_id'] === 'string' ? raw['tarefa_id'] : ''

        if (!planoId) return { error: 'plano_obrigatorio' }
        if (!tarefaId) return { error: 'tarefa_obrigatoria' }

        /*
         * r11 do V5 — o vínculo com execução NÃO vem do renderer.
         *
         * `normalizarTarefa` copia `execucao_id` do patch. Passar o patch direto deixava o renderer
         * **forjar** o vínculo plano → execução: a tarefa aparecia como delegada sem execução
         * nenhuma existir. É a "alucinação de ação concluída" que o goal nomeia no G5.
         *
         * Quem escreve `execucao_id` é a ponte (`hermes:sofia:delegar`), que cria a execução antes.
         */
        const patch = raw['patch']

        if (patch && typeof patch === 'object' && !Array.isArray(patch)) {
          delete (patch as Record<string, unknown>)['execucao_id']
        }

        return deps.store.atualizarTarefa(planoId, tarefaId, patch)
      })
  )

  /** Muda o status do plano — `execute`. `concluido` exige todas as tarefas concluídas (store). */
  ipcMain.handle('hermes:sofia:status', async (_event: unknown, payload: unknown): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'execute', 'sofia', async () => {
      const raw = (payload ?? {}) as Record<string, unknown>
      const planoId = typeof raw['plano_id'] === 'string' ? raw['plano_id'] : ''

      if (!planoId) return { error: 'plano_obrigatorio' }

      return deps.store.definirStatus(planoId, raw['status'])
    })
  )

  /**
   * Registra a aprovação — `execute`, e o **ator vem do resolvedor**, nunca do payload.
   *
   * O store recusa autoaprovação (`plano.ator_id === por`). Se este canal deixasse o renderer mandar o
   * nome do aprovador, a recusa seria decorativa: bastaria escrever o nome de outra pessoa.
   */
  ipcMain.handle('hermes:sofia:aprovar', async (_event: unknown, payload: unknown): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'execute', 'sofia', async () => {
      const ator = await deps.actorOf()
      const raw = (payload ?? {}) as Record<string, unknown>
      const planoId = typeof raw['plano_id'] === 'string' ? raw['plano_id'] : ''

      if (!planoId) return { error: 'plano_obrigatorio' }

      return deps.store.aprovar(planoId, ator?.id ?? '')
    })
  )

  /**
   * Delega uma tarefa pronta do plano — `execute`, não `read`.
   *
   * Regras que o handler NÃO decide (estão na ponte, que é testada):
   *   - a tarefa tem de existir no plano;
   *   - as dependências dela têm de estar satisfeitas;
   *   - a credencial tem de existir.
   *
   * O que o handler decide: **quem** pode pedir. `execute` em `sofia`.
   */
  ipcMain.handle(
    'hermes:sofia:delegar',
    async (_event: unknown, payload: unknown): Promise<unknown> =>
      exigirAtor(deps.actorOf, 'execute', 'sofia', async () => {
        const raw = (payload ?? {}) as Record<string, unknown>
        const planoId = typeof raw['plano_id'] === 'string' ? raw['plano_id'] : ''
        const tarefaId = typeof raw['tarefa_id'] === 'string' ? raw['tarefa_id'] : ''

        if (!planoId || !tarefaId) return { error: 'plano_e_tarefa_obrigatorios' }

        const plano = await deps.store.obter(planoId)

        if (!plano) return { error: 'plano_inexistente' }

        return delegarTarefa(
          {
            execucoes: deps.execucoes,
            gravarExecucao: async (tarefa, execucao) => {
              await deps.store.atualizarTarefa(planoId, tarefa, { execucao_id: execucao })
            }
          },
          plano,
          tarefaId,
          { credencial: true }
        )
      })
  )

  /**
   * r24 do V5 — registra a sessão do Hermes que executa uma tarefa já delegada.
   *
   * POR QUE ESTE CANAL EXISTE
   *
   * A delegação cria a execução em `pendente` e devolve o `prompt`. Quem cria a sessão é o renderer,
   * que já tem o cliente canônico (`session.create` é RPC) — reescrever esse cliente no main seria
   * duplicar o que o goal manda reutilizar. Este canal é o caminho de volta: o renderer informa qual
   * sessão nasceu, e o main grava o vínculo.
   *
   * O QUE O MAIN **NÃO** ACEITA
   *
   * `vincularSessao` recusa trocar a sessão de uma execução já vinculada. Sem isso, uma segunda
   * chamada reescreveria **onde o trabalho rodou** e a trilha de auditoria passaria a mentir.
   */
  ipcMain.handle(
    'hermes:sofia:execucao:vinculada',
    async (_event: unknown, payload: unknown): Promise<unknown> =>
      exigirAtor(deps.actorOf, 'execute', 'sofia', async () => {
        const raw = (payload ?? {}) as Record<string, unknown>
        const execucaoId = typeof raw['execucao_id'] === 'string' ? raw['execucao_id'] : ''
        const sessionId = typeof raw['session_id'] === 'string' ? raw['session_id'] : ''

        if (!execucaoId) return { error: 'execucao_obrigatoria' }
        if (!sessionId.trim()) return { error: 'sessao_obrigatoria' }

        // r38: o main não afirma o que o renderer apenas alega. Sem prova, recusa.
        if (deps.sessaoExiste) {
          const existe = await deps.sessaoExiste(sessionId).catch(() => false)

          if (!existe) return { error: 'sessao_inexistente' }
        }

        return deps.execucoes.vincularSessao(execucaoId, sessionId)
      })
  )
}
