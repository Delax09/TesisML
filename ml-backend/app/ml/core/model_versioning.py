"""Sistema de versionamiento y trazabilidad de modelos"""

import os
import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, Any
import torch
import joblib

class ModelVersionManager:
    """Gestiona versiones de modelos con trazabilidad completa"""

    def __init__(self, base_path: str = "app/ml/models"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

        self.versiones_dir = self.base_path / "versiones"
        self.versiones_dir.mkdir(exist_ok=True)

    def guardar_modelo_versionado(
        self,
        modelo_weights: Dict,
        scaler,
        metricas: Dict[str, float],
        nombre_modelo: str,
        version: str,
        descripcion: str = ""
    ) -> str:
        """
        Guarda modelo con versión única

        Returns:
            Ruta del modelo guardado
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        version_id = f"{nombre_modelo}_{version}_{timestamp}"

        # Directorio de versión
        version_dir = self.versiones_dir / version_id
        version_dir.mkdir(exist_ok=True)

        # Guardar pesos del modelo
        model_path = version_dir / "model.pth"
        torch.save(modelo_weights, model_path)

        # Guardar scaler
        scaler_path = version_dir / "scaler.pkl"
        joblib.dump(scaler, scaler_path)

        # Metadatos
        metadata = {
            "version_id": version_id,
            "nombre_modelo": nombre_modelo,
            "version": version,
            "descripcion": descripcion,
            "fecha_creacion": datetime.now().isoformat(),
            "metricas": metricas,
            "archivos": {
                "modelo": str(model_path.relative_to(self.base_path)),
                "scaler": str(scaler_path.relative_to(self.base_path))
            }
        }

        metadata_path = version_dir / "metadata.json"
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)

        # Crear enlace simbólico al último modelo
        latest_link = self.base_path / f"modelo_acciones_{version}.pth"
        if latest_link.exists():
            latest_link.unlink()
        try:
            latest_link.symlink_to(model_path)
        except OSError:
            # Windows no soporta symlinks fácilmente, copiar en su lugar
            shutil.copy(model_path, latest_link)

        return str(version_dir)

    def cargar_modelo_versionado(self, version_id: str, num_features: int):
        """Carga un modelo específico por versión"""
        version_dir = self.versiones_dir / version_id

        if not version_dir.exists():
            raise FileNotFoundError(f"Versión {version_id} no encontrada")

        # Cargar metadatos
        metadata_path = version_dir / "metadata.json"
        with open(metadata_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)

        # Cargar modelo
        model_path = version_dir / "model.pth"
        model_weights = torch.load(model_path, map_location='cpu', weights_only=True)

        # Cargar scaler
        scaler_path = version_dir / "scaler.pkl"
        scaler = joblib.load(scaler_path)

        return model_weights, scaler, metadata

    def listar_versiones(self, nombre_modelo: str = None) -> list:
        """Lista todas las versiones disponibles"""
        versiones = []

        for version_dir in self.versiones_dir.iterdir():
            if version_dir.is_dir():
                metadata_path = version_dir / "metadata.json"
                if metadata_path.exists():
                    with open(metadata_path, 'r', encoding='utf-8') as f:
                        metadata = json.load(f)

                    if nombre_modelo is None or metadata.get('nombre_modelo') == nombre_modelo:
                        versiones.append(metadata)

        # Ordenar por fecha de creación (más reciente primero)
        versiones.sort(key=lambda x: x['fecha_creacion'], reverse=True)
        return versiones

    def comparar_versiones(self, version_ids: list) -> Dict[str, Any]:
        """Compara métricas entre versiones"""
        comparacion = {"versiones": {}}

        for vid in version_ids:
            try:
                _, _, metadata = self.cargar_modelo_versionado(vid, 0)  # num_features dummy
                comparacion["versiones"][vid] = {
                    "metricas": metadata.get("metricas", {}),
                    "fecha": metadata.get("fecha_creacion", "")
                }
            except Exception as e:
                comparacion["versiones"][vid] = {"error": str(e)}

        return comparacion