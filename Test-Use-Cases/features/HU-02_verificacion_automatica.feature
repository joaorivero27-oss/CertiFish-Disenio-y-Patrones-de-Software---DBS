# language: es
@HU-02 @VerificacionDeCapturas
Característica: HU-02 Verificación automática de la captura registrada
  Como Patrón de embarcación
  Quiero que el sistema verifique automáticamente mi captura contra la foto adjunta
  Para saber si quedó "Verificada" o si requiere revisión manual del Coordinador

  # El servicio de inteligencia artificial (AWS SageMaker) se reemplaza por un doble de prueba
  # que responde lo que indica cada escenario.

  Antecedentes:
    Dado que el Coordinador "Carlos Ruiz" gestiona la cooperativa "Cooperativa Pesquera Paita"
    Y que el Patrón de embarcación "Juan Quispe" opera la embarcación "PT-0101" de la cooperativa "Cooperativa Pesquera Paita"
    Y que la Talla Mínima de Captura del "Perico" es 70 cm
    Y que el Patrón registró una captura de "Perico" con foto, ubicación GPS y metadatos EXIF

  Esquema del escenario: Verificación automática exitosa
    Dado que el servicio de verificación responde en 3 segundos con la especie "Perico", una talla de 85 cm, una cantidad coherente y una confianza de <confianza> %
    Cuando el sistema ejecuta la verificación automática
    Entonces la captura queda en estado "Verificada"
    Y el resultado se entrega en un máximo de 8 segundos

    Ejemplos:
      | confianza |
      | 92        |
      | 80        |

  Esquema del escenario: Resultado de baja confianza o datos no coherentes
    Dado que el servicio de verificación responde en 3 segundos con la especie "<especie en la foto>", una talla de <talla> cm, una cantidad <cantidad> y una confianza de <confianza> %
    Cuando el sistema ejecuta la verificación automática
    Entonces la captura queda en estado "Pendiente de revisión manual" con el motivo "<motivo>"
    Y la captura no pasa directamente a "Rechazada"

    Ejemplos:
      | especie en la foto | talla | cantidad     | confianza | motivo                                   |
      | Perico             | 85    | coherente    | 79        | Confianza menor al 80 %                  |
      | Perico             | 62    | coherente    | 90        | Talla menor a la Talla Mínima de Captura |
      | Bonito             | 85    | coherente    | 90        | La especie de la foto no coincide        |
      | Perico             | 85    | no coherente | 90        | Cantidad no coherente con la foto        |

  Escenario: Discrepancia entre el GPS del celular y los metadatos EXIF
    Dado que la captura tiene una discrepancia entre el GPS del celular y los metadatos EXIF de la foto
    Y que el servicio de verificación responde en 3 segundos con la especie "Perico", una talla de 85 cm, una cantidad coherente y una confianza de 95 %
    Cuando el sistema ejecuta la verificación automática
    Entonces la captura queda en estado "Pendiente de revisión manual" con el motivo "Discrepancia entre el GPS y los metadatos EXIF"

  Esquema del escenario: Falla del servicio de verificación
    Dado que el servicio de verificación <falla>
    Cuando el sistema ejecuta la verificación automática
    Entonces la captura permanece en estado "Registrada" mientras el sistema reintenta la verificación 3 veces
    Y la captura queda en estado "Pendiente de revisión manual" con el motivo "Falla del servicio de verificación tras 3 reintentos"
    Y el Coordinador "Carlos Ruiz" recibe una alerta de la captura pendiente de revisión

    Ejemplos:
      | falla                           |
      | no responde                     |
      | responde después de 12 segundos |

  Escenario: Notificación al Coordinador
    Dado que el servicio de verificación responde en 3 segundos con la especie "Perico", una talla de 85 cm, una cantidad coherente y una confianza de 55 %
    Cuando el sistema ejecuta la verificación automática
    Entonces el Coordinador "Carlos Ruiz" recibe una alerta de la captura pendiente de revisión
    Y la decisión de aprobar o rechazar la captura queda a cargo del Coordinador
