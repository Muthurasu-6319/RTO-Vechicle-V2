import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Users,
  Landmark,
  Clock,
  ShieldCheck,
  Car,
  Award,
  CheckCircle2,
  Bell,
  Layers,
  Download,
  Sliders,
  MapPin,
  Mail,
  Phone,
  Send,
  ArrowRight,
  User,
  X,
  Search,
  Check,
  Zap,
  Lock,
  Compass
} from 'lucide-react';
import './LandingPage.css';
import vehicleTrackingMap from '../../assets/vehicle-tracking-map.png';
import barcodeScannerPreview from '../../assets/barcode-scanner-preview.png';
import vlinkLogoImg from '../../assets/logo.png';

// Official V Link Logo using the project's exact logo.png from assets
export const VLinkLogo = ({ size = 36, light = false }: { size?: number; light?: boolean }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <img
        src={vlinkLogoImg}
        alt="V Link Logo"
        style={{
          height: `${size}px`,
          width: 'auto',
          maxWidth: `${size * 1.5}px`,
          objectFit: 'contain',
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

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // Active navigation anchor
  const [activeNav, setActiveNav] = useState<'home' | 'about' | 'services' | 'contact'>('home');

  // Tracking Modal State
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [searchRegNumber, setSearchRegNumber] = useState('TN 09 AB 1234');
  const [trackingResult, setTrackingResult] = useState<{
    found: boolean;
    vehicleNo: string;
    imei: string;
    speed: string;
    location: string;
    status: string;
    certStatus: string;
    lastPing: string;
  } | null>({
    found: true,
    vehicleNo: 'TN 09 AB 1234',
    imei: '869123456789012',
    speed: '62 km/h',
    location: 'Anna Salai, Chennai, Tamil Nadu',
    status: 'Active (In Motion)',
    certStatus: 'AIS-140 Certified (Valid till 2028)',
    lastPing: 'Just now'
  });

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    mobile: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.mobile) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmittedSuccess(true);
      setContactForm({ name: '', mobile: '', message: '' });
      setTimeout(() => setSubmittedSuccess(false), 5000);
    }, 700);
  };

  const handleTrackSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchRegNumber.trim().toUpperCase() || 'TN 09 AB 1234';
    setTrackingResult({
      found: true,
      vehicleNo: query,
      imei: '869123456789012',
      speed: '58 km/h',
      location: 'Mount Road, Guindy, Chennai',
      status: 'Active (GPS Signal High)',
      certStatus: 'AIS-140 Vahan Approved',
      lastPing: '2 seconds ago'
    });
  };

  const scrollToSection = (id: string, navKey: 'home' | 'about' | 'contact') => {
    setActiveNav(navKey);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-body">
      {/* ==========================================================================
          SECTION 01: STICKY NAVIGATION
          ========================================================================== */}
      <header className="vlink-navbar">
        <div className="vlink-container" style={{ width: '100%' }}>
          <div className="vlink-nav-inner">
            {/* Left: V Link Logo */}
            <a href="#home" onClick={() => scrollToSection('home', 'home')} className="vlink-logo-link">
              <VLinkLogo size={36} light={false} />
            </a>

            {/* Center: Menu */}
            <ul className="vlink-nav-menu">
              <li>
                <a
                  href="#home"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('home', 'home');
                  }}
                  className={`vlink-nav-link ${activeNav === 'home' ? 'active' : ''}`}
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="#about"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('about', 'about');
                  }}
                  className={`vlink-nav-link ${activeNav === 'about' ? 'active' : ''}`}
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="/services"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/services');
                  }}
                  className={`vlink-nav-link ${activeNav === 'services' ? 'active' : ''}`}
                >
                  Services
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('contact', 'contact');
                  }}
                  className={`vlink-nav-link ${activeNav === 'contact' ? 'active' : ''}`}
                >
                  Contact
                </a>
              </li>
            </ul>

            {/* Right: Actions */}
            <div className="vlink-nav-actions">
              <button
                onClick={() => navigate('/services')}
                className="vlink-btn vlink-btn-nav-login"
                title="Select Login Portal"
              >
                <User size={16} />
                <span>Login</span>
              </button>
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
          SECTION 02: HERO SECTION
          ========================================================================== */}
      <section id="home" className="vlink-hero-section">
        <div className="vlink-container">
          <div className="vlink-hero-content">
            <h1 className="vlink-hero-title">
              Vahan Certificates<br />
              for <span className="highlight-blue">VLTD</span>, Approved<br />
              in Record Time
            </h1>

            <p className="vlink-hero-desc">
              Track, Verify and Get Your Vahan Certificate with Complete Transparency.
            </p>

            <div className="vlink-hero-buttons">
              <a
                href="https://live.vlinktracking.com/login"
                target="_blank"
                rel="noopener noreferrer"
                className="vlink-btn vlink-btn-orange vlink-hero-btn-orange"
              >
                <span>Track Your Vehicle</span>
                <ArrowRight size={16} />
              </a>
              <button
                onClick={() => navigate('/services')}
                className="vlink-btn vlink-btn-outline vlink-hero-btn-login"
              >
                <User size={16} />
                <span>Login</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================================
          SECTION 03: STATISTICS CARDS
          ========================================================================== */ }
      <section className="vlink-stats-section">
        <div className="vlink-container">
          <div className="vlink-stats-container">
            {/* Stat 1 */}
            <div className="vlink-stat-item">
              <div className="vlink-stat-icon-wrap">
                <FileText size={22} />
              </div>
              <div className="vlink-stat-text">
                <span className="vlink-stat-num">2.5L+</span>
                <span className="vlink-stat-label">Certificates Issued</span>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="vlink-stat-item">
              <div className="vlink-stat-icon-wrap">
                <Users size={22} />
              </div>
              <div className="vlink-stat-text">
                <span className="vlink-stat-num">1,200+</span>
                <span className="vlink-stat-label">Active Dealers</span>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="vlink-stat-item">
              <div className="vlink-stat-icon-wrap">
                <Landmark size={22} />
              </div>
              <div className="vlink-stat-text">
                <span className="vlink-stat-num">450+</span>
                <span className="vlink-stat-label">RTO Offices</span>
              </div>
            </div>

            {/* Stat 4 */}
            <div className="vlink-stat-item">
              <div className="vlink-stat-icon-wrap">
                <Clock size={22} />
              </div>
              <div className="vlink-stat-text">
                <span className="vlink-stat-num">24h</span>
                <span className="vlink-stat-label">Avg. Turnaround</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================================
          SECTION 04: HOW IT WORKS
          ========================================================================== */}
      <section id="how-it-works" className="vlink-how-section">
        <div className="vlink-container">
          <span className="vlink-section-pill">Simple Process</span>
          <h2 className="vlink-section-heading">
            How It <span className="highlight-blue">Works</span>
          </h2>
          <p className="vlink-section-sub">
            Get your Vahan Certificate in just 5 simple steps
          </p>

          <div className="vlink-steps-row">
            {/* Connecting dashed line */}
            <div className="vlink-steps-line"></div>

            {/* Step 1 */}
            <div className="vlink-step-item">
              <div className="vlink-step-circle">
                <FileText size={24} />
              </div>
              <span className="vlink-step-title">1. Apply</span>
            </div>

            {/* Step 2 */}
            <div className="vlink-step-item">
              <div className="vlink-step-circle">
                <ShieldCheck size={24} />
              </div>
              <span className="vlink-step-title">2. Verify</span>
            </div>

            {/* Step 3 */}
            <div className="vlink-step-item">
              <div className="vlink-step-circle">
                <Car size={24} />
              </div>
              <span className="vlink-step-title">3. Install</span>
            </div>

            {/* Step 4 */}
            <div className="vlink-step-item">
              <div className="vlink-step-circle">
                <Landmark size={24} />
              </div>
              <span className="vlink-step-title">4. RTO Approval</span>
            </div>

            {/* Step 5 */}
            <div className="vlink-step-item">
              <div className="vlink-step-circle">
                <Award size={24} />
              </div>
              <span className="vlink-step-title">5. Vahan Certificate</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================================
          SECTION 05: BARCODE SCANNING
          ========================================================================== */}
      <section className="vlink-barcode-section">
        <div className="vlink-container">
          <div className="vlink-barcode-grid">
            {/* Left Column: Barcode Scanning UI Image Preview */}
            <div className="vlink-barcode-left">
              <div className="vlink-scanner-preview-card">
                <img
                  src={barcodeScannerPreview}
                  alt="AI-Powered Barcode Scanning - Details Extracted Preview"
                  className="vlink-scanner-img"
                />
              </div>
            </div>

            {/* Right Column: Content */}
            <div className="vlink-barcode-right">
              <h2 className="vlink-barcode-title">
                AI-Powered Barcode Scanning
              </h2>
              <p className="vlink-barcode-desc">
                Scan VLTD device barcode and get IMEI, VLD Serial and Manufacturer details instantly.
              </p>

              <div className="vlink-benefit-list">
                <div className="vlink-benefit-item">
                  <div className="vlink-benefit-check">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <span>Fast &amp; Accurate Scanning</span>
                </div>

                <div className="vlink-benefit-item">
                  <div className="vlink-benefit-check">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <span>Auto Data Extraction</span>
                </div>

                <div className="vlink-benefit-item">
                  <div className="vlink-benefit-check">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <span>Reduce Manual Entry</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================================
          SECTION 06: FEATURES GRID (3 columns x 2 rows)
          ========================================================================== */}
      <section id="features" className="vlink-features-section">
        <div className="vlink-container">
          <div className="vlink-features-grid">
            {/* Feature 1 */}
            <div className="vlink-feature-card">
              <div className="vlink-feature-top">
                <div className="vlink-feature-icon-box">
                  <ShieldCheck size={24} />
                </div>
                <div className="vlink-feature-arrow-btn">
                  <ArrowRight size={14} />
                </div>
              </div>
              <h3 className="vlink-feature-title">Duplicate Detection</h3>
              <p className="vlink-feature-desc">
                Prevent duplicate applications with smart checks.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="vlink-feature-card">
              <div className="vlink-feature-top">
                <div className="vlink-feature-icon-box">
                  <MapPin size={24} />
                </div>
                <div className="vlink-feature-arrow-btn">
                  <ArrowRight size={14} />
                </div>
              </div>
              <h3 className="vlink-feature-title">Live Status Tracking</h3>
              <p className="vlink-feature-desc">
                Track your application in real-time.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="vlink-feature-card">
              <div className="vlink-feature-top">
                <div className="vlink-feature-icon-box">
                  <Bell size={24} />
                </div>
                <div className="vlink-feature-arrow-btn">
                  <ArrowRight size={14} />
                </div>
              </div>
              <h3 className="vlink-feature-title">Instant Notifications</h3>
              <p className="vlink-feature-desc">
                Get alerts on every update.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="vlink-feature-card">
              <div className="vlink-feature-top">
                <div className="vlink-feature-icon-box">
                  <Layers size={24} />
                </div>
                <div className="vlink-feature-arrow-btn">
                  <ArrowRight size={14} />
                </div>
              </div>
              <h3 className="vlink-feature-title">Quota Management</h3>
              <p className="vlink-feature-desc">
                Manage dealer quotas efficiently.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="vlink-feature-card">
              <div className="vlink-feature-top">
                <div className="vlink-feature-icon-box">
                  <Download size={24} />
                </div>
                <div className="vlink-feature-arrow-btn">
                  <ArrowRight size={14} />
                </div>
              </div>
              <h3 className="vlink-feature-title">Secure Certificate Download</h3>
              <p className="vlink-feature-desc">
                Download your Vahan certificate securely.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="vlink-feature-card">
              <div className="vlink-feature-top">
                <div className="vlink-feature-icon-box">
                  <Sliders size={24} />
                </div>
                <div className="vlink-feature-arrow-btn">
                  <ArrowRight size={14} />
                </div>
              </div>
              <h3 className="vlink-feature-title">Admin Control Panel</h3>
              <p className="vlink-feature-desc">
                Complete control for RTO and admin users.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================================
          SECTION 07: VEHICLE TRACKING BANNER
          ========================================================================== */}
      <section id="tracking" className="vlink-tracking-section">
        <div className="vlink-container">
          <div className="vlink-tracking-banner">
            {/* Left Content */}
            <div className="vlink-tracking-left">
              <div className="vlink-tracking-pill">
                <MapPin size={12} color="#F97316" />
                <span>Track Your Vehicle</span>
              </div>
              <h2 className="vlink-tracking-title">
                Know where your vehicle is, live
              </h2>
              <p className="vlink-tracking-desc">
                Get real-time location and status of your vehicle.
              </p>
              <a
                href="https://live.vlinktracking.com/login"
                target="_blank"
                rel="noopener noreferrer"
                className="vlink-tracking-btn"
              >
                <span>Track Your Vehicle</span>
                <ArrowRight size={16} />
              </a>
            </div>

            {/* Right: Map Simulation Preview using user's exact uploaded image */}
            <div className="vlink-tracking-map-wrap">
              <img
                src={vehicleTrackingMap}
                alt="Know where your vehicle is, live - TN 09 AB 1234 Tracking Preview"
                className="vlink-tracking-map-img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================================
          SECTION 08: ABOUT V LINK
          ========================================================================== */}
      <section id="about" className="vlink-about-section">
        <div className="vlink-container">
          <div className="vlink-about-grid">
            {/* Left Content */}
            <div className="vlink-about-left">
              <span className="vlink-section-pill" style={{ alignSelf: 'flex-start' }}>About V Link</span>
              <h2 className="vlink-about-title">
                Our Mission is to Build a Smarter and Safer India
              </h2>
              <p className="vlink-about-desc">
                V Link is a trusted B2B SaaS platform for AIS-140 VLTD device management and Vahan certificate services.
              </p>

              {/* 3 Value Points */}
              <div className="vlink-about-values-row">
                <div className="vlink-about-value-card">
                  <div className="vlink-about-value-icon">
                    <ShieldCheck size={20} />
                  </div>
                  <span className="vlink-about-value-title">Trusted &amp; Secure</span>
                </div>

                <div className="vlink-about-value-card">
                  <div className="vlink-about-value-icon">
                    <Zap size={20} />
                  </div>
                  <span className="vlink-about-value-title">Fast Processing</span>
                </div>

                <div className="vlink-about-value-card">
                  <div className="vlink-about-value-icon">
                    <Compass size={20} />
                  </div>
                  <span className="vlink-about-value-title">Built for India</span>
                </div>
              </div>
            </div>

            {/* Right: Office-style Visual & Badges */}
            <div className="vlink-about-right">
              <div className="vlink-office-card">
                <div className="vlink-office-interior">
                  <div className="vlink-office-wall-logo">
                    <VLinkLogo size={32} light={true} />
                  </div>
                  <div style={{ marginTop: '16px', color: '#94A3B8', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Corporate Headquarters • Chennai
                  </div>
                </div>
              </div>

              {/* 3 Badges */}
              <div className="vlink-about-badges-col">
                <div className="vlink-about-badge-item">
                  <div className="vlink-badge-icon-box">
                    <ShieldCheck size={16} />
                  </div>
                  <span className="vlink-badge-title">AIS-140</span>
                </div>

                <div className="vlink-about-badge-item">
                  <div className="vlink-badge-icon-box">
                    <Landmark size={16} />
                  </div>
                  <span className="vlink-badge-title">RTO Approved Workflow</span>
                </div>

                <div className="vlink-about-badge-item">
                  <div className="vlink-badge-icon-box">
                    <Lock size={16} />
                  </div>
                  <span className="vlink-badge-title">Secure Data</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================================
          SECTION 09: CONTACT US
          ========================================================================== */}
      <section id="contact" className="vlink-contact-section">
        <div className="vlink-container">
          <div className="vlink-contact-grid">
            {/* Left Contact Details */}
            <div className="vlink-contact-left">
              <h2 className="vlink-contact-title">Contact Us</h2>
              <p className="vlink-contact-sub">
                We are here to help. Reach out to us anytime.
              </p>

              <div className="vlink-contact-items-list">
                <div className="vlink-contact-row">
                  <div className="vlink-contact-icon-box">
                    <Phone size={18} />
                  </div>
                  <span className="vlink-contact-text">+91 98765 43210</span>
                </div>

                <div className="vlink-contact-row">
                  <div className="vlink-contact-icon-box">
                    <Mail size={18} />
                  </div>
                  <span className="vlink-contact-text">support@vlink.in</span>
                </div>

                <div className="vlink-contact-row">
                  <div className="vlink-contact-icon-box">
                    <MapPin size={18} />
                  </div>
                  <span className="vlink-contact-text">Chennai, Tamil Nadu – 600001</span>
                </div>

                <div className="vlink-contact-row">
                  <div className="vlink-contact-icon-box">
                    <Clock size={18} />
                  </div>
                  <span className="vlink-contact-text">Mon - Sat, 9:00 AM – 6:00 PM</span>
                </div>
              </div>
            </div>

            {/* Right Contact Form Card */}
            <div className="vlink-contact-card">
              {submittedSuccess && (
                <div style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                  <CheckCircle2 size={16} />
                  <span>Thank you! Your message has been sent successfully. Our team will contact you shortly.</span>
                </div>
              )}

              <form onSubmit={handleContactSubmit}>
                <div className="vlink-form-group">
                  <label className="vlink-form-label">
                    Name <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    placeholder="Enter your name"
                    className="vlink-form-input"
                  />
                </div>

                <div className="vlink-form-group">
                  <label className="vlink-form-label">
                    Mobile <span className="req">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={contactForm.mobile}
                    onChange={(e) => setContactForm({ ...contactForm, mobile: e.target.value })}
                    placeholder="Enter mobile number"
                    className="vlink-form-input"
                  />
                </div>

                <div className="vlink-form-group">
                  <label className="vlink-form-label">
                    Message <span className="req">*</span>
                  </label>
                  <textarea
                    required
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="Your message..."
                    className="vlink-form-textarea"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="vlink-form-submit-btn"
                >
                  <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
                  <Send size={15} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================================
          SECTION 10: CTA BANNER
          ========================================================================== */}
      <section className="vlink-cta-section">
        <div className="vlink-container">
          <div className="vlink-cta-banner">
            <div className="vlink-cta-left">
              <div className="vlink-cta-icon-box">
                <Send size={24} />
              </div>
              <div>
                <h3 className="vlink-cta-heading">Start certifying devices today</h3>
                <p className="vlink-cta-sub">Join thousands of dealers and RTOs across India.</p>
              </div>
            </div>

            <button
              onClick={() => navigate('/services')}
              className="vlink-cta-btn"
            >
              <span>Login</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ==========================================================================
          SECTION 11: FOOTER
          ========================================================================== */}
      <footer className="vlink-footer">
        <div className="vlink-container">
          <div className="vlink-footer-top">
            {/* Brand column */}
            <div className="vlink-footer-brand">
              <a href="#home" onClick={() => scrollToSection('home', 'home')} className="vlink-footer-logo">
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
              <a href="#home" onClick={(e) => { e.preventDefault(); scrollToSection('home', 'home'); }} className="vlink-footer-link">Home</a>
              <a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection('about', 'about'); }} className="vlink-footer-link">About</a>
              <a href="/services" onClick={(e) => { e.preventDefault(); navigate('/services'); }} className="vlink-footer-link">Services</a>
              <a href="#contact" onClick={(e) => { e.preventDefault(); scrollToSection('contact', 'contact'); }} className="vlink-footer-link">Contact</a>
              <a href="/services" onClick={(e) => { e.preventDefault(); navigate('/services'); }} className="vlink-footer-link">Login</a>
              <a
                href="https://live.vlinktracking.com/login"
                target="_blank"
                rel="noopener noreferrer"
                className="vlink-footer-link orange"
              >
                Track Your Vehicle
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

      {/* ==========================================================================
          INTERACTIVE VEHICLE TRACKING MODAL
          ========================================================================== */}
      {isTrackingModalOpen && (
        <div className="vlink-modal-overlay" onClick={() => setIsTrackingModalOpen(false)}>
          <div className="vlink-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="vlink-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Car size={20} color="#F97316" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Live AIS-140 Vehicle Tracking
                </h3>
              </div>
              <button
                className="vlink-modal-close-btn"
                onClick={() => setIsTrackingModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="vlink-modal-body">
              <form onSubmit={handleTrackSearch} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search
                    size={16}
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}
                  />
                  <input
                    type="text"
                    value={searchRegNumber}
                    onChange={(e) => setSearchRegNumber(e.target.value)}
                    placeholder="Enter Registration No (e.g. TN 09 AB 1234)"
                    className="vlink-form-input"
                    style={{ paddingLeft: '38px', textTransform: 'uppercase', fontWeight: 600 }}
                  />
                </div>
                <button
                  type="submit"
                  className="vlink-btn vlink-btn-orange"
                  style={{ borderRadius: '8px', padding: '0 20px' }}
                >
                  Track Now
                </button>
              </form>

              {trackingResult && (
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="vlink-live-dot"></span>
                      <strong style={{ fontSize: '18px', color: '#0F172A' }}>{trackingResult.vehicleNo}</strong>
                    </div>
                    <span style={{ fontSize: '12px', color: '#22C55E', backgroundColor: '#DCFCE7', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      {trackingResult.status}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Current Speed</span>
                      <strong style={{ color: '#0F172A', fontSize: '15px' }}>{trackingResult.speed}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>VLD Device IMEI</span>
                      <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>{trackingResult.imei}</strong>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Current Location</span>
                      <strong style={{ color: '#0F172A' }}>{trackingResult.location}</strong>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Compliance Status</span>
                      <span style={{ color: '#2563EB', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <CheckCircle2 size={14} color="#22C55E" />
                        {trackingResult.certStatus}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setIsTrackingModalOpen(false);
                        navigate('/services');
                      }}
                      className="vlink-btn vlink-btn-blue"
                      style={{ fontSize: '13px', padding: '8px 16px' }}
                    >
                      Login for Full Telematics &amp; History
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
