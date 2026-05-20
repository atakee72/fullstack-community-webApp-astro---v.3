import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';
import * as React from 'react';

interface ContactConfirmationEmailProps {
  senderName: string;
  message: string;
  listing: { id: string; title: string };
}

export default function ContactConfirmationEmail({
  senderName,
  message,
  listing,
}: ContactConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Deine Nachricht wurde gesendet</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>Deine Nachricht wurde gesendet.</Heading>
          <Text style={paragraphStyle}>Hallo {senderName},</Text>
          <Text style={paragraphStyle}>
            Deine Anfrage zu „{listing.title}" ist beim Verkäufer angekommen.
            Antworten landen direkt in deinem Postfach.
          </Text>
          <Hr style={hrStyle} />
          <Text style={metaStyle}>Deine Nachricht:</Text>
          <Section style={quoteStyle}>
            <Text style={messageStyle}>{message}</Text>
          </Section>
          <Hr style={hrStyle} />
          <Text style={notSentByYouStyle}>
            Hast du diese Nachricht nicht gesendet? Dann kannst du diese E-Mail
            ignorieren — jemand hat deine Adresse beim Mahalle-Markt eingegeben.
            Missbrauch kannst du an{' '}
            <a href="mailto:hello@mahalle.berlin" style={linkStyle}>
              hello@mahalle.berlin
            </a>{' '}
            melden.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: '#f3ead8',
  fontFamily: 'system-ui, sans-serif',
  padding: '20px 0',
};
const containerStyle = {
  backgroundColor: '#f7f0de',
  border: '2px solid #1b1a17',
  borderRadius: '8px',
  padding: '32px',
  maxWidth: '560px',
  margin: '0 auto',
};
const headingStyle = {
  color: '#1b1a17',
  fontSize: '24px',
  fontWeight: 700,
  marginBottom: '20px',
};
const paragraphStyle = {
  color: '#3a362e',
  fontSize: '15px',
  lineHeight: '1.5',
  marginBottom: '12px',
};
const hrStyle = {
  borderColor: '#c9bea3',
  margin: '24px 0',
};
const metaStyle = {
  color: '#7a7264',
  fontSize: '12px',
  marginBottom: '8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
};
const quoteStyle = {
  borderLeft: '3px solid #3f8f9f',
  paddingLeft: '12px',
};
const messageStyle = {
  color: '#3a362e',
  fontSize: '14px',
  fontStyle: 'italic' as const,
  lineHeight: '1.5',
  whiteSpace: 'pre-wrap' as const,
};
const notSentByYouStyle = {
  color: '#7a7264',
  fontSize: '12px',
  lineHeight: '1.5',
  marginTop: '12px',
};
const linkStyle = {
  color: '#b23a5b',
  textDecoration: 'underline',
};
