import * as React from "react";
import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type InvitationEmailProps = {
  inviteeEmail: string;
  registerUrl: string;
};

export function InvitationEmail({ inviteeEmail, registerUrl }: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Completa tu registro en AtlasSeguros</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section>
            <Text style={title}>Te han invitado a AtlasSeguros CRM</Text>
            <Text style={text}>
              Has recibido esta invitación porque un administrador de AtlasSeguros
              ha creado una cuenta para ti con el correo:
            </Text>
            <Text style={strong}>{inviteeEmail}</Text>
            <Text style={text}>
              Para completar tu registro y establecer tu contraseña, haz clic en el
              siguiente enlace:
            </Text>
            <Text>
              <Link href={registerUrl} style={link}>
                Completar registro
              </Link>
            </Text>
            <Text style={small}>
              Este enlace caduca en 48 horas. Si no esperabas esta invitación,
              puedes ignorar este correo de forma segura.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#f5f5f5",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const container: React.CSSProperties = {
  margin: "0 auto",
  padding: "32px 24px",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  maxWidth: "480px",
};

const title: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 600,
  marginBottom: "16px",
};

const text: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "20px",
  margin: "4px 0",
};

const strong: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  margin: "8px 0 16px",
};

const link: React.CSSProperties = {
  display: "inline-block",
  marginTop: "12px",
  padding: "10px 18px",
  backgroundColor: "#111827",
  color: "#ffffff",
  borderRadius: "9999px",
  fontSize: "14px",
  textDecoration: "none",
};

const small: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: "18px",
  color: "#6b7280",
  marginTop: "16px",
};

