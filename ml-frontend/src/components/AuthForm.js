import React, { useState } from 'react';
import { useAuth } from 'context';

function AuthForm() {
  const { login } = useAuth(); // Extraemos la función de login del contexto
  
  // 1. Estado para saber si estamos en Login (true) o Registro (false)
  const [esLogin, setEsLogin] = useState(true);

  // 2. Estados para capturar lo que el usuario escribe
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState(''); // Solo para registro
  const [error, setError] = useState(''); // Estado para manejar mensajes de error

  // 3. Función que se ejecuta al hacer clic en el botón principal
  const manejarEnvio = async (e) => {
    e.preventDefault(); 
    setError(''); // Limpiamos errores previos

    if (esLogin) {
      // Lógica de Inicio de Sesión Real
      const exito = await login(email, password);
      if (!exito) {
        setError('Credenciales incorrectas o servidor no disponible.');
      }
    } else {
      // Lógica de Registro (Aquí podrías llamar a un register() si lo tienes en el context)
      console.log("Intentando registrar a:", { nombre, email, password });
      alert("La funcionalidad de registro se implementará pronto.");
    }
  };

  return (
    <div style={estilos.contenedor}>
      <div style={estilos.tarjeta}>
        <h2>{esLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</h2>
        <p style={estilos.subtitulo}>
          {esLogin ? 'Bienvenido de nuevo al panel ML' : 'Regístrate para gestionar tu cartera'}
        </p>

        <form onSubmit={manejarEnvio} style={estilos.formulario}>
          
          {/* CAMPO DINÁMICO: Solo para registro */}
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
              placeholder="admin@tesis.cl o user@tesis.cl" 
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
              placeholder="Contraseña" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={estilos.input}
              required
            />
          </div>

          {/* MENSAJE DE ERROR VISUAL */}
          {error && <p style={{ color: '#d9534f', fontSize: '0.9rem', margin: '0' }}>{error}</p>}

          <button type="submit" style={estilos.botonPrincipal}>
            {esLogin ? 'Entrar' : 'Registrarme'}
          </button>
        </form>

        <button 
          onClick={() => {
            setEsLogin(!esLogin);
            setError(''); // Limpiar errores al cambiar de pestaña
          }} 
          style={estilos.botonCambio}
        >
          {esLogin ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>

        {/* Sugerencia visual para pruebas */}
        {esLogin && (
          <div style={{marginTop: '1.5rem', fontSize: '11px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '1rem'}}>
             Acceso de prueba: <br/>
             <b>Admin:</b> admin@tesis.cl / admin <br/>
             <b>User:</b> user@tesis.cl / user
          </div>
        )}
      </div>
    </div>
  );
}

// Estilos (se mantienen los que ya tenías)
const estilos = {
  contenedor: { display: 'flex', paddingTop: '2rem', alignItems: 'center', minHeight: 'auto', backgroundColor: '#f0f2f5', fontFamily: 'sans-serif' },
  tarjeta: { backgroundColor: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px', textAlign: 'center' },
  subtitulo: { color: '#666', marginBottom: '1.5rem' },
  formulario: { display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' },
  grupo: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  input: { padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem' },
  botonPrincipal: { backgroundColor: '#4f46e5', color: 'white', padding: '0.8rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', marginTop: '1rem' },
  botonCambio: { background: 'none', border: 'none', color: '#4f46e5', marginTop: '1.5rem', cursor: 'pointer', textDecoration: 'underline' }
};

export default AuthForm;