/**
 * Detecta como rodar os testes e o build de um projeto (r7 da V6).
 *
 * POR QUE ISTO EXISTE
 *
 * Na r6 o canal `hermes:dev:run` sabe rodar um comando e ler o resultado, mas exige que alguem saiba
 * **qual** comando. "Rodar testes" vira `npm test` num projeto Node, `pytest` num Python, `cargo test`
 * num Rust. Sem deteccao, a capacidade e' infraestrutura sem produto.
 *
 * O QUE ELE NAO FAZ
 *
 * **Nao inventa comando.** Se a pasta nao tem runner reconhecivel, a resposta e' `null` — e a UI nao
 * mostra botao. Um botao que roda um comando adivinhado seria pior que nenhum botao: produziria falha
 * e a pessoa concluiria que o projeto esta' quebrado.
 *
 * Nao le `package.json` inteiro para decidir: so' `scripts.test` / `scripts.build`, e com limite de
 * tamanho — um arquivo gigante nao deve travar a deteccao.
 */
import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

export interface ComandoDetectado {
  /** O arquivo que provou a deteccao (`package.json`, `pyproject.toml`, ...). */
  origem: string
  /** `argv` pronto para `hermes:dev:run`, nunca uma string de shell. */
  argv: string[]
}

export interface DeteccaoDeProjeto {
  build: ComandoDetectado | null
  gerenciador: null | string
  testes: ComandoDetectado | null
}

/** 1 MB: `package.json` de projeto real fica muito abaixo; acima disso nao e' manifesto. */
const LIMITE_MANIFESTO = 1024 * 1024

async function existe(caminho: string): Promise<boolean> {
  const info = await stat(caminho).catch(() => null)
  return Boolean(info?.isFile())
}

/**
 * Qual gerenciador de pacotes Node usar.
 *
 * O lockfile decide, nao o gosto: um projeto com `pnpm-lock.yaml` roda com `pnpm`, e chamar `npm` nele
 * pode instalar em lugar nenhum. Sem lockfile, `npm` — o padrao do ecossistema.
 */
async function gerenciadorNode(pasta: string): Promise<string> {
  if (await existe(join(pasta, 'pnpm-lock.yaml'))) return 'pnpm'
  if (await existe(join(pasta, 'yarn.lock'))) return 'yarn'
  if (await existe(join(pasta, 'bun.lockb'))) return 'bun'
  return 'npm'
}

function lerScript(corpo: unknown, nome: string): null | string {
  if (!corpo || typeof corpo !== 'object') return null

  const scripts = (corpo as { scripts?: unknown }).scripts

  if (!scripts || typeof scripts !== 'object') return null

  const valor = (scripts as Record<string, unknown>)[nome]

  return typeof valor === 'string' && valor.trim() ? valor.trim() : null
}

export async function detectarProjeto(pasta: string): Promise<DeteccaoDeProjeto> {
  const vazio: DeteccaoDeProjeto = { build: null, gerenciador: null, testes: null }

  // --- Node -------------------------------------------------------------------------------------
  if (await existe(join(pasta, 'package.json'))) {
    const bruto = await readFile(join(pasta, 'package.json'), 'utf8').catch(() => null)

    if (bruto !== null && bruto.length <= LIMITE_MANIFESTO) {
      let manifesto: unknown = null

      try {
        manifesto = JSON.parse(bruto)
      } catch {
        manifesto = null
      }

      const gerenciador = await gerenciadorNode(pasta)
      const testScript = lerScript(manifesto, 'test')
      const buildScript = lerScript(manifesto, 'build')

      // `npx jest` NAO e' tentado: o script do manifesto e' a fonte da verdade do projeto. Se ele nao
      // declara `test`, o projeto nao declarou como se testa — e inventar `jest` seria adivinhar.
      return {
        build: buildScript ? { argv: [gerenciador, 'run', 'build'], origem: 'package.json' } : null,
        gerenciador,
        testes: testScript ? { argv: [gerenciador, 'test'], origem: 'package.json' } : null
      }
    }
  }

  // --- Python -----------------------------------------------------------------------------------
  if (
    (await existe(join(pasta, 'pyproject.toml'))) ||
    (await existe(join(pasta, 'pytest.ini'))) ||
    (await existe(join(pasta, 'setup.cfg')))
  ) {
    return {
      build: null,
      gerenciador: 'pip',
      testes: { argv: ['python', '-m', 'pytest'], origem: 'pyproject.toml/pytest.ini' }
    }
  }

  // --- Rust / Go / Make --------------------------------------------------------------------------
  if (await existe(join(pasta, 'Cargo.toml'))) {
    return {
      build: { argv: ['cargo', 'build'], origem: 'Cargo.toml' },
      gerenciador: 'cargo',
      testes: { argv: ['cargo', 'test'], origem: 'Cargo.toml' }
    }
  }

  if (await existe(join(pasta, 'go.mod'))) {
    return {
      build: { argv: ['go', 'build', './...'], origem: 'go.mod' },
      gerenciador: 'go',
      testes: { argv: ['go', 'test', './...'], origem: 'go.mod' }
    }
  }

  if (await existe(join(pasta, 'Makefile'))) {
    return {
      build: null,
      gerenciador: 'make',
      testes: { argv: ['make', 'test'], origem: 'Makefile' }
    }
  }

  return vazio
}
