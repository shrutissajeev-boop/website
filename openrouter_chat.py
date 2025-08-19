import requests
import json
import os
import sys

class OpenRouterChat:
    def __init__(self, api_key, site_url="", site_name=""):
        self.api_key = api_key
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        
        # Optional headers for site rankings
        if site_url:
            self.headers["HTTP-Referer"] = site_url
        if site_name:
            self.headers["X-Title"] = site_name
        
        self.conversation_history = []
    
    def send_message(self, message, model="openai/chatgpt-4o-latest"):
        # Add user message to conversation history
        self.conversation_history.append({
            "role": "user",
            "content": message
        })
        
        try:
            response = requests.post(
                url=self.base_url,
                headers=self.headers,
                data=json.dumps({
                    "model": model,
                    "messages": self.conversation_history,
                    "stream": False
                })
            )
            
            if response.status_code == 200:
                response_data = response.json()
                assistant_message = response_data['choices'][0]['message']['content']
                
                # Add assistant response to conversation history
                self.conversation_history.append({
                    "role": "assistant",
                    "content": assistant_message
                })
                
                return assistant_message
            else:
                return f"Error: {response.status_code} - {response.text}"
                
        except requests.RequestException as e:
            return f"Request failed: {str(e)}"
        except KeyError as e:
            return f"Unexpected response format: {str(e)}"
    
    def clear_history(self):
        self.conversation_history = []
        print("Conversation history cleared.")
    
    def show_history(self):
        if not self.conversation_history:
            print("No conversation history.")
            return
        
        print("\n--- Conversation History ---")
        for i, msg in enumerate(self.conversation_history, 1):
            role = msg['role'].title()
            content = msg['content'][:100] + "..." if len(msg['content']) > 100 else msg['content']
            print(f"{i}. {role}: {content}")
        print("--- End History ---\n")

def main():
    print("🤖 OpenRouter ChatGPT Console Chat")
    print("=" * 40)
    
    # Get API key from user
    api_key = input("Enter your OpenRouter API key: ").strip()
    
    if not api_key:
        print("Error: API key is required!")
        sys.exit(1)
    
    # Optional site details
    site_url = input("Enter your site URL (optional, press Enter to skip): ").strip()
    site_name = input("Enter your site name (optional, press Enter to skip): ").strip()
    
    # Initialize chat
    chat = OpenRouterChat(api_key, site_url, site_name)
    
    print("\n🎉 Chat initialized! Type 'help' for commands.")
    print("=" * 40)
    
    while True:
        try:
            user_input = input("\nYou: ").strip()
            
            if not user_input:
                continue
            
            # Handle special commands
            if user_input.lower() == 'quit' or user_input.lower() == 'exit':
                print("Goodbye! 👋")
                break
            elif user_input.lower() == 'help':
                print("\nAvailable commands:")
                print("- 'help': Show this help message")
                print("- 'clear': Clear conversation history")
                print("- 'history': Show conversation history")
                print("- 'quit' or 'exit': Exit the chat")
                print("- Or just type your message to chat!")
                continue
            elif user_input.lower() == 'clear':
                chat.clear_history()
                continue
            elif user_input.lower() == 'history':
                chat.show_history()
                continue
            
            # Send message and get response
            print("🤔 Thinking...")
            response = chat.send_message(user_input)
            print(f"\nAI: {response}")
            
        except KeyboardInterrupt:
            print("\n\nChat interrupted. Goodbye! 👋")
            break
        except Exception as e:
            print(f"\nAn error occurred: {str(e)}")

if __name__ == "__main__":
    main()
