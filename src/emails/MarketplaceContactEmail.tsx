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

interface MarketplaceContactEmailProps {
  senderName: string;
  senderEmail: string;
  message: string;
  listing: { id: string; title: string };
}

export default function MarketplaceContactEmail({
  senderName,
  senderEmail,
  message,
  listing,
}: MarketplaceContactEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Nachricht zu „{listing.title}" — Mahalle Markt</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>Nachricht zu deiner Anzeige</Heading>
          <Section style={listingBlockStyle}>
            <Text style={listingTitleStyle}>„{listing.title}"</Text>
          </Section>
          <Section>
            <Text style={metaStyle}>
              <strong>{senderName}</strong> · &lt;{senderEmail}&gt;
            </Text>
            <Text style={messageStyle}>{message}</Text>
          </Section>
          <Hr style={hrStyle} />
          <Text style={footerStyle}>
            Antworte direkt auf diese E-Mail — sie geht direkt an {senderName}.
            Mahalle hat die Adresse nicht offen geteilt.
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
const listingBlockStyle = {
  borderLeft: '3px solid #b23a5b',
  paddingLeft: '12px',
  marginBottom: '20px',
};
const listingTitleStyle = {
  color: '#3a362e',
  fontStyle: 'italic',
  fontSize: '16px',
  margin: 0,
};
const metaStyle = {
  color: '#7a7264',
  fontSize: '13px',
  marginBottom: '8px',
};
const messageStyle = {
  color: '#1b1a17',
  fontSize: '15px',
  lineHeight: '1.5',
  whiteSpace: 'pre-wrap' as const,
};
const hrStyle = {
  borderColor: '#c9bea3',
  margin: '24px 0',
};
const footerStyle = {
  color: '#7a7264',
  fontSize: '12px',
  lineHeight: '1.4',
};
