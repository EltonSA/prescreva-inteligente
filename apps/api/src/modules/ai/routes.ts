import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/prisma'
import { authGuard, adminGuard } from '../../middleware/auth'
import { processChat } from '../../services/ai.service'
import { processAtivoFile } from '../../services/embedding.service'

export async function aiRoutes(app: FastifyInstance) {
  app.post('/ai/chat', { preHandler: [authGuard] }, async (request, reply) => {
    const schema = z.object({
      patientId: z.string().uuid(),
      messages: z.array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })
      ),
    })

    const { patientId, messages } = schema.parse(request.body)
    const userId = (request.user as { id: string }).id

    try {
      const result = await processChat({ patientId, userId, messages })
      return result
    } catch (error: any) {
      return reply.status(500).send({ error: error.message })
    }
  })

  // AI Settings (admin only)
  app.get('/ai/settings', { preHandler: [adminGuard] }, async () => {
    let settings = await prisma.aiSettings.findFirst()
    if (!settings) {
      settings = await prisma.aiSettings.create({ data: {} })
    }
    return {
      id: settings.id,
      systemPrompt: settings.systemPrompt,
      provider: settings.provider,
      model: settings.model,
      hasApiKey: !!settings.apiKey,
    }
  })

  app.put('/ai/settings', { preHandler: [adminGuard] }, async (request) => {
    const schema = z.object({
      systemPrompt: z.string().optional(),
      provider: z.enum(['OPENAI', 'GEMINI', 'CLAUDE']).optional(),
      apiKey: z.string().optional(),
      model: z.string().optional(),
    })

    const data = schema.parse(request.body)
    let settings = await prisma.aiSettings.findFirst()

    if (!settings) {
      settings = await prisma.aiSettings.create({ data: { ...data } as any })
    } else {
      settings = await prisma.aiSettings.update({
        where: { id: settings.id },
        data,
      })
    }

    return {
      id: settings.id,
      systemPrompt: settings.systemPrompt,
      provider: settings.provider,
      model: settings.model,
      hasApiKey: !!settings.apiKey,
    }
  })

  // Process embeddings for an ativo
  app.post('/ai/process-ativo/:id', { preHandler: [adminGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await processAtivoFile(id)
      return { success: true, message: 'Ativo processado com sucesso' }
    } catch (error: any) {
      return reply.status(500).send({ error: error.message })
    }
  })

  // Dashboard stats
  app.get('/dashboard/stats', { preHandler: [authGuard] }, async (request) => {
    const userId = (request.user as { id: string }).id
    const role = (request.user as { role: string }).role
    const isAdmin = role === 'ADMIN'

    const query = request.query as { startDate?: string; endDate?: string }
    const filterStart = query.startDate ? new Date(query.startDate) : undefined
    const filterEnd = query.endDate ? new Date(query.endDate + 'T23:59:59.999Z') : undefined
    const dateFilter = filterStart || filterEnd
      ? { ...(filterStart ? { gte: filterStart } : {}), ...(filterEnd ? { lte: filterEnd } : {}) }
      : undefined

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    const chartStart = filterStart || new Date(now.getFullYear(), now.getMonth() - 5, 1)

    const w = isAdmin ? {} : { userId }
    const wd = dateFilter ? { ...w, createdAt: dateFilter } : w
    const wf = { where: wd }
    const take = isAdmin ? 10 : 5

    const queries: Promise<any>[] = [
      prisma.patient.count(wf),                                                           // 0
      prisma.formula.count(wf),                                                           // 1
      prisma.formulaAiVersion.count(wf),                                                  // 2
      prisma.ativo.count(dateFilter ? { where: { createdAt: dateFilter } } : undefined),   // 3
      prisma.conversation.count(wf),                                                      // 4
      prisma.formula.count({ where: { ...wd, favorite: true } }),                         // 5
      prisma.formulaAiVersion.count({ where: { ...wd, isFavorited: true } }),             // 6
      prisma.patient.count({ where: { ...w, createdAt: { gte: startOfMonth } } }),        // 7
      prisma.patient.count({ where: { ...w, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }), // 8
      prisma.formula.count({ where: { ...w, createdAt: { gte: startOfMonth } } }),        // 9
      prisma.formula.count({ where: { ...w, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }), // 10
      prisma.formulaAiVersion.count({ where: { ...w, createdAt: { gte: startOfMonth } } }),        // 11
      prisma.formulaAiVersion.count({ where: { ...w, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }), // 12
      prisma.formula.findMany({                                                           // 13
        where: wd, select: { id: true, title: true, createdAt: true,
          patient: { select: { name: true } },
          ...(isAdmin ? { user: { select: { name: true } } } : {}),
        }, orderBy: { createdAt: 'desc' }, take,
      }),
      prisma.formulaAiVersion.findMany({                                                  // 14
        where: wd, select: { id: true, title: true, createdAt: true,
          ...(isAdmin ? { user: { select: { name: true } } } : {}),
        }, orderBy: { createdAt: 'desc' }, take,
      }),
      prisma.patient.findMany({                                                           // 15
        where: wd,
        select: { id: true, name: true, createdAt: true,
          ...(isAdmin ? { user: { select: { name: true } } } : {}),
        }, orderBy: { createdAt: 'desc' }, take,
      }),
    ]

    if (isAdmin) {
      queries.push(
        prisma.user.count(dateFilter ? { where: { createdAt: dateFilter } } : undefined),  // 16
        prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),               // 17
        prisma.user.findMany({                                                            // 18
          select: {
            id: true, name: true, profession: true, avatar: true, lastLogin: true,
            _count: { select: { patients: true, formulas: true, formulaAiVersions: true, conversations: true } },
          },
          orderBy: { formulas: { _count: 'desc' } }, take: 10,
        }),
        prisma.$queryRaw`
          SELECT month, CAST(SUM(count) AS INTEGER) as count FROM (
            SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month, COUNT(*) as count
            FROM formulas WHERE "createdAt" >= ${chartStart} GROUP BY DATE_TRUNC('month', "createdAt")
            UNION ALL
            SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month, COUNT(*) as count
            FROM formula_ai_versions WHERE "createdAt" >= ${chartStart} GROUP BY DATE_TRUNC('month', "createdAt")
          ) combined GROUP BY month ORDER BY month ASC
        `,                                                                                // 19
        prisma.$queryRaw`
          SELECT COALESCE(profession, 'Não informada') as profession,
            CAST(COUNT(*) AS INTEGER) as count
          FROM users GROUP BY profession ORDER BY count DESC
        `,                                                                                // 20
      )
    }

    const r = await Promise.all(queries)

    const totalFormulas = r[1] + r[2]
    const totalFavorites = r[5] + r[6]
    const formulasThisMonth = r[9] + r[11]
    const formulasLastMonth = r[10] + r[12]

    const allRecent = [
      ...r[13].map((f: any) => ({ id: f.id, title: f.title, patientName: f.patient?.name, userName: f.user?.name, createdAt: f.createdAt })),
      ...r[14].map((f: any) => ({ id: f.id, title: f.title, patientName: null, userName: f.user?.name, createdAt: f.createdAt })),
    ].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, take)

    const result: any = {
      totalPatients: r[0], totalFormulas, totalAtivos: r[3], totalConversations: r[4], totalFavorites,
      patientsThisMonth: r[7], patientsLastMonth: r[8], formulasThisMonth, formulasLastMonth,
      recentFormulas: allRecent,
      recentPatients: r[15].map((p: any) => ({ id: p.id, name: p.name, userName: p.user?.name, createdAt: p.createdAt })),
    }

    if (isAdmin) {
      result.totalUsers = r[16]
      result.usersThisMonth = r[17]
      result.topUsers = r[18].map((u: any) => ({
        id: u.id, name: u.name, profession: u.profession, avatar: u.avatar,
        lastLogin: u.lastLogin, patientCount: u._count.patients,
        formulaCount: u._count.formulas + u._count.formulaAiVersions,
        conversationCount: u._count.conversations,
      }))
      result.formulasByMonth = r[19]
      result.usersByProfession = r[20]
    }

    return result
  })
}
