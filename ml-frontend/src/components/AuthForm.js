import React, { useState } from 'react';
import { useAuth } from 'context';

export default function AuthForm() {
  const { login, registro } = useAuth(); 
  
  // Estado para alternar entre Login y Registro
  const [esRegistro, setEsRegistro] = useState(false);
  
  // Estados de los campos
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    let result;
    if (esRegistro) {
      result = await registro(nombre, apellido, email, password);
    } else {
      result = await login(email, password);
    }
    
    if (!result.success) {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div style={estilos.contenedor}>
      <form onSubmit={handleSubmit} style={estilos.formulario}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
          {esRegistro ? 'Crear una Cuenta' : 'Iniciar Sesión'}
        </h2>
        
        {/* Campos extras solo para el Registro */}
        {esRegistro && (
          <>
            <input 
              type="text" 
              placeholder="Nombre" 
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              style={estilos.input}
            />
            <input 
              type="text" 
              placeholder="Apellido" 
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              required
              style={estilos.input}
            />
          </>
        )}
        
        <input 
          type="email" 
          placeholder="Correo electrónico" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={estilos.input}
        />
        
        <input 
          type="password" 
          placeholder="Contraseña" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={estilos.input}
        />
        
        {error && <p style={{ color: '#e74c3c', fontSize: '14px', fontWeight: 'bold' }}>{error}</p>}
        
        <button type="submit" disabled={loading} style={estilos.boton}>
          {loading ? 'Procesando...' : (esRegistro ? 'Registrarse' : 'Ingresar')}
        </button>

        {/* Botón para cambiar entre modos */}
        <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px' }}>
          {esRegistro ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
          <button 
            type="button" 
            onClick={() => { setEsRegistro(!esRegistro); setError(''); }}
            style={estilos.botonLink}
          >
            {esRegistro ? 'Inicia sesión aquí' : 'Regístrate aquí'}
          </button>
        </p>
        {/* BORRAR ESTO EN EL FUTURO */}
        <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '12px', color: '#555' }}>
          <strong>Usuarios de Prueba:</strong>
        </p>
                <li>Correo: user@user.cl; Contraseña: A12345dsa%d_!</li>
                <li>Correo: admin@admin.cl; Contraseña: A12345dsa%d_!</li>
      </form>
    </div>
  );
}

const estilos = {
  contenedor: { display: 'flex', justifyContent: 'center', width: '100%' },
  formulario: { width: '100%', backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '15px' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' },
  boton: { padding: '12px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' },
  botonLink: { background: 'none', border: 'none', color: '#4f46e5', textDecoration: 'underline', cursor: 'pointer', marginLeft: '5px' }
};