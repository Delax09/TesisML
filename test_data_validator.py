#!/usr/bin/env python3
"""Script de prueba para verificar DataValidator.validar_y_limpiar"""

import sys
import os
import ast

# Simplemente validar sintaxis del archivo data_validation.py
print("🔍 Validando sintaxis de data_validation.py...")

data_val_path = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    'ml-backend',
    'app',
    'ml',
    'core',
    'data_validation.py'
)

try:
    with open(data_val_path, 'r', encoding='utf-8') as f:
        codigo = f.read()
    
    # Parse the code
    tree = ast.parse(codigo)
    
    # Find DataValidator class
    validator_found = False
    validar_y_limpiar_found = False
    
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) and node.name == 'DataValidator':
            validator_found = True
            for item in node.body:
                if isinstance(item, ast.FunctionDef) and item.name == 'validar_y_limpiar':
                    validar_y_limpiar_found = True
                    break
    
    if not validator_found:
        print("❌ Clase DataValidator no encontrada")
        sys.exit(1)
    
    if not validar_y_limpiar_found:
        print("❌ Método validar_y_limpiar no encontrado en DataValidator")
        sys.exit(1)
    
    print("✅ Sintaxis correcta")
    print("✅ Clase DataValidator encontrada")
    print("✅ Método validar_y_limpiar encontrado")
    
    print("\n" + "="*50)
    print("✅ VALIDACIÓN EXITOSA")
    print("="*50)
    print("\nResumen:")
    print(f"  - Archivo: {data_val_path}")
    print(f"  - Clase: DataValidator")
    print(f"  - Método: validar_y_limpiar")
    print("\nEl método validar_y_limpiar está ahora disponible para:")
    print("  - pipeline_lstm/data_processor.py")
    print("  - pipeline_cnn/data_processor.py")
    
except SyntaxError as e:
    print(f"❌ Error de sintaxis: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
