// Después de correr scripts/deploy.sh, pegá acá el CONTRACT_ID que imprime.
export const CONFIG = {
  contractId: "CBN7TBFLY7O7HZWQOH2N34IEDRUIRVVGQM5YWY6UOR6N2O5KA4ZVQXZC",
  rpcUrl: "https://soroban-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
  explorer: "https://stellar.expert/explorer/testnet",
  friendbot: "https://friendbot.stellar.org",
  sitio: "https://matiasledesma449.github.io/Orbita/", // web pública: las imágenes de ejemplo se guardan con este link
  moneda: "XLM", // en producción: USDC
  decimales: 7,
  // Proyectos de prueba técnica del contrato (huerta, panadería y demos de los scripts).
  // No se muestran en la lista principal ni cuentan en los números de Inicio: van a la
  // sección colapsada "Pruebas del sistema". Agregá acá el ID de cualquier proyecto de prueba.
  pruebas: [0, 1, 2, 3, 4, 7], // 7 = prueba automática del formulario de Publicar
};
