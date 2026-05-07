import * as XLSX from 'xlsx'
import { prisma } from '../config/prisma'

export async function buildAtivosExportXlsxBuffer(): Promise<Buffer> {
  const ativos = await prisma.ativo.findMany({
    orderBy: { name: 'asc' },
    include: {
      usageTypeItem: true,
      _count: { select: { embeddings: true } },
    },
  })

  const rows = ativos.map((a) => ({
    id: a.id,
    nome: a.name,
    descricao: a.description ?? '',
    arquivoNome: a.fileName ?? '',
    usoTipoLegado: a.usageType ?? '',
    usoTipoItemGrupo: a.usageTypeItem?.group ?? '',
    usoTipoItemNome: a.usageTypeItem?.name ?? '',
    escopoUso: a.usageScope ?? '',
    formasCompativeis: a.compatibleForms ?? '',
    categoria: a.category ?? '',
    concentracaoMin: a.concentrationMin ?? '',
    concentracaoMax: a.concentrationMax ?? '',
    contraindicacoes: a.contraindications ?? '',
    notasTecnicas: a.technicalNotes ?? '',
    qtdEmbeddings: a._count.embeddings,
    criadoEm: a.createdAt.toISOString(),
    atualizadoEm: a.updatedAt.toISOString(),
  }))

  const embeddings = await prisma.embedding.findMany({
    orderBy: [{ ativoId: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      ativoId: true,
      content: true,
      createdAt: true,
      ativo: { select: { name: true } },
    },
  })

  const embRows = embeddings.map((e) => ({
    embeddingId: e.id,
    ativoId: e.ativoId,
    ativoNome: e.ativo.name,
    conteudo: e.content,
    criadoEm: e.createdAt.toISOString(),
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Ativos')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(embRows), 'Embeddings')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return buf
}
