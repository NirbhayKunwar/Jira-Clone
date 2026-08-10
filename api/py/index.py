import sys
import os

# Add backend_fastapi path to sys.path for Vercel Python runtime
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../backend_fastapi')))

from app.main import app
