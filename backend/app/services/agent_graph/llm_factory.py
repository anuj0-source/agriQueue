import os
from typing import Optional, Tuple, Any
from langchain_core.language_models.chat_models import BaseChatModel
from langchain.chat_models import init_chat_model


PROVIDER_DEFAULTS = {
    "google_genai": {
        "model": "gemini-flash-lite-latest",
        "key_env": ["GOOGLE_API_KEY", "GEMINI_API_KEY"],
        "base_url": None,
    },
    "groq": {
        "model": "qwen/qwen3.8-27b",
        "key_env": ["GROQ_API_KEY"],
        "base_url": "https://api.groq.com/openai/v1",
    },
    "openai": {
        "model": "gpt-4o-mini",
        "key_env": ["OPENAI_API_KEY"],
        "base_url": None,
    },
    "anthropic": {
        "model": "claude-3-5-haiku-latest",
        "key_env": ["ANTHROPIC_API_KEY"],
        "base_url": None,
    },
    "deepseek": {
        "model": "deepseek-chat",
        "key_env": ["DEEPSEEK_API_KEY"],
        "base_url": "https://api.deepseek.com",
    },
    "openrouter": {
        "model": "meta-llama/llama-3.3-70b-instruct",
        "key_env": ["OPENROUTER_API_KEY"],
        "base_url": "https://openrouter.ai/api/v1",
    },
    "ollama": {
        "model": "llama3.2",
        "key_env": [],
        "base_url": "http://localhost:11434/v1",
    },
}


def detect_provider() -> str:
    """
    Detect configured provider from LLM_PROVIDER or available API keys in environment.
    """
    explicit = os.getenv("LLM_PROVIDER", "").strip().lower()
    if explicit in ["gemini", "google", "google-genai", "google_genai"]:
        return "google_genai"
    if explicit in ["groq"]:
        return "groq"
    if explicit in ["openai", "chatgpt"]:
        return "openai"
    if explicit in ["anthropic", "claude"]:
        return "anthropic"
    if explicit in ["deepseek"]:
        return "deepseek"
    if explicit in ["openrouter"]:
        return "openrouter"
    if explicit in ["ollama", "local"]:
        return "ollama"
    if explicit in ["openai_compatible", "custom"]:
        return "openai_compatible"
    if explicit:
        return explicit

    # Auto-detection based on present API keys
    if os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"):
        return "google_genai"
    if os.getenv("GROQ_API_KEY"):
        return "groq"
    if os.getenv("OPENAI_API_KEY"):
        return "openai"
    if os.getenv("ANTHROPIC_API_KEY"):
        return "anthropic"
    if os.getenv("DEEPSEEK_API_KEY"):
        return "deepseek"
    if os.getenv("OPENROUTER_API_KEY"):
        return "openrouter"

    return "google_genai"


def resolve_api_key(provider: str) -> Optional[str]:
    """
    Resolve API key from LLM_API_KEY or provider-specific environment variables.
    """
    generic_key = os.getenv("LLM_API_KEY")
    if generic_key and generic_key.strip():
        return generic_key.strip()

    meta = PROVIDER_DEFAULTS.get(provider, {})
    for env_var in meta.get("key_env", []):
        val = os.getenv(env_var)
        if val and val.strip():
            return val.strip()

    if provider == "ollama":
        return "ollama"

    return None


def get_configured_llm() -> Tuple[Optional[BaseChatModel], str]:
    """
    Vendor-free factory to initialize any LLM configured via environment variables.
    Returns:
        (llm_instance, display_model_name)
    """
    provider = detect_provider()
    meta = PROVIDER_DEFAULTS.get(provider, {})

    # Model name resolution
    model_name = (os.getenv("LLM_MODEL") or "").strip()
    if not model_name:
        if provider == "google_genai":
            model_name = os.getenv("GEMINI_MODEL") or meta.get("model", "gemini-flash-lite-latest")
        else:
            model_name = meta.get("model", "gpt-4o-mini")

    # Normalize common aliases and missing prefixes for specific providers
    if provider == "groq" and model_name:
        if model_name.startswith("gpt-oss-") and not model_name.startswith("openai/"):
            model_name = f"openai/{model_name}"
        elif (model_name.startswith("qwen") or model_name.startswith("qwen3")) and "/" not in model_name:
            model_name = f"qwen/{model_name}"

    api_key = resolve_api_key(provider)
    base_url = os.getenv("LLM_BASE_URL") or meta.get("base_url")
    temperature = float(os.getenv("LLM_TEMPERATURE", "0.1"))
    raw_timeout = os.getenv("LLM_TIMEOUT")
    timeout = float(raw_timeout) if raw_timeout else (15.0 if provider == "google_genai" else 10.0)

    # If provider requires an API key and none is found, return None so system safely falls back
    if provider != "ollama" and not api_key:
        return None, "local-nlu"

    # Route through LangChain's vendor-agnostic init_chat_model
    try:
        if provider in ["groq", "deepseek", "openrouter", "ollama", "openai_compatible"]:
            # These all implement the OpenAI chat completions standard
            llm = init_chat_model(
                model=model_name,
                model_provider="openai",
                api_key=api_key or "not-needed",
                base_url=base_url,
                temperature=temperature,
                timeout=timeout,
                max_retries=1,
            )
            display_name = f"{provider}:{model_name}"
            return llm, display_name

        elif provider == "google_genai":
            llm = init_chat_model(
                model=model_name,
                model_provider="google_genai",
                api_key=api_key,
                temperature=temperature,
                timeout=timeout,
                max_retries=1,
            )
            return llm, model_name


        elif provider == "openai":
            kwargs = {
                "model": model_name,
                "model_provider": "openai",
                "api_key": api_key,
                "temperature": temperature,
                "timeout": timeout,
                "max_retries": 1,
            }
            if base_url:
                kwargs["base_url"] = base_url
            llm = init_chat_model(**kwargs)
            return llm, model_name

        elif provider == "anthropic":
            llm = init_chat_model(
                model=model_name,
                model_provider="anthropic",
                api_key=api_key,
                temperature=temperature,
                timeout=timeout,
                max_retries=1,
            )
            return llm, model_name

        else:
            # Generic fallback through init_chat_model
            kwargs = {
                "model": model_name,
                "model_provider": provider,
                "api_key": api_key,
                "temperature": temperature,
                "timeout": timeout,
                "max_retries": 1,
            }
            if base_url:
                kwargs["base_url"] = base_url
            llm = init_chat_model(**kwargs)
            return llm, f"{provider}:{model_name}"

    except Exception as e:
        print(f"[LLM Factory] Error initializing {provider} model '{model_name}': {e}")
        return None, "local-nlu"
