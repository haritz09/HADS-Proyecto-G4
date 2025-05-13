"""
Script para realizar pruebas con la API de GroQ

Este módulo permite probar la conexión con la API de GroQ,
enviar diferentes prompts y verificar las respuestas.
"""

import os
import sys
import time
from dotenv import load_dotenv
from .groq_client import GroqClient
from ..exceptions.rate_limit_error import RateLimitExceededError

# Load environment variables from .env file
load_dotenv()

class GroqTester:
    def __init__(self):
        """Initialize the GroqTester with a GroqClient instance"""
        self.client = GroqClient()
    
    def test_connection(self):
        """Test the connection to the Groq API"""
        try:
            response = self.client.send_message("Hello, world!")
            print(f"Connection successful. Using model: {self.client.default_model}")
            return True
        except Exception as e:
            print(f"Connection failed: {e}")
            return False
    
    def run_interactive_test(self):
        """Run an interactive test where the user can enter prompts and see responses"""
        print("=== INTERACTIVE GROQ TEST ===")
        print("Type 'exit', 'quit', or 'salir' to end the test")
        
        while True:
            prompt = input("\nEnter your prompt: ")
            if prompt.lower() in ["exit", "quit", "salir"]:
                break
                
            try:
                response = self.client.send_message(prompt)
                print("\n--- GROQ RESPONSE ---")
                print(response.choices[0].message.content)
                print(f"\nModel used: {self.client.default_model}")
            except Exception as e:
                print(f"Error: {e}")

def test_groq_connection(prompt="Explain the importance of fast language models", 
                         model="llama-3.3-70b-versatile"):
    """
    Prueba la conexión con la API de GroQ enviando un prompt y mostrando la respuesta.
    
    Args:
        prompt: Texto a enviar al modelo
        model: Modelo de GroQ a utilizar
    """
    # Verificar que la API_KEY está configurada
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        print("Error: No se encontró la variable de entorno GROQ_API_KEY")
        print("Configura tu clave API con: export GROQ_API_KEY=tu_clave_api (Linux/Mac)")
        print("o: set GROQ_API_KEY=tu_clave_api (Windows CMD)")
        return False

    try:
        # Importar el módulo aquí para aislar posibles errores de importación
        from groq import Groq
        
        # Inicializar el cliente
        client = Groq(api_key=api_key)
        
        print(f"Enviando prompt a GroQ: '{prompt}'")
        print(f"Usando modelo: {model}")
        print("Esperando respuesta...")
        
        # Medir el tiempo de respuesta
        start_time = time.time()
        
        # Realizar la llamada a la API
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=model,
        )
        
        # Calcular tiempo transcurrido
        elapsed_time = time.time() - start_time
        
        # Mostrar resultados
        print("\n--- RESPUESTA DE GROQ ---")
        print(chat_completion.choices[0].message.content)
        print("\n--- INFORMACIÓN ADICIONAL ---")
        print(f"ID de la respuesta: {chat_completion.id}")
        print(f"Modelo usado: {chat_completion.model}")
        print(f"Tiempo de respuesta: {elapsed_time:.2f} segundos")
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        if "authentication" in str(e).lower():
            print("Parece un problema de autenticación. Verifica tu clave API.")
        elif "connect" in str(e).lower():
            print("Parece un problema de conexión. Verifica tu conexión a internet.")
        return False

def list_available_models():
    """Lista los modelos disponibles en GroQ"""
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        print("Error: No se encontró la variable de entorno GROQ_API_KEY")
        return False

    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        
        print("Obteniendo lista de modelos disponibles...")
        models = client.models.list()
        
        print("\n--- MODELOS DISPONIBLES EN GROQ ---")
        for model in models.data:
            print(f"- {model.id}")
        return True
    
    except Exception as e:
        print(f"Error al obtener modelos: {e}")
        return False

def run_interactive_test():
    """Ejecuta un test interactivo donde el usuario puede ingresar prompts"""
    print("=== PRUEBA INTERACTIVA DE GROQ ===")
    print("Ingresa 'salir' para terminar.")
    
    while True:
        prompt = input("\nIngresa un prompt para enviar a GroQ: ")
        if prompt.lower() in ["salir", "exit", "quit"]:
            break
            
        test_groq_connection(prompt)

def test_simple_message():
    """Test sending a simple message to the Groq API"""
    client = GroqClient()
    
    print("\n=== SIMPLE MESSAGE TEST ===")
    try:
        response = client.send_message("What is artificial intelligence?")
        print(f"Current model: {client.default_model}")
        print(f"Response: {response.choices[0].message.content}")
        print("✅ Simple message test successful!")
    except Exception as e:
        print(f"❌ Simple message test failed: {str(e)}")


def test_json_response():
    """Test requesting a structured JSON response"""
    client = GroqClient()
    
    print("\n=== JSON RESPONSE TEST ===")
    prompt = """
    Please respond with a valid JSON object that contains:
    1. A list of 3 popular programming languages
    2. A brief description for each
    3. A difficulty rating from 1-10 for each
    
    Format your entire response as pure JSON with no additional text.
    """
    
    try:
        response = client.send_message(prompt)
        print(f"Current model: {client.default_model}")
        print(f"JSON Response:\n{response.choices[0].message.content}")
        print("✅ JSON response test successful!")
    except Exception as e:
        print(f"❌ JSON response test failed: {str(e)}")


def test_rate_limit():
    """Test rate limit handling and model switching by deliberately exceeding token limits"""
    client = GroqClient()
    
    print("\n=== RATE LIMIT TEST ===")
    print(f"Starting model: {client.default_model}")
    print("Token limits: 12,000 per minute, 100,000 per day")
    print("Request limits: 30 per minute, 1,000 per day")
    
    # Create a long and complex prompt that will consume many tokens
    # A rough estimate is that each word is about 1.3 tokens
    large_prompt = """
    Please write an extremely detailed and comprehensive analysis of quantum computing, covering all of the following aspects in great depth:
    
    1. The complete history and evolution of quantum computing theories from the 1980s to present day
    2. A thorough explanation of quantum mechanics principles relevant to computing (superposition, entanglement, quantum interference)
    3. Detailed technical descriptions of all major quantum computing approaches (superconducting qubits, trapped ions, photonic, topological, silicon spin)
    4. An extensive analysis of the current state of quantum hardware, including specific technical limitations, error rates, coherence times, and gate fidelities
    5. Comprehensive explanations of quantum algorithms with mathematical formulations (Shor's, Grover's, VQE, QAOA, HHL)
    6. In-depth comparison of quantum vs. classical algorithms for specific problems including complexity analysis
    7. Exhaustive survey of potential applications in cryptography, including post-quantum cryptography methods
    8. Detailed technical assessment of applications in material science simulation, including specific molecular modeling examples
    9. Thorough technical review of applications in drug discovery, including protein folding simulations
    10. Complete listing of major companies and research institutions with descriptions of their quantum computing approaches, hardware, and recent breakthroughs
    11. Long-term predictions for quantum computing development over the next 50 years with technical justifications
    12. Highly technical discussion of challenges in quantum error correction, including surface codes, lattice surgery, and magic state distillation
    13. Extensive analysis of the economic and geopolitical implications of quantum computing breakthroughs
    14. Detailed technical descriptions of quantum networking and quantum internet protocols
    15. Thorough discussion of quantum machine learning algorithms and their implementation details
    
    For each of these 15 topics, please provide:
    - Historical context with names, dates, and specific contributions of at least 10 researchers per topic
    - Technical explanations with equations and formal definitions where applicable
    - At least 5 specific examples with numerical data for each topic
    - Detailed analysis of current limitations and proposed solutions
    - Comprehensive bibliography of relevant research papers
    - Predictions about future developments with technical reasoning
    
    This should be your most comprehensive response possible, covering every aspect of quantum computing in maximum technical detail.
    """
    
    # Track tokens and requests to simulate hitting limits
    estimated_tokens_used = 0
    requests_made = 0
    start_time = time.time()
    
    # We'll try to make enough requests to hit the 12,000 tokens per minute limit
    # Each request and response may use 5,000-10,000 tokens combined
    max_attempts = 15  # This should be enough to exceed the 12,000 tokens/minute limit
    initial_model = client.default_model
    
    print(f"Sending {max_attempts} large requests in quick succession...")
    print("This test intentionally tries to exceed rate limits...")
    print("⚠️ IMPORTANT: Watch for token limit messages and model switching notifications...")
    
    # Track if model switching occurred
    model_switched = False
    last_model = initial_model
    
    # Make requests in rapid succession to hit the rate limit
    for i in range(max_attempts):
        try:
            requests_made += 1
            print(f"\nAttempt {i+1}/{max_attempts} using model: {client.default_model}")
            
            # Check if model changed from previous request
            if client.default_model != last_model:
                print(f"🔄 MODEL SWITCHED: {last_model} → {client.default_model}")
                model_switched = True
            
            last_model = client.default_model
            
            # Send the request with minimal delay between requests
            response = client.send_message(large_prompt)
            
            # Roughly estimate tokens used (this is approximate)
            prompt_tokens = len(large_prompt.split()) * 1.3  # rough estimate
            response_tokens = len(response.choices[0].message.content.split()) * 1.3
            request_tokens = prompt_tokens + response_tokens
            estimated_tokens_used += request_tokens
            
            print(f"✅ Request succeeded with model: {client.default_model}")
            print(f"Response preview: {response.choices[0].message.content[:100]}...")
            print(f"Estimated tokens this request: ~{int(request_tokens)}")
            print(f"Estimated total tokens used: ~{int(estimated_tokens_used)}")
            print(f"Requests made: {requests_made}")
            
            # Calculate current request rate and token rate
            elapsed_minutes = (time.time() - start_time) / 60
            req_per_minute = requests_made / elapsed_minutes if elapsed_minutes > 0 else requests_made
            tokens_per_minute = estimated_tokens_used / elapsed_minutes if elapsed_minutes > 0 else estimated_tokens_used
            
            print(f"Current rate: ~{req_per_minute:.1f} requests/min, ~{tokens_per_minute:.1f} tokens/min")
            
            # Check if we're approaching limits
            if tokens_per_minute > 10000:  # Getting close to the 12,000 tokens/minute limit
                print("⚠️ APPROACHING TOKEN RATE LIMIT! (~{tokens_per_minute:.1f}/12,000 tokens/min)")
            
            # Minimal delay to ensure we hit the rate limit
            time.sleep(0.1)  # Just enough delay to not overwhelm the API but still trigger rate limits
            
        except RateLimitExceededError as e:
            print(f"🚨 RATE LIMIT EXCEEDED: {str(e)}")
            print(f"🔄 MODEL SWITCHED: {e.model} → {client.default_model}")
            model_switched = True
            last_model = client.default_model
            
        except Exception as e:
            print(f"❌ Unexpected error: {str(e)}")
    
    # Calculate final statistics
    elapsed_minutes = (time.time() - start_time) / 60
    req_per_minute = requests_made / elapsed_minutes if elapsed_minutes > 0 else requests_made
    tokens_per_minute = estimated_tokens_used / elapsed_minutes if elapsed_minutes > 0 else estimated_tokens_used
    
    print(f"\n=== RATE LIMIT TEST RESULTS ===")
    print(f"Initial model: {initial_model}, Final model: {client.default_model}")
    print(f"Requests made: {requests_made} (~{req_per_minute:.1f}/min)")
    print(f"Estimated tokens used: ~{int(estimated_tokens_used)} (~{tokens_per_minute:.1f}/min)")
    
    if model_switched:
        print("✅ RATE LIMIT TEST SUCCESSFUL: Model switching occurred during the test!")
    else:
        print("❌ RATE LIMIT TEST FAILED: No model switching detected.")
        if tokens_per_minute > 12000 or req_per_minute > 30:
            print("⚠️ Rate limits were likely exceeded, but model didn't change. Check implementation.")
        else:
            print("⚠️ Rate limits may not have been reached. Try increasing the number of requests or prompt size.")


def test_token_exhaustion():
    """Test if the model changes when token limits are exhausted and if context is maintained"""
    client = GroqClient()
    
    print("\n=== TOKEN EXHAUSTION TEST ===")
    print(f"Starting model: {client.default_model}")
    
    # Create an initial large prompt to consume many tokens
    initial_prompt = """
    Please provide an extremely detailed and comprehensive analysis of the following topics:

    1. The complete history of artificial intelligence from Alan Turing to the present day, with specific focus on every major breakthrough, researcher, and paradigm shift.

    2. A thorough technical explanation of how large language models work, including transformer architecture, attention mechanisms, tokenization, training methodologies, and fine-tuning approaches.

    3. A detailed comparison of at least 10 different state-of-the-art AI models, analyzing their architecture, parameters, training data, capabilities, limitations, and best use cases.

    4. An extensive discussion on the ethical implications of AI development, including issues of bias, privacy, intellectual property, job displacement, existential risk, and regulatory frameworks across different countries.

    5. A complete technical guide for implementing a neural network from scratch, including the mathematics of backpropagation, optimization algorithms, and techniques for avoiding overfitting.

    For each topic, please provide:
    - Historical context and development
    - Key technical details
    - Major challenges and solutions
    - Current state of the art
    - Future directions and predictions
    - Comprehensive references to research papers, people, and organizations
    - Real-world examples and case studies
    - Code examples where applicable

    Make your analysis as thorough and detailed as possible, covering every aspect of these topics in great depth.
    """
    
    # Track models used and token consumption
    models_used = [client.default_model]
    estimated_tokens_used = 0
    max_iterations = 15
    conversation_log = []
    
    try:
        print(f"Sending initial large prompt using model: {client.default_model}")
        response = client.send_message(initial_prompt)
        initial_response = response.choices[0].message.content
        
        # Roughly estimate tokens used
        prompt_tokens = len(initial_prompt.split()) * 1.3  # Rough estimate
        response_tokens = len(initial_response.split()) * 1.3
        initial_tokens = prompt_tokens + response_tokens
        estimated_tokens_used += initial_tokens
        
        print(f"Initial response received (first 100 chars): {initial_response[:100]}...")
        print(f"Estimated tokens used: ~{int(initial_tokens)}")
        
        # Save the conversation
        conversation_log.append({"role": "user", "content": initial_prompt})
        conversation_log.append({"role": "assistant", "content": initial_response})
        
        # Now start a series of follow-up questions that reference the previous response
        # This should force the model to maintain context and eventually hit token limits
        
        last_response = initial_response
        model_switches = []
        current_model = client.default_model
        
        for i in range(max_iterations):
            # Get a snippet from the previous response to reference
            snippet = last_response[:100] if len(last_response) > 100 else last_response
            
            # Create a prompt that references the previous response and asks for more
            follow_up = f"""
            Regarding your previous response where you mentioned "{snippet}...",
            
            Please expand on that idea with much more detail. Add at least 1500 words of additional
            analysis, examples, historical background, technical specifications, and connections to other
            fields. Include a thorough explanation of all concepts mentioned in your previous response.
            
            Format your response with detailed sections, bullet points, and extensive explanations.
            Include specific numerical data, formulas, and technical terminology where appropriate.
            """
            
            print(f"\nIteration {i+1}/{max_iterations} using model: {client.default_model}")
            
            # Check if model changed since last iteration
            if client.default_model != current_model:
                switch_info = {
                    "from": current_model,
                    "to": client.default_model,
                    "at_iteration": i+1,
                    "estimated_tokens_used": int(estimated_tokens_used)
                }
                model_switches.append(switch_info)
                print(f"🔄 MODEL SWITCHED: {current_model} → {client.default_model}")
                print(f"   After approximately {int(estimated_tokens_used)} tokens")
                current_model = client.default_model
                if client.default_model not in models_used:
                    models_used.append(client.default_model)
            
            try:
                # Send the follow-up message
                response = client.send_message(follow_up)
                last_response = response.choices[0].message.content
                
                # Estimate tokens used in this exchange
                follow_tokens = len(follow_up.split()) * 1.3
                response_tokens = len(last_response.split()) * 1.3
                exchange_tokens = follow_tokens + response_tokens
                estimated_tokens_used += exchange_tokens
                
                # Save the conversation
                conversation_log.append({"role": "user", "content": follow_up})
                conversation_log.append({"role": "assistant", "content": last_response})
                
                print(f"Response preview: {last_response[:100]}...")
                print(f"Estimated tokens this exchange: ~{int(exchange_tokens)}")
                print(f"Total estimated tokens used: ~{int(estimated_tokens_used)}")
                
                # If we've detected at least one model switch, test for context preservation
                if len(model_switches) > 0 and i > 0 and i % 3 == 0:  # Test every 3 iterations after a switch
                    print("\n=== TESTING CONTEXT PRESERVATION AFTER MODEL SWITCH ===")
                    # Reference something from the beginning of the conversation
                    specific_question = f"""
                    Earlier in our conversation, you provided information about the history of AI and 
                    transformer architecture. Without repeating what you've already said, please connect
                    those topics to the most recent subject we were discussing about "{snippet}...".
                    Give specific examples that demonstrate you remember our entire conversation.
                    """
                    
                    context_response = client.send_message(specific_question)
                    context_content = context_response.choices[0].message.content
                    
                    # Estimate tokens for this context test
                    question_tokens = len(specific_question.split()) * 1.3
                    context_response_tokens = len(context_content.split()) * 1.3
                    context_tokens = question_tokens + context_response_tokens
                    estimated_tokens_used += context_tokens
                    
                    # Save to conversation log
                    conversation_log.append({"role": "user", "content": specific_question})
                    conversation_log.append({"role": "assistant", "content": context_content})
                    
                    print(f"Context test using model: {client.default_model}")
                    print(f"Context test response: {context_content[:200]}...")
                    print(f"Estimated tokens for context test: ~{int(context_tokens)}")
                    print(f"Total estimated tokens used: ~{int(estimated_tokens_used)}")
                
                # Add a brief delay to avoid overwhelming the API
                time.sleep(1)
                
            except RateLimitExceededError as e:
                switch_info = {
                    "from": e.model,
                    "to": client.default_model,
                    "at_iteration": i+1,
                    "estimated_tokens_used": int(estimated_tokens_used),
                    "error": str(e)
                }
                model_switches.append(switch_info)
                
                print(f"🚨 RATE LIMIT EXCEEDED: {str(e)}")
                print(f"🔄 MODEL SWITCHED: {e.model} → {client.default_model}")
                
                if client.default_model not in models_used:
                    models_used.append(client.default_model)
                
                current_model = client.default_model
                
                # Wait a bit after hitting a rate limit
                time.sleep(3)
                
            except Exception as e:
                print(f"❌ Error during iteration {i+1}: {str(e)}")
                
                # Try to continue with the next iteration after a brief pause
                time.sleep(5)
        
        # Print final summary
        print("\n=== TOKEN EXHAUSTION TEST SUMMARY ===")
        print(f"Starting model: {models_used[0]}")
        print(f"Ending model: {client.default_model}")
        print(f"Total models used: {len(models_used)}")
        print(f"Models used (in order): {', '.join(models_used)}")
        print(f"Model switches detected: {len(model_switches)}")
        print(f"Total estimated tokens used: ~{int(estimated_tokens_used)}")
        
        if len(model_switches) > 0:
            print("\n=== MODEL SWITCH DETAILS ===")
            for i, switch in enumerate(model_switches, 1):
                print(f"Switch {i}: {switch['from']} → {switch['to']}")
                print(f"  Occurred at iteration: {switch['at_iteration']}")
                print(f"  After approx. {switch['estimated_tokens_used']} tokens")
                if 'error' in switch:
                    print(f"  Triggered by: {switch['error']}")
                print()
            
            print("✅ TOKEN LIMIT TEST SUCCESSFUL: Model switching occurred!")
        else:
            print("❌ TOKEN LIMIT TEST INCONCLUSIVE: No model switching detected.")
            print("Try running the test again or using larger prompts.")
            
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")


if __name__ == "__main__":
    print("=== GROQ CHAT ===")
    print("Available options:")
    print("1. Run interactive test")
    print("2. Test connection")
    print("3. Test rate limit handling")
    print("4. Test token exhaustion")
    print("5. Process predefined JSON")
    print("Type 'exit', 'quit', or 'salir' to end the program")
    
    choice = input("\nEnter your choice (1-5): ")
    
    if choice == "1":
        run_interactive_test()
    elif choice == "2":
        test_simple_message()
        test_json_response()
    elif choice == "3":
        test_rate_limit()
    elif choice == "4":
        test_token_exhaustion()
    elif choice == "5":
        # Create an instance of GroqClient
        client = GroqClient()
        
        # Print current model information
        print(f"Using model: {client.default_model}")
        
        # Predefined JSON prompt
        json_prompt = '''
{
  "_id": {
    "$oid": "681b509dcad708339c63875f"
  },
  "user_id": {
    "$oid": "681b509ccad708339c638754"
  },
  "name": "Partida actualizada",
  "scenario_id": "scenario1",
  "created_at": "2025-05-07T12:22:53.734000",
  "last_saved": {
    "$date": "2025-05-07T12:22:53.888Z"
  },
  "is_autosave": false,
  "cheats_used": [],
  "game_state": {
    "turn": 1,
    "player": {
      "heroes": [
        {
          "id": "hero1",
          "name": "Test Hero",
          "position": {
            "x": 6,
            "y": 5
          },
          "stats": {
            "attack": 5,
            "defense": 3,
            "power": 2,
            "knowledge": 2,
            "movement_points": 10,
            "movement_points_left": 10
          },
          "army": [
            {
              "type": "Guerrero",
              "count": 10
            },
            {
              "type": "Arquero",
              "count": 5
            }
          ],
          "artifacts": []
        }
      ],
      "resources": {
        "gold": 1000,
        "wood": 500,
        "stone": 300
      },
      "cities": [
        {
          "id": "city1",
          "name": "Test City",
          "position": {
            "x": 10,
            "y": 10
          },
          "buildings": [
            {
              "id": "castle1",
              "name": "Castillo Central",
              "position": {
                "x": 10,
                "y": 10
              },
              "available_creatures": [
                {
                  "type": "Guerrero",
                  "count": 20,
                  "growth_per_week": 5,
                  "stats": {
                    "attack": 4,
                    "defense": 3,
                    "power": 1,
                    "knowledge": 1,
                    "movement_points": 5,
                    "movement_points_left": 5
                  },
                  "recruit_cost": {
                    "gold": 50,
                    "wood": 0,
                    "stone": 0
                  }
                },
                {
                  "type": "Arquero",
                  "count": 15,
                  "growth_per_week": 4,
                  "stats": {
                    "attack": 5,
                    "defense": 2,
                    "power": 2,
                    "knowledge": 1,
                    "movement_points": 5,
                    "movement_points_left": 5
                  },
                  "recruit_cost": {
                    "gold": 70,
                    "wood": 0,
                    "stone": 0
                  }
                },
                {
                  "type": "Caballero",
                  "count": 8,
                  "growth_per_week": 2,
                  "stats": {
                    "attack": 7,
                    "defense": 5,
                    "power": 2,
                    "knowledge": 2,
                    "movement_points": 6,
                    "movement_points_left": 6
                  },
                  "recruit_cost": {
                    "gold": 120,
                    "wood": 1,
                    "stone": 1
                  }
                },
                {
                  "type": "Mago",
                  "count": 5,
                  "growth_per_week": 1,
                  "stats": {
                    "attack": 6,
                    "defense": 3,
                    "power": 6,
                    "knowledge": 5,
                    "movement_points": 5,
                    "movement_points_left": 5
                  },
                  "recruit_cost": {
                    "gold": 200,
                    "wood": 0,
                    "stone": 0,
                    "gems": 1
                  }
                },
                {
                  "type": "Dragon",
                  "count": 1,
                  "growth_per_week": 0,
                  "stats": {
                    "attack": 12,
                    "defense": 10,
                    "power": 8,
                    "knowledge": 4,
                    "movement_points": 8,
                    "movement_points_left": 8
                  },
                  "recruit_cost": {
                    "gold": 1000,
                    "wood": 5,
                    "stone": 5,
                    "gems": 5
                  }
                }
              ],
              "is_castle": true,
              "has_tavern": true,
              "can_recruit": true
            }
          ],
          "owner": "681b509ccad708339c638754"
        }
      ]
    },
    "ai": {
      "heroes": [],
      "resources": {
        "gold": 1000,
        "wood": 500,
        "stone": 300
      },
      "cities": []
    },
    "map": {
      "size": {
        "width": 20,
        "height": 20
      },
      "tiles": [],
      "fog_of_war": [],
      "explored": [],
      "visible_objects": []
    },
    "current_player": "ai"
  }
}
'''
        
        print("Sending predefined JSON data to GroQ API...")
        
        try:
            # Send prompt to Groq API and get response
            response = client.send_message(json_prompt)
            
            # Print the response
            print("\n--- GROQ RESPONSE ---")
            print(response.choices[0].message.content)
            print(f"\nModel used: {client.default_model}")
            
        except Exception as e:
            print(f"Error: {e}")
    elif choice.lower() in ["exit", "quit", "salir"]:
        print("Exiting program...")
    else:
        print("Invalid choice. Exiting...")
