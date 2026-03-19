import 'dotenv/config'

const isProduction = process.env.NODE_ENV === 'production'

if (isProduction) {
  const required = ['DATABASE_URL', 'JWT_SECRET'] as const
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Variável de ambiente obrigatória não definida: ${key}`)
    }
  }
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/prescrevadb',
  JWT_SECRET: process.env.JWT_SECRET || 'prescreva-secret-dev',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  API_PORT: Number(process.env.API_PORT) || 3333,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
}
