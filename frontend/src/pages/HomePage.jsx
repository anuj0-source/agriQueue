import { useState } from 'react'
import { BadgeIndianRupee, ChartNoAxesCombined, ClipboardCheck, Sprout } from 'lucide-react'
import Brand, { LeafMark } from '../components/Brand'
import FeatureCard from '../components/FeatureCard'

const FEATURES = [
  { icon: Sprout, title: 'Easy to Sell', text: 'Reach verified buyers and sell your produce with confidence.' },
  { icon: ChartNoAxesCombined, title: 'Live Market Updates', text: 'Track the latest market prices before you make a move.' },
  { icon: BadgeIndianRupee, title: 'Safe & Transparent Payment', text: 'Every payment is secure, simple, and easy to follow.' },
  { icon: ClipboardCheck, title: 'Hassle-Free Management', text: 'Manage listings and orders from one convenient place.' },
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
  const closeMenu = () => setMenuOpen(false)

  return (
    <main className="home-page">
      <section className="home-hero" id="home">
        <nav className="home-navbar" aria-label="Main navigation">
          <Brand />
          <MobileMenuButton isOpen={menuOpen} onClick={() => setMenuOpen((isOpen) => !isOpen)} />
          <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
            <a className="active" href="/" onClick={closeMenu}>Home</a>
            <a href="#features" onClick={closeMenu}>Features</a>
            <a href="#about" onClick={closeMenu}>About</a>
            <a href="#contact" onClick={closeMenu}>Contact</a>
            <a href="/create-account" onClick={closeMenu}>Login</a>
            <a className="register" href="/create-account" onClick={closeMenu}>Register</a>
          </div>
        </nav>

        <div className="home-hero-content">
          <p className="eyebrow"><LeafMark /> India's trusted farm marketplace</p>
          <h1>A Smarter Way for<br />Farmers to Sell Their Produce</h1>
          <p className="hero-copy">Book slots, avoid long queues, track your produce, and get timely payments.</p>
          <div className="hero-actions">
            <a className="button primary" href="/create-account">Get Started <span>→</span></a>
            <a className="watch-link" href="#features"><i>▶</i> Watch Video</a>
          </div>
        </div>
        <div className="hero-bottom" aria-hidden="true"><span>01</span><div /><span>02</span><span>03</span></div>
      </section>

      <section className="features" id="features" aria-label="Platform benefits">
        {FEATURES.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
      </section>
      <section className="about-strip" id="about"><p>Built to make agriculture more connected, reliable, and rewarding.</p></section>
    </main>
  )
}
