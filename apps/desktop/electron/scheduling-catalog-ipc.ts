// Agendamento que exige o catálogo.
//
// O canal `hermes:scheduling:book` continua aceitando texto livre (ha dados e telas que dependem
// dele). Este canal e o caminho novo: resolve o servico no catalogo, **deriva** o fim do horario da
// duracao real e leva o preco junto. Quem quer agendamento honesto usa este.
//
// A escolha de um canal separado em vez de mudar o `book` e deliberada: mudar o contrato existente
// quebraria agendamentos ja gravados e a tela atual, sem backup nem migracao. Um canal aditivo pode
// ser adotado e, quando o antigo nao tiver mais chamador, removido com seguranca.

import type { IpcMainInvokeEvent } from 'electron'

import type { IpcRegistrar } from './ipc-types'
import { linkService } from './scheduling-service-link'
import type { Service } from './services-store'

export interface SchedulingBookLike {
  book: (input: unknown) => Promise<unknown>
}

export interface SchedulingCatalogDeps {
  scheduling: SchedulingBookLike
  services: { list: (tenantId?: string) => Promise<Service[]> }
}

export function registerSchedulingCatalogIpc(ipcMain: IpcRegistrar, deps: SchedulingCatalogDeps): void {
  ipcMain.handle(
    'hermes:scheduling:bookFromCatalog',
    async (_event: IpcMainInvokeEvent, payload: unknown): Promise<unknown> => {
      const entrada = (payload ?? {}) as Record<string, unknown>
      const catalogo = await deps.services.list()

      const resolvido = linkService(
        { ends_at: entrada['ends_at'], service: entrada['service'], starts_at: entrada['starts_at'] },
        catalogo
      )

      if ('error' in resolvido) {
        return resolvido
      }

      // O `ends_at` do chamador e descartado: quem manda e a duracao do catalogo.
      return deps.scheduling.book({
        ...entrada,
        ends_at: resolvido.linked.ends_at,
        price_cents: resolvido.linked.price_cents,
        service: resolvido.linked.service,
        service_id: resolvido.linked.service_id,
        starts_at: resolvido.linked.starts_at
      })
    }
  )
}
