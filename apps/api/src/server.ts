import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import { env } from './config/env'
import { authRoutes } from './modules/auth/routes'
import { usersRoutes } from './modules/users/routes'
import { patientsRoutes } from './modules/patients/routes'
import { ativosRoutes } from './modules/ativos/routes'
import { formulasRoutes } from './modules/formulas/routes'
import { formulaGroupsRoutes } from './modules/formula-groups/routes'
import { aiRoutes } from './modules/ai/routes'
import { conversationsRoutes } from './modules/conversations/routes'
import { feedbackRoutes } from './modules/feedback/routes'

const app = Fastify({
  logger: process.env.NODE_ENV === 'production' ? true : { level: 'warn' },
})

async function bootstrap() {
  const corsOrigin = env.NODE_ENV === 'production'
    ? env.CORS_ORIGIN.split(',').map(o => o.trim())
    : true

  await app.register(cors, {
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
  await app.register(jwt, { secret: env.JWT_SECRET })
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } })

  await app.register(authRoutes)
  await app.register(usersRoutes)
  await app.register(patientsRoutes)
  await app.register(ativosRoutes)
  await app.register(formulasRoutes)
  await app.register(formulaGroupsRoutes)
  await app.register(aiRoutes)
  await app.register(conversationsRoutes)
  await app.register(feedbackRoutes)

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  try {
    await app.listen({ port: env.API_PORT, host: '0.0.0.0' })
    console.log(`🚀 Prescreva API rodando em http://localhost:${env.API_PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

bootstrap()
