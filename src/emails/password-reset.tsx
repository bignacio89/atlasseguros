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

type PasswordResetEmailProps = {
  resetUrl: string;
};

export function PasswordResetEmail({ resetUrl }: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Restablecer tu contraseña de AtlasSeguros</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section>
            <Text style={title}>Restablecer contraseña</Text>
            <Text style={text}>
              Hemos recibido una solicitud para restablecer la contraseña de tu
              cuenta de AtlasSeguros CRM.
            </Text>
            <Text style={text}>
              Si has sido tú, haz clic en el siguiente enlace para establecer
              una nueva contraseña:
            </Text>
            <Text>
              <Link href={resetUrl} style={link}>
                Restablecer contraseña
              </Link>
            </Text>
            <Text style={small}>
              Este enlace caduca en 1 hora. Si no has solicitado este cambio,
              puedes ignorar este mensaje; tu contraseña actual seguirá siendo
              válida.
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

