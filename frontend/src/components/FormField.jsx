export default function FormField({ icon: Icon, label, placeholder, type = 'text', required = true, children, ...rest }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="input-wrap">
        {Icon && <Icon aria-hidden="true" />}
        {children || <input type={type} placeholder={placeholder} required={required} {...rest} />}
      </div>
    </label>
  )
}

