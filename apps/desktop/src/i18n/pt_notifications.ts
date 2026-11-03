/** pt-BR das notificações do sistema (não os toasts do app). */
export const ptNotifications = {
  title: 'Notificações',
  intro: 'Notificações do sistema operacional (não os avisos dentro do app). Por dispositivo.',
  enableAll: 'Ativar notificações',
  enableAllDesc: 'Desligado silencia todas as notificações abaixo.',
  focusedHint: 'Avisos de conclusão só disparam enquanto o B-3PO está em segundo plano.',
  kinds: {
    approval: {
      label: 'Aprovação necessária',
      description: 'Um comando está esperando você aprovar ou recusar.'
    },
    input: {
      label: 'Informação necessária',
      description: 'O B-3PO fez uma pergunta ou precisa de uma senha ou segredo.'
    },
    turnDone: {
      label: 'Resposta pronta',
      description: 'Um turno terminou enquanto o B-3PO estava em segundo plano.'
    },
    turnError: {
      label: 'Turno falhou',
      description: 'Erros de turno em segundo plano.'
    },
    backgroundDone: {
      label: 'Tarefa em segundo plano concluída',
      description: 'Um comando de terminal em segundo plano terminou.'
    },
    credits: {
      label: 'Avisos de crédito',
      description: 'O acesso a créditos foi pausado ou restaurado.'
    },
    plugin: {
      label: 'Notificações de plugin',
      description: 'Um plugin do desktop enviou uma notificação enquanto o B-3PO estava em segundo plano.'
    }
  },
  browserPermission: {
    title: 'Notificações do navegador',
    allow: 'Permitir',
    states: {
      default:
        'Mostrar avisos deste navegador enquanto a aba está em segundo plano. Até você permitir, só o título da aba pisca.',
      granted: 'Permitido. Os avisos aparecem enquanto esta aba está em segundo plano; o título da aba também pisca.',
      denied: 'Bloqueado nas configurações do site neste navegador. O título da aba continua piscando.',
      insecure: 'Precisa de HTTPS, como Tailscale serve. Em HTTP simples, só o título da aba pisca.',
      unsupported: 'Este navegador não consegue mostrar notificações. O título da aba continua piscando.'
    }
  },
  test: 'Enviar notificação de teste',
  testTitle: 'B-3PO',
  testBody: 'As notificações estão funcionando.',
  testSent: 'Teste enviado. Se nada aparecer, confira as permissões de notificação do sistema e o modo Não perturbe.',
  testUnsupported: 'Este sistema não oferece notificações nativas.',
  muteSoundsTitle: 'Silenciar sons da interface',
  muteSoundsDesc:
    'Silencia os avisos automáticos de conclusão, palavra de ativação e raciocínio, o retorno tátil e os sons de notificação do sistema. Pré-visualizações de som e respostas faladas continuam tocando.',
  completionSoundTitle: 'Som de conclusão',
  completionSoundDesc: 'Toca quando um turno do agente termina. Escolha uma predefinição e ouça aqui.',
  completionSoundPreview: 'Ouvir'
}
