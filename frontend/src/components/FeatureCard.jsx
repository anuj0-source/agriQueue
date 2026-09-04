export default function FeatureCard({ icon: Icon, title, text }) {
  return (
    <article className="feature-card">
      <div className="feature-icon"><Icon aria-hidden="true" /></div>
      <h2>{title}</h2>
      <p>{text}</p>
      <a href="#about">Learn more <span>→</span></a>
    </article>
  )
}
