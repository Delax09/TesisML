import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from 'context';

export default function AdminLayout() {
  const location = useLocation();
  const isActivo = (ruta) => location.pathname.includes(ruta);
  const { logout } = useAuth();

  return (
    <div style={estilos.layout}>
      <aside style={estilos.sidebar}>
        <h2 style={estilos.logo}>TesisML - Admin</h2>
        <nav style={estilos.nav}>
          <Link to="/panel" style={{...estilos.link, backgroundColor: isActivo('/panel') ? '#34495e' : 'transparent'}}>
            ⚙️ Panel Principal
          </Link>
          {/* A futuro aquí irán: Gestión de IA, Empresas Activas, etc. */}
          
          <div style={{ flexGrow: 1 }}></div>
          <button 
            href="#" 
            onClick={(e) => { e.preventDefault(); logout(); }} 
            style={{...estilos.link, color: '#e74c3c'}}
          >
            🚪 Cerrar Sesión
          </button>
        </nav>
      </aside>
      <main style={estilos.main}><Outlet /></main>
    </div>
  );
}

const estilos = {
  layout: { display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' },
  sidebar: { width: '250px', backgroundColor: '#2c3e50', color: '#ecf0f1', display: 'flex', flexDirection: 'column' },
  logo: { padding: '20px', margin: 0, textAlign: 'center', borderBottom: '1px solid #34495e', fontSize: '1.2rem' },
  nav: { display: 'flex', flexDirection: 'column', padding: '15px', gap: '10px', flexGrow: 1 },
  link: { color: '#ecf0f1', textDecoration: 'none', padding: '12px 15px', borderRadius: '8px', transition: '0.2s', fontWeight: '500' },
  main: { flex: 1, backgroundColor: '#f4f6f8', padding: '30px', overflowY: 'auto' }
};