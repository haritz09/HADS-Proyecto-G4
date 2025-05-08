import os
from dotenv import load_dotenv
import requests  # Usamos requests para manejar las solicitudes HTTP
import json
from groq import Groq
from groq import RateLimitError, APIError
from ..exceptions.rate_limit_error import RateLimitExceededError

# Load environment variables from .env file
load_dotenv()

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
        """Initialize the GroqClient with the API key and default model"""
        if getattr(self, '_initialized', False):
            return
        # Get the API key from environment variables
        self.api_key = os.environ.get("GROQ_API_KEY")
        
        # Verify API key is available
        if not self.api_key:
            raise ValueError("GROQ_API_KEY not found. Please set it in your .env file or pass it directly.")
            
        self.client = Groq(api_key=self.api_key)
        self.current_model_index = 0  # Default to first model in the list
        self.default_model = self.available_models[self.current_model_index]
        self.actual_context = None  # Initialize context storage
        self.is_first_message = True  # Track if this is the first message
        self._initialized = True
        
    def send_message(self, game_state, model=None):
        """
        Send a message to the Groq API with automatic model switching on rate limit errors.
        
        Args:
            game_state: JSON object containing the current game state
            model: Optional model override
            
        Returns:
            API response from Groq
            
        Raises:
            Exception: If all models hit rate limits
        """
        # Construct the prompt with the game state
        prompt_template = """You are an AI agent playing Heroes of Might and Magic, a turn-based strategy game. Your goal is to expand your empire, conquer cities, collect resources, and defeat your opponent.

You will receive the current game state in JSON format and must decide the actions for this turn.

---

IMPORTANT:
- Only reply with a **valid JSON object**, strictly matching the format below.
- DO NOT include any text, commentary, or XML tags like <strategic_planning> outside the JSON.
- DO NOT invent new action types. Valid types are:
  - moveHero
  - buildStructure
  - recruitUnits
  - collectResource
  - attackEnemy
  - castSpell
  - pickupArtifact
  - endTurn
- Use camelCase for field names.
- Actions should respect remaining movement points and game constraints.

---

Here is the current game state:
<game_state>
{{GAME_STATE}}
</game_state>

Now, based on this state, analyze the situation, plan your strategy, and return your decisions in the following format:

{
  "actions": [
    {
      "type": "moveHero",
      "details": {
        "heroId": "hero1",
        "destination": { "x": 4, "y": 2 }
      }
    },
    {
      "type": "collectResource",
      "details": {
        "heroId": "hero1",
        "resourceType": "gold",
        "location": { "x": 4, "y": 2 }
      }
    },
    {
      "type": "endTurn"
    }
  ],
  "strategic_planning": {
    "summary": "Summarize the current game state: hero positions, city status, known enemy info.",
    "opportunities": [ "Opportunity 1", "Opportunity 2" ],
    "threats": [ "Threat 1", "Threat 2" ],
    "prioritized_objectives": [ "Objective 1", "Objective 2" ],
    "short_term_strategy": "Explain key actions for this turn.",
    "long_term_strategy": "Plan for next few turns."
  },
  "reasoning": "Explain the rationale behind the chosen actions.",
  "analysis": "Brief game state analysis and implications for future."
}

Only output this JSON object. Do not wrap it in any tags or add additional explanation.
"""


        # Convert game_state to JSON string and insert it into the prompt
        game_state_json = json.dumps(game_state, indent=2)
        prompt = prompt_template.replace("{{GAME_STATE}}", game_state_json)
        
        # Track how many models we have left to try
        remaining_models = len(self.available_models)
        
        # Flag to track if this is a model switch
        is_model_switch = False
        
        while remaining_models > 0:
            # Enhance prompt with context when it's first message or we're switching models
            if (self.is_first_message or is_model_switch) and self.actual_context:
                # Convert context to string and format with explanatory text
                context_text = json.dumps(self.actual_context, indent=2)
                context_prompt = f"""
<previous_strategic_context>
This is the strategic planning and context from the current game. Use this to inform your decisions:
{context_text}
</previous_strategic_context>

"""
                # Insert context at the beginning of prompt
                prompt = context_prompt + prompt
            
            try:
                response = self.client.chat.completions.create(
                    messages=[
                        {
                            "role": "user",
                            "content": prompt.strip(),
                        }
                    ],
                    model=model or self.default_model,
                )
                
                # Reset first message flag after successful API call
                self.is_first_message = False
                
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
            except RateLimitError as e:
                # Handle Groq specific rate limit error
                remaining_models -= 1
            
                # Si no quedan modelos, lanzamos un error
                if remaining_models <= 0:
                    raise RateLimitExceededError(
                        "Rate limit reached on all available models",
                        retry_after=getattr(e, 'retry_after', None),
                        model=self.default_model,
                        original_exception=e
                    ) from e
                
                # Cambiar al siguiente modelo
                model_info = self.switch_to_next_model()
                model = None  # Reset para usar el modelo actualizado
                print(f"Tokens máximos alcanzados, cambiando de modelo a {model_info['model_name']}")
                
                # Mark that we're switching models
                is_model_switch = True
            except requests.exceptions.HTTPError as e:
                # Si es un error HTTP 429, analizamos el contenido
                if e.response.status_code == 429:
                    # No mostrar el mensaje de error detallado, solo el mensaje simplificado
                    
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
                    print(f"Tokens máximos alcanzados, cambiando de modelo a {model_info['model_name']}")
                    
                    # Mark that we're switching models
                    is_model_switch = True
                else:
                    # Re-raise other HTTP errors
                    raise
            except APIError as e:
                # Check if this is a rate limit error (status code 429)
                if getattr(e, 'status_code', 0) == 429 or "rate limit" in str(e).lower():
                    # No mostrar el mensaje de error detallado, solo el mensaje simplificado
                    
                    # Decrease remaining attempts
                    remaining_models -= 1
                
                    # Si no quedan modelos, lanzamos un error
                    if remaining_models <= 0:
                        raise RateLimitExceededError(
                            "Rate limit reached on all available models",
                            retry_after=getattr(e, 'retry_after', None),
                            model=self.default_model,
                            original_exception=e
                        ) from e
                    
                    # Cambiar al siguiente modelo
                    model_info = self.switch_to_next_model()
                    model = None  # Reset para usar el modelo actualizado
                    print(f"Tokens máximos alcanzados, cambiando de modelo a {model_info['model_name']}")
                    
                    # Mark that we're switching models
                    is_model_switch = True
                else:
                    # Re-raise other API errors
                    raise
    
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