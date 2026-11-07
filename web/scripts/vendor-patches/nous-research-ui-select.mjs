#!/usr/bin/env node
/**
 * r99 — patch mínimo e versionado de `@nous-research/ui` (decisão do dono #2).
 *
 * O PROBLEMA (medido, não suposto)
 *
 * `Select` renderiza `<button role="combobox">` e faz **destructuring de props fixas**:
 * `{ children, className, disabled, id, onValueChange, placeholder, style, value }`. Qualquer
 * `aria-label` que o chamador passe é **silenciosamente descartado**. E `combobox` **não** herda
 * nome do conteúdo (ARIA), então o botão fica sem nome acessível — `axe` reporta `button-name`
 * **critical**.
 *
 * Prova de que a intenção já existia e era ignorada: `ChatWorkspacePicker.tsx` já passava
 * `aria-label={t.sessions.workspace}` e o botão continuava sem nome.
 *
 * O QUE ESTE PATCH FAZ (mínimo, e compatível com o upstream)
 *
 * 1. acrescenta `...rest` ao destructuring — nada existente muda de comportamento;
 * 2. espalha `...rest` no `<button>` que já tem `role="combobox"` — o nome passa a chegar;
 * 3. no `.d.ts`, declara `aria-label` / `aria-labelledby` como opcionais.
 *
 * É **aditivo**: quem não passa essas props vê exatamente o comportamento de antes. É por isso que
 * dá para remover este patch quando o upstream publicar a correção, sem migração.
 *
 * POR QUE UM SCRIPT E NÃO `patch-package`
 *
 * `patch-package` não está nas dependências e instalá-lo exige rede. Este script não adiciona
 * dependência, é **idempotente** (roda N vezes, aplica uma), e **falha alto** se a âncora sumir —
 * um patch que não encontra o alvo tem de gritar, não passar em silêncio.
 *
 * Uso: `node scripts/vendor-patches/nous-research-ui-select.mjs`
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const raiz = join(aqui, '..', '..', '..')
const pkg = join(raiz, 'node_modules', '@nous-research', 'ui')

const MARCA = 'r99-select-aria'

/** [arquivo, âncora, substituto] — cada par tem de casar exatamente uma vez. */
const EDITS = [
  // 1) o destructuring ganha o resto
  [
    join(pkg, 'dist', 'ui', 'components', 'select.js'),
    '  placeholder,\n  style,\n  value\n}) {',
    '  placeholder,\n  style,\n  value,\n  ...rest\n}) {'
  ],
  // 2) o <button role="combobox"> recebe os atributos de acessibilidade
  [
    join(pkg, 'dist', 'ui', 'components', 'select.js'),
    '            "aria-haspopup": "listbox",\n            className: TRIGGER_CN,',
    '            "aria-haspopup": "listbox",\n            ...rest,\n            className: TRIGGER_CN,'
  ],
  // 3) o tipo aceita os atributos
  [
    join(pkg, 'dist', 'ui', 'components', 'select.d.ts'),
    '  value?: string;\n}',
    "  value?: string;\n  'aria-label'?: string;\n  'aria-labelledby'?: string;\n}"
  ]
]

/** O fonte também, para quem reconstruir o pacote não perder a correção. */
const EDITS_SRC = [
  [
    join(pkg, 'src', 'ui', 'components', 'select.tsx'),
    '  placeholder,\n  style,\n  value\n}: SelectProps) {',
    '  placeholder,\n  style,\n  value,\n  ...rest\n}: SelectProps) {'
  ],
  [
    join(pkg, 'src', 'ui', 'components', 'select.tsx'),
    '        aria-haspopup="listbox"\n        className={TRIGGER_CN}',
    '        aria-haspopup="listbox"\n        {...rest}\n        className={TRIGGER_CN}'
  ]
]

function aplicar(pares) {
  let aplicados = 0

  for (const [arquivo, de, para] of pares) {
    let texto

    try {
      texto = readFileSync(arquivo, 'utf8')
    } catch {
      throw new Error(`patch: arquivo ausente — ${arquivo}`)
    }

    if (texto.includes(para) || texto.includes(MARCA)) {
      continue // já aplicado
    }

    const ocorrencias = texto.split(de).length - 1

    if (ocorrencias !== 1) {
      throw new Error(
        `patch: âncora casou ${ocorrencias}× em ${arquivo}\n` +
          `  esperado exatamente 1. O upstream mudou — revise o patch antes de prosseguir.`
      )
    }

    writeFileSync(arquivo, texto.replace(de, para), 'utf8')
    aplicados += 1
  }

  return aplicados
}

const total = aplicar(EDITS) + aplicar(EDITS_SRC)

console.log(
  total === 0
    ? 'patch @nous-research/ui/select: já aplicado'
    : `patch @nous-research/ui/select: ${total} inserção(ões) aplicada(s)`
)
