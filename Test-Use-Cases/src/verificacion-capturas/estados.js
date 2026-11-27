'use strict';

const { ErrorDeDominio } = require('../compartido');

/**
 * Patrón State (DC-01c): cada estado de la captura decide qué transiciones permite.
 * Así, por ejemplo, una captura "Pendiente de confirmación" no puede incluirse en un lote.
 */

const ESTADOS = {
  REGISTRADA: 'Registrada',
  VERIFICADA: 'Verificada',
  PENDIENTE_REVISION: 'Pendiente de revisión manual',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  PENDIENTE_CONFIRMACION: 'Pendiente de confirmación',
};

class EstadoCaptura {
  constructor(nombre) {
    this.nombre = nombre;
  }

  noPermitido(accion) {
    throw new ErrorDeDominio(`No se puede ${accion} una captura en estado "${this.nombre}".`, 'TRANSICION_NO_PERMITIDA');
  }

  marcarVerificada() { return this.noPermitido('verificar'); }
  enviarARevision() { return this.noPermitido('enviar a revisión manual'); }
  aprobar() { return this.noPermitido('aprobar'); }
  rechazar() { return this.noPermitido('rechazar'); }
  marcarPendienteConfirmacion() { return this.noPermitido('marcar como pendiente de confirmación'); }
  confirmarValidez() { return this.noPermitido('confirmar la validez de'); }
  rechazarPorCierre() { return this.noPermitido('rechazar por cierre normativo'); }
  puedeIncluirseEnLote() { return false; }
}

class Registrada extends EstadoCaptura {
  constructor() { super(ESTADOS.REGISTRADA); }
  marcarVerificada() { return new Verificada(); }
  enviarARevision() { return new PendienteRevisionManual(); }
}

class PendienteRevisionManual extends EstadoCaptura {
  constructor() { super(ESTADOS.PENDIENTE_REVISION); }
  aprobar() { return new Aprobada(); }
  rechazar() { return new Rechazada(); }
}

class Verificada extends EstadoCaptura {
  constructor() { super(ESTADOS.VERIFICADA); }
  marcarPendienteConfirmacion() { return new PendienteConfirmacion(this); }
  puedeIncluirseEnLote() { return true; }
}

class Aprobada extends EstadoCaptura {
  constructor() { super(ESTADOS.APROBADA); }
  marcarPendienteConfirmacion() { return new PendienteConfirmacion(this); }
  puedeIncluirseEnLote() { return true; }
}

class PendienteConfirmacion extends EstadoCaptura {
  constructor(estadoAnterior) {
    super(ESTADOS.PENDIENTE_CONFIRMACION);
    this.estadoAnterior = estadoAnterior;
  }
  confirmarValidez() { return this.estadoAnterior; }
  rechazarPorCierre() { return new Rechazada(); }
}

class Rechazada extends EstadoCaptura {
  constructor() { super(ESTADOS.RECHAZADA); }
}

/** Crea un estado a partir de su nombre (solo para preparar datos de prueba). */
function estadoDesdeNombre(nombre, nombreAnterior = ESTADOS.VERIFICADA) {
  switch (nombre) {
    case ESTADOS.REGISTRADA: return new Registrada();
    case ESTADOS.VERIFICADA: return new Verificada();
    case ESTADOS.PENDIENTE_REVISION: return new PendienteRevisionManual();
    case ESTADOS.APROBADA: return new Aprobada();
    case ESTADOS.RECHAZADA: return new Rechazada();
    case ESTADOS.PENDIENTE_CONFIRMACION: return new PendienteConfirmacion(estadoDesdeNombre(nombreAnterior));
    default: throw new Error(`Estado desconocido: ${nombre}`);
  }
}

module.exports = { ESTADOS, Registrada, estadoDesdeNombre };
