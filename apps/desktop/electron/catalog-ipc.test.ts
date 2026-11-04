import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { CatalogStore, catalogStorePath, type Product } from './catalog-store'
import { registerCatalogIpc, type CatalogResult } from './catalog-ipc'
import { mountErpIpc } from './erp-ipc'

type Handler = (event: unknown, ...args: unknown[]) => unknown

/** `ipcMain` mínimo: guarda o handler por canal e permite invocá-lo como o Electron faria. */
function fakeIpc() {
  const handlers = new Map<string, Handler>()

  return {
    channels: () => [...handlers.keys()].sort(),
    handle: (channel: string, handler: Handler) => {
      handlers.set(channel, handler)
    },
    invoke: async (channel: string, ...args: unknown[]): Promise<unknown> => {
      const handler = handlers.get(channel)

      if (!handler) {
        throw new Error(`canal nao registrado: ${channel}`)
      }

      return handler(null, ...args)
    }
  }
}

async function withStore<T>(run: (store: CatalogStore) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-catalog-ipc-'))

  try {
    return await run(new CatalogStore(catalogStorePath(dir)))
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

describe('IPC do catalogo', () => {
  it('registra os tres canais e nada alem deles', () => {
    const ipc = fakeIpc()

    registerCatalogIpc(ipc, {
      list: async () => [],
      remove: async () => ({ products: [] }),
      upsert: async () => ({ products: [] })
    })

    expect(ipc.channels()).toEqual(['hermes:catalog:list', 'hermes:catalog:remove', 'hermes:catalog:upsert'])
  })

  it('lista vazio antes de qualquer cadastro', async () => {
    await withStore(async store => {
      const ipc = fakeIpc()

      registerCatalogIpc(ipc, store)

      expect(await ipc.invoke('hermes:catalog:list')).toEqual({ products: [] })
    })
  })

  it('cadastra pela IPC e devolve a lista atualizada', async () => {
    await withStore(async store => {
      const ipc = fakeIpc()

      registerCatalogIpc(ipc, store)

      const resultado = (await ipc.invoke('hermes:catalog:upsert', {
        name: 'Café 500g',
        price_cents: 2490,
        sku: 'CAF-500'
      })) as CatalogResult

      expect('products' in resultado).toBe(true)
      expect('products' in resultado && resultado.products).toHaveLength(1)
    })
  })

  it('propaga erro de validacao como valor, nunca como excecao', async () => {
    await withStore(async store => {
      const ipc = fakeIpc()

      registerCatalogIpc(ipc, store)

      await expect(ipc.invoke('hermes:catalog:upsert', { sku: '' })).resolves.toEqual({ error: 'name_required' })
      await expect(ipc.invoke('hermes:catalog:upsert', { name: 'X' })).resolves.toEqual({ error: 'sku_required' })
    })
  })

  it('NAO usa o tenant informado pelo renderer: sempre o da instalacao', async () => {
    await withStore(async store => {
      await store.upsert({ name: 'A', sku: 'A-1', tenant_id: 'empresa-a' })
      await store.upsert({ name: 'B', sku: 'B-1', tenant_id: 'empresa-b' })

      const ipc = fakeIpc()

      registerCatalogIpc(ipc, store)

      const deA = (await ipc.invoke('hermes:catalog:list', 'empresa-a')) as { products: Product[] }
      const invalido = (await ipc.invoke('hermes:catalog:list', 42)) as { products: Product[] }

      // Este teste afirmava `['A']` — o IDOR da r85 escrito como comportamento desejado. O canal não
      // usa o tenant pedido: quem responde é o da instalação, e os produtos de teste são de outras
      // empresas de propósito.
      expect(deA.products).toEqual([])
      expect(invalido.products).toEqual([])
    })
  })

  it('remove pelo id e tolera id nao-string sem derrubar o processo', async () => {
    await withStore(async store => {
      const criado = await store.upsert({ name: 'X', sku: 'X-1' })

      expect('products' in criado).toBe(true)

      const ipc = fakeIpc()

      registerCatalogIpc(ipc, store)

      const restante = (await ipc.invoke('hermes:catalog:remove', { id: 'nao-e-string' })) as { products: Product[] }
      const vazio = (await ipc.invoke('hermes:catalog:remove', 'products' in criado ? criado.products[0]!.id : '')) as {
        products: Product[]
      }

      expect(restante.products).toHaveLength(1)
      expect(vazio.products).toHaveLength(0)
    })
  })

  it('mountErpIpc liga o catalogo sobre o userData recebido', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'b3po-erp-mount-'))

    try {
      const ipc = fakeIpc()

      mountErpIpc(ipc, dir)
      await ipc.invoke('hermes:catalog:upsert', { name: 'Café', sku: 'CAF-1' })

      const lista = (await ipc.invoke('hermes:catalog:list')) as { products: Product[] }

      expect(lista.products.map(p => p.sku)).toEqual(['CAF-1'])
      // O arquivo foi criado sob o userData que o main passou.
      expect(await new CatalogStore(catalogStorePath(dir)).list()).toHaveLength(1)
    } finally {
      await rm(dir, { force: true, recursive: true })
    }
  })
})
