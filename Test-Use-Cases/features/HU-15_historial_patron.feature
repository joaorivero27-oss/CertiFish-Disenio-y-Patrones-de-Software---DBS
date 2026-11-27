# language: es
@HU-15 @RegistroDeCapturas
Característica: HU-15 Consultar el historial y estado de mis capturas
  Como Patrón de embarcación
  Quiero consultar el historial y el estado de las capturas que yo mismo he registrado
  Para hacer seguimiento de mi actividad pesquera

  Antecedentes:
    Dado que el Coordinador "Carlos Ruiz" gestiona la cooperativa "Cooperativa Pesquera Paita"
    Y que la cooperativa tiene estas capturas:
      | código | Patrón      | especie | fecha      | cantidad | estado                       | motivo                                |
      | C-01   | Juan Quispe | Pota    | 2026-11-20 | 300 kg   | Verificada                   |                                       |
      | C-02   | Juan Quispe | Perico  | 2026-11-22 | 120 kg   | Pendiente de revisión manual | Confianza menor al 80 %               |
      | C-03   | Juan Quispe | Pota    | 2026-11-24 | 250 kg   | Rechazada                    | Inconsistencia entre la foto y el GPS |
      | C-04   | Luis Ramos  | Pota    | 2026-11-24 | 500 kg   | Verificada                   |                                       |

  Escenario: Consulta exitosa del historial de capturas
    Cuando "Juan Quispe" consulta su historial de capturas
    Entonces ve estas capturas con su fecha, especie, cantidad y estado actual:
      | código | fecha      | especie | cantidad | estado                       |
      | C-01   | 2026-11-20 | Pota    | 300 kg   | Verificada                   |
      | C-02   | 2026-11-22 | Perico  | 120 kg   | Pendiente de revisión manual |
      | C-03   | 2026-11-24 | Pota    | 250 kg   | Rechazada                    |
    Y no ve la captura "C-04", que registró otro Patrón

  Escenario: Detalle de una captura rechazada
    Cuando "Juan Quispe" abre el detalle de la captura "C-03"
    Entonces ve el motivo del rechazo "Inconsistencia entre la foto y el GPS"

  Escenario: Falla al cargar el historial
    Dado que el servicio de capturas no está disponible
    Cuando "Juan Quispe" consulta su historial de capturas
    Entonces el sistema muestra un mensaje de error y ofrece reintentar la carga

  Escenario: Patrón sin capturas registradas
    Dado que el Patrón de embarcación "Pedro Flores" opera la embarcación "PT-0103" de la cooperativa "Cooperativa Pesquera Paita"
    Cuando "Pedro Flores" consulta su historial de capturas
    Entonces el sistema indica que todavía no hay capturas registradas
