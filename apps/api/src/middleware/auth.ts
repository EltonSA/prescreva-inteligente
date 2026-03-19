import { FastifyRequest, FastifyReply } from 'fastify'

export async function authGuard(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.status(401).send({ error: 'Token inválido ou expirado' })
  }
}

export async function adminGuard(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
    const user = request.user as { role: string }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Acesso restrito a administradores' })
    }
  } catch {
    return reply.status(401).send({ error: 'Token inválido ou expirado' })
  }
}
