import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {
  CONTACT_RECIPIENT_EMAIL,
  buildContactEmailPayload,
  computeContactFingerprint,
  escapeHtml,
  isValidEmailAddress,
  sanitizeHeaderValue,
  validateContactFormInput,
} from './contactLogic';
import { sendContactEmailViaSmtp } from '../../server/emailService';

test('validateContactFormInput accepts valid contact form submissions and normalizes fields', () => {
  const now = 1_750_000_000_000;
  const result = validateContactFormInput(
    {
      name: '  Dr. Elena Vance  ',
      email: '  Elena.Vance@Observatory.ORG ',
      subject: '  JWST Exoplanet Collaboration  ',
      message: 'We would love to share our upcoming infrared transit photometry results with COSMO WIRES.',
      website: '',
      formLoadedAt: now - 5000,
    },
    { checkAntiSpam: true, nowMs: now }
  );

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.data.name, 'Dr. Elena Vance');
    assert.equal(result.data.email, 'elena.vance@observatory.org');
    assert.equal(result.data.subject, 'JWST Exoplanet Collaboration');
  }
});

test('validateContactFormInput rejects missing fields and invalid email addresses', () => {
  const missing = validateContactFormInput({
    name: '',
    email: 'not-an-email',
    subject: 'Hi',
    message: 'Short',
  });

  assert.equal(missing.valid, false);
  if (!missing.valid) {
    assert.ok(missing.fieldErrors.name);
    assert.ok(missing.fieldErrors.email);
    assert.ok(missing.fieldErrors.subject);
    assert.ok(missing.fieldErrors.message);
  }

  assert.equal(isValidEmailAddress('user@example.com'), true);
  assert.equal(isValidEmailAddress('user..name@example.com'), false);
  assert.equal(isValidEmailAddress('user@invalid'), false);
  assert.equal(isValidEmailAddress('user@example.com\r\nBcc: evil@attacker.com'), false);
});

test('validateContactFormInput blocks honeypot and instantaneous bot submissions', () => {
  const now = 1_750_000_000_000;

  const honeypot = validateContactFormInput(
    {
      name: 'Bot User',
      email: 'bot@example.com',
      subject: 'Buy links now',
      message: 'This is a spam message filling the hidden honeypot field.',
      website: 'https://spam.example',
      formLoadedAt: now - 10_000,
    },
    { checkAntiSpam: true, nowMs: now }
  );
  assert.equal(honeypot.valid, false);
  if (!honeypot.valid) {
    assert.equal(honeypot.isSpam, true);
  }

  const fastBot = validateContactFormInput(
    {
      name: 'Fast Bot',
      email: 'fast@example.com',
      subject: 'Instant submission',
      message: 'Submitted in 200ms immediately after page load.',
      website: '',
      formLoadedAt: now - 200,
    },
    { checkAntiSpam: true, nowMs: now }
  );
  assert.equal(fastBot.valid, false);
  if (!fastBot.valid) {
    assert.equal(fastBot.isSpam, true);
  }
});

test('sanitizeHeaderValue strips CRLF injection sequences and escapeHtml neutralizes markup', () => {
  assert.equal(
    sanitizeHeaderValue('Hello\r\nBcc: attacker@evil.com\nX-Injected: 1'),
    'Hello Bcc: attacker@evil.com X-Injected: 1'
  );
  assert.equal(
    escapeHtml('<script>alert("xss")</script> & \'test\''),
    '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &#39;test&#39;'
  );
});

test('buildContactEmailPayload targets cosmowires.connect@gmail.com with replyTo and escaped body', () => {
  const payload = buildContactEmailPayload({
    data: {
      name: 'Carl <Astrophysicist>',
      email: 'carl@cosmos.edu',
      subject: 'Press Release Inquiry',
      message: 'Line 1\n<img src=x onerror=alert(1)>',
    },
    referenceId: 'cw-test-123',
    submittedAt: '2026-05-01T12:00:00.000Z',
  });

  assert.equal(payload.to, CONTACT_RECIPIENT_EMAIL);
  assert.equal(payload.to, 'cosmowires.connect@gmail.com');
  assert.equal(payload.replyTo.address, 'carl@cosmos.edu');
  assert.equal(payload.replyTo.name, 'Carl <Astrophysicist>');
  assert.ok(payload.subject.startsWith('New Contact Query – COSMO WIRES'));
  assert.ok(payload.text.includes('Press Release Inquiry'));
  assert.ok(payload.text.includes('Line 1'));
  assert.ok(!payload.html.includes('<img src=x'));
  assert.ok(payload.html.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

test('computeContactFingerprint normalizes casing and whitespace for duplicate detection', () => {
  const fp1 = computeContactFingerprint({
    name: 'Alice',
    email: 'Alice@Example.com',
    subject: 'Feedback  Idea',
    message: 'Great   space   coverage!',
  });
  const fp2 = computeContactFingerprint({
    name: 'Alice Smith',
    email: 'alice@example.com',
    subject: 'feedback idea',
    message: 'great space coverage!',
  });
  assert.equal(fp1, fp2);
});

test('sendContactEmailViaSmtp delivers complete SMTP transaction to cosmowires.connect@gmail.com', async () => {
  const capturedCommands: string[] = [];
  let capturedData = '';

  const smtpServer = net.createServer((socket) => {
    socket.write('220 localhost ESMTP TestServer\r\n');
    let inDataMode = false;
    let buffer = '';

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf-8');
      if (inDataMode) {
        const endIdx = buffer.indexOf('\r\n.\r\n');
        if (endIdx !== -1) {
          capturedData += buffer.slice(0, endIdx);
          buffer = buffer.slice(endIdx + 5);
          inDataMode = false;
          socket.write('250 2.0.0 Ok: queued\r\n');
        }
        return;
      }

      let nlIdx = buffer.indexOf('\r\n');
      while (nlIdx !== -1) {
        const line = buffer.slice(0, nlIdx);
        buffer = buffer.slice(nlIdx + 2);
        capturedCommands.push(line);

        if (line.startsWith('EHLO') || line.startsWith('HELO')) {
          socket.write('250-localhost\r\n250 SIZE 10485760\r\n');
        } else if (line.startsWith('MAIL FROM:')) {
          socket.write('250 2.1.0 Ok\r\n');
        } else if (line.startsWith('RCPT TO:')) {
          socket.write('250 2.1.5 Ok\r\n');
        } else if (line === 'DATA') {
          inDataMode = true;
          socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
          break;
        } else if (line === 'QUIT') {
          socket.write('221 2.0.0 Bye\r\n');
          socket.end();
        } else {
          socket.write('250 Ok\r\n');
        }

        nlIdx = buffer.indexOf('\r\n');
      }
    });
  });

  await new Promise<void>((resolve) => smtpServer.listen(0, '127.0.0.1', resolve));
  const address = smtpServer.address();
  assert.ok(address && typeof address !== 'string');

  try {
    const result = await sendContactEmailViaSmtp(
      {
        host: '127.0.0.1',
        port: address.port,
        secure: false,
        ignoreTLS: true,
        from: '"COSMO WIRES Contact" <sender@cosmowires.test>',
        recipientEmail: CONTACT_RECIPIENT_EMAIL,
      },
      {
        data: {
          name: 'Dr. Vera Rubin',
          email: 'vera.rubin@carnegie.edu',
          subject: 'Dark Matter Observation Note',
          message: 'Sharing galaxy rotation curve commentary for your Astrophysics desk.',
        },
        referenceId: 'cw-smtp-001',
        submittedAt: '2026-05-01T15:30:00.000Z',
      }
    );

    assert.equal(result.delivered, true);
    assert.equal(result.recipient, 'cosmowires.connect@gmail.com');
    assert.ok(
      capturedCommands.some((cmd) => cmd.toUpperCase().includes('RCPT TO:<COSMOWIRES.CONNECT@GMAIL.COM>')),
      `Expected RCPT TO cosmowires.connect@gmail.com, got: ${capturedCommands.join(' | ')}`
    );
    assert.ok(capturedData.includes('Reply-To: "Dr. Vera Rubin" <vera.rubin@carnegie.edu>'));
    assert.ok(capturedData.includes('New Contact Query'));
    assert.ok(capturedData.includes('COSMO WIRES'));
    assert.ok(capturedData.includes('Dark Matter Observation Note'));
    assert.ok(capturedData.includes('galaxy rotation curve commentary'));
  } finally {
    await new Promise<void>((resolve) => smtpServer.close(() => resolve()));
  }
});
