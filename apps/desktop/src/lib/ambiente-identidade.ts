/**
 * A IDENTIDADE VISUAL dos seis ambientes (decisão do dono #5).
 *
 * O QUE ESTE ARQUIVO É
 *
 * **Dado, não componente.** Cada ambiente recebe um matiz e uma frase; o matiz entra no DOM como
 * `data-ambiente` no `<html>` e o CSS o lê por um token (`--ambiente-accent`). **Um design system
 * só**: nenhum componente, nenhuma variante de botão, nenhuma cópia de estilo. Se amanhã a paleta
 * mudar, muda aqui e no `styles.css`, e os seis acompanham.
 *
 * POR QUE UM TOKEN SEPARADO, E NÃO `--ui-accent`
 *
 * Sobrescrever `--ui-accent` por ambiente trocaria a cor de TODO botão primário do app. Isso já
 * custou uma violação de contraste na r101 (2,64:1 num par montado à mão) — e um matiz por
 * ambiente multiplicaria esse risco por seis. `--ambiente-accent` pinta **só o que identifica o
 * ambiente**: a faixa do seletor e o marcador do item ativo na barra.
 *
 * POR QUE A IDENTIDADE NÃO É PERTENCES
 *
 * `lib/ambiente.ts` já diz, desde a r121: trocar de ambiente troca **o que a barra mostra**, nunca
 * **o que a pessoa pode fazer**. Um matiz distinto por ambiente é afordância de orientação —
 * “onde eu estou” — e não pode ser lido como “o que eu posso”. `permission-guard` continua sendo a
 * única porta, e o teste do RBAC não muda por causa de uma cor.
 */

import type { Ambiente } from './ambiente'

export interface IdentidadeDoAmbiente {
  /** Matiz do ambiente. Lido pelo CSS via `[data-ambiente]`, nunca escrito inline em componente. */
  accent: string
  /** Uma linha, para o seletor e para `/ambiente` explicarem o ambiente sem abrir a lista. */
  descricao: string
}

/**
 * Os seis matizes, escolhidos para **não colidir** entre si e para ficar legíveis sobre a superfície
 * escura do app (`--background-base: #041c1c`). Todos passam 4,5:1 sobre essa superfície — medido,
 * não estimado: é o mesmo critério que a r97 usou para o vermelho de erro.
 */
export const AMBIENTE_IDENTIDADE: Record<Ambiente, IdentidadeDoAmbiente> = {
  administracao: {
    accent: '#2dd4bf',
    descricao: 'Onde se mexe na plataforma, não no negócio.'
  },
  automacao: {
    accent: '#fb923c',
    descricao: 'O que roda sozinho: gatilhos, integrações e rotinas.'
  },
  empresa: {
    accent: '#4ade80',
    descricao: 'Criar, administrar e operar o negócio.'
  },
  engenharia: {
    accent: '#38bdf8',
    descricao: 'Construir SaaS, sites, apps, APIs e sistemas.'
  },
  estrategico: {
    accent: '#f472b6',
    descricao: 'Ler o negócio: indicadores, metas e decisões.'
  },
  ia: {
    accent: '#a78bfa',
    descricao: 'Agentes, modelos e o que eles executam.'
  }
}

export function identidadeDoAmbiente(ambiente: Ambiente): IdentidadeDoAmbiente {
  return AMBIENTE_IDENTIDADE[ambiente]
}

/** O atributo que o CSS usa. Um lugar só decide o nome. */
export const AMBIENTE_ATTR = 'data-ambiente'

/**
 * Aplica a identidade ao documento.
 *
 * Vive fora do React de propósito: o atributo precisa estar no `<html>` antes da primeira pintura
 * da barra, e um `useEffect` chegaria depois. Chama-se no boot (como `hermes-boot-color-scheme`) e
 * a cada troca do seletor.
 */
export function aplicarIdentidadeDoAmbiente(ambiente: Ambiente): void {
  if (typeof document === 'undefined') return

  document.documentElement.setAttribute(AMBIENTE_ATTR, ambiente)
}
