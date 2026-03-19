import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/prisma'
import { authGuard, adminGuard } from '../../middleware/auth'
import path from 'path'
import fs from 'fs'
import { pipeline } from 'stream/promises'
import { processAtivoFile } from '../../services/embedding.service'
import { analyzePdfContent, analyzePdfBuffer } from '../../services/pdf-analysis.service'

const UPLOADS_DIR = path.resolve('uploads')

function resolveUploadPath(filePath: string): string {
  const fileName = filePath.split(/[/\\]/).pop() || filePath
  return path.join(UPLOADS_DIR, fileName)
}

export async function ativosRoutes(app: FastifyInstance) {
  app.get('/ativos', { preHandler: [authGuard] }, async () => {
    return prisma.ativo.findMany({ orderBy: { createdAt: 'desc' } })
  })

  app.get('/ativos/:id', { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const ativo = await prisma.ativo.findUnique({ where: { id } })
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
    const chunks: Buffer[] = []
    for await (const chunk of data.file) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)
    try {
      const analysis = await analyzePdfBuffer(buffer)
      if (!analysis) {
        return reply.status(400).send({ error: 'Não foi possível analisar. Verifique se a IA está configurada.' })
      }
      return analysis
    } catch (error: any) {
      return reply.status(500).send({ error: error.message })
    }
  })

  app.post('/ativos', { preHandler: [adminGuard] }, async (request, reply) => {
    const data = await request.file()

    if (!data) {
      const schema = z.object({
        name: z.string().min(2),
        description: z.string().optional(),
        usageType: z.string().optional(),
        compatibleForms: z.string().optional(),
        category: z.string().optional(),
        concentrationMin: z.string().optional(),
        concentrationMax: z.string().optional(),
        contraindications: z.string().optional(),
        technicalNotes: z.string().optional(),
      })
      const body = schema.parse(request.body)
      const ativo = await prisma.ativo.create({ data: body })
      return reply.status(201).send(ativo)
    }

    const fields = data.fields as any
    const name = fields.name?.value || 'Sem nome'
    const description = fields.description?.value || ''
    const usageType = fields.usageType?.value || undefined
    const compatibleForms = fields.compatibleForms?.value || undefined
    const category = fields.category?.value || undefined
    const concentrationMin = fields.concentrationMin?.value || undefined
    const concentrationMax = fields.concentrationMax?.value || undefined
    const contraindications = fields.contraindications?.value || undefined
    const technicalNotes = fields.technicalNotes?.value || undefined

    let filePath: string | undefined
    let fileName: string | undefined

    if (data.filename) {
      const uploadsDir = path.resolve('uploads')
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

      fileName = `${Date.now()}-${data.filename}`
      filePath = path.join(uploadsDir, fileName)
      await pipeline(data.file, fs.createWriteStream(filePath))
    }

    const ativo = await prisma.ativo.create({
      data: {
        name, description, filePath, fileName,
        usageType, compatibleForms, category,
        concentrationMin, concentrationMax,
        contraindications, technicalNotes,
      },
    })

    if (filePath) {
      processAtivoFile(ativo.id).catch((err) =>
        console.error('Erro ao processar PDF (embeddings):', err.message)
      )
      analyzePdfContent(ativo.id).catch((err) =>
        console.error('Erro ao analisar PDF (IA):', err.message)
      )
    }

    return reply.status(201).send(ativo)
  })

  app.put('/ativos/:id', { preHandler: [adminGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const schema = z.object({
      name: z.string().min(2).optional(),
      description: z.string().optional(),
      usageType: z.string().optional(),
      compatibleForms: z.string().optional(),
      category: z.string().optional(),
      concentrationMin: z.string().optional(),
      concentrationMax: z.string().optional(),
      contraindications: z.string().optional(),
      technicalNotes: z.string().optional(),
    })

    const data = schema.parse(request.body)
    const ativo = await prisma.ativo.update({ where: { id }, data })
    return ativo
  })

  app.post('/ativos/:id/analyze', { preHandler: [adminGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const analysis = await analyzePdfContent(id)
      if (!analysis) {
        return reply.status(400).send({ error: 'Não foi possível analisar. Verifique se o ativo possui PDF e se a IA está configurada.' })
      }
      const ativo = await prisma.ativo.findUnique({ where: { id } })
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
