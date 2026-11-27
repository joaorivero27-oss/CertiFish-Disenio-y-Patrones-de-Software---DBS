'use strict';

const { ErrorDeDominio } = require('../compartido');
const { ESTADOS, Registrada, estadoDesdeNombre } = require('./estados');

/**
 * Bounded Context Verificación de Capturas (Core): dueño del estado de la captura.
 * Verifica con inteligencia artificial (umbral de 80 %), gestiona la revisión manual
 * del Coordinador y la confirmación de validez después de un cierre normativo.
 */

const UMBRAL_CONFIANZA = 80;
const TIEMPO_MAXIMO_SEGUNDOS = 8; // RNF01
const REINTENTOS = 3; // RF17

const MOTIVOS = {
  ESPECIE: 'La especie de la foto no coincide',
  TALLA: 'Talla menor a la Talla Mínima de Captura',
  CANTIDAD: 'Cantidad no coherente con la foto',
  CONFIANZA: 'Confianza menor al 80 %',
  FALLA: 'Falla del servicio de verificación tras 3 reintentos',
  CIERRE: 'cierre normativo',
};

class ServicioVerificacion {
  constructor({ registro, ia, bus, reloj }) {
    this.registro = registro;
    this.ia = ia; // puerto hacia AWS SageMaker (en las pruebas, un doble)
    this.bus = bus;
    this.reloj = reloj;
    this.cierres = undefined; // consulta a Cierres Normativos; la conecta la raíz de composición
    this.ciclos = new Map();
    this.tallasMinimas = new Map(); // reglas por especie (RNF10)
    bus.suscribir('CAPTURA_REGISTRADA', ({ id, cooperativa, patron }) => {
      this.ciclos.set(id, this.nuevoCiclo({ id, cooperativa, patron, estado: new Registrada() }));
    });
  }

  nuevoCiclo({ id, cooperativa, patron, estado, motivo }) {
    return { id, cooperativa, patron, estado, motivo, historial: [{ estado: estado.nombre, en: this.reloj.ahora() }], intentos: [] };
  }

  definirTallaMinima(especie, centimetros) {
    this.tallasMinimas.set(especie, centimetros);
  }

  ciclo(id) {
    const ciclo = this.ciclos.get(id);
    if (!ciclo) throw new ErrorDeDominio('La captura no existe.', 'CAPTURA_INEXISTENTE');
    return ciclo;
  }

  cambiar(ciclo, nuevoEstado) {
    ciclo.estado = nuevoEstado;
    ciclo.historial.push({ estado: nuevoEstado.nombre, en: this.reloj.ahora() });
  }

  estadoDe(id) {
    return this.ciclos.get(id)?.estado.nombre;
  }

  motivoDe(id) {
    return this.ciclos.get(id)?.motivo;
  }

  puedeIncluirseEnLote(id) {
    return this.ciclo(id).estado.puedeIncluirseEnLote();
  }

  capturasEn(cooperativa, estados) {
    return [...this.ciclos.values()].filter((c) => c.cooperativa === cooperativa && estados.includes(c.estado.nombre));
  }

  /** Verificación automática con reintentos (RF13 a RF17, RNF01). */
  verificar(id) {
    const ciclo = this.ciclo(id);
    const captura = this.registro.captura(id);
    ciclo.intentos = [];
    let resultado;
    let segundos = 0;
    for (let intento = 1; intento <= 1 + REINTENTOS; intento += 1) {
      const respuesta = this.ia.analizar(captura);
      const demora = respuesta.respondio ? respuesta.latenciaSegundos : TIEMPO_MAXIMO_SEGUNDOS;
      const aTiempo = respuesta.respondio && respuesta.latenciaSegundos <= TIEMPO_MAXIMO_SEGUNDOS;
      ciclo.intentos.push({ intento, estadoDurante: ciclo.estado.nombre, aTiempo });
      segundos += Math.min(demora, TIEMPO_MAXIMO_SEGUNDOS);
      if (aTiempo) {
        resultado = respuesta;
        break;
      }
    }
    ciclo.segundosHastaResultado = segundos;
    if (!resultado) {
      this.enviarARevision(ciclo, MOTIVOS.FALLA);
      return ciclo;
    }
    ciclo.resultadoIA = resultado;
    const motivo = this.evaluar(captura, resultado);
    if (motivo) {
      this.enviarARevision(ciclo, motivo);
    } else {
      this.cambiar(ciclo, ciclo.estado.marcarVerificada());
      this.bus.publicar('CAPTURA_VERIFICADA', { id, cooperativa: ciclo.cooperativa });
      this.revisarCierres(id);
    }
    return ciclo;
  }

  evaluar(captura, r) {
    if (r.especie !== captura.especie) return MOTIVOS.ESPECIE;
    const tallaMinima = this.tallasMinimas.get(captura.especie);
    if (tallaMinima !== undefined && r.tallaCm < tallaMinima) return MOTIVOS.TALLA;
    if (!r.cantidadCoherente) return MOTIVOS.CANTIDAD;
    if (captura.inconsistencia && captura.inconsistencia.hay) return captura.inconsistencia.detalle;
    if (r.confianza < UMBRAL_CONFIANZA) return MOTIVOS.CONFIANZA;
    return undefined;
  }

  enviarARevision(ciclo, motivo) {
    this.cambiar(ciclo, ciclo.estado.enviarARevision());
    ciclo.motivo = motivo;
    this.bus.publicar('CAPTURA_PENDIENTE_REVISION', { id: ciclo.id, cooperativa: ciclo.cooperativa, patron: ciclo.patron, motivo });
  }

  /** Bandeja de revisión manual del Coordinador (RF18). */
  bandejaRevision(cooperativa) {
    return this.capturasEn(cooperativa, [ESTADOS.PENDIENTE_REVISION]).map((ciclo) => {
      const c = this.registro.captura(ciclo.id);
      const cierre = this.cierres ? this.cierres.cierresQueAfectan(c)[0] : undefined;
      return {
        id: ciclo.id,
        foto: c.fotos[0],
        especie: c.especie,
        talla: ciclo.resultadoIA ? ciclo.resultadoIA.tallaCm : c.tallaCm,
        cantidad: c.cantidad,
        ubicacion: c.gps,
        resultadoVerificacion: { motivo: ciclo.motivo, confianza: ciclo.resultadoIA?.confianza },
        afectadaPorCierre: cierre ? cierre.resolucion : undefined,
      };
    });
  }

  aprobar(responsable, id) {
    const ciclo = this.ciclo(id);
    this.cambiar(ciclo, ciclo.estado.aprobar());
    ciclo.decision = { responsable, en: this.reloj.ahora() };
    this.bus.publicar('CAPTURA_APROBADA', { id, responsable });
    this.revisarCierres(id);
  }

  rechazar(responsable, id, motivo) {
    const ciclo = this.ciclo(id);
    if (!motivo || !motivo.trim()) {
      throw new ErrorDeDominio('Indica el motivo del rechazo antes de confirmar.', 'MOTIVO_REQUERIDO');
    }
    this.cambiar(ciclo, ciclo.estado.rechazar());
    ciclo.motivo = motivo;
    ciclo.decision = { responsable, en: this.reloj.ahora() };
    this.bus.publicar('CAPTURA_RECHAZADA', { id, patron: ciclo.patron, motivo, responsable });
  }

  /** RF22: una captura Verificada o Aprobada que coincide con un cierre pasa a confirmación. */
  marcarPendienteConfirmacion(id, cierre) {
    const ciclo = this.ciclo(id);
    if (!ciclo.estado.puedeIncluirseEnLote()) return false;
    this.cambiar(ciclo, ciclo.estado.marcarPendienteConfirmacion());
    ciclo.cierre = cierre.resolucion;
    return true;
  }

  /** Caso de la captura sincronizada después de un cierre (HU-06, escenario 8). */
  revisarCierres(id) {
    if (!this.cierres) return;
    const captura = this.registro.captura(id);
    const cierre = this.cierres.cierresQueAfectan(captura)[0];
    if (cierre && this.marcarPendienteConfirmacion(id, cierre)) {
      const cooperativa = this.ciclo(id).cooperativa;
      this.bus.publicar('CAPTURAS_PENDIENTES_CONFIRMACION', { cooperativa, capturas: [id], resolucion: cierre.resolucion });
    }
  }

  detallePendienteConfirmacion(id) {
    const ciclo = this.ciclo(id);
    return {
      captura: this.registro.captura(id),
      estado: ciclo.estado.nombre,
      cierre: this.cierres.porResolucion(ciclo.cierre),
    };
  }

  /** HU-07: la decisión siempre es manual del Coordinador. */
  confirmarValidez(responsable, id, esValida) {
    const ciclo = this.ciclo(id);
    if (esValida) {
      this.cambiar(ciclo, ciclo.estado.confirmarValidez());
      ciclo.decision = { responsable, en: this.reloj.ahora() };
      this.bus.publicar('VALIDEZ_CONFIRMADA', { id, responsable });
    } else {
      this.cambiar(ciclo, ciclo.estado.rechazarPorCierre());
      ciclo.motivo = MOTIVOS.CIERRE;
      ciclo.decision = { responsable, en: this.reloj.ahora() };
      this.bus.publicar('CAPTURA_RECHAZADA_POR_CIERRE', { id, patron: ciclo.patron, motivo: MOTIVOS.CIERRE, responsable });
    }
  }

  /** Solo para preparar datos de prueba. */
  sembrar({ id, cooperativa, patron, estado, motivo, estadoAnterior, tallaCm }) {
    const ciclo = this.nuevoCiclo({ id, cooperativa, patron, estado: estadoDesdeNombre(estado, estadoAnterior), motivo });
    if (tallaCm) ciclo.resultadoIA = { tallaCm, confianza: 70 };
    this.ciclos.set(id, ciclo);
    return ciclo;
  }

  /** Solo para preparar datos de prueba: simula que un cierre afectó a la captura. */
  forzarPendienteConfirmacion(id, resolucion) {
    const ciclo = this.ciclo(id);
    this.cambiar(ciclo, ciclo.estado.marcarPendienteConfirmacion());
    ciclo.cierre = resolucion;
  }
}

module.exports = { ServicioVerificacion, ESTADOS, MOTIVOS, UMBRAL_CONFIANZA, TIEMPO_MAXIMO_SEGUNDOS };
