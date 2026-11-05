import { CrmContactsSection } from '@/app/settings/crm-contacts-section'
import { CrmConversationsSection } from '@/app/settings/crm-conversations-section'

import { CrmOverview } from './crm-overview'

/**
 * Tela do CRM.
 *
 * Reusa as seções que já vivem em Configurações — contatos e funil — em vez de reimplementar as duas. O que
 * muda é o lugar: uma página própria, que não obriga o usuário a caçar o CRM dentro de Configurações.
 *
 * Conversas ficam na própria página, lendo o store canônico. O texto antigo dizia que elas "entram
 * quando o canal oficial do WhatsApp estiver conectado" — mas a seção já estava renderizada logo
 * abaixo. O que faltava era o preload expor a ponte, não a tela existir.
 *
 * Tarefas não têm seção própria: `CrmContactsSection` já renderiza `CrmTasksSection` no fim
 * (crm-contacts-section.tsx). Durante duas rodadas este comentário afirmou que tarefas "não existem
 * aqui" — era falso, e afirmar ausência sem verificar custou três correções seguidas.
 */
export function CrmView() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-8">
      <h1 className="text-lg font-semibold text-foreground">CRM</h1>
      <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
        Contatos, funil e conversas ficam neste computador. Nada sobe para a nuvem sem você conectar um
        canal.
      </p>

      {/* Ja estamos na pagina do CRM: nao mostrar o atalho para ela mesma. */}
      <CrmOverview />

      <CrmContactsSection showOpenLink={false} />
        <CrmConversationsSection />
    </main>
  )
}
