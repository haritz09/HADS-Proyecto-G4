"""
Script para realizar pruebas con la API de GroQ

Este módulo permite probar la conexión con la API de GroQ,
enviar diferentes prompts y verificar las respuestas.
"""

import os
import sys
import time
from groq_client import GroqClient
from ..exceptions.rate_limit_error import RateLimitExceededError

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
    """Test rate limit handling and model switching"""
    client = GroqClient()
    
    print("\n=== RATE LIMIT TEST ===")
    print(f"Starting model: {client.default_model}")
    
    # Create a long and complex prompt that's likely to hit token limits
    large_prompt = """
    Please write a detailed analysis of quantum computing, including:
    1. The history and evolution of quantum computing theories
    2. Key principles of quantum mechanics relevant to computing
    3. Major quantum computing approaches (superconducting, trapped ion, etc.)
    4. Current state of quantum hardware and limitations
    5. Quantum algorithms and their advantages over classical algorithms
    6. Potential applications in cryptography, material science, and drug discovery
    7. Major companies and research institutions involved
    8. Predictions for the future of quantum computing
    9. Challenges to overcome in quantum error correction
    10. Ethical and security implications of quantum computing advancements
    
    For each point, provide extensive details, examples, and references to key research.
    """
    
    # Send the same large request multiple times in quick succession
    max_attempts = 10
    initial_model = client.default_model
    
    print(f"Sending {max_attempts} large requests in succession...")
    
    for i in range(max_attempts):
        try:
            print(f"\nAttempt {i+1}/{max_attempts} using model: {client.default_model}")
            response = client.send_message(large_prompt)
            print(f"✅ Request succeeded with model: {client.default_model}")
            # Just print the first 100 characters of the response to keep output clean
            print(f"Response preview: {response.choices[0].message.content[:100]}...")
            time.sleep(1)  # Small delay between requests
            
        except RateLimitExceededError as e:
            print(f"🔄 Rate limit error detected: {str(e)}")
            print(f"Model switched from {e.model} to {client.default_model}")
            
        except Exception as e:
            print(f"❌ Unexpected error: {str(e)}")
    
    print(f"\nTest completed. Initial model: {initial_model}, Final model: {client.default_model}")
    if initial_model != client.default_model:
        print("✅ Rate limit test successful! Model switching worked.")
    else:
        print("⚠️ Model didn't change. Either rate limit wasn't reached or switching failed.")


if __name__ == "__main__":
    print("=== TESTER DE GROQ ===")
    print("1. Ejecutar test básico de conexión")
    print("2. Listar modelos disponibles")
    print("3. Ejecutar test interactivo")
    print("4. Probar con un prompt personalizado")
    print("5. Ejecutar pruebas adicionales")
    print("6. Salir")
    
    option = input("\nSelecciona una opción (1-6): ")
    
    if option == "1":
        success = test_groq_connection()
        if success:
            print("\n✅ Conexión exitosa con GroQ")
        else:
            print("\n❌ Falló la prueba de conexión")
    
    elif option == "2":
        list_available_models()
    
    elif option == "3":
        run_interactive_test()
    
    elif option == "4":
        prompt = input("Ingresa tu prompt: ")
        test_groq_connection(prompt)
    
    elif option == "5":
        # Make sure API key is set
        if not os.environ.get("API_KEY"):
            print("Warning: API_KEY environment variable not set")
            print("Set it with: export API_KEY='your-groq-api-key'")
        
        # Run tests
        test_simple_message()
        test_json_response()
        test_rate_limit()
    
    elif option == "6":
        print("Saliendo...")
    
    else:
        print("Opción no válida")
