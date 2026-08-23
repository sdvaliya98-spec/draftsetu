import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "TheLegalSetu"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "DEVELOPMENT_SECRET_KEY_REPLACE_IN_PROD")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    CORS_ORIGINS: list[str] = ["*"]
    ENV: str = os.getenv("ENV", os.getenv("ENVIRONMENT", "development"))

    # Wallet Configurations
    WALLET_ENABLED: bool = True
    SIGNUP_BONUS_CREDITS: int = 100
    DEFAULT_CREDIT_COST: int = 10
    SUPPORT_WHATSAPP_NUMBER: str = "919999999999"
    SUPPORT_UPI_ID: str = "legalsetu@upi"

    # Server Config
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", 8000))

    # Database
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'document_system.db')}")

    # Storage
    UPLOAD_DIR: str = os.path.join(BASE_DIR, "uploads")
    TEMPLATE_STORAGE: str = os.path.join(UPLOAD_DIR, "templates_storage")
    OUTPUT_DIR: str = os.path.join(UPLOAD_DIR, "outputs")
    TEMP_RENDERS_DIR: str = os.path.join(UPLOAD_DIR, "temp_renders")
    TEMP_PREVIEWS_DIR: str = os.path.join(UPLOAD_DIR, "temp_previews")

    @property
    def ALL_DIRS(self):
        return [self.UPLOAD_DIR, self.TEMPLATE_STORAGE, self.OUTPUT_DIR, self.TEMP_RENDERS_DIR, self.TEMP_PREVIEWS_DIR]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Security Check
is_production = settings.ENV.lower() in ("production", "prod")

if is_production:
    raw_secret_key = os.getenv("SECRET_KEY")
    if not raw_secret_key or raw_secret_key == "DEVELOPMENT_SECRET_KEY_REPLACE_IN_PROD":
        import sys
        sys.stderr.write(
            "\n"
            "========================================================================\n"
            "CRITICAL CONFIGURATION ERROR:\n"
            "The application is running in PRODUCTION mode (ENV=production),\n"
            "but a valid, secure SECRET_KEY was not provided in the environment.\n"
            "Default development secret keys are strictly prohibited in production.\n"
            "Startup aborted.\n"
            "========================================================================\n"
            "\n"
        )
        raise ValueError("Insecure or missing SECRET_KEY in production environment.")
elif settings.SECRET_KEY == "DEVELOPMENT_SECRET_KEY_REPLACE_IN_PROD":
    print("WARNING: Using default SECRET_KEY. This is insecure for production.")
