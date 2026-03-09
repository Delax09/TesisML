use AnalisisAcciones;

select * from Rol;

Select * from Sector;

select * from Usuario;

select * from Empresa;

SELECT 
    e.IdEmpresa,
    e.NombreEmpresa,
    COUNT(*) AS CantidadRegistros
FROM PrecioHistorico ph
INNER JOIN Empresa e 
    ON ph.IdEmpresa = e.IdEmpresa
GROUP BY e.IdEmpresa, e.NombreEmpresa
ORDER BY e.IdEmpresa;