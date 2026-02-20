use AnalisisAcciones;

create table Sector (
	IdSector int PRIMARY KEY IDENTITY(1,1) not null,
	NombreSector Varchar(50) not null
	);

Create table Empresa( 
	IdEmpresa int PRIMARY KEY IDENTITY(1,1) not null,
	Ticket varchar(10) unique not null, 
	NombreEmpresa varchar(100) not null, 
	IdSector int not null, --Clave Foranea
	FechaAgregado DateTime2 default SYSUTCDATETIME(), --Estandar en apis y microservicios 
	FOREIGN KEY (IdSector) REFERENCES Sector(IdSector)
	);

create table Rol(
	IdRol int PRIMARY KEY IDENTITY(1,1) not null,
	NombreRol varchar(50) not null
	);

create table Usuario(
	IdUsuario int PRIMARY KEY IDENTITY(1,1) not null,
	Nombre varchar(50) not null,
	Apellido varchar(50) not null,
	Email varchar(100) not null unique,
	PasswordU varchar(255),
	IdRol int not null, 
	FOREIGN KEY (IdRol) REFERENCES Rol(IdRol)
);


create Table Resultado(
	IdResultado int Primary key identity(1,1) not null,
	PrecioActual decimal not null, 
	PrediccionIA decimal not null,
	VariacionPCT decimal not null, 
	RSI decimal not null,
	Score decimal not null,
	Recomendacion Varchar(50),
	IdEmpresa int not null,
	FechaAnalisis DateTime2 default SYSUTCDATETIME(),
	FOREIGN KEY (IdEmpresa) REFERENCES Empresa(IdEmpresa)
	);

Create table PrecioHistorico(
	IdPrecioHistorico int primary key identity(1,1) not null,
	PrecioCierre decimal not null, 
	Volumen bigint not null,
	IdEmpresa int not null,
	Fecha Date not null, -- YYYY/MM/DD Traido de la API
	Foreign Key (IdEmpresa) references Empresa(IdEmpresa)
	);

create table Portafolio(
	IdPortafolio int primary key identity(1,1) not null,
	FechaAgregado DateTime2 default SYSUTCDATETIME(),
	IdUsuario int not null,
	IdEmpresa int not null,
	Foreign Key (IdUsuario) references Usuario(IdUsuario),
	Foreign Key (IdEmpresa) references Empresa(IdEmpresa)
);
