import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/prisma'
import { adminGuard, authGuard } from '../../middleware/auth'

const createSchema = z.object({
  title: z.string().min(3).max(160),
  message: z.string().min(10).max(8000),
  category: z.enum(['SUGESTAO', 'BUG', 'OUTRO']).default('SUGESTAO'),
})

const patchSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE', 'DISMISSED']),
})

const messageSchema = z.object({
  content: z.string().min(1).max(8000),
})

function isClosedStatus(status: string) {
  return status === 'DONE' || status === 'DISMISSED'
}

export async function feedbackRoutes(app: FastifyInstance) {
  app.post('/feedback', { preHandler: [authGuard] }, async (request, reply) => {
    const userId = (request.user as { id: string }).id
    const body = createSchema.parse(request.body)

    const ticket = await prisma.feedbackTicket.create({
      data: {
        userId,
        title: body.title.trim(),
        message: body.message.trim(),
        category: body.category,
      },
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        createdAt: true,
      },
    })

    return reply.status(201).send(ticket)
  })

  app.get('/feedback/mine', { preHandler: [authGuard] }, async (request) => {
    const userId = (request.user as { id: string }).id
    const rows = await prisma.feedbackTicket.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        message: true,
        category: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
        messages: {
          where: { author: { role: 'ADMIN' } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    })
    return rows.map(({ messages, ...t }) => ({
      ...t,
      lastAdminMessageAt: messages[0]?.createdAt ?? null,
    }))
  })

  /** Contagem para badge no menu: tickets do usuário alterados desde `since` (ex.: nova resposta do admin). */
  app.get('/feedback/mine/badge-count', { preHandler: [authGuard] }, async (request, reply) => {
    const userId = (request.user as { id: string }).id
    const sinceRaw = (request.query as { since?: string }).since
    if (!sinceRaw) {
      return reply.status(400).send({ error: 'Parâmetro since é obrigatório' })
    }
    const sinceDate = new Date(sinceRaw)
    if (Number.isNaN(sinceDate.getTime())) {
      return reply.status(400).send({ error: 'since inválido' })
    }
    const count = await prisma.feedbackTicket.count({
      where: { userId, updatedAt: { gt: sinceDate } },
    })
    return { count }
  })

  app.get('/feedback/admin', { preHandler: [adminGuard] }, async () => {
    const rows = await prisma.feedbackTicket.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        _count: { select: { messages: true } },
        messages: {
          where: { author: { role: 'USER' } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    })
    return rows.map(({ messages, ...t }) => ({
      ...t,
      lastUserMessageAt: messages[0]?.createdAt ?? null,
    }))
  })

  /** Novos tickets (criados após `since`) para badge no menu do admin. */
  app.get('/feedback/admin/badge-count', { preHandler: [adminGuard] }, async (request, reply) => {
    const sinceRaw = (request.query as { since?: string }).since
    if (!sinceRaw) {
      return reply.status(400).send({ error: 'Parâmetro since é obrigatório' })
    }
    const sinceDate = new Date(sinceRaw)
    if (Number.isNaN(sinceDate.getTime())) {
      return reply.status(400).send({ error: 'since inválido' })
    }
    const count = await prisma.feedbackTicket.count({
      where: { createdAt: { gt: sinceDate } },
    })
    return { count }
  })

  app.get('/feedback/:id', { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user as { id: string; role: string }

    const ticket = await prisma.feedbackTicket.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, name: true, role: true } },
          },
        },
      },
    })

    if (!ticket) {
      return reply.status(404).send({ error: 'Ticket não encontrado' })
    }
    if (user.role !== 'ADMIN' && ticket.userId !== user.id) {
      return reply.status(403).send({ error: 'Sem permissão para este ticket' })
    }

    return ticket
  })

  app.post('/feedback/:id/messages', { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user as { id: string; role: string }
    const body = messageSchema.parse(request.body)
    const content = body.content.trim()
    if (!content) {
      return reply.status(400).send({ error: 'Mensagem vazia' })
    }

    const ticket = await prisma.feedbackTicket.findUnique({ where: { id } })
    if (!ticket) {
      return reply.status(404).send({ error: 'Ticket não encontrado' })
    }
    if (user.role !== 'ADMIN' && ticket.userId !== user.id) {
      return reply.status(403).send({ error: 'Sem permissão para este ticket' })
    }

    if (isClosedStatus(ticket.status)) {
      return reply.status(400).send({
        error: 'Este ticket está encerrado. Não é possível enviar novas mensagens.',
      })
    }

    const msg = await prisma.feedbackTicketMessage.create({
      data: {
        ticketId: id,
        authorId: user.id,
        body: content,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    })

    await prisma.feedbackTicket.update({
      where: { id },
      data: { updatedAt: new Date() },
    })

    return reply.status(201).send(msg)
  })

  app.patch('/feedback/:id', { preHandler: [adminGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = patchSchema.parse(request.body)

    const existing = await prisma.feedbackTicket.findUnique({ where: { id } })
    if (!existing) {
      return reply.status(404).send({ error: 'Sugestão não encontrada' })
    }

    if (
      isClosedStatus(existing.status) &&
      (body.status === 'OPEN' || body.status === 'IN_PROGRESS')
    ) {
      return reply.status(400).send({
        error: 'Ticket encerrado não pode ser reaberto.',
      })
    }

    const ticket = await prisma.feedbackTicket.update({
      where: { id },
      data: { status: body.status },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        _count: { select: { messages: true } },
      },
    })

    return ticket
  })
}
