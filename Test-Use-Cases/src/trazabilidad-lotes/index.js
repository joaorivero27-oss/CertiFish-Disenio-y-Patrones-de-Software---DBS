'use strict';

const { ErrorDeDominio } = require('../compartido');
const { ESTADOS } = require('../verificacion-capturas/estados');

/** Bounded Context Trazabilidad de Lotes (Core): consolidación y estados del lote (RF23). */

const ESTADOS_LOTE = { CONSOLIDADO: 'Consolidado', CERTIFICADO: 'Certificado' };
const MENSAJE_NO_VALIDADAS = 'Solo se pueden consolidar capturas verificadas o aprobadas.';
const MENSAJE_ESPECIES = 'Un lote solo puede contener capturas de una misma especie.';

class ServicioLotes {
  constructor({ registro, verificacion, bus, reloj }) {
    this.registro = registro;
    this.verificacion = verificacion;
    this.bus = bus;
    this.reloj = reloj;
    this.lotes = new Map();
    this.lotePorCaptura = new Map();
    this.secuencia = 0;
  }

  consolidar(responsable, cooperativa, ids) {
    if (!ids.length) throw new ErrorDeDominio('Selecciona al menos una captura.', 'SIN_CAPTURAS');
    const capturas = ids.map((id) => this.registro.captura(id));
    if (capturas.some((c) => !c || c.cooperativa !== cooperativa)) {
      throw new ErrorDeDominio('Solo puedes consolidar capturas de tu cooperativa.', 'OTRA_COOPERATIVA');
    }
    if (ids.some((id) => !this.verificacion.puedeIncluirseEnLote(id))) {
      throw new ErrorDeDominio(MENSAJE_NO_VALIDADAS, 'CAPTURA_NO_VALIDADA');
    }
    if (new Set(capturas.map((c) => c.especie)).size > 1) {
      throw new ErrorDeDominio(MENSAJE_ESPECIES, 'ESPECIES_DISTINTAS');
    }
    const enOtroLote = ids.find((id) => this.lotePorCaptura.has(id));
    if (enOtroLote) {
      throw new ErrorDeDominio(`La captura ${enOtroLote} ya forma parte de otro lote.`, 'CAPTURA_EN_OTRO_LOTE');
    }
    this.secuencia += 1;
    const lote = this.guardar({
      codigo: `L-${String(this.secuencia).padStart(3, '0')}`,
      cooperativa,
      especie: capturas[0].especie,
      capturas: [...ids],
      estado: ESTADOS_LOTE.CONSOLIDADO,
      consolidadoEn: this.reloj.ahora(),
      responsable,
    });
    this.bus.publicar('LOTE_CONSOLIDADO', { codigo: lote.codigo, cooperativa, responsable });
    return lote;
  }

  guardar(lote) {
    this.lotes.set(lote.codigo, lote);
    for (const id of lote.capturas) this.lotePorCaptura.set(id, lote.codigo);
    return lote;
  }

  /** Capturas que el Coordinador puede elegir al armar un nuevo lote. */
  disponibles(cooperativa) {
    return this.verificacion
      .capturasEn(cooperativa, [ESTADOS.VERIFICADA, ESTADOS.APROBADA])
      .map((ciclo) => ciclo.id)
      .filter((id) => !this.lotePorCaptura.has(id));
  }

  lote(codigo) {
    const lote = this.lotes.get(codigo);
    if (!lote) throw new ErrorDeDominio('El lote no existe.', 'LOTE_INEXISTENTE');
    return lote;
  }

  lotesDe(cooperativa) {
    return [...this.lotes.values()].filter((l) => l.cooperativa === cooperativa);
  }

  marcarCertificado(codigo) {
    const lote = this.lote(codigo);
    lote.estado = ESTADOS_LOTE.CERTIFICADO;
    this.bus.publicar('LOTE_CERTIFICADO', { codigo });
  }

  /** Solo para preparar datos de prueba. */
  sembrar({ codigo, cooperativa, especie, capturas, estado = ESTADOS_LOTE.CONSOLIDADO }) {
    const numero = parseInt(String(codigo).replace(/\D/g, ''), 10);
    if (!Number.isNaN(numero)) this.secuencia = Math.max(this.secuencia, numero);
    const existente = this.lotes.get(codigo);
    if (existente) {
      existente.capturas.push(...capturas);
      for (const id of capturas) this.lotePorCaptura.set(id, codigo);
      return existente;
    }
    return this.guardar({ codigo, cooperativa, especie, capturas: [...capturas], estado });
  }
}

module.exports = { ServicioLotes, ESTADOS_LOTE, MENSAJE_NO_VALIDADAS, MENSAJE_ESPECIES };
