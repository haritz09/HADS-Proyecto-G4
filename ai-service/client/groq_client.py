"""
Cliente para la API de GroQ

Implementar:
- Conexión con la API de GroQ
- Métodos para enviar prompts y recibir respuestas
- Gestión de tokens y límites
- Manejo básico de errores en las llamadas a la API
"""

import os

from groq import Groq

client = Groq(
    api_key=os.environ.get("API_KEY"),
)

chat_completion = client.chat.completions.create(
    messages=[
        {
            "role": "user",
            "content": "Explain the importance of fast language models",
        }
    ],
    model="llama-3.3-70b-versatile",
)

print(chat_completion.choices[0].message.content)