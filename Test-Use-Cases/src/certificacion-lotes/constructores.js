'use strict';

/**
 * Patrón Builder (DC-01d): el certificado, el PDF y los documentos CATCH y SIMP se arman
 * con los mismos pasos y distinta representación. Un nuevo formato de mercado se agrega
 * con un nuevo constructor, sin modificar los existentes.
 */

class DirectorDeDocumentos {
  armar(constructor, datosLote, codigoVerificacion) {
    constructor.iniciar(datosLote);
    for (const linea of datosLote.lineas) constructor.agregarCaptura(linea);
    if (codigoVerificacion) constructor.agregarCodigoVerificacion(codigoVerificacion);
    return constructor.resultado();
  }
}

/** Contenido del certificado de trazabilidad: sin datos personales de los Patrones. */
class ConstructorCertificado {
  iniciar(d) {
    this.contenido = { lote: d.codigo, cooperativa: d.cooperativa, especie: d.especie, capturas: [] };
  }
  agregarCaptura(l) {
    this.contenido.capturas.push({
      matricula: l.matricula, metodo: l.metodo, fecha: l.fecha, hora: l.hora, ubicacion: l.ubicacion, estado: l.estado,
    });
  }
  agregarCodigoVerificacion() {}
  resultado() { return this.contenido; }
}

class ConstructorPDF {
  iniciar(d) {
    this.lineas = ['CERTIFICADO DE TRAZABILIDAD - CertiFish', `Lote: ${d.codigo}`, `Cooperativa: ${d.cooperativa}`, `Especie: ${d.especie}`];
  }
  agregarCaptura(l) {
    this.lineas.push(`${l.matricula} | ${l.metodo} | ${l.fecha} ${l.hora} | ${l.ubicacion} | ${l.estado}`);
  }
  agregarCodigoVerificacion(codigo) { this.lineas.push(`Código de verificación: ${codigo}`); }
  resultado() { return { formato: 'PDF', texto: this.lineas.join('\n') }; }
}

/** Datos organizados para el sistema CATCH de la Unión Europea (Reglamento UE 2023/2842). */
class ConstructorCATCH {
  iniciar(d) {
    this.datos = { especie: d.especie, buqueMatriculas: [], zonaCaptura: [], fechaCaptura: [], metodo: [], pesoTotalKg: 0 };
  }
  agregarCaptura(l) {
    this.datos.buqueMatriculas.push(l.matricula);
    this.datos.zonaCaptura.push(l.zona);
    this.datos.fechaCaptura.push(l.fecha);
    this.datos.metodo.push(l.metodo);
    this.datos.pesoTotalKg += l.cantidadKg;
  }
  agregarCodigoVerificacion(codigo) { this.datos.codigoVerificacion = codigo; }
  resultado() { return { formato: 'CATCH', datos: this.datos }; }
}

/** Datos organizados para el programa SIMP de Estados Unidos (NOAA Fisheries). */
class ConstructorSIMP {
  iniciar(d) {
    this.datos = { especie: d.especie, embarcaciones: [], areaCaptura: [], fechaDesembarque: [], metodo: [], pesoTotalKg: 0 };
  }
  agregarCaptura(l) {
    this.datos.embarcaciones.push(l.matricula);
    this.datos.areaCaptura.push(l.ubicacion);
    this.datos.fechaDesembarque.push(l.fecha);
    this.datos.metodo.push(l.metodo);
    this.datos.pesoTotalKg += l.cantidadKg;
  }
  agregarCodigoVerificacion(codigo) { this.datos.codigoVerificacion = codigo; }
  resultado() { return { formato: 'SIMP', datos: this.datos }; }
}

module.exports = { DirectorDeDocumentos, ConstructorCertificado, ConstructorPDF, ConstructorCATCH, ConstructorSIMP };
