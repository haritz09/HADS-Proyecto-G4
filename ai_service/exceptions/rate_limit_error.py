class RateLimitExceededError(Exception):
    """
    Excepción que se lanza cuando se alcanza el límite de tasa en la API (error 429).
    """
    
    def __init__(self, message="Se ha excedido el límite de tokens de la API", 
                 retry_after=None, model=None, original_exception=None):
        """
        Inicializa la excepción de límite de tasa excedido.
        
        Args:
            message (str): Mensaje descriptivo del error
            retry_after (int, optional): Tiempo sugerido de espera en segundos antes de reintentar
            model (str, optional): Modelo en el que se produjo el error de límite
            original_exception (Exception, optional): La excepción original que causó este error
        """
        self.retry_after = retry_after
        self.model = model
        self.original_exception = original_exception
        
        # Construir un mensaje más detallado si hay información adicional
        if model:
            message += f" para el modelo {model}"
        if retry_after:
            message += f". Reintenta después de {retry_after} segundos"
        
        super().__init__(message)
    
    def __str__(self):
        return self.args[0]
