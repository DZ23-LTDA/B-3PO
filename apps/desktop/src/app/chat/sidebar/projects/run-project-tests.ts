/**
 * "Rodar testes" para uma pasta de projeto (r14 da V6).
 *
 * Extraida para ca' porque DOIS menus a usam: o do projeto (`project-menu.tsx`) e o da workspace
 * (`workspace-header.tsx`). Duas copias divergiriam.
 *
 * TRES PASSOS, E O PRIMEIRO PODE RECUSAR
 *
 * `dev:detect` diz como ESTE projeto roda. Se nao reconhecer, a acao **para ali** e a notificacao diz
 * por que — nao executa um comando adivinhado. Um botao que roda `npm test` num projeto Rust produziria
 * falha, e a pessoa concluiria que o projeto esta' quebrado.
 *
 * "Passou" vem do exit code (`resumoDaExecucao`), nunca de procurar "fail" na saida.
 */
import { detectarProjeto, resumoDaExecucao, rodarComando, rotuloDoComando } from '@/api/dev'
import { notify } from '@/store/notifications'

export async function rodarTestesDoProjeto(path: null | string, rotulo: string): Promise<void> {
  if (!path) return

  const deteccao = await detectarProjeto(path)

  if (!deteccao || 'error' in deteccao) {
    notify({ kind: 'warning', message: rotulo, detail: 'não foi possível ler o projeto' })
    return
  }

  if (!deteccao.testes) {
    notify({
      kind: 'info',
      message: rotulo,
      detail: 'este projeto não declara como rodar testes — nada foi executado'
    })
    return
  }

  const resultado = await rodarComando(path, deteccao.testes.argv)

  if (!resultado || 'error' in resultado) {
    notify({
      kind: 'error',
      message: rotulo,
      detail: 'a execução foi recusada pelo processo principal'
    })
    return
  }

  const resumo = resumoDaExecucao(resultado)

  notify({
    kind: resumo.passou === true ? 'success' : resumo.passou === false ? 'error' : 'warning',
    message: `${rotulo}: ${resumo.titulo}`,
    detail: `${rotuloDoComando(deteccao.testes.argv)}\n\n${(resultado.saida || resultado.erro || '').slice(-1500) || '(sem saída)'}`
  })
}
