'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function PrivacyPolicy() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
          --primary: #0ea5e9;
          --dark: #0a0f1e;
          --dark-lighter: #1a1f35;
          --dark-card: #252b42;
          --text: #f1f5f9;
          --text-muted: #94a3b8;
          --border: #334155;
        }

        .pp-root {
          font-family: 'Barlow', sans-serif;
          background: var(--dark);
          color: var(--text);
          min-height: 100vh;
        }

        .pp-nav {
          position: sticky; top: 0; z-index: 1000;
          background: rgba(10,15,30,0.97); backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
        }
        .pp-nav-inner {
          max-width: 960px; margin: 0 auto; padding: 1rem 2rem;
          display: flex; justify-content: space-between; align-items: center;
        }
        .pp-nav-back {
          color: var(--text-muted); text-decoration: none; font-weight: 500;
          font-size: 0.9rem; transition: color 0.2s; display: flex; align-items: center; gap: 0.4rem;
        }
        .pp-nav-back:hover { color: var(--primary); }

        .pp-body {
          max-width: 960px; margin: 0 auto; padding: 3rem 2rem 5rem;
        }

        .pp-header {
          margin-bottom: 3rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid var(--border);
        }
        .pp-header h1 {
          font-size: 2.5rem; font-weight: 800; color: var(--text); margin-bottom: 0.5rem;
        }
        .pp-header .pp-meta {
          color: var(--text-muted); font-size: 0.9rem;
        }
        .pp-header .pp-meta span {
          display: inline-block; margin-right: 1.5rem;
        }

        .pp-section {
          margin-bottom: 2.5rem;
        }
        .pp-section h2 {
          font-size: 1.25rem; font-weight: 700; color: var(--primary);
          margin-bottom: 0.85rem; padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(14,165,233,0.15);
        }
        .pp-section h3 {
          font-size: 1rem; font-weight: 600; color: #e2e8f0;
          margin: 1.25rem 0 0.5rem;
        }
        .pp-section p {
          color: var(--text-muted); line-height: 1.75; margin-bottom: 0.75rem;
          font-size: 0.95rem;
        }
        .pp-section ul {
          list-style: none; margin: 0.5rem 0 0.75rem 0;
        }
        .pp-section ul li {
          color: var(--text-muted); font-size: 0.95rem; line-height: 1.75;
          padding-left: 1.2rem; position: relative;
        }
        .pp-section ul li::before {
          content: '–'; position: absolute; left: 0; color: var(--primary);
        }

        .pp-highlight-box {
          background: rgba(14,165,233,0.07);
          border: 1px solid rgba(14,165,233,0.3);
          border-radius: 10px;
          padding: 1.5rem 1.75rem;
          margin: 1rem 0 1.5rem;
        }
        .pp-highlight-box h3 {
          font-size: 1rem; font-weight: 700; color: var(--primary);
          margin-bottom: 0.75rem;
        }
        .pp-highlight-box p {
          color: var(--text-muted); font-size: 0.95rem; line-height: 1.75; margin-bottom: 0.5rem;
        }
        .pp-highlight-box p:last-child { margin-bottom: 0; }
        .pp-highlight-box a { color: var(--primary); }

        .pp-complaint-box {
          background: rgba(16,185,129,0.07);
          border: 1px solid rgba(16,185,129,0.3);
          border-radius: 10px;
          padding: 1.75rem;
          margin: 1rem 0 0.5rem;
        }
        .pp-complaint-box h3 {
          font-size: 1.05rem; font-weight: 700; color: #10b981;
          margin-bottom: 1rem;
        }
        .pp-complaint-step {
          display: flex; gap: 1rem; margin-bottom: 1.25rem; align-items: flex-start;
        }
        .pp-complaint-step:last-child { margin-bottom: 0; }
        .pp-step-num {
          flex-shrink: 0; width: 28px; height: 28px;
          background: rgba(16,185,129,0.2); border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 0.85rem; color: #10b981;
        }
        .pp-step-body { flex: 1; }
        .pp-step-body strong {
          display: block; color: #e2e8f0; font-size: 0.95rem; margin-bottom: 0.25rem;
        }
        .pp-step-body p {
          color: var(--text-muted); font-size: 0.9rem; margin: 0; line-height: 1.65;
        }
        .pp-step-body a { color: var(--primary); }

        .pp-contact-card {
          background: var(--dark-card);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 1.25rem 1.5rem;
          margin-top: 1.25rem;
        }
        .pp-contact-card p {
          font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.35rem;
        }
        .pp-contact-card p:last-child { margin-bottom: 0; }
        .pp-contact-card a { color: var(--primary); text-decoration: none; font-weight: 600; }
        .pp-contact-card a:hover { text-decoration: underline; }

        .pp-footer {
          border-top: 1px solid var(--border);
          padding: 2rem;
          text-align: center;
        }
        .pp-footer p { color: var(--text-muted); font-size: 0.85rem; }
        .pp-footer a { color: var(--primary); text-decoration: none; }
        .pp-footer a:hover { text-decoration: underline; }
      `}</style>

      <div className="pp-root">

        {/* Nav */}
        <nav className="pp-nav">
          <div className="pp-nav-inner">
            <Link href="/" className="pp-nav-back">
              ← Back to Home
            </Link>
            <Image src="/Airfieldopslogo.png" alt="AirfieldOps Manager" width={160} height={52} style={{ height: '52px', width: 'auto' }} />
          </div>
        </nav>

        {/* Body */}
        <div className="pp-body">

          <div className="pp-header">
            <h1>Privacy Policy</h1>
            <div className="pp-meta">
              <span>Effective date: 1 June 2026</span>
              <span>Last updated: 8 June 2026</span>
            </div>
          </div>

          {/* 1. Who We Are */}
          <div className="pp-section">
            <h2>1. Who We Are</h2>
            <p>
              AirfieldOps Manager is operated by <strong>Ignis Tech</strong> ("we", "us", "our"). We are the data controller
              for personal data collected through this service.
            </p>
            <p>
              If you have any questions about this policy or how we handle your data, you can contact us at{' '}
              <a href="mailto:privacy.ignistech@gmail.com" style={{ color: '#0ea5e9' }}>privacy.ignistech@gmail.com</a>.
            </p>
          </div>

          {/* 2. What Data We Collect */}
          <div className="pp-section">
            <h2>2. What Data We Collect</h2>
            <h3>Account Data</h3>
            <ul>
              <li>Name and email address (provided at account creation)</li>
              <li>Hashed password (we never store passwords in plain text)</li>
              <li>Role and airport assignment</li>
            </ul>
            <h3>Operational Data</h3>
            <ul>
              <li>Airfield status changes you make (taxiway closures, runway conditions, RFFS categories)</li>
              <li>NOTAM drafts and operational notices you create</li>
              <li>Runway inspection records and RCAM assessments</li>
              <li>Work-in-progress schedules you enter</li>
            </ul>
            <h3>Usage and Audit Data</h3>
            <ul>
              <li>Timestamps and attribution for every operational change (required for CAA CAP 562 compliance)</li>
              <li>Login events (date, time, and source IP address)</li>
              <li>Browser type and device information collected automatically via session cookies</li>
            </ul>
          </div>

          {/* 3. How We Use Your Data */}
          <div className="pp-section">
            <h2>3. How We Use Your Data</h2>
            <ul>
              <li>To provide and operate the AirfieldOps Manager service</li>
              <li>To authenticate your identity and maintain session security</li>
              <li>To create the immutable audit trail required by CAA CAP 562 and ICAO 9981 PANS-ADR</li>
              <li>To associate operational records with the responsible user for accountability</li>
              <li>To notify relevant users of active alerts (low visibility, snow events, WIP activations)</li>
              <li>To investigate security incidents and support investigations by your organisation</li>
              <li>To respond to your complaints and data subject requests</li>
            </ul>
          </div>

          {/* 4. Legal Basis */}
          <div className="pp-section">
            <h2>4. Legal Basis for Processing (UK GDPR)</h2>
            <ul>
              <li><strong>Contract (Article 6(1)(b)):</strong> Account data and core service operation</li>
              <li><strong>Legal obligation (Article 6(1)(c)):</strong> Audit trail records required by aviation regulatory frameworks</li>
              <li><strong>Legitimate interests (Article 6(1)(f)):</strong> Security logging, fraud prevention, and system integrity</li>
              <li><strong>Consent (Article 6(1)(a)):</strong> Any optional communications you opt into</li>
            </ul>
          </div>

          {/* 5. Data Sharing */}
          <div className="pp-section">
            <h2>5. Data Sharing</h2>
            <p>We do not sell your personal data. We may share it with:</p>
            <ul>
              <li><strong>Your organisation:</strong> Airport managers and authorised administrators at your airport can view audit trail records associated with your account.</li>
              <li><strong>Infrastructure providers:</strong> Our hosting and database providers (currently Vercel and Neon) process data on our behalf under data processing agreements. Both are GDPR-compliant.</li>
              <li><strong>Regulatory authorities:</strong> If required by law or in response to a valid legal request from a regulator such as the CAA.</li>
            </ul>
          </div>

          {/* 6. Data Retention */}
          <div className="pp-section">
            <h2>6. Data Retention</h2>
            <ul>
              <li><strong>Account data:</strong> Retained for the duration of your account. Deleted within 30 days of account closure upon request.</li>
              <li><strong>Audit trail records:</strong> Retained for a minimum of 2 years to comply with CAA requirements. These records cannot be deleted individually as they form an immutable compliance log.</li>
              <li><strong>Login and security logs:</strong> Retained for 12 months.</li>
            </ul>
          </div>

          {/* 7. Your Rights */}
          <div className="pp-section">
            <h2>7. Your Rights Under UK GDPR</h2>
            <p>You have the following rights over your personal data:</p>
            <ul>
              <li><strong>Right of access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Right to rectification:</strong> Ask us to correct inaccurate data.</li>
              <li><strong>Right to erasure:</strong> Ask us to delete your data where no legal obligation requires us to keep it.</li>
              <li><strong>Right to restrict processing:</strong> Ask us to limit how we use your data while a dispute is resolved.</li>
              <li><strong>Right to data portability:</strong> Receive your data in a structured, machine-readable format.</li>
              <li><strong>Right to object:</strong> Object to processing based on legitimate interests.</li>
              <li><strong>Right to withdraw consent:</strong> Where processing is based on consent, withdraw it at any time.</li>
            </ul>
            <p style={{ marginTop: '0.75rem' }}>
              To exercise any of these rights, email{' '}
              <a href="mailto:privacy.ignistech@gmail.com" style={{ color: '#0ea5e9' }}>privacy.ignistech@gmail.com</a>.
              We will respond within <strong>one calendar month</strong> as required by law.
            </p>
          </div>

          {/* 8. Cookies */}
          <div className="pp-section">
            <h2>8. Cookies and Session Storage</h2>
            <p>
              We use strictly necessary session cookies to maintain your authenticated session. We do not use
              tracking, advertising, or analytics cookies. No third-party cookies are set by this service.
            </p>
          </div>

          {/* 9. Security */}
          <div className="pp-section">
            <h2>9. Security</h2>
            <p>
              All data is transmitted over HTTPS. Passwords are hashed using industry-standard algorithms and
              never stored in plain text. Access to the production database is restricted to authorised
              infrastructure only.
            </p>
            <p>
              In the event of a personal data breach that is likely to result in a risk to your rights and freedoms,
              we will notify the ICO within 72 hours and, where required, notify affected users without undue delay.
            </p>
          </div>

          {/* 10. Complaints — prominent, highlighted */}
          <div className="pp-section">
            <h2>10. How to Make a Complaint</h2>
            <p>
              If you believe we have not handled your personal data correctly, you have the right to complain.
              We take all privacy complaints seriously and will investigate promptly.
            </p>

            <div className="pp-complaint-box">
              <h3>Complaints Procedure</h3>

              <div className="pp-complaint-step">
                <div className="pp-step-num">1</div>
                <div className="pp-step-body">
                  <strong>Contact us directly first</strong>
                  <p>
                    Email us at{' '}
                    <a href="mailto:privacy.ignistech@gmail.com">privacy.ignistech@gmail.com</a>{' '}
                    with a clear description of your concern and the data involved.
                    We will <strong>acknowledge your complaint within 30 days</strong> and investigate it promptly.
                    We aim to resolve all complaints fully within one calendar month.
                  </p>
                </div>
              </div>

              <div className="pp-complaint-step">
                <div className="pp-step-num">2</div>
                <div className="pp-step-body">
                  <strong>Escalate to the ICO if you are not satisfied</strong>
                  <p>
                    If you are unhappy with our response — or if we have not responded within one month — you have
                    the right to escalate your complaint to the <strong>Information Commissioner's Office (ICO)</strong>,
                    the UK's independent data protection authority.
                  </p>
                  <p style={{ marginTop: '0.4rem' }}>
                    You can raise a concern at{' '}
                    <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a>{' '}
                    or call their helpline on 0303 123 1113.
                    The ICO can investigate and, where appropriate, issue enforcement action.
                  </p>
                </div>
              </div>
            </div>

            <div className="pp-contact-card">
              <p><strong style={{ color: '#f1f5f9' }}>Privacy complaints contact</strong></p>
              <p>Email: <a href="mailto:privacy.ignistech@gmail.com">privacy.ignistech@gmail.com</a></p>
              <p>We will acknowledge your complaint within 30 days.</p>
            </div>
          </div>

          {/* 11. Changes */}
          <div className="pp-section">
            <h2>11. Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. When we make material changes, we will update the
              "Last updated" date at the top and, where appropriate, notify active users by email.
              Continued use of the service after any changes constitutes acceptance of the updated policy.
            </p>
          </div>

        </div>

        {/* Footer */}
        <footer className="pp-footer">
          <p>
            &copy; 2026 AirfieldOps Manager / Ignis Tech. All rights reserved.{' '}
            <Link href="/">Back to Home</Link>
          </p>
        </footer>

      </div>
    </>
  );
}
