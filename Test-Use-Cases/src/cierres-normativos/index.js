'use strict';

const { ErrorDeDominio } = require('../compartido');
const { ESTADOS } = require('../verificacion-capturas/estados');

/**
 * Bounded Context Cierres Normativos (Supporting): registra los cierres y actualizaciones
 * que PRODUCE informa al Coordinador e identifica las capturas que podrían verse afectadas.
 */

const MENSAJE_CAMPOS = 'Debes completar todos los campos obligatorios.';
const DATOS_BASICOS = ['tipo', 'especie', 'periodo', 'resolución'];
const DATOS_ADICIONALES_POR_ESPECIE = {
  Perico: ['zona regulatoria', 'capacidad de bodega'],
};

class ServicioCierres {
  constructor({ registro, verificacion, cooperativas, bus, reloj }) {
    this.registro = registro;
    this.verificacion = verificacion;
    this.cooperativas = cooperativas;
    this.bus = bus;
    this.reloj = reloj;
    this.cierres = [];
    this.secuencia = 0;
    bus.suscribir('CIERRE_REGISTRADO', ({ id }) => this.identificarAfectadas(this.cierres.find((c) => c.id === id)));
  }

  datosObligatorios(especies = []) {
    const adicionales = especies.flatMap((e) => DATOS_ADICIONALES_POR_ESPECIE[e] || []);
    return [...DATOS_BASICOS, ...new Set(adicionales)];
  }

  faltantes(datos) {
    const especies = datos.especies || [];
    const presentes = {
      tipo: Boolean(datos.tipo),
      especie: especies.length > 0,
      periodo: Boolean(datos.inicio && datos.fin),
      'resolución': Boolean(datos.resolucion),
      'zona regulatoria': Boolean(datos.zona),
      'capacidad de bodega': datos.capacidadBodegaMax !== undefined && datos.capacidadBodegaMax !== null,
    };
    return this.datosObligatorios(especies).filter((dato) => !presentes[dato]);
  }

  /** Escenario 1 de HU-05: los datos básicos permiten continuar con el registro. */
  evaluarDatos(datos) {
    const basicosCompletos = DATOS_BASICOS.every((d) => !this.faltantes(datos).includes(d));
    return { puedeContinuar: basicosCompletos, obligatorios: this.datosObligatorios(datos.especies) };
  }

  registrar(responsable, cooperativa, datos) {
    const faltantes = this.faltantes(datos);
    if (faltantes.length) throw new ErrorDeDominio(MENSAJE_CAMPOS, 'CAMPOS_OBLIGATORIOS', { faltantes });
    this.secuencia += 1;
    const cierre = {
      id: `CIE-${String(this.secuencia).padStart(3, '0')}`,
      ...datos,
      especies: [...datos.especies],
      cooperativa,
      coordinador: responsable,
      registradoEn: this.reloj.ahora(),
    };
    this.cierres.push(cierre); // nunca se sobrescribe un registro anterior
    this.bus.publicar('CIERRE_REGISTRADO', { id: cierre.id, cooperativa, responsable, resolucion: cierre.resolucion });
    return cierre;
  }

  /** Una resolución que modifica o reemplaza a otra se guarda como registro adicional. */
  registrarModificacion(responsable, cooperativa, resolucionAnterior, cambios) {
    const anterior = this.porResolucion(resolucionAnterior);
    if (!anterior) throw new ErrorDeDominio('La resolución que se quiere modificar no existe.', 'RESOLUCION_INEXISTENTE');
    const { id, registradoEn, coordinador, identificacion, ...datos } = anterior;
    return this.registrar(responsable, cooperativa, { ...datos, ...cambios, modificaA: resolucionAnterior });
  }

  porResolucion(resolucion) {
    return this.cierres.find((c) => c.resolucion === resolucion);
  }

  afecta(cierre, captura) {
    if (cierre.cooperativa !== captura.cooperativa) return false;
    if (!cierre.especies.includes(captura.especie)) return false;
    if (captura.fecha < cierre.inicio || captura.fecha > cierre.fin) return false;
    if (cierre.zona && this.registro.zonaDe(captura) !== cierre.zona) return false;
    if (cierre.capacidadBodegaMax !== undefined) {
      const embarcacion = this.cooperativas.embarcacion(captura.matricula);
      if (embarcacion.capacidadBodega > cierre.capacidadBodegaMax) return false;
    }
    return true;
  }

  cierresQueAfectan(captura) {
    return this.cierres.filter((cierre) => this.afecta(cierre, captura));
  }

  /** RF22 y RNF11: identifica y marca las capturas afectadas (máximo 2 horas). */
  identificarAfectadas(cierre) {
    const candidatas = this.verificacion.capturasEn(cierre.cooperativa, [ESTADOS.VERIFICADA, ESTADOS.APROBADA]);
    const afectadas = [];
    for (const ciclo of candidatas) {
      const captura = this.registro.captura(ciclo.id);
      if (this.afecta(cierre, captura) && this.verificacion.marcarPendienteConfirmacion(ciclo.id, cierre)) {
        afectadas.push(ciclo.id);
      }
    }
    const fin = this.reloj.ahora();
    cierre.identificacion = { afectadas, terminadaEn: fin, minutos: (fin - cierre.registradoEn) / 60000 };
    if (afectadas.length) {
      this.bus.publicar('CAPTURAS_PENDIENTES_CONFIRMACION', { cooperativa: cierre.cooperativa, capturas: afectadas, resolucion: cierre.resolucion });
    } else {
      this.bus.publicar('SIN_CAPTURAS_AFECTADAS', { cooperativa: cierre.cooperativa, resolucion: cierre.resolucion });
    }
  }
}

module.exports = { ServicioCierres, MENSAJE_CAMPOS, DATOS_ADICIONALES_POR_ESPECIE };
