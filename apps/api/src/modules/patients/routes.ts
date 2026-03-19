import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/prisma'
import { authGuard } from '../../middleware/auth'

export async function patientsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard)

  app.get('/patients', async (request) => {
    const { id } = request.user as { id: string }
    const patients = await prisma.patient.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { formulas: true } } },
    })
    return patients
  })

  app.get('/patients/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = (request.user as { id: string }).id
    const patient = await prisma.patient.findFirst({
      where: { id, userId },
      include: { formulas: { orderBy: { createdAt: 'desc' } } },
    })
    if (!patient) return reply.status(404).send({ error: 'Paciente não encontrado' })
    return patient
  })

  app.post('/patients', async (request, reply) => {
    const userId = (request.user as { id: string }).id
    const schema = z.object({
      name: z.string().min(2),
      age: z.number().int().positive(),
      sex: z.enum(['MASCULINO', 'FEMININO', 'OUTRO']),
      skinType: z.string().optional(),
      phototype: z.string().optional(),
      treatmentGoal: z.string().optional(),
      additionalInfo: z.string().optional(),
    })

    const data = schema.parse(request.body)
    const patient = await prisma.patient.create({
      data: { ...data, userId },
    })

    return reply.status(201).send(patient)
  })

  app.put('/patients/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = (request.user as { id: string }).id
    const schema = z.object({
      name: z.string().min(2).optional(),
      age: z.number().int().positive().optional(),
      sex: z.enum(['MASCULINO', 'FEMININO', 'OUTRO']).optional(),
      skinType: z.string().optional(),
      phototype: z.string().optional(),
      treatmentGoal: z.string().optional(),
      additionalInfo: z.string().optional(),
    })

    const data = schema.parse(request.body)
    const existing = await prisma.patient.findFirst({ where: { id, userId } })
    if (!existing) return reply.status(404).send({ error: 'Paciente não encontrado' })

    const patient = await prisma.patient.update({
      where: { id },
      data,
    })

    return patient
  })

  app.delete('/patients/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = (request.user as { id: string }).id
    const existing = await prisma.patient.findFirst({ where: { id, userId } })
    if (!existing) return reply.status(404).send({ error: 'Paciente não encontrado' })

    await prisma.patient.delete({ where: { id } })
    return reply.status(204).send()
  })
}
