import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Hr,
} from '@react-email/components';
import * as React from 'react';

interface VerifyEmailProps {
  verifyLink: string;
}

export default function VerifyEmail({ verifyLink }: VerifyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Bestätige deine E-Mail-Adresse für Mahalle</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={h1}>Willkommen im Kiez!</Heading>
          <Text style={text}>
            Nur noch ein Schritt: Bestätige deine E-Mail-Adresse, um dein
            Mahalle-Konto zu aktivieren. Der Link ist 24 Stunden gültig und
            nur einmal verwendbar.
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={verifyLink} style={button}>E-Mail bestätigen</Button>
          </Section>
          <Text style={muted}>
            Wenn du dich nicht bei Mahalle registriert hast, kannst du diese
            E-Mail ignorieren.
          </Text>
          <Hr style={hr} />
          <Text style={muted}>Mahalle · Schillerkiez · Neukölln</Text>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = { backgroundColor: '#f3ead8', fontFamily: 'Georgia, serif', padding: '24px' };
const containerStyle = { backgroundColor: '#f7f0de', border: '1.5px solid #1b1a17', borderRadius: '12px', padding: '32px', maxWidth: '480px' };
const h1 = { color: '#1b1a17', fontSize: '22px', fontWeight: 700, margin: '0 0 12px' };
const text = { color: '#3a362e', fontSize: '15px', lineHeight: '1.5', margin: '0 0 12px' };
const muted = { color: '#7a7264', fontSize: '12px', lineHeight: '1.5', margin: '8px 0 0' };
const button = { backgroundColor: '#1b1a17', color: '#f3ead8', fontSize: '15px', fontWeight: 700, padding: '12px 22px', borderRadius: '999px', textDecoration: 'none' };
const hr = { borderColor: '#c9bea3', margin: '20px 0' };
