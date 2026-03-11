use AnalisisAcciones;


select COUNT(*) from Empresa;
-- Cantidad de Registros por empresa 
SELECT 
    e.IdEmpresa,
    e.NombreEmpresa,
    COUNT(*) AS CantidadRegistros
FROM PrecioHistorico ph
INNER JOIN Empresa e 
    ON ph.IdEmpresa = e.IdEmpresa
GROUP BY e.IdEmpresa, e.NombreEmpresa
ORDER BY e.IdEmpresa;

select * from PrecioHistorico where IdEmpresa = 1 order by Fecha asc;

select * from empresa where Ticket = 'SQ';

select * from Resultado;