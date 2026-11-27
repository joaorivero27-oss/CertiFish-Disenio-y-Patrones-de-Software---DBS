# language: es
@HU-16 @RegistroDeCapturas
Característica: HU-16 Consultar el historial de capturas de la cooperativa
  Como Coordinador
  Quiero consultar el historial y el estado de todas las capturas de las embarcaciones de mi cooperativa
  Para hacer seguimiento más allá del resumen agregado

  Antecedentes:
    Dado que el Coordinador "Carlos Ruiz" gestiona la cooperativa "Cooperativa Pesquera Paita"
    Y que la cooperativa tiene estas capturas:
      | código | Patrón      | embarcación | especie | fecha      | cantidad | estado     |
      | C-01   | Juan Quispe | PT-0101     | Pota    | 2026-11-20 | 300 kg   | Verificada |
      | C-02   | Luis Ramos  | PT-0102     | Perico  | 2026-11-22 | 120 kg   | Aprobada   |
      | C-03   | Luis Ramos  | PT-0102     | Pota    | 2026-11-24 | 250 kg   | Registrada |
    Y que la cooperativa "Cooperativa Pesquera Máncora" registró 900 kg de "Pota" en el periodo "2026-11"

  Escenario: Consulta exitosa del historial de la cooperativa
    Cuando el Coordinador consulta el historial de capturas de su cooperativa
    Entonces ve estas capturas con su fecha, Patrón, especie, cantidad y estado actual:
      | código | fecha      | Patrón      | especie | cantidad | estado     |
      | C-01   | 2026-11-20 | Juan Quispe | Pota    | 300 kg   | Verificada |
      | C-02   | 2026-11-22 | Luis Ramos  | Perico  | 120 kg   | Aprobada   |
      | C-03   | 2026-11-24 | Luis Ramos  | Pota    | 250 kg   | Registrada |

  Esquema del escenario: Filtrado del historial
    Cuando el Coordinador filtra el historial por <filtro> "<valor>"
    Entonces solo ve las capturas "<capturas>"

    Ejemplos:
      | filtro      | valor      | capturas    |
      | especie     | Pota       | C-01 y C-03 |
      | embarcación | PT-0102    | C-02 y C-03 |
      | estado      | Verificada | C-01        |

  Escenario: Falla al cargar el historial
    Dado que el servicio de capturas no está disponible
    Cuando el Coordinador consulta el historial de capturas de su cooperativa
    Entonces el sistema muestra un mensaje de error y ofrece reintentar la carga

  Escenario: Cooperativa sin capturas registradas
    Dado que el Coordinador "Ana Torres" gestiona la cooperativa "Cooperativa Pesquera Huacho"
    Cuando el Coordinador consulta el historial de capturas de su cooperativa
    Entonces el sistema indica que todavía no hay capturas registradas
