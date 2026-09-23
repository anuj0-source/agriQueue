import { useState, useEffect } from 'react'
import { BadgeIndianRupee, ChartNoAxesCombined, ClipboardCheck, Sprout, ChevronDown } from 'lucide-react'
import Brand, { LeafMark } from '../components/Brand'
import FeatureCard from '../components/FeatureCard'

const FEATURES = [
  { icon: Sprout, title: 'Easy to Sell', text: 'Reach verified buyers and sell your produce with confidence from any device.' },
  { icon: ChartNoAxesCombined, title: 'Live Market Prices', text: 'Track the latest mandi rates and market prices before you make a move.' },
  { icon: BadgeIndianRupee, title: 'Safe Payments', text: 'Every payment is secure, transparent, and deposited directly to your account.' },
  { icon: ClipboardCheck, title: 'Queue Management', text: 'Book your slot in advance, skip the wait, and plan your delivery with ease.' },
]

const HOW_STEPS = [
  { num: '01', title: 'Create Your Account', text: 'Sign up in under 2 minutes. Verify your Aadhaar and add your farm details to get started.' },
  { num: '02', title: 'List Your Produce', text: 'Add your crop, quantity, and preferred mandi. Set your availability and book a queue slot.' },
  { num: '03', title: 'Sell & Get Paid', text: 'Arrive at your scheduled time, sell at a fair price, and receive payment directly in your bank account.' },
]

function MobileMenuButton({ isOpen, onClick }) {
  return (
    <button className="menu-toggle" type="button" aria-label="Toggle navigation" aria-expanded={isOpen} onClick={onClick}>
      <span /><span /><span />
    </button>
  )
}

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="home-page">
      {/* ─── Navbar ─────────────────────────────── */}
      <nav className={`home-navbar${scrolled ? ' scrolled' : ''}`} aria-label="Main navigation">
        <Brand />
        <MobileMenuButton isOpen={menuOpen} onClick={() => setMenuOpen(v => !v)} />
        <div className={`nav-links${menuOpen ? ' open' : ''}`}>
          <a className="active" href="/" onClick={closeMenu}>Home</a>
          <a href="#features" onClick={closeMenu}>Features</a>
          <a href="#how" onClick={closeMenu}>How It Works</a>
          <a href="#about" onClick={closeMenu}>About</a>
          <a className="nav-login" href="/login" onClick={closeMenu}>Login</a>
          <a className="nav-cta" href="/create-account" onClick={closeMenu}>Get Started →</a>
        </div>
      </nav>
      {menuOpen && <div className="nav-backdrop" onClick={closeMenu} aria-hidden="true" />}

      {/* ─── Hero ───────────────────────────────── */}
      <section className="home-hero" id="home">
        <div className="home-hero-inner">
          <div className="home-hero-content">
            <p className="eyebrow"><LeafMark /> India's trusted farm marketplace</p>
            <h1>
              A Smarter Way for <br />
              Farmers to <em>Sell</em> Their Produce
            </h1>
            <p className="hero-copy">
              Book mandi slots, skip the long queues, track your produce in real time, and receive payments directly to your account.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="/create-account">
                Get Started Free <span className="btn-arrow">→</span>
              </a>
              <a className="watch-link" href="#features">
                <span className="watch-link-icon">▶</span>
                See how it works
              </a>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <strong>12,000+</strong>
                <span>Farmers Onboarded</span>
              </div>
              <div className="hero-stat">
                <strong>₹4.2 Cr</strong>
                <span>Paid Out</span>
              </div>
              <div className="hero-stat">
                <strong>380+</strong>
                <span>Mandis Covered</span>
              </div>
            </div>
          </div>
        </div>
        <div className="scroll-hint" aria-hidden="true">
          <ChevronDown size={18} />
          Scroll
        </div>
      </section>

      {/* ─── Features ───────────────────────────── */}
      <section className="features-section" id="features" aria-label="Platform benefits">
        <div className="features-header">
          <p className="section-label">Why AgriQueue</p>
          <h2>Everything You Need to Sell Smarter</h2>
          <p>Built ground-up for Indian farmers — simple, reliable, and available in your language.</p>
        </div>
        <div className="features-grid">
          {FEATURES.map((f) => <FeatureCard key={f.title} {...f} />)}
        </div>
      </section>

      {/* ─── How It Works ───────────────────────── */}
      <section className="how-section" id="how">
        <div className="how-inner">
          <div className="section-header">
            <p className="section-label">How It Works</p>
            <h2>Start Selling in 3 Simple Steps</h2>
          </div>
          <div className="how-steps">
            {HOW_STEPS.map((s) => (
              <div className="how-step" key={s.num}>
                <div className="step-num">{s.num}</div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────── */}
      <section className="cta-section" id="about" aria-label="Call to action">
        <div className="cta-text">
          <h2>Ready to Join 12,000+ Farmers?</h2>
          <p>Sign up for free and start selling your produce smarter today.</p>
        </div>
        <div className="cta-actions">
          <a className="button white" href="/create-account">Create Free Account</a>
          <a className="button outline-white" href="#features">Learn More</a>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────── */}
      <footer className="home-footer">
        <p className="footer-copy">© 2026 AgriQueue · Built with ❤️ for Indian farmers</p>
        <nav className="footer-links" aria-label="Footer links">
          <a href="#features">Features</a>
          <a href="/create-account">Sign Up</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>
      </footer>
    </div>
  )
}
