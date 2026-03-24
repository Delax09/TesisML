import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from 'context';

export default function UserLayout() {
  const location = useLocation();
  const isActivo = (ruta) => location.pathname.includes(ruta);
  const { logout } = useAuth();

  return (
    <div style={estilos.layout}>
      <aside style={estilos.sidebar}>
        <h2 style={estilos.logo}>TesisML - Usuario</h2>
        <nav style={estilos.nav}>
          <Link to="/home" style={{...estilos.link, backgroundColor: isActivo('/home') ? '#34495e' : 'transparent'}}>
            🏠 Mi Portafolio
          </Link>
          {/* Aquí a futuro puedes agregar más vistas de usuario */}
          
          <div style={{ flexGrow: 1 }}></div>
          <button 
            onClick={logout} 
            style={{
              ...estilos.link, 
              color: '#e74c3c', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              fontFamily: 'inherit',
              fontSize: 'inherit'
            }}
          >
            🚪 Cerrar Sesión
          </button>
        </nav>
      </aside>
      <main style={estilos.main}><Outlet /></main>
    </div>
  );
}

// Estilos compartidos (puedes pegarlos al final)
const estilos = {
  // CAMBIO: height fijo de 100vh y overflow hidden para que la página global no haga scroll
  layout: { display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }, 
  sidebar: { width: '250px', backgroundColor: '#2c3e50', color: '#ecf0f1', display: 'flex', flexDirection: 'column' },
  logo: { padding: '20px', margin: 0, textAlign: 'center', borderBottom: '1px solid #34495e', fontSize: '1.2rem' },
  nav: { display: 'flex', flexDirection: 'column', padding: '15px', gap: '10px', flexGrow: 1 },
  link: { color: '#ecf0f1', textDecoration: 'none', padding: '12px 15px', borderRadius: '8px', transition: '0.2s', fontWeight: '500' },
  // El main ya tiene overflowY: 'auto', por lo que AHORA será el único que hará scroll
  main: { flex: 1, backgroundColor: '#f4f6f8', padding: '30px', overflowY: 'auto' } 
};