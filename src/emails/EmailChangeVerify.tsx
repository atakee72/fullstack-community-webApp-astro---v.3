import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Hr,
} from '@react-email/components';
import * as React from 'react';

interface EmailChangeVerifyProps {
  verifyLink: string;
  newEmail: string;
}

export default function EmailChangeVerify({ verifyLink, newEmail }: EmailChangeVerifyProps) {
  return (
    <Html>
      <Head />
      <Preview>Bestätige deine neue E-Mail-Adresse für Mahalle</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={h1}>Neue E-Mail-Adresse bestätigen</Heading>
          <Text style={text}>
            Du hast angefordert, die E-Mail-Adresse deines Mahalle-Kontos auf{' '}
            <strong>{newEmail}</strong> zu ändern. Bestätige diese Adresse, um
            die Änderung abzuschließen. Der Link ist 30 Minuten gültig und nur
            einmal verwendbar.
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={verifyLink} style={button}>E-Mail-Adresse bestätigen</Button>
          </Section>
          <Text style={muted}>
            Wenn du diese Änderung nicht angefordert hast, kannst du diese
            E-Mail ignorieren — deine E-Mail-Adresse bleibt unverändert.
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
