import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path
import json
from datetime import datetime

def configurar_logger(nombre: str,
                        nivel: int = logging.INFO,
                        archivo_log: str = None) -> logging.Logger:
    """Configura logger estructurado con rotación"""

    logger = logging.getLogger(nombre)
    logger.setLevel(nivel)

    # Formatter JSON para logs estructurados
    class JSONFormatter(logging.Formatter):
        def format(self, record):
            log_obj = {
                "timestamp": datetime.utcnow().isoformat(),
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage(),
                "module": record.module,
                "function": record.funcName,
                "line": record.lineno,
            }

            # Agregar excepciones si existen
            if record.exc_info:
                log_obj["exception"] = self.formatException(record.exc_info)

            return json.dumps(log_obj, ensure_ascii=False)

    # Handler para consola
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ))
    logger.addHandler(console_handler)

    # Handler para archivo con rotación
    if archivo_log:
        archivo_log_path = Path(archivo_log)
        archivo_log_path.parent.mkdir(parents=True, exist_ok=True)

        file_handler = RotatingFileHandler(
            archivo_log,
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        )
        file_handler.setFormatter(JSONFormatter())
        logger.addHandler(file_handler)

    return logger