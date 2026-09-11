from fastapi import Depends,Cookie
from routes.auth import verify_token
import jwt
from dotenv import load_dotenv
import os

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")

def isAuthenticated(access_token):
    if access_token:
        payload=verify_token(access_token)
        return payload
    else:
        return None