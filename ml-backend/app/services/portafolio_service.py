from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models import Portafolio, Empresa, Usuario, Sector, PrecioHistorico
from app.schemas.schemas import PortafolioCreate, PortafolioUpdate
from app.exceptions import ResourceNotFoundError, InvalidDataError, DuplicateResourceError
from app.utils.horaformateada import obtener_hora_formateada as HoraFormat
import datetime
import math

class PortafolioService:
    @staticmethod
    def _validar_usuario_existe(db: Session, usuario_id: int) -> Usuario:
        usuario = db.query(Usuario).filter(Usuario.IdUsuario == usuario_id).first()
        if not usuario:
            raise InvalidDataError("El usuario especificado no existe")
        return usuario
    
    @staticmethod
    def _validar_empresa_existe(db: Session, empresa_id: int) -> Empresa:
        empresa = db.query(Empresa).filter(Empresa.IdEmpresa == empresa_id).first()
        if not empresa:
            raise InvalidDataError("La empresa especificada no existe")
        return empresa
    
    @staticmethod
    def crear_portafolio(db: Session, portafolio: PortafolioCreate):
        # 1. Validamos que el usuario y la empresa realmente existan en la BD
        PortafolioService._validar_usuario_existe(db, portafolio.IdUsuario)
        PortafolioService._validar_empresa_existe(db, portafolio.IdEmpresa)

        # 2. Buscamos si la relación Usuario-Empresa ya existe (activa o inactiva)
        portafolio_existente = db.query(Portafolio).filter(
            Portafolio.IdUsuario == portafolio.IdUsuario,
            Portafolio.IdEmpresa == portafolio.IdEmpresa
        ).first()

        if portafolio_existente:
            # 3. Si existe pero estaba "eliminada" (Activo = False), la revivimos
            if not portafolio_existente.Activo:
                portafolio_existente.Activo = True
                db.commit()
                db.refresh(portafolio_existente)
                return portafolio_existente
            else:
                # Si ya existe y está activa, lanzamos un error de duplicado
                raise DuplicateResourceError("Esta empresa ya se encuentra en tu portafolio activo.")

        # 4. Si no existe en absoluto, creamos el registro desde cero
        nuevo_portafolio = Portafolio(
            IdUsuario=portafolio.IdUsuario,
            IdEmpresa=portafolio.IdEmpresa,
            Activo=True # Por defecto nace activa
        )
        db.add(nuevo_portafolio)
        db.commit()
        db.refresh(nuevo_portafolio)
        
        return nuevo_portafolio

    @staticmethod
    def obtener_todos_portafolios(db: Session) -> list[Portafolio]:
        # CAMBIO: Agregamos el filtro Activo == True
        return db.query(Portafolio).filter(Portafolio.Activo == True).all()

    @staticmethod
    def obtener_portafolios_usuario(db: Session, usuario_id: int) -> list[Portafolio]:
        return db.query(Portafolio).filter(
            Portafolio.IdUsuario == usuario_id,
            Portafolio.Activo == True
        ).all()

    @staticmethod
    def obtener_portafolio_por_id(db: Session, portafolio_id: int) -> Portafolio:
        # CAMBIO: Aseguramos que solo devuelva si está activo
        portafolio = db.query(Portafolio).filter(
            Portafolio.IdPortafolio == portafolio_id,
            Portafolio.Activo == True
        ).first()
        if not portafolio:
            raise ResourceNotFoundError("Portafolio", portafolio_id)
        return portafolio

    @staticmethod
    def actualizar_portafolio(db: Session, portafolio_id: int, portafolio_data: PortafolioUpdate) -> Portafolio:
        portafolio = db.query(Portafolio).filter(
            Portafolio.IdPortafolio == portafolio_id,
            Portafolio.Activo == True
        ).first()
        
        if not portafolio:
            raise ResourceNotFoundError("Portafolio", portafolio_id)

        if portafolio_data.IdEmpresa:
            PortafolioService._validar_empresa_existe(db, portafolio_data.IdEmpresa)
            portafolio.IdEmpresa = portafolio_data.IdEmpresa

        if portafolio_data.IdUsuario:
            PortafolioService._validar_usuario_existe(db, portafolio_data.IdUsuario)
            portafolio.IdUsuario = portafolio_data.IdUsuario

        db.commit()
        db.refresh(portafolio)
        return portafolio

    
    @staticmethod
    def eliminar_portafolio(db: Session, portafolio_id: int):
        # Buscamos el registro directamente por su ID primario
        portafolio_item = db.query(Portafolio).filter(
            Portafolio.IdPortafolio == portafolio_id
        ).first()

        if not portafolio_item:
            return False

        # BORRADO LÓGICO
        portafolio_item.Activo = False
        db.commit()
        db.refresh(portafolio_item)
        
        return True
    

    @staticmethod
    def obtener_analisis_portafolio(db: Session, usuario_id: int):
        import datetime
        import math
        from collections import defaultdict
        from app.models import Sector, Empresa, PrecioHistorico

        # 1. Obtener portafolios activos
        portafolios = db.query(Portafolio).filter(
            Portafolio.IdUsuario == usuario_id,
            Portafolio.Activo == True
        ).all()
        
        if not portafolios:
            return {"distribucion_sectores": [], "rendimiento_historico": [], "metricas": {"volatilidad": 0.0, "sharpe_ratio": 0.0}}
            
        empresa_ids = [p.IdEmpresa for p in portafolios]
        
        # 2. Distribución por Sectores
        empresas = db.query(Empresa, Sector).join(Sector, Empresa.IdSector == Sector.IdSector)\
                     .filter(Empresa.IdEmpresa.in_(empresa_ids)).all()
                     
        sectores_count = {}
        for emp, sec in empresas:
            sectores_count[sec.NombreSector] = sectores_count.get(sec.NombreSector, 0) + 1
            
        total_empresas = len(empresas)
        distribucion = [
            {"sector": k, "cantidad": v, "porcentaje": round((v / total_empresas) * 100, 2)}
            for k, v in sectores_count.items()
        ]
        
        # 3. Rendimiento Histórico Consolidado (Extracción y limpieza de NaNs)
        hace_30_dias = datetime.datetime.now() - datetime.timedelta(days=30)
        
        # Obtenemos todos los registros sueltos ordenados por fecha
        registros = db.query(PrecioHistorico).filter(
            PrecioHistorico.IdEmpresa.in_(empresa_ids),
            PrecioHistorico.Fecha >= hace_30_dias
        ).order_by(PrecioHistorico.Fecha).all()
        
        # Agrupamos en un diccionario por fecha y luego por empresa
        fechas_dict = defaultdict(dict)
        for r in registros:
            try:
                precio = float(r.PrecioCierre)
                # Si el precio es NaN, lo saltamos para que no corrompa el día
                if math.isnan(precio):
                    continue
                
                fecha_str = str(r.Fecha)[:10]
                fechas_dict[fecha_str][r.IdEmpresa] = precio
            except (ValueError, TypeError):
                continue
                
        fechas_ordenadas = sorted(fechas_dict.keys())
        
        rendimiento = []
        ultimo_precio_conocido = {} # Usaremos esto para el "Forward-Fill"
        
        for fecha in fechas_ordenadas:
            total_dia = 0.0
            for emp_id in empresa_ids:
                # Si la empresa reportó un precio válido hoy, lo actualizamos
                if emp_id in fechas_dict[fecha]:
                    ultimo_precio_conocido[emp_id] = fechas_dict[fecha][emp_id]
                
                # Sumamos el precio al total del día. 
                # Si hoy hubo NaN, se sumará pacíficamente el precio de ayer.
                total_dia += ultimo_precio_conocido.get(emp_id, 0.0)
                
            if total_dia > 0:
                rendimiento.append({"fecha": fecha, "valor_total": round(total_dia, 2)})
        
        # 4. Cálculo Matemático de Métricas de Riesgo
        volatilidad = 0.0
        sharpe_ratio = 0.0
        
        if len(rendimiento) > 1:
            valores = [r["valor_total"] for r in rendimiento]
            retornos = []
            
            for i in range(1, len(valores)):
                precio_ayer = valores[i-1]
                precio_hoy = valores[i]
                if precio_ayer > 0:
                    retornos.append((precio_hoy - precio_ayer) / precio_ayer)
                else:
                    retornos.append(0.0)
            
            if len(retornos) > 0:
                media_retorno = sum(retornos) / len(retornos)
                varianza = sum((r - media_retorno) ** 2 for r in retornos) / len(retornos)
                
                # Volatilidad anualizada (252 días hábiles de bolsa)
                volatilidad = math.sqrt(varianza) * math.sqrt(252)
                
                # Sharpe Ratio asumiendo 2% libre de riesgo
                tasa_libre_riesgo_diaria = 0.02 / 252
                if varianza > 0:
                    sharpe_ratio = (media_retorno - tasa_libre_riesgo_diaria) / (math.sqrt(varianza)) * math.sqrt(252)
                
        return {
            "distribucion_sectores": distribucion,
            "rendimiento_historico": rendimiento,
            "metricas": {
                "volatilidad": round(volatilidad * 100, 2),
                "sharpe_ratio": round(sharpe_ratio, 2)
            }
        }