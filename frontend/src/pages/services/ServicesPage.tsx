import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  ShieldCheck,
  Radio,
  FileCheck2,
  ArrowRight,
  ExternalLink,
  MapPin,
  History,
  BellRing,
  Cpu,
  Layers,
  Download,
  Building2,
  CheckCircle2,
  Phone,
  Mail,
  User,
  Zap,
  Lock,
  ChevronRight
} from 'lucide-react';
import '../landing/LandingPage.css';
import './ServicesPage.css';
import vlinkLogoImg from '../../assets/logo.png';

export const VLinkLogo = ({ size = 36, light = false }: { size?: number; light?: boolean }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <img
        src={vlinkLogoImg}
        alt="V Link Logo"
        style={{
          height: `${size}px`,
          width: `${size}px`,
          borderRadius: '50%',
          objectFit: 'cover',
          display: 'block'
        }}
      />
      <span
        style={{
          fontSize: `${Math.round(size * 0.58)}px`,
          fontWeight: 800,
          color: light ? '#FFFFFF' : '#0F172A',
          letterSpacing: '-0.025em',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}
      >
        V Link
      </span>
    </div>
  );
};

export const ServicesPage: React.FC = () => {
  const navigate = useNavigate();

  const handleNavClick = (sectionId: string) => {
    navigate(`/#${sectionId}`);
  };

  return (
    <div className="vlink-services-body">
      {/* ==========================================================================
          HEADER / NAVBAR
          ========================================================================== */}
      <header className="vlink-navbar">
        <div className="vlink-container" style={{ width: '100%' }}>
          <div className="vlink-nav-inner">
            {/* Left: V Link Logo */}
            <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="vlink-logo-link">
              <VLinkLogo size={36} light={false} />
            </a>

            {/* Center: Menu */}
            <ul className="vlink-nav-menu">
              <li>
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/');
                  }}
                  className="vlink-nav-link"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="/#about"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick('about');
                  }}
                  className="vlink-nav-link"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="/services"
                  className="vlink-nav-link active"
                >
                  Services
                </a>
              </li>
              <li>
                <a
                  href="/#contact"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick('contact');
                  }}
                  className="vlink-nav-link"
                >
                  Contact
                </a>
              </li>
            </ul>

            {/* Right: Actions */}
            <div className="vlink-nav-actions">
              <a
                href="https://live.vlinktracking.com/login"
                target="_blank"
                rel="noopener noreferrer"
                className="vlink-btn vlink-btn-orange"
              >
                <Car size={16} />
                <span>Track Your Vehicle</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* ==========================================================================
          HERO SECTION WITH DUAL LOGIN BUTTONS
          ========================================================================== */}
      <section id="portal-access" className="vlink-services-hero">
        <div className="vlink-container">
          <div className="vlink-services-hero-content">
            <span className="vlink-badge-pill" style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              CORE SERVICES & PORTAL ACCESS
            </span>

            <h1 className="vlink-services-hero-title">
              Complete <span className="highlight-blue">VLTD Telematics</span> &amp; RTO Services
            </h1>

            <p className="vlink-services-hero-desc">
              Access your dedicated portals below to monitor your vehicle live on Google Maps or manage end-to-end AIS-140 Vahan certificates in record time.
            </p>

            {/* The 2 Main Login Buttons as requested by User */}
            <div className="vlink-hero-login-grid">
              {/* BUTTON 1: Customer Login */}
              <a
                href="https://live.vlinktracking.com/login"
                target="_blank"
                rel="noopener noreferrer"
                className="vlink-login-card customer"
              >
                <div className="vlink-login-card-top">
                  <div className="vlink-login-card-icon">
                    <Radio size={26} color="#FFFFFF" />
                  </div>
                  <span className="vlink-login-card-badge">LIVE GPS</span>
                </div>
                <div className="vlink-login-card-title">
                  <span>Customer Login</span>
                  <ExternalLink size={18} />
                </div>
                <p className="vlink-login-card-desc">
                  Live real-time vehicle GPS tracking, speed monitoring, route playback &amp; instant alerts on web &amp; mobile.
                </p>
                <div className="vlink-login-card-btn">
                  <span>Go to Customer Portal</span>
                  <ArrowRight size={16} />
                </div>
              </a>

              {/* BUTTON 2: RTO Login */}
              <a
                href="https://www.vlinktracking.com/user/login"
                target="_blank"
                rel="noopener noreferrer"
                className="vlink-login-card rto"
              >
                <div className="vlink-login-card-top">
                  <div className="vlink-login-card-icon">
                    <ShieldCheck size={26} color="#FFFFFF" />
                  </div>
                  <span className="vlink-login-card-badge">RTO PORTAL</span>
                </div>
                <div className="vlink-login-card-title">
                  <span>RTO Login</span>
                  <ExternalLink size={18} />
                </div>
                <p className="vlink-login-card-desc">
                  Official Vahan compliance dashboard for certificate generation, barcode scanning, approval tracking &amp; verification.
                </p>
                <div className="vlink-login-card-btn">
                  <span>Go to RTO Portal</span>
                  <ArrowRight size={16} />
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================================
          SERVICE PILLAR 1: CUSTOMER VEHICLE TRACKING SERVICE
          ========================================================================== */}
      <section className="vlink-service-pillar-section">
        <div className="vlink-container">
          <div className="vlink-pillar-header">
            <span className="vlink-pillar-badge orange">
              <Radio size={14} /> LIVE FLEET & VEHICLE TELEMATICS
            </span>
            <h2 className="vlink-pillar-title">
              Know Where Your Vehicle Is, Live 24/7
            </h2>
            <p className="vlink-pillar-desc">
              Dedicated vehicle tracking service engineered for commercial fleets, private vehicle owners, taxis, buses, and logistics companies across India.
            </p>
          </div>

          <div className="vlink-pillar-grid">
            {/* Feature 1 */}
            <div className="vlink-service-feature-card">
              <div className="vlink-service-feature-top">
                <div className="vlink-feature-icon-wrapper orange">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="vlink-feature-title">High-Precision Live GPS Tracking</h3>
                  <span style={{ fontSize: '12px', color: '#EA580C', fontWeight: 600 }}>10-Second Real-Time Telemetry Pings</span>
                </div>
              </div>
              <p className="vlink-feature-desc">
                Monitor the exact live street address, coordinates, and real-time vehicle movements with high accuracy on interactive satellite &amp; street maps.
              </p>
              <ul className="vlink-feature-points">
                <li className="vlink-feature-point-item">
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span>Real-time speed telemetry (km/h) and overspeed warnings</span>
                </li>
                <li className="vlink-feature-point-item">
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span>Engine ignition status (Ignition ON / Idle / Engine OFF)</span>
                </li>
                <li className="vlink-feature-point-item">
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span>Internal battery voltage and vehicle power disconnection alerts</span>
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="vlink-service-feature-card">
              <div className="vlink-service-feature-top">
                <div className="vlink-feature-icon-wrapper blue">
                  <History size={24} />
                </div>
                <div>
                  <h3 className="vlink-feature-title">90-Day Trip History &amp; Route Playback</h3>
                  <span style={{ fontSize: '12px', color: '#2563EB', fontWeight: 600 }}>Full Travel Replay with Time Stamps</span>
                </div>
              </div>
              <p className="vlink-feature-desc">
                Review complete vehicle movement history with turn-by-turn route replay, stoppage durations, idle time calculations, and daily mileage summaries.
              </p>
              <ul className="vlink-feature-points">
                <li className="vlink-feature-point-item">
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span>Animated trip playback with speed variations across routes</span>
                </li>
                <li className="vlink-feature-point-item">
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span>Accurate halt &amp; stoppage reports with exact arrival and departure times</span>
                </li>
                <li className="vlink-feature-point-item">
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span>Downloadable Excel &amp; PDF travel reports for fleet audits</span>
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="vlink-service-feature-card">
              <div className="vlink-service-feature-top">
                <div className="vlink-feature-icon-wrapper purple">
                  <BellRing size={24} />
                </div>
                <div>
                  <h3 className="vlink-feature-title">Smart Geofencing &amp; Instant Alerts</h3>
                  <span style={{ fontSize: '12px', color: '#7C3AED', fontWeight: 600 }}>SMS, WhatsApp &amp; Mobile Push Alerts</span>
                </div>
              </div>
              <p className="vlink-feature-desc">
                Establish custom geographic perimeters around homes, warehouses, hubs, or city borders to receive instant notifications upon entry or exit.
              </p>
              <ul className="vlink-feature-points">
                <li className="vlink-feature-point-item">
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span>Geofence breach alerts for unauthorized route deviation</span>
                </li>
                <li className="vlink-feature-point-item">
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span>Night driving alerts and towing / vibration sensors</span>
                </li>
                <li className="vlink-feature-point-item">
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span>Multi-user notification dispatch for family or fleet managers</span>
                </li>
              </ul>
            </div>

            {/* Feature 4 */}
            <div className="vlink-service-feature-card">
              <div className="vlink-service-feature-top">
                <div className="vlink-feature-icon-wrapper green">
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="vlink-feature-title">AIS-140 Emergency SOS Integration</h3>
                  <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>Direct State Emergency (ERSS 112) Link</span>
                </div>
              </div>
              <p className="vlink-feature-desc">
                Government-mandated emergency panic buttons transmit instant distress telemetry to police and emergency command centers in real time.
              </p>
              <ul className="vlink-feature-points">
                <li className="vlink-feature-point-item">
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span>Dual panic buttons for driver and passenger compartments</span>
                </li>
                <li className="vlink-feature-point-item">
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span>Direct API telemetry integration with Ministry of Road Transport</span>
                </li>
                <li className="vlink-feature-point-item">
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span>Certified hardware tamper detection and power-cut alarms</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Direct Customer Access Banner */}
          <div className="vlink-pillar-cta-box orange">
            <div className="vlink-pillar-cta-info">
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                <Car size={22} />
              </div>
              <div>
                <h4 className="vlink-pillar-cta-title">Ready to track your vehicle live?</h4>
                <p className="vlink-pillar-cta-desc">Log in to the Customer Live Tracking Portal with your vehicle registration or username.</p>
              </div>
            </div>
            <a
              href="https://live.vlinktracking.com/login"
              target="_blank"
              rel="noopener noreferrer"
              className="vlink-btn vlink-btn-orange"
            >
              <span>Open Customer Tracking Portal</span>
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ==========================================================================
          SERVICE PILLAR 2: WHOLE WEBSITE RTO & VAHAN SERVICES
          ========================================================================== */}
      <section className="vlink-service-pillar-section alt-bg">
        <div className="vlink-container">
          <div className="vlink-pillar-header">
            <span className="vlink-pillar-badge blue">
              <ShieldCheck size={14} /> GOVERNMENT & RTO COMPLIANCE SUITE
            </span>
            <h2 className="vlink-pillar-title">
              Complete Vahan Certificate &amp; VLTD Management
            </h2>
            <p className="vlink-pillar-desc">
              India's premier digital workflow system for vehicle dealers, manufacturers, and transport operators to acquire certified RTO Vahan approvals.
            </p>
          </div>

          <div className="vlink-pillar-grid">
            {/* Feature 1 */}
            <div className="vlink-service-feature-card">
              <div className="vlink-service-feature-top">
                <div className="vlink-feature-icon-wrapper blue">
                  <FileCheck2 size={24} />
                </div>
                <div>
                  <h3 className="vlink-feature-title">AIS-140 Vahan Certificate Management</h3>
                  <span style={{ fontSize: '12px', color: '#2563EB', fontWeight: 600 }}>End-to-End Approval in Record Time</span>
                </div>
              </div>
              <p className="vlink-feature-desc">
                Streamline commercial vehicle certification with seamless fitment records, Vahan portal compliance, and automated document generation.
              </p>
              <ul className="vlink-feature-points">
                <li className="vlink-feature-point-item">
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span>Fully aligned with MoRTH AIS-140 standard for all commercial vehicles</span>
                </li>
                <li className="vlink-feature-point-item">
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span>Direct coordination with RTO offices across Tamil Nadu &amp; India</span>
                </li>
                <li className="vlink-feature-point-item">
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span>Valid for Taxi, Bus, Hazardous Cargo, and Construction Fleets</span>
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="vlink-service-feature-card">
              <div className="vlink-service-feature-top">
                <div className="vlink-feature-icon-wrapper purple">
                  <Cpu size={24} />
                </div>
                <div>
                  <h3 className="vlink-feature-title">AI-Powered Barcode Scanning</h3>
                  <span style={{ fontSize: '12px', color: '#7C3AED', fontWeight: 600 }}>Zero-Error Hardware Extraction</span>
                </div>
              </div>
              <p className="vlink-feature-desc">
                Eliminate human typing errors with smart optical barcode scanning that extracts device IMEI, VLTD Serial Numbers, and Manufacturer codes instantly.
              </p>
              <ul className="vlink-feature-points">
                <li className="vlink-feature-point-item">
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span>Sub-second barcode scan from mobile camera or handheld scanners</span>
                </li>
                <li className="vlink-feature-point-item">
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span>Automatic verification against manufacturer serial registries</span>
                </li>
                <li className="vlink-feature-point-item">
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span>Prevents duplicate device submissions and certificate rejections</span>
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="vlink-service-feature-card">
              <div className="vlink-service-feature-top">
                <div className="vlink-feature-icon-wrapper green">
                  <Layers size={24} />
                </div>
                <div>
                  <h3 className="vlink-feature-title">4-Stage Transparent Verification Pipeline</h3>
                  <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>Live Application Progression</span>
                </div>
              </div>
              <p className="vlink-feature-desc">
                Every vehicle application progresses transparently through four structured milestone stages with real-time status updates:
              </p>
              <ul className="vlink-feature-points">
                <li className="vlink-feature-point-item">
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span><strong>1. Application Submitted:</strong> Initial vehicle &amp; RC upload</span>
                </li>
                <li className="vlink-feature-point-item">
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span><strong>2. VLTD Device Installed:</strong> Physical fitment verified</span>
                </li>
                <li className="vlink-feature-point-item">
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span><strong>3. RTO Inspection &amp; Testing:</strong> Live server ping check</span>
                </li>
                <li className="vlink-feature-point-item">
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span><strong>4. Vahan Certificate Issued:</strong> Instant official PDF certificate</span>
                </li>
              </ul>
            </div>

            {/* Feature 4 */}
            <div className="vlink-service-feature-card">
              <div className="vlink-service-feature-top">
                <div className="vlink-feature-icon-wrapper orange">
                  <Download size={24} />
                </div>
                <div>
                  <h3 className="vlink-feature-title">Tamper-Proof Digital Certificates</h3>
                  <span style={{ fontSize: '12px', color: '#EA580C', fontWeight: 600 }}>Cryptographic QR Code Verification</span>
                </div>
              </div>
              <p className="vlink-feature-desc">
                Instantly generate and download government-recognized digital Vahan certificates equipped with tamper-proof QR codes for instant RTO field inspection.
              </p>
              <ul className="vlink-feature-points">
                <li className="vlink-feature-point-item">
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span>High-resolution PDF ready for print or mobile inspection</span>
                </li>
                <li className="vlink-feature-point-item">
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span>Permanent cloud archival for fast renewals and warranty claims</span>
                </li>
                <li className="vlink-feature-point-item">
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span>Direct compliance synchronization with State Transport Authority</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Direct RTO Access Banner */}
          <div className="vlink-pillar-cta-box blue">
            <div className="vlink-pillar-cta-info">
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                <Building2 size={22} />
              </div>
              <div>
                <h4 className="vlink-pillar-cta-title">Ready to manage Vahan Certificates?</h4>
                <p className="vlink-pillar-cta-desc">Log in to the RTO Certificate Portal to process applications, fitments, and approvals.</p>
              </div>
            </div>
            <a
              href="https://www.vlinktracking.com/user/login"
              target="_blank"
              rel="noopener noreferrer"
              className="vlink-btn vlink-btn-blue"
            >
              <span>Open RTO Certificate Portal</span>
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ==========================================================================
          TRUST & METRICS BANNER
          ========================================================================== */}
      <section style={{ padding: '60px 0', backgroundColor: '#0F172A', color: '#FFFFFF' }}>
        <div className="vlink-container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '30px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#38BDF8' }}>100%</div>
              <div style={{ fontSize: '14px', color: '#94A3B8', marginTop: '6px' }}>AIS-140 MoRTH Compliant</div>
            </div>
            <div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#F97316' }}>50+</div>
              <div style={{ fontSize: '14px', color: '#94A3B8', marginTop: '6px' }}>Certified VLTD Manufacturers</div>
            </div>
            <div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#10B981' }}>48+</div>
              <div style={{ fontSize: '14px', color: '#94A3B8', marginTop: '6px' }}>RTO Offices Supported</div>
            </div>
            <div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#A855F7' }}>24/7</div>
              <div style={{ fontSize: '14px', color: '#94A3B8', marginTop: '6px' }}>Live Telematics Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================================
          FOOTER
          ========================================================================== */}
      <footer className="vlink-footer">
        <div className="vlink-container">
          <div className="vlink-footer-grid">
            {/* Brand Column */}
            <div className="vlink-footer-brand">
              <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="vlink-footer-logo">
                <VLinkLogo size={32} light={true} />
              </a>
              <p className="vlink-footer-tagline">
                Smart. Secure. Compliant.
              </p>
              <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6, maxWidth: '280px' }}>
                Next-generation AIS-140 VLTD tracking and automated Vahan certificate platform for India.
              </p>
            </div>

            {/* Quick Links */}
            <div className="vlink-footer-links-col">
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Quick Links
              </div>
              <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="vlink-footer-link">Home</a>
              <a href="/#about" onClick={(e) => { e.preventDefault(); handleNavClick('about'); }} className="vlink-footer-link">About</a>
              <a href="/services" className="vlink-footer-link active" style={{ color: '#60A5FA' }}>Services</a>
              <a href="/#contact" onClick={(e) => { e.preventDefault(); handleNavClick('contact'); }} className="vlink-footer-link">Contact</a>
              <a
                href="https://live.vlinktracking.com/login"
                target="_blank"
                rel="noopener noreferrer"
                className="vlink-footer-link orange"
              >
                Track Your Vehicle
              </a>
            </div>

            {/* Direct Portals */}
            <div className="vlink-footer-links-col">
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Direct Portals
              </div>
              <a href="https://live.vlinktracking.com/login" target="_blank" rel="noopener noreferrer" className="vlink-footer-link">
                Customer GPS Tracking
              </a>
              <a href="https://www.vlinktracking.com/user/login" target="_blank" rel="noopener noreferrer" className="vlink-footer-link">
                RTO Certificate Portal
              </a>
              <a href="/admin" onClick={(e) => { e.preventDefault(); navigate('/admin'); }} className="vlink-footer-link">
                Admin Portal
              </a>
            </div>

            {/* Contact Info */}
            <div className="vlink-footer-contact-col">
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Reach Us
              </div>
              <div className="vlink-footer-contact-item">
                <Phone size={14} color="#60A5FA" />
                <span>+91 98765 43210</span>
              </div>
              <div className="vlink-footer-contact-item">
                <Mail size={14} color="#60A5FA" />
                <span>support@vlink.in</span>
              </div>
              <div className="vlink-footer-contact-item">
                <MapPin size={14} color="#60A5FA" />
                <span>Chennai, Tamil Nadu – 600001</span>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="vlink-footer-bottom">
            <span>© 2025 V Link. All rights reserved.</span>
            <div className="vlink-footer-legal">
              <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
              <a href="#terms" onClick={(e) => e.preventDefault()}>Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ServicesPage;
