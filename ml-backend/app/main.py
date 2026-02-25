from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime

#Modelos y Schemas
from app.models.models import Sector, Empresa
from app.schemas.schemas import (
    SectorCreate, SectorOut, SectorUpdate,
    EmpresaCreate, EmpresaOut, EmpresaUpdate
)
from app.db.sessions import get_db
from app.core.config import settings

app = FastAPI(title=settings.PROJECT_NAME)

# Configuración de CORS para que tu React pueda hablar con este backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En producción pondrás la URL de tu frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "online", "project": settings.PROJECT_NAME}

#Sectores
@app.post("/api/v1/sectores", response_model=SectorOut)
def CrearSector(sector: SectorCreate, db: Session = Depends(get_db)):
    nuevo_sector = Sector(NombreSector=sector.NombreSector)
    db.add(nuevo_sector)
    db.commit()
    db.refresh(nuevo_sector)
    return nuevo_sector

@app.get("/api/v1/sectores", response_model=list[SectorOut])
def ObtenerSectores(db: Session = Depends(get_db)):
    sectores = db.query(Sector).all()
    return sectores

@app.get("/api/v1/sectores/{sector_id}", response_model=SectorOut)
def ObtenerSectorXid(sector_id: int, db: Session = Depends(get_db)):
    sector = db.query(Sector).filter(Sector.IdSector == sector_id).first()
    if not sector:
        raise HTTPException(status_code=404, detail="Sector no encontrado")
    return sector

@app.get("/api/v1/sectores/{sector_id}/empresas", response_model=list[EmpresaOut])
def ObtenerEmpresasPorSector(sector_id: int, db: Session = Depends(get_db)):
    sector = db.query(Sector).filter(Sector.IdSector == sector_id).first()
    if not sector:
        raise HTTPException(status_code=404, detail="Sector no encontrado")
    empresas = db.query(Empresa).filter(Empresa.IdSector == sector_id).all()
    return empresas

@app.put("/api/v1/sectores/{sector_id}", response_model=SectorOut)
def actualizar_sector(sector_id: int, sector_data: SectorUpdate, db: Session = Depends(get_db)):
    db_sector = db.query(Sector).filter(Sector.IdSector == sector_id).first()
    if not db_sector:
        raise HTTPException(status_code=404, detail="Sector no encontrado")
    
    if sector_data.NombreSector:
        db_sector.NombreSector = sector_data.NombreSector
    
    db.commit()
    db.refresh(db_sector)
    return db_sector

@app.delete("/api/v1/sectores/{sector_id}")
def eliminar_sector(sector_id: int, db: Session = Depends(get_db)):
    db_sector = db.query(Sector).filter(Sector.IdSector == sector_id).first()
    if not db_sector:
        raise HTTPException(status_code=404, detail="Sector no encontrado")
    
    db.delete(db_sector)
    db.commit()
    return {"message": f"Sector {sector_id} eliminado correctamente"}

#Empresas
@app.post("/api/v1/empresas", response_model=EmpresaOut)
def crear_empresa(empresa: EmpresaCreate, db: Session = Depends(get_db)):
    # Validar que el sector exista antes de crear la empresa
    sector_existe = db.query(Sector).filter(Sector.IdSector == empresa.IdSector).first()
    if not sector_existe:
        raise HTTPException(status_code=404, detail="El sector especificado no existe")

    # Validar que el Ticket no esté duplicado
    ticket_existe = db.query(Empresa).filter(Empresa.Ticket == empresa.Ticket).first()
    if ticket_existe:
        raise HTTPException(status_code=400, detail="Este Ticket ya está registrado")

    nueva_empresa = Empresa(
        Ticket=empresa.Ticket,
        NombreEmpresa=empresa.NombreEmpresa,
        IdSector=empresa.IdSector,
        FechaAgregado=datetime.utcnow()
    )
    
    db.add(nueva_empresa)
    db.commit()
    db.refresh(nueva_empresa)
    return nueva_empresa

@app.get("/api/v1/empresas", response_model=list[EmpresaOut])
def obtener_empresas(db: Session = Depends(get_db)):
    return db.query(Empresa).all()

@app.get("/api/v1/empresas/{empresa_id}", response_model=EmpresaOut)
def obtener_empresa_por_id(empresa_id: int, db: Session = Depends(get_db)):
    empresa = db.query(Empresa).filter(Empresa.IdEmpresa == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return empresa

@app.put("/api/v1/empresas/{empresa_id}", response_model=EmpresaOut)
def actualizar_empresa(empresa_id: int, empresa_data: EmpresaUpdate, db: Session = Depends(get_db)):
    db_empresa = db.query(Empresa).filter(Empresa.IdEmpresa == empresa_id).first()
    if not db_empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    # Actualización dinámica de campos
    update_data = empresa_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_empresa, key, value)
    
    db.commit()
    db.refresh(db_empresa)
    return db_empresa

@app.delete("/api/v1/empresas/{empresa_id}")
def eliminar_empresa(empresa_id: int, db: Session = Depends(get_db)):
    db_empresa = db.query(Empresa).filter(Empresa.IdEmpresa == empresa_id).first()
    if not db_empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    db.delete(db_empresa)
    db.commit()
    return {"message": f"Empresa {db_empresa.Ticket} eliminada correctamente"}