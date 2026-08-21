import os

class Config:
    PORT = int(os.getenv("PORT", 8000))
    HOST = os.getenv("HOST", "0.0.0.0")
    DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
    CONTRACTS_FILE = os.path.join(DATA_DIR, "contracts.json")
    DEFAULT_GST_RATE = 0.18

config = Config()
