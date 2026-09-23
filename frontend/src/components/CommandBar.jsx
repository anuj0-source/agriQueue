import { useState, useEffect } from 'react'
import { Mic, ArrowRight, Bot } from 'lucide-react'

export default function CommandBar({ role = 'farmer', onTriggerCommand }) {
  const [query, setQuery] = useState('')
  const [promptIdx, setPromptIdx] = useState(0)

  const farmerPrompts = [
    '“Book a slot for tomorrow at 10 AM.”',
    '“कल 10 बजे का स्लॉट बुक करो।”',
    '“Mera token number kya hai?”',
    '“What is my queue position?”',
    '“मेरा payment status बताओ।”',
    '“Gehun ka sarkari MSP rate kya hai?”',
    '“Cancel my slot.”',
  ]

  const staffPrompts = [
    '“Who is next in the queue?”',
    '“Serve the next farmer.”',
    '“How many farmers are waiting in the queue?”',
    '“Show today’s bookings.”',
    '“किन किसानों की खरीद पूरी हो चुकी है?”',
    '“Show pending payments.”',
  ]

  const samplePrompts = role === 'staff' ? staffPrompts : farmerPrompts

  useEffect(() => {
    const timer = setInterval(() => {
      setPromptIdx((prev) => (prev + 1) % samplePrompts.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [samplePrompts.length])

  const dispatchAgent = (cmd) => {
    if (onTriggerCommand) onTriggerCommand(cmd)
    window.dispatchEvent(
      new CustomEvent('agriqueue:open_agent', {
        detail: {
          query: cmd,
          startVoice: cmd === '__START_VOICE__',
        },
      })
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!query.trim()) {
      const cleaned = samplePrompts[promptIdx].replace(/[“”"']/g, '')
      dispatchAgent(cleaned)
    } else {
      dispatchAgent(query.trim())
      setQuery('')
    }
  }

  const handleMicClick = () => {
    dispatchAgent('__START_VOICE__')
  }

  return (
    <div className="agri-command-bar-banner">
      <div className="command-bar-left">
        <div className="command-bar-bot-badge">
          <Bot size={22} className="command-bar-icon" />
          <span className="command-pulse-ring" />
        </div>
        <div className="command-bar-text-meta">
          <div className="command-bar-title-row">
            <span className="command-bar-title">AI Multilingual Command Assistant</span>
            <span className="command-badge">Voice + Text</span>
          </div>
          <p className="command-bar-subtitle">
            Try saying:{' '}
            <span className="command-rotating-prompt keyframe-fade">
              {samplePrompts[promptIdx]}
            </span>
          </p>
        </div>
      </div>

      <form className="command-bar-form" onSubmit={handleSubmit}>
        <div className="command-bar-input-wrap">
          <input
            type="text"
            className="command-bar-input"
            placeholder={
              role === 'staff'
                ? "Type a command... (e.g., 'Who is next?', 'Serve next farmer')"
                : "Type a command... (e.g., 'Book slot tomorrow', 'Mera token number')"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            className="command-bar-mic-btn"
            onClick={handleMicClick}
            title="Click to speak in Hindi or English"
            aria-label="Voice input"
          >
            <Mic size={18} />
          </button>
        </div>
        <button
          type="submit"
          className="command-bar-submit-btn"
          aria-label="Submit command"
        >
          <span>Run</span>
          <ArrowRight size={16} />
        </button>
      </form>
    </div>
  )
}
