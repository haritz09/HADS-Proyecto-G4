from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # MongoDB settings
    MONGO_URI: str = Field(default="mongodb://localhost:27017", env="MONGO_URI")
    MONGO_DB_NAME: str = Field(default="mydatabase", env="MONGO_DB_NAME")
    
    
    # API settings
    api_key: str = Field(default="your_api_key", env="API_KEY")
    secret_key: str = Field(default="your_secret_key", env="SECRET_KEY")
    app_port: str = Field(default="3000", env="APP_PORT")
    groq_api_key: str = Field(default="", env="GROQ_API_KEY")  # Added this field
    
    # Environment settings
    node_env: str = Field(default="development", env="NODE_ENV")
    pythonpath: str = Field(default=".", env="PYTHONPATH")
    TEST_MODE: bool = Field(default=False, env="TEST_MODE")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

settings = Settings()