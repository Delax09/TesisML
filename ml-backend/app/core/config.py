from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str
    DATABASE_URL: str
    API_V1_STR: str

    class Config:
        env_file = ".env"

settings = Settings()