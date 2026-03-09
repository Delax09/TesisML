use AnalisisAcciones; 

ALTER TABLE Resultado ALTER COLUMN PrecioActual DECIMAL(18, 4) NOT NULL;
ALTER TABLE Resultado ALTER COLUMN PrediccionIA DECIMAL(18, 4) NOT NULL;
ALTER TABLE Resultado ALTER COLUMN VariacionPCT DECIMAL(18, 4) NOT NULL;
ALTER TABLE Resultado ALTER COLUMN RSI DECIMAL(18, 4) NOT NULL;
ALTER TABLE Resultado ALTER COLUMN Score DECIMAL(5, 2) NOT NULL;
ALTER TABLE PrecioHistorico ALTER COLUMN PrecioCierre DECIMAL(18, 4) NOT NULL;


ALTER TABLE Empresa ADD 
    Activo BIT DEFAULT 1,
    FechaActualizacion DATETIME2 DEFAULT SYSUTCDATETIME();

-- Columnas de control para Sector
ALTER TABLE Sector ADD 
    Activo BIT DEFAULT 1,
    FechaCreacion DATETIME2 DEFAULT SYSUTCDATETIME();

-- Columnas de control para Usuarios
ALTER TABLE Usuario ADD 
    Activo BIT DEFAULT 1,
    FechaCreacion DATETIME2 DEFAULT SYSUTCDATETIME(),
    UltimoLogin DATETIME2,
    IntentosFallidos INT DEFAULT 0;


UPDATE Empresa
SET 
    Activo = 1, 
    FechaActualizacion = SYSUTCDATETIME();

Select * from sector;

UPDATE Sector
SET 
    Activo = 1, 
    FechaCreacion = SYSUTCDATETIME();


