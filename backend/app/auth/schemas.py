"""Auth schemas — request/response bodies for registration and login."""
from pydantic import BaseModel, EmailStr, field_validator


class RegistroEmpresaRequest(BaseModel):
    correo: EmailStr
    password: str
    nombre: str
    nit: str
    direccion: str | None = None
    ciudad: str | None = None
    whatsapp: str | None = None
    telefono: str | None = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v


class RegistroClienteRequest(BaseModel):
    correo: EmailStr
    password: str
    nombre: str
    telefono: str | None = None
    direccion: str | None = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v


class LoginRequest(BaseModel):
    correo: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    rol: str


class MsgResponse(BaseModel):
    msg: str
