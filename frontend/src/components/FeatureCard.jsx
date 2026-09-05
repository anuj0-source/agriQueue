export default function FeatureCard({ icon: Icon, title, text }) {
  return (
    <article className="feature-card">
      <div className="feature-icon"><Icon aria-hidden="true" /></div>
      <h3>{title}</h3>
      <p>{text}</p>
      <a className="learn-link" href="#features">Learn more →</a>
    </article>
  )
}
