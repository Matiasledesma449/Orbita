#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, AuthorizedFunction, Ledger},
    token, vec, Address, Env, String,
};

struct Escenario {
    env: Env,
    contrato: OrbitaClient<'static>,
    token: Address,
    dueno: Address,
    plataforma: Address,
    ana: Address,
    beto: Address,
}

fn escenario() -> Escenario {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let activo = env.register_stellar_asset_contract_v2(admin);
    let token = activo.address();

    let plataforma = Address::generate(&env);
    let id = env.register(Orbita, (token.clone(), plataforma.clone()));
    let contrato = OrbitaClient::new(&env, &id);

    let dueno = Address::generate(&env);
    let ana = Address::generate(&env);
    let beto = Address::generate(&env);
    let minteo = token::StellarAssetClient::new(&env, &token);
    minteo.mint(&ana, &1_000);
    minteo.mint(&beto, &1_000);

    Escenario { env, contrato, token, dueno, plataforma, ana, beto }
}

fn crear(e: &Escenario) -> u32 {
    e.contrato.crear_proyecto(
        &e.dueno,
        &String::from_str(&e.env, "Huerta comunitaria"),
        &String::from_str(&e.env, "Una huerta para el barrio"),
        &String::from_str(&e.env, "https://ejemplo.org/huerta.jpg"),
        &1_000u64,
        &vec![
            &e.env,
            String::from_str(&e.env, "Compra de semillas"),
            String::from_str(&e.env, "Riego por goteo"),
        ],
        &vec![&e.env, 600i128, 400i128],
    )
}

fn evidencia(e: &Escenario, id: u32, hito: u32) {
    e.contrato.cargar_evidencia(&id, &hito, &String::from_str(&e.env, "https://ejemplo.org/fotos"));
}

fn saldo(e: &Escenario, quien: &Address) -> i128 {
    token::Client::new(&e.env, &e.token).balance(quien)
}

#[test]
fn flujo_completo_con_hito_rechazado() {
    let e = escenario();
    let id = crear(&e);
    assert_eq!(e.contrato.cantidad(), 1);
    assert_eq!(e.contrato.proyecto(&id).meta, 1_000);

    e.contrato.aportar(&id, &e.ana, &700);
    e.contrato.aportar(&id, &e.beto, &300);
    assert_eq!(e.contrato.proyecto(&id).estado, Estado::Financiado);
    assert_eq!(saldo(&e, &e.contrato.address), 1_000);

    // Hito 1: Ana (70%) aprueba y se liberan 600: 588 al dueño y 12 de comisión.
    e.contrato.votar(&id, &e.ana, &true);
    assert_eq!(e.contrato.liberar(&id), 588);
    assert_eq!(saldo(&e, &e.dueno), 588);
    assert_eq!(saldo(&e, &e.plataforma), 12);
    assert_eq!(e.contrato.proyecto(&id).hito_actual, 1);
    evidencia(&e, id, 0);

    // Hito 2: los dos rechazan, el proyecto falla y se reembolsan los 400 restantes.
    e.contrato.votar(&id, &e.beto, &false);
    assert_eq!(e.contrato.votar(&id, &e.ana, &false), Estado::Fallido);
    assert_eq!(e.contrato.reembolsar(&id, &e.ana), 280);
    assert_eq!(e.contrato.reembolsar(&id, &e.beto), 120);
    assert_eq!(saldo(&e, &e.ana), 300 + 280);
    assert_eq!(saldo(&e, &e.beto), 700 + 120);
    assert_eq!(saldo(&e, &e.contrato.address), 0);
}

#[test]
fn flujo_completo_exitoso() {
    let e = escenario();
    let id = crear(&e);
    e.contrato.aportar(&id, &e.ana, &500);
    e.contrato.aportar(&id, &e.beto, &500);

    e.contrato.votar(&id, &e.ana, &true);
    e.contrato.votar(&id, &e.beto, &true);
    e.contrato.liberar(&id);
    evidencia(&e, id, 0);
    e.contrato.votar(&id, &e.ana, &true);
    e.contrato.votar(&id, &e.beto, &true);
    e.contrato.liberar(&id);
    evidencia(&e, id, 1);

    assert_eq!(e.contrato.proyecto(&id).estado, Estado::Completado);
    assert_eq!(e.contrato.proyecto(&id).liberado, 1_000);
    assert_eq!(saldo(&e, &e.dueno), 980);
    assert_eq!(saldo(&e, &e.plataforma), 20);
    assert_eq!(saldo(&e, &e.contrato.address), 0);
}

#[test]
fn reembolso_si_vence_sin_meta() {
    let e = escenario();
    let id = crear(&e);
    e.contrato.aportar(&id, &e.ana, &200);
    e.env.ledger().with_mut(|l| l.timestamp = 2_000);
    assert_eq!(e.contrato.reembolsar(&id, &e.ana), 200);
    assert_eq!(saldo(&e, &e.ana), 1_000);
}

#[test]
#[should_panic(expected = "Error(Contract, #10)")]
fn no_libera_sin_mayoria() {
    let e = escenario();
    let id = crear(&e);
    e.contrato.aportar(&id, &e.ana, &500);
    e.contrato.aportar(&id, &e.beto, &500);
    e.contrato.votar(&id, &e.ana, &true); // 50% no alcanza
    e.contrato.liberar(&id);
}

#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn no_vota_dos_veces() {
    let e = escenario();
    let id = crear(&e);
    e.contrato.aportar(&id, &e.ana, &700);
    e.contrato.aportar(&id, &e.beto, &300);
    e.contrato.votar(&id, &e.beto, &false);
    e.contrato.votar(&id, &e.beto, &false);
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn no_supera_la_meta() {
    let e = escenario();
    let id = crear(&e);
    e.contrato.aportar(&id, &e.ana, &900);
    e.contrato.aportar(&id, &e.beto, &200); // 900 + 200 > 1.000
}

#[test]
fn guarda_descripcion_imagen_y_evidencia() {
    let e = escenario();
    let id = crear(&e);
    let p = e.contrato.proyecto(&id);
    assert_eq!(p.descripcion, String::from_str(&e.env, "Una huerta para el barrio"));
    assert_eq!(p.imagen, String::from_str(&e.env, "https://ejemplo.org/huerta.jpg"));
    assert_eq!(p.hitos.get(0).unwrap().evidencia.len(), 0);

    e.contrato.aportar(&id, &e.ana, &700);
    e.contrato.aportar(&id, &e.beto, &300);
    e.contrato.votar(&id, &e.ana, &true); // la etapa 1 se vota sin evidencia
    e.contrato.liberar(&id);
    evidencia(&e, id, 0);
    assert_eq!(
        e.contrato.proyecto(&id).hitos.get(0).unwrap().evidencia,
        String::from_str(&e.env, "https://ejemplo.org/fotos")
    );
}

#[test]
fn solo_el_dueno_carga_evidencia() {
    let e = escenario();
    let id = crear(&e);
    e.contrato.aportar(&id, &e.ana, &700);
    e.contrato.aportar(&id, &e.beto, &300);
    e.contrato.votar(&id, &e.ana, &true);
    e.contrato.liberar(&id);
    evidencia(&e, id, 0);

    let auths = e.env.auths();
    assert_eq!(auths.len(), 1);
    let (quien, invocacion) = &auths[0];
    assert_eq!(quien, &e.dueno);
    match &invocacion.function {
        AuthorizedFunction::Contract((_, funcion, _)) => {
            assert_eq!(funcion, &soroban_sdk::Symbol::new(&e.env, "cargar_evidencia"))
        }
        _ => panic!("autorización inesperada"),
    }
}

#[test]
#[should_panic(expected = "Error(Contract, #15)")]
fn no_vota_etapa_2_sin_evidencia() {
    let e = escenario();
    let id = crear(&e);
    e.contrato.aportar(&id, &e.ana, &700);
    e.contrato.aportar(&id, &e.beto, &300);
    e.contrato.votar(&id, &e.ana, &true);
    e.contrato.liberar(&id);
    e.contrato.votar(&id, &e.ana, &true); // falta la evidencia de la etapa 1
}

#[test]
#[should_panic(expected = "Error(Contract, #14)")]
fn no_carga_evidencia_de_etapa_no_liberada() {
    let e = escenario();
    let id = crear(&e);
    e.contrato.aportar(&id, &e.ana, &700);
    e.contrato.aportar(&id, &e.beto, &300);
    evidencia(&e, id, 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #16)")]
fn no_carga_evidencia_dos_veces() {
    let e = escenario();
    let id = crear(&e);
    e.contrato.aportar(&id, &e.ana, &700);
    e.contrato.aportar(&id, &e.beto, &300);
    e.contrato.votar(&id, &e.ana, &true);
    e.contrato.liberar(&id);
    evidencia(&e, id, 0);
    evidencia(&e, id, 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #13)")]
fn no_crea_proyecto_sin_titulo() {
    let e = escenario();
    e.contrato.crear_proyecto(
        &e.dueno,
        &String::from_str(&e.env, ""),
        &String::from_str(&e.env, ""),
        &String::from_str(&e.env, ""),
        &1_000u64,
        &vec![&e.env, String::from_str(&e.env, "Etapa")],
        &vec![&e.env, 100i128],
    );
}

#[test]
fn comision_del_2_por_ciento() {
    let e = escenario();
    assert_eq!(e.contrato.plataforma(), e.plataforma);
    let id = crear(&e);
    e.contrato.aportar(&id, &e.ana, &700);
    e.contrato.aportar(&id, &e.beto, &300);
    e.contrato.votar(&id, &e.ana, &true);
    assert_eq!(e.contrato.liberar(&id), 588);
    assert_eq!(saldo(&e, &e.plataforma), 12);
    assert_eq!(saldo(&e, &e.contrato.address), 400);
    // La etapa liberada cuenta completa: el retorno comprometido se calcula sobre 600.
    assert_eq!(e.contrato.proyecto(&id).liberado, 600);
}
