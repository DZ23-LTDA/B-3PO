import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { DEFAULT_TENANT } from './catalog-store'
import {
  SchedulingStore,
  blocks,
  conflictFor,
  dayOf,
  isStatus,
  normalizeAppointment,
  overlaps,
  parseScheduling,
  schedulingStorePath,
  type Appointment
} from './scheduling-store'

async function withStore<T>(run: (store: SchedulingStore) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-scheduling-'))

  try {
    return await run(new SchedulingStore(schedulingStorePath(dir)))
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

// Base fixa: 2026-11-04 09:00 local, em ms.
const H9 = 1793784000000
const HORA = 3_600_000

const compromisso = (over: Record<string, unknown> = {}) => ({
  resource_id: 'cadeira-1',
  starts_at: H9,
  ends_at: H9 + HORA,
  ...over
})

describe('agenda: validação', () => {
  it('exige recurso e período coerente', () => {
    expect(normalizeAppointment(compromisso({ resource_id: '  ' }), 1)).toEqual({ error: 'resource_required' })
    expect(normalizeAppointment(compromisso({ starts_at: 0 }), 1)).toEqual({ error: 'starts_at_required' })
    expect(normalizeAppointment(compromisso({ ends_at: H9 }), 1)).toEqual({ error: 'periodo_invalido' })
    expect(normalizeAppointment(compromisso({ ends_at: H9 - 1 }), 1)).toEqual({ error: 'periodo_invalido' })
    expect(normalizeAppointment(compromisso(), 1)).toHaveProperty('appointment')
  })

  it('descarta status inventado, mas aceita ausência (assume `marcado`)', () => {
    expect(normalizeAppointment(compromisso({ status: 'talvez' }), 1)).toEqual({ error: 'status_invalid' })

    const semStatus = normalizeAppointment(compromisso(), 1)

    expect('appointment' in semStatus && semStatus.appointment.status).toBe('marcado')
  })
})

describe('agenda: conflito de horário', () => {
  it('encaixe perfeito NÃO é conflito', () => {
    const a = { ends_at: H9 + HORA, starts_at: H9 }
    const b = { ends_at: H9 + 2 * HORA, starts_at: H9 + HORA }

    expect(overlaps(a, b)).toBe(false)
    expect(overlaps(b, a)).toBe(false)
  })

  it('sobreposição parcial e total são conflito', () => {
    expect(overlaps({ ends_at: H9 + HORA, starts_at: H9 }, { ends_at: H9 + 1.5 * HORA, starts_at: H9 + 0.5 * HORA })).toBe(true)
    expect(overlaps({ ends_at: H9 + HORA, starts_at: H9 }, { ends_at: H9 + 0.5 * HORA, starts_at: H9 + 0.25 * HORA })).toBe(true)
  })

  it('recusa marcar em cima de outro compromisso e devolve o conflitante', async () => {
    await withStore(async store => {
      expect('appointment' in (await store.book(compromisso()))).toBe(true)

      const conflito = await store.book(compromisso({ starts_at: H9 + 1800000, ends_at: H9 + HORA + 1800000 }))

      expect(conflito).toHaveProperty('error', 'conflito_de_agenda')
      expect(conflito).toHaveProperty('conflict')
      expect(await store.list()).toHaveLength(1)
    })
  })

  it('permite encaixar exatamente no fim do anterior', async () => {
    await withStore(async store => {
      await store.book(compromisso())

      const encaixe = await store.book(compromisso({ starts_at: H9 + HORA, ends_at: H9 + 2 * HORA }))

      expect('appointment' in encaixe).toBe(true)
      expect(await store.list()).toHaveLength(2)
    })
  })

  it('permite o mesmo horário em outro recurso', async () => {
    await withStore(async store => {
      await store.book(compromisso({ resource_id: 'cadeira-1' }))

      expect('appointment' in (await store.book(compromisso({ resource_id: 'cadeira-2' })))).toBe(true)
    })
  })

  it('cancelado libera o horário', async () => {
    await withStore(async store => {
      const primeiro = await store.book(compromisso())

      expect('appointment' in primeiro).toBe(true)
      if (!('appointment' in primeiro)) return

      // Antes de cancelar, o horário está ocupado.
      expect(await store.book(compromisso({ resource_id: 'cadeira-1', starts_at: H9 + 60000, ends_at: H9 + HORA }))).toHaveProperty(
        'error',
        'conflito_de_agenda'
      )

      await store.cancel(primeiro.appointment.id)

      const depois = await store.book(compromisso({ starts_at: H9 + 60000, ends_at: H9 + HORA }))

      expect('appointment' in depois).toBe(true)
    })
  })

  it('status terminal e cancelado não bloqueiam; marcado/confirmado/concluido bloqueiam', () => {
    expect(blocks('marcado')).toBe(true)
    expect(blocks('confirmado')).toBe(true)
    expect(blocks('concluido')).toBe(true)
    expect(blocks('cancelado')).toBe(false)
    expect(blocks('faltou')).toBe(false)
  })

  it('conflito ignora outra empresa', () => {
    const existente: Appointment = {
      contact_phone: '',
      created_at: 1,
      ends_at: H9 + HORA,
      id: 'a1',
      notes: '',
      ref: '',
      resource_id: 'cadeira-1',
      service: '',
      starts_at: H9,
      status: 'marcado',
      tenant_id: 'empresa-a',
      updated_at: 1
    }

    expect(conflictFor([existente], { ...existente, id: 'a2', tenant_id: 'empresa-b' })).toBeNull()
    expect(conflictFor([existente], { ...existente, id: 'a2', tenant_id: 'empresa-a' })).toMatchObject({ id: 'a1' })
  })
})

describe('agenda: persistência e ciclo de vida', () => {
  it('deduplica por ref', async () => {
    await withStore(async store => {
      const primeiro = await store.book(compromisso({ ref: 'pedido:9' }))
      const repetido = await store.book(compromisso({ ref: 'pedido:9', starts_at: H9 + 2 * HORA, ends_at: H9 + 3 * HORA }))

      expect('appointment' in primeiro).toBe(true)
      expect(repetido).toEqual({ error: 'ref_duplicado' })
    })
  })

  it('confirma o compromisso marcado', async () => {
    await withStore(async store => {
      const criado = await store.book(compromisso())

      expect('appointment' in criado).toBe(true)
      if (!('appointment' in criado)) return

      const confirmado = await store.confirm(criado.appointment.id)

      expect('appointments' in confirmado && confirmado.appointments[0]!.status).toBe('confirmado')
    })
  })

  it('concluído é imutável: não cancela nem reagenda', async () => {
    await withStore(async store => {
      const criado = await store.book(compromisso({ status: 'concluido' }))

      expect('appointment' in criado).toBe(true)
      if (!('appointment' in criado)) return

      const id = criado.appointment.id

      expect(await store.cancel(id)).toEqual({ error: 'compromisso_concluido_imutavel' })
      expect(await store.book({ ...compromisso({ starts_at: H9 + 5 * HORA, ends_at: H9 + 6 * HORA }), id })).toEqual({
        error: 'compromisso_concluido_imutavel'
      })
    })
  })

  it('não alcança compromisso de outra empresa', async () => {
    await withStore(async store => {
      const criado = await store.book(compromisso({ tenant_id: 'empresa-a' }))

      expect('appointment' in criado).toBe(true)
      if (!('appointment' in criado)) return

      expect(await store.cancel(criado.appointment.id, 'empresa-b')).toEqual({ error: 'compromisso_nao_encontrado' })
    })
  })

  it('lista o dia filtrado por recurso, em ordem de horário', async () => {
    await withStore(async store => {
      await store.book(compromisso({ starts_at: H9 + 2 * HORA, ends_at: H9 + 3 * HORA }))
      await store.book(compromisso({ starts_at: H9, ends_at: H9 + HORA }))
      await store.book(compromisso({ resource_id: 'sala-1', starts_at: H9, ends_at: H9 + HORA }))

      const dia = await store.day(DEFAULT_TENANT, H9, H9 + 24 * HORA)
      const cadeira = await store.day(DEFAULT_TENANT, H9, H9 + 24 * HORA, 'cadeira-1')

      expect(dia).toHaveLength(3)
      expect(cadeira.map(a => a.starts_at)).toEqual([H9, H9 + 2 * HORA])
    })
  })

  it('dayOf exclui o que termina antes do início do dia e o que começa depois do fim', () => {
    const antes: Appointment = {
      contact_phone: '', created_at: 1, ends_at: H9 - HORA, id: 'x', notes: '', ref: '',
      resource_id: 'r', service: '', starts_at: H9 - 2 * HORA, status: 'marcado', tenant_id: DEFAULT_TENANT, updated_at: 1
    }
    const depois: Appointment = { ...antes, ends_at: H9 + 30 * HORA, id: 'y', starts_at: H9 + 25 * HORA }

    expect(dayOf([antes, depois], DEFAULT_TENANT, H9, H9 + 24 * HORA)).toHaveLength(0)
  })

  it('trata arquivo corrompido como agenda vazia', () => {
    expect(parseScheduling('nao e json')).toEqual({ appointments: [], schema_version: 1 })
    expect(isStatus('faltou')).toBe(true)
    expect(isStatus('remarcado')).toBe(false)
  })
})
