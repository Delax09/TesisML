"""
Excepciones personalizadas para la aplicación.
"""


class ResourceNotFoundError(Exception):
    """Excepción cuando un recurso no es encontrado."""
    def __init__(self, resource: str, resource_id: int = None):
        if resource_id:
            self.message = f"{resource} con ID {resource_id} no encontrado"
        else:
            self.message = f"{resource} no encontrado"
        super().__init__(self.message)


class DuplicateResourceError(Exception):
    """Excepción cuando se intenta crear un recurso duplicado."""
    def __init__(self, resource: str, field: str, value: str):
        self.message = f"{field} '{value}' ya existe para {resource}"
        super().__init__(self.message)


class InvalidDataError(Exception):
    """Excepción para datos inválidos."""
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)
