import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
import random
from collections import deque
import os
import joblib
import concurrent.futures
import copy
from tqdm import tqdm
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

# 🛑 PARCHE CRÍTICO PARA PYTHON 3.13 🛑
import torch._dynamo
torch._dynamo.config.suppress_errors = True
torch._dynamo.disable()
# -------------------------------------

from app.db.sessions import SessionLocal
from app.models.empresa import Empresa
from app.models.modelo_ia import ModeloIA
from app.services.metrica_service import MetricaService

from app.ml.engine import MLEngine
# Reutilizamos tus funciones modulares del entrenamiento clásico
from app.ml.entrenamiento import extraer_y_procesar_empresa, preparar_datos_masivos
from app.ml.arquitectura.v3_dqn import ModeloDQN_v3

# ==========================================
# HIPERPARÁMETROS DE APRENDIZAJE POR REFUERZO
# ==========================================
GAMMA = 0.95           # Importancia de las recompensas futuras
EPSILON_INICIAL = 1.0  # 100% de exploración al inicio (Adivinar y probar)
EPSILON_MIN = 0.05     # Nunca dejará de explorar al menos un 5%
DECAY_EPSILON = 0.995  # Qué tan rápido deja de adivinar y empieza a usar lo aprendido
BATCH_SIZE = 128
EPISODIOS = 10         # Veces que el agente vivirá la historia completa del mercado

class ReplayBuffer:
    """Memoria de experiencias pasadas del Agente para evitar el olvido catastrófico"""
    def __init__(self, capacidad=20000):
        self.memoria = deque(maxlen=capacidad)
    
    def guardar(self, estado, accion, recompensa, siguiente_estado, precio_real):
        self.memoria.append((estado, accion, recompensa, siguiente_estado, precio_real))
        
    def samplear(self, batch_size):
        return random.sample(self.memoria, batch_size)

def entrenar_agente_rl(id_modelo_especifico: int = None):
    db = SessionLocal()
    try:
        empresas = db.query(Empresa).filter(Empresa.Activo == True).all()
        ids_empresas = [e.IdEmpresa for e in empresas]

        query_modelos = db.query(ModeloIA).filter(ModeloIA.Activo == True, ModeloIA.Version == "v3")
        if id_modelo_especifico: 
            query_modelos = query_modelos.filter(ModeloIA.IdModelo == id_modelo_especifico)
        modelos_activos = query_modelos.all()
    finally:
        db.close()

    if not ids_empresas or not modelos_activos:
        print("⚠️ Faltan empresas activas o no hay modelos RL (v3) configurados en la BD.")
        return

    print(f"⚡ Procesando en paralelo {len(ids_empresas)} empresas para el Entorno Virtual...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        resultados = list(tqdm(executor.map(extraer_y_procesar_empresa, ids_empresas), total=len(ids_empresas), desc="Construyendo Entorno"))

    lista_dfs = [df for df in resultados if df is not None]
    if not lista_dfs: return

    print("⚖️ Ajustando Scaler y creando Estados del Agente...")
    # x_train = Estados, y_reg = Precios de mañana, y_clf = 1 si sube, 0 si baja
    x_train, y_reg, y_clf, scaler = preparar_datos_masivos(lista_dfs)
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n🧠 INICIANDO SIMULACIÓN DE REFUERZO EN: {device.type.upper()}")

    # Separar en Entrenamiento y Validación (Corte secuencial en el tiempo)
    split_idx = int(0.9 * len(x_train))
    x_entrenamiento = x_train[:split_idx]
    y_reg_entrenamiento = y_reg[:split_idx]
    
    x_validacion = torch.tensor(x_train[split_idx:], dtype=torch.float32).to(device)
    y_clf_validacion = y_clf[split_idx:]

    ruta_modelos = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(ruta_modelos, exist_ok=True)

    for modelo_db in modelos_activos:
        print(f"\n🚀 Entrenando Agente {modelo_db.Nombre} (v{modelo_db.Version})...")
        
        agente = ModeloDQN_v3(num_features=len(MLEngine.FEATURES)).to(device)
        target_net = ModeloDQN_v3(num_features=len(MLEngine.FEATURES)).to(device)
        target_net.load_state_dict(agente.state_dict())
        target_net.eval() # La red objetivo no se entrena, solo da referencias estables
        
        optimizer = optim.Adam(agente.parameters(), lr=0.001)
        criterio_q = nn.MSELoss()
        criterio_precio = nn.HuberLoss(delta=1.0)
        
        memoria = ReplayBuffer()
        epsilon = EPSILON_INICIAL

        mejor_recompensa_historica = -float('inf')
        mejores_pesos = None

        # --- BUCLE DE APRENDIZAJE POR REFUERZO ---
        for episodio in range(EPISODIOS):
            agente.train()
            recompensa_total = 0
            loss_acumulado = 0
            pasos_entrenados = 0
            
            loop_tiempo = tqdm(range(len(x_entrenamiento) - 1), desc=f"Episodio [{episodio+1}/{EPISODIOS}]", leave=False)
            
            for t in loop_tiempo:
                estado = x_entrenamiento[t]
                estado_tensor = torch.tensor([estado], dtype=torch.float32).to(device)
                precio_real = y_reg_entrenamiento[t]
                
                # 1. POLÍTICA DE DECISIÓN (Explorar vs Explotar)
                if random.random() <= epsilon:
                    accion = random.randint(0, 2) # 0: Vender, 1: Mantener, 2: Comprar
                else:
                    with torch.no_grad():
                        _, q_values = agente(estado_tensor)
                        accion = torch.argmax(q_values).item()
                
                # 2. SIMULACIÓN DEL ENTORNO (Recompensa)
                precio_hoy_escalado = estado[-1][0] 
                precio_manana_escalado = y_reg_entrenamiento[t] 
                variacion = precio_manana_escalado - precio_hoy_escalado
                
                # Asignación de premios y castigos
                if accion == 2: recompensa = variacion * 100       # Premio si compró y subió
                elif accion == 0: recompensa = -variacion * 100    # Premio si vendió y bajó
                else: recompensa = -abs(variacion) * 5             # Castigo leve por inactividad
                    
                siguiente_estado = x_entrenamiento[t + 1]
                memoria.guardar(estado, accion, recompensa, siguiente_estado, precio_real)
                recompensa_total += recompensa

                # 3. ENTRENAMIENTO (EXPERIENCE REPLAY)
                if len(memoria.memoria) >= BATCH_SIZE:
                    batch = memoria.samplear(BATCH_SIZE)
                    
                    b_estados = torch.tensor(np.array([b[0] for b in batch]), dtype=torch.float32).to(device)
                    b_acciones = torch.tensor([b[1] for b in batch], dtype=torch.int64).to(device).unsqueeze(1)
                    b_recompensas = torch.tensor([b[2] for b in batch], dtype=torch.float32).to(device)
                    b_sig_estados = torch.tensor(np.array([b[3] for b in batch]), dtype=torch.float32).to(device)
                    b_precios = torch.tensor([b[4] for b in batch], dtype=torch.float32).to(device).unsqueeze(1)
                    
                    # Calcular Q-Values actuales y predicción de precio
                    pred_precios, q_actuales = agente(b_estados)
                    q_acciones_tomadas = q_actuales.gather(1, b_acciones).squeeze(1)
                    
                    # Calcular Q-Values futuros usando la Red Objetivo (Estabilidad)
                    with torch.no_grad():
                        _, q_siguientes = target_net(b_sig_estados)
                        q_max_siguientes = q_siguientes.max(1)[0]
                        q_targets = b_recompensas + (GAMMA * q_max_siguientes)
                        
                    # Pérdida combinada (Inteligencia de Trading + Adivinar Precio Exacto)
                    loss_q = criterio_q(q_acciones_tomadas, q_targets)
                    loss_precio = criterio_precio(pred_precios, b_precios)
                    loss_total = loss_q + loss_precio
                    
                    optimizer.zero_grad()
                    loss_total.backward()
                    optimizer.step()
                    
                    loss_acumulado += loss_total.item()
                    pasos_entrenados += 1
            
            # Actualizar Epsilon y Red Objetivo al final del episodio
            if epsilon > EPSILON_MIN: epsilon *= DECAY_EPSILON
            target_net.load_state_dict(agente.state_dict())
            
            avg_loss = loss_acumulado / max(1, pasos_entrenados)
            print(f"Episodio [{episodio+1}/{EPISODIOS}] - Recompensa Neta: {recompensa_total:.2f} - Loss: {avg_loss:.4f} - Epsilon: {epsilon:.2f}")

            # Guardar el Agente más rentable
            if recompensa_total > mejor_recompensa_historica:
                mejor_recompensa_historica = recompensa_total
                mejores_pesos = copy.deepcopy(agente.state_dict())

        # --- 4. EVALUACIÓN Y MÉTRICAS (Para tu Panel de React) ---
        print("📊 Evaluando decisiones del Agente en el set de validación...")
        agente.load_state_dict(mejores_pesos)
        agente.eval()
        
        y_val_pred_list = []
        with torch.no_grad():
            for i in range(0, len(x_validacion), 128):
                batch_val = x_validacion[i:i+128]
                _, q_vals = agente(batch_val)
                y_val_pred_list.append(q_vals.cpu().numpy())

        q_totales = np.vstack(y_val_pred_list)
        acciones_elegidas = np.argmax(q_totales, axis=1)
        
        # Para calcular métricas comparables, simplificamos sus acciones a (1: Alcista, 0: Bajista)
        # Ignoramos los momentos donde decidió "Mantener" para el Accuracy
        indices_operados = np.where(acciones_elegidas != 1)[0]
        y_real_operado = y_clf_validacion[indices_operados]
        y_pred_operado = (acciones_elegidas[indices_operados] == 2).astype(int) # 2=Comprar=Alcista

        if len(y_real_operado) > 0:
            acc = accuracy_score(y_real_operado, y_pred_operado)
            prec = precision_score(y_real_operado, y_pred_operado, zero_division=0)
            rec = recall_score(y_real_operado, y_pred_operado, zero_division=0)
            f1 = f1_score(y_real_operado, y_pred_operado, zero_division=0)
        else:
            acc = prec = rec = f1 = 0.0

        metricas = {
            'loss': float(avg_loss),
            'mae': float(mejor_recompensa_historica), # Hack: Guardamos la recompensa máxima aquí para que la veas
            'val_loss': 0.0,
            'val_mae': 0.0,
            'accuracy': float(acc),
            'precision': float(prec),
            'recall': float(rec),
            'f1_score': float(f1)
        }

        db_local = SessionLocal()
        try:
            MetricaService.guardar_metricas(db_local, modelo_db.IdModelo, metricas)
        finally:
            db_local.close()

        torch.save(mejores_pesos, os.path.join(ruta_modelos, f'modelo_acciones_{modelo_db.Version}.pth'))
        print(f"✅ Agente {modelo_db.Nombre} (.pth) guardado.")

    joblib.dump(scaler, os.path.join(ruta_modelos, 'scaler.pkl'))
    print("✅ ¡Entrenamiento del Agente completado!")

if __name__ == "__main__":
    entrenar_agente_rl()