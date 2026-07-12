import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Hr,
} from '@react-email/components';
import * as React from 'react';

interface EmailChangeNoticeProps {
  newEmailMasked: string;
  profileLink: string;
}

// Sent to the OLD address when an email change is started. Deliberately
// carries NO token/link that could complete or cancel the change — just a
// heads-up + a plain pointer back into the app. If this wasn't the account
// owner requesting the change, the account may be compromised, hence the
// password-change nudge.
export default function EmailChangeNotice({ newEmailMasked, profileLink }: EmailChangeNoticeProps) {
  return (
    <Html>
      <Head />
      <Preview>E-Mail-Änderung für dein Mahalle-Konto angefordert</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={h1}>E-Mail-Änderung angefordert</Heading>
          <Text style={text}>
            Für dein Mahalle-Konto wurde eine Änderung der E-Mail-Adresse auf{' '}
            <strong>{newEmailMasked}</strong> angefordert.
          </Text>
          <Text style={text}>
            Falls das nicht du warst, ändere dein Passwort umgehend — dein
            Konto könnte sonst durch jemand anderen übernommen werden.
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={profileLink} style={button}>Zu deinem Profil</Button>
          </Section>
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
