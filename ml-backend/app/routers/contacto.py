from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.schemas.schemas import ContactoCreate
from app.utils.email import enviar_correo

router = APIRouter(
    prefix="/api/v1/contacto", # <--- DEBE LLEVAR EL /api/v1
    tags=["Contacto"]
)

@router.post("/enviar")
async def enviar_mensaje_contacto(contacto: ContactoCreate, background_tasks: BackgroundTasks):
    try:
        asunto_correo = f"[{contacto.asunto}] Mensaje de: {contacto.nombre}"
        
        cuerpo_html = f"""
        <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; border: 1px solid #eee;">
            <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Nuevo mensaje de contacto</h2>
            <p><strong>Remitente:</strong> {contacto.nombre}</p>
            <p><strong>Email:</strong> {contacto.email}</p>
            <p><strong>Asunto:</strong> {contacto.asunto}</p>
            <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin-top: 20px;">
                <p><strong>Mensaje:</strong></p>
                <p>{contacto.mensaje}</p>
            </div>
        </div>
        """
        
        # El correo donde quieres recibir las notificaciones
        correo_destino = "fabianmejias2002@gmail.com" 
        
        background_tasks.add_task(
            enviar_correo,
            destino=correo_destino,
            asunto=asunto_correo,
            mensaje=cuerpo_html,
            es_html=True
        )
        
        return {"success": True, "message": "Mensaje enviado exitosamente"}
    except Exception as e:
        print(f"Error enviando contacto: {e}")
        raise HTTPException(status_code=500, detail="No se pudo procesar el mensaje")