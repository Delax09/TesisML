-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.Empresa (
  IdEmpresa integer NOT NULL DEFAULT nextval('"Empresa_IdEmpresa_seq"'::regclass),
  Ticket character varying NOT NULL UNIQUE,
  NombreEmpresa character varying NOT NULL,
  IdSector integer,
  FechaAgregado timestamp without time zone DEFAULT now(),
  Activo boolean,
  FechaActualizacion timestamp without time zone,
  CONSTRAINT Empresa_pkey PRIMARY KEY (IdEmpresa),
  CONSTRAINT Empresa_IdSector_fkey FOREIGN KEY (IdSector) REFERENCES public.Sector(IdSector)
);
CREATE TABLE public.MetricaModelo (
  IdMetrica integer NOT NULL DEFAULT nextval('"MetricaModelo_IdMetrica_seq"'::regclass),
  IdModelo integer NOT NULL,
  FechaEntrenamiento timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  Loss numeric NOT NULL,
  MAE numeric NOT NULL,
  ValLoss numeric NOT NULL,
  ValMAE numeric NOT NULL,
  Accuracy numeric NOT NULL,
  Precision numeric NOT NULL,
  Recall numeric NOT NULL,
  F1_Score numeric NOT NULL,
  DiasFuturo integer DEFAULT 5,
  AUC double precision DEFAULT 0.0,
  TP integer DEFAULT 0,
  TN integer DEFAULT 0,
  FP integer DEFAULT 0,
  FN integer DEFAULT 0,
  CONSTRAINT MetricaModelo_pkey PRIMARY KEY (IdMetrica),
  CONSTRAINT MetricaModelo_IdModelo_fkey FOREIGN KEY (IdModelo) REFERENCES public.ModeloIA(IdModelo)
);
CREATE TABLE public.ModeloIA (
  IdModelo integer NOT NULL DEFAULT nextval('"ModeloIA_IdModelo_seq"'::regclass),
  Nombre character varying NOT NULL,
  Version character varying NOT NULL,
  Descripcion text,
  Hiperparametros jsonb,
  Activo boolean DEFAULT true,
  CONSTRAINT ModeloIA_pkey PRIMARY KEY (IdModelo)
);
CREATE TABLE public.Portafolio (
  IdPortafolio integer NOT NULL DEFAULT nextval('"Portafolio_IdPortafolio_seq"'::regclass),
  FechaAgregado timestamp without time zone DEFAULT now(),
  Activo boolean NOT NULL,
  IdUsuario integer,
  IdEmpresa integer,
  CONSTRAINT Portafolio_pkey PRIMARY KEY (IdPortafolio),
  CONSTRAINT Portafolio_IdUsuario_fkey FOREIGN KEY (IdUsuario) REFERENCES public.Usuario(IdUsuario),
  CONSTRAINT Portafolio_IdEmpresa_fkey FOREIGN KEY (IdEmpresa) REFERENCES public.Empresa(IdEmpresa)
);
CREATE TABLE public.PrecioHistorico (
  IdPrecioHistorico integer NOT NULL DEFAULT nextval('"PrecioHistorico_IdPrecioHistorico_seq"'::regclass),
  IdEmpresa integer NOT NULL,
  FechaRegistro timestamp without time zone DEFAULT now(),
  PrecioCierre numeric NOT NULL,
  Volumen bigint NOT NULL,
  Fecha date DEFAULT CURRENT_DATE,
  SMA_20 numeric,
  Banda_Superior numeric,
  Banda_Inferior numeric,
  PrecioApertura numeric,
  PrecioMaximo numeric,
  PrecioMinimo numeric,
  CONSTRAINT PrecioHistorico_pkey PRIMARY KEY (IdPrecioHistorico),
  CONSTRAINT PrecioHistorico_IdEmpresa_fkey FOREIGN KEY (IdEmpresa) REFERENCES public.Empresa(IdEmpresa)
);
CREATE TABLE public.Resultado (
  IdResultado integer NOT NULL DEFAULT nextval('"Resultado_IdResultado_seq"'::regclass),
  PrecioActual numeric NOT NULL,
  PrediccionIA numeric NOT NULL,
  VariacionPCT numeric NOT NULL,
  RSI numeric NOT NULL,
  Score numeric NOT NULL,
  MACD numeric NOT NULL,
  ATR numeric NOT NULL,
  EMA20 numeric NOT NULL,
  EMA50 numeric NOT NULL,
  Recomendacion character varying,
  IdEmpresa integer,
  FechaAnalisis timestamp without time zone DEFAULT now(),
  IdModelo integer,
  ProbAlcista numeric,
  CONSTRAINT Resultado_pkey PRIMARY KEY (IdResultado),
  CONSTRAINT Resultado_IdEmpresa_fkey FOREIGN KEY (IdEmpresa) REFERENCES public.Empresa(IdEmpresa),
  CONSTRAINT Resultado_IdModelo_fkey FOREIGN KEY (IdModelo) REFERENCES public.ModeloIA(IdModelo)
);
CREATE TABLE public.Rol (
  IdRol integer NOT NULL DEFAULT nextval('"Rol_IdRol_seq"'::regclass),
  NombreRol character varying NOT NULL UNIQUE,
  CONSTRAINT Rol_pkey PRIMARY KEY (IdRol)
);
CREATE TABLE public.Sector (
  IdSector integer NOT NULL DEFAULT nextval('"Sector_IdSector_seq"'::regclass),
  NombreSector character varying NOT NULL,
  Activo boolean,
  FechaCreacion timestamp without time zone DEFAULT now(),
  CONSTRAINT Sector_pkey PRIMARY KEY (IdSector)
);
CREATE TABLE public.Usuario (
  IdUsuario integer NOT NULL DEFAULT nextval('"Usuario_IdUsuario_seq"'::regclass),
  Nombre character varying NOT NULL,
  Apellido character varying NOT NULL,
  Email character varying NOT NULL UNIQUE,
  PasswordU character varying NOT NULL,
  IdRol integer,
  Activo boolean,
  FechaCreacion timestamp without time zone DEFAULT now(),
  CONSTRAINT Usuario_pkey PRIMARY KEY (IdUsuario),
  CONSTRAINT Usuario_IdRol_fkey FOREIGN KEY (IdRol) REFERENCES public.Rol(IdRol)
);
CREATE TABLE public.UsuarioModelo (
  IdUsuarioModelo integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  IdUsuario integer NOT NULL,
  IdModelo integer NOT NULL,
  Activo boolean DEFAULT true,
  FechaAsignacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT UsuarioModelo_pkey PRIMARY KEY (IdUsuarioModelo),
  CONSTRAINT UsuarioModelo_IdUsuario_fkey FOREIGN KEY (IdUsuario) REFERENCES public.Usuario(IdUsuario),
  CONSTRAINT UsuarioModelo_IdModelo_fkey FOREIGN KEY (IdModelo) REFERENCES public.ModeloIA(IdModelo)
);