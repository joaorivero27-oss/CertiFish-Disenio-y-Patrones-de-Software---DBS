# language: es
@HU-04 @RegistroDeCapturas
Característica: HU-04 Consultar el consumo acumulado de capturas de la cooperativa
  Como Coordinador
  Quiero ver el resumen acumulado de las capturas de las embarcaciones de mi cooperativa, por especie y periodo
  Para tener una referencia interna de lo capturado, sin un veredicto que el sistema no puede garantizar

  Antecedentes:
    Dado que el Coordinador "Carlos Ruiz" gestiona la cooperativa "Cooperativa Pesquera Paita"
    Y que la cooperativa tiene estas capturas:
      | código | Patrón      | especie | fecha      | cantidad | estado     |
      | C-01   | Juan Quispe | Pota    | 2026-11-05 | 300 kg   | Verificada |
      | C-02   | Luis Ramos  | Pota    | 2026-11-18 | 200 kg   | Registrada |
      | C-03   | Luis Ramos  | Perico  | 2026-11-20 | 150 kg   | Aprobada   |
      | C-04   | Juan Quispe | Pota    | 2026-10-28 | 400 kg   | Verificada |
    Y que la cooperativa "Cooperativa Pesquera Máncora" registró 900 kg de "Pota" en el periodo "2026-11"

  Escenario: Consulta del resumen de capturas
    Cuando el Coordinador solicita el resumen de capturas del periodo "2026-11"
    Entonces el resumen muestra estos totales:
      | especie | total  |
      | Pota    | 500 kg |
      | Perico  | 150 kg |

  Escenario: El sistema no emite veredicto de cumplimiento
    Cuando el Coordinador solicita el resumen de capturas del periodo "2026-11"
    Entonces el resumen no muestra un saldo disponible ni el cumplimiento del límite nacional
    Y el resumen solo incluye las capturas de la cooperativa "Cooperativa Pesquera Paita"

  Escenario: Falla al cargar el resumen
    Dado que el servicio de capturas no está disponible
    Cuando el Coordinador solicita el resumen de capturas del periodo "2026-11"
    Entonces el sistema muestra el mensaje "No se pudo cargar el resumen de capturas. Intenta nuevamente."

  Escenario: Cooperativa sin capturas registradas aún
    Cuando el Coordinador solicita el resumen de capturas del periodo "2026-12"
    Entonces el resumen muestra un total de 0 kg en lugar de un error
