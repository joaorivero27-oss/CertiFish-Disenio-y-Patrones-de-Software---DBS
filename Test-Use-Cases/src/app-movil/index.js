'use strict';

const { ErrorDeDominio, MINUTO } = require('../compartido');
const { MENSAJE_CAMPOS } = require('../registro-capturas');

/**
 * Simulación de la Aplicación móvil del Patrón (Flutter + SQLite en el C4): toma el GPS y la
 * hora del celular, guarda las capturas sin conexión y las sincroniza al recuperar la señal.
 */

const MENSAJE_GPS = 'No se pudo obtener tu ubicación. Actívala e intenta nuevamente.';

function isoLocal(fecha) {
  const f = new Date(fecha);
  const dos = (n) => String(n).padStart(2, '0');
  return `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}T${dos(f.getHours())}:${dos(f.getMinutes())}:${dos(f.getSeconds())}`;
}

class AplicacionMovil {
  constructor({ api, reloj, usuario, intervaloSincronizacionMinutos = 15 }) {
    this.api = api;
    this.reloj = reloj;
    this.usuario = usuario;
    this.intervalo = intervaloSincronizacionMinutos;
    this.celular = { gpsDisponible: true, conexion: 'estable', kbps: 1000, ubicacion: { lat: -5.0892, lon: -81.1144 }, fechaHoraFija: null };
    this.colaLocal = []; // SQLite en el celular
    this.sincronizadas = [];
    this.interrumpirSiguienteEnvio = false;
    this.secuencia = 0;
  }

  fechaHoraDelCelular() {
    return this.celular.fechaHoraFija || isoLocal(this.reloj.ahora());
  }

  /** Foto tomada con el celular: sus metadatos EXIF coinciden con el GPS y la hora. */
  tomarFoto() {
    return { nombre: `foto-${this.secuencia + 1}.jpg`, exif: { ...this.celular.ubicacion, fechaHora: this.fechaHoraDelCelular() } };
  }

  hayConexionEstable() {
    return this.celular.conexion === 'estable';
  }

  enviarRegistro({ especie, cantidad, metodo, fotos = [] }) {
    if (!especie || !cantidad || !metodo || fotos.length === 0) {
      throw new ErrorDeDominio(MENSAJE_CAMPOS, 'CAMPOS_OBLIGATORIOS');
    }
    if (!this.celular.gpsDisponible) throw new ErrorDeDominio(MENSAJE_GPS, 'GPS_NO_DISPONIBLE');
    this.secuencia += 1;
    const payload = {
      idLocal: `${this.usuario.nombre}-${this.secuencia}`,
      especie, cantidad, metodo, fotos,
      gps: { ...this.celular.ubicacion },
      fechaHora: this.fechaHoraDelCelular(),
    };
    if (!this.hayConexionEstable()) {
      this.colaLocal.push(payload);
      return { guardadaEnCelular: true, mensaje: 'La captura se guardó en el celular y se enviará al recuperar la conexión.' };
    }
    const captura = this.api.registrarCaptura(this.usuario, payload);
    return { captura, mensaje: 'Captura registrada correctamente.' };
  }

  recuperarConexion() {
    this.celular.conexion = 'estable';
    this.celular.kbps = 1000;
    this.conexionRecuperadaEn = this.reloj.ahora();
    this.reloj.programar(this.intervalo * MINUTO, () => this.sincronizar());
  }

  /** Envía la cola local. El servidor usa el idLocal para no duplicar un reenvío (RNF04). */
  sincronizar() {
    const pendientes = [...this.colaLocal];
    for (const payload of pendientes) {
      const captura = this.api.registrarCaptura(this.usuario, payload);
      if (this.interrumpirSiguienteEnvio) {
        this.interrumpirSiguienteEnvio = false; // el servidor lo recibió, pero la respuesta se perdió
        continue;
      }
      this.colaLocal = this.colaLocal.filter((p) => p !== payload);
      this.sincronizadas.push({ captura, en: this.reloj.ahora() });
    }
    if (this.colaLocal.length && this.hayConexionEstable()) {
      this.reloj.programar(MINUTO, () => this.sincronizar());
    }
  }
}

module.exports = { AplicacionMovil, MENSAJE_GPS, isoLocal };
