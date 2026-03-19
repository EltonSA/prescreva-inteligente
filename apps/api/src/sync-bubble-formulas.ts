import 'dotenv/config'
import { prisma } from './config/prisma'

const BUBBLE_BASE_URL = (process.env.BUBBLE_BASE_URL || '').trim().replace(/\/+$/, '')
const BUBBLE_API_TOKEN = (process.env.BUBBLE_API_TOKEN || '').trim()

interface BubbleFormula {
  _id: string
  nome_formula_text?: string
  'descri__o_formula_text'?: string
  modo_uso_text?: string
  categoria_da_formula_option_categoria_da_formula?: string
  customizada_boolean?: boolean
  criador_user?: string
  'Created By'?: string
  'Created Date'?: string
  'Modified Date'?: string
}

async function fetchFormulas(): Promise<BubbleFormula[]> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (BUBBLE_API_TOKEN) {
    headers['Authorization'] = `Bearer ${BUBBLE_API_TOKEN}`
  }

  let allResults: BubbleFormula[] = []
  let cursor = 0

  while (true) {
    const url = `${BUBBLE_BASE_URL}/Formula?limit=100&cursor=${cursor}`
    console.log(`Buscando fórmulas (cursor: ${cursor})...`)

    const response = await fetch(url, { headers })
    if (!response.ok) {
      throw new Error(`Erro ao buscar fórmulas: ${response.status} ${response.statusText}`)
    }

    const data: any = await response.json()
    const results: BubbleFormula[] = data.response?.results || []
    const remaining = data.response?.remaining || 0

    allResults = allResults.concat(results)
    console.log(`  -> ${results.length} nesta página, total: ${allResults.length}, restantes: ${remaining}`)

    if (remaining <= 0 || results.length === 0) break
    cursor += results.length
  }

  return allResults
}

async function main() {
  console.log('=== Importação de Fórmulas: Bubble -> Prescreva ===\n')

  const groups = await prisma.formulaGroup.findMany()
  const groupMap = new Map(groups.map((g) => [g.name, g.id]))

  console.log('Grupos disponíveis no sistema:')
  for (const [name, id] of groupMap) {
    console.log(`  - ${name} (${id})`)
  }
  console.log()

  const formulas = await fetchFormulas()
  console.log(`\nTotal encontrado no Bubble: ${formulas.length}\n`)

  let imported = 0
  let skipped = 0
  let errors = 0
  let noGroup = 0

  for (let i = 0; i < formulas.length; i++) {
    const f = formulas[i]
    const name = f.nome_formula_text || `formula_${i + 1}`
    const composition = f['descri__o_formula_text'] || ''
    const instructions = f.modo_uso_text || ''
    const category = f.categoria_da_formula_option_categoria_da_formula || ''

    console.log(`[${i + 1}/${formulas.length}] ${name}`)
    console.log(`  Categoria: ${category || '(sem categoria)'}`)

    const groupId = groupMap.get(category)
    if (!groupId) {
      console.log(`  -> AVISO: Categoria "${category}" não encontrada nos grupos do sistema, pulando.\n`)
      noGroup++
      continue
    }

    const existing = await prisma.libraryFormula.findFirst({
      where: { name, groupId },
    })

    if (existing) {
      console.log(`  -> Já existe no sistema, pulando.\n`)
      skipped++
      continue
    }

    try {
      const created = await prisma.libraryFormula.create({
        data: {
          groupId,
          name,
          composition: composition.trim(),
          instructions: instructions.trim(),
          isOfficial: true,
        },
      })
      console.log(`  -> Importada com sucesso: ${created.id}\n`)
      imported++
    } catch (err: any) {
      console.log(`  -> Erro ao importar: ${err.message}\n`)
      errors++
    }
  }

  console.log('=== Resultado ===')
  console.log(`Importadas: ${imported}`)
  console.log(`Já existiam: ${skipped}`)
  console.log(`Sem grupo correspondente: ${noGroup}`)
  console.log(`Erros: ${errors}`)
  console.log(`Total processado: ${formulas.length}`)
}

main()
  .catch((err) => {
    console.error('Erro fatal:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
