'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Settings, Key, Brain, Cpu, Save, Check } from 'lucide-react'

interface AiSettings {
  id: string
  systemPrompt: string
  provider: 'OPENAI' | 'GEMINI' | 'CLAUDE'
  model: string
  hasApiKey: boolean
}

const providerModels: Record<string, string[]> = {
  OPENAI: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  GEMINI: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
  CLAUDE: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
}

export default function ConfiguracoesPage() {
  const { isAdmin } = useAuth()
  const router = useRouter()
  const [settings, setSettings] = useState<AiSettings | null>(null)
  const [form, setForm] = useState({
    systemPrompt: '',
    provider: 'OPENAI' as string,
    apiKey: '',
    model: 'gpt-4o-mini',
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard')
      return
    }
    loadSettings()
  }, [isAdmin, router])

  async function loadSettings() {
    try {
      const data = await api.get<AiSettings>('/ai/settings')
      setSettings(data)
      setForm({
        systemPrompt: data.systemPrompt,
        provider: data.provider,
        apiKey: '',
        model: data.model,
      })
    } catch (err) {
      console.error(err)
    }
  }

  async function handleSave() {
    setLoading(true)
    try {
      const payload: any = {
        systemPrompt: form.systemPrompt,
        provider: form.provider,
        model: form.model,
      }
      if (form.apiKey) {
        payload.apiKey = form.apiKey
      }
      await api.put('/ai/settings', payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      loadSettings()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) return null

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-[24px]">
        <div>
          <h1 className="text-h2 lg:text-h1 text-content-title">Configurações da IA</h1>
          <p className="text-paragraph text-content-text mt-1 lg:mt-[12px]">Configure o comportamento e provedor da inteligência artificial</p>
        </div>
        <Button onClick={handleSave} disabled={loading} className="self-start sm:self-auto">
          {saved ? (
            <>
              <Check className="w-[18px] h-[18px]" strokeWidth={1.5} /> Salvo!
            </>
          ) : (
            <>
              <Save className="w-[18px] h-[18px]" strokeWidth={1.5} /> Salvar configurações
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[24px]">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-[12px]">
              <Brain className="w-[24px] h-[24px] text-primary-dark" strokeWidth={1.5} />
              <CardTitle>Prompt do Sistema</CardTitle>
            </div>
            <CardDescription>
              Defina as instruções base que a IA seguirá ao gerar prescrições
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={form.systemPrompt}
              onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
              rows={12}
              placeholder="Ex: Você é um assistente farmacêutico especializado em prescrições magistrais..."
              className="font-mono text-paragraph"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-[12px]">
              <Cpu className="w-[24px] h-[24px] text-primary-dark" strokeWidth={1.5} />
              <CardTitle>Provedor de IA</CardTitle>
            </div>
            <CardDescription>Escolha qual provedor será usado para gerar as respostas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-[24px]">
            <div>
              <label className="block text-tag-semibold text-content-title mb-[12px]">Provedor</label>
              <Select
                value={form.provider}
                onChange={(e) => {
                  const provider = e.target.value
                  setForm({
                    ...form,
                    provider,
                    model: providerModels[provider]?.[0] || '',
                  })
                }}
              >
                <option value="OPENAI">OpenAI</option>
                <option value="GEMINI">Google Gemini</option>
                <option value="CLAUDE">Anthropic Claude</option>
              </Select>
            </div>
            <div>
              <label className="block text-tag-semibold text-content-title mb-[12px]">Modelo</label>
              <Select
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              >
                {(providerModels[form.provider] || []).map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-[12px]">
              <Key className="w-[24px] h-[24px] text-primary-dark" strokeWidth={1.5} />
              <CardTitle>API Key</CardTitle>
            </div>
            <CardDescription>
              Insira a chave de API do provedor selecionado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-[24px]">
            <div>
              <label className="block text-tag-semibold text-content-title mb-[12px]">
                Chave de API
              </label>
              <Input
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                placeholder="sk-..."
              />
              {settings?.hasApiKey && (
                <div className="flex items-center gap-[12px] mt-[12px]">
                  <Badge variant="success">
                    <Check className="w-[12px] h-[12px] mr-1" strokeWidth={1.5} /> Configurada
                  </Badge>
                  <span className="text-desc-regular text-content-text">Deixe vazio para manter a chave atual</span>
                </div>
              )}
            </div>
            <div className="p-[12px] bg-primary-light/50 rounded-small border border-primary-medium">
              <p className="text-desc-medium text-primary-dark">
                A chave de API é armazenada de forma segura no servidor. 
                Nunca compartilhe sua chave com terceiros.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
