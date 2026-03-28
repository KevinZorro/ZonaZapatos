"""Auth router — registro, login, confirmación de cuenta."""
from datetime import timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.auth.schemas import (
    MsgResponse,
    RegistroClienteRequest,
    RegistroEmpresaRequest,
    TokenResponse,
)
from app.core.database import get_db
from app.core.email import send_confirmation_email
from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.usuarios.models import Cliente, Empresa, RolEnum, Usuario

router = APIRouter(prefix="/auth", tags=["auth"])

# Confirmation tokens live 24 h
CONFIRM_TOKEN_EXPIRE = timedelta(hours=24)


# ── Helpers ─────────────────────────────────────────────────────────────────
def _get_user_by_email(db: Session, correo: str) -> Usuario | None:
    return db.query(Usuario).filter(Usuario.correo == correo).first()


# ── Registro Empresa ─────────────────────────────────────────────────────────
@router.post(
    "/registro/empresa",
    response_model=MsgResponse,
    status_code=status.HTTP_201_CREATED,
)
def registro_empresa(
    body: RegistroEmpresaRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    if _get_user_by_email(db, body.correo):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El correo ya está registrado",
        )

    nit_exists = db.query(Empresa).filter(Empresa.nit == body.nit).first()
    if nit_exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El NIT ya está registrado",
        )

    usuario = Usuario(
        correo=body.correo,
        password_hash=hash_password(body.password),
        rol=RolEnum.empresa,
        telefono=body.telefono,
    )
    db.add(usuario)
    db.flush()  # get usuario.id without committing

    empresa = Empresa(
        usuario_id=usuario.id,
        nombre=body.nombre,
        nit=body.nit,
        direccion=body.direccion,
        ciudad=body.ciudad,
        whatsapp=body.whatsapp,
    )
    db.add(empresa)
    db.commit()

    confirm_token = create_access_token(
        {"sub": str(usuario.id), "purpose": "confirm"},
        expires_delta=CONFIRM_TOKEN_EXPIRE,
    )
    background_tasks.add_task(send_confirmation_email, body.correo, confirm_token)

    return {"msg": "Empresa registrada. Revisa tu correo para confirmar la cuenta."}


# ── Registro Cliente ─────────────────────────────────────────────────────────
@router.post(
    "/registro/cliente",
    response_model=MsgResponse,
    status_code=status.HTTP_201_CREATED,
)
def registro_cliente(
    body: RegistroClienteRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    if _get_user_by_email(db, body.correo):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El correo ya está registrado",
        )

    usuario = Usuario(
        correo=body.correo,
        password_hash=hash_password(body.password),
        rol=RolEnum.cliente,
        telefono=body.telefono,
    )
    db.add(usuario)
    db.flush()

    cliente = Cliente(
        usuario_id=usuario.id,
        nombre=body.nombre,
        telefono=body.telefono,
        direccion=body.direccion,
    )
    db.add(cliente)
    db.commit()

    confirm_token = create_access_token(
        {"sub": str(usuario.id), "purpose": "confirm"},
        expires_delta=CONFIRM_TOKEN_EXPIRE,
    )
    background_tasks.add_task(send_confirmation_email, body.correo, confirm_token)

    return {"msg": "Cliente registrado. Revisa tu correo para confirmar la cuenta."}


# ── Login ────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    usuario = _get_user_by_email(db, form_data.username)
    if not usuario or not verify_password(form_data.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )
    if not usuario.cuenta_confirmada:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Debes confirmar tu correo antes de iniciar sesión",
        )

    token = create_access_token({"sub": str(usuario.id), "rol": usuario.rol.value})
    return TokenResponse(access_token=token, rol=usuario.rol.value)


# ── Confirmación de cuenta ───────────────────────────────────────────────────
@router.get("/confirmar/{token}", response_model=MsgResponse)
def confirmar_cuenta(token: str, db: Session = Depends(get_db)):
    payload = decode_token(token)
    if payload.get("purpose") != "confirm":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido"
        )

    user_id = int(payload["sub"])
    usuario = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if usuario.cuenta_confirmada:
        return {"msg": "La cuenta ya estaba confirmada"}

    usuario.cuenta_confirmada = True
    db.commit()
    return {"msg": "¡Cuenta confirmada exitosamente! Ya puedes iniciar sesión."}


# ── Logout (stateless stub + note) ───────────────────────────────────────────
@router.post("/logout", response_model=MsgResponse)
def logout():
    """
    Stateless logout — the client simply discards the token.
    For server-side invalidation add a token blacklist (Redis or DB table).
    """
    return {"msg": "Sesión cerrada. Elimina el token del cliente."}
