import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MOTIVO_MINIMO } from '@/api/fiscal'

/**
 * Campo de justificativa do cancelamento.
 *
 * POR QUE NÃO É UM `prompt()` DO NAVEGADOR
 *
 * Um `window.prompt` bloqueia a thread, não é estilizável, e o texto que ele devolve não pode ser validado
 * enquanto o usuário digita — o operador descobre que o motivo é curto só depois de enviar.
 *
 * POR QUE MOSTRA O TAMANHO
 *
 * A SEFAZ exige justificativa com mínimo de caracteres. Mostrar `12/15` enquanto digita evita o ciclo
 * "envia, recebe erro, tenta de novo" — a regra fica visível antes do erro.
 *
 * POR QUE O BOTÃO FICA DESABILITADO
 *
 * O backend recusa motivo curto de qualquer forma. Desabilitar aqui é conveniência, não segurança: a regra
 * vive no servidor, e esta tela só evita uma ida e volta.
 */
export interface CancelInvoiceInputProps {
  busy: boolean
  onCancel: () => void
  onConfirm: (motivo: string) => void
}

export function CancelInvoiceInput({ busy, onCancel, onConfirm }: CancelInvoiceInputProps) {
  const [motivo, setMotivo] = useState('')

  const limpo = motivo.replace(/\s+/g, ' ').trim()
  const suficiente = limpo.length >= MOTIVO_MINIMO

  return (
    <div className="flex items-center gap-1">
      <Input
        aria-label="Justificativa do cancelamento"
        className="h-7 w-64"
        disabled={busy}
        onChange={evento => setMotivo(evento.target.value)}
        placeholder={`Justificativa (mínimo ${MOTIVO_MINIMO} caracteres)`}
        value={motivo}
      />
      <span
        className="tabular-nums text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)"
        title={`A SEFAZ exige pelo menos ${MOTIVO_MINIMO} caracteres`}
      >
        {limpo.length}/{MOTIVO_MINIMO}
      </span>
      <Button disabled={busy || !suficiente} onClick={() => onConfirm(limpo)} variant="ghost">
        Confirmar
      </Button>
      <Button disabled={busy} onClick={onCancel} variant="ghost">
        Voltar
      </Button>
    </div>
  )
}
