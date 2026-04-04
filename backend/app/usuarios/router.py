"""Usuarios router — perfil del usuario autenticado."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.cloudinary_client import upload_file, delete_file
from app.usuarios.models import Usuario, Cliente, Empresa

router = APIRouter(prefix="/me", tags=["perfil"])


# ── Schemas ──────────────────────────────────────────────────────────────────
class PerfilOut(BaseModel):
    id: int
    correo: str
    rol: str
    foto_url: str | None = None
    telefono: str | None = None
    # cliente
    nombre: str | None = None
    direccion: str | None = None
    # empresa
    nit: str | None = None
    ciudad: str | None = None
    whatsapp: str | None = None
    logo_url: str | None = None

    model_config = {"from_attributes": True}


class PerfilUpdate(BaseModel):
    telefono: str | None = None
    # cliente
    nombre: str | None = None
    direccion: str | None = None
    # empresa
    ciudad: str | None = None
    whatsapp: str | None = None


# ── Helper ───────────────────────────────────────────────────────────────────
def _get_usuario(user_id: int, db: Session) -> Usuario:
    usuario = db.query(Usuario).filter(
        Usuario.id == user_id,
        Usuario.cuenta_confirmada == True,
    ).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario


def _build_perfil(usuario: Usuario) -> PerfilOut:
    data = {
        "id": usuario.id,
        "correo": usuario.correo,
        "rol": usuario.rol.value,
        "foto_url": usuario.foto_url,
        "telefono": usuario.telefono,
    }
    if usuario.cliente:
        data["nombre"] = usuario.cliente.nombre
        data["direccion"] = usuario.cliente.direccion
    if usuario.empresa:
        data["nombre"] = usuario.empresa.nombre
        data["nit"] = usuario.empresa.nit
        data["ciudad"] = usuario.empresa.ciudad
        data["whatsapp"] = usuario.empresa.whatsapp
        data["logo_url"] = usuario.empresa.logo_url
    return PerfilOut(**data)


# ── GET /me ──────────────────────────────────────────────────────────────────
@router.get("", response_model=PerfilOut)
def get_perfil(
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    usuario = _get_usuario(int(payload["sub"]), db)
    return _build_perfil(usuario)


# ── PUT /me ──────────────────────────────────────────────────────────────────
@router.put("", response_model=PerfilOut)
def update_perfil(
    body: PerfilUpdate,
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    usuario = _get_usuario(int(payload["sub"]), db)

    if body.telefono is not None:
        usuario.telefono = body.telefono

    if usuario.cliente:
        if body.nombre is not None:
            usuario.cliente.nombre = body.nombre
        if body.direccion is not None:
            usuario.cliente.direccion = body.direccion

    if usuario.empresa:
        if body.nombre is not None:
            usuario.empresa.nombre = body.nombre
        if body.ciudad is not None:
            usuario.empresa.ciudad = body.ciudad
        if body.whatsapp is not None:
            usuario.empresa.whatsapp = body.whatsapp

    db.commit()
    db.refresh(usuario)
    return _build_perfil(usuario)


# ── POST /me/foto ─────────────────────────────────────────────────────────────
@router.post("/foto", response_model=PerfilOut)
def upload_foto(
    file: UploadFile = File(...),
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes")

    usuario = _get_usuario(int(payload["sub"]), db)

    # Eliminar foto anterior si existe
    if usuario.foto_url and "cloudinary" in usuario.foto_url:
        try:
            # Extraer public_id del URL (simplificado)
            public_id = usuario.foto_url.split("/upload/")[1].rsplit(".", 1)[0]
            delete_file(public_id)
        except Exception:
            pass

    result = upload_file(file.file, folder="perfiles")
    usuario.foto_url = result["cloudinary_url"]
    db.commit()
    db.refresh(usuario)
    return _build_perfil(usuario)


# ── DELETE /me — soft delete ──────────────────────────────────────────────────
@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_cuenta(
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    usuario = _get_usuario(int(payload["sub"]), db)
    usuario.cuenta_confirmada = False
    db.commit()
