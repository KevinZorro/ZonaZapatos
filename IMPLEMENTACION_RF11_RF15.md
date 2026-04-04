# Implementación RF11 y RF15 - ZonaZapatos

## Resumen

Se ha completado la implementación de los requisitos funcionales:
- **RF11**: Solicitud y gestión de devoluciones
- **RF15**: Envío de encuesta de satisfacción post-entrega

## Estructura de Archivos

### RF11 - Devoluciones

```
backend/app/devoluciones/
├── __init__.py          # Módulo de exportaciones
├── models.py            # Modelos ORM (Devolucion, EvidenciaDevolucion)
├── schemas.py           # Schemas Pydantic para validación
└── router.py            # Endpoints de la API
```

### RF15 - Encuestas

```
backend/app/encuestas/
├── __init__.py          # Módulo de exportaciones
├── models.py            # Modelo ORM (EncuestaSatisfaccion)
├── schemas.py           # Schemas Pydantic para validación
└── router.py            # Endpoints de la API
```

### Pedidos (Integración)

```
backend/app/pedidos/
├── __init__.py          # Módulo de exportaciones
├── models.py            # Modelos ORM (Pedido, ItemPedido)
├── schemas.py           # Schemas Pydantic
└── router.py            # Endpoints actualizados (marcar_entregado genera encuesta)
```

## Endpoints Implementados

### RF11 - Devoluciones

#### POST `/devoluciones`
- **Descripción**: Crear una nueva devolución
- **Auth**: Cliente
- **Body**: `DevolucionCreate` (pedido_id, motivo, comentario)
- **Reglas**:
  - Solo el cliente propietario del pedido puede solicitar devolución
  - El pedido debe estar en estado **"entregado"**
  - No se permiten devoluciones duplicadas para un mismo pedido
  - El pedido debe existir

#### GET `/devoluciones/{devolucion_id}`
- **Descripción**: Obtener detalles de una devolución
- **Auth**: Público (cualquier usuario autenticado)
- **Response**: `DevolucionOut`

#### GET `/devoluciones`
- **Descripción**: Listar devoluciones con paginación y filtros
- **Auth**: Público
- **Query Params**: 
  - `page` (default: 1)
  - `page_size` (default: 20, max: 100)
  - `estado` (opcional: solicitada, en_revision, aprobada, rechazada)
- **Response**: `DevolucionListResponse`

#### GET `/devoluciones/pedido/{pedido_id}`
- **Descripción**: Obtener devolución de un pedido específico
- **Auth**: Público
- **Response**: `DevolucionOut | None`

#### PUT `/devoluciones/{devolucion_id}`
- **Descripción**: Actualizar una devolución
- **Auth**: Cliente (solo propietario)
- **Body**: `DevolucionUpdate` (motivo, comentario opcionales)
- **Reglas**: Solo editable en estado "solicitada"

#### PUT `/devoluciones/{devolucion_id}/estado`
- **Descripción**: Actualizar estado de una devolución
- **Auth**: Empresa, Admin
- **Body**: `DevolucionEstadoUpdate` (estado)
- **Estados válidos**: solicitada, en_revision, aprobada, rechazada

#### DELETE `/devoluciones/{devolucion_id}`
- **Descripción**: Eliminar una devolución
- **Auth**: Cliente (solo propietario)
- **Reglas**: Solo eliminable en estado "solicitada"

### RF15 - Encuestas

#### Generación Automática
- **Trigger**: Cuando un pedido se marca como "entregado" mediante `PUT /pedidos/{pedido_id}/entregar`
- **Acción**: El sistema genera automáticamente una encuesta asociada al pedido
- **Estado inicial**: `respondida=False`, `omitida=False`

#### GET `/encuestas/mis-pendientes`
- **Descripción**: Obtener encuestas pendientes del cliente
- **Auth**: Cliente
- **Response**: Lista de `EncuestaOut`

#### GET `/encuestas/pedido/{pedido_id}`
- **Descripción**: Obtener encuesta de un pedido específico
- **Auth**: Cliente
- **Response**: `EncuestaOut | None`

#### POST `/encuestas`
- **Descripción**: Crear encuesta para un pedido
- **Auth**: Cliente
- **Body**: `EncuestaCreate` (pedido_id)
- **Reglas**:
  - Solo se puede encuestar pedidos en estado "entregado"
  - Un pedido solo puede tener una encuesta

#### POST `/encuestas/{encuesta_id}/responder`
- **Descripción**: Responder una encuesta
- **Auth**: Cliente
- **Body**: `EncuestaResponder` (calificacion: 1-5, comentario: opcional)
- **Reglas**: No se puede responder si ya fue respondida u omitida

#### POST `/encuestas/{encuesta_id}/omitir`
- **Descripción**: Omitir una encuesta
- **Auth**: Cliente
- **Body**: `EncuestaOmitir` (motivo: opcional)
- **Reglas**: No se puede omitir si ya fue respondida u omitida

#### GET `/encuestas`
- **Descripción**: Listar todas las encuestas (admin/empresa)
- **Auth**: Empresa, Admin
- **Query Params**:
  - `page` (default: 1)
  - `page_size` (default: 20, max: 100)
  - `respondida` (opcional: true/false)
- **Response**: `EncuestaListResponse`

#### GET `/encuestas/estadisticas`
- **Descripción**: Obtener estadísticas de encuestas
- **Auth**: Empresa, Admin
- **Response**: `EncuestaEstadisticas` (total, respondidas, omitidas, calificacion_promedio, porcentaje_respuesta)

#### GET `/encuestas/{encuesta_id}`
- **Descripción**: Obtener detalles de una encuesta
- **Auth**: Empresa, Admin
- **Response**: `EncuestaOut`

#### GET `/encuestas/detalle/pedido/{pedido_id}`
- **Descripción**: Obtener encuesta por ID de pedido
- **Auth**: Público (cualquier usuario autenticado)
- **Response**: `EncuestaOut | None`

### Pedidos (Integración con RF15)

#### PUT `/pedidos/{pedido_id}/entregar`
- **Descripción**: Marcar pedido como entregado y generar encuesta automática
- **Auth**: Empresa, Admin
- **Acción automática**: Crea una `EncuestaSatisfaccion` asociada al pedido

#### PUT `/pedidos/{pedido_id}/estado`
- **Descripción**: Actualizar estado de un pedido
- **Auth**: Empresa, Admin
- **Acción automática**: Si el nuevo estado es "entregado", genera la encuesta

## Modelos de Datos

### Devolucion (RF11)

```python
class Devolucion:
    id: int                    # Primary key
    motivo: str               # Motivo principal (max 255)
    descripcion: str          # Descripción detallada (texto largo)
    comentario: str           # Alias para compatibilidad
    estado: EstadoDevolucionEnum  # solicitada, en_revision, aprobada, rechazada
    fecha_solicitud: datetime # Fecha de creación
    fecha_resolucion: datetime # Fecha de aprobación/rechazo
    pedido_id: int            # Foreign key única a Pedido
    
    # Relaciones
    pedido: Pedido
    evidencias: list[EvidenciaDevolucion]
```

### EvidenciaDevolucion (RF11)

```python
class EvidenciaDevolucion:
    id: int                   # Primary key
    cloudinary_url: str       # URL del archivo en Cloudinary
    cloudinary_public_id: str # ID público en Cloudinary
    tipo_archivo: TipoArchivoEnum  # imagen, video
    devolucion_id: int        # Foreign key a Devolucion
```

### EncuestaSatisfaccion (RF15)

```python
class EncuestaSatisfaccion:
    id: int                   # Primary key
    calificacion: int         # 1-5 estrellas (nullable)
    comentario: str           # Comentario del cliente (texto largo)
    respondida: bool          # Si fue respondida
    omitida: bool             # Si fue omitida
    motivo_omision: str       # Motivo de omisión (opcional)
    enviada_en: datetime      # Fecha de creación (automática al entregar)
    respondida_en: datetime   # Fecha de respuesta (nullable)
    pedido_id: int            # Foreign key única a Pedido
    
    # Relaciones
    pedido: Pedido
```

## Reglas de Negocio

### Devoluciones (RF11)

1. **Creación**:
   - Solo clientes pueden solicitar devoluciones
   - El pedido debe existir y pertenecer al cliente
   - **El pedido debe estar en estado "entregado"**
   - No se permiten devoluciones duplicadas para un mismo pedido
   - Estado inicial: "solicitada"

2. **Edición**:
   - Solo el cliente propietario puede editar
   - Solo editable en estado "solicitada"
   - Se puede modificar motivo y comentario

3. **Gestión de Estado**:
   - Solo empresa y admin pueden cambiar estado
   - Estados: solicitada → en_revision → aprobada/rechazada
   - Al aprobar/rechazar, se registra fecha de resolución

4. **Eliminación**:
   - Solo el cliente propietario puede eliminar
   - Solo eliminable en estado "solicitada"

### Encuestas (RF15)

1. **Generación Automática**:
   - El sistema detecta cuando un pedido cambia a estado "entregado"
   - Genera automáticamente una encuesta asociada al pedido
   - La encuesta se crea con `enviada_en = now()`

2. **Respuesta**:
   - Solo el cliente propietario puede responder
   - Calificación obligatoria (1-5)
   - Comentario opcional
   - No se puede modificar después de respondida

3. **Omision**:
   - Solo el cliente propietario puede omitir
   - Motivo de omisión opcional
   - No se puede responder después de omitida

4. **Estadísticas**:
   - Solo empresa y admin pueden ver estadísticas
   - Incluye: total, respondidas, omitidas, promedio, porcentaje

## Flujo Completo RF15

```
1. Empresa marca pedido como "entregado"
   PUT /pedidos/{pedido_id}/entregar
   
2. Sistema detecta el cambio de estado
   
3. Sistema genera automáticamente la encuesta
   - Crea EncuestaSatisfaccion con:
     * pedido_id = {pedido_id}
     * respondida = False
     * omitida = False
     * enviada_en = now()
   
4. Cliente recibe notificación (frontend/email)
   
5. Cliente responde encuesta
   POST /encuestas/{encuesta_id}/responder
   {
     "calificacion": 5,
     "comentario": "Excelente producto y servicio"
   }
   
6. Sistema registra respuesta
   - respondida = True
   - respondida_en = now()
   - calificacion = 5
   - comentario = "Excelente producto y servicio"
```

## Validaciones Implementadas

### Devoluciones

- ✅ Pedido existe
- ✅ Pedido pertenece al cliente
- ✅ **Pedido está en estado "entregado"**
- ✅ No hay devolución previa para el mismo pedido
- ✅ Estado válido en actualizaciones
- ✅ Solo editable/eliminable en estado "solicitada"

### Encuestas

- ✅ Pedido existe
- ✅ Pedido pertenece al cliente
- ✅ Pedido está en estado "entregado"
- ✅ No hay encuesta previa para el mismo pedido
- ✅ Calificación entre 1 y 5
- ✅ No se puede responder/omitir si ya está respondida/omitida
- ✅ **Generación automática al marcar pedido como entregado**

## Integración con el Proyecto Existente

### 1. Actualización de `main.py`

Se agregó el import y registro del router de devoluciones:

```python
from app.devoluciones.router import router as devoluciones_router

# En la sección de routers:
app.include_router(devoluciones_router)
```

### 2. Relaciones con Pedidos

Los modelos existentes de Pedido ya tenían las relaciones definidas:

```python
# En pedidos/models.py
class Pedido(Base):
    devolucion = relationship("Devolucion", back_populates="pedido", uselist=False)
    encuesta = relationship("EncuestaSatisfaccion", back_populates="pedido", uselist=False)
```

### 3. Dependencias de Base de Datos

Todos los endpoints usan `Depends(get_db)` para obtener la sesión de base de datos.

### 4. Autenticación y Autorización

Se utiliza el sistema existente de `require_rol()`:
- `require_rol("cliente")` para endpoints de clientes
- `require_rol("empresa", "admin")` para endpoints de empresa/admin

## Pruebas de Integración

Para probar la implementación:

1. **Iniciar el servidor**:
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

2. **Acceder a Swagger UI**:
   ```
   http://localhost:8000/docs
   ```

3. **Probar RF15 (Encuestas)**:
   - Autenticarse como empresa/admin
   - Marcar un pedido como entregado: `PUT /pedidos/{pedido_id}/entregar`
   - Verificar que se creó la encuesta automáticamente
   - Autenticarse como cliente
   - Listar encuestas pendientes: `GET /encuestas/mis-pendientes`
   - Responder encuesta: `POST /encuestas/{encuesta_id}/responder`

4. **Probar RF11 (Devoluciones)**:
   - Autenticarse como cliente
   - Crear devolución para pedido entregado: `POST /devoluciones`
   - Verificar que solo permite pedidos en estado "entregado"
   - Autenticarse como empresa
   - Cambiar estado de devolución: `PUT /devoluciones/{devolucion_id}/estado`

## Notas Técnicas

1. **Compatibilidad**: Se mantuvo el campo `comentario` en Devolucion como alias de `descripcion` para compatibilidad con el código existente.

2. **Fechas**: Todas las fechas usan timezone UTC para consistencia.

3. **Paginación**: Implementada en listados con parámetros `page` y `page_size`.

4. **Errores**: Se usan HTTPException con códigos de estado apropiados:
   - 400: Bad Request (validaciones)
   - 403: Forbidden (permisos)
   - 404: Not Found (recursos no existentes)
   - 409: Conflict (recursos duplicados)

5. **Documentación**: Todos los endpoints incluyen `summary` y `description` para Swagger/OpenAPI.

6. **Generación Automática**: La encuesta se genera automáticamente cuando:
   - Se llama a `PUT /pedidos/{pedido_id}/entregar`
   - Se llama a `PUT /pedidos/{pedido_id}/estado` con `estado=entregado`

## Próximos Pasos (Opcional)

1. **Notificaciones por Email**: Enviar email automático al cliente cuando se genera la encuesta
2. **Adjuntos**: Implementar upload de evidencias a Cloudinary
3. **Reportes**: Generar reportes PDF de devoluciones
4. **Métricas**: Dashboard avanzado de estadísticas de encuestas
5. **Validaciones adicionales**: Límite de tiempo para devoluciones (ej: 30 días después de entrega)
6. **Motivos predefinidos**: Lista de motivos de devolución seleccionables