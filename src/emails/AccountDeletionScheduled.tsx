import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Hr,
} from '@react-email/components';
import * as React from 'react';

interface AccountDeletionScheduledProps {
  deletionDate: string; // ISO
  undoLink: string;
}

export default function AccountDeletionScheduled({ deletionDate, undoLink }: AccountDeletionScheduledProps) {
  const formatted = new Date(deletionDate).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return (
    <Html>
      <Head />
      <Preview>Deine Mahalle-Konto-Löschung ist vorgemerkt</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={h1}>Konto-Löschung vorgemerkt</Heading>
          <Text style={text}>
            Du hast die Löschung deines Mahalle-Kontos angefordert. Am{' '}
            <strong>{formatted}</strong> wird sie endgültig ausgeführt — bis
            dahin kannst du sie jederzeit widerrufen.
          </Text>
          <Text style={text}>
            Beiträge, Kommentare, erstellte Termine und dein
            Moderations-Protokoll bleiben anonymisiert erhalten
            („Ehemaliges Mitglied"). Anzeigen, Gespeichertes, Zusagen sowie
            Name, E-Mail, Foto und Interessen werden endgültig gelöscht.
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={undoLink} style={button}>Löschung widerrufen</Button>
          </Section>
          <Text style={muted}>
            Falls das nicht du warst, ändere sofort dein Passwort — jemand
            mit Zugriff auf dein Konto hat die Löschung ausgelöst.
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
