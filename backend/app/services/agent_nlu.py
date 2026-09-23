import re
import os
import json
from datetime import datetime, date, timedelta
from typing import Dict, Any, Optional, Tuple

class AgentNLU:
    """
    Multilingual Natural Language Understanding Engine for AgriQueue.
    Supports Hindi (Devanagari), English, and Hinglish (Romanized Hindi).
    """

    SLOT_TIME_MAP = {
        1: "09:00 AM - 10:00 AM",
        2: "10:00 AM - 11:00 AM",
        3: "11:00 AM - 12:00 PM",
        4: "12:00 PM - 01:00 PM",
        5: "01:00 PM - 02:00 PM",
    }

    PRODUCE_SYNONYMS = {
        "wheat": ["wheat", "gehun", "gehu", "गेहूं", "गेहुं", "kanak"],
        "paddy": ["paddy", "rice", "dhaan", "dhan", "chawal", "धान", "चावल"],
        "maize": ["maize", "corn", "makka", "makki", "मक्का", "मक्की"],
        "mustard": ["mustard", "sarson", "rai", "सरसों", "राई"],
        "soyabean": ["soyabean", "soybean", "soya", "सोयाबीन"],
        "cotton": ["cotton", "kapas", "रूई", "कपास"],
    }

    @classmethod
    def detect_language(cls, text: str) -> str:
        """
        Detects whether input is Hindi (Devanagari), Hinglish, or English.
        """
        if not text:
            return "en"

        # Check for Devanagari Unicode block (\u0900-\u097F)
        devanagari_chars = re.findall(r'[\u0900-\u097F]', text)
        if len(devanagari_chars) >= 2 or (len(devanagari_chars) > 0 and len(text.strip()) < 10):
            return "hi"

        # Check for characteristic Hinglish vocabulary
        lower = text.lower()
        hinglish_markers = [
            r"\bmera\b", r"\bmeri\b", r"\bmere\b", r"\bkya\b", r"\bhai\b", r"\bhain\b",
            r"\bbatao\b", r"\bbataye\b", r"\bkaro\b", r"\bkare\b", r"\bkarein\b",
            r"\bbulao\b", r"\bagla\b", r"\bagle\b", r"\bkitne\b", r"\bkitna\b",
            r"\bkaun\b", r"\bkaunsa\b", r"\bkal\b", r"\baaj\b", r"\bline\b",
            r"\bkatar\b", r"\bkhareed\b", r"\bpaise\b", r"\brupaye\b", r"\bpaisa\b",
            r"\bhoga\b", r"\bhogi\b", r"\bkarna\b", r"\bkijiye\b", r"\btheek\b",
            r"\bhaan\b", r"\bnahi\b", r"\bnahin\b", r"\bmat\b", r"\bchahiye\b",
            r"\baayega\b", r"\bchuki\b", r"\bhuye\b", r"\bkisano\b", r"\bkisan\b",
            r"\bmujhe\b", r"\bbechna\b", r"\bbechne\b", r"\bbechni\b", r"\bchawal\b", r"\bdhan\b"
        ]
        matches = sum(1 for pattern in hinglish_markers if re.search(pattern, lower))
        if matches >= 1:
            return "hinglish"

        return "en"

    @classmethod
    def normalize_text(cls, text: str) -> str:
        """Basic text cleaning for intent classification."""
        clean = text.lower().strip()
        # remove punctuation except for numbers and letters
        clean = re.sub(r'[^\w\s\u0900-\u097F]', ' ', clean)
        clean = re.sub(r'\s+', ' ', clean).strip()
        return clean

    @classmethod
    def parse_command(cls, query: str, user_role: Optional[str] = None) -> Dict[str, Any]:
        """
        Parses user query into intent, entities, detected language, and metadata.
        """
        raw_query = query.strip()
        lang = cls.detect_language(raw_query)
        norm = cls.normalize_text(raw_query)

        # 1. First check for confirmation or rejection intents (critical for 2-phase safety)
        conf_intent = cls._check_confirmation_intent(norm, lang)
        if conf_intent:
            return {
                "raw_query": raw_query,
                "language": lang,
                "intent": conf_intent,
                "entities": {},
                "is_confirmation": conf_intent == "confirm_action",
                "is_rejection": conf_intent == "reject_action",
            }

        # 2. Check Staff intents (if role is staff or if staff phrasing used)
        staff_intent, staff_entities = cls._check_staff_intents(norm, lang)
        if staff_intent:
            return {
                "raw_query": raw_query,
                "language": lang,
                "intent": staff_intent,
                "entities": staff_entities,
                "target_role": "staff",
            }

        # 3. Check Farmer intents
        farmer_intent, farmer_entities = cls._check_farmer_intents(norm, raw_query, lang)
        if farmer_intent:
            return {
                "raw_query": raw_query,
                "language": lang,
                "intent": farmer_intent,
                "entities": farmer_entities,
                "target_role": "farmer",
            }

        # 4. General / Greeting / Help
        if any(w in norm for w in ["hello", "hi", "hey", "namaste", "pranam", "नमस्ते", "प्रणाम"]):
            return {
                "raw_query": raw_query,
                "language": lang,
                "intent": "greeting",
                "entities": {},
            }
        
        if any(w in norm for w in ["help", "madad", "मदद", "features", "capabilities", "kya kar sakte"]):
            return {
                "raw_query": raw_query,
                "language": lang,
                "intent": "help",
                "entities": {},
            }

        return {
            "raw_query": raw_query,
            "language": lang,
            "intent": "unknown",
            "entities": {},
        }

    @classmethod
    def _check_confirmation_intent(cls, norm: str, lang: str) -> Optional[str]:
        # Positive confirmation
        positive_patterns = [
            r"^(yes|confirm|yes please|go ahead|proceed|do it|confirm it|book it|book kar do|haan|ha|theek hai|karo|haan karo|haan book karo|haan ji)$",
            r"^(हाँ|हाँ बुक करो|हाँ कर दो|कन्फर्म|स्वीकार है|पुष्टि करें|हाँ ठीक है|आगे बढ़ें)$",
            r"\b(confirm karo|haan proceed|yes confirm|haan call karo|haan bulao|yes call)\b"
        ]
        for pat in positive_patterns:
            if re.search(pat, norm):
                return "confirm_action"

        # Negative rejection
        negative_patterns = [
            r"^(no|cancel|stop|reject|don'?t|don'?t do it|nahi|nahin|mat karo|cancel it|no cancel)$",
            r"^(नहीं|रद्द करो|मत करो|कैंसल|अस्वीकार)$",
            r"\b(nahi karna|mat bulao|cancel booking)\b"
        ]
        for pat in negative_patterns:
            if re.search(pat, norm):
                return "reject_action"

        return None

    @classmethod
    def _check_staff_intents(cls, norm: str, lang: str) -> Tuple[Optional[str], Dict[str, Any]]:
        # Intent: Serve the next farmer / Call next farmer
        # "Serve the next farmer", "Next farmer ko bulao", "अगले किसान को बुलाओ"
        if (
            re.search(r"\b(serve|call|next)\b.*\b(farmer|next|kisan)\b", norm) or
            re.search(r"\b(next|agla|agle)\b.*\b(farmer|kisan|ko)\b.*\b(bulao|call|serve|sewa)\b", norm) or
            re.search(r"अगले किसान को बुलाओ|अगले किसान की सेवा करो|अगला किसान बुलाओ|नेक्स्ट किसान", norm) or
            norm in ["serve the next farmer", "call next farmer", "serve next", "next farmer ko bulao", "agla kisan bulao"]
        ):
            return "staff_serve_next", {}

        # Intent: Who is next in the queue
        # "Who is next in the queue?", "Kaun next hai line me?", "कतार में अगला कौन है?"
        if (
            re.search(r"\b(who\s+is\s+next|next\s+in\s+(the\s+)?queue|who\s+is\s+up\s+next)\b", norm) or
            re.search(r"\b(kaun|kon)\b.*\b(next|agla)\b.*\b(queue|line|katar)?\b", norm) or
            re.search(r"कतार में अगला कौन|अगला कौन है|अगला किसान कौन|नेक्स्ट कौन है", norm)
        ):
            return "staff_who_is_next", {}

        # Intent: How many farmers are waiting in the queue
        # "How many farmers are waiting in the queue?", "Kitne farmers wait kar rahe hain?", "कतार में कितने किसान प्रतीक्षा कर रहे हैं?"
        if (
            re.search(r"\b(how\s+many|kitne)\b.*\b(waiting|farmers|queue|katar|wait)\b", norm) or
            re.search(r"\b(waiting\s+count|waiting\s+queue|queue\s+count)\b", norm) or
            re.search(r"कितने किसान प्रतीक्षा|कितने किसान वेट|वेटिंग कतार|प्रतीक्षा कर रहे", norm)
        ):
            return "staff_waiting_queue", {}

        # Intent: Show today's bookings
        # "Show today's bookings", "Aaj ki bookings dikhao", "आज की बुकिंग्स दिखाओ"
        if (
            re.search(r"\b(today|aaj)\b.*\b(booking|bookings)\b", norm) or
            re.search(r"\b(booking|bookings)\b.*\b(today|aaj)\b", norm) or
            re.search(r"\b(show|list)\s+bookings?\b", norm) or
            re.search(r"आज की बुकिंग्स|आज की बुकिंग|आज कितने किसान", norm)
        ):
            return "staff_today_bookings", {}

        # Intent: Which farmers have completed procurement
        # "Which farmers have completed procurement?", "Kin kisano ki khareed poori ho chuki hai?", "किन किसानों की खरीद पूरी हो चुकी है?"
        if (
            re.search(r"\b(completed\s+procurement|completed\s+farmers?|who\s+completed)\b", norm) or
            re.search(r"\b(kin\s+kisano|kisano)\b.*\b(complete|poori|puri)\b", norm) or
            re.search(r"खरीद पूरी हो चुकी|पूरी हुई खरीद|किन किसानों की खरीद", norm)
        ):
            return "staff_completed_procurements", {}

        # Intent: Show pending payments
        # "Show pending payments", "Pending payments dikhao", "लंबित भुगतान दिखाओ"
        if (
            re.search(r"\b(pending\s+payments?|unpaid\s+payments?)\b", norm) or
            re.search(r"\b(pending\s+payment|bakaya\s+bhugtan|lambit)\b", norm) or
            re.search(r"लंबित भुगतान|पेंडिंग पेमेंट|बकाया भुगतान", norm)
        ):
            return "staff_pending_payments", {}

        return None, {}

    @classmethod
    def _check_farmer_intents(cls, norm: str, raw_query: str, lang: str) -> Tuple[Optional[str], Dict[str, Any]]:
        # Intent: Cancel slot / booking
        # "Cancel my slot", "Mera slot cancel kar do", "मेरा स्लॉट रद्द करो"
        if (
            re.search(r"\b(cancel|radd|hatao)\b.*\b(slot|booking)\b", norm) or
            re.search(r"\b(slot|booking)\b.*\b(cancel|radd|hatao)\b", norm) or
            re.search(r"मेरा स्लॉट रद्द|स्लॉट रद्द करो|बुकिंग रद्द|स्लॉट कैंसल", norm)
        ):
            return "farmer_cancel_slot", {}

        # Intent: Book a slot
        # "Book a slot for tomorrow at 10 AM", "कल 10 बजे का स्लॉट बुक करो", "Kal 10 baje ka slot book karo", "Mujhe 200 Kg rice bechne"
        if (
            re.search(r"\b(book|reserve|schedule)\b.*\b(slot|token|appointment)?\b", norm) or
            re.search(r"\b(slot|token)\b.*\b(book|karo|karna)\b", norm) or
            re.search(r"\b(bechna|bechne|bechni|sell)\b", norm) or
            re.search(r"\b(\d{1,2})\s*(bje|baje|baje ka|bje ka|am|pm)\b", norm) or
            re.search(r"स्लॉट बुक|स्लॉट बुक करो|बुकिंग करो|स्लॉट चाहिए|बेचना|बेचने|बेचनी|\d{1,2}\s*बजे", norm)
        ):
            entities = cls._extract_booking_entities(norm, raw_query)
            return "farmer_book_slot", entities

        # Intent: Check token number
        # "Mera token number kya hai?", "What is my token number?", "मेरा टोकन नंबर क्या है?"
        if (
            re.search(r"\b(token\s*number|token\s*no|token\s*kya)\b", norm) or
            re.search(r"\bmera\s+token\b", norm) or
            re.search(r"मेरा टोकन नंबर|टोकन नंबर क्या|टोकन बताओ", norm)
        ):
            return "farmer_check_token", {}

        # Intent: Check queue position / wait time
        # "What is my queue position?", "Kitne log aage hain?", "कतार में मेरी स्थिति क्या है?"
        if (
            re.search(r"\b(queue\s+position|queue\s+status|my\s+position|how\s+long\s+wait|wait\s+time)\b", norm) or
            re.search(r"\b(position|number\s+kab|aage\s+hain|line\s+me\s+position)\b", norm) or
            re.search(r"कतार में मेरी स्थिति|मेरा नंबर कब|कितने लोग आगे|कतार की स्थिति", norm)
        ):
            return "farmer_check_queue", {}

        # Intent: Show procurement status
        # "Show my procurement status", "Mera procurement status kya hai", "खरीद की स्थिति बताओ"
        if (
            re.search(r"\b(procurement\s+status|produce\s+status|harvest\s+status)\b", norm) or
            re.search(r"\b(khareed|procurement)\b.*\b(status|sthiti|kya\b)\b", norm) or
            re.search(r"खरीद की स्थिति|मेरी खरीद की स्थिति|उपज की स्थिति", norm)
        ):
            return "farmer_procurement_status", {}

        # Intent: Show payment status
        # "मेरा payment status बताओ", "Show my payment status", "Mera payment status kya hai", "Paisa kab aayega"
        if (
            re.search(r"\b(payment\s+status|payout\s+status|money\s+status)\b", norm) or
            re.search(r"\b(payment|paisa|paise|rupaye|bhugtan)\b.*\b(status|kab|kya|batao)\b", norm) or
            re.search(r"payment status|भुगतान की स्थिति|पैसे कब आएंगे|पेमेंट स्टेटस", norm)
        ):
            return "farmer_payment_status", {}

        # Intent: Center & Slot information / Center Location & Address
        # "kisan simiti center kha par hai", "kisan samiti center kahan hai", "where is the center", "center address", "is there any slot for today in any center?", "Show available slots", "Centers batao"
        if (
            # Location / Address / Where is inquiries for centers
            re.search(r"\b(center|centre|kendra|mandi|simiti|samiti)\b.*\b(kha|kaha|kahan|kidhar|where|address|location|pata|kaunse|konsa|details?|sthiti)\b", norm) or
            re.search(r"\b(kha|kaha|kahan|kidhar|where|address|location|pata)\b.*\b(center|centre|kendra|mandi|simiti|samiti)\b", norm) or
            re.search(r"\b(kha\s+par|kaha\s+par|kahan\s+hai|kaha\s+hai|kha\s+hai|kidhar\s+hai|where\s+is)\b", norm) and any(w in norm for w in ["center", "centre", "kendra", "mandi", "simiti", "samiti", "kisan", "kheti"]) or
            # Direct slot inquiries
            re.search(r"\b(is\s+there\s+(any\s+)?slots?|are\s+there\s+(any\s+)?slots?|any\s+slots?\b|slot\s+availability|what\s+slots?|which\s+slots?)\b", norm) or
            # Slots mentioned with availability or temporal/center keywords
            re.search(r"\b(slot|slots)\b.*\b(today|tomorrow|available|open|left|free|center|centers|centre|centres|kendra|timing|timings|hours?)\b", norm) or
            re.search(r"\b(available|open|free|khali|bacha)\b.*\b(slot|slots)\b", norm) or
            # Hindi / Hinglish questions about slots & centers
            re.search(r"\b(kya\b.*\bslot|\bslot\b.*\b(khali|bacha|milega|hai\s+kya|h|kab|kya\s+hai|available)|koi\s+slot)\b", norm) or
            re.search(r"\b(center|centre|mandi)\b.*\b(timing|open|khula|kahan|kha|kaha|available|list|info|kendra)\b", norm) or
            re.search(r"\b(centers?\s+batao|open\s+centers?|list\s+centers?|active\s+centers?)\b", norm) or
            # Devanagari Hindi
            re.search(r"केंद्र कहाँ|केंद्र का पता|केंद्र की स्थिति|केंद्र का स्थान|उपलब्ध स्लॉट|स्लॉट उपलब्ध|खाली स्लॉट|स्लॉट खाली|कोई स्लॉट|स्लॉट बचा|स्लॉट है क्या|केंद्र की जानकारी|केंद्र का समय|केंद्र खुला", norm)
        ):
            is_today = any(w in norm for w in ["today", "aaj", "आज"])
            is_tomorrow = any(w in norm for w in ["tomorrow", "kal", "कल"])
            target_day = "tomorrow" if is_tomorrow else "today" if is_today else None
            return "farmer_center_slots_info", {"target_day": target_day, "raw_query": raw_query}

        return None, {}

    SLOT_START_TIME_MAP = {
        1: (9, 0),
        2: (10, 0),
        3: (11, 0),
        4: (12, 0),
        5: (13, 0),
    }

    @classmethod
    def _extract_booking_entities(cls, norm: str, raw: str) -> Dict[str, Any]:
        """Extracts date, slot/time, produce, and quantity from booking command with time awareness."""
        now = datetime.now()
        today = now.date()
        target_date = today
        rolled_from_expired_today = False
        slot_adjusted_from_expired = False

        # Mandi slot cutoff: past 01:30 PM (13:30), no slots remain today
        is_today_ended = (now.hour > 13) or (now.hour == 13 and now.minute >= 30)

        # 1. Date extraction
        explicit_tomorrow = any(w in norm for w in ["tomorrow", "kal", "कल", "agli subah", "agle din"])
        explicit_day_after = any(w in norm for w in ["day after tomorrow", "parson", "परसों"])
        explicit_today = any(w in norm for w in ["today", "aaj", "आज"])

        if explicit_tomorrow:
            target_date = today + timedelta(days=1)
        elif explicit_day_after:
            target_date = today + timedelta(days=2)
        elif explicit_today:
            if is_today_ended:
                target_date = today + timedelta(days=1)
                rolled_from_expired_today = True
            else:
                target_date = today
        else:
            # Default when date is not explicitly specified
            if is_today_ended:
                target_date = today + timedelta(days=1)
                rolled_from_expired_today = True
            else:
                target_date = today

        # 2. Time & Slot Extraction
        requested_slot_id = None
        if re.search(r"\b(9\s*(am|baje)?|९\s*बजे|09:00)\b", norm):
            requested_slot_id = 1
        elif re.search(r"\b(10\s*(am|baje)?|१०\s*बजे|10:00)\b", norm):
            requested_slot_id = 2
        elif re.search(r"\b(11\s*(am|baje)?|११\s*बजे|11:00)\b", norm):
            requested_slot_id = 3
        elif re.search(r"\b(12\s*(pm|baje|noon)?|१२\s*बजे|12:00)\b", norm):
            requested_slot_id = 4
        elif re.search(r"\b(1\s*(pm|baje)?|१\s*बजे|13:00|01:00)\b", norm):
            requested_slot_id = 5

        current_time_val = now.time()

        if target_date == today:
            # Check if requested slot is expired or if default slot is needed
            slot_id = requested_slot_id or 2
            h, m = cls.SLOT_START_TIME_MAP.get(slot_id, (10, 0))
            from datetime import time as dt_time
            slot_start = dt_time(h, m)

            if current_time_val >= slot_start:
                # Requested or default slot has already started or passed
                # Find the earliest upcoming slot today
                upcoming_slot_id = None
                for sid in sorted(cls.SLOT_START_TIME_MAP.keys()):
                    sh, sm = cls.SLOT_START_TIME_MAP[sid]
                    if dt_time(sh, sm) > current_time_val:
                        upcoming_slot_id = sid
                        break

                if upcoming_slot_id:
                    slot_id = upcoming_slot_id
                    slot_adjusted_from_expired = True
                else:
                    # No slots remaining today! Must roll over to tomorrow
                    target_date = today + timedelta(days=1)
                    rolled_from_expired_today = True
                    slot_id = 2  # Default to tomorrow 10:00 AM - 11:00 AM
            else:
                slot_id = slot_id
        else:
            # Booking for tomorrow or future date
            slot_id = requested_slot_id or 2

        slot_time = cls.SLOT_TIME_MAP.get(slot_id, "10:00 AM - 11:00 AM")

        # 3. Produce extraction
        detected_produce = "Wheat"
        for prod_key, synonyms in cls.PRODUCE_SYNONYMS.items():
            for syn in synonyms:
                if syn in norm or syn in raw:
                    detected_produce = prod_key.capitalize()
                    break
            if detected_produce != "Wheat":
                break

        # 4. Quantity extraction
        quantity_kg = 1000
        qty_match = re.search(r"(\d+(?:\.\d+)?)\s*(kg|kilos|quintal|quintals|ton|tons|क्विंटल|टन|किलो)", norm)
        if qty_match:
            num = float(qty_match.group(1))
            unit = qty_match.group(2).lower()
            if "ton" in unit or "टन" in unit:
                quantity_kg = int(num * 1000)
            elif "quintal" in unit or "क्विंटल" in unit:
                quantity_kg = int(num * 100)
            else:
                quantity_kg = int(num)

        return {
            "date": target_date.isoformat(),
            "formatted_date": target_date.strftime("%d %b %Y"),
            "slot_id": slot_id,
            "slot_time": slot_time,
            "produce": detected_produce,
            "quantity_kg": quantity_kg,
            "produce_type": "Standard Grade",
            "rolled_from_expired_today": rolled_from_expired_today,
            "slot_adjusted_from_expired": slot_adjusted_from_expired,
        }

    @classmethod
    def generate_multilingual_response(
        cls,
        intent: str,
        lang: str,
        data: Dict[str, Any],
        is_success: bool = True
    ) -> str:
        """
        Generates natural language response in Hindi, English, or Hinglish.
        """
        # --- Farmer: Book Slot Confirmation Request ---
        if intent == "farmer_book_slot" and data.get("stage") == "confirmation_required":
            dt = data.get("formatted_date", "Tomorrow")
            time_str = data.get("slot_time", "10:00 AM - 11:00 AM")
            crop = data.get("produce", "Wheat")
            qty = data.get("quantity_kg", 1000)
            center = data.get("center_name", "Procurement Center")

            if data.get("rolled_from_expired_today"):
                if lang == "hi":
                    return f"आज के सभी खरीद स्लॉट समाप्त हो चुके हैं। मैंने आपकी बुकिंग कल {dt} को {time_str} पर {center} में {qty} किग्रा {crop} के लिए तय की है। क्या आप पुष्टि करना चाहते हैं?"
                elif lang == "hinglish":
                    return f"Aaj ke sabhi procurement slots khatam/expire ho chuke hain. Isliye maine aapki booking kal {dt} ko {time_str} par {center} mein {qty} kg {crop} ke liye schedule ki hai. Please confirm kijiye."
                else:
                    return f"All procurement slots for today have already closed or expired. I have scheduled your booking for tomorrow, {dt} from {time_str} at {center} for {qty:,} kg of {crop}. Please confirm to proceed."

            if data.get("slot_adjusted_from_expired"):
                if lang == "hi":
                    return f"अनुरोधित स्लॉट समय बीत चुका है। मैंने आज का अगला उपलब्ध स्लॉट ({dt}, {time_str}) {center} में {qty} किग्रा {crop} के लिए चुना है। कृपया पुष्टि करें।"
                elif lang == "hinglish":
                    return f"Aapka manga hua slot time nikal chuka hai. Isliye maine aaj ka agla available slot ({dt} ko {time_str}) chuna hai {qty} kg {crop} ke liye {center} par. Please confirm kijiye."
                else:
                    return f"The requested slot today has already passed. I have selected the earliest upcoming slot today ({dt} from {time_str}) for {qty:,} kg of {crop} at {center}. Please confirm to proceed."

            if lang == "hi":
                return f"क्या आप {dt} को {time_str} पर {center} में {qty} किग्रा {crop} के लिए स्लॉट बुक करना चाहते हैं? कृपया पुष्टि करें।"
            elif lang == "hinglish":
                return f"Kya aap {dt} ko {time_str} par {center} mein {qty} kg {crop} ke liye slot book karna chahte hain? Please confirm kijiye."
            else:
                return f"Would you like to book a slot for {qty} kg of {crop} at {center} on {dt} from {time_str}? Please confirm to proceed."

        # --- Farmer: Book Slot Confirmed ---
        if intent == "farmer_book_slot" and is_success:
            tok = data.get("formatted_token", "")
            center = data.get("center_name", "")
            time_str = data.get("slot_time", "")
            dt = data.get("formatted_date", "")

            if lang == "hi":
                return f"बधाई! आपका स्लॉट सफलतापूर्वक बुक हो गया है। आपका टोकन नंबर {tok} है। केंद्र: {center}, समय: {time_str}, दिनांक: {dt}।"
            elif lang == "hinglish":
                return f"Mubarak ho! Aapka slot successfully book ho gaya hai. Aapka Token number {tok} hai ({center}, {time_str}, {dt})."
            else:
                return f"Success! Your slot has been booked. Your token number is {tok} at {center} for {time_str} on {dt}."

        # --- Farmer: Cancel Slot Confirmation Request ---
        if intent == "farmer_cancel_slot" and data.get("stage") == "confirmation_required":
            tok = data.get("formatted_token", "")
            dt = data.get("formatted_date", "")
            if lang == "hi":
                return f"क्या आप निश्चित रूप से टोकन {tok} ({dt}) के लिए अपना स्लॉट रद्द करना चाहते हैं? पुष्टि करें।"
            elif lang == "hinglish":
                return f"Kya aap sach me apna token {tok} ({dt}) ka slot cancel karna chahte hain? Confirm karein."
            else:
                return f"Are you sure you want to cancel your slot for Token {tok} on {dt}? Please confirm."

        # --- Farmer: Cancel Slot Confirmed ---
        if intent == "farmer_cancel_slot" and is_success:
            if lang == "hi":
                return "आपका स्लॉट सफलतापूर्वक रद्द कर दिया गया है।"
            elif lang == "hinglish":
                return "Aapka slot successfully cancel kar diya gaya hai."
            else:
                return "Your slot booking has been successfully cancelled."

        # --- Farmer: Token Status ---
        if intent == "farmer_check_token":
            tok = data.get("yourToken", "No Active Token")
            center = data.get("center", "")
            status = data.get("yourStatus", "Confirmed")
            if tok == "No Active Token":
                if lang == "hi":
                    return "आज के लिए आपका कोई सक्रिय टोकन नहीं मिला। आप नया स्लॉट बुक कर सकते हैं।"
                elif lang == "hinglish":
                    return "Aaj ke liye aapka koi active token nahi mila. Aap naya slot book kar sakte hain."
                else:
                    return "You do not have an active token for today. Would you like to book a slot?"
            else:
                if lang == "hi":
                    return f"आज के लिए आपका टोकन नंबर {tok} है ({center})। वर्तमान स्थिति: {status}।"
                elif lang == "hinglish":
                    return f"Aaj aapka Token number {tok} hai ({center}). Current status: {status}."
                else:
                    return f"Your active token number for today is {tok} at {center}. Status: {status}."

        # --- Farmer: Queue Position & Wait Time ---
        if intent == "farmer_check_queue":
            tok = data.get("yourToken", "")
            ahead = data.get("farmersAhead", 0)
            wait = data.get("estimatedWait", "-")
            serving = data.get("nowServing", "-")
            if not tok or tok == "No Active Token":
                if lang == "hi":
                    return "आपके पास आज कोई सक्रिय कतार टोकन नहीं है।"
                elif lang == "hinglish":
                    return "Aapke paas aaj koi active queue token nahi hai."
                else:
                    return "You do not have an active queue token for today."
            else:
                if lang == "hi":
                    return f"आपका टोकन {tok} है। आपसे आगे {ahead} किसान हैं। वर्तमान में सेवा दी जा रही है: {serving}। अनुमानित प्रतीक्षा समय: {wait}।"
                elif lang == "hinglish":
                    return f"Aapka token {tok} hai. Aapke aage {ahead} farmers hain. Currently serving: {serving}. Estimated wait time: {wait}."
                else:
                    return f"Your token is {tok}. You have {ahead} farmers ahead of you. Currently serving: {serving}. Estimated wait time: {wait}."

        # --- Farmer: Procurement Status ---
        if intent == "farmer_procurement_status":
            record = data.get("latest_record")
            if not record:
                if lang == "hi":
                    return "आपकी कोई पिछली खरीद रिकॉर्ड नहीं मिली।"
                elif lang == "hinglish":
                    return "Aapka koi procurement record nahi mila."
                else:
                    return "No procurement records found for your account."
            status = record.get("status", "Completed")
            produce = record.get("produce", "Produce")
            qty = record.get("quantity", "0 kg")
            amt = record.get("amount", "₹0")
            if lang == "hi":
                return f"आपकी नवीनतम खरीद: {produce}, मात्रा: {qty}, राशि: {amt}, स्थिति: {status}।"
            elif lang == "hinglish":
                return f"Aapki latest procurement: {produce}, Quantity: {qty}, Amount: {amt}, Status: {status}."
            else:
                return f"Your latest procurement record: {produce} ({qty}), Amount: {amt}, Status: {status}."

        # --- Farmer: Payment Status ---
        if intent == "farmer_payment_status":
            payment = data.get("latest_payment")
            if not payment:
                if lang == "hi":
                    return "आपके खाते के लिए कोई भुगतान रिकॉर्ड नहीं मिला।"
                elif lang == "hinglish":
                    return "Aapka koi payment record nahi mila."
                else:
                    return "No payment records found for your account."
            amt = payment.get("amount", "₹0")
            p_status = payment.get("status", "Processing")
            rcp = payment.get("receipt_number", "")
            date_est = payment.get("expected_settlement_date", "")
            if lang == "hi":
                return f"आपका नवीनतम भुगतान: {amt} (रसीद {rcp}), स्थिति: {p_status}, अनुमानित निपटान तिथि: {date_est}।"
            elif lang == "hinglish":
                return f"Aapka payment status: {amt} (Receipt {rcp}), Status: {p_status}, Expected settlement: {date_est}."
            else:
                return f"Your latest payment of {amt} (Receipt: {rcp}) is currently '{p_status}'. Expected settlement: {date_est}."

        # --- Staff: Waiting Queue Count ---
        if intent == "staff_waiting_queue":
            waiting = data.get("waiting_count", 0)
            serving = data.get("serving_count", 0)
            total = data.get("total_today", 0)
            center = data.get("center_name", "your center")
            if lang == "hi":
                return f"{center} पर इस समय कतार में {waiting} किसान प्रतीक्षा कर रहे हैं (वर्तमान में सेवा दी जा रही है: {serving}, आज का कुल: {total})।"
            elif lang == "hinglish":
                return f"{center} par currently queue me {waiting} farmers wait kar rahe hain (Currently serving: {serving}, Total today: {total})."
            else:
                return f"There are currently {waiting} farmers waiting in the queue at {center} (Currently serving: {serving}, Total today: {total})."

        # --- Staff: Today's Bookings ---
        if intent == "staff_today_bookings":
            total = data.get("total_today", 0)
            waiting = data.get("waiting_count", 0)
            completed = data.get("completed_count", 0)
            center = data.get("center_name", "Centre")
            if lang == "hi":
                return f"{center} पर आज कुल {total} बुकिंग्स हैं ({waiting} प्रतीक्षारत, {completed} पूर्ण)।"
            elif lang == "hinglish":
                return f"{center} par aaj total {total} bookings hain ({waiting} waiting, {completed} completed)."
            else:
                return f"Total bookings today at {center}: {total} ({waiting} waiting, {completed} completed)."

        # --- Staff: Completed Procurements ---
        if intent == "staff_completed_procurements":
            completed = data.get("completed_count", 0)
            total_qty = data.get("completed_qty_kg", 0)
            center = data.get("center_name", "Centre")
            if lang == "hi":
                return f"आज {completed} किसानों की खरीद सफलतापूर्वक पूरी हो चुकी है (कुल मात्रा: {total_qty:,} किग्रा)।"
            elif lang == "hinglish":
                return f"Aaj {completed} farmers ki procurement complete ho chuki hai (Total: {total_qty:,} kg)."
            else:
                return f"{completed} farmers have completed procurement today totaling {total_qty:,} kg."

        # --- Staff: Pending Payments ---
        if intent == "staff_pending_payments":
            pending_count = data.get("pending_count", 0)
            pending_total = data.get("pending_total", "₹0")
            center = data.get("center_name", "Centre")
            if lang == "hi":
                return f"{center} में कुल लंबित भुगतान: {pending_total} ({pending_count} लेनदेन लंबित)।"
            elif lang == "hinglish":
                return f"{center} me total pending payments: {pending_total} ({pending_count} transactions pending)."
            else:
                return f"Total pending payments at {center}: {pending_total} across {pending_count} pending transactions."

        # --- Staff: Who is Next ---
        if intent == "staff_who_is_next":
            next_token = data.get("next_token")
            farmer_name = data.get("next_farmer_name", "Farmer")
            crop = data.get("next_produce", "Produce")
            qty = data.get("next_quantity_kg", 0)
            if not next_token:
                if lang == "hi":
                    return "वर्तमान में कतार में कोई प्रतीक्षारत किसान नहीं है।"
                elif lang == "hinglish":
                    return "Filhal queue me koi waiting farmer nahi hai."
                else:
                    return "There are currently no waiting farmers in the queue."
            else:
                if lang == "hi":
                    return f"कतार में अगला टोकन {next_token} है ({farmer_name}, {qty} किग्रा {crop})। क्या आप उन्हें काउंटर पर बुलाना चाहते हैं?"
                elif lang == "hinglish":
                    return f"Queue me next token {next_token} hai ({farmer_name}, {qty} kg {crop}). Kya aap inhein counter par bulana chahte hain?"
                else:
                    return f"Next in queue is Token {next_token} ({farmer_name}, {qty} kg {crop}). Would you like to call them to your counter?"

        # --- Staff: Serve Next Farmer Confirmed / Done ---
        if intent == "staff_serve_next" and is_success:
            tok = data.get("now_serving")
            center = data.get("center_name", "")
            if lang == "hi":
                return f"टोकन {tok} को अब आपके काउंटर पर बुलाया गया है। किसान को सूचना भेज दी गई है।"
            elif lang == "hinglish":
                return f"Token {tok} ko ab aapke counter par call kar diya gaya hai. Farmer ko notification bhej di gayi hai."
            else:
                return f"Now serving Token {tok} at your counter. Notification dispatched to the farmer."

        # --- Farmer: Center & Slots Information ---
        if intent == "farmer_center_slots_info":
            is_closed = data.get("is_today_closed", False)
            center_names = data.get("center_names", "Active Centers")
            if is_closed:
                if lang == "hi":
                    return f"उपलब्ध खरीद केंद्र: {center_names}। आज के सभी खरीद स्लॉट समाप्त हो चुके हैं। कल सुबह 08:00 AM से स्लॉट फिर से उपलब्ध होंगे।"
                elif lang == "hinglish":
                    return f"Available centres: {center_names}. Aaj ke slots close ho chuke hain, kal subah 08:00 AM se open honge."
                else:
                    return f"Active procurement centers: {center_names}. Today's procurement slots have ended for the day. Centers will reopen tomorrow at 08:00 AM."
            else:
                slots_text = data.get("available_slots_text", "08:00 AM - 05:00 PM")
                if lang == "hi":
                    return f"उपलब्ध खरीद केंद्र: {center_names}। आज के लिए उपलब्ध स्लॉट: {slots_text}।"
                elif lang == "hinglish":
                    return f"Available centres: {center_names}. Aaj ke available slots: {slots_text}."
                else:
                    return f"Active procurement centers: {center_names}. Available slots today: {slots_text}."

        # Default fallback
        if lang == "hi":
            return "माफ़ कीजिये, मैं इस कमांड को पूरी तरह समझ नहीं पाया। आप स्लॉट बुक करने, टोकन देखने या कतार की स्थिति जानने के लिए कह सकते हैं।"
        elif lang == "hinglish":
            return "Maaf kijiye, main yeh command samajh nahi paya. Aap slot book karne, token check karne ya queue dekhne ke liye keh sakte hain."
        else:
            return "I did not quite understand that command. You can ask to book a slot, check your token, track queue position, or view payment status."
