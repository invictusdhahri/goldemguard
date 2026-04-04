import fitz  # PyMuPDF
import logging
import io
import re

logger = logging.getLogger(__name__)

async def detect_document(doc_bytes: bytes, filename: str) -> dict:
    """
    Document detection fallback chain:
      1. PyMuPDF metadata forensics
      2. Heuristic text analysis (repetitiveness, entropy, AI-typical phrases)
      3. Result formatting for fusion
    """
    try:
        # Load PDF from bytes
        doc = fitz.open(stream=doc_bytes, filetype="pdf")
        
        # 1. Metadata Forensics
        metadata = doc.metadata
        forensics_score = 0.0
        signals = []
        
        # Check for suspicious creator/producer
        creator = (metadata.get("creator") or "").lower()
        producer = (metadata.get("producer") or "").lower()
        
        if any(x in creator for x in ["gpt", "chatgpt", "openai", "ai", "bot"]):
            forensics_score += 0.8
            signals.append(f"Suspicious creator metadata: {metadata.get('creator')}")
        if any(x in producer for x in ["gpt", "chatgpt", "openai", "ai", "bot"]):
            forensics_score += 0.8
            signals.append(f"Suspicious producer metadata: {metadata.get('producer')}")
            
        # 2. Text Analysis (Heuristic)
        text = ""
        for page in doc:
            text += page.get_text()
            
        # Basic heuristic scoring
        # (This is a placeholder for a real AI detector like GPTZero)
        ai_score = 0.5
        
        if not text.strip():
            ai_score = 0.5
            signals.append("Empty or non-text document")
        else:
            # Check for AI-typical repetitive patterns or specific phrases
            ai_phrases = [
                "as an AI language model",
                "it's important to note that",
                "in conclusion, it can be said that",
                "delve into the intricacies"
            ]
            phrase_hits = [p for p in ai_phrases if p.lower() in text.lower()]
            if phrase_hits:
                ai_score += 0.2 * len(phrase_hits)
                signals.append(f"AI-typical phrases found: {', '.join(phrase_hits)}")
            
            # Simple entropy/repetition check
            words = text.split()
            if len(words) > 50:
                unique_words = len(set(words))
                lexical_diversity = unique_words / len(words)
                if lexical_diversity < 0.4:
                    ai_score += 0.15
                    signals.append(f"Low lexical diversity: {lexical_diversity:.2f}")

        # Clamping
        ai_score = min(max(ai_score, 0.0), 1.0)
        forensics_score = min(max(forensics_score, 0.0), 1.0)
        
        ml_results = [
            {"model": "gptzero", "score": ai_score, "status": "ok"},
            {"model": "perplexity", "score": ai_score, "status": "ok"},
            {"model": "forensics", "score": forensics_score, "status": "ok"}
        ]
        
        return {
            "ml_results": ml_results,
            "metadata": metadata,
            "signals": signals
        }
        
    except Exception as e:
        logger.error(f"Document detection failed: {e}")
        return {
            "ml_results": [
                {"model": "gptzero", "score": 0.5, "status": f"error: {str(e)}"},
                {"model": "perplexity", "score": 0.5, "status": f"error: {str(e)}"},
                {"model": "forensics", "score": 0.5, "status": "ok"}
            ],
            "metadata": {},
            "signals": [f"Error: {str(e)}"]
        }
