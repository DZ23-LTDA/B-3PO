// De qual empresa são os dados que um canal IPC devolve.
//
// O PROBLEMA QUE ISTO RESOLVE
//
// Vinte canais aceitavam o tenant vindo do `payload`, isto é, do renderer:
//
//   store.list(tenant(payload))
//
// O processo principal confiava no renderer para dizer de qual empresa eram os dados. Com um tenant só
// (`local`) isso não vazava nada; com dois tenants reais no mesmo perfil, qualquer código no renderer
// poderia pedir `empresa_b` e receber os dados dela. É IDOR por construção: o pedido carrega o alvo.
//
// A REGRA
//
// O tenant é uma propriedade da INSTALAÇÃO, decidida no processo principal. Um canal nunca aceita o
// tenant do payload — se aceitasse, o isolamento deixaria de ser garantia e voltaria a ser pedido.
//
// Quando o produto passar a trocar de empresa em tempo de execução (não hoje), esta função é o único
// lugar que muda: ela passa a ler a empresa ativa do perfil, e todos os canais acompanham.
//
// O QUE ESTA FUNÇÃO NÃO FAZ
//
// Ela não valida permissão. Saber de qual empresa é o dado é uma pergunta; se o ator pode vê-lo é
// outra, respondida por `rbac.ts`. Misturar as duas esconderia a que falhou.

/** Empresa dona dos dados desta instalação. */
export const INSTALLATION_TENANT = 'local'

/**
 * Tenant que o servidor usa, ignorando o que o renderer mandou.
 *
 * O parâmetro existe só para deixar explícito, na chamada, que havia um valor do renderer e ele foi
 * descartado. Um canal que simplesmente ignorasse `payload` sem dizer isso pareceria distração.
 */
export function serverTenant(_fromRenderer?: unknown): string {
  return INSTALLATION_TENANT
}
