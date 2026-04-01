import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

def enviar_correo(destino: str, asunto: str, mensaje: str, es_html: bool = True):
    remitente = "fabianmejias2002@gmail.com"
    password = "ytcu tofz zelx xyku"

    msg = MIMEMultipart()
    msg['From'] = remitente
    msg['To'] = destino
    msg['Subject'] = asunto

    # Determinamos el subtipo: 'html' para diseño, 'plain' para texto simple
    tipo = 'html' if es_html else 'plain'
    msg.attach(MIMEText(mensaje, tipo))

    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(remitente, password)
        text = msg.as_string()
        server.sendmail(remitente, destino, text)
        server.quit()
        print(f"Correo enviado exitosamente a {destino}")
    except Exception as e:
        print(f"Error al enviar el correo: {e}")