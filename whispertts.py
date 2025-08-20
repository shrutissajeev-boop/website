import pyttsx3

def text_to_speech(text):
    try:
        # Initialize the text-to-speech engine
        engine = pyttsx3.init()
        
        # Convert text to speech
        print(f"Converting and playing: {text}")
        engine.say(text)
        
        # Play the speech
        engine.runAndWait()
        
        return True
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return False

# Example usage
if __name__ == "__main__":
    # Text you want to convert to speech
    text = "I love programming in Python! It's such a versatile language."
    
    # Convert and play
    text_to_speech(text)

