/**
 * ============================================================================
 * ⚠️ REGLA DE ORO (PREVENCIÓN DE DEPENDENCIAS CIRCULARES) ⚠️
 * ============================================================================
 * 1. Las Páginas (pages/) y el Enrutador (WebRouter) SIEMPRE deben importar 
 * desde este barril global (ej: import { Algo } from 'features').
 * 2. Las Features (archivos dentro de carpetas en src/features/) NUNCA deben 
 * importar a otras features usando este barril global. Si una feature 
 * necesita algo de otra, debe importar con ruta directa o relativa.
 * ============================================================================
 */

// ==========================================
// BARRIL GLOBAL DE FEATURES
// ==========================================

// --- ADMIN ---
export { default as AdminPanelTareas } from './admin/components/AdminPanelTareas';
export { default as ModeloCard } from './admin/components/ModeloCard';
export { default as ModelosPanel } from './admin/components/ModelosPanel';
export { default as UsuarioList } from './admin/components/UsuarioList';
export * from './admin/hooks/useAccesosIA';
export * from './admin/hooks/useMantenimiento';

// --- AUTH ---
export { default as AuthForm } from './auth/components/AuthForm';
export { default as OlvidePasswordForm } from './auth/components/OlvidePasswordForm';
export { default as ResetPasswordForm } from './auth/components/ResetPasswordForm';
export { default as RutaProtegida } from './auth/components/RutaProtegida';

// --- DASHBOARD ---
export { default as GraficoSectores } from './dashboard/components/GraficoSectores';
export { default as KpiPanel } from './dashboard/components/KpiPanel';
export { default as TopPrediccionesList } from './dashboard/components/TopPrediccionesList';
export * from './dashboard/hooks/useDashboard';

// --- EMPRESAS ---
export { default as EmpresaForm } from './empresas/components/EmpresaForm';
export { default as EmpresaTable } from './empresas/components/EmpresaTable';
export * from './empresas/hooks/useEmpresaForm';
export * from './empresas/hooks/useEmpresas';

// --- IA ANALISIS ---
export { default as AnalisisIAButton } from './ia_analisis/components/AnalisisIAButton';
export { default as AnalisisPorModeloSelector } from './ia_analisis/components/AnalisisPorModeloSelector';
export { default as ComparadorIA } from './ia_analisis/components/ComparadorIA';
export { default as EntrenamientoSelector } from './ia_analisis/components/EntrenamientoSelector';
export { default as GraficoComparativo } from './ia_analisis/components/GraficoComparativo';
export { default as ResultadoPanel } from './ia_analisis/components/ResultadoPanel';
export { default as TarjetaProyeccion } from './ia_analisis/components/TarjetaProyeccion';
export * from './ia_analisis/hooks/useAnalisisMasivo';
export * from './ia_analisis/hooks/useEntrenamientoIA';
export * from './ia_analisis/hooks/useResultadoIA';

// --- LANDING ---
export { default as ContactoSection } from './landing/components/ContactoSection';
export { default as FaqSection } from './landing/components/FaqSection';
export { default as HeroSection } from './landing/components/HeroSection';
export { default as LandingNavbar } from './landing/components/LandingNavbar';
export { default as MisionVisionSection } from './landing/components/MisionVisionSection';

// --- MERCADO ---
export { default as PrecioChart } from './mercado/components/PrecioChart';
export * from './mercado/hooks/usePrecioHistorico';

// --- METRICAS ---
export { default as MetricasFiltros } from './metricas/components/MetricasFiltros';
export { default as MetricasTable } from './metricas/components/MetricasTable';
export * from './metricas/hooks/useMetricas';

// --- NOTICIAS ---
export { default as NoticiaCard } from './noticias/components/NoticiaCard';
export * from './noticias/hooks/useNoticias';

// --- PORTAFOLIO ---
export { default as DashboardAnalitico } from './portafolio/components/DashboardAnalitico';
export { default as ListaPortafolio } from './portafolio/components/ListaPortafolio';
export * from './portafolio/hooks/useAnalisisPortafolio';
export * from './portafolio/hooks/usePortafolio';
export * from './portafolio/hooks/usePrediccionesIA';
export * from './portafolio/hooks/useProyeccionesIA';

// --- ROLES ---
export { default as RolList } from './roles/components/RolList';
export * from './roles/hooks/useRoles';

// --- SECTORES ---
export { default as SectorList } from './sectores/components/SectorList';
export * from './sectores/hooks/useSectores';