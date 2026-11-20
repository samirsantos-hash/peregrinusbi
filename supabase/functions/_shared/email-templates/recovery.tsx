/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Redefina sua senha do painel ecom solutions by Peregrinus</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={marca}>ecom solutions by Peregrinus</Text>
        <Heading style={h1}>Redefinir senha</Heading>
        <Text style={text}>
          Recebemos um pedido para redefinir a senha do seu acesso ao painel. Clique no botão abaixo para criar uma nova senha. O link é de uso único e expira em breve.
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Criar nova senha
        </Button>
        <Text style={footer}>
          Se você não fez este pedido, ignore este e-mail. Sua senha continua a mesma.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const marca = { fontSize: '13px', fontWeight: 'bold' as const, color: '#0B7A4D', letterSpacing: '0.04em', margin: '0 0 16px' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0B1F16',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#0E7F51',
  color: '#ffffff',
  fontSize: '14px',
  border: '1px solid #0E7F51',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #3BD394 !important; color: #0B1F16 !important; }
  }
  [data-ogsc] .dm-btn { background-color: #3BD394 !important; color: #0B1F16 !important; }
  [data-ogsb] .dm-btn { background-color: #3BD394 !important; color: #0B1F16 !important; }
`
