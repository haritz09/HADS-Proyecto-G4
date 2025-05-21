import os
from dotenv import load_dotenv
import requests
import json
import re  # Añadir importación para usar expresiones regulares
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
until you run out of movement points. Possible action types include:- moveHero: Move a hero to a new location- buildStructure: Construct a building in a city- recruitUnits: Recruit new units in a city- collectResource: Collect a resource on the map- attackEnemy: Initiate combat with an enemy (you have to be in the same position as the enemy on the map)- transer: Transfer troops between the heroe and the castle (you have to be in the castle to do this)- pickupArtifact: Equip a hero with an artifact
 You can recruit these units based on your buildings and available resources (to recruit a unit you have to be in the city and building which generates it): 
- soldado (cost: 50 gold, health: 100, attack: 10, speed: 8) -It's generated in the barracks
- arquero: (cost: 50 gold, health: 100, attack: 8, speed: 12) -It's generated in the archery
- caballero: (cost: 100 gold, health: 150, attack: 15, speed: 10) -It's generated in the knigths_tower
- mago: (cost: 200 gold, health: 80, attack: 20, speed: 12) -It's generated in the mage_tower
- dragon: (cost: 400 gold, heath: 100, attack: 30, speed: 15) -It's generated in the dragons_lair
You can also build these structures in your cities with buildStructure (to build a structure you have to be in the castle):
-"barracks": {"gold": 1000, "wood": 50, "stone": 50},
-"archery": {"gold": 1200, "wood": 70, "stone": 30},
-"knigths_tower": {"gold": 1500, "wood": 100, "stone": 100},
-"mage_tower": {"gold": 2000, "wood": 100, "stone": 100},
-"dragons_lair": {"gold": 5000, "wood": 200, "stone": 200}
You can also build a tavern in the castle to increase the maximum number of heroes you can have (so you don't lose when a hero dies):
-"tavern": {"gold": 1000, "wood": 200, "stone": 200}

 IMPORTANT: First, think through your strategic planning. After you've thought through your strategy, 
 you'll provide your response in PURE JSON format. Do not include any XML tags inside the JSON values!
 The fields like "summary", "reasoning", etc. should contain plain text without any XML tags.
 
 CRITICAL JSON FORMATTING REQUIREMENTS:
 1. Your response MUST be valid, parseable JSON
 2. Pay EXTREMELY careful attention to commas in your JSON:
    - Every item in an array or object MUST be followed by a comma, EXCEPT the last item
    - Example correct format: {"x": 10, "y": 20}
    - Example INCORRECT format: {"x": 10 "y": 20} or {"x": 10, "y": 20,}
 3. All property names must be enclosed in double quotes
 4. All string values must be enclosed in double quotes
 5. Nested objects must have proper structure and closing braces
 6. For position objects like coordinates, always follow this exact format:
    {"x": 10, "y": 20} - with the comma between x and y values!
 7. Double-check all property values - numbers must not have quotes, strings must have quotes
 8. DO NOT use XML tags inside ANY string values - just use plain text
 9. Before submitting your response, scan it entirely to make sure it's properly closed with all brackets matched

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
 Here's an example of the action format with CORRECT JSON SYNTAX:
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
      "type": "buildStructure",
      "details": {
        "cityId": "city1",
        "structureType": "barracks"
      }
    },
    {
      "type": "recruitUnits",
      "details": {
        "heroId": "hero1",
        "cityId": "city1",
        "buildingId": "barracks",
        "unitType": "archer",
        "quantity": 5
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

Your response must be a valid JSON object. Do not include XML tags or text markers like <strategic_planning> 
inside your JSON values. Only output this JSON object without any additional text.

FINAL CHECK: Before submitting, visually verify that all objects have matching braces, all arrays have 
matching brackets, all string values have matching quotes, and every item in objects and arrays 
(except the last one) is followed by a comma.
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
                    # Limpiar etiquetas XML que puedan estar dentro de los valores JSON
                    cleaned_content = self._clean_xml_tags_from_json(content)
                    
                    # Try to parse content as JSON
                    json_data = json.loads(cleaned_content)
                    if "strategic_planning" in json_data:
                        self.actual_context = json_data["strategic_planning"]
                        print("Updated strategic planning context")
                except (json.JSONDecodeError, KeyError, AttributeError, IndexError):
                    # If not valid JSON or missing the expected structure, ignore
                    pass
                
                # Clean the content before returning the response
                if hasattr(response.choices[0].message, 'content'):
                    cleaned_content = self._clean_xml_tags_from_json(response.choices[0].message.content)
                    response.choices[0].message.content = cleaned_content
                
                # Return the original response with cleaned content
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
    
    def _clean_xml_tags_from_json(self, content):
        """
        Remove XML tags that might be embedded within JSON string values.
        This prevents parsing errors when the model incorrectly includes tags.
        """
        if not content:
            return content
            
        try:
            # Pattern to match XML tags inside JSON string values
            # This looks for <tag>...</tag> patterns inside quoted strings
            pattern = r'(\"[^\"]*?)(<[\w_]+>)(.*?)(</[\w_]+>)([^\"]*?\")'
            
            # Function to process each match
            def replace_xml_tags(match):
                prefix = match.group(1)
                content = match.group(3)
                suffix = match.group(5)
                return f'{prefix}{content}{suffix}'
            
            # Replace XML tags inside string values
            cleaned = re.sub(pattern, replace_xml_tags, content)
            
            # Try again with another pattern for cases where the opening tag might be
            # at the very beginning of a string value
            pattern2 = r'(\")([\s]*<[\w_]+>)(.*?)(</[\w_]+>[\s]*)(\")' 
            cleaned = re.sub(pattern2, lambda m: f'"{m.group(3)}"', cleaned)
            
            return cleaned
        except Exception as e:
            print(f"Error cleaning XML tags from JSON: {e}")
            return content
    
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