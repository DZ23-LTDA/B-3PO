// Invariante do tenant (rodada 159).
//
// CORRECAO DE UM ACHADO MEU
//
// A r158 registrou o parametro de `serverTenant` como "assinatura que convida ao erro". Ao ler a funcao nesta
// rodada, o desenho e outro:
//
//   function serverTenant(_fromRenderer?: unknown): string { return INSTALLATION_TENANT }
//
// O nome `_fromRenderer` e a convencao para "intencionalmente nao usado", e o comentario diz por que ele existe:
// deixar explicito na CHAMADA que havia um valor do renderer e ele foi descartado — para que o proximo leitor
// nao veja `store.list(tenant)` e ache que o tenant veio de lugar nenhum.
//
// Ou seja: o achado da r158 estava EXAGERADO. Nao e um convite ao erro; e documentacao no ponto de chamada.
//
// O QUE AINDA FALTAVA - E O QUE ESTE ARQUIVO FAZ
//
// Nada travava o invariante. Se alguem trocasse o corpo por `return String(_fromRenderer || INSTALLATION_TENANT)`,
// nenhum teste atual quebraria — porque todos os testes medem o comportamento de hoje, nao a regra.
//
// Estes testes travam a REGRA.

import { describe, expect, it } from 'vitest'

import { INSTALLATION_TENANT, serverTenant } from './server-tenant'

describe('serverTenant recusa o tenant do renderer', () => {
  it('devolve sempre a constante da instalacao', () => {
    expect(serverTenant()).toBe(INSTALLATION_TENANT)
  })

  it('IGNORA string arbitraria', () => {
    expect(serverTenant('empresa_b')).toBe(INSTALLATION_TENANT)
    expect(serverTenant('')).toBe(INSTALLATION_TENANT)
  })

  it('IGNORA objetos e payloads que o renderer poderia montar', () => {
    // Um canal que passasse `payload` inteiro nao consegue influenciar o resultado, mesmo que o objeto tenha
    // uma propriedade `tenant_id` bem formada.
    expect(serverTenant({ tenant_id: 'empresa_b' })).toBe(INSTALLATION_TENANT)
    expect(serverTenant({ tenantId: 'empresa_b', tenant: 'empresa_b' })).toBe(INSTALLATION_TENANT)
  })

  it('IGNORA valores que se parecem com a constante mas nao sao', () => {
    expect(serverTenant('LOCAL')).toBe(INSTALLATION_TENANT)
    expect(serverTenant(' local ')).toBe(INSTALLATION_TENANT)
    expect(serverTenant(null)).toBe(INSTALLATION_TENANT)
    expect(serverTenant(undefined)).toBe(INSTALLATION_TENANT)
  })

  it('o resultado NAO depende do argumento: dois valores opostos dao o mesmo', () => {
    // A forma mais direta de provar que o argumento nao participa: contrastar.
    const a = serverTenant('empresa_a')
    const b = serverTenant('empresa_b')

    expect(a).toBe(b)
    expect(a).toBe(INSTALLATION_TENANT)
  })

  it('a constante e estavel', () => {
    // Se ela deixasse de ser literal, o isolamento passaria a depender de estado mutavel.
    expect(INSTALLATION_TENANT).toBe('local')
  })
})
