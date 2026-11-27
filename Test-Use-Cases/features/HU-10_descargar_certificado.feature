# language: es
@HU-10 @CertificacionDeLotes
Característica: HU-10 Descargar el certificado y preparar los datos del lote en formato CATCH o SIMP
  Como Coordinador
  Quiero descargar el certificado del lote en PDF y preparar los datos en el formato del mercado de destino
  Para entregarlos a la empresa exportadora y que complete su trámite de exportación

  # El documento CATCH o SIMP no reemplaza el certificado oficial.

  Antecedentes:
    Dado que el Coordinador "Carlos Ruiz" gestiona la cooperativa "Cooperativa Pesquera Paita"
    Y que la cooperativa tiene estas capturas:
      | código | Patrón      | especie | fecha      | estado     |
      | C-01   | Juan Quispe | Pota    | 2026-11-22 | Verificada |
      | C-02   | Luis Ramos  | Pota    | 2026-11-24 | Aprobada   |
      | C-03   | Juan Quispe | Pota    | 2026-11-25 | Verificada |
    Y que el Coordinador consolidó las capturas "C-01 y C-02" en el lote "L-001"
    Y que el Coordinador emitió el certificado del lote "L-001"

  Escenario: Descarga exitosa del certificado en PDF
    Cuando el Coordinador solicita el documento "PDF" del lote "L-001"
    Entonces el sistema entrega un PDF que incluye el código de verificación del certificado
    Y la auditoría registra "Certificado descargado" con fecha, hora y el responsable "Carlos Ruiz"

  Esquema del escenario: Preparación exitosa de los datos para CATCH o SIMP
    Cuando el Coordinador prepara los datos de exportación del lote "L-001" para el mercado "<mercado>"
    Entonces el sistema entrega los datos en la estructura de "<formato>" con el código de verificación
    Y los datos se validaron contra el esquema vigente de "<formato>" antes de entregarlos
    Y la auditoría registra "Documento <formato> generado" con fecha, hora y el responsable "Carlos Ruiz"

    Ejemplos:
      | mercado        | formato |
      | Unión Europea  | CATCH   |
      | Estados Unidos | SIMP    |

  Esquema del escenario: Falla en la generación del archivo
    Dado que la generación de archivos falla
    Cuando el Coordinador solicita el documento "<documento>" del lote "L-001"
    Entonces el sistema muestra el mensaje "No se pudo generar el archivo. Intenta nuevamente."
    Y la falla no se registra como una descarga

    Ejemplos:
      | documento |
      | PDF       |
      | CATCH     |
      | SIMP      |

  Escenario: Datos que no cumplen el esquema oficial
    Dado que el esquema oficial vigente de "CATCH" ahora exige el campo "puertoDesembarque"
    Cuando el Coordinador prepara los datos de exportación del lote "L-001" para el mercado "Unión Europea"
    Entonces el sistema muestra el mensaje "Los datos del lote no cumplen el formato oficial. Revisa la información del lote."
    Y el sistema no entrega el archivo

  Esquema del escenario: Intento de descarga o generación de un lote sin certificado emitido
    Dado que el Coordinador consolidó las capturas "C-03" en el lote "L-002"
    Cuando el Coordinador solicita el documento "<documento>" del lote "L-002"
    Entonces el sistema impide la operación porque el lote "L-002" no está en estado "Certificado"

    Ejemplos:
      | documento |
      | PDF       |
      | CATCH     |
      | SIMP      |

  Escenario: Descargas o generaciones múltiples del mismo certificado
    Cuando el Coordinador solicita el documento "PDF" del lote "L-001"
    Y el Coordinador solicita el documento "PDF" del lote "L-001"
    Y el Coordinador solicita el documento "SIMP" del lote "L-001"
    Entonces el sistema registra 3 entregas independientes del lote "L-001", cada una con fecha, hora y responsable
