import 'dotenv/config'
import path from 'path'
import fs from 'fs'
import { prisma } from './config/prisma'
import { processAtivoFile } from './services/embedding.service'

const BUBBLE_BASE_URL = process.env.BUBBLE_BASE_URL || ''
const BUBBLE_DATA_TYPE = process.env.BUBBLE_DATA_TYPE || 'ativo'
const BUBBLE_API_TOKEN = (process.env.BUBBLE_API_TOKEN || '').trim()
const UPLOADS_DIR = path.resolve('uploads')
const PDFS_DIR = path.resolve('uploads', 'pdfs')

function cleanFileName(name: string): string {
  return name
    .trim()
    .replace(/[<>:"/\\|?*]+/g, '_')
    .replace(/\s+/g, ' ')
}

function fixPdfUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('//')) return `https:${url}`
  return url
}

async function fetchAtivos(limit: number) {
  const url = `${BUBBLE_BASE_URL}/${BUBBLE_DATA_TYPE}?limit=${limit}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (BUBBLE_API_TOKEN) {
    headers['Authorization'] = `Bearer ${BUBBLE_API_TOKEN}`
  }

  let allResults: any[] = []
  let cursor = 0

  while (true) {
    const pageUrl = `${url}&cursor=${cursor}`
    console.log(`Buscando ativos (cursor: ${cursor})...`)

    const response = await fetch(pageUrl, { headers })
    if (!response.ok) {
      throw new Error(`Erro ao buscar ativos: ${response.status} ${response.statusText}`)
    }

    const data: any = await response.json()
    const results = data.response?.results || []
    const remaining = data.response?.remaining || 0

    allResults = allResults.concat(results)
    console.log(`  -> ${results.length} nesta página, total acumulado: ${allResults.length}, restantes: ${remaining}`)

    if (remaining <= 0 || results.length === 0) break
    cursor += results.length
  }

  return allResults
}

async function downloadPdf(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Erro ao baixar PDF: ${response.status}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  fs.writeFileSync(outputPath, buffer)
}

async function main() {
  if (!fs.existsSync(PDFS_DIR)) {
    fs.mkdirSync(PDFS_DIR, { recursive: true })
  }

  console.log('=== Sincronizacao Bubble -> Prescreva ===\n')

  const ativos = await fetchAtivos(100)
  console.log(`Encontrados: ${ativos.length} ativos\n`)

  let imported = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < ativos.length; i++) {
    const item = ativos[i]
    const nome = item.nome_do_ativo_text || `ativo_${i + 1}`
    const pdfUrl = fixPdfUrl(item.pdf_ativo_file || '')
    const bubbleId = item._id || ''

    console.log(`[${i + 1}/${ativos.length}] ${nome}`)

    const existing = await prisma.ativo.findFirst({
      where: { name: nome },
    })

    if (existing) {
      if (existing.filePath && pdfUrl) {
        const existingFile = existing.filePath.split(/[/\\]/).pop() || existing.filePath
        const existingPath = path.join(PDFS_DIR, existingFile)
        const legacyPath = path.join(UPLOADS_DIR, existingFile)
        if (!fs.existsSync(existingPath) && !fs.existsSync(legacyPath)) {
          console.log(`  -> Existe no banco mas PDF ausente no disco, re-baixando...`)
          try {
            const cleanName = cleanFileName(nome)
            const newFileName = `${Date.now()}-${cleanName}.pdf`
            const newFilePath = path.join(PDFS_DIR, newFileName)
            await downloadPdf(pdfUrl, newFilePath)
            await prisma.ativo.update({
              where: { id: existing.id },
              data: { filePath: newFilePath, fileName: newFileName },
            })
            console.log(`  -> PDF re-baixado: ${newFileName}`)
            await processAtivoFile(existing.id)
            console.log(`  -> PDF reprocessado!\n`)
            imported++
          } catch (err: any) {
            console.log(`  -> Erro ao re-baixar PDF: ${err.message}\n`)
            errors++
          }
          continue
        }
      }
      console.log(`  -> Ja existe no sistema, pulando.\n`)
      skipped++
      continue
    }

    let filePath: string | undefined
    let fileName: string | undefined

    if (pdfUrl) {
      try {
        const cleanName = cleanFileName(nome)
        fileName = `${Date.now()}-${cleanName}.pdf`
        filePath = path.join(PDFS_DIR, fileName)

        console.log(`  -> Baixando PDF...`)
        await downloadPdf(pdfUrl, filePath)
        console.log(`  -> PDF salvo: ${fileName}`)
      } catch (err: any) {
        console.log(`  -> Erro ao baixar PDF: ${err.message}`)
        filePath = undefined
        fileName = undefined
      }
    } else {
      console.log(`  -> Sem PDF`)
    }

    try {
      const ativo = await prisma.ativo.create({
        data: {
          name: nome,
          filePath,
          fileName,
        },
      })

      console.log(`  -> Cadastrado no Prescreva: ${ativo.id}`)

      if (filePath) {
        console.log(`  -> Processando PDF para base de conhecimento...`)
        await processAtivoFile(ativo.id)
        console.log(`  -> PDF processado!`)
      }

      imported++
      console.log()
    } catch (err: any) {
      console.log(`  -> Erro ao cadastrar: ${err.message}\n`)
      errors++
    }
  }

  console.log('=== Resultado ===')
  console.log(`Importados: ${imported}`)
  console.log(`Ja existiam: ${skipped}`)
  console.log(`Erros: ${errors}`)
  console.log(`Total processado: ${ativos.length}`)
}

main()
  .catch((err) => {
    console.error('Erro fatal:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
