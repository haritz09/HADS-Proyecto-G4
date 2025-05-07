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
        prompt_template = """Here is the current game state:
 <game_state>
 {{GAME_STATE}}
 </game_state>
 You are an AI agent playing Heroes of Might and Magic, a turn-based strategy 
game. Your goal is to expand your empire, conquer cities, collect resources, 
and defeat your opponent. You will receive the current game state and must 
decide on your actions for this turn.
 Your task is to analyze the game state, formulate a strategy, and determine 
the actions for your current turn. Follow these steps:
 1. Analyze the game state, considering:
   - Your heroes' positions, stats, and armies
   - Your cities and their development
   - Available resources and income
   - Explored areas of the map
   - Known enemy positions and strength
   - Nearby opportunities (resources, neutral armies, artifacts)
   - Fog of war (areas of the map you haven't explored)
 2. Formulate a strategy based on these priorities:
   - Exploration to uncover resources and cities
   - Securing income sources
   - City development for stronger unit recruitment
   - Hero improvement through experience and artifacts
   - Balancing economy and military strength
3. Generate a set of actions for this turn. You can perform multiple actions 
until you run out of movement points. Possible action types include:- moveHero: Move a hero to a new location- buildStructure: Construct a building in a city- recruitUnits: Recruit new units in a city- collectResource: Collect a resource on the map- attackEnemy: Initiate combat with an enemy- castSpell: Use a hero's spell- pickupArtifact: Equip a hero with an artifact
 Before providing your final response, wrap your thought process and 
strategic considerations inside <strategic_planning> tags. In this section:
 1. Summarize the current game state, including hero positions, resources, 
and known enemy information.
 2. List out potential opportunities and threats.
 3. Prioritize objectives based on the current situation.
 4. Outline a short-term (this turn) and long-term (next few turns) strategy.
 It's OK for this section to be quite long, as thorough planning is crucial 
for success in the game.
 Your final response should be in the following JSON format:
{
  "actions": [
    {
      "type": "actionType",
      "details": {
        // Relevant details for the action
      }
    },
 	//… more actions ...
    {
      "type": "endTurn"
    }
  ],
  "strategic_planning": {
    "summary": "Resumen del estado actual del juego, incluyendo posiciones de héroes, recursos y enemigos.",
    "opportunities": [
      "Oportunidad 1",
      "Oportunidad 2"
    ],
    "threats": [
      "Amenaza 1",
      "Amenaza 2"
    ],
    "prioritized_objectives": [
      "Objetivo prioritario 1",
      "Objetivo prioritario 2"
    ],
    "short_term_strategy": "Acciones clave para este turno.",
    "long_term_strategy": "Plan general para los próximos turnos."
  },
  "reasoning": "Explicación general de la estrategia y decisiones tomadas.",
  "analysis": "Breve análisis del estado del juego y la posición del oponente."
}
 Here's an example of the action format:
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
    "summary": "Hero1 is near a gold pile in the southern region. City1 has a barracks but low unit count. No enemy heroes are currently visible.",
    "opportunities": [
      "Gold resource nearby",
      "Unexplored road to the east"
    ],
    "threats": [
      "Low army strength",
      "Fog of war near eastern border"
    ],
    "prioritized_objectives": [
      "Collect nearby gold",
      "Scout east for resource nodes"
    ],
    "short_term_strategy": "Pick up the nearby gold and move east to explore.",
    "long_term_strategy": "Expand visibility, build up army, and secure second city."
  },
  "reasoning": "The hero has movement points and is close to valuable resources. Exploring east could reveal more opportunities.",
  "analysis": "The player is in an early-game state with weak military but good positioning to expand economically."
}

 Remember:- Think strategically and plan for the long term- Manage your resources efficiently- Adapt your strategy based on the game situation, including areas obscured 
by fog of war- Balance economic development and military strength- Exploit your strengths and your opponent's weaknesses- Always end your turn with an "endTurn" action- Provide thorough reasoning for your decisions- Stay within the rules and mechanics of the game
 Now, based on the provided game state, analyze the situation, formulate your 
strategy, and generate your actions, reasoning, and analysis for this turn."""

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
                print(f"Groq Rate Limit Error: {str(e)}")
                
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
                print(f"Rate limit reached. Switching to model: {model_info['model_name']}")
                
                # Mark that we're switching models
                is_model_switch = True
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
                    
                    # Mark that we're switching models
                    is_model_switch = True
                else:
                    # Re-raise other HTTP errors
                    raise
            except APIError as e:
                # Check if this is a rate limit error (status code 429)
                if getattr(e, 'status_code', 0) == 429 or "rate limit" in str(e).lower():
                    print(f"Groq API Error (Rate Limit): {str(e)}")
                    
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
                    print(f"Rate limit reached. Switching to model: {model_info['model_name']}")
                    
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