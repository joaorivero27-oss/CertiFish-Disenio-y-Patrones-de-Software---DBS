'use strict';

const crypto = require('crypto');
const { ErrorDeDominio } = require('../compartido');
const { ESTADOS } = require('../verificacion-capturas/estados');
const { ESTADOS_LOTE } = require('../trazabilidad-lotes');
const {
  DirectorDeDocumentos, ConstructorCertificado, ConstructorPDF, ConstructorCATCH, ConstructorSIMP,
} = require('./constructores');

/**
 * Bounded Context Certificación de Lotes (Core): emite el certificado con su código de
 * verificación y su huella de integridad, genera el PDF y los documentos CATCH y SIMP,
 * y expone la verificación pública (Open Host Service).
 */

// Mismo formato que la landing page (sección 15): CF, año de emisión y correlativo de 6 dígitos, p. ej. CF-2026-000123
const FORMATO_CODIGO = /^CF-\d{4}-\d{6}$/;
const MERCADOS = { 'Unión Europea': 'CATCH', 'Estados Unidos': 'SIMP' };
const MENSAJE_ARCHIVO = 'No se pudo generar el archivo. Intenta nuevamente.';
const MENSAJE_ESQUEMA = 'Los datos del lote no cumplen el formato oficial. Revisa la información del lote.';

function huellaDe(contenido) {
  return crypto.createHash('sha256').update(JSON.stringify(contenido)).digest('hex');
}

class ServicioCertificacion {
  constructor({ lotes, registro, verificacion, bus, reloj }) {
    this.lotes = lotes;
    this.registro = registro;
    this.verificacion = verificacion;
    this.bus = bus;
    this.reloj = reloj;
    this.director = new DirectorDeDocumentos();
    this.certificados = new Map();
    this.codigoPorLote = new Map();
    this.correlativo = 0;
    this.entregas = [];
    this.falloAlEmitir = false;
    this.falloAlGenerarArchivos = false;
    // Campos exigidos por el esquema oficial vigente de cada formato (RNF12)
    this.esquemas = {
      CATCH: ['codigoVerificacion', 'especie', 'buqueMatriculas', 'zonaCaptura', 'fechaCaptura', 'metodo', 'pesoTotalKg'],
      SIMP: ['codigoVerificacion', 'especie', 'embarcaciones', 'areaCaptura', 'fechaDesembarque', 'metodo', 'pesoTotalKg'],
    };
  }

  datosDelLote(lote) {
    return {
      codigo: lote.codigo,
      cooperativa: lote.cooperativa,
      especie: lote.especie,
      lineas: lote.capturas.map((id) => {
        const c = this.registro.captura(id);
        return {
          matricula: c.matricula,
          metodo: c.metodo,
          fecha: c.fecha,
          hora: String(c.fechaHora).slice(11, 16),
          ubicacion: `${c.gps.lat}, ${c.gps.lon}`,
          zona: this.registro.zonaDe(c),
          estado: this.verificacion.estadoDe(id),
          cantidadKg: c.cantidadKg,
        };
      }),
    };
  }

  /** HU-09: el certificado respalda el origen con evidencia; no certifica el cumplimiento normativo. */
  emitir(responsable, codigoLote) {
    const lote = this.lotes.lote(codigoLote);
    if (lote.estado !== ESTADOS_LOTE.CONSOLIDADO) {
      throw new ErrorDeDominio(
        `No se puede emitir el certificado: el lote ${codigoLote} no está en estado "Consolidado".`,
        'LOTE_NO_CONSOLIDADO', { lote: codigoLote, estado: lote.estado },
      );
    }
    for (const id of lote.capturas) {
      const estado = this.verificacion.estadoDe(id);
      if (estado !== ESTADOS.VERIFICADA && estado !== ESTADOS.APROBADA) {
        throw new ErrorDeDominio(
          `No se puede emitir el certificado: la captura ${id} está en estado "${estado}".`,
          'CAPTURA_NO_VALIDA', { captura: id, estado },
        );
      }
    }
    if (this.falloAlEmitir) {
      throw new ErrorDeDominio('No se pudo emitir el certificado. Intenta nuevamente.', 'FALLA_AL_EMITIR');
    }
    const contenido = this.director.armar(new ConstructorCertificado(), this.datosDelLote(lote));
    const huella = huellaDe(contenido);
    this.correlativo += 1;
    const codigoVerificacion = `CF-${this.reloj.ahora().getFullYear()}-${String(this.correlativo).padStart(6, '0')}`;
    const certificado = { codigoVerificacion, lote: codigoLote, contenido, huella, emitidoEn: this.reloj.ahora(), responsable };
    this.certificados.set(codigoVerificacion, certificado);
    this.codigoPorLote.set(codigoLote, codigoVerificacion);
    this.lotes.marcarCertificado(codigoLote);
    this.bus.publicar('CERTIFICADO_EMITIDO', { lote: codigoLote, codigoVerificacion, responsable });
    return certificado;
  }

  certificadoDelLote(codigoLote) {
    return this.certificados.get(this.codigoPorLote.get(codigoLote));
  }

  validarLoteCertificado(codigoLote) {
    const lote = this.lotes.lote(codigoLote);
    if (lote.estado !== ESTADOS_LOTE.CERTIFICADO) {
      throw new ErrorDeDominio(
        `No se puede generar el documento: el lote ${codigoLote} no está en estado "Certificado".`,
        'LOTE_NO_CERTIFICADO', { lote: codigoLote, estado: lote.estado },
      );
    }
    if (this.falloAlGenerarArchivos) throw new ErrorDeDominio(MENSAJE_ARCHIVO, 'FALLA_AL_GENERAR_ARCHIVO');
    return lote;
  }

  registrarEntrega(codigoLote, documento, responsable) {
    this.entregas.push({ lote: codigoLote, documento, en: this.reloj.ahora(), responsable });
  }

  descargarPDF(responsable, codigoLote) {
    const lote = this.validarLoteCertificado(codigoLote);
    const codigo = this.codigoPorLote.get(codigoLote);
    const pdf = this.director.armar(new ConstructorPDF(), this.datosDelLote(lote), codigo);
    this.registrarEntrega(codigoLote, 'PDF', responsable);
    this.bus.publicar('CERTIFICADO_DESCARGADO', { lote: codigoLote, responsable });
    return { ...pdf, codigoVerificacion: codigo };
  }

  generarDocumentoExportacion(responsable, codigoLote, mercado) {
    const formato = MERCADOS[mercado];
    if (!formato) throw new ErrorDeDominio('Mercado de destino no soportado.', 'MERCADO_NO_SOPORTADO');
    const lote = this.validarLoteCertificado(codigoLote);
    const codigo = this.codigoPorLote.get(codigoLote);
    const constructor = formato === 'CATCH' ? new ConstructorCATCH() : new ConstructorSIMP();
    const documento = this.director.armar(constructor, this.datosDelLote(lote), codigo);
    const faltantes = this.esquemas[formato].filter((campo) => documento.datos[campo] === undefined);
    if (faltantes.length) throw new ErrorDeDominio(MENSAJE_ESQUEMA, 'ESQUEMA_NO_CUMPLIDO', { faltantes });
    this.registrarEntrega(codigoLote, formato, responsable);
    this.bus.publicar('DOCUMENTO_EXPORTACION_GENERADO', { lote: codigoLote, formato, responsable });
    return { ...documento, validadoContra: formato, codigoVerificacion: codigo };
  }

  /** HU-11: consulta pública, sin cuenta, que detecta cualquier alteración (RNF07). */
  verificarPublicamente(codigo) {
    if (!codigo || !FORMATO_CODIGO.test(codigo)) {
      throw new ErrorDeDominio('Ingresa un código de verificación válido.', 'FORMATO_INVALIDO');
    }
    const certificado = this.certificados.get(codigo);
    if (!certificado) throw new ErrorDeDominio('Código de verificación no válido.', 'CODIGO_INEXISTENTE');
    const integro = huellaDe(certificado.contenido) === certificado.huella;
    this.bus.publicar('CERTIFICADO_VERIFICADO', { codigo, integro });
    if (!integro) {
      return { valido: false, integro: false, mensaje: 'El certificado no es íntegro: su contenido cambió después de la emisión.' };
    }
    return { valido: true, integro: true, contenido: JSON.parse(JSON.stringify(certificado.contenido)) };
  }
}

module.exports = { ServicioCertificacion, MERCADOS, MENSAJE_ARCHIVO, MENSAJE_ESQUEMA };
