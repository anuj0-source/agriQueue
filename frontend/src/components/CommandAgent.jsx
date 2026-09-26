import { useState, useEffect, useRef } from 'react'
import {
  Bot,
  Mic,
  MicOff,
  Send,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  MapPin,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CornerDownLeft,
  Minimize2,
  Maximize2,
  ArrowUpRight
} from 'lucide-react'
import { sendAgentCommand, getAgentSuggestions } from '../api'

export default function CommandAgent({ userRole = 'farmer' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [selectedLang, setSelectedLang] = useState('auto') // 'auto', 'en', 'hi', 'hinglish'
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [activeRole, setActiveRole] = useState(userRole)
  const [lastFailedQuery, setLastFailedQuery] = useState(null)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null)
  const suggestionsScrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScrollState = () => {
    const el = suggestionsScrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2)
  }

  const scrollSuggestions = (direction) => {
    const el = suggestionsScrollRef.current
    if (!el) return
    const offset = direction === 'left' ? -150 : 150
    el.scrollBy({ left: offset, behavior: 'smooth' })
    setTimeout(checkScrollState, 300)
  }

  // Convert vertical mouse wheel into horizontal scroll on suggestion chips
  useEffect(() => {
    const el = suggestionsScrollRef.current
    if (!el) return

    // Initial check after render
    setTimeout(checkScrollState, 150)

    const handleWheel = (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault()
        el.scrollLeft += e.deltaY * 0.9
        checkScrollState()
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('resize', checkScrollState)

    return () => {
      el.removeEventListener('wheel', handleWheel)
      window.removeEventListener('resize', checkScrollState)
    }
  }, [suggestions, isOpen])

  // Determine current user role from localStorage if available
  useEffect(() => {
    try {
      const stored = localStorage.getItem('currentUser')
      if (stored) {
        const u = JSON.parse(stored)
        if (u.role) setActiveRole(u.role.toLowerCase())
      }
    } catch {}
  }, [])

  // Load suggestions for the active role
  useEffect(() => {
    getAgentSuggestions().then((res) => {
      if (res?.suggestions) setSuggestions(res.suggestions)
    })
  }, [activeRole])

  // Welcome greeting on initial mount
  useEffect(() => {
    const isStaff = activeRole === 'staff' || activeRole === 'admin'
    const welcomeMsg = isStaff
      ? "Namaste! I am your AgriQueue Staff Copilot. You can ask me to call the next farmer, check the waiting queue count, or review today's bookings."
      : "Namaste! I am your AgriQueue Copilot. You can ask me to book a slot (e.g. 'Book tomorrow at 10 AM'), check your token status, or track your queue position."

    setMessages([
      {
        id: 'welcome-1',
        sender: 'agent',
        text: welcomeMsg,
        model: null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        card: null,
      },
    ])
  }, [activeRole])

  // Scroll to bottom whenever messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, interimTranscript])

  // Global Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // External trigger listener (from CommandBar or other components)
  useEffect(() => {
    const handleOpenEvent = (e) => {
      setIsOpen(true)
      const { query, startVoice } = e.detail || {}
      if (startVoice || query === '__START_VOICE__') {
        setTimeout(() => toggleMic(), 350)
      } else if (query && query !== '__START_VOICE__') {
        setTimeout(() => handleSend(query), 200)
      }
    }
    window.addEventListener('agriqueue:open_agent', handleOpenEvent)
    return () => window.removeEventListener('agriqueue:open_agent', handleOpenEvent)
  }, [])

  // Setup Web Speech API recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true

      // Configure recognition language based on selection
      if (selectedLang === 'hi') {
        recognition.lang = 'hi-IN'
      } else {
        recognition.lang = 'en-IN' // Supports Indian English & Hinglish well
      }

      recognition.onstart = () => {
        setIsListening(true)
        setInterimTranscript('')
      }

      recognition.onresult = (event) => {
        let interim = ''
        let final = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript
          } else {
            interim += event.results[i][0].transcript
          }
        }
        setInterimTranscript(interim)
        if (final) {
          setInputText(final)
          handleSend(final, true)
        }
      }

      recognition.onerror = (event) => {
        console.warn('[CommandAgent] Speech recognition error:', event.error)
        setIsListening(false)
        setInterimTranscript('')
      }

      recognition.onend = () => {
        setIsListening(false)
        setInterimTranscript('')
      }

      recognitionRef.current = recognition
    }
  }, [selectedLang])

  // Text to Speech playback
  // Cache voices after first load
  const voicesRef = useRef([])

  const getVoices = () => {
    if (voicesRef.current.length > 0) return voicesRef.current
    const v = synthRef.current?.getVoices() || []
    voicesRef.current = v
    return v
  }

  // Preferred human-sounding English voice names (in priority order)
  const PREFERRED_EN_VOICES = [
    'Google UK English Female',
    'Google UK English Male',
    'Microsoft Aria Online (Natural) - English (United States)',
    'Microsoft Jenny Online (Natural) - English (United States)',
    'Microsoft Guy Online (Natural) - English (United States)',
    'Microsoft Aria - English (United States)',
    'Microsoft Jenny - English (United States)',
    'Samantha',         // macOS/iOS natural female
    'Karen',            // macOS Australian English
    'Daniel',           // macOS UK English Male
    'Google US English',
    'Microsoft Zira - English (United States)',
    'Microsoft David - English (United States)',
  ]

  const PREFERRED_HI_VOICES = [
    'Google हिन्दी',
    'Microsoft Swara Online (Natural) - Hindi (India)',
    'Microsoft Swara - Hindi (India)',
    'Lekha',
  ]

  const pickVoice = (lang) => {
    const voices = getVoices()
    if (!voices.length) return null

    const preferred = lang === 'hi' ? PREFERRED_HI_VOICES : PREFERRED_EN_VOICES
    for (const name of preferred) {
      const match = voices.find((v) => v.name === name)
      if (match) return match
    }
    // Fallback: any voice matching the locale
    const locale = lang === 'hi' ? 'hi' : 'en'
    return voices.find((v) => v.lang.startsWith(locale)) || null
  }

  // Strip markdown and special symbols so they aren't read aloud
  const cleanForSpeech = (text) =>
    text
      .replace(/\*\*/g, '')
      .replace(/[*_`~>#]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // [link](url) → link text
      .replace(/```[\s\S]*?```/g, '')              // code blocks
      .replace(/\n{2,}/g, '. ')                    // paragraph breaks → pause
      .replace(/\n/g, ', ')
      .trim()

  const speakText = (text, lang = 'en') => {
    if (!ttsEnabled || !synthRef.current || !text) return
    try {
      synthRef.current.cancel()

      // Wait for voices to be loaded (Chrome loads them async on first call)
      const doSpeak = () => {
        const cleaned = cleanForSpeech(text)
        const utterance = new SpeechSynthesisUtterance(cleaned)

        utterance.lang  = lang === 'hi' ? 'hi-IN' : 'en-IN'
        utterance.rate  = lang === 'hi' ? 0.9 : 0.92   // slightly slower = more natural
        utterance.pitch = lang === 'hi' ? 1.0 : 1.05   // slight lift = warmer, less flat
        utterance.volume = 1.0

        const chosenVoice = pickVoice(lang)
        if (chosenVoice) utterance.voice = chosenVoice

        synthRef.current.speak(utterance)
      }

      // Voices may not be ready yet on first mount — wait for them
      if (synthRef.current.getVoices().length > 0) {
        voicesRef.current = synthRef.current.getVoices()
        doSpeak()
      } else {
        synthRef.current.addEventListener('voiceschanged', () => {
          voicesRef.current = synthRef.current.getVoices()
          doSpeak()
        }, { once: true })
      }
    } catch (err) {
      console.warn('TTS playback error:', err)
    }
  }


  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.')
      return
    }
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      try {
        if (synthRef.current) synthRef.current.cancel()
        recognitionRef.current.start()
      } catch (err) {
        console.error('Failed to start speech recognition:', err)
      }
    }
  }

  const handleSend = async (textToSend = null, fromVoice = false) => {
    const query = (textToSend !== null ? textToSend : inputText).trim()
    if (!query || isLoading) return

    setInputText('')
    setInterimTranscript('')
    setLastFailedQuery(null)
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }

    const userMsgId = `usr-${Date.now()}`
    const newMsg = {
      id: userMsgId,
      sender: 'user',
      text: query,
      fromVoice,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, newMsg])
    setIsLoading(true)

    // Build compact conversation history from last 6 message pairs
    const buildHistory = (msgs) => {
      const out = []
      for (const m of msgs.slice(-12)) {
        if (m.sender === 'user') out.push({ role: 'user', text: m.text })
        else if (m.sender === 'agent' && m.text) out.push({ role: 'agent', text: m.text })
      }
      return out
    }

    try {
      const payload = {
        command: query,
        language: selectedLang === 'auto' ? null : selectedLang,
        conversation_history: buildHistory(messages),
      }
      const res = await sendAgentCommand(payload)

      const agentMsg = {
        id: `agt-${Date.now()}`,
        sender: 'agent',
        text: res.message || res.speech_text,
        card: res.card,
        status: res.status,
        action_id: res.action_id,
        model: res.model || 'AI Agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, agentMsg])

      // Speak back response
      if (res.speech_text) {
        speakText(res.speech_text, res.language)
      }
    } catch (err) {
      setLastFailedQuery(query)
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: 'agent',
        text: 'Sorry, I encountered an issue processing that command. Please try again.',
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        card: null,
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  // Handle Card Confirm / Cancel Actions
  const handleCardAction = async (actionId, confirm) => {
    if (!actionId || isLoading) return
    setIsLoading(true)

    // Append user's action as a message in stream
    const userMsg = {
      id: `usr-act-${Date.now()}`,
      sender: 'user',
      text: confirm ? 'Confirmed action' : 'Cancelled action',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages((prev) => [...prev, userMsg])

    try {
      const payload = {
        command: confirm ? 'Confirm' : 'Cancel',
        action_id: actionId,
        action_confirm: confirm,
        language: selectedLang === 'auto' ? null : selectedLang,
      }
      const res = await sendAgentCommand(payload)

      const agentMsg = {
        id: `agt-res-${Date.now()}`,
        sender: 'agent',
        text: res.message || res.speech_text,
        card: res.card,
        status: res.status,
        model: res.model || 'AI Agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, agentMsg])

      if (res.speech_text) {
        speakText(res.speech_text, res.language)
      }
    } catch (err) {
      console.error('Card action execution failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* ── Omnipresent Floating AI Trigger Button ── */}
      {!isOpen && (
        <div className="agri-agent-dock">
          <button
            type="button"
            className="agri-agent-fab"
            onClick={() => setIsOpen(true)}
            aria-label="Open AgriQueue Copilot"
          >
            <div className="fab-glow-ring" />
            <div className="fab-icon-wrap">
              <Bot size={22} className="fab-bot-icon" />
              <span className="fab-status-dot" />
            </div>
            <span className="fab-label">AgriQueue Copilot</span>
            <span className="fab-kbd-badge">Ctrl+K</span>
          </button>
        </div>
      )}

      {/* ── Expandable AI Command Agent Panel ── */}
      {isOpen && (
        <div className="agri-agent-backdrop" onClick={() => setIsOpen(false)}>
          <div
            className="agri-agent-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="AgriQueue AI Assistant"
          >
            {/* Header */}
            <div className="agent-modal-header">
              <div className="agent-header-left">
                <div className="agent-avatar-badge">
                  <Bot size={20} className="agent-avatar-icon" />
                  <span className="agent-online-dot" />
                </div>
                <div className="agent-header-titles">
                  <div className="agent-title-row">
                    <h2 className="agent-title">AgriQueue Copilot</h2>
                    <span className="agent-role-pill">
                      {activeRole === 'staff' ? 'Staff' : activeRole === 'admin' ? 'Admin' : 'Farmer'}
                    </span>
                  </div>
                  <div className="agent-meta-row-header">
                    <span className="copilot-live-dot" />
                    <span className="copilot-status-text">Online</span>
                    <span className="copilot-meta-bullet">•</span>
                    <span className="copilot-lang-text">Voice & Text (EN, हिंदी, Hinglish)</span>
                  </div>
                </div>
              </div>

              <div className="agent-header-actions">
                {/* Language Switcher */}
                <div className="agent-lang-pill-wrap">
                  <select
                    className="agent-lang-select"
                    value={selectedLang}
                    onChange={(e) => setSelectedLang(e.target.value)}
                    aria-label="Select Voice and NLP Language"
                  >
                    <option value="auto">🌐 Auto</option>
                    <option value="en">English</option>
                    <option value="hi">हिंदी</option>
                    <option value="hinglish">Hinglish</option>
                  </select>
                </div>

                {/* TTS Audio Toggle */}
                <button
                  type="button"
                  className={`agent-header-btn ${ttsEnabled ? 'active' : ''}`}
                  onClick={() => {
                    setTtsEnabled(!ttsEnabled)
                    if (synthRef.current) synthRef.current.cancel()
                  }}
                  title={ttsEnabled ? 'Voice response enabled (Click to mute)' : 'Voice response muted (Click to enable)'}
                  aria-label="Toggle speech audio response"
                >
                  {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  className="agent-header-btn close-btn"
                  onClick={() => {
                    setIsOpen(false)
                    if (synthRef.current) synthRef.current.cancel()
                    if (isListening && recognitionRef.current) recognitionRef.current.stop()
                  }}
                  aria-label="Close Assistant"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Chat Stream View */}
            <div className="agent-chat-stream">
              {messages.map((m) => (
                <div key={m.id} className={`agent-msg-row ${m.sender}`}>
                  {m.sender === 'agent' && (
                    <div className="msg-bot-avatar">
                      <Bot size={16} />
                    </div>
                  )}

                  <div className="msg-bubble-wrap">
                    <div className={`msg-bubble ${m.sender}${m.isError ? ' error-bubble' : ''}`}>
                      <p className="msg-text">{m.text}</p>
                      {m.isError && lastFailedQuery && (
                        <button
                          type="button"
                          className="msg-retry-btn"
                          onClick={() => {
                            setLastFailedQuery(null)
                            handleSend(lastFailedQuery)
                          }}
                          disabled={isLoading}
                        >
                          <RefreshCw size={12} /> Retry
                        </button>
                      )}
                      <div className="msg-meta-row">
                        {m.fromVoice && (
                          <span className="msg-voice-tag" title="Spoken input">
                            <Mic size={11} /> voice
                          </span>
                        )}
                        {m.sender === 'agent' && m.model && (
                          <span className="msg-model-tag" title={`Model: ${m.model}`}>
                            <Sparkles size={10} /> {
                              m.model === 'local-nlu'
                                ? 'Local NLU'
                                : m.model?.includes('gemini')
                                ? 'Gemini'
                                : m.model?.startsWith('groq:')
                                ? `Groq (${m.model.replace('groq:', '').split('/')[0]})`
                                : m.model?.includes('gpt')
                                ? 'OpenAI GPT'
                                : m.model?.includes('claude')
                                ? 'Claude'
                                : m.model?.includes('llama')
                                ? 'Llama'
                                : (m.model || 'Copilot')
                            }
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Interactive Cards */}
                    {m.card && (
                      <div className="agent-card-container">
                        {/* 1. Booking Confirmation Card */}
                        {m.card.card_type === 'booking_confirmation' && (
                          <div className="agent-interactive-card booking-confirm-card">
                            <div className="card-header-badge primary">
                              <Calendar size={15} />
                              <span>{m.card.title}</span>
                            </div>
                            <div className="card-details-grid">
                              <div className="card-kv">
                                <span className="kv-label">Center</span>
                                <strong className="kv-val">{m.card.center_name}</strong>
                              </div>
                              <div className="card-kv">
                                <span className="kv-label">Date</span>
                                <strong className="kv-val">{m.card.date}</strong>
                              </div>
                              <div className="card-kv">
                                <span className="kv-label">Slot</span>
                                <strong className="kv-val">{m.card.slot_time}</strong>
                              </div>
                              <div className="card-kv">
                                <span className="kv-label">Produce & Qty</span>
                                <strong className="kv-val">{m.card.produce} ({m.card.quantity})</strong>
                              </div>
                              <div className="card-kv full">
                                <span className="kv-label">Est. Value</span>
                                <strong className="kv-val highlight">{m.card.estimated_value}</strong>
                              </div>
                            </div>
                            <div className="card-actions-row">
                              {m.card.actions?.map((btn, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  className={`card-action-btn ${btn.style}`}
                                  onClick={() => handleCardAction(m.card.action_id, btn.confirm)}
                                  disabled={isLoading}
                                >
                                  {btn.confirm ? <CheckCircle2 size={16} /> : <X size={16} />}
                                  <span>{btn.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 2. Cancellation Confirmation Card */}
                        {m.card.card_type === 'cancel_confirmation' && (
                          <div className="agent-interactive-card cancel-confirm-card">
                            <div className="card-header-badge danger">
                              <AlertCircle size={15} />
                              <span>{m.card.title}</span>
                            </div>
                            <div className="card-details-grid">
                              <div className="card-kv">
                                <span className="kv-label">Token</span>
                                <strong className="kv-val highlight-red">{m.card.token}</strong>
                              </div>
                              <div className="card-kv">
                                <span className="kv-label">Center</span>
                                <strong className="kv-val">{m.card.center_name}</strong>
                              </div>
                              <div className="card-kv">
                                <span className="kv-label">Date</span>
                                <strong className="kv-val">{m.card.date}</strong>
                              </div>
                              <div className="card-kv">
                                <span className="kv-label">Booking</span>
                                <strong className="kv-val">{m.card.produce}</strong>
                              </div>
                            </div>
                            <div className="card-actions-row">
                              {m.card.actions?.map((btn, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  className={`card-action-btn ${btn.style}`}
                                  onClick={() => handleCardAction(m.card.action_id, btn.confirm)}
                                  disabled={isLoading}
                                >
                                  {btn.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 3. Token & Status Badge Card */}
                        {m.card.card_type === 'token_status' && (
                          <div className="agent-interactive-card token-card">
                            <div className="token-display-hero">
                              <span className="token-hero-label">TOKEN NUMBER</span>
                              <h3 className="token-hero-number">{m.card.token}</h3>
                              <span className="token-hero-center">{m.card.center_name}</span>
                            </div>
                            <div className="token-details-row">
                              {m.card.estimated_wait && (
                                <div className="token-meta">
                                  <Clock size={14} />
                                  <span>Est. Wait: <strong>{m.card.estimated_wait}</strong></span>
                                </div>
                              )}
                              {m.card.now_serving && (
                                <div className="token-meta">
                                  <Users size={14} />
                                  <span>Now Serving: <strong>{m.card.now_serving}</strong></span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 4. Live Queue Gauge Card */}
                        {m.card.card_type === 'queue_gauge' && (
                          <div className="agent-interactive-card queue-card">
                            <div className="queue-metric-banner">
                              <div className="queue-stat">
                                <span className="stat-label">Farmers Ahead</span>
                                <span className="stat-number">{m.card.farmers_ahead}</span>
                              </div>
                              <div className="queue-stat">
                                <span className="stat-label">Est. Wait</span>
                                <span className="stat-number green">{m.card.estimated_wait}</span>
                              </div>
                              <div className="queue-stat">
                                <span className="stat-label">Now Serving</span>
                                <span className="stat-number">{m.card.now_serving}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 5. Payment Status Card */}
                        {m.card.card_type === 'payment_status' && (
                          <div className="agent-interactive-card payment-card">
                            <div className="payment-hero-row">
                              <div>
                                <span className="payment-label">Amount Payable</span>
                                <h3 className="payment-amount">{m.card.amount}</h3>
                              </div>
                              <span className={`payment-badge ${m.card.status?.toLowerCase()}`}>
                                {m.card.status}
                              </span>
                            </div>
                            <div className="payment-meta-row">
                              <span>Receipt: <strong>{m.card.receipt_number}</strong></span>
                              <span>Expected: <strong>{m.card.expected_date}</strong></span>
                            </div>
                          </div>
                        )}

                        {/* 6. Staff Call-Next Card */}
                        {m.card.card_type === 'staff_call_next' && (
                          <div className="agent-interactive-card staff-call-card">
                            <div className="card-header-badge staff">
                              <Users size={15} />
                              <span>{m.card.title}</span>
                            </div>
                            <div className="staff-call-info">
                              <div className="call-token-badge">{m.card.token}</div>
                              <div className="call-farmer-details">
                                <strong>{m.card.farmer_name}</strong>
                                <span>{m.card.produce}</span>
                              </div>
                            </div>
                            <div className="card-actions-row">
                              {m.card.actions?.map((btn, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  className={`card-action-btn ${btn.style}`}
                                  onClick={() => handleCardAction(m.card.action_id, btn.confirm)}
                                  disabled={isLoading}
                                >
                                  {btn.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 7. Staff Queue Summary Card */}
                        {m.card.card_type === 'staff_queue_summary' && (
                          <div className="agent-interactive-card staff-summary-card">
                            <div className="summary-grid-3">
                              <div className="sum-box">
                                <span className="sum-label">Waiting</span>
                                <strong className="sum-val yellow">{m.card.waiting_count}</strong>
                              </div>
                              <div className="sum-box">
                                <span className="sum-label">Serving</span>
                                <strong className="sum-val green">{m.card.serving_count}</strong>
                              </div>
                              <div className="sum-box">
                                <span className="sum-label">Total Today</span>
                                <strong className="sum-val">{m.card.total_today}</strong>
                              </div>
                            </div>
                            <div className="sum-next-row">
                              <span>Next in line: <strong>{m.card.next_token}</strong></span>
                              <span className="sum-center">{m.card.center_name}</span>
                            </div>
                          </div>
                        )}

                        {/* 8. Procurement Centers & Slot Availability Card */}
                        {m.card.card_type === 'center_info' && (
                          <div className="agent-interactive-card center-info-card">
                            <div className="card-header-badge center">
                              <MapPin size={15} />
                              <span>{m.card.title || 'Centers & Slot Availability'}</span>
                            </div>

                            <div className={`center-availability-status ${m.card.is_today_closed ? 'closed' : 'open'}`}>
                              {m.card.is_today_closed ? (
                                <>
                                  <Clock size={14} />
                                  <span>Today's Slots Ended • Reopening Tomorrow 08:00 AM</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={14} />
                                  <span>Slots Available Today</span>
                                </>
                              )}
                            </div>

                            <div className="center-cards-stack">
                              {m.card.centers?.map((c) => (
                                <div key={c.id} className="center-mini-item">
                                  <div className="center-mini-top">
                                    <strong className="center-mini-name">{c.name}</strong>
                                    <span className={`center-mini-pill ${c.available_today > 0 ? 'available' : 'closed'}`}>
                                      {c.available_today > 0 ? `${c.available_today} open` : 'Closed Today'}
                                    </span>
                                  </div>
                                  <div className="center-mini-meta">
                                    <span><MapPin size={12} /> {c.address ? `${c.address} (${c.village}, ${c.district || ''})` : c.village}</span>
                                    <span><Clock size={12} /> {c.timing}</span>
                                  </div>
                                  {c.unexpired_slots_today && c.unexpired_slots_today.length > 0 ? (
                                    <div className="center-slots-chips">
                                      {c.unexpired_slots_today.map((s, sIdx) => (
                                        <span key={sIdx} className="slot-mini-chip">{s}</span>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="center-next-info">
                                      <span>Next opening: <strong>{c.next_opening || 'Tomorrow 08:00 AM'}</strong></span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            {m.card.quick_action && (
                              <div className="card-actions-row">
                                <button
                                  type="button"
                                  className="card-action-btn primary"
                                  onClick={() => handleSend(m.card.quick_action.command)}
                                  disabled={isLoading}
                                >
                                  <Calendar size={15} />
                                  <span>{m.card.quick_action.label}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <span className="msg-timestamp">{m.timestamp}</span>
                  </div>
                </div>
              ))}

              {/* Live Listening Transcript Bubble */}
              {isListening && interimTranscript && (
                <div className="agent-msg-row user interim">
                  <div className="msg-bubble user listening">
                    <span className="listening-pulse-dot" />
                    <em>{interimTranscript}</em>
                  </div>
                </div>
              )}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="agent-msg-row agent">
                  <div className="msg-bot-avatar">
                    <Bot size={16} />
                  </div>
                  <div className="msg-bubble agent loading">
                    <div className="typing-dots">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            {suggestions.length > 0 && (
              <div className="agent-suggestions-bar">
                {canScrollLeft && (
                  <button
                    type="button"
                    className="suggestions-arrow-btn left"
                    onClick={() => scrollSuggestions('left')}
                    aria-label="Scroll suggestions left"
                  >
                    <ChevronLeft size={13} />
                  </button>
                )}

                <div
                  ref={suggestionsScrollRef}
                  className="suggestions-scroll"
                  onScroll={checkScrollState}
                >
                  {suggestions.slice(0, 8).map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="suggestion-chip"
                      onClick={() => handleSend(item.text)}
                      disabled={isLoading}
                    >
                      <span className="chip-label">{item.label}</span>
                      <ArrowUpRight size={13} className="chip-icon" />
                    </button>
                  ))}
                </div>

                {canScrollRight && (
                  <button
                    type="button"
                    className="suggestions-arrow-btn right"
                    onClick={() => scrollSuggestions('right')}
                    aria-label="Scroll suggestions right"
                  >
                    <ChevronRight size={13} />
                  </button>
                )}
              </div>
            )}

            {/* Input Bar & Controls */}
            <div className="agent-input-container">
              {/* Audio listening waveform state */}
              {isListening && (
                <div className="listening-waveform-bar">
                  <div className="wave-bars-wrap">
                    <span className="wave-bar bar-1" />
                    <span className="wave-bar bar-2" />
                    <span className="wave-bar bar-3" />
                    <span className="wave-bar bar-4" />
                    <span className="wave-bar bar-5" />
                    <span className="wave-bar bar-6" />
                  </div>
                  <span className="listening-text">Listening... Speak in Hindi, English, or Hinglish</span>
                  <button
                    type="button"
                    className="wave-stop-btn"
                    onClick={toggleMic}
                  >
                    Done
                  </button>
                </div>
              )}

              <form
                className="agent-input-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSend()
                }}
              >
                <div className="agent-input-capsule">
                  <button
                    type="button"
                    className={`agent-capsule-mic-btn ${isListening ? 'listening' : ''}`}
                    onClick={toggleMic}
                    title={isListening ? 'Stop listening' : 'Speak command in Hindi or English'}
                    aria-label="Voice input"
                  >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                    {isListening && <span className="mic-glow-pulse" />}
                  </button>

                  <input
                    ref={inputRef}
                    type="text"
                    className="agent-capsule-text-input"
                    placeholder={
                      isListening
                        ? 'Listening to your voice...'
                        : activeRole === 'staff'
                        ? "Ask: 'Who is next?', 'Serve next farmer', 'Today\'s bookings'..."
                        : "Ask: 'Book slot tomorrow', 'Mera token number kya hai?'..."
                    }
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={isLoading}
                  />

                  <button
                    type="submit"
                    className={`agent-capsule-send-btn ${inputText.trim() ? 'has-content' : ''}`}
                    disabled={!inputText.trim() || isLoading}
                    aria-label="Send command"
                  >
                    <Send size={15} />
                  </button>
                </div>

                <div className="agent-input-footer-hints">
                  <span>Press <kbd className="hint-kbd">↵ Enter</kbd> to send</span>
                  <span className="hint-dot">•</span>
                  <span>Multilingual voice enabled</span>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
