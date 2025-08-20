import os
import sounddevice as sd
import soundfile as sf
import torch
from transformers import MarianMTModel, MarianTokenizer, pipeline
import sys

# ----------------------------
# CONFIG
# ----------------------------
SAMPLE_RATE = 16000
OUTPUT_DIR = "outputs"
INPUT_AUDIO = os.path.join(OUTPUT_DIR, "input.wav")
OUTPUT_AUDIO = os.path.join(OUTPUT_DIR, "translated.wav")

# Ensure the output folder exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ----------------------------
# Record Audio
# ----------------------------
def record_audio(filename, duration=5):
    print(f"🎤 Recording for {duration} seconds...")
    recording = sd.rec(int(duration * SAMPLE_RATE), samplerate=SAMPLE_RATE, channels=1, dtype='float32')
    sd.wait()
    sf.write(filename, recording, SAMPLE_RATE)
    print(f"✅ Saved recording as {filename}")

# ----------------------------
# Load Whisper for ASR
# ----------------------------
device = "cuda" if torch.cuda.is_available() else "cpu"
asr = pipeline("automatic-speech-recognition", model="openai/whisper-small", device=0 if device=="cuda" else -1)

# ----------------------------
# Translation Setup
# ----------------------------
def load_translation_model(src_lang, tgt_lang):
    model_name = f"Helsinki-NLP/opus-mt-{src_lang}-{tgt_lang}"
    print(f"⏳ Loading translation model: {model_name}")
    try:
        tokenizer = MarianTokenizer.from_pretrained(model_name)
        model = MarianMTModel.from_pretrained(model_name)
        return tokenizer, model
    except Exception as e:
        print(f"❌ Error loading translation model: {e}")
        return None, None

def translate_text(text, tokenizer, model):
    inputs = tokenizer(text, return_tensors="pt", padding=True)
    translated = model.generate(**inputs)
    return tokenizer.decode(translated[0], skip_special_tokens=True)

# ----------------------------
# TTS using gTTS (simple and reliable)
# ----------------------------
def tts_gtts(text, output_path, lang='en'):
    """
    Text-to-Speech using Google Text-to-Speech
    """
    try:
        from gtts import gTTS
        print(f"🔊 Generating speech with gTTS ({lang})...")
        print(f"📝 Text to speak: {text}")
        
        tts = gTTS(text=text, lang=lang, slow=False)
        tts.save(output_path)
        print(f"✅ Audio saved to {output_path}")
        return True
    except ImportError:
        print("❌ gTTS not installed. Install with: pip install gtts")
        return False
    except Exception as e:
        print(f"❌ gTTS error: {e}")
        return False

# ----------------------------
# MAIN APP
# ----------------------------
if _name_ == "_main_":
    print("🌍 English-Hindi Translator App")
    print("Select input language: [en = English, hi = Hindi]")
    src_lang = input("Your choice: ").strip().lower()
    
    print("Select target language: [en = English, hi = Hindi]")
    tgt_lang = input("Your choice: ").strip().lower()
    
    # Validate language codes
    valid_langs = ['en', 'hi']
    if src_lang not in valid_langs or tgt_lang not in valid_langs:
        print("❌ Invalid language code. Please use: en or hi")
        sys.exit(1)
    
    # Step 1: Record user audio
    try:
        record_audio(INPUT_AUDIO, duration=7)
    except Exception as e:
        print(f"❌ Recording failed: {e}")
        sys.exit(1)
    
    # Step 2: Transcribe with Whisper
    print("⏳ Transcribing with Whisper...")
    try:
        result = asr(INPUT_AUDIO)
        original_text = result["text"]
        print(f"📝 Recognized Text: {original_text}")
        
        if not original_text.strip():
            print("❌ No speech detected in the recording")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Transcription failed: {e}")
        sys.exit(1)
    
    # Step 3: Translate
    if src_lang != tgt_lang:
        print(f"⏳ Translating from {src_lang} to {tgt_lang}...")
        tokenizer, model = load_translation_model(src_lang, tgt_lang)
        
        if tokenizer is None or model is None:
            print("❌ Translation model loading failed")
            sys.exit(1)
        
        try:
            translated_text = translate_text(original_text, tokenizer, model)
            print(f"🌐 Translated Text: {translated_text}")
        except Exception as e:
            print(f"❌ Translation failed: {e}")
            sys.exit(1)
    else:
        translated_text = original_text
        print(f"📝 Same language detected, skipping translation: {translated_text}")
    
    # Step 4: TTS with gTTS
    print(f"⏳ Generating audio for translated text...")
    success = tts_gtts(translated_text, OUTPUT_AUDIO, tgt_lang)
    
    if success:
        print(f"🎉 Done! Check {OUTPUT_DIR}/ for input and translated audio files.")
        print(f"📂 Input audio: {INPUT_AUDIO}")
        print(f"🔊 Translated audio: {OUTPUT_AUDIO}")
    else:
        print("❌ Failed to generate translated audio")
        print(f"📝 Translated text was: {translated_text}")
        print("💡 Please install gTTS: pip install gtts")