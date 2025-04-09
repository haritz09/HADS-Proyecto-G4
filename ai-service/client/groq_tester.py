"""
Script para realizar pruebas con la API de GroQ

Este módulo permite probar la conexión con la API de GroQ,
enviar diferentes prompts y verificar las respuestas.
"""

import os
import sys
import time

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

if __name__ == "__main__":
    print("=== TESTER DE GROQ ===")
    print("1. Ejecutar test básico de conexión")
    print("2. Listar modelos disponibles")
    print("3. Ejecutar test interactivo")
    print("4. Probar con un prompt personalizado")
    print("5. Salir")
    
    option = input("\nSelecciona una opción (1-5): ")
    
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
        print("Saliendo...")
    
    else:
        print("Opción no válida")
