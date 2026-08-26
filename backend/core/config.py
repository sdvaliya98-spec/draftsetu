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

    # Razorpay Payment Gateway Configurations
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "rzp_test_placeholder")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "")
    RAZORPAY_WEBHOOK_SECRET: str = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

    # Configurable Recharge Plans (Server-authoritative for pricing and credit values)
    RECHARGE_PLANS: list[dict] = [
        {
            "id": "plan_100",
            "credits": 100,
            "amount_in_inr": 199,
            "amount_in_paise": 19900,
            "title_gu": "સ્ટાર્ટર પેક (Starter Pack)",
            "title_en": "Starter Pack (100 Credits)",
            "badge_gu": "શરૂઆત માટે",
            "popular": False,
            "description_gu": "100 ક્રેડિટ્સ - નવા વપરાશકર્તાઓ માટે શ્રેષ્ઠ",
            "savings_percent": 0
        },
        {
            "id": "plan_500",
            "credits": 500,
            "amount_in_inr": 799,
            "amount_in_paise": 79900,
            "title_gu": "પોપ્યુલર પેક (Popular Pack)",
            "title_en": "Popular Pack (500 Credits)",
            "badge_gu": "સૌથી લોકપ્રિય (20% બચત)",
            "popular": True,
            "description_gu": "500 ક્રેડિટ્સ - નિયમિત દસ્તાવેજ બનાવટ માટે",
            "savings_percent": 20
        },
        {
            "id": "plan_1000",
            "credits": 1000,
            "amount_in_inr": 1299,
            "amount_in_paise": 129900,
            "title_gu": "પ્રો વેલ્યુ પેક (Pro Value Pack)",
            "title_en": "Pro Pack (1000 Credits)",
            "badge_gu": "શ્રેષ્ઠ કિંમત (35% બચત)",
            "popular": False,
            "description_gu": "1000 ક્રેડિટ્સ - વકીલો અને દસ્તાવેજ નિષ્ણાતો માટે",
            "savings_percent": 35
        }
    ]

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
        env_file = [
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", ".env"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
            ".env"
        ]
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
