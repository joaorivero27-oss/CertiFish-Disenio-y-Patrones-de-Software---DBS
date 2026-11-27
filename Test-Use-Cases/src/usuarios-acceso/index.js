'use strict';

const crypto = require('crypto');
const { ErrorDeDominio, ErrorDeAutorizacion, MINUTO } = require('../compartido');

/** Bounded Context Usuarios y Acceso (Generic): registro, autenticación, bloqueo y permisos por rol. */

const ROLES = {
  PATRON: 'Patrón de embarcación',
  COORDINADOR: 'Coordinador',
};

const FUNCIONALIDADES = {
  [ROLES.PATRON]: ['Registrar captura', 'Consultar mis capturas'],
  [ROLES.COORDINADOR]: [
    'Revisar capturas pendientes',
    'Consultar resumen de capturas',
    'Consultar historial de la cooperativa',
    'Registrar cierre normativo',
    'Confirmar validez de capturas',
    'Consolidar lote',
    'Emitir certificado',
    'Descargar certificado y documentos de exportación',
  ],
};

const INTENTOS_MAXIMOS = 5;
const MINUTOS_DE_BLOQUEO = 15;
const MENSAJE_CREDENCIALES = 'Usuario o contraseña incorrectos.';
const MENSAJE_BLOQUEO = 'Cuenta bloqueada temporalmente. Intenta nuevamente en 15 minutos.';

function huella(contrasena, sal) {
  return crypto.createHash('sha256').update(`${sal}:${contrasena}`).digest('hex');
}

class ServicioUsuarios {
  constructor({ cooperativas, reloj, bus }) {
    this.cooperativas = cooperativas;
    this.reloj = reloj;
    this.bus = bus;
    this.cuentas = new Map(); // correo -> cuenta
  }

  registrar({ nombre, correo, contrasena, rol, vinculacion }) {
    const faltantes = [];
    if (!nombre) faltantes.push('nombre');
    if (!correo) faltantes.push('correo');
    if (!contrasena) faltantes.push('contraseña');
    if (!rol) faltantes.push('rol');
    if (!vinculacion) faltantes.push(rol === ROLES.PATRON ? 'embarcación' : 'cooperativa');
    if (faltantes.length) {
      throw new ErrorDeDominio(`Completa los datos obligatorios: ${faltantes.join(', ')}.`, 'DATOS_INCOMPLETOS', { faltantes });
    }
    if (this.cuentas.has(correo)) {
      throw new ErrorDeDominio('El correo ya está registrado.', 'CORREO_REGISTRADO');
    }
    let cooperativa;
    let embarcacion;
    if (rol === ROLES.COORDINADOR) {
      if (!this.cooperativas.existeCooperativa(vinculacion)) {
        throw new ErrorDeDominio('La cooperativa indicada no existe.', 'ENTIDAD_INEXISTENTE', { entidad: 'cooperativa' });
      }
      cooperativa = vinculacion;
    } else if (rol === ROLES.PATRON) {
      if (!this.cooperativas.existeEmbarcacion(vinculacion)) {
        throw new ErrorDeDominio('La embarcación indicada no existe.', 'ENTIDAD_INEXISTENTE', { entidad: 'embarcación' });
      }
      embarcacion = vinculacion;
      cooperativa = this.cooperativas.embarcacion(vinculacion).cooperativa;
      this.cooperativas.asociarPatron(nombre, vinculacion);
    } else {
      throw new ErrorDeDominio('El rol indicado no existe.', 'ROL_INEXISTENTE');
    }
    const sal = crypto.randomBytes(8).toString('hex');
    const cuenta = {
      nombre, correo, rol, cooperativa, embarcacion,
      sal, huella: huella(contrasena, sal),
      intentosFallidos: 0, bloqueadaHasta: null,
    };
    this.cuentas.set(correo, cuenta);
    this.bus.publicar('USUARIO_REGISTRADO', { usuario: nombre, rol });
    return this.vistaPublica(cuenta);
  }

  autenticar(correo, contrasena) {
    const cuenta = this.cuentas.get(correo);
    const ahora = this.reloj.ahora().getTime();
    if (cuenta && cuenta.bloqueadaHasta) {
      if (ahora < cuenta.bloqueadaHasta) {
        throw new ErrorDeDominio(MENSAJE_BLOQUEO, 'CUENTA_BLOQUEADA'); // no amplía el plazo
      }
      cuenta.bloqueadaHasta = null;
      cuenta.intentosFallidos = 0;
    }
    if (!cuenta || cuenta.huella !== huella(contrasena, cuenta.sal)) {
      if (cuenta) {
        cuenta.intentosFallidos += 1;
        if (cuenta.intentosFallidos >= INTENTOS_MAXIMOS) {
          cuenta.bloqueadaHasta = ahora + MINUTOS_DE_BLOQUEO * MINUTO;
          this.bus.publicar('CUENTA_BLOQUEADA', { usuario: cuenta.nombre });
        }
      }
      throw new ErrorDeDominio(MENSAJE_CREDENCIALES, 'CREDENCIALES_INCORRECTAS');
    }
    cuenta.intentosFallidos = 0;
    return this.vistaPublica(cuenta);
  }

  vistaPublica(cuenta) {
    const { nombre, correo, rol, cooperativa, embarcacion } = cuenta;
    return { nombre, correo, rol, cooperativa, embarcacion };
  }

  cuenta(correo) {
    return this.cuentas.get(correo);
  }

  usuarioPorNombre(nombre) {
    for (const cuenta of this.cuentas.values()) {
      if (cuenta.nombre === nombre) return this.vistaPublica(cuenta);
    }
    return undefined;
  }

  coordinadorDe(cooperativa) {
    for (const cuenta of this.cuentas.values()) {
      if (cuenta.rol === ROLES.COORDINADOR && cuenta.cooperativa === cooperativa) return cuenta.nombre;
    }
    return undefined;
  }

  funcionalidadesDe(usuario) {
    return [...(FUNCIONALIDADES[usuario.rol] || [])];
  }

  /** Validación del lado del servidor: se aplica aunque la interfaz oculte la opción. */
  autorizar(usuario, funcionalidad) {
    if (!usuario || !this.funcionalidadesDe(usuario).includes(funcionalidad)) {
      throw new ErrorDeAutorizacion();
    }
  }
}

module.exports = { ServicioUsuarios, ROLES, FUNCIONALIDADES, MENSAJE_CREDENCIALES, MENSAJE_BLOQUEO };
