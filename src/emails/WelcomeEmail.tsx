import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Hr,
} from '@react-email/components';
import * as React from 'react';

interface WelcomeEmailProps {
  name: string;
  /** Absolute forum URL, built by the caller via getTrustedBaseUrl() — never hardcode the domain here. */
  forumLink: string;
}

// Sent ONCE, when the user confirms their email address (first
// emailVerified false→true transition) — see /api/auth/verify-email.
// Deliberately not sent at registration: the verify mail arrives there,
// and two emails within seconds read as spam on a young domain.
export default function WelcomeEmail({ name, forumLink }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Schön, dass du da bist — deine ersten Schritte im Kiez</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={h1}>Schön, dass du da bist, {name}!</Heading>
          <Text style={text}>
            Deine E-Mail ist bestätigt — willkommen bei Mahalle, der
            Nachbarschaftsplattform für den Schillerkiez. Kein Konzern, keine
            Werbung, kein Algorithmus: Das hier gehört dem Kiez.
          </Text>
          <Text style={text}>Ein paar gute erste Schritte:</Text>
          <Text style={listItem}>🖊️ <strong>Steckbrief ausfüllen</strong> — zeig den Nachbar:innen, wer du bist.</Text>
          <Text style={listItem}>🧭 <strong>Die Führung mitmachen</strong> — die kleine Tour startet von selbst und zeigt dir alles Wichtige.</Text>
          <Text style={listItem}>💬 <strong>Im Forum vorbeischauen</strong> — stell dich kurz vor oder stöbere einfach.</Text>
          <Text style={listItem}>📅 <strong>In den Kalender gucken</strong> — was ist demnächst im Kiez los?</Text>
          <Text style={listItem}>🔔 <strong>Mitteilungen aktivieren</strong> — über die Glocke im Forum, damit du nichts verpasst.</Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={forumLink} style={button}>Zum Forum</Button>
          </Section>
          <Text style={text}>
            Du gehörst zu den Ersten hier — deine Meinung formt die Plattform.
            Wenn etwas hakt oder fehlt: Schreib uns an admin@mahalle.digital.
          </Text>
          <Hr style={hr} />
          <Text style={muted}>
            <em>English:</em> Your email is confirmed — welcome to Mahalle,
            the Schillerkiez neighborhood platform. Fill in your profile, take
            the little tour, and say hi in the forum. If anything feels off,
            write to admin@mahalle.digital.
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
const listItem = { color: '#3a362e', fontSize: '15px', lineHeight: '1.6', margin: '0 0 8px' };
const muted = { color: '#7a7264', fontSize: '12px', lineHeight: '1.5', margin: '8px 0 0' };
const button = { backgroundColor: '#1b1a17', color: '#f3ead8', fontSize: '15px', fontWeight: 700, padding: '12px 22px', borderRadius: '999px', textDecoration: 'none' };
const hr = { borderColor: '#c9bea3', margin: '20px 0' };
