// Canais do pedido do titular (LGPD).
//
// Sem estes canais, `exportarTitular` e `aplicarAnonimizacao` existem e ninguém alcança — o padrão das
// rodadas 45, 52, 62 e 70: backend pronto e nenhuma porta.
//
// DOIS CANAIS, DOIS RISCOS DIFERENTES
//
// `export` é leitura: pode ser chamado livremente. `anonymize` reescreve registros e não tem desfazer —
// por isso exige que o chamador confirme o alcance que viu. A confirmação não é burocracia: é o que
// separa "ver quantos registros existem" de "apagar sem saber quantos eram".
//
// r3 do GOAL V2: os três canais passam pela guarda. O inventário da r2 mostrou que `privacy` era um dos
// oito arquivos de domínio com canal exposto — e aqui o canal é `anonymize`, que não tem desfazer. Um
// pedido de titular de dados (LGPD) é operação de negócio, não de plataforma: precisa de ator.

import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import { aplicarAnonimizacao, exportarTitular, preverEliminacao, type PrivacyWriteDeps } from './privacy'
import type { Actor } from './rbac'

export interface PrivacyDeps {
  store: PrivacyWriteDeps

  /**
   * Ator resolvido no processo principal. `null` recusa.
   *
   * Obrigatório de propósito: um parâmetro opcional com default "sem guarda" é pior que não ter guarda,
   * porque parece protegido. Quem monta tem de resolver a identidade — e no B-3PO ela vem do dono da
   * instalação (`erp-ipc` já faz `ensureOwner` + `primaryOwner`).
   */
  actorOf: () => Promise<Actor | null>
}

export function registerPrivacyIpc(ipcMain: IpcRegistrar, deps: PrivacyDeps): void {
  ipcMain.handle(
    'hermes:privacy:export',
    async (_event: unknown, telefone: unknown): Promise<unknown> =>
      exigirAtor(deps.actorOf, 'read', 'privacy', async () => exportarTitular(telefone, deps.store))
  )

  ipcMain.handle(
    'hermes:privacy:preview',
    async (_event: unknown, telefone: unknown): Promise<unknown> =>
      exigirAtor(deps.actorOf, 'read', 'privacy', async () => preverEliminacao(telefone, deps.store))
  )

  /**
   * Executa o pedido. Exige `{ telefone, confirmar: true }`.
   *
   * A flag existe para que a tela não possa chamar por acidente: um botão sem confirmação explícita
   * apagaria o titular num clique errado, e não há lixeira.
   *
   * Ação `execute` — não `read`. Anonimizar altera o dado do titular; quem só pode ler não deve poder
   * apagar. A guarda roda ANTES da validação do payload: sem ator, a resposta é `sem_permissao` e nem
   * se avalia se o pedido estava bem formado.
   */
  ipcMain.handle(
    'hermes:privacy:anonymize',
    async (_event: unknown, payload: unknown): Promise<unknown> =>
      exigirAtor(deps.actorOf, 'execute', 'privacy', async () => {
        if (!payload || typeof payload !== 'object') return { error: 'pedido_invalido' }

        const p = payload as Record<string, unknown>

        if (p['confirmar'] !== true) return { error: 'confirmacao_obrigatoria' }

        return aplicarAnonimizacao(p['telefone'], deps.store)
      })
  )
}
