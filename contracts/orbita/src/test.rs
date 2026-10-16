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
        &TipoRetorno::Prestamo,
        &String::from_str(&e.env, "Devolvemos lo aportado más 10 % en dos cuotas."),
        &1_000u64,
        &vec![
            &e.env,
            String::from_str(&e.env, "Compra de semillas"),
            String::from_str(&e.env, "Riego por goteo"),
        ],
        &vec![&e.env, 600i128, 400i128],
        &vec![&e.env, 660i128, 440i128],
        &vec![&e.env, 5_000u64, 9_000u64],
        &20_000u64,
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
        &TipoRetorno::Producto,
        &String::from_str(&e.env, "Una caja por aporte"),
        &1_000u64,
        &vec![&e.env, String::from_str(&e.env, "Etapa")],
        &vec![&e.env, 100i128],
        &vec![&e.env, 0i128],
        &vec![&e.env, 2_000u64],
        &3_000u64,
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

/// Crea un proyecto de una o dos etapas con los datos de inversión indicados.
fn crear_con(
    e: &Escenario,
    condiciones: &str,
    montos: soroban_sdk::Vec<i128>,
    minimos: soroban_sdk::Vec<i128>,
    fechas: soroban_sdk::Vec<u64>,
) -> u32 {
    crear_con_devolucion(e, condiciones, montos, minimos, fechas, 20_000)
}

fn crear_con_devolucion(
    e: &Escenario,
    condiciones: &str,
    montos: soroban_sdk::Vec<i128>,
    minimos: soroban_sdk::Vec<i128>,
    fechas: soroban_sdk::Vec<u64>,
    fecha_devolucion: u64,
) -> u32 {
    let mut hitos = soroban_sdk::Vec::new(&e.env);
    for _ in 0..montos.len() {
        hitos.push_back(String::from_str(&e.env, "Etapa"));
    }
    e.contrato.crear_proyecto(
        &e.dueno,
        &String::from_str(&e.env, "Proyecto"),
        &String::from_str(&e.env, ""),
        &String::from_str(&e.env, ""),
        &TipoRetorno::Ventas,
        &String::from_str(&e.env, condiciones),
        &1_000u64,
        &hitos,
        &montos,
        &minimos,
        &fechas,
        &fecha_devolucion,
    )
}

#[test]
fn guarda_datos_de_inversion() {
    let e = escenario();
    let id = crear(&e);
    let p = e.contrato.proyecto(&id);
    assert_eq!(p.tipo_retorno, TipoRetorno::Prestamo);
    assert_eq!(
        p.condiciones,
        String::from_str(&e.env, "Devolvemos lo aportado más 10 % en dos cuotas.")
    );
    let h0 = p.hitos.get(0).unwrap();
    let h1 = p.hitos.get(1).unwrap();
    assert_eq!((h0.minimo_retorno, h0.fecha_limite), (660, 5_000));
    assert_eq!((h1.minimo_retorno, h1.fecha_limite), (440, 9_000));
    assert_eq!(p.fecha_devolucion, 20_000);
}

#[test]
#[should_panic(expected = "Error(Contract, #17)")]
fn fechas_tienen_que_ser_crecientes() {
    let e = escenario();
    crear_con(&e, "10 % de ventas", vec![&e.env, 600, 400], vec![&e.env, 0, 0], vec![&e.env, 5_000, 5_000]);
}

#[test]
#[should_panic(expected = "Error(Contract, #17)")]
fn fecha_de_etapa_posterior_al_plazo() {
    let e = escenario();
    crear_con(&e, "10 % de ventas", vec![&e.env, 600], vec![&e.env, 0], vec![&e.env, 1_000]);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn listas_del_mismo_largo() {
    let e = escenario();
    crear_con(&e, "10 % de ventas", vec![&e.env, 600, 400], vec![&e.env, 0], vec![&e.env, 5_000, 9_000]);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn minimo_no_negativo() {
    let e = escenario();
    crear_con(&e, "10 % de ventas", vec![&e.env, 600], vec![&e.env, -1], vec![&e.env, 5_000]);
}

#[test]
#[should_panic(expected = "Error(Contract, #13)")]
fn condiciones_obligatorias() {
    let e = escenario();
    crear_con(&e, "", vec![&e.env, 600], vec![&e.env, 0], vec![&e.env, 5_000]);
}

#[test]
#[should_panic(expected = "Error(Contract, #17)")]
fn devolucion_posterior_a_la_ultima_etapa() {
    let e = escenario();
    crear_con_devolucion(&e, "10 % de ventas", vec![&e.env, 600, 400], vec![&e.env, 0, 0], vec![&e.env, 5_000, 9_000], 9_000);
}

#[test]
fn devolucion_puede_ser_cualquier_fecha_posterior() {
    let e = escenario();
    let id = crear_con_devolucion(&e, "10 % de ventas", vec![&e.env, 600, 400], vec![&e.env, 0, 0], vec![&e.env, 5_000, 9_000], 9_001);
    assert_eq!(e.contrato.proyecto(&id).fecha_devolucion, 9_001);
}

/// Proyecto de la demo financiado (Ana 700, Beto 300) con la etapa 1 votada y liberada.
fn con_etapa_1_liberada(e: &Escenario) -> u32 {
    let id = crear(e);
    e.contrato.aportar(&id, &e.ana, &700);
    e.contrato.aportar(&id, &e.beto, &300);
    e.contrato.votar(&id, &e.ana, &true);
    e.contrato.liberar(&id);
    id
}

fn adelantar_reloj(e: &Escenario, hasta: u64) {
    e.env.ledger().with_mut(|l| l.timestamp = hasta);
}

#[test]
fn etapa_vencida_sin_evidencia_habilita_retiro() {
    let e = escenario();
    let id = con_etapa_1_liberada(&e);
    adelantar_reloj(&e, 5_001); // la evidencia de la etapa 1 vencía en 5.000

    assert_eq!(e.contrato.revisar(&id), Estado::Fallido);
    let p = e.contrato.proyecto(&id);
    assert_eq!(p.fondo_reembolso, 400); // lo que quedaba sin liberar

    // Cada uno retira su parte proporcional, sin votar.
    assert_eq!(e.contrato.reembolsar(&id, &e.ana), 280);
    assert_eq!(e.contrato.reembolsar(&id, &e.beto), 120);
    assert_eq!(saldo(&e, &e.contrato.address), 0);
}

#[test]
fn reembolsar_aplica_el_vencimiento_sin_llamar_a_revisar() {
    let e = escenario();
    let id = con_etapa_1_liberada(&e);
    adelantar_reloj(&e, 5_001);
    assert_eq!(e.contrato.reembolsar(&id, &e.beto), 120);
    assert_eq!(e.contrato.proyecto(&id).estado, Estado::Fallido);
}

#[test]
fn con_evidencia_a_tiempo_no_vence() {
    let e = escenario();
    let id = con_etapa_1_liberada(&e);
    evidencia(&e, id, 0);
    adelantar_reloj(&e, 5_001);
    assert_eq!(e.contrato.revisar(&id), Estado::Financiado);
    e.contrato.votar(&id, &e.ana, &true); // la etapa 2 se sigue votando normalmente
}

#[test]
fn antes_de_la_fecha_no_vence() {
    let e = escenario();
    let id = con_etapa_1_liberada(&e);
    adelantar_reloj(&e, 5_000); // justo en la fecha límite todavía está a tiempo
    assert_eq!(e.contrato.revisar(&id), Estado::Financiado);
}

#[test]
#[should_panic(expected = "Error(Contract, #11)")]
fn sin_vencer_no_se_puede_retirar() {
    let e = escenario();
    let id = con_etapa_1_liberada(&e);
    e.contrato.reembolsar(&id, &e.ana);
}

#[test]
#[should_panic(expected = "Error(Contract, #18)")]
fn no_carga_evidencia_vencida() {
    let e = escenario();
    let id = con_etapa_1_liberada(&e);
    adelantar_reloj(&e, 5_001);
    evidencia(&e, id, 0);
}

#[test]
fn revisar_marca_fallido_si_vence_el_plazo_sin_meta() {
    let e = escenario();
    let id = crear(&e);
    e.contrato.aportar(&id, &e.ana, &200);
    adelantar_reloj(&e, 1_001);
    assert_eq!(e.contrato.revisar(&id), Estado::Fallido);
    assert_eq!(e.contrato.proyecto(&id).fondo_reembolso, 200);
}

/// Proyecto de la demo completado: Ana 700 (70 %), Beto 300 (30 %), 1.000 liberados.
fn completado(e: &Escenario) -> u32 {
    let id = con_etapa_1_liberada(e);
    evidencia(e, id, 0);
    e.contrato.votar(&id, &e.ana, &true);
    e.contrato.liberar(&id);
    id
}

fn darle_al_dueno(e: &Escenario, monto: i128) {
    token::StellarAssetClient::new(&e.env, &e.token).mint(&e.dueno, &monto);
}

#[test]
fn el_pago_se_reparte_en_proporcion() {
    let e = escenario();
    let id = completado(&e);
    darle_al_dueno(&e, 1_100);
    assert_eq!(e.contrato.pagar_retorno(&id, &e.dueno, &1_100), 1_100);

    assert_eq!(e.contrato.pendiente(&id, &e.ana), 770);
    assert_eq!(e.contrato.pendiente(&id, &e.beto), 330);
    assert_eq!(e.contrato.cobrar(&id, &e.ana), 770);
    assert_eq!(e.contrato.cobrar(&id, &e.beto), 330);
    assert_eq!(saldo(&e, &e.contrato.address), 0);
    assert_eq!(e.contrato.proyecto(&id).total_pagado, 1_100);
}

#[test]
#[should_panic(expected = "Error(Contract, #11)")]
fn no_se_cobra_dos_veces() {
    let e = escenario();
    let id = completado(&e);
    darle_al_dueno(&e, 100);
    e.contrato.pagar_retorno(&id, &e.dueno, &100);
    assert_eq!(e.contrato.cobrar(&id, &e.ana), 70);
    e.contrato.cobrar(&id, &e.ana); // ya no queda nada
}

#[test]
fn varios_pagos_se_acumulan() {
    let e = escenario();
    let id = completado(&e);
    darle_al_dueno(&e, 150);
    e.contrato.pagar_retorno(&id, &e.dueno, &100);
    assert_eq!(e.contrato.cobrar(&id, &e.ana), 70); // Ana cobra entre pagos
    e.contrato.pagar_retorno(&id, &e.dueno, &50);
    assert_eq!(e.contrato.cobrar(&id, &e.ana), 35);
    assert_eq!(e.contrato.cobrar(&id, &e.beto), 45); // Beto cobra los dos juntos
    assert_eq!(saldo(&e, &e.contrato.address), 0);
}

#[test]
fn reembolso_y_retorno_se_cobran_juntos() {
    // El proyecto falla en la etapa 2, pero el dueño igual devuelve algo por la etapa 1.
    let e = escenario();
    let id = con_etapa_1_liberada(&e);
    evidencia(&e, id, 0);
    e.contrato.votar(&id, &e.beto, &false);
    assert_eq!(e.contrato.votar(&id, &e.ana, &false), Estado::Fallido);
    darle_al_dueno(&e, 66);
    e.contrato.pagar_retorno(&id, &e.dueno, &66);

    // Reembolso de lo no liberado (400) + retorno (66), redondeando hacia abajo.
    assert_eq!(e.contrato.cobrar(&id, &e.ana), 280 + 46);
    assert_eq!(e.contrato.reembolsar(&id, &e.beto), 120 + 19); // reembolsar = cobrar
    // El "polvo" del redondeo queda en el contrato: nunca se reparte de más.
    assert_eq!(saldo(&e, &e.contrato.address), 1);
}

#[test]
fn la_participacion_no_se_pierde_al_reembolsar() {
    let e = escenario();
    let id = con_etapa_1_liberada(&e);
    adelantar_reloj(&e, 5_001); // vence sin evidencia → reembolso
    assert_eq!(e.contrato.cobrar(&id, &e.ana), 280);
    assert_eq!(e.contrato.participacion(&id, &e.ana), 700);
    // Si el dueño después devuelve algo, Ana igual cobra su parte.
    darle_al_dueno(&e, 100);
    e.contrato.pagar_retorno(&id, &e.dueno, &100);
    assert_eq!(e.contrato.cobrar(&id, &e.ana), 70);
}

#[test]
fn cualquiera_puede_pagar_en_nombre_del_dueno() {
    let e = escenario();
    let id = completado(&e);
    e.contrato.pagar_retorno(&id, &e.ana, &10); // Ana todavía tiene 300 de saldo
    assert_eq!(e.contrato.cobrar(&id, &e.beto), 3);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn no_se_paga_retorno_sin_plata_liberada() {
    let e = escenario();
    let id = crear(&e);
    e.contrato.aportar(&id, &e.ana, &700);
    e.contrato.pagar_retorno(&id, &e.ana, &10);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn pago_mayor_a_cero() {
    let e = escenario();
    let id = completado(&e);
    e.contrato.pagar_retorno(&id, &e.dueno, &0);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn sin_participacion_no_se_cobra() {
    let e = escenario();
    let id = completado(&e);
    e.contrato.cobrar(&id, &e.dueno);
}

#[test]
fn nunca_se_reparte_mas_de_lo_que_entra() {
    // Pagos con montos "incómodos" y cobros intercalados: el contrato nunca queda debiendo.
    let e = escenario();
    let id = completado(&e);
    darle_al_dueno(&e, 10_000);
    let mut pagado = 0i128;
    let mut cobrado = 0i128;
    for monto in [1i128, 7, 13, 333, 999, 2, 3_001] {
        e.contrato.pagar_retorno(&id, &e.dueno, &monto);
        pagado += monto;
        for quien in [&e.ana, &e.beto] {
            if e.contrato.pendiente(&id, quien) > 0 {
                cobrado += e.contrato.cobrar(&id, quien);
            }
        }
        assert!(cobrado <= pagado);
        assert_eq!(saldo(&e, &e.contrato.address), pagado - cobrado);
    }
    // El "polvo" no crece con la cantidad de cobros: a lo sumo 1 por aportante.
    assert!(pagado - cobrado <= 2);
    // Y no se pierde: con un pago más, la fracción guardada se cobra.
    e.contrato.pagar_retorno(&id, &e.dueno, &1_000);
    cobrado += e.contrato.cobrar(&id, &e.ana) + e.contrato.cobrar(&id, &e.beto);
    assert_eq!(pagado + 1_000 - cobrado, saldo(&e, &e.contrato.address));
    assert!(saldo(&e, &e.contrato.address) <= 2);
}

// ---------- I5: historial de pagos e incumplido ----------
// En `crear`: evidencia hasta 5.000 y 9.000, devolución hasta 20.000,
// mínimos 660 + 440 = 1.100 (préstamo).

#[test]
fn historial_guarda_cada_pago_con_su_fecha() {
    let e = escenario();
    let id = completado(&e);
    darle_al_dueno(&e, 1_100);
    adelantar_reloj(&e, 10_000);
    e.contrato.pagar_retorno(&id, &e.dueno, &600);
    adelantar_reloj(&e, 15_000);
    e.contrato.pagar_retorno(&id, &e.dueno, &500);

    let p = e.contrato.proyecto(&id);
    assert_eq!(p.cantidad_pagos, 2);
    assert_eq!(e.contrato.pago(&id, &0), Pago { pagador: e.dueno.clone(), monto: 600, fecha: 10_000 });
    assert_eq!(e.contrato.pago(&id, &1), Pago { pagador: e.dueno.clone(), monto: 500, fecha: 15_000 });
    assert_eq!(e.contrato.prometido(&id), 1_100);
    assert_eq!(p.total_pagado, 1_100);
}

#[test]
#[should_panic(expected = "Error(Contract, #19)")]
fn pago_inexistente() {
    let e = escenario();
    let id = completado(&e);
    e.contrato.pago(&id, &0);
}

#[test]
fn pagando_a_tiempo_no_queda_incumplido() {
    let e = escenario();
    let id = completado(&e);
    darle_al_dueno(&e, 1_100);
    e.contrato.pagar_retorno(&id, &e.dueno, &1_100);
    adelantar_reloj(&e, 20_001);
    e.contrato.revisar(&id);
    assert!(!e.contrato.proyecto(&id).incumplido);
}

#[test]
fn antes_de_la_fecha_de_devolucion_no_queda_incumplido() {
    let e = escenario();
    let id = completado(&e);
    adelantar_reloj(&e, 20_000); // justo en la fecha todavía está a tiempo
    e.contrato.revisar(&id);
    assert!(!e.contrato.proyecto(&id).incumplido);
}

#[test]
fn sin_pagar_queda_incumplido_y_la_marca_sigue_aunque_pague_tarde() {
    let e = escenario();
    let id = completado(&e);
    adelantar_reloj(&e, 20_001);
    e.contrato.revisar(&id);
    assert!(e.contrato.proyecto(&id).incumplido);

    darle_al_dueno(&e, 1_100);
    e.contrato.pagar_retorno(&id, &e.dueno, &1_100); // paga tarde
    let p = e.contrato.proyecto(&id);
    assert!(p.incumplido); // la marca queda
    assert_eq!(e.contrato.pago(&id, &0).fecha, 20_001); // y el historial muestra cuándo pagó
    assert_eq!(e.contrato.cobrar(&id, &e.ana), 770); // los aportantes igual cobran
}

#[test]
fn pago_parcial_queda_incumplido() {
    let e = escenario();
    let id = completado(&e);
    darle_al_dueno(&e, 1_099);
    e.contrato.pagar_retorno(&id, &e.dueno, &1_099);
    adelantar_reloj(&e, 20_001);
    e.contrato.revisar(&id);
    assert!(e.contrato.proyecto(&id).incumplido);
}

#[test]
fn pagar_tarde_marca_el_incumplido_en_el_mismo_pago() {
    // Nadie llamó a revisar: el pago tardío igual deja la marca.
    let e = escenario();
    let id = completado(&e);
    darle_al_dueno(&e, 1_100);
    adelantar_reloj(&e, 20_001);
    e.contrato.pagar_retorno(&id, &e.dueno, &1_100);
    assert!(e.contrato.proyecto(&id).incumplido);
}

#[test]
fn solo_cuenta_lo_prometido_por_etapas_liberadas() {
    // Se libera la etapa 1 y la 2 se rechaza: el dueño solo debe los 660 de la etapa 1.
    let e = escenario();
    let id = con_etapa_1_liberada(&e);
    evidencia(&e, id, 0);
    e.contrato.votar(&id, &e.ana, &false);
    assert_eq!(e.contrato.proyecto(&id).estado, Estado::Fallido);
    assert_eq!(e.contrato.prometido(&id), 660);

    darle_al_dueno(&e, 660);
    e.contrato.pagar_retorno(&id, &e.dueno, &660);
    adelantar_reloj(&e, 20_001);
    e.contrato.revisar(&id);
    assert!(!e.contrato.proyecto(&id).incumplido);
}

/// Proyecto tipo Producto: una etapa de 1.000, evidencia hasta 5.000, devolución 20.000.
fn producto(e: &Escenario) -> u32 {
    let id = e.contrato.crear_proyecto(
        &e.dueno,
        &String::from_str(&e.env, "Cerveza artesanal"),
        &String::from_str(&e.env, ""),
        &String::from_str(&e.env, ""),
        &TipoRetorno::Producto,
        &String::from_str(&e.env, "Una caja de 12 por cada 100 aportados."),
        &1_000u64,
        &vec![&e.env, String::from_str(&e.env, "Primera producción")],
        &vec![&e.env, 1_000i128],
        &vec![&e.env, 120i128],
        &vec![&e.env, 5_000u64],
        &20_000u64,
    );
    e.contrato.aportar(&id, &e.ana, &700);
    e.contrato.aportar(&id, &e.beto, &300);
    e.contrato.votar(&id, &e.ana, &true);
    e.contrato.liberar(&id);
    id
}

#[test]
fn producto_queda_incumplido_si_vence_sin_evidencia() {
    let e = escenario();
    let id = producto(&e);
    adelantar_reloj(&e, 5_001);
    e.contrato.revisar(&id);
    assert!(e.contrato.proyecto(&id).incumplido);
}

#[test]
fn producto_con_evidencia_no_depende_de_pagos() {
    let e = escenario();
    let id = producto(&e);
    evidencia(&e, id, 0);
    adelantar_reloj(&e, 20_001); // pasó la devolución sin ningún pago
    e.contrato.revisar(&id);
    assert!(!e.contrato.proyecto(&id).incumplido);
}
