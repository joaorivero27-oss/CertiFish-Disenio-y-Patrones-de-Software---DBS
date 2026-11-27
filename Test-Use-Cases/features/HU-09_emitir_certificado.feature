# language: es
@HU-09 @CertificacionDeLotes
Característica: HU-09 Emitir el certificado de trazabilidad del lote
  Como Coordinador
  Quiero generar un certificado de trazabilidad del lote que reúna la evidencia de cada captura incluida
  Para respaldar ante la empresa exportadora el origen del lote

  # El certificado respalda el origen con evidencia; no certifica el cumplimiento normativo.

  Antecedentes:
    Dado que el Coordinador "Carlos Ruiz" gestiona la cooperativa "Cooperativa Pesquera Paita"
    Y que la cooperativa tiene estas capturas:
      | código | Patrón      | embarcación | especie | fecha      | estado     |
      | C-01   | Juan Quispe | PT-0101     | Pota    | 2026-11-22 | Verificada |
      | C-02   | Luis Ramos  | PT-0102     | Pota    | 2026-11-24 | Aprobada   |
    Y que el Coordinador consolidó las capturas "C-01 y C-02" en el lote "L-001"

  Escenario: Emisión del certificado de un lote consolidado
    Cuando el Coordinador solicita emitir el certificado del lote "L-001"
    Entonces el sistema genera el certificado con un código de verificación
    Y el certificado incluye la cooperativa "Cooperativa Pesquera Paita", la especie "Pota" y las matrículas "PT-0101 y PT-0102"
    Y el certificado incluye el método de captura, la fecha, la hora, la ubicación y el estado de cada captura
    Y el lote "L-001" pasa de "Consolidado" a "Certificado"

  Escenario: Lote con capturas que ya no cumplen el estado requerido
    Dado que la captura "C-02" pasó a estado "Pendiente de confirmación" después de la consolidación
    Cuando el Coordinador solicita emitir el certificado del lote "L-001"
    Entonces el sistema impide la emisión porque la captura "C-02" está en estado "Pendiente de confirmación"

  Escenario: Intento de certificar un lote que no está consolidado
    Dado que el Coordinador emitió el certificado del lote "L-001"
    Cuando el Coordinador solicita emitir el certificado del lote "L-001"
    Entonces el sistema impide la emisión porque el lote "L-001" no está en estado "Consolidado"

  Escenario: Falla al generar el certificado
    Dado que la generación del certificado falla
    Cuando el Coordinador solicita emitir el certificado del lote "L-001"
    Entonces el sistema no emite el certificado
    Y el lote "L-001" sigue en estado "Consolidado"
    Y el sistema muestra el mensaje "No se pudo emitir el certificado. Intenta nuevamente."
