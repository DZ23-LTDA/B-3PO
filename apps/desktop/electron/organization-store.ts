// O store da ESTRUTURA da organização (r88 do GOAL V2).
//
// POR QUE NÃO DENTRO DE `companies-store`
//
// `companies-store` guarda **o cadastro e as filiais**: CNPJ, endereço, nome. Trezentas empresas cabem ali.
//
// O que a r81 desenhou é outra coisa: **departamentos e o que cada um faz**. Isso muda quando a operação
// muda, não quando a empresa muda de endereço — e são **duas frequências de mudança diferentes**.
//
// **Mas não são duas verdades sobre a mesma empresa**: `company_id` liga, e cada campo tem **um dono só**. O
// cadastro é de `companies-store`; o desenho é daqui; `organization.ts` valida o desenho.
//
// O QUE ESTE STORE **NÃO** FAZ
//
// **Não cria empresa.** Uma estrutura sem cadastro é um organograma solto — e `criar` recusa quando o
// `company_id` não existe em `companies-store`.
//
// **Não valida setor contra a empresa.** Quem sabe o setor declarado é o cadastro; se divergirem, é a
// reconciliação que acha, não este arquivo que escolhe.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { isSetor, resumoDaOrganizacao, validarOrganizacao, type Organizacao, type Setor } from './organization'
import { INSTALLATION_TENANT } from './server-tenant'
import { WriteQueue } from './write-queue'

/** O desenho de uma empresa. */
export interface EstruturaOrganizacional extends Organizacao {
  company_id: string
}

export interface OrganizationStoreFile {
  estruturas: EstruturaOrganizacional[]
  schema_version: 1
}

export function organizationStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'organizacao.json')
}

function vazio(): OrganizationStoreFile {
  return { estruturas: [], schema_version: 1 }
}

/**
 * Lê o arquivo.
 *
 * Estrutura de setor desconhecido é descartada — **ela veio de uma sugestão inventada**, e uma sugestão que
 * o produto não sabe validar não deve virar o desenho de uma empresa.
 */
export function parseOrganizationStore(raw: string): OrganizationStoreFile {
  try {
    const parsed = JSON.parse(raw) as Partial<OrganizationStoreFile>

    if (!parsed || !Array.isArray(parsed.estruturas)) return vazio()

    const estruturas = parsed.estruturas.filter(
      (e): e is EstruturaOrganizacional =>
        !!e &&
        typeof e === 'object' &&
        typeof e.company_id === 'string' &&
        e.company_id.length > 0 &&
        isSetor(e.setor) &&
        Array.isArray(e.departamentos)
    )

    return { estruturas, schema_version: 1 }
  } catch {
    return vazio()
  }
}

/** Quem guarda o cadastro — o mínimo que este store precisa saber dele. */
export interface CompanyDirectory {
  exists: (companyId: string) => Promise<boolean>
}

export class OrganizationStore {
  private readonly fila = new WriteQueue()

  constructor(
    private readonly file: string,
    private readonly directory: CompanyDirectory
  ) {}

  private async carregar(): Promise<OrganizationStoreFile> {
    try {
      return parseOrganizationStore(await readFile(this.file, 'utf8'))
    } catch {
      return vazio()
    }
  }

  private async gravar(estado: OrganizationStoreFile): Promise<void> {
    const temporario = `${this.file}.${process.pid}.tmp`

    await mkdir(dirname(this.file), { recursive: true })
    await writeFile(temporario, JSON.stringify(estado, null, 2), 'utf8')
    await rename(temporario, this.file)
  }

  async listar(tenantId: string = INSTALLATION_TENANT): Promise<EstruturaOrganizacional[]> {
    return (await this.carregar()).estruturas.filter(e => e.tenant_id === tenantId)
  }

  async porEmpresa(companyId: string): Promise<EstruturaOrganizacional | null> {
    return (await this.carregar()).estruturas.find(e => e.company_id === companyId) ?? null
  }

  /**
   * Define a estrutura de uma empresa.
   *
   * **Recusa quando a empresa não existe**: uma estrutura sem cadastro é um organograma solto. A checagem é
   * feita **aqui** e não na tela, porque o canal pode ser chamado direto.
   */
  async definir(
    companyId: string,
    input: unknown,
    tenantId: string = INSTALLATION_TENANT
  ): Promise<
    | { error: 'empresa_inexistente' | 'company_obrigatoria' | string }
    | { estrutura: EstruturaOrganizacional; estruturas: EstruturaOrganizacional[] }
  > {
    if (!companyId.trim()) return { error: 'company_obrigatoria' }

    if (!(await this.directory.exists(companyId))) return { error: 'empresa_inexistente' }

    const validada = validarOrganizacao({ ...(input as object), tenant_id: tenantId })

    if ('error' in validada) return { error: validada.error }

    return this.fila.serializar(async () => {
      const estado = await this.carregar()
      const estrutura: EstruturaOrganizacional = { ...validada.organizacao, company_id: companyId }
      const indice = estado.estruturas.findIndex(e => e.company_id === companyId)

      // Uma estrutura por empresa: duas deixariam "quem faz o quê" sem resposta.
      if (indice >= 0) estado.estruturas[indice] = estrutura
      else estado.estruturas.push(estrutura)

      await this.gravar(estado)

      return { estrutura, estruturas: await this.listar(tenantId) }
    })
  }

  /** O resumo que a tela mostra — a mesma frase da r81, agora vinda do disco. */
  async resumo(companyId: string): Promise<string | null> {
    const e = await this.porEmpresa(companyId)

    return e ? resumoDaOrganizacao(e) : null
  }

  /** As empresas com estrutura e as com setor que o produto não conhece — a lista que a tela precisa. */
  async setoresDesconhecidos(): Promise<EstruturaOrganizacional[]> {
    return (await this.carregar()).estruturas.filter(e => !isSetor(e.setor))
  }
}

/** O setor declarado no cadastro, quando ele existe — para comparar com o do desenho. */
export function setorDoCadastro(valor: unknown): null | Setor {
  return isSetor(valor) ? valor : null
}
