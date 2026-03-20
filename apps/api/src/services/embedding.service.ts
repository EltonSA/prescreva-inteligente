import { prisma } from '../config/prisma'
import fs from 'fs'
import path from 'path'
import pdfParse from 'pdf-parse'

const UPLOADS_DIR = path.resolve('uploads')
const PDFS_DIR = path.resolve('uploads', 'pdfs')

function chunkText(text: string, maxChunkSize = 500): string[] {
  const sentences = text.split(/[.!?]\s+/)
  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    if ((current + sentence).length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim())
      current = ''
    }
    current += sentence + '. '
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim())
  }

  return chunks
}

export async function processAtivoFile(ativoId: string): Promise<void> {
  const ativo = await prisma.ativo.findUnique({ where: { id: ativoId } })
  if (!ativo || !ativo.filePath) return

  const fileName = ativo.filePath.split(/[/\\]/).pop() || ativo.filePath
  let resolvedPath = path.join(PDFS_DIR, fileName)
  if (!fs.existsSync(resolvedPath)) {
    resolvedPath = path.join(UPLOADS_DIR, fileName)
  }
  if (!fs.existsSync(resolvedPath)) return

  const fileBuffer = fs.readFileSync(resolvedPath)
  const pdfData = await pdfParse(fileBuffer)
  const text = pdfData.text

  if (!text || text.trim().length === 0) return

  await prisma.embedding.deleteMany({ where: { ativoId } })

  const chunks = chunkText(text)

  for (const chunk of chunks) {
    await prisma.embedding.create({
      data: {
        content: chunk,
        embedding: [],
        ativoId,
      },
    })
  }
}
