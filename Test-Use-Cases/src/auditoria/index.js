'use strict';

/** Bounded Context Auditoría (Generic): registra los eventos críticos con fecha, hora y responsable (RNF13). */

const EVENTOS_CRITICOS = {
  CIERRE_REGISTRADO: 'Cierre normativo registrado',
  VALIDEZ_CONFIRMADA: 'Validez de captura confirmada',
  CAPTURA_RECHAZADA_POR_CIERRE: 'Captura rechazada por cierre normativo',
  CAPTURA_APROBADA: 'Captura aprobada',
  CAPTURA_RECHAZADA: 'Captura rechazada',
  PATRON_ASOCIADO_A_EMBARCACION: 'Patrón asociado a embarcación',
  LOTE_CONSOLIDADO: 'Lote consolidado',
  CERTIFICADO_EMITIDO: 'Certificado emitido',
  CERTIFICADO_DESCARGADO: 'Certificado descargado',
  DOCUMENTO_EXPORTACION_GENERADO: 'Documento de exportación generado',
};

class ServicioAuditoria {
  constructor({ bus, reloj }) {
    this.reloj = reloj;
    this.registros = [];
    bus.suscribirATodos((evento, datos) => {
      if (!EVENTOS_CRITICOS[evento]) return;
      const descripcion = evento === 'DOCUMENTO_EXPORTACION_GENERADO'
        ? `Documento ${datos.formato} generado`
        : EVENTOS_CRITICOS[evento];
      this.registros.push({ evento, descripcion, responsable: datos.responsable || datos.patron, en: this.reloj.ahora(), datos });
    });
  }

  buscar(descripcion) {
    return this.registros.filter((r) => r.descripcion === descripcion);
  }
}

module.exports = { ServicioAuditoria, EVENTOS_CRITICOS };
