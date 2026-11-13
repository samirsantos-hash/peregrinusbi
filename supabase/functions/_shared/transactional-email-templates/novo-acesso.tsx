import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { quando?: string; aparelho?: string; ip?: string }

const NovoAcesso = ({ quando, aparelho, ip }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Novo acesso à sua conta do painel Peregrinus</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={marca}>ecom solutions by Peregrinus</Text>
        <Heading style={h1}>Novo acesso à sua conta</Heading>
        <Text style={text}>Sua conta do painel acabou de ser acessada por um aparelho que não usamos recentemente.</Text>
        <Text style={dado}><strong>Quando:</strong> {quando ?? '—'}</Text>
        <Text style={dado}><strong>Aparelho:</strong> {aparelho ?? 'não identificado'}</Text>
        <Text style={dado}><strong>IP:</strong> {ip ?? 'não identificado'}</Text>
        <Text style={alerta}>Se foi você, não precisa fazer nada. Se não foi você, troque sua senha agora em "Esqueci minha senha".</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NovoAcesso,
  subject: 'Novo acesso à sua conta',
  displayName: 'Novo acesso',
  previewData: { quando: '10/11/2026 21:30', aparelho: 'Chrome · Windows', ip: '200.100.50.25' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const marca = { fontSize: '13px', fontWeight: 'bold' as const, color: '#0B7A4D', letterSpacing: '0.04em', margin: '0 0 16px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0B1F16', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 16px' }
const dado = { fontSize: '14px', color: '#0B1F16', margin: '0 0 6px' }
const alerta = { fontSize: '13px', color: '#55575d', lineHeight: '1.5', margin: '20px 0 0' }
