'use strict';

const { ErrorDeDominio, fechaISO, MINUTO } = require('../compartido');

/**
 * Bounded Context Registro de Capturas (Core): dueño de la evidencia de la captura
 * (datos declarados, fotos, GPS, fecha y hora, metadatos EXIF), del historial y del resumen.
 * El estado de la captura lo administra Verificación de Capturas.
 */

const MENSAJE_CAMPOS = 'Debes completar todos los campos obligatorios.';
const MENSAJE_PERMISO = 'No se puede registrar la captura: el permiso de pesca de la embarcación no está vigente.';
const TOLERANCIA_KM = 1;
const TOLERANCIA_MINUTOS = 30;

function cantidadEnKg(cantidad) {
  const numero = parseFloat(String(cantidad).replace(',', '.'));
  return Number.isNaN(numero) ? 0 : numero;
}

function distanciaKm(a, b) {
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

class ServicioRegistroCapturas {
  constructor({ cooperativas, bus, reloj }) {
    this.cooperativas = cooperativas;
    this.bus = bus;
    this.reloj = reloj;
    this.capturas = new Map();
    this.porIdLocal = new Map();
    this.secuencia = 0;
    this.disponible = true;
    this.consultarEstado = () => undefined; // lo conecta la raíz de composición
    this.consultarMotivo = () => undefined;
  }

  registrar(payload) {
    const { idLocal, patron, especie, cantidad, metodo, fotos = [], gps, fechaHora } = payload;
    if (idLocal && this.porIdLocal.has(idLocal)) {
      return this.capturas.get(this.porIdLocal.get(idLocal)); // reenvío: sin duplicados (RNF04)
    }
    if (!especie || !cantidad || !metodo || fotos.length === 0 || !gps) {
      throw new ErrorDeDominio(MENSAJE_CAMPOS, 'CAMPOS_OBLIGATORIOS');
    }
    const embarcacion = this.cooperativas.embarcacionDe(patron);
    if (!embarcacion.permisoVigenteEl(fechaHora)) {
      throw new ErrorDeDominio(MENSAJE_PERMISO, 'PERMISO_NO_VIGENTE');
    }
    this.secuencia += 1;
    const captura = {
      id: `CAP-${String(this.secuencia).padStart(4, '0')}`,
      idLocal,
      patron,
      matricula: embarcacion.matricula,
      cooperativa: embarcacion.cooperativa,
      especie,
      cantidad,
      cantidadKg: cantidadEnKg(cantidad),
      metodo,
      fotos,
      gps,
      fechaHora,
      fecha: fechaISO(fechaHora),
      zona: undefined,
      registradaEn: this.reloj.ahora(),
    };
    captura.exif = fotos[0].exif;
    captura.inconsistencia = this.contrastarConExif(captura);
    this.guardar(captura);
    this.bus.publicar('CAPTURA_REGISTRADA', { id: captura.id, cooperativa: captura.cooperativa, patron });
    return captura;
  }

  /** RF16: compara el GPS y la fecha y hora del celular con el EXIF de la foto. */
  contrastarConExif(captura) {
    const exif = captura.exif;
    if (!exif) return { hay: true, detalle: 'La foto no tiene metadatos EXIF' };
    const km = distanciaKm(captura.gps, exif);
    const minutos = Math.abs(new Date(captura.fechaHora) - new Date(exif.fechaHora)) / MINUTO;
    if (km > TOLERANCIA_KM || minutos > TOLERANCIA_MINUTOS) {
      return { hay: true, detalle: 'Discrepancia entre el GPS y los metadatos EXIF' };
    }
    return { hay: false };
  }

  guardar(captura) {
    this.capturas.set(captura.id, captura);
    if (captura.idLocal) this.porIdLocal.set(captura.idLocal, captura.id);
  }

  /** Solo para preparar datos de prueba (equivale a datos ya existentes en el repositorio). */
  sembrar(datos) {
    const embarcacion = this.cooperativas.embarcacion(datos.matricula);
    const captura = {
      gps: { lat: -5.08, lon: -81.11 },
      metodo: 'Potera',
      fotos: [{ nombre: 'foto-1.jpg' }],
      inconsistencia: { hay: false },
      ...datos,
      cooperativa: embarcacion.cooperativa,
      cantidadKg: cantidadEnKg(datos.cantidad),
      fechaHora: `${datos.fecha}T09:30:00`,
    };
    this.guardar(captura);
    return captura;
  }

  captura(id) {
    return this.capturas.get(id);
  }

  zonaDe(captura) {
    return captura.zona || this.cooperativas.embarcacion(captura.matricula).zona;
  }

  verificarDisponibilidad(mensaje) {
    if (!this.disponible) throw new ErrorDeDominio(mensaje, 'SERVICIO_NO_DISPONIBLE', { reintentar: true });
  }

  delaCooperativa(cooperativa) {
    return [...this.capturas.values()].filter((c) => c.cooperativa === cooperativa);
  }

  /** RF20: total por especie y periodo, sin saldo ni veredicto de cumplimiento. */
  resumen(cooperativa, periodo) {
    this.verificarDisponibilidad('No se pudo cargar el resumen de capturas. Intenta nuevamente.');
    const totales = new Map();
    for (const c of this.delaCooperativa(cooperativa)) {
      if (!c.fecha.startsWith(periodo)) continue;
      totales.set(c.especie, (totales.get(c.especie) || 0) + c.cantidadKg);
    }
    const porEspecie = [...totales].map(([especie, totalKg]) => ({ especie, totalKg }));
    return {
      cooperativa,
      periodo,
      porEspecie,
      totalKg: porEspecie.reduce((suma, f) => suma + f.totalKg, 0),
    };
  }

  fila(c) {
    return {
      id: c.id,
      fecha: c.fecha,
      patron: c.patron,
      matricula: c.matricula,
      especie: c.especie,
      cantidad: c.cantidad,
      estado: this.consultarEstado(c.id),
    };
  }

  historialDePatron(patron) {
    this.verificarDisponibilidad('No se pudo cargar tu historial de capturas.');
    const filas = [...this.capturas.values()].filter((c) => c.patron === patron).map((c) => this.fila(c));
    return { filas, vacio: filas.length === 0, mensaje: filas.length ? undefined : 'Todavía no hay capturas registradas.' };
  }

  detalle(id) {
    const c = this.capturas.get(id);
    return { ...this.fila(c), motivoRechazo: this.consultarMotivo(id) };
  }

  historialDeCooperativa(cooperativa, filtro = {}) {
    this.verificarDisponibilidad('No se pudo cargar el historial de la cooperativa.');
    let filas = this.delaCooperativa(cooperativa).map((c) => this.fila(c));
    if (filtro.especie) filas = filas.filter((f) => f.especie === filtro.especie);
    if (filtro.embarcacion) filas = filas.filter((f) => f.matricula === filtro.embarcacion);
    if (filtro.estado) filas = filas.filter((f) => f.estado === filtro.estado);
    return { filas, vacio: filas.length === 0, mensaje: filas.length ? undefined : 'Todavía no hay capturas registradas.' };
  }
}

module.exports = { ServicioRegistroCapturas, MENSAJE_CAMPOS, MENSAJE_PERMISO, cantidadEnKg };
