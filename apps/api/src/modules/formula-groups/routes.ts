import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/prisma'
import { authGuard, adminGuard } from '../../middleware/auth'
import { processFormulaModification } from '../../services/formula-ai.service'

export async function formulaGroupsRoutes(app: FastifyInstance) {
  // ── Groups ──────────────────────────────────────────────────────────

  app.get('/formula-groups', { preHandler: [authGuard] }, async (request) => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const groups = await prisma.formulaGroup.findMany({
      include: {
        tags: true,
        _count: { select: { formulas: true } },
        formulas: {
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    const recentCounts = await prisma.libraryFormula.groupBy({
      by: ['groupId'],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: true,
    })

    const recentMap = new Map(recentCounts.map((r) => [r.groupId, r._count]))

    const result = groups.map((g) => ({
      ...g,
      latestFormulaAt: g.formulas[0]?.createdAt || null,
      recentCount: recentMap.get(g.id) || 0,
      formulas: undefined,
    }))

    result.sort((a, b) => {
      if (a.recentCount > 0 && b.recentCount === 0) return -1
      if (a.recentCount === 0 && b.recentCount > 0) return 1
      if (a.recentCount > 0 && b.recentCount > 0) return b.recentCount - a.recentCount
      if (a.isDefault && !b.isDefault) return -1
      if (!a.isDefault && b.isDefault) return 1
      return 0
    })

    return result
  })

  app.post('/admin/formula-groups', { preHandler: [adminGuard] }, async (request, reply) => {
    const schema = z.object({
      name: z.string().min(2),
      description: z.string().min(2),
      iconKey: z.string().default('beaker'),
      tags: z.array(z.string()).min(1),
    })

    const data = schema.parse(request.body)
    const userId = (request.user as { id: string }).id

    const group = await prisma.formulaGroup.create({
      data: {
        name: data.name,
        description: data.description,
        iconKey: data.iconKey,
        createdBy: userId,
        tags: {
          create: data.tags.map((tag) => ({ tagName: tag })),
        },
      },
      include: { tags: true },
    })

    return reply.status(201).send(group)
  })

  app.put('/admin/formula-groups/:id', { preHandler: [adminGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const schema = z.object({
      name: z.string().min(2).optional(),
      description: z.string().min(2).optional(),
      iconKey: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })

    const data = schema.parse(request.body)

    if (data.tags) {
      await prisma.formulaGroupTag.deleteMany({ where: { groupId: id } })
      await prisma.formulaGroupTag.createMany({
        data: data.tags.map((tag) => ({ groupId: id, tagName: tag })),
      })
    }

    const { tags, ...groupData } = data
    const group = await prisma.formulaGroup.update({
      where: { id },
      data: groupData,
      include: { tags: true },
    })

    return group
  })

  app.delete('/admin/formula-groups/:id', { preHandler: [adminGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const group = await prisma.formulaGroup.findUnique({ where: { id } })
    if (!group) return reply.status(404).send({ error: 'Grupo não encontrado' })
    if (group.isSystem) return reply.status(403).send({ error: 'Grupos do sistema não podem ser excluídos' })

    await prisma.formulaGroup.delete({ where: { id } })
    return reply.status(204).send()
  })

  // ── Tags ────────────────────────────────────────────────────────────

  app.post('/admin/formula-groups/:id/tags', { preHandler: [adminGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const schema = z.object({ tagName: z.string().min(1) })
    const { tagName } = schema.parse(request.body)

    const tag = await prisma.formulaGroupTag.create({
      data: { groupId: id, tagName },
    })

    return reply.status(201).send(tag)
  })

  app.delete('/admin/formula-groups/:id/tags/:tagId', { preHandler: [adminGuard] }, async (request, reply) => {
    const { tagId } = request.params as { id: string; tagId: string }
    await prisma.formulaGroupTag.delete({ where: { id: tagId } })
    return reply.status(204).send()
  })

  // ── Library Formulas ────────────────────────────────────────────────

  app.get('/formula-groups/:id/formulas', { preHandler: [authGuard] }, async (request) => {
    const { id } = request.params as { id: string }
    const { search } = request.query as { search?: string }

    const where: any = { groupId: id }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { composition: { contains: search, mode: 'insensitive' } },
        { instructions: { contains: search, mode: 'insensitive' } },
      ]
    }

    return prisma.libraryFormula.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
  })

  app.get('/library-formulas/:id', { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const formula = await prisma.libraryFormula.findUnique({
      where: { id },
      include: { group: true },
    })
    if (!formula) return reply.status(404).send({ error: 'Fórmula não encontrada' })
    return formula
  })

  app.post('/admin/library-formulas', { preHandler: [adminGuard] }, async (request, reply) => {
    const schema = z.object({
      groupId: z.string().uuid(),
      name: z.string().min(2),
      composition: z.string().min(5),
      instructions: z.string().min(5),
    })

    const data = schema.parse(request.body)
    const userId = (request.user as { id: string }).id

    const formula = await prisma.libraryFormula.create({
      data: { ...data, createdBy: userId, isOfficial: true },
    })

    return reply.status(201).send(formula)
  })

  app.put('/admin/library-formulas/:id', { preHandler: [adminGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const schema = z.object({
      name: z.string().min(2).optional(),
      composition: z.string().min(5).optional(),
      instructions: z.string().min(5).optional(),
      groupId: z.string().uuid().optional(),
    })

    const data = schema.parse(request.body)
    const formula = await prisma.libraryFormula.update({
      where: { id },
      data,
    })

    return formula
  })

  app.delete('/admin/library-formulas/:id', { preHandler: [adminGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.libraryFormula.delete({ where: { id } })
    return reply.status(204).send()
  })

  // ── AI Modification ─────────────────────────────────────────────────

  app.post('/ai/formulas/modify', { preHandler: [authGuard] }, async (request, reply) => {
    const schema = z.object({
      formulaId: z.string().uuid(),
      userRequest: z.string().min(3),
      patientId: z.string().uuid().optional(),
    })

    const data = schema.parse(request.body)
    const user = request.user as { id: string; role: string }

    const formula = await prisma.libraryFormula.findUnique({ where: { id: data.formulaId } })
    if (!formula) return reply.status(404).send({ error: 'Fórmula não encontrada' })

    const fullUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!fullUser) return reply.status(404).send({ error: 'Usuário não encontrado' })

    let patientContext = ''
    if (data.patientId) {
      const patient = await prisma.patient.findUnique({ where: { id: data.patientId } })
      if (patient) {
        patientContext = `\n## Dados do Paciente\n- Nome: ${patient.name}\n- Idade: ${patient.age}\n- Sexo: ${patient.sex}\n- Tipo de pele: ${patient.skinType || 'Não informado'}\n- Fototipo: ${patient.phototype || 'Não informado'}\n- Objetivo: ${patient.treatmentGoal || 'Não informado'}`
      }
    }

    try {
      const result = await processFormulaModification({
        formula,
        userRequest: data.userRequest,
        userProfession: fullUser.profession || 'Não informada',
        patientContext,
        userId: user.id,
      })

      const aiVersion = await prisma.formulaAiVersion.create({
        data: {
          userId: user.id,
          baseFormulaId: formula.id,
          title: result.title,
          originalFormulaSnapshot: formula.composition,
          originalInstructionsSnapshot: formula.instructions,
          userRequest: data.userRequest,
          aiResultFormula: result.composition,
          aiResultInstructions: result.instructions,
        },
      })

      return reply.status(201).send(aiVersion)
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || 'Erro ao processar com IA' })
    }
  })

  // ── AI Modify Favorite ──────────────────────────────────────────────

  app.post('/ai/formulas/modify-favorite', { preHandler: [authGuard] }, async (request, reply) => {
    const schema = z.object({
      favoriteId: z.string().uuid(),
      favoriteType: z.enum(['library', 'chat']),
      userRequest: z.string().min(3),
    })

    const data = schema.parse(request.body)
    const user = request.user as { id: string }
    const fullUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!fullUser) return reply.status(404).send({ error: 'Usuário não encontrado' })

    let formulaInput: { name: string; composition: string; instructions: string }

    if (data.favoriteType === 'library') {
      const version = await prisma.formulaAiVersion.findFirst({ where: { id: data.favoriteId, userId: user.id } })
      if (!version) return reply.status(404).send({ error: 'Fórmula não encontrada' })
      formulaInput = {
        name: version.title,
        composition: version.aiResultFormula,
        instructions: version.aiResultInstructions,
      }
    } else {
      const formula = await prisma.formula.findFirst({ where: { id: data.favoriteId, userId: user.id } })
      if (!formula) return reply.status(404).send({ error: 'Fórmula não encontrada' })
      formulaInput = {
        name: formula.title,
        composition: formula.content,
        instructions: '',
      }
    }

    try {
      const result = await processFormulaModification({
        formula: formulaInput,
        userRequest: data.userRequest,
        userProfession: fullUser.profession || 'Não informada',
        patientContext: '',
        userId: user.id,
      })
      return result
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || 'Erro ao processar com IA' })
    }
  })

  app.put('/ai/formulas/save-favorite', { preHandler: [authGuard] }, async (request, reply) => {
    const schema = z.object({
      favoriteId: z.string().uuid(),
      favoriteType: z.enum(['library', 'chat']),
      title: z.string(),
      composition: z.string(),
      instructions: z.string(),
    })

    const data = schema.parse(request.body)
    const userId = (request.user as { id: string }).id

    if (data.favoriteType === 'library') {
      const updated = await prisma.formulaAiVersion.update({
        where: { id: data.favoriteId },
        data: {
          title: data.title,
          aiResultFormula: data.composition,
          aiResultInstructions: data.instructions,
        },
      })
      return updated
    } else {
      const newContent = data.instructions
        ? `${data.composition}\n\n**Modo de Uso:**\n${data.instructions}`
        : data.composition
      const updated = await prisma.formula.update({
        where: { id: data.favoriteId, userId },
        data: { title: data.title, content: newContent },
      })
      return updated
    }
  })

  // ── Favorites ───────────────────────────────────────────────────────

  app.patch('/ai/formulas/:id/favorite', { preHandler: [authGuard] }, async (request) => {
    const { id } = request.params as { id: string }
    const userId = (request.user as { id: string }).id

    const version = await prisma.formulaAiVersion.findFirst({
      where: { id, userId },
    })
    if (!version) throw new Error('Versão não encontrada')

    return prisma.formulaAiVersion.update({
      where: { id },
      data: { isFavorited: !version.isFavorited },
    })
  })

  app.get('/me/favorite-formulas', { preHandler: [authGuard] }, async (request) => {
    const userId = (request.user as { id: string }).id

    const [aiVersions, chatFormulas] = await Promise.all([
      prisma.formulaAiVersion.findMany({
        where: { userId, isFavorited: true },
        include: {
          baseFormula: {
            include: { group: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.formula.findMany({
        where: { userId, favorite: true },
        include: { patient: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const normalizedAiVersions = aiVersions.map(v => ({
      ...v,
      source: 'library' as const,
    }))

    const normalizedChatFormulas = chatFormulas.map(f => ({
      id: f.id,
      title: f.title,
      content: f.content,
      patientName: f.patient?.name,
      isFavorited: true,
      createdAt: f.createdAt,
      source: 'chat' as const,
    }))

    return [...normalizedAiVersions, ...normalizedChatFormulas]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  })

  app.get('/me/formula-ai-versions', { preHandler: [authGuard] }, async (request) => {
    const userId = (request.user as { id: string }).id
    const { formulaId } = request.query as { formulaId?: string }

    const where: any = { userId }
    if (formulaId) where.baseFormulaId = formulaId

    return prisma.formulaAiVersion.findMany({
      where,
      include: { baseFormula: { select: { name: true, group: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    })
  })
}
