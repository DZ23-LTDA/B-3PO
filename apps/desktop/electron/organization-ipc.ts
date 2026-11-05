// Os canais da estrutura organizacional (r89 do GOAL V2).
//
// A regra (r81) e o disco (r88) existem. Este é o caminho até quem usa.
//
// POR QUE A SUGESTÃO É UM CANAL `read`
//
// `estruturaPara(setor)` devolve o desenho sugerido — **é função pura, sem disco**. Mas a tela não deve
// carregar o catálogo: se a sugestão mudar (outro setor, outro departamento), o renderer antigo continuaria
// mostrando a estrutura velha em cima de um disco novo.
//
// **Um canal `read` faz a tela sempre ver o catálogo atual** — e o custo é uma chamada IPC, não uma cópia
// desatualizada.
//
// POR QUE `definir` É `execute`
//
// Escrever o desenho de uma empresa **muda o que todo mundo vê** — não é consulta. E a guarda é a mesma dos
// outros domínios: `execute` no recurso `projects`, porque organização é trabalho, não configuração de tela.

import type { IpcRegistrar } from './ipc-types'
import { estruturaPara, isSetor, SETOR_LABEL, SETORES, type Departamento, type Setor } from './organization'
import type { EstruturaOrganizacional, OrganizationStore } from './organization-store'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'
import { serverTenant } from './server-tenant'

export interface OrganizationIpcDeps {
  /** Ator resolvido no processo principal. `null` recusa — o desenho da empresa não é público. */
  actorOf: () => Promise<Actor | null>
  store: OrganizationStore
}

type Recusa = { error: 'sem_permissao'; reason: string }

type Resultado<T> = Recusa | T

export function registerOrganizationIpc(ipcMain: IpcRegistrar, deps: OrganizationIpcDeps): void {
  /** A estrutura já definida de uma empresa. `null` quando não há desenho — e é resposta, não falha. */
  ipcMain.handle(
    'hermes:organizacao:estrutura',
    async (_event: unknown, companyId: unknown): Promise<Resultado<{ estrutura: EstruturaOrganizacional | null }>> =>
      exigirAtor(deps.actorOf, 'read', 'projects', async () => ({
        estrutura: await deps.store.porEmpresa(typeof companyId === 'string' ? companyId : '')
      }))
  )

  ipcMain.handle(
    'hermes:organizacao:listar',
    async (_event: unknown, tenantId: unknown): Promise<Resultado<{ estruturas: EstruturaOrganizacional[] }>> =>
      exigirAtor(deps.actorOf, 'read', 'projects', async () => ({
        estruturas: await deps.store.listar(serverTenant(tenantId))
      }))
  )

  /**
   * A sugestão para um setor.
   *
   * **Setor desconhecido devolve `null` e o catálogo** — em vez de uma estrutura inventada. A tela precisa
   * poder dizer *"não conheço este negócio, monte você"* **e** oferecer os que conhece.
   */
  ipcMain.handle(
    'hermes:organizacao:sugestao',
    async (
      _event: unknown,
      setor: unknown
    ): Promise<Resultado<{ departamentos: Departamento[] | null; setores: { label: string; setor: Setor }[] }>> =>
      exigirAtor(deps.actorOf, 'read', 'projects', async () => ({
        departamentos: estruturaPara(setor),
        // O catálogo vai junto: uma tela que só recebe `null` não sabe o que oferecer.
        setores: SETORES.map(s => ({ label: SETOR_LABEL[s], setor: s }))
      }))
  )

  /**
   * Define o desenho.
   *
   * **`companyId` vem em campo próprio**, e não do payload do desenho: são duas coisas, e juntá-las faria a
   * validação depender da forma do corpo.
   */
  ipcMain.handle(
    'hermes:organizacao:definir',
    async (
      _event: unknown,
      payload: unknown
    ): Promise<Resultado<{ error: string } | { estrutura: EstruturaOrganizacional; estruturas: EstruturaOrganizacional[] }>> =>
      exigirAtor(deps.actorOf, 'execute', 'projects', async () => {
        const raw = (payload ?? {}) as Record<string, unknown>
        const companyId = typeof raw['company_id'] === 'string' ? raw['company_id'] : ''
        const desenho = raw['desenho']
        const tenantId = serverTenant(raw['tenant_id'])

        // O desenho chega como objeto separado: se viesse achatado, `company_id` e `tenant_id` entrariam na
        // validação como se fossem campos de departamento.
        return deps.store.definir(companyId, desenho, tenantId)
      })
  )

  /** O setor é conhecido? — a tela pergunta antes de mostrar o formulário, e a resposta inclui o rótulo. */
  ipcMain.handle(
    'hermes:organizacao:setorConhecido',
    async (_event: unknown, setor: unknown): Promise<Resultado<{ conhecido: boolean; label: null | string }>> =>
      exigirAtor(deps.actorOf, 'read', 'projects', async () => ({
        conhecido: isSetor(setor),
        label: isSetor(setor) ? SETOR_LABEL[setor] : null
      }))
  )
}
