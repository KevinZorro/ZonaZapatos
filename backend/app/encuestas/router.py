"""Encuestas router — stub endpoints ready for Phase 5."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_rol
from app.encuestas.schemas import EncuestaOut, EncuestaResponder

router = APIRouter(prefix="/encuestas", tags=["encuestas"])

_P5 = "Implementación pendiente — Fase 5"


@router.get(
    "/pendiente",
    response_model=EncuestaOut | None,
    dependencies=[Depends(require_rol("cliente"))],
)
def get_encuesta_pendiente(db: Session = Depends(get_db)):
    raise HTTPException(status_code=501, detail=_P5)


@router.post(
    "/{encuesta_id}/responder",
    response_model=EncuestaOut,
    dependencies=[Depends(require_rol("cliente"))],
)
def responder_encuesta(
    encuesta_id: int, body: EncuestaResponder, db: Session = Depends(get_db)
):
    raise HTTPException(status_code=501, detail=_P5)


@router.post(
    "/{encuesta_id}/omitir",
    response_model=EncuestaOut,
    dependencies=[Depends(require_rol("cliente"))],
)
def omitir_encuesta(encuesta_id: int, db: Session = Depends(get_db)):
    raise HTTPException(status_code=501, detail=_P5)
