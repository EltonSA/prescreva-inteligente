import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AtivoUsageGroup } from '@prisma/client'
import { prisma } from '../../config/prisma'
import { authGuard, adminGuard } from '../../middleware/auth'
import path from 'path'
import fs from 'fs'
import { pipeline } from 'stream/promises'
import { processAtivoFile } from '../../services/embedding.service'
import { analyzePdfContent, analyzePdfBuffer } from '../../services/pdf-analysis.service'

const UPLOADS_DIR = path.resolve('uploads')
const PDFS_DIR = path.resolve('uploads', 'pdfs')

function resolveUploadPath(filePath: string): string {
  const fileName = filePath.split(/[/\\]/).pop() || filePath
  const newPath = path.join(PDFS_DIR, fileName)
  if (fs.existsSync(newPath)) return newPath
  const legacyPath = path.join(UPLOADS_DIR, fileName)
  if (fs.existsSync(legacyPath)) return legacyPath
  return newPath
}

const USAGE_GROUP_LABEL: Record<AtivoUsageGroup, string> = {
  EXTERNO: 'Uso externo',
  INTERNO: 'Uso interno',
  AMBOS: 'Ambos',
}

/** Itens cadastráveis: só externo e interno. AMBOS é só escopo no ativo (seleção unida). */
const catalogUsageGroupSchema = z.enum(['EXTERNO', 'INTERNO'])
const usageScopeSchema = z.enum(['EXTERNO', 'INTERNO', 'AMBOS'])

async function normalizeUsageTypeItemId(
  raw: string | null | undefined,
): Promise<{ ok: true; id: string | null | undefined } | { ok: false }> {
  if (raw === undefined) return { ok: true, id: undefined }
  const v = raw == null ? '' : String(raw).trim()
  if (!v) return { ok: true, id: null }
  const it = await prisma.ativoUsageItem.findUnique({ where: { id: v } })
  if (!it) return { ok: false }
  return { ok: true, id: v }
}

function validateUsageScopeAgainstItem(
  scope: AtivoUsageGroup | null,
  itemGroup: AtivoUsageGroup,
): { ok: true } | { ok: false; message: string } {
  if (scope === null) return { ok: true }
  if (scope === 'AMBOS') {
    if (itemGroup === 'EXTERNO' || itemGroup === 'INTERNO' || itemGroup === 'AMBOS') return { ok: true }
    return { ok: false, message: 'Modo Ambos exige item de uso externo ou interno.' }
  }
  if (scope === 'EXTERNO' && itemGroup !== 'EXTERNO') {
    return { ok: false, message: 'Item não pertence a uso externo.' }
  }
  if (scope === 'INTERNO' && itemGroup !== 'INTERNO') {
    return { ok: false, message: 'Item não pertence a uso interno.' }
  }
  return { ok: true }
}

async function resolveAtivoUsageFields(
  rawScope: string | null | undefined,
  rawItemId: string | null | undefined,
): Promise<
  | { ok: true; usageScope: AtivoUsageGroup | null; usageTypeItemId: string | null }
  | { ok: false; message: string }
> {
  const itemIdStr =
    rawItemId === undefined || rawItemId === null ? '' : String(rawItemId).trim()

  const n = await normalizeUsageTypeItemId(itemIdStr === '' ? null : itemIdStr)
  if (!n.ok) return { ok: false, message: 'Tipo de uso selecionado é inválido.' }

  /** Só escopo (sem item): o “pai” cobre todo o catálogo daquele uso. */
  if (itemIdStr === '' || n.id === null) {
    const sc = rawScope === undefined || rawScope === null ? '' : String(rawScope).trim()
    if (sc === '') {
      return { ok: true, usageScope: null, usageTypeItemId: null }
    }
    if (!['EXTERNO', 'INTERNO', 'AMBOS'].includes(sc)) {
      return { ok: false, message: 'Escopo de uso inválido.' }
    }
    return { ok: true, usageScope: sc as AtivoUsageGroup, usageTypeItemId: null }
  }

  const id = n.id as string
  const item = await prisma.ativoUsageItem.findUnique({ where: { id } })
  if (!item) return { ok: false, message: 'Tipo de uso inválido.' }

  const scopeStr = rawScope === undefined || rawScope === null ? '' : String(rawScope).trim()
  const scope: AtivoUsageGroup =
    scopeStr === '' ? (item.group === 'AMBOS' ? 'AMBOS' : item.group) : (scopeStr as AtivoUsageGroup)

  if (!['EXTERNO', 'INTERNO', 'AMBOS'].includes(scope)) {
    return { ok: false, message: 'Escopo de uso inválido.' }
  }

  const v = validateUsageScopeAgainstItem(scope, item.group)
  if (!v.ok) return { ok: false, message: v.message }

  return { ok: true, usageScope: scope, usageTypeItemId: id }
}

export async function ativosRoutes(app: FastifyInstance) {
  app.get('/ativos/usage-items', { preHandler: [authGuard] }, async () => {
    const items = await prisma.ativoUsageItem.findMany({
      orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    })
    const order: AtivoUsageGroup[] = ['EXTERNO', 'INTERNO']
    return {
      groups: order.map((key) => ({
        key,
        label: USAGE_GROUP_LABEL[key],
        items: items.filter((i) => i.group === key),
      })),
    }
  })

  app.post('/ativos/usage-items', { preHandler: [adminGuard] }, async (request, reply) => {
    const body = z
      .object({
        group: catalogUsageGroupSchema,
        name: z.string().min(1).max(120),
      })
      .parse(request.body)
    const name = body.name.trim()
    if (!name) {
      return reply.status(400).send({ error: 'Informe o nome do tipo de uso' })
    }
    const agg = await prisma.ativoUsageItem.aggregate({
      where: { group: body.group },
      _max: { sortOrder: true },
    })
    const sortOrder = (agg._max.sortOrder ?? 0) + 1
    try {
      const item = await prisma.ativoUsageItem.create({
        data: { group: body.group, name, sortOrder },
      })
      return reply.status(201).send(item)
    } catch (e: unknown) {
      const err = e as { code?: string }
      if (err.code === 'P2002') {
        return reply.status(409).send({ error: 'Já existe um item com este nome neste grupo.' })
      }
      throw e
    }
  })

  app.patch('/ativos/usage-items/:itemId', { preHandler: [adminGuard] }, async (request, reply) => {
    const { itemId } = request.params as { itemId: string }
    const body = z.object({ name: z.string().min(1).max(120) }).parse(request.body)
    const name = body.name.trim()
    try {
      const item = await prisma.ativoUsageItem.update({
        where: { id: itemId },
        data: { name },
      })
      return item
    } catch (e: unknown) {
      const err = e as { code?: string }
      if (err.code === 'P2025') {
        return reply.status(404).send({ error: 'Item não encontrado' })
      }
      if (err.code === 'P2002') {
        return reply.status(409).send({ error: 'Já existe um item com este nome neste grupo.' })
      }
      throw e
    }
  })

  app.delete('/ativos/usage-items/:itemId', { preHandler: [adminGuard] }, async (request, reply) => {
    const { itemId } = request.params as { itemId: string }
    try {
      await prisma.ativoUsageItem.delete({ where: { id: itemId } })
      return { success: true }
    } catch (e: unknown) {
      const err = e as { code?: string }
      if (err.code === 'P2025') {
        return reply.status(404).send({ error: 'Item não encontrado' })
      }
      throw e
    }
  })

  app.get('/ativos', { preHandler: [authGuard] }, async () => {
    return prisma.ativo.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        usageTypeItem: { select: { id: true, group: true, name: true } },
      },
    })
  })

  app.get('/ativos/:id', { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const ativo = await prisma.ativo.findUnique({
      where: { id },
      include: {
        usageTypeItem: { select: { id: true, group: true, name: true } },
      },
    })
    if (!ativo) return reply.status(404).send({ error: 'Ativo não encontrado' })
    return ativo
  })

  app.get('/ativos/:id/download', async (request, reply) => {
    const { token } = request.query as { token?: string }
    if (token) {
      try { app.jwt.verify(token) } catch { return reply.status(401).send({ error: 'Token inválido' }) }
    } else {
      try { await request.jwtVerify() } catch { return reply.status(401).send({ error: 'Não autorizado' }) }
    }

    const { id } = request.params as { id: string }
    const ativo = await prisma.ativo.findUnique({ where: { id } })
    if (!ativo || !ativo.filePath) {
      return reply.status(404).send({ error: 'Arquivo não encontrado' })
    }
    const absolutePath = resolveUploadPath(ativo.filePath)
    if (!fs.existsSync(absolutePath)) {
      return reply.status(404).send({ error: 'Arquivo não encontrado no disco' })
    }
    return reply
      .header('Content-Disposition', `attachment; filename="${ativo.fileName}"`)
      .type('application/pdf')
      .send(fs.createReadStream(absolutePath))
  })

  app.get('/ativos/:id/view', async (request, reply) => {
    const { token } = request.query as { token?: string }
    if (token) {
      try {
        app.jwt.verify(token)
      } catch {
        return reply.status(401).send({ error: 'Token inválido' })
      }
    } else {
      try {
        await request.jwtVerify()
      } catch {
        return reply.status(401).send({ error: 'Não autorizado' })
      }
    }

    const { id } = request.params as { id: string }
    const ativo = await prisma.ativo.findUnique({ where: { id } })
    if (!ativo || !ativo.filePath) {
      return reply.status(404).send({ error: 'Arquivo não encontrado' })
    }
    const absolutePath = resolveUploadPath(ativo.filePath)
    if (!fs.existsSync(absolutePath)) {
      return reply.status(404).send({ error: 'Arquivo não encontrado no disco' })
    }
    return reply
      .header('Content-Disposition', `inline; filename="${ativo.fileName}"`)
      .header('Cache-Control', 'public, max-age=3600')
      .type('application/pdf')
      .send(fs.createReadStream(absolutePath))
  })

  app.post('/ativos/analyze-pdf', { preHandler: [adminGuard] }, async (request, reply) => {
    const data = await request.file()
    if (!data) {
      return reply.status(400).send({ error: 'Envie um arquivo PDF' })
    }
    const adminId = (request.user as { id: string }).id
    const chunks: Buffer[] = []
    for await (const chunk of data.file) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)
    try {
      const analysis = await analyzePdfBuffer(buffer, adminId)
      if (!analysis) {
        return reply.status(400).send({ error: 'Não foi possível analisar. Verifique se a IA está configurada.' })
      }
      return analysis
    } catch (error: any) {
      return reply.status(500).send({ error: error.message })
    }
  })

  app.post('/ativos', { preHandler: [adminGuard] }, async (request, reply) => {
    const adminId = (request.user as { id: string }).id
    const data = await request.file()

    if (!data) {
      const schema = z.object({
        name: z.string().min(2),
        description: z.string().optional(),
        usageType: z.string().optional(),
        usageTypeItemId: z.union([z.string().uuid(), z.literal(''), z.null()]).optional(),
        usageScope: z.union([usageScopeSchema, z.literal(''), z.null()]).optional(),
        compatibleForms: z.string().optional(),
        concentrationMin: z.string().optional(),
        concentrationMax: z.string().optional(),
        contraindications: z.string().optional(),
        technicalNotes: z.string().optional(),
      })
      const body = schema.parse(request.body)
      const { usageTypeItemId: rawUid, usageScope: rawScope, ...rest } = body
      const u = await resolveAtivoUsageFields(
        rawScope === undefined || rawScope === null || rawScope === '' ? null : rawScope,
        rawUid === undefined ? null : rawUid === null || rawUid === '' ? null : rawUid,
      )
      if (!u.ok) return reply.status(400).send({ error: u.message })
      const ativo = await prisma.ativo.create({
        data: {
          ...rest,
          usageTypeItemId: u.usageTypeItemId,
          usageScope: u.usageScope,
        },
        include: {
          usageTypeItem: { select: { id: true, group: true, name: true } },
        },
      })
      return reply.status(201).send(ativo)
    }

    const fields = data.fields as any
    const name = fields.name?.value || 'Sem nome'
    const description = fields.description?.value || ''
    const usageType = fields.usageType?.value || undefined
    const compatibleForms = fields.compatibleForms?.value || undefined
    const concentrationMin = fields.concentrationMin?.value || undefined
    const concentrationMax = fields.concentrationMax?.value || undefined
    const contraindications = fields.contraindications?.value || undefined
    const technicalNotes = fields.technicalNotes?.value || undefined

    const rawUid = fields.usageTypeItemId?.value
    const rawScope = fields.usageScope?.value
    const uidStr = typeof rawUid === 'string' ? rawUid.trim() : ''
    const scopeStr = typeof rawScope === 'string' && rawScope.trim() !== '' ? rawScope.trim() : null
    const u = await resolveAtivoUsageFields(scopeStr, uidStr === '' ? null : uidStr)
    if (!u.ok) return reply.status(400).send({ error: u.message })

    let filePath: string | undefined
    let fileName: string | undefined

    if (data.filename) {
      if (!fs.existsSync(PDFS_DIR)) fs.mkdirSync(PDFS_DIR, { recursive: true })

      fileName = `${Date.now()}-${data.filename}`
      filePath = path.join(PDFS_DIR, fileName)
      await pipeline(data.file, fs.createWriteStream(filePath))
    }

    const ativo = await prisma.ativo.create({
      data: {
        name, description, filePath, fileName,
        usageType, compatibleForms,
        concentrationMin, concentrationMax,
        contraindications, technicalNotes,
        usageTypeItemId: u.usageTypeItemId,
        usageScope: u.usageScope,
      },
      include: {
        usageTypeItem: { select: { id: true, group: true, name: true } },
      },
    })

    if (filePath) {
      processAtivoFile(ativo.id).catch((err) =>
        console.error('Erro ao processar PDF (embeddings):', err.message)
      )
      analyzePdfContent(ativo.id, adminId).catch((err) =>
        console.error('Erro ao analisar PDF (IA):', err.message)
      )
    }

    return reply.status(201).send(ativo)
  })

  app.put('/ativos/:id', { preHandler: [adminGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const contentType = request.headers['content-type'] || ''

    if (contentType.includes('multipart/form-data')) {
      const data = await request.file()
      if (!data) return reply.status(400).send({ error: 'Dados inválidos' })

      const fields = data.fields as any
      const updateData: any = {}
      if (fields.name?.value) updateData.name = fields.name.value
      if (fields.description?.value !== undefined) updateData.description = fields.description.value
      if (fields.usageType?.value !== undefined) updateData.usageType = fields.usageType.value
      if (fields.compatibleForms?.value !== undefined) updateData.compatibleForms = fields.compatibleForms.value
      if (fields.concentrationMin?.value !== undefined) updateData.concentrationMin = fields.concentrationMin.value
      if (fields.concentrationMax?.value !== undefined) updateData.concentrationMax = fields.concentrationMax.value
      if (fields.contraindications?.value !== undefined) updateData.contraindications = fields.contraindications.value
      if (fields.technicalNotes?.value !== undefined) updateData.technicalNotes = fields.technicalNotes.value
      if (fields.usageTypeItemId !== undefined || fields.usageScope !== undefined) {
        const current = await prisma.ativo.findUnique({ where: { id } })
        const rawUid = fields.usageTypeItemId !== undefined ? fields.usageTypeItemId?.value : current?.usageTypeItemId
        const rawScope = fields.usageScope !== undefined ? fields.usageScope?.value : current?.usageScope
        const uidStr =
          rawUid === undefined || rawUid === null ? '' : String(rawUid).trim()
        const scopeStr =
          rawScope === undefined || rawScope === null || String(rawScope).trim() === ''
            ? null
            : String(rawScope).trim()
        const u = await resolveAtivoUsageFields(scopeStr, uidStr === '' ? null : uidStr)
        if (!u.ok) return reply.status(400).send({ error: u.message })
        updateData.usageTypeItemId = u.usageTypeItemId
        updateData.usageScope = u.usageScope
      }

      if (data.filename) {
        if (!fs.existsSync(PDFS_DIR)) fs.mkdirSync(PDFS_DIR, { recursive: true })

        const fileName = `${Date.now()}-${data.filename}`
        const filePath = path.join(PDFS_DIR, fileName)
        await pipeline(data.file, fs.createWriteStream(filePath))
        updateData.filePath = filePath
        updateData.fileName = fileName
      }

      const ativo = await prisma.ativo.update({
        where: { id },
        data: updateData,
        include: {
          usageTypeItem: { select: { id: true, group: true, name: true } },
        },
      })

      if (updateData.filePath) {
        processAtivoFile(ativo.id).catch((err) =>
          console.error('Erro ao processar PDF (embeddings):', err.message)
        )
      }

      return ativo
    }

    const schema = z.object({
      name: z.string().min(2).optional(),
      description: z.string().optional(),
      usageType: z.string().optional(),
      usageTypeItemId: z.union([z.string().uuid(), z.literal(''), z.null()]).optional(),
      usageScope: z.union([usageScopeSchema, z.literal(''), z.null()]).optional(),
      compatibleForms: z.string().optional(),
      concentrationMin: z.string().optional(),
      concentrationMax: z.string().optional(),
      contraindications: z.string().optional(),
      technicalNotes: z.string().optional(),
    })

    const body = schema.parse(request.body)
    const { usageTypeItemId: rawUid, usageScope: rawScope, ...rest } = body

    const current = await prisma.ativo.findUnique({ where: { id } })
    if (!current) return reply.status(404).send({ error: 'Ativo não encontrado' })

    const mergedUid =
      rawUid === undefined ? current.usageTypeItemId : rawUid === null || rawUid === '' ? null : rawUid
    const mergedScope =
      rawScope === undefined
        ? current.usageScope
        : rawScope === null || rawScope === ''
          ? null
          : rawScope

    const u = await resolveAtivoUsageFields(
      mergedScope === undefined || mergedScope === null ? null : mergedScope,
      mergedUid === undefined || mergedUid === null ? null : mergedUid,
    )
    if (!u.ok) return reply.status(400).send({ error: u.message })

    const ativo = await prisma.ativo.update({
      where: { id },
      data: {
        ...rest,
        usageTypeItemId: u.usageTypeItemId,
        usageScope: u.usageScope,
      },
      include: {
        usageTypeItem: { select: { id: true, group: true, name: true } },
      },
    })
    return ativo
  })

  app.post('/ativos/:id/analyze', { preHandler: [adminGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const adminId = (request.user as { id: string }).id
    try {
      const analysis = await analyzePdfContent(id, adminId)
      if (!analysis) {
        return reply.status(400).send({ error: 'Não foi possível analisar. Verifique se o ativo possui PDF e se a IA está configurada.' })
      }
      const ativo = await prisma.ativo.findUnique({
        where: { id },
        include: { usageTypeItem: { select: { id: true, group: true, name: true } } },
      })
      return ativo
    } catch (error: any) {
      return reply.status(500).send({ error: error.message })
    }
  })

  app.delete('/ativos/:id', { preHandler: [adminGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const ativo = await prisma.ativo.findUnique({ where: { id } })
    if (!ativo) {
      return reply.status(404).send({ error: 'Ativo não encontrado' })
    }

    if (ativo.filePath) {
      try {
        const abs = resolveUploadPath(ativo.filePath)
        if (fs.existsSync(abs)) fs.unlinkSync(abs)
      } catch { /* arquivo pode não existir mais */ }
    }

    await prisma.embedding.deleteMany({ where: { ativoId: id } })
    await prisma.ativo.delete({ where: { id } })
    return reply.send({ success: true })
  })
}
