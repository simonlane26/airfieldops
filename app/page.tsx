'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Building2, ClipboardList, Flame,
  Map, FileText, ShieldCheck, EyeOff, CalendarDays, Wind, ClipboardCheck, Users,
} from 'lucide-react';

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#f1f5f9', fontSize: '1.2rem' }}>Loading…</div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Staatliches&family=Barlow:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
          --primary: #0ea5e9;
          --primary-dark: #0284c7;
          --accent: #10b981;
          --accent-alt: #f59e0b;
          --danger: #ef4444;
          --success: #22c55e;
          --dark: #0a0f1e;
          --dark-lighter: #1a1f35;
          --dark-card: #252b42;
          --text: #f1f5f9;
          --text-muted: #94a3b8;
          --border: #334155;
        }

        .landing-root {
          font-family: 'Barlow', sans-serif;
          background: var(--dark);
          color: var(--text);
          overflow-x: hidden;
        }

        /* Nav */
        .lp-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
          background: rgba(10,15,30,0.95); backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
        }
        .lp-nav-inner {
          max-width: 1400px; margin: 0 auto; padding: 1rem 2rem;
          display: flex; justify-content: space-between; align-items: center;
        }
        .lp-nav-links { display: flex; gap: 2rem; align-items: center; }
        .lp-nav-links a {
          color: var(--text-muted); text-decoration: none; font-weight: 500;
          transition: color 0.3s; font-size: 0.95rem;
        }
        .lp-nav-links a:hover { color: var(--primary); }

        .btn {
          padding: 0.75rem 1.75rem; border-radius: 8px; font-weight: 600;
          text-decoration: none; transition: all 0.3s; display: inline-block;
          font-size: 0.95rem; border: none; cursor: pointer; font-family: 'Barlow', sans-serif;
        }
        .btn-primary {
          background: linear-gradient(135deg, var(--primary), var(--accent));
          color: white; box-shadow: 0 4px 15px rgba(14,165,233,0.3);
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(14,165,233,0.4); }
        .btn-outline {
          border: 2px solid var(--primary); color: var(--primary); background: transparent;
        }
        .btn-outline:hover { background: var(--primary); color: white; }
        .btn-signin {
          background: rgba(14,165,233,0.15); border: 1px solid rgba(14,165,233,0.4);
          color: var(--primary); padding: 0.6rem 1.4rem; border-radius: 8px;
          font-weight: 700; text-decoration: none; transition: all 0.3s; font-size: 0.9rem;
          font-family: 'Barlow', sans-serif;
        }
        .btn-signin:hover { background: rgba(14,165,233,0.3); border-color: var(--primary); }

        /* Hero */
        .lp-hero {
          padding: 10rem 2rem 8rem; position: relative; overflow: hidden;
          background: radial-gradient(ellipse at top right, rgba(14,165,233,0.15), transparent 50%),
                      radial-gradient(ellipse at bottom left, rgba(16,185,129,0.1), transparent 50%),
                      var(--dark);
        }
        .lp-hero-grid {
          position: absolute; inset: 0;
          background-image: linear-gradient(rgba(148,163,184,0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(148,163,184,0.03) 1px, transparent 1px);
          background-size: 50px 50px;
          mask-image: radial-gradient(ellipse at center, black 20%, transparent 80%);
        }
        .lp-hero-inner {
          max-width: 1400px; margin: 0 auto;
          display: grid; grid-template-columns: 1.1fr 1fr; gap: 5rem;
          align-items: center; position: relative;
        }
        @keyframes lp-fadeup {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lp-fadein {
          from { opacity: 0; } to { opacity: 1; }
        }
        .lp-hero-content h1 {
          font-family: 'Staatliches', sans-serif; font-size: 4.5rem; line-height: 1.05;
          margin-bottom: 1.5rem; letter-spacing: -0.02em;
          background: linear-gradient(135deg, #ffffff 0%, var(--primary) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          animation: lp-fadeup 0.8s ease-out;
        }
        .lp-hero-content p {
          font-size: 1.35rem; color: var(--text-muted); margin-bottom: 2.5rem; line-height: 1.7;
          animation: lp-fadeup 0.8s ease-out 0.2s backwards;
        }
        .lp-hero-cta {
          display: flex; gap: 1.25rem;
          animation: lp-fadeup 0.8s ease-out 0.4s backwards;
        }
        .lp-hero-img { position: relative; animation: lp-fadein 1s ease-out 0.6s backwards; }

        .screenshot-browser {
          background: var(--dark-card); border-radius: 16px; overflow: hidden;
          border: 1px solid var(--border);
          box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05);
          transform: perspective(1000px) rotateY(-5deg) rotateX(2deg);
          transition: transform 0.5s ease;
        }
        .screenshot-browser:hover { transform: perspective(1000px) rotateY(0deg) rotateX(0deg); }
        .browser-chrome {
          background: var(--dark-lighter); padding: 0.75rem 1rem;
          display: flex; align-items: center; gap: 0.5rem;
          border-bottom: 1px solid var(--border);
        }
        .browser-dot { width: 12px; height: 12px; border-radius: 50%; }
        .dot-red { background: #ef4444; } .dot-yellow { background: #f59e0b; } .dot-green { background: #10b981; }
        .browser-url {
          flex: 1; background: var(--dark); padding: 0.4rem 1rem;
          border-radius: 6px; font-size: 0.8rem; color: var(--text-muted); margin-left: 1rem;
        }
        .browser-body { position: relative; background: #1e293b; }
        .browser-body img { width: 100%; display: block; height: 340px; object-fit: cover; }
        .browser-overlay {
          position: absolute; bottom: 16px; right: 16px;
          background: rgba(26,31,53,0.96); backdrop-filter: blur(10px);
          padding: 14px 18px; border-radius: 10px;
          border: 1px solid rgba(14,165,233,0.3); max-width: 260px; z-index: 10;
        }
        .browser-overlay-title { font-size: 11px; color: #94a3b8; margin-bottom: 10px; font-weight: 600; }
        .browser-status-row {
          display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 6px;
        }
        .status-badge-open { background: #22c55e; color: black; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10px; }
        .status-badge-closed { background: #ef4444; color: white; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10px; }
        .wind-row {
          display: flex; justify-content: space-between; font-size: 12px;
          margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(148,163,184,0.2);
        }

        /* Trust */
        .lp-trust { padding: 3.5rem 2rem; background: var(--dark-lighter); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .lp-trust-inner { max-width: 1400px; margin: 0 auto; text-align: center; }
        .trust-title { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.15em; color: var(--text-muted); margin-bottom: 2.5rem; font-weight: 600; }
        .trust-badges { display: flex; justify-content: center; gap: 2rem; flex-wrap: wrap; }
        .badge {
          display: flex; flex-direction: column; align-items: center; gap: 1rem;
          padding: 2rem 2.5rem; background: var(--dark-card); border-radius: 12px;
          border: 1px solid var(--border); transition: all 0.3s; min-width: 200px;
        }
        .badge:hover { border-color: var(--primary); transform: translateY(-3px); box-shadow: 0 10px 30px rgba(14,165,233,0.2); }
        .badge-icon {
          width: 60px; height: 60px; background: linear-gradient(135deg, var(--primary), var(--accent));
          border-radius: 12px; display: flex; align-items: center; justify-content: center;
          font-size: 1.8rem; box-shadow: 0 8px 20px rgba(14,165,233,0.3); color: white;
        }
        .badge-title { font-weight: 700; font-size: 1rem; margin-bottom: 0.25rem; }
        .badge-subtitle { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }

        /* Features */
        .lp-features { padding: 8rem 2rem; }
        .lp-features-inner { max-width: 1400px; margin: 0 auto; }
        .section-header { text-align: center; margin-bottom: 5rem; }
        .section-label {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.6rem 1.2rem;
          background: linear-gradient(135deg, rgba(14,165,233,0.15), rgba(16,185,129,0.1));
          color: var(--primary); border-radius: 25px; font-size: 0.85rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 1.5rem;
          border: 1px solid rgba(14,165,233,0.3);
        }
        .section-header h2 {
          font-family: 'Staatliches', sans-serif; font-size: 3.5rem; margin-bottom: 1.25rem; letter-spacing: -0.01em;
        }
        .section-header p { font-size: 1.2rem; color: var(--text-muted); max-width: 750px; margin: 0 auto; line-height: 1.7; }
        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 2.5rem; }
        .feature-card {
          background: var(--dark-lighter); padding: 3rem; border-radius: 16px;
          border: 1px solid var(--border); transition: all 0.4s; position: relative; overflow: hidden;
        }
        .feature-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
          background: linear-gradient(90deg, var(--primary), var(--accent));
          transform: scaleX(0); transform-origin: left; transition: transform 0.4s;
        }
        .feature-card:hover::before { transform: scaleX(1); }
        .feature-card:hover { transform: translateY(-8px); border-color: var(--primary); box-shadow: 0 20px 50px rgba(14,165,233,0.25); }
        .feature-icon-wrap {
          width: 70px; height: 70px; background: linear-gradient(135deg, var(--primary), var(--accent));
          border-radius: 16px; display: flex; align-items: center; justify-content: center;
          margin-bottom: 2rem; box-shadow: 0 10px 30px rgba(14,165,233,0.4); color: white;
        }
        .feature-card h3 { font-size: 1.5rem; margin-bottom: 1rem; font-weight: 700; }
        .feature-card p { color: var(--text-muted); line-height: 1.8; font-size: 1rem; }

        /* Use Cases */
        .lp-use-cases { padding: 8rem 2rem; background: var(--dark-lighter); position: relative; overflow: hidden; }
        .lp-use-cases::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(circle at 80% 20%, rgba(14,165,233,0.08), transparent 40%),
                      radial-gradient(circle at 20% 80%, rgba(16,185,129,0.06), transparent 40%);
        }
        .lp-use-cases-inner { max-width: 1400px; margin: 0 auto; position: relative; }
        .use-cases-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 2.5rem; margin-top: 4rem; }
        .use-case-card {
          background: var(--dark-card); padding: 3rem 2.5rem; border-radius: 16px;
          border: 1px solid var(--border); text-align: center; transition: all 0.4s; position: relative;
        }
        .use-case-card:hover { transform: translateY(-8px); background: var(--dark-lighter); border-color: var(--primary); }
        .use-case-icon {
          width: 80px; height: 80px; margin: 0 auto 2rem;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          border-radius: 20px; display: flex; align-items: center; justify-content: center;
          font-size: 2.5rem; box-shadow: 0 15px 40px rgba(14,165,233,0.35); color: white;
        }
        .use-case-card h3 { font-size: 1.5rem; margin-bottom: 1rem; font-weight: 700; }
        .use-case-card p { color: var(--text-muted); font-size: 1rem; line-height: 1.7; }

        /* Testimonial */
        .lp-testimonial { padding: 8rem 2rem; }
        .lp-testimonial-inner { max-width: 1200px; margin: 0 auto; }
        .testimonial-card {
          background: var(--dark-lighter); padding: 4rem; border-radius: 20px;
          border: 1px solid var(--border); margin-top: 4rem; position: relative;
        }
        .testimonial-card::before {
          content: '"'; position: absolute; top: -20px; left: 40px;
          font-size: 120px; color: var(--primary); opacity: 0.2;
          font-family: Georgia, serif; line-height: 1;
        }
        .testimonial-text { font-size: 1.4rem; line-height: 1.8; margin-bottom: 2.5rem; }
        .testimonial-author { display: flex; align-items: center; gap: 1.5rem; }
        .author-avatar {
          width: 70px; height: 70px; border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          display: flex; align-items: center; justify-content: center;
          font-size: 1.6rem; font-weight: bold; box-shadow: 0 10px 30px rgba(14,165,233,0.4);
        }
        .author-info h4 { font-weight: 700; font-size: 1.1rem; margin-bottom: 0.4rem; }
        .author-info p { color: var(--text-muted); font-size: 0.95rem; }

        /* Pricing */
        .lp-pricing { padding: 8rem 2rem; background: var(--dark-lighter); }
        .lp-pricing-inner { max-width: 1400px; margin: 0 auto; }
        .pricing-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 2.5rem; margin-top: 4rem; }
        .pricing-card {
          background: var(--dark-card); padding: 3rem; border-radius: 20px;
          border: 1px solid var(--border); position: relative; transition: all 0.4s;
        }
        .pricing-card.featured {
          border-color: var(--primary); transform: scale(1.05);
          box-shadow: 0 25px 70px rgba(14,165,233,0.35), 0 0 0 1px rgba(14,165,233,0.2);
          background: var(--dark-lighter);
        }
        .popular-badge {
          position: absolute; top: -16px; left: 50%; transform: translateX(-50%);
          background: linear-gradient(135deg, var(--accent), var(--primary));
          color: white; padding: 0.5rem 1.5rem; border-radius: 25px;
          font-size: 0.75rem; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.08em; box-shadow: 0 8px 20px rgba(16,185,129,0.4);
        }
        .pricing-card h3 { font-size: 1.5rem; margin-bottom: 0.75rem; font-weight: 800; }
        .tier-desc { color: var(--text-muted); font-size: 0.95rem; margin-bottom: 2rem; }
        .price {
          font-family: 'Staatliches', sans-serif; font-size: 4rem; margin-bottom: 0.5rem;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .price-period { color: var(--text-muted); font-size: 0.95rem; margin-bottom: 2.5rem; }
        .features-list { list-style: none; margin-bottom: 2.5rem; }
        .features-list li {
          padding: 0.9rem 0; color: var(--text-muted); display: flex; align-items: center; gap: 1rem; font-size: 0.95rem;
          border-bottom: 1px solid rgba(51,65,85,0.5);
        }
        .features-list li::before {
          content: '✓'; color: var(--success); font-weight: 800; font-size: 1rem; flex-shrink: 0;
        }

        /* CTA */
        .lp-cta {
          padding: 8rem 2rem;
          background: radial-gradient(ellipse at top, rgba(14,165,233,0.15), transparent 50%),
                      radial-gradient(ellipse at bottom, rgba(16,185,129,0.1), transparent 50%), var(--dark);
          position: relative; overflow: hidden;
        }
        .lp-cta-inner { max-width: 900px; margin: 0 auto; text-align: center; }
        .lp-cta-inner h2 {
          font-family: 'Staatliches', sans-serif; font-size: 3.5rem; margin-bottom: 1.5rem;
          background: linear-gradient(135deg, #fff 0%, var(--primary) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .lp-cta-inner p { font-size: 1.3rem; color: var(--text-muted); margin-bottom: 3rem; line-height: 1.7; }
        .cta-buttons { display: flex; gap: 1.5rem; justify-content: center; }

        /* Footer */
        .lp-footer { background: var(--dark); padding: 5rem 2rem 2.5rem; border-top: 1px solid var(--border); }
        .lp-footer-inner {
          max-width: 1400px; margin: 0 auto;
          display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 4rem; margin-bottom: 4rem;
        }
        .footer-brand p { color: var(--text-muted); line-height: 1.8; max-width: 380px; margin-top: 1.5rem; }
        .footer-links h4 { margin-bottom: 1.5rem; font-weight: 700; font-size: 1rem; }
        .footer-links ul { list-style: none; }
        .footer-links li { margin-bottom: 1rem; }
        .footer-links a { color: var(--text-muted); text-decoration: none; font-size: 0.95rem; transition: color 0.3s; }
        .footer-links a:hover { color: var(--primary); }
        .footer-bottom {
          max-width: 1400px; margin: 0 auto; padding-top: 2.5rem;
          border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;
          color: var(--text-muted); font-size: 0.9rem;
        }
        .social-links { display: flex; gap: 2rem; }
        .social-links a { color: var(--text-muted); font-size: 1.1rem; transition: all 0.3s; text-decoration: none; }
        .social-links a:hover { color: var(--primary); transform: translateY(-2px); display: inline-block; }

        /* Responsive */
        @media (max-width: 1024px) {
          .lp-hero-inner { grid-template-columns: 1fr; text-align: center; gap: 4rem; }
          .lp-hero-content h1 { font-size: 3.5rem; }
          .lp-hero-cta { justify-content: center; }
          .screenshot-browser { transform: none; }
          .pricing-grid, .use-cases-grid { grid-template-columns: 1fr; }
          .pricing-card.featured { transform: none; }
          .lp-footer-inner { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 768px) {
          .lp-nav-links { display: none; }
          .lp-hero-content h1 { font-size: 2.8rem; }
          .section-header h2 { font-size: 2.5rem; }
          .features-grid { grid-template-columns: 1fr; }
          .lp-footer-inner { grid-template-columns: 1fr; }
          .footer-bottom { flex-direction: column; gap: 2rem; text-align: center; }
        }
      `}</style>

      <div className="landing-root">

        {/* Navigation */}
        <nav className="lp-nav">
          <div className="lp-nav-inner">
            <div className="lp-logo">
              <Image src="/Airfieldopslogo.png" alt="AirfieldOps Manager" width={240} height={75} style={{ height: '75px', width: 'auto' }} priority />
            </div>
            <div className="lp-nav-links">
              <a href="#features">Features</a>
              <a href="#use-cases">Use Cases</a>
              <a href="#pricing">Pricing</a>
              <Link href="/login" className="btn-signin">Sign In</Link>
              <a href="#" className="btn btn-primary">Request Demo</a>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="lp-hero">
          <div className="lp-hero-grid" />
          <div className="lp-hero-inner">
            <div className="lp-hero-content">
              <h1>Real-Time Airfield Management That Keeps Operations Safe &amp; Compliant</h1>
              <p>Trusted by airport operations teams to manage taxiway closures, NOTAM generation, and regulatory compliance—all from one platform.</p>
              <div className="lp-hero-cta">
                <a href="#" className="btn btn-primary">Request Demo</a>
                <Link href="/login" className="btn btn-outline">Sign In</Link>
              </div>
            </div>
            <div className="lp-hero-img">
              <div className="screenshot-browser">
                <div className="browser-chrome">
                  <div className="browser-dot dot-red" />
                  <div className="browser-dot dot-yellow" />
                  <div className="browser-dot dot-green" />
                  <div className="browser-url">airfieldopsmanager.com/dashboard</div>
                </div>
                <div className="browser-body">
                  <Image
                    src="/Runway.jpg"
                    alt="Airfield Operations Dashboard"
                    width={700}
                    height={340}
                    style={{ width: '100%', height: '340px', objectFit: 'cover', display: 'block' }}
                    priority
                  />
                  <div className="browser-overlay">
                    <div className="browser-overlay-title">📡 REAL-TIME STATUS</div>
                    <div className="browser-status-row">
                      <span style={{ color: '#f1f5f9' }}>Taxiway Alpha</span>
                      <span className="status-badge-open">OPEN</span>
                    </div>
                    <div className="browser-status-row">
                      <span style={{ color: '#f1f5f9' }}>Taxiway Bravo</span>
                      <span className="status-badge-closed">CLOSED</span>
                    </div>
                    <div className="wind-row">
                      <span style={{ color: '#f1f5f9' }}>Wind</span>
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>320° 16KT</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Badges */}
        <section className="lp-trust">
          <div className="lp-trust-inner">
            <p className="trust-title">Regulatory Compliance &amp; Industry Standards</p>
            <div className="trust-badges">
              <div className="badge">
                <div className="badge-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                </div>
                <div><div className="badge-title">CAA CAP 562</div><div className="badge-subtitle">Compliant</div></div>
              </div>
              <div className="badge">
                <div className="badge-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                </div>
                <div><div className="badge-title">ICAO 9981</div><div className="badge-subtitle">PANS-ADR</div></div>
              </div>
              <div className="badge">
                <div className="badge-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <div><div className="badge-title">Audit Trail</div><div className="badge-subtitle">Immutable Logging</div></div>
              </div>
              <div className="badge">
                <div className="badge-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></svg>
                </div>
                <div><div className="badge-title">Trusted By</div><div className="badge-subtitle">15+ Airports</div></div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="lp-features" id="features">
          <div className="lp-features-inner">
            <div className="section-header">
              <span className="section-label">⚡ Powerful Features</span>
              <h2>Everything You Need for Safe Airfield Operations</h2>
              <p>Comprehensive tools designed specifically for airport operations teams, ATC, and airfield managers.</p>
            </div>
            <div className="features-grid">
              {[
                { Icon: Map,           title: 'Real-Time Taxiway Status',   desc: 'Interactive map with live status overlays. Click to change status, view history, and manage closures with full audit trails.' },
                { Icon: FileText,      title: 'Automated NOTAM Drafting',   desc: 'Generate compliant NOTAMs automatically when taxiways close. Pre-filled templates save hours of manual work.' },
                { Icon: ShieldCheck,   title: 'Complete Audit Trail',        desc: 'Every status change logged with timestamps. CAA CAP 562 compliant records retained immutably.' },
                { Icon: EyeOff,        title: 'Low Visibility Procedures',   desc: 'One-click activation with instant visual warnings across the system. Ensure all operators are aware immediately.' },
                { Icon: CalendarDays,  title: 'Work Schedule Management',    desc: 'Plan maintenance windows, track work crews, and coordinate closures to minimise operational impact.' },
                { Icon: Wind,          title: 'Weather Integration',         desc: 'Live METAR, wind components, visibility, and runway conditions. Critical data at your fingertips.' },
                { Icon: ClipboardCheck,title: 'RCAM Assessments',            desc: 'ICAO 9981 PANS-ADR compliant runway condition assessments. Track RWYCC codes and braking action.' },
                { Icon: Users,         title: 'Multi-User Collaboration',    desc: 'Role-based access for ATC, ops teams, and maintenance crews. Real-time sync across all users.' },
                { Icon: Flame,         title: 'RFFS Management',             desc: 'Track Rescue & Fire Fighting Service categories, equipment status, and response capabilities.' },
              ].map(({ Icon, title, desc }) => (
                <div key={title} className="feature-card">
                  <div className="feature-icon-wrap">
                    <Icon size={36} strokeWidth={1.75} />
                  </div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="lp-use-cases" id="use-cases">
          <div className="lp-use-cases-inner">
            <div className="section-header">
              <span className="section-label">⚡ Perfect For</span>
              <h2>Built for Aviation Professionals</h2>
            </div>
            <div className="use-cases-grid">
              {[
                { Icon: Building2,     title: 'Regional Airports',     desc: 'Streamline operations with limited staff. One platform for all airfield management needs.' },
                { Icon: ClipboardList, title: 'Airport Operations',    desc: 'Coordinate works, manage closures, and maintain compliance with ease.' },
                { Icon: Flame,         title: 'Airport Fire Services', desc: 'Track equipment, manage RFFS categories, and coordinate emergency responses.' },
              ].map(({ Icon, title, desc }) => (
                <div key={title} className="use-case-card">
                  <div className="use-case-icon">
                    <Icon size={44} strokeWidth={1.5} />
                  </div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="lp-testimonial">
          <div className="lp-testimonial-inner">
            <div className="section-header">
              <span className="section-label">⚡ Testimonials</span>
              <h2>Trusted by Aviation Professionals</h2>
            </div>
            <div className="testimonial-card">
              <p className="testimonial-text">AirfieldOps Manager has transformed how we coordinate taxiway closures and maintenance. The automated NOTAM generation alone saves us hours every week, and the audit trail gives us complete confidence in our compliance.</p>
              <div className="testimonial-author">
                <div className="author-avatar">JD</div>
                <div className="author-info">
                  <h4>James Davidson</h4>
                  <p>Airport Operations Manager, Regional Airport</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="lp-pricing" id="pricing">
          <div className="lp-pricing-inner">
            <div className="section-header">
              <span className="section-label">⚡ Pricing</span>
              <h2>Choose Your Plan</h2>
              <p>Transparent pricing based on airport size. All plans include full features and support.</p>
            </div>
            <div className="pricing-grid">
              <div className="pricing-card">
                <h3>Small Airport</h3>
                <p className="tier-desc">Perfect for airfields with 1–2 runways</p>
                <div className="price">£299</div>
                <p className="price-period">per month</p>
                <ul className="features-list">
                  {['Up to 2 runways', 'Unlimited taxiways', 'NOTAM generation', 'Weather integration', '5 user accounts', 'Email support'].map(f => <li key={f}>{f}</li>)}
                </ul>
                <a href="#" className="btn btn-outline" style={{ width: '100%', textAlign: 'center', display: 'block' }}>Get Started</a>
              </div>
              <div className="pricing-card featured">
                <div className="popular-badge">Most Popular</div>
                <h3>Medium Airport</h3>
                <p className="tier-desc">For busy regional airports</p>
                <div className="price">£599</div>
                <p className="price-period">per month</p>
                <ul className="features-list">
                  {['Up to 4 runways', 'Unlimited taxiways', 'NOTAM generation', 'Weather integration', 'RCAM assessments', '15 user accounts', 'Priority support', 'Custom branding'].map(f => <li key={f}>{f}</li>)}
                </ul>
                <a href="#" className="btn btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>Get Started</a>
              </div>
              <div className="pricing-card">
                <h3>Large Airport</h3>
                <p className="tier-desc">Enterprise solution for major hubs</p>
                <div className="price">Custom</div>
                <p className="price-period">contact sales</p>
                <ul className="features-list">
                  {['Unlimited runways', 'Unlimited taxiways', 'All features included', 'Unlimited users', 'SSO integration', 'On-premise deployment', 'Dedicated support', 'Custom development'].map(f => <li key={f}>{f}</li>)}
                </ul>
                <a href="#" className="btn btn-outline" style={{ width: '100%', textAlign: 'center', display: 'block' }}>Contact Sales</a>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="lp-cta">
          <div className="lp-cta-inner">
            <h2>Ready to Transform Your Airfield Operations?</h2>
            <p>Join airports worldwide using AirfieldOps Manager to improve safety, compliance, and efficiency.</p>
            <div className="cta-buttons">
              <a href="#" className="btn btn-primary">Request Demo</a>
              <Link href="/login" className="btn btn-outline">Sign In</Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="lp-footer">
          <div className="lp-footer-inner">
            <div className="footer-brand">
              <Image src="/Airfieldopslogo.png" alt="AirfieldOps Manager" width={200} height={64} style={{ height: '64px', width: 'auto' }} />
              <p>Real-time airfield management software trusted by aviation professionals worldwide. Keep your operations safe, compliant, and efficient.</p>
            </div>
            <div className="footer-links">
              <h4>Product</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#use-cases">Use Cases</a></li>
              </ul>
            </div>
            <div className="footer-links">
              <h4>Company</h4>
              <ul>
                <li><a href="#">About</a></li>
                <li><a href="#">Contact</a></li>
                <li><a href="#">Careers</a></li>
              </ul>
            </div>
            <div className="footer-links">
              <h4>Support</h4>
              <ul>
                <li><a href="#">Documentation</a></li>
                <li><a href="#">Help Center</a></li>
                <li><a href="#">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 AirfieldOps Manager. All rights reserved.</p>
            <div className="social-links">
              <a href="#">LinkedIn</a>
              <a href="#">Twitter</a>
              <a href="#">GitHub</a>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
