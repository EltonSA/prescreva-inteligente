import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/prisma'
import { authGuard } from '../../middleware/auth'

export async function conversationsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard)

  app.get('/conversations', async (request) => {
    const userId = (request.user as { id: string }).id
    const { patientId } = request.query as { patientId?: string }

    const where: any = { userId }
    if (patientId) where.patientId = patientId

    return prisma.conversation.findMany({
      where,
      include: {
        patient: { select: { name: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, role: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
  })

  app.get('/conversations/:id', async (request) => {
    const { id } = request.params as { id: string }
    const userId = (request.user as { id: string }).id

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId },
      include: {
        patient: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!conversation) throw new Error('Conversa não encontrada')
    return conversation
  })

  app.post('/conversations', async (request, reply) => {
    const userId = (request.user as { id: string }).id
    const schema = z.object({
      patientId: z.string().uuid(),
      title: z.string().optional(),
    })

    const data = schema.parse(request.body)
    const conversation = await prisma.conversation.create({
      data: { ...data, userId },
    })

    return reply.status(201).send(conversation)
  })

  app.post('/conversations/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = (request.user as { id: string }).id
    const schema = z.object({
      role: z.string(),
      content: z.string(),
      referencedAtivos: z.any().optional(),
    })

    const conversation = await prisma.conversation.findFirst({ where: { id, userId } })
    if (!conversation) throw new Error('Conversa não encontrada')

    const data = schema.parse(request.body)
    const message = await prisma.conversationMessage.create({
      data: {
        conversationId: id,
        role: data.role,
        content: data.content,
        referencedAtivos: data.referencedAtivos ?? undefined,
      },
    })

    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    })

    return reply.status(201).send(message)
  })

  app.delete('/conversations/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = (request.user as { id: string }).id

    await prisma.conversation.deleteMany({ where: { id, userId } })
    return reply.status(204).send()
  })
}
