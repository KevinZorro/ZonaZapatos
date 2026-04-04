"""Dashboard + Analisis + Prediccion router — stubs ready for Phase 6 & 7."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_rol

router = APIRouter(prefix="/empresa", tags=["dashboard", "analisis", "prediccion"])

_P6 = "Implementación pendiente — Fase 6"
_P7 = "Implementación pendiente — Fase 7"


@router.get("/dashboard", dependencies=[Depends(require_rol("empresa"))])
def get_dashboard(db: Session = Depends(get_db)):
    raise HTTPException(status_code=501, detail=_P6)


@router.get(
    "/analisis-devoluciones", dependencies=[Depends(require_rol("empresa"))]
)
def get_analisis_devoluciones(db: Session = Depends(get_db)):
    raise HTTPException(status_code=501, detail=_P7)


@router.get(
    "/prediccion/{producto_id}", dependencies=[Depends(require_rol("empresa"))]
)
def get_prediccion(producto_id: int, db: Session = Depends(get_db)):
    raise HTTPException(status_code=501, detail=_P7)
