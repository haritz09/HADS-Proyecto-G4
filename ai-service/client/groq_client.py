import os
import requests  # Usamos requests para manejar las solicitudes HTTP
import json
from groq import Groq
from ..exceptions.rate_limit_error import RateLimitExceededError

class GroqClient:
    _instance = None
    available_models = [
        "llama-3.3-70b-versatile", 
        "llama-3.1-8b-instant", 
        "llama-guard-3-8b", 
        "llama3-70b-8192", 
        "llama3-8b-8192"
    ]
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GroqClient, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if getattr(self, '_initialized', False):
            return
        self.api_key = os.environ.get("API_KEY")
        self.client = Groq(api_key=self.api_key)
        self.current_model_index = 0  # Default to first model in the list
        self.default_model = self.available_models[self.current_model_index]
        self.actual_context = None  # Initialize context storage
        self._initialized = True
        
    def send_message(self, promt, model=None):
        """
        Send a message to the Groq API with automatic model switching on rate limit errors.
        
        Args:
            messages: List of message objects to send
            model: Optional model override
            
        Returns:
            API response from Groq
            
        Raises:
            Exception: If all models hit rate limits
        """
        # Track how many models we have left to try
        remaining_models = len(self.available_models)
        
        while remaining_models > 0:
            try:
                response = self.client.chat.completions.create(
                    messages=[
                        {
                            "role": "user",
                            "content": promt.strip(),
                        }
                    ],
                    model=model or self.default_model,
                )
                
                # Extract strategic_planning from response if available
                try:
                    content = response.choices[0].message.content
                    # Try to parse content as JSON
                    json_data = json.loads(content)
                    if "strategic_planning" in json_data:
                        self.actual_context = json_data["strategic_planning"]
                        print("Updated strategic planning context")
                except (json.JSONDecodeError, KeyError, AttributeError, IndexError):
                    # If not valid JSON or missing the expected structure, ignore
                    pass
                
                # Return the original response
                return response
            except requests.exceptions.HTTPError as e:
                # Si es un error HTTP 429, analizamos el contenido
                if e.response.status_code == 429:
                    error_message = e.response.json()  # Asumimos que la respuesta es JSON
                    print(f"Error 429: {error_message['error']['message']}")

                    # Decrease remaining attempts
                    remaining_models -= 1
                
                    # Si no quedan modelos, lanzamos un error
                    if remaining_models <= 0:
                        raise RateLimitExceededError(
                            "Rate limit reached on all available models",
                            retry_after=e.response.headers.get('Retry-After', None),  # Si 'Retry-After' está disponible
                            model=self.default_model,
                            original_exception=e
                        ) from e
                    
                    # Cambiar al siguiente modelo
                    model_info = self.switch_to_next_model()
                    model = None  # Reset para usar el modelo actualizado
                    print(f"Rate limit reached. Switching to model: {model_info['model_name']}")
    
    def get_actual_context(self):
        """
        Returns the current strategic planning context
        """
        return self.actual_context
        
    def switch_to_next_model(self):
        """
        Switch to the next available model in rotation.
        
        Returns:
            dict: Information about the newly selected model
        """
        self.current_model_index = (self.current_model_index + 1) % len(self.available_models)
        self.default_model = self.available_models[self.current_model_index]
        return {
            "model_index": self.current_model_index,
            "model_name": self.default_model
        }

# Example usage - keeping similar to the original code
if __name__ == "__main__":
    client = GroqClient()
    
    try:
        chat_completion = client.send_message([
            {
                "role": "user",
                "content": "Explain the importance of fast language models",
            }
        ])
        print(chat_completion.choices[0].message.content)
    except Exception as e:
        print(f"Error during API call: {str(e)}")
