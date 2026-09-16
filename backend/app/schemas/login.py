from pydantic import BaseModel

class LoginForm(BaseModel):
    mobile_number: str
    password: str
