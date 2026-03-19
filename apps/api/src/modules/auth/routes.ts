import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import path from 'path'
import fs from 'fs'
import { prisma } from '../../config/prisma'

const UPLOADS_DIR = path.resolve('uploads')

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (request, reply) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
    })

    const { email, password } = schema.parse(request.body)

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return reply.status(401).send({ error: 'Credenciais inválidas' })
    }

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return reply.status(401).send({ error: 'Credenciais inválidas' })
    }

    if (!user.isActive) {
      return reply.status(403).send({ error: 'Sua conta está bloqueada. Entre em contato com o administrador.' })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    const token = app.jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      { expiresIn: '7d' }
    )

    return reply.send({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profession: user.profession,
        phone: user.phone,
        avatar: user.avatar,
      },
    })
  })

  app.post('/auth/register', async (request, reply) => {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      phone: z.string().optional(),
      profession: z.string().optional(),
    })

    const data = schema.parse(request.body)

    const exists = await prisma.user.findUnique({ where: { email: data.email } })
    if (exists) {
      return reply.status(409).send({ error: 'Email já cadastrado' })
    }

    const hashedPassword = await bcrypt.hash(data.password, 10)

    const user = await prisma.user.create({
      data: { ...data, password: hashedPassword },
    })

    return reply.status(201).send({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    })
  })

  const authPreHandler = async (req: any, rep: any) => {
    try { await req.jwtVerify() } catch { return rep.status(401).send({ error: 'Não autorizado' }) }
  }

  app.get('/auth/me', { preHandler: [authPreHandler] }, async (request) => {
    const { id } = request.user as { id: string }
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, profession: true, phone: true, avatar: true },
    })
    return user
  })

  app.put('/auth/profile', { preHandler: [authPreHandler] }, async (request, reply) => {
    const { id } = request.user as { id: string }

    const schema = z.object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional().nullable(),
      profession: z.string().optional().nullable(),
      password: z.string().min(6).optional(),
      currentPassword: z.string().optional(),
    })

    const data = schema.parse(request.body)

    if (data.password) {
      if (!data.currentPassword) {
        return reply.status(400).send({ error: 'Senha atual é obrigatória para alterar a senha' })
      }
      const user = await prisma.user.findUnique({ where: { id } })
      if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' })

      const validPassword = await bcrypt.compare(data.currentPassword, user.password)
      if (!validPassword) {
        return reply.status(400).send({ error: 'Senha atual incorreta' })
      }
    }

    const updateData: any = {}
    if (data.name) updateData.name = data.name
    if (data.email) updateData.email = data.email
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.profession !== undefined) updateData.profession = data.profession
    if (data.password) updateData.password = await bcrypt.hash(data.password, 10)

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, profession: true, phone: true, avatar: true },
    })

    return user
  })

  app.post('/auth/avatar', { preHandler: [authPreHandler] }, async (request, reply) => {
    const { id } = request.user as { id: string }

    const data = await request.file()
    if (!data) return reply.status(400).send({ error: 'Nenhum arquivo enviado' })

    const ext = path.extname(data.filename).toLowerCase()
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      return reply.status(400).send({ error: 'Formato inválido. Use JPG, PNG ou WEBP' })
    }

    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true })
    }

    const fileName = `avatar-${id}${ext}`
    const filePath = path.join(UPLOADS_DIR, fileName)

    const oldUser = await prisma.user.findUnique({ where: { id }, select: { avatar: true } })
    if (oldUser?.avatar) {
      const oldPath = path.join(UPLOADS_DIR, oldUser.avatar)
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
    }

    const buffer = await data.toBuffer()
    fs.writeFileSync(filePath, buffer)

    const user = await prisma.user.update({
      where: { id },
      data: { avatar: fileName },
      select: { id: true, name: true, email: true, role: true, profession: true, phone: true, avatar: true },
    })

    return user
  })

  app.get('/uploads/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string }
    const filePath = path.join(UPLOADS_DIR, filename)

    if (!fs.existsSync(filePath)) {
      return reply.status(404).send({ error: 'Arquivo não encontrado' })
    }

    const ext = path.extname(filename).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    }

    reply.header('Content-Type', mimeTypes[ext] || 'application/octet-stream')
    reply.header('Cache-Control', 'public, max-age=31536000')
    return reply.send(fs.readFileSync(filePath))
  })
}
