import os
import time
import logging
import requests
import traceback
from logging.handlers import RotatingFileHandler
from dotenv import load_dotenv

# Cloud Auth
import boto3
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

# Load Environment Variables
load_dotenv()

LM_STUDIO_URL = os.getenv("LM_STUDIO_URL", "http://localhost:1234/v1")
AWS_ROLE_ARN = os.getenv("AWS_ROLE_ARN", "arn:aws:iam::123456789012:role/DeepSeekWorkerRole")
AZURE_KEYVAULT_URL = os.getenv("AZURE_KEYVAULT_URL", "https://my-key-vault.vault.azure.net/")
SECRET_NAME = os.getenv("SECRET_NAME", "DeepSeekToken")

# ─── 1. Enterprise Logging ─────────────────────────────────────────────────────

log_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Ensure log directory exists
os.makedirs("/var/log/deepseek-worker", exist_ok=True)
log_file = "/var/log/deepseek-worker/daemon.log"

# Rotating file handler: Max 10MB per file, keep 5 backups
file_handler = RotatingFileHandler(log_file, maxBytes=10*1024*1024, backupCount=5)
file_handler.setFormatter(log_formatter)

logger = logging.getLogger("DeepSeekWorker")
logger.setLevel(logging.INFO)
logger.addHandler(file_handler)

# Console handler for debugging
console_handler = logging.StreamHandler()
console_handler.setFormatter(log_formatter)
logger.addHandler(console_handler)

logger.info("DeepSeek Worker Daemon starting up...")

# ─── 2. LM Studio Health Check ─────────────────────────────────────────────────

def is_lm_studio_healthy():
    """
    Pings the local LM Studio endpoint to ensure the model server is online.
    Prevents the worker from throwing errors or processing bad responses if the LLM crashes.
    """
    try:
        res = requests.get(f"{LM_STUDIO_URL}/models", timeout=5)
        if res.status_code == 200:
            return True
        logger.warning(f"LM Studio responded with HTTP {res.status_code}")
    except requests.exceptions.RequestException as e:
        logger.error(f"LM Studio Unreachable: {e}")
    return False

# ─── 3. Cloud Auth & STS Rotation ──────────────────────────────────────────────

def rotate_sts_token():
    """
    Assumes an AWS role to get an STS token.
    Then injects that token securely into Azure Key Vault.
    Returns True if successful, False otherwise.
    """
    logger.info("Initiating STS token rotation...")
    sts = boto3.client("sts")
    
    try:
        # 1. Fetch from AWS
        response = sts.assume_role(
            RoleArn=AWS_ROLE_ARN,
            RoleSessionName="DeepSeekAutonomousSession",
            DurationSeconds=43200  # 12 hours
        )
        token = response["Credentials"]["SessionToken"]
        logger.info("Successfully acquired new STS token from AWS.")

        # 2. Push to Azure Key Vault
        credential = DefaultAzureCredential()
        secret_client = SecretClient(vault_url=AZURE_KEYVAULT_URL, credential=credential)
        
        secret_client.set_secret(SECRET_NAME, token)
        logger.info(f"Successfully pushed token to Azure Key Vault under '{SECRET_NAME}'.")
        
        return True

    except Exception as e:
        logger.error(f"STS token rotation failed: {e}")
        logger.debug(traceback.format_exc())
        return False

# ─── 4. Main Worker Loop ───────────────────────────────────────────────────────

def main_loop():
    logger.info("Entering main orchestration loop.")
    
    while True:
        try:
            # 1. Check health
            if not is_lm_studio_healthy():
                logger.critical("LM Studio is offline. Pausing operations for 60 seconds.")
                time.sleep(60)
                continue
            
            # 2. Rotate Token (Try every 11.5 hours to avoid 12h expiration)
            # In a real async worker, this would be on a separate thread/timer.
            # Here we demonstrate the loop doing a rotation check.
            # For demonstration, we just trigger it once and sleep.
            success = rotate_sts_token()
            
            if not success:
                logger.warning("Token rotation failed. Retrying in 60 seconds...")
                time.sleep(60)
                continue
                
            logger.info("Worker is healthy and authenticated. Ready for agent tasks.")
            
            # 3. Task Processing
            # Here is where you would pop tasks off a Redis queue or RabbitMQ
            # queue populated by your Node.js mission_control.mjs
            # e.g., task = queue.pop() -> run_prompt_against_lm_studio(task)

            # Sleep for 11.5 hours before next rotation
            # (41400 seconds)
            time.sleep(41400)

        except Exception as e:
            logger.error(f"Unhandled exception in main loop: {e}")
            logger.debug(traceback.format_exc())
            logger.info("Attempting crash recovery in 10 seconds...")
            time.sleep(10)

if __name__ == "__main__":
    # Ensure environment is semi-configured
    if AWS_ROLE_ARN == "arn:aws:iam::123456789012:role/DeepSeekWorkerRole":
        logger.warning("Using default placeholder AWS_ROLE_ARN. STS will fail in production.")

    main_loop()
