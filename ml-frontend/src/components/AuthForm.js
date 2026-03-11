// src/components/AuthForm.js
import React, { useState } from 'react';

function AuthForm() {
  // 1. Estado para saber si estamos en Login (true) o Registro (false)
  const [esLogin, setEsLogin] = useState(true);

  // 2. Estados para capturar lo que el usuario escribe
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState(''); // Solo para registro


  // 3. Función que se ejecuta al hacer clic en el botón principal
  const manejarEnvio = (e) => {
    e.preventDefault(); // Evita que la página se recargue
    if (esLogin) {
      console.log("Intentando iniciar sesión con:", { email, password });
      alert("Simulación: Iniciando sesión...");
    } else {
      console.log("Intentando registrar a:", { nombre, email, password });
      alert("Simulación: Registrando usuario...");
    }
  };

   return (
    <div style={estilos.contenedor}>
      <div style={estilos.tarjeta}>
        <h2>{esLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</h2>
        <p style={estilos.subtitulo}>
          {esLogin ? 'Bienvenido de nuevo al panel ML' : 'Regístrate para gestionar stock'}
        </p>{/*modificar para cuano quiera cambiar el titulo de inicio o registro*/}

        <form onSubmit={manejarEnvio} style={estilos.formulario}>
          
          {/* CAMPO DINÁMICO: Solo se muestra si NO es login (es decir, es registro) */}
          {!esLogin && (
            <div style={estilos.grupo}>
              <label>Nombre Completo</label>
              <input 
                type="text" 
                placeholder="Tu nombre" 
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                style={estilos.input}
              />
            </div>
          )}

          <div style={estilos.grupo}>
            <label>Correo Electrónico</label>
            <input 
              type="email" 
              placeholder="correo@ejemplo.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={estilos.input}
              required
            />
          </div>

          <div style={estilos.grupo}>
            <label>Contraseña</label>
            <input 
              type="password" 
              placeholder="******" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={estilos.input}
              required
            />
          </div>

          <button type="submit" style={estilos.botonPrincipal}>
            {esLogin ? 'Entrar' : 'Registrarme'}
          </button>
        </form>

        <button 
          onClick={() => setEsLogin(!esLogin)} 
          style={estilos.botonCambio}
        >
          {esLogin ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </div>
    </div>
  );
}

// Estilos rápidos en JS para que se vea bien desde el inicio
const estilos = {
  contenedor: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'sans-serif' },
  tarjeta: { backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px', textAlign: 'center' },
  subtitulo: { color: '#666', marginBottom: '1.5rem' },
  formulario: { display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' },
  grupo: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  input: { padding: '0.8rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' },
  botonPrincipal: { backgroundColor: '#007bff', color: 'white', padding: '0.8rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', marginTop: '1rem' },
  botonCambio: { background: 'none', border: 'none', color: '#007bff', marginTop: '1.5rem', cursor: 'pointer', textDecoration: 'underline' }
};

// IMPORTANTE: Esto permite que App.js pueda usar este archivo
export default AuthForm;
