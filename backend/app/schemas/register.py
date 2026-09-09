from pydantic import BaseModel

class CreateAccountForm(BaseModel):
    full_name:str
    mobile_number:str
    farmer_id:str|None
    state:str
    district:str
    village:str
    password:str