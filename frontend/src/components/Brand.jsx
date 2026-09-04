export function LeafMark() {
  return <span className="leaf-mark" aria-hidden="true"><i /><b /></span>
}

export default function Brand({ href = '/' }) {
  return (
    <a className="brand" href={href} aria-label="AgriQueue home">
      <img className="brand-logo" src="/logo.png" alt="" />
      <span>Agri<span>Queue</span></span>
    </a>
  )
}
