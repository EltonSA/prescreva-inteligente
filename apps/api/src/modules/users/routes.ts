import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../../config/prisma'
import { adminGuard } from '../../middleware/auth'
import { resolveUsdToBrlRate } from '../../config/usd-brl'
import { aggregateOpenAiByUserForUtcMonth } from '../../services/ai-usage.service'

export async function usersRoutes(app: FastifyInstance) {
  app.addHook('preHandler', adminGuard)

  app.get('/users', async () => {
    const [users, openAiByUser] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          profession: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          _count: { select: { formulas: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      aggregateOpenAiByUserForUtcMonth(),
    ])

    const list = users.map((u) => {
      const ai = openAiByUser.get(u.id)
      const calls = ai?.calls ?? 0
      const estimatedUsd = ai?.estimatedUsd ?? 0
      const avgUsdPerCall =
        calls > 0 ? Math.round((estimatedUsd / calls) * 10000) / 10000 : 0
      return {
        ...u,
        aiOpenAiCallsThisMonth: calls,
        aiPromptTokensThisMonth: ai?.promptTokens ?? 0,
        aiCompletionTokensThisMonth: ai?.completionTokens ?? 0,
        aiEstimatedUsdThisMonth: estimatedUsd,
        aiAvgUsdPerCallThisMonth: avgUsdPerCall,
      }
    })

    return { users: list, usdToBrlRate: await resolveUsdToBrlRate() }
  })

  app.get('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, phone: true,
        profession: true, role: true, lastLogin: true, createdAt: true,
      },
    })
    if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' })
    return user
  })

  app.post('/users', async (request, reply) => {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      phone: z.string().optional(),
      profession: z.string().optional(),
      role: z.enum(['ADMIN', 'USER']).default('USER'),
    })

    const data = schema.parse(request.body)
    const exists = await prisma.user.findUnique({ where: { email: data.email } })
    if (exists) return reply.status(409).send({ error: 'Email já cadastrado' })

    const hashedPassword = await bcrypt.hash(data.password, 10)
    const user = await prisma.user.create({
      data: { ...data, password: hashedPassword },
      select: { id: true, name: true, email: true, role: true },
    })

    return reply.status(201).send(user)
  })

  app.put('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const schema = z.object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      profession: z.string().optional(),
      role: z.enum(['ADMIN', 'USER']).optional(),
      password: z.string().min(6).optional(),
    })

    const data = schema.parse(request.body)
    const updateData: any = { ...data }
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10)
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true },
    })

    return user
  })

  app.patch('/users/:id/toggle-active', async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, isActive: true, role: true } })
    if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' })

    const requester = request.user as { id: string }
    if (user.id === requester.id) {
      return reply.status(400).send({ error: 'Você não pode bloquear a si mesmo' })
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, name: true, isActive: true },
    })

    return updated
  })

  app.delete('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const requester = request.user as { id: string }
    if (id === requester.id) {
      return reply.status(400).send({ error: 'Você não pode excluir a si mesmo' })
    }

    await prisma.user.delete({ where: { id } })
    return reply.status(204).send()
  })
}
