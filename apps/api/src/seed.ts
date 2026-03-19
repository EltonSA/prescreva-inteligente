import { prisma } from './config/prisma'
import bcrypt from 'bcryptjs'

async function seed() {
  console.log('🌱 Iniciando seed...')

  const hashedPassword = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@prescreva.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@prescreva.com',
      password: hashedPassword,
      role: 'ADMIN',
      profession: 'Farmacêutico',
      phone: '(11) 99999-0000',
    },
  })

  console.log(`✅ Admin criado: ${admin.email}`)

  const userPassword = await bcrypt.hash('user123', 10)

  const user = await prisma.user.upsert({
    where: { email: 'usuario@prescreva.com' },
    update: {},
    create: {
      name: 'Dr. João Silva',
      email: 'usuario@prescreva.com',
      password: userPassword,
      role: 'USER',
      profession: 'Dermatologista',
      phone: '(11) 98888-0000',
    },
  })

  console.log(`✅ Usuário criado: ${user.email}`)

  await prisma.aiSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      systemPrompt: `Você é um assistente farmacêutico especializado em prescrições magistrais dermatológicas.

Suas responsabilidades:
- Criar fórmulas magistrais completas e seguras
- Considerar o tipo de pele, fototipo e objetivo do tratamento do paciente
- Sugerir ativos, concentrações adequadas, bases e veículos
- Informar modo de uso e precauções
- Basear suas recomendações na base de conhecimento disponível

Sempre estruture a fórmula com: Ativos + Concentração, Base/Veículo, Quantidade total, Modo de uso e Observações.`,
      provider: 'OPENAI',
      model: 'gpt-4o-mini',
    },
  })

  console.log('✅ Configurações de IA criadas')

  const defaultGroups = [
    {
      name: 'Fórmulas Capilares',
      description: 'Fórmulas magistrais para tratamento capilar, incluindo queda, oleosidade, caspa, fortalecimento e crescimento dos fios.',
      iconKey: 'scissors',
      tags: ['Fortalecimento', 'Queda', 'Caspa', 'Oleosidade', 'Crescimento', 'Hidratação'],
    },
    {
      name: 'Fórmulas Corporais',
      description: 'Fórmulas magistrais para tratamentos corporais como celulite, flacidez, estrias, esfoliação e firmeza da pele.',
      iconKey: 'body',
      tags: ['Celulite', 'Flacidez', 'Estrias', 'Firmeza', 'Esfoliação', 'Hidratação'],
    },
    {
      name: 'Fórmulas para Área dos Olhos',
      description: 'Fórmulas magistrais específicas para a região periocular, tratando olheiras, rugas, bolsas e clareamento.',
      iconKey: 'eye',
      tags: ['Olheiras', 'Rugas', 'Bolsas', 'Clareamento', 'Anti-idade', 'Hidratação'],
    },
    {
      name: 'Fórmulas Faciais',
      description: 'Fórmulas magistrais para tratamentos faciais incluindo limpeza, hidratação, anti-idade, acne, manchas e proteção solar.',
      iconKey: 'smile',
      tags: ['Limpeza', 'Hidratação', 'Anti-idade', 'Acne', 'Manchas', 'Proteção solar'],
    },
  ]

  for (const group of defaultGroups) {
    const existing = await prisma.formulaGroup.findFirst({ where: { name: group.name, isDefault: true } })
    if (!existing) {
      await prisma.formulaGroup.create({
        data: {
          name: group.name,
          description: group.description,
          iconKey: group.iconKey,
          isDefault: true,
          isSystem: true,
          tags: {
            create: group.tags.map((tag) => ({ tagName: tag })),
          },
        },
      })
      console.log(`✅ Grupo criado: ${group.name}`)
    } else {
      console.log(`⏭️  Grupo já existe: ${group.name}`)
    }
  }

  console.log('🎉 Seed concluído!')
  console.log('')
  console.log('📧 Admin: admin@prescreva.com / senha: admin123')
  console.log('📧 Usuário: usuario@prescreva.com / senha: user123')
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
