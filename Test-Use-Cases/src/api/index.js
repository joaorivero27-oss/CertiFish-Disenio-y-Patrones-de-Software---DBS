'use strict';

const { ErrorDeAutorizacion } = require('../compartido');
const { ROLES } = require('../usuarios-acceso');

/**
 * Equivale al API Gateway y a los controladores: toda operación valida, del lado del servidor,
 * el rol del usuario y que los datos pertenezcan a su cooperativa (RNF05).
 */
class ApiCertiFish {
  constructor(s) {
    this.s = s;
  }

  autorizar(actor, funcionalidad) {
    this.s.usuarios.autorizar(actor, funcionalidad);
  }

  mismaCooperativa(actor, cooperativa) {
    if (actor.cooperativa !== cooperativa) throw new ErrorDeAutorizacion();
  }

  capturaDeSuCooperativa(actor, id) {
    const captura = this.s.registro.captura(id);
    if (!captura || captura.cooperativa !== actor.cooperativa) throw new ErrorDeAutorizacion();
  }

  // Registro de Capturas
  registrarCaptura(actor, payload) {
    this.autorizar(actor, 'Registrar captura');
    return this.s.registro.registrar({ ...payload, patron: actor.nombre });
  }

  misCapturas(actor) {
    this.autorizar(actor, 'Consultar mis capturas');
    return this.s.registro.historialDePatron(actor.nombre);
  }

  capturasDePatron(actor, patron) {
    if (actor.rol === ROLES.PATRON && actor.nombre !== patron) throw new ErrorDeAutorizacion();
    return this.misCapturas(actor);
  }

  detalleDeMiCaptura(actor, id) {
    this.autorizar(actor, 'Consultar mis capturas');
    if (this.s.registro.captura(id).patron !== actor.nombre) throw new ErrorDeAutorizacion();
    return this.s.registro.detalle(id);
  }

  resumenDeCapturas(actor, periodo) {
    this.autorizar(actor, 'Consultar resumen de capturas');
    return this.s.registro.resumen(actor.cooperativa, periodo);
  }

  historialDeCooperativa(actor, cooperativa, filtro) {
    this.autorizar(actor, 'Consultar historial de la cooperativa');
    this.mismaCooperativa(actor, cooperativa);
    return this.s.registro.historialDeCooperativa(cooperativa, filtro);
  }

  embarcacionesDe(actor, cooperativa) {
    this.autorizar(actor, 'Consultar historial de la cooperativa');
    this.mismaCooperativa(actor, cooperativa);
    return this.s.cooperativas.embarcacionesDe(cooperativa);
  }

  lotesDe(actor, cooperativa) {
    this.autorizar(actor, 'Consolidar lote');
    this.mismaCooperativa(actor, cooperativa);
    return this.s.lotes.lotesDe(cooperativa);
  }

  // Verificación de Capturas
  bandejaDeRevision(actor) {
    this.autorizar(actor, 'Revisar capturas pendientes');
    return this.s.verificacion.bandejaRevision(actor.cooperativa);
  }

  aprobarCaptura(actor, id) {
    this.autorizar(actor, 'Revisar capturas pendientes');
    this.capturaDeSuCooperativa(actor, id);
    return this.s.verificacion.aprobar(actor.nombre, id);
  }

  rechazarCaptura(actor, id, motivo) {
    this.autorizar(actor, 'Revisar capturas pendientes');
    this.capturaDeSuCooperativa(actor, id);
    return this.s.verificacion.rechazar(actor.nombre, id, motivo);
  }

  detallePendienteDeConfirmacion(actor, id) {
    this.autorizar(actor, 'Confirmar validez de capturas');
    this.capturaDeSuCooperativa(actor, id);
    return this.s.verificacion.detallePendienteConfirmacion(id);
  }

  confirmarValidez(actor, id, esValida) {
    this.autorizar(actor, 'Confirmar validez de capturas');
    this.capturaDeSuCooperativa(actor, id);
    return this.s.verificacion.confirmarValidez(actor.nombre, id, esValida);
  }

  // Cierres Normativos
  evaluarDatosDeCierre(actor, datos) {
    this.autorizar(actor, 'Registrar cierre normativo');
    return this.s.cierres.evaluarDatos(datos);
  }

  registrarCierre(actor, datos) {
    this.autorizar(actor, 'Registrar cierre normativo');
    return this.s.cierres.registrar(actor.nombre, actor.cooperativa, datos);
  }

  registrarModificacionDeCierre(actor, resolucionAnterior, cambios) {
    this.autorizar(actor, 'Registrar cierre normativo');
    return this.s.cierres.registrarModificacion(actor.nombre, actor.cooperativa, resolucionAnterior, cambios);
  }

  // Trazabilidad de Lotes
  capturasDisponiblesParaLote(actor) {
    this.autorizar(actor, 'Consolidar lote');
    return this.s.lotes.disponibles(actor.cooperativa);
  }

  consolidarLote(actor, ids) {
    this.autorizar(actor, 'Consolidar lote');
    return this.s.lotes.consolidar(actor.nombre, actor.cooperativa, ids);
  }

  // Certificación de Lotes
  emitirCertificado(actor, codigoLote) {
    this.autorizar(actor, 'Emitir certificado');
    this.mismaCooperativa(actor, this.s.lotes.lote(codigoLote).cooperativa);
    return this.s.certificacion.emitir(actor.nombre, codigoLote);
  }

  descargarCertificadoPDF(actor, codigoLote) {
    this.autorizar(actor, 'Descargar certificado y documentos de exportación');
    this.mismaCooperativa(actor, this.s.lotes.lote(codigoLote).cooperativa);
    return this.s.certificacion.descargarPDF(actor.nombre, codigoLote);
  }

  generarDocumentoExportacion(actor, codigoLote, mercado) {
    this.autorizar(actor, 'Descargar certificado y documentos de exportación');
    this.mismaCooperativa(actor, this.s.lotes.lote(codigoLote).cooperativa);
    return this.s.certificacion.generarDocumentoExportacion(actor.nombre, codigoLote, mercado);
  }

  /** Open Host Service: no requiere cuenta. */
  verificarCertificado(codigo) {
    return this.s.certificacion.verificarPublicamente(codigo);
  }
}

/** Interfaz (aplicación web o móvil): solo muestra las funcionalidades del rol. */
class InterfazCertiFish {
  constructor(usuarios) {
    this.usuarios = usuarios;
  }

  menu(usuario) {
    return this.usuarios.funcionalidadesDe(usuario);
  }

  abrir(usuario, funcionalidad, accion) {
    if (!this.menu(usuario).includes(funcionalidad)) throw new ErrorDeAutorizacion();
    return accion();
  }
}

module.exports = { ApiCertiFish, InterfazCertiFish };
