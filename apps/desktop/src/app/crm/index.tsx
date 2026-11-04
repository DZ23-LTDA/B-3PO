import { CrmContactsSection } from '@/app/settings/crm-contacts-section'

/**
 * Tela do CRM.
 *
 * Reusa as seções que já vivem em Configurações — contatos e funil — em vez de reimplementar as duas. O que
 * muda é o lugar: uma página própria, que não obriga o usuário a caçar o CRM dentro de Configurações.
 *
 * O que ainda NÃO existe aqui: conversas (depende do canal oficial do WhatsApp) e tarefas. Aparecer sem
 * função seria pior do que não aparecer.
 */
export function CrmView() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 py-8">
      <h1 className="text-lg font-semibold text-foreground">CRM</h1>
      <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
        Contatos e funil ficam neste computador. As conversas entram quando o canal oficial do WhatsApp estiver
        conectado.
      </p>

      {/* Ja estamos na pagina do CRM: nao mostrar o atalho para ela mesma. */}
      <CrmContactsSection showOpenLink={false} />
    </div>
  )
}
