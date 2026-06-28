import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Hr,
} from '@react-email/components';
import * as React from 'react';

interface PasswordResetEmailProps {
  resetLink: string;
}

export default function PasswordResetEmail({ resetLink }: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Setze dein Mahalle-Passwort zurück</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={h1}>Passwort zurücksetzen</Heading>
          <Text style={text}>
            Du hast angefragt, dein Passwort zurückzusetzen. Klick den Button —
            der Link ist 30 Minuten gültig und nur einmal verwendbar.
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={resetLink} style={button}>Neues Passwort setzen</Button>
          </Section>
          <Text style={muted}>
            Wenn du das nicht warst, kannst du diese E-Mail ignorieren — dein
            Passwort bleibt unverändert.
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
