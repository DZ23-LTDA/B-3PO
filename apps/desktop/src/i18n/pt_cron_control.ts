import type { CronControlCopy } from './types_cron_control'

/** pt-BR do controle de tarefas agendadas. */
export const ptCronControl: CronControlCopy = {
  stop: 'Parar',
  stopping: 'Parando…',
  stopped: 'Execução cancelada',
  finishedFirst: 'A execução terminou antes de parar',
  nothingToStop: 'Nenhuma execução em andamento',
  failedStop: 'Não foi possível parar a execução',
  lastCancelled: (reason: string) =>
    reason ? `Última execução cancelada: ${reason}` : 'Última execução cancelada',
  catchUpLabel: 'Execuções perdidas',
  catchUpHint: 'O que fazer com execuções perdidas enquanto o B-3PO não estava rodando.',
  catchUpChoices: {
    default: 'Usar o padrão',
    run: 'Rodar uma vez ao voltar',
    skip: 'Ignorar'
  }
}
