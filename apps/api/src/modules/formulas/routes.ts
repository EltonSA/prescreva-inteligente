import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/prisma'
import { authGuard } from '../../middleware/auth'

export async function formulasRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard)

  app.get('/formulas', async (request) => {
    const userId = (request.user as { id: string }).id
    return prisma.formula.findMany({
      where: { userId },
      include: { patient: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })
  })

  app.get('/formulas/favorites', async (request) => {
    const userId = (request.user as { id: string }).id
    return prisma.formula.findMany({
      where: { userId, favorite: true },
      include: { patient: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })
  })

  app.post('/formulas', async (request, reply) => {
    const userId = (request.user as { id: string }).id
    const schema = z.object({
      title: z.string().min(2),
      content: z.string().min(10),
      patientId: z.string().uuid(),
      favorite: z.boolean().default(false),
    })

    const data = schema.parse(request.body)
    const formula = await prisma.formula.create({
      data: { ...data, userId },
    })

    return reply.status(201).send(formula)
  })

  app.put('/formulas/:id', async (request) => {
    const { id } = request.params as { id: string }
    const userId = (request.user as { id: string }).id
    const schema = z.object({
      title: z.string().optional(),
      content: z.string().optional(),
      favorite: z.boolean().optional(),
    })

    const data = schema.parse(request.body)
    return prisma.formula.update({
      where: { id, userId },
      data,
    })
  })

  app.patch('/formulas/:id/favorite', async (request) => {
    const { id } = request.params as { id: string }
    const userId = (request.user as { id: string }).id
    const formula = await prisma.formula.findFirst({ where: { id, userId } })
    if (!formula) throw new Error('Fórmula não encontrada')

    return prisma.formula.update({
      where: { id },
      data: { favorite: !formula.favorite },
    })
  })

  app.delete('/formulas/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = (request.user as { id: string }).id
    await prisma.formula.delete({ where: { id, userId } })
    return reply.status(204).send()
  })
}
