#![no_std]
//! Órbita: financiamiento colectivo de proyectos por hitos sobre Stellar (Soroban).
//!
//! - Un dueño (persona humana o jurídica) publica un proyecto dividido en hitos.
//! - Los aportantes envían fondos (XLM en testnet, USDC en producción) y reciben
//!   participaciones 1:1: son el "token" del proyecto y su peso de voto.
//! - Los fondos quedan en el contrato. La plata se libera ANTES de cada etapa:
//!   el voto significa "liberar la plata de la próxima etapa", y el dueño solo
//!   cobra cuando más de la mitad de las participaciones vota a favor.
//! - La etapa 1 se vota apenas el proyecto se financia. Para votar la etapa 2 en
//!   adelante, el dueño tiene que haber cargado la evidencia (URL) de la anterior.
//! - Si más de la mitad vota en contra, o el plazo vence sin llegar a la meta,
//!   cada aportante recupera su parte proporcional de lo que no se liberó.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, token,
    Address, Env, String, Vec,
};

const DIA_EN_LEDGERS: u32 = 17_280; // ~5 segundos por ledger
const TTL_MINIMO: u32 = 30 * DIA_EN_LEDGERS;
const TTL_MAXIMO: u32 = 120 * DIA_EN_LEDGERS;
const MAX_HITOS: u32 = 10;
const MAX_TITULO: u32 = 80;
const MAX_DESCRIPCION: u32 = 1_000;
const MAX_URL: u32 = 300;
const MAX_HITO: u32 = 120;
/// Comisión de Órbita sobre cada etapa liberada, en puntos básicos (200 = 2 %).
pub const COMISION_BPS: i128 = 200;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    ProyectoNoExiste = 1,
    HitosInvalidos = 2,
    MontoInvalido = 3,
    NoAbierto = 4,
    PlazoVencido = 5,
    SuperaMeta = 6,
    NoFinanciado = 7,
    SinParticipacion = 8,
    YaVoto = 9,
    SinMayoria = 10,
    NoReembolsable = 11,
    PlazoInvalido = 12,
    TextoInvalido = 13,
    HitoInvalido = 14,
    SinEvidencia = 15,
    EvidenciaYaCargada = 16,
    FechasInvalidas = 17,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Estado {
    /// Recibiendo aportes.
    Abierto = 0,
    /// Llegó a la meta: se vota y libera hito por hito.
    Financiado = 1,
    /// Todos los hitos fueron liberados.
    Completado = 2,
    /// Rechazado por los aportantes o vencido sin meta: se reembolsa.
    Fallido = 3,
}

/// Qué recibe a cambio quien aporta.
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum TipoRetorno {
    /// Préstamo con interés.
    Prestamo = 0,
    /// Un porcentaje de las ventas.
    Ventas = 1,
    /// Una parte de las ganancias.
    Ganancias = 2,
    /// Producto (unidades).
    Producto = 3,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Hito {
    pub descripcion: String,
    pub monto: i128,
    /// Lo que el dueño se compromete a devolver o producir por esta etapa.
    pub minimo_retorno: i128,
    /// Fecha (timestamp) para cargar la evidencia de esta etapa.
    pub fecha_limite: u64,
    pub evidencia: String,
    pub a_favor: i128,
    pub en_contra: i128,
    pub liberado: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Proyecto {
    pub dueno: Address,
    pub titulo: String,
    pub descripcion: String,
    pub imagen: String,
    pub tipo_retorno: TipoRetorno,
    pub condiciones: String,
    /// Fecha única para haber devuelto la suma de los mínimos de las etapas liberadas.
    pub fecha_devolucion: u64,
    pub meta: i128,
    pub recaudado: i128,
    pub liberado: i128,
    pub plazo: u64,
    pub hitos: Vec<Hito>,
    pub hito_actual: u32,
    pub estado: Estado,
    pub fondo_reembolso: i128,
}

#[contracttype]
#[derive(Clone)]
pub enum Clave {
    Token,
    Plataforma,
    Cantidad,
    Proyecto(u32),
    Participacion(u32, Address),
    Voto(u32, u32, Address),
}

#[contract]
pub struct Orbita;

#[contractimpl]
impl Orbita {
    /// Se ejecuta una sola vez al desplegar. `token` es el activo que se recauda y
    /// `plataforma` la dirección de Órbita que cobra la comisión.
    pub fn __constructor(env: Env, token: Address, plataforma: Address) {
        env.storage().instance().set(&Clave::Token, &token);
        env.storage().instance().set(&Clave::Plataforma, &plataforma);
        env.storage().instance().set(&Clave::Cantidad, &0u32);
    }

    /// Publica un proyecto. La meta es la suma de los montos de los hitos.
    /// `imagen` es una URL (puede ir vacía). Por cada hito, `minimos` es lo que el dueño
    /// se compromete a devolver o producir y `fechas` la fecha límite para la evidencia
    /// (crecientes y posteriores a `plazo`). `fecha_devolucion` tiene que ser posterior a
    /// la última fecha.
    pub fn crear_proyecto(
        env: Env,
        dueno: Address,
        titulo: String,
        descripcion: String,
        imagen: String,
        tipo_retorno: TipoRetorno,
        condiciones: String,
        plazo: u64,
        hitos: Vec<String>,
        montos: Vec<i128>,
        minimos: Vec<i128>,
        fechas: Vec<u64>,
        fecha_devolucion: u64,
    ) -> u32 {
        dueno.require_auth();

        if hitos.len() == 0
            || hitos.len() > MAX_HITOS
            || hitos.len() != montos.len()
            || hitos.len() != minimos.len()
            || hitos.len() != fechas.len()
        {
            panic_with_error!(&env, Error::HitosInvalidos);
        }
        if plazo <= env.ledger().timestamp() {
            panic_with_error!(&env, Error::PlazoInvalido);
        }
        if titulo.len() == 0
            || titulo.len() > MAX_TITULO
            || descripcion.len() > MAX_DESCRIPCION
            || imagen.len() > MAX_URL
            || condiciones.len() == 0
            || condiciones.len() > MAX_DESCRIPCION
        {
            panic_with_error!(&env, Error::TextoInvalido);
        }

        let mut lista: Vec<Hito> = Vec::new(&env);
        let mut meta: i128 = 0;
        let mut fecha_anterior = plazo;
        for i in 0..hitos.len() {
            let monto = montos.get(i).unwrap();
            let minimo_retorno = minimos.get(i).unwrap();
            if monto <= 0 || minimo_retorno < 0 {
                panic_with_error!(&env, Error::MontoInvalido);
            }
            let fecha_limite = fechas.get(i).unwrap();
            if fecha_limite <= fecha_anterior {
                panic_with_error!(&env, Error::FechasInvalidas);
            }
            fecha_anterior = fecha_limite;
            if i == hitos.len() - 1 && fecha_devolucion <= fecha_limite {
                panic_with_error!(&env, Error::FechasInvalidas);
            }
            meta += monto;
            let descripcion_hito = hitos.get(i).unwrap();
            if descripcion_hito.len() == 0 || descripcion_hito.len() > MAX_HITO {
                panic_with_error!(&env, Error::TextoInvalido);
            }
            lista.push_back(Hito {
                descripcion: descripcion_hito,
                monto,
                minimo_retorno,
                fecha_limite,
                evidencia: String::from_str(&env, ""),
                a_favor: 0,
                en_contra: 0,
                liberado: false,
            });
        }

        let id: u32 = env.storage().instance().get(&Clave::Cantidad).unwrap_or(0);
        let proyecto = Proyecto {
            dueno: dueno.clone(),
            titulo,
            descripcion,
            imagen,
            tipo_retorno,
            condiciones,
            fecha_devolucion,
            meta,
            recaudado: 0,
            liberado: 0,
            plazo,
            hitos: lista,
            hito_actual: 0,
            estado: Estado::Abierto,
            fondo_reembolso: 0,
        };
        guardar(&env, id, &proyecto);
        env.storage().instance().set(&Clave::Cantidad, &(id + 1));
        env.storage().instance().extend_ttl(TTL_MINIMO, TTL_MAXIMO);

        env.events()
            .publish((symbol_short!("creado"), id), (dueno, meta));
        id
    }

    /// Aporta fondos a un proyecto abierto. Devuelve la participación total del aportante.
    pub fn aportar(env: Env, id: u32, aportante: Address, monto: i128) -> i128 {
        aportante.require_auth();
        let mut p = cargar(&env, id);

        if p.estado != Estado::Abierto {
            panic_with_error!(&env, Error::NoAbierto);
        }
        if env.ledger().timestamp() > p.plazo {
            panic_with_error!(&env, Error::PlazoVencido);
        }
        if monto <= 0 {
            panic_with_error!(&env, Error::MontoInvalido);
        }
        if p.recaudado + monto > p.meta {
            panic_with_error!(&env, Error::SuperaMeta);
        }

        cliente_token(&env).transfer(&aportante, &env.current_contract_address(), &monto);

        let clave = Clave::Participacion(id, aportante.clone());
        let nueva: i128 = env.storage().persistent().get(&clave).unwrap_or(0) + monto;
        env.storage().persistent().set(&clave, &nueva);
        env.storage()
            .persistent()
            .extend_ttl(&clave, TTL_MINIMO, TTL_MAXIMO);

        p.recaudado += monto;
        if p.recaudado == p.meta {
            p.estado = Estado::Financiado;
        }
        guardar(&env, id, &p);

        env.events()
            .publish((symbol_short!("aporte"), id), (aportante, monto));
        nueva
    }

    /// Vota liberar la plata del hito actual, con el peso de la participación.
    /// Desde el segundo hito, exige la evidencia del hito anterior.
    /// Devuelve el estado del proyecto.
    pub fn votar(env: Env, id: u32, aportante: Address, aprobar: bool) -> Estado {
        aportante.require_auth();
        let mut p = cargar(&env, id);

        if p.estado != Estado::Financiado {
            panic_with_error!(&env, Error::NoFinanciado);
        }
        let peso = participacion_de(&env, id, &aportante);
        if peso <= 0 {
            panic_with_error!(&env, Error::SinParticipacion);
        }

        let n = p.hito_actual;
        if n > 0 && p.hitos.get(n - 1).unwrap().evidencia.len() == 0 {
            panic_with_error!(&env, Error::SinEvidencia);
        }
        let clave_voto = Clave::Voto(id, n, aportante.clone());
        if env.storage().persistent().has(&clave_voto) {
            panic_with_error!(&env, Error::YaVoto);
        }
        env.storage().persistent().set(&clave_voto, &aprobar);
        env.storage()
            .persistent()
            .extend_ttl(&clave_voto, TTL_MINIMO, TTL_MAXIMO);

        let mut hito = p.hitos.get(n).unwrap();
        if aprobar {
            hito.a_favor += peso;
        } else {
            hito.en_contra += peso;
        }

        if hito.en_contra * 2 > p.recaudado {
            p.estado = Estado::Fallido;
            p.fondo_reembolso = p.recaudado - p.liberado;
            env.events()
                .publish((symbol_short!("fallido"), id), p.fondo_reembolso);
        }
        p.hitos.set(n, hito);
        guardar(&env, id, &p);

        env.events()
            .publish((symbol_short!("voto"), id), (aportante, aprobar, peso));
        p.estado
    }

    /// El dueño cobra el hito actual si tiene mayoría a favor. Del monto de la etapa,
    /// el 2 % va a la plataforma. Devuelve lo que recibió el dueño.
    pub fn liberar(env: Env, id: u32) -> i128 {
        let mut p = cargar(&env, id);
        p.dueno.require_auth();

        if p.estado != Estado::Financiado {
            panic_with_error!(&env, Error::NoFinanciado);
        }
        let n = p.hito_actual;
        let mut hito = p.hitos.get(n).unwrap();
        if hito.a_favor * 2 <= p.recaudado {
            panic_with_error!(&env, Error::SinMayoria);
        }

        let monto = hito.monto;
        let comision = monto
            .checked_mul(COMISION_BPS)
            .expect("overflow")
            / 10_000;
        let neto = monto - comision;
        let token = cliente_token(&env);
        token.transfer(&env.current_contract_address(), &p.dueno, &neto);
        if comision > 0 {
            let plataforma: Address = env.storage().instance().get(&Clave::Plataforma).unwrap();
            token.transfer(&env.current_contract_address(), &plataforma, &comision);
            env.events()
                .publish((symbol_short!("comision"), id), (n, comision));
        }

        hito.liberado = true;
        p.hitos.set(n, hito);
        p.liberado += monto;
        p.hito_actual += 1;
        if p.hito_actual == p.hitos.len() {
            p.estado = Estado::Completado;
        }
        guardar(&env, id, &p);

        env.events()
            .publish((symbol_short!("liberado"), id), (n, monto));
        neto
    }

    /// El dueño carga la evidencia (URL) de un hito ya liberado. Se carga una sola vez.
    pub fn cargar_evidencia(env: Env, id: u32, hito: u32, url: String) {
        let mut p = cargar(&env, id);
        p.dueno.require_auth();

        if hito >= p.hitos.len() {
            panic_with_error!(&env, Error::HitoInvalido);
        }
        let mut h = p.hitos.get(hito).unwrap();
        if !h.liberado {
            panic_with_error!(&env, Error::HitoInvalido);
        }
        if h.evidencia.len() > 0 {
            panic_with_error!(&env, Error::EvidenciaYaCargada);
        }
        if url.len() == 0 || url.len() > MAX_URL {
            panic_with_error!(&env, Error::TextoInvalido);
        }

        h.evidencia = url.clone();
        p.hitos.set(hito, h);
        guardar(&env, id, &p);

        env.events()
            .publish((symbol_short!("evidencia"), id), (hito, url));
    }

    /// Devuelve al aportante su parte proporcional de lo no liberado.
    pub fn reembolsar(env: Env, id: u32, aportante: Address) -> i128 {
        aportante.require_auth();
        let mut p = cargar(&env, id);

        // Vencido sin llegar a la meta: pasa a fallido y todo es reembolsable.
        if p.estado == Estado::Abierto && env.ledger().timestamp() > p.plazo {
            p.estado = Estado::Fallido;
            p.fondo_reembolso = p.recaudado;
        }
        if p.estado != Estado::Fallido {
            panic_with_error!(&env, Error::NoReembolsable);
        }

        let peso = participacion_de(&env, id, &aportante);
        if peso <= 0 {
            panic_with_error!(&env, Error::SinParticipacion);
        }
        let monto = peso * p.fondo_reembolso / p.recaudado;

        let clave = Clave::Participacion(id, aportante.clone());
        env.storage().persistent().set(&clave, &0i128);
        guardar(&env, id, &p);

        if monto > 0 {
            cliente_token(&env).transfer(&env.current_contract_address(), &aportante, &monto);
        }

        env.events()
            .publish((symbol_short!("reembolso"), id), (aportante, monto));
        monto
    }

    // ---------- Lecturas ----------

    pub fn proyecto(env: Env, id: u32) -> Proyecto {
        cargar(&env, id)
    }

    pub fn cantidad(env: Env) -> u32 {
        env.storage().instance().get(&Clave::Cantidad).unwrap_or(0)
    }

    pub fn participacion(env: Env, id: u32, aportante: Address) -> i128 {
        participacion_de(&env, id, &aportante)
    }

    pub fn ya_voto(env: Env, id: u32, aportante: Address) -> bool {
        let p = cargar(&env, id);
        env.storage()
            .persistent()
            .has(&Clave::Voto(id, p.hito_actual, aportante))
    }

    pub fn token(env: Env) -> Address {
        env.storage().instance().get(&Clave::Token).unwrap()
    }

    pub fn plataforma(env: Env) -> Address {
        env.storage().instance().get(&Clave::Plataforma).unwrap()
    }
}

fn cargar(env: &Env, id: u32) -> Proyecto {
    env.storage()
        .persistent()
        .get(&Clave::Proyecto(id))
        .unwrap_or_else(|| panic_with_error!(env, Error::ProyectoNoExiste))
}

fn guardar(env: &Env, id: u32, p: &Proyecto) {
    let clave = Clave::Proyecto(id);
    env.storage().persistent().set(&clave, p);
    env.storage()
        .persistent()
        .extend_ttl(&clave, TTL_MINIMO, TTL_MAXIMO);
}

fn participacion_de(env: &Env, id: u32, aportante: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&Clave::Participacion(id, aportante.clone()))
        .unwrap_or(0)
}

fn cliente_token(env: &Env) -> token::Client<'_> {
    let direccion: Address = env.storage().instance().get(&Clave::Token).unwrap();
    token::Client::new(env, &direccion)
}

mod test;
