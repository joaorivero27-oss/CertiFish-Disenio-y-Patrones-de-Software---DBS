# language: es
@HU-13 @UsuariosYAcceso
Característica: HU-13 Registro y autenticación de usuarios
  Como Patrón de embarcación o Coordinador
  Quiero registrarme y autenticarme en el sistema
  Para acceder a las funcionalidades correspondientes a mi rol

  Antecedentes:
    Dado que existe la cooperativa "Cooperativa Pesquera Paita"
    Y que existe la embarcación "PT-0101" de la cooperativa "Cooperativa Pesquera Paita"

  Esquema del escenario: Registro exitoso vinculado a una entidad existente
    Cuando "<nombre>" se registra con el correo "<correo>", una contraseña válida, el rol "<rol>" y la vinculación a "<entidad>"
    Entonces el sistema crea la cuenta con el rol "<rol>"

    Ejemplos:
      | nombre      | correo                | rol                   | entidad                    |
      | Carlos Ruiz | carlos.ruiz@correo.pe | Coordinador           | Cooperativa Pesquera Paita |
      | Juan Quispe | juan.quispe@correo.pe | Patrón de embarcación | PT-0101                    |

  Escenario: Autenticación exitosa
    Dado que "Juan Quispe" tiene una cuenta de Patrón de embarcación con el correo "juan.quispe@correo.pe" y la contraseña "Pesca2026*"
    Cuando inicia sesión con el correo "juan.quispe@correo.pe" y la contraseña "Pesca2026*"
    Entonces el sistema le concede acceso a las funcionalidades del rol "Patrón de embarcación"

  Esquema del escenario: Credenciales incorrectas
    Dado que "Juan Quispe" tiene una cuenta de Patrón de embarcación con el correo "juan.quispe@correo.pe" y la contraseña "Pesca2026*"
    Cuando inicia sesión con el correo "<correo>" y la contraseña "<contraseña>"
    Entonces el sistema muestra el mensaje "Usuario o contraseña incorrectos."
    Y el mensaje no indica si el error está en el usuario o en la contraseña

    Ejemplos:
      | correo                | contraseña |
      | juan.quispe@correo.pe | Clave123   |
      | no.existe@correo.pe   | Pesca2026* |

  Escenario: Registro con un usuario ya existente
    Dado que "Juan Quispe" tiene una cuenta de Patrón de embarcación con el correo "juan.quispe@correo.pe" y la contraseña "Pesca2026*"
    Cuando "Juan Quispe" se registra con el correo "juan.quispe@correo.pe", una contraseña válida, el rol "Patrón de embarcación" y la vinculación a "PT-0101"
    Entonces el sistema impide el registro y explica que el correo ya está registrado

  Esquema del escenario: Vinculación a una Cooperativa o Embarcación inexistente
    Cuando "<nombre>" se registra con el correo "<correo>", una contraseña válida, el rol "<rol>" y la vinculación a "<entidad>"
    Entonces el sistema impide el registro y explica que la <tipo de entidad> indicada no existe

    Ejemplos:
      | nombre      | correo                | rol                   | entidad                       | tipo de entidad |
      | Carlos Ruiz | carlos.ruiz@correo.pe | Coordinador           | Cooperativa Pesquera Ficticia | cooperativa     |
      | Juan Quispe | juan.quispe@correo.pe | Patrón de embarcación | PT-9999                       | embarcación     |

  Escenario: Registro con campos obligatorios incompletos
    Cuando "Juan Quispe" intenta registrarse sin completar el correo ni la contraseña
    Entonces el sistema impide el registro e indica que faltan "correo y contraseña"

  Escenario: Bloqueo temporal tras intentos fallidos de autenticación
    Dado que "Juan Quispe" tiene una cuenta de Patrón de embarcación con el correo "juan.quispe@correo.pe" y la contraseña "Pesca2026*"
    Y que falló la autenticación 5 veces seguidas con el correo "juan.quispe@correo.pe"
    Cuando inicia sesión con el correo "juan.quispe@correo.pe" y la contraseña "Pesca2026*"
    Entonces el sistema muestra el mensaje "Cuenta bloqueada temporalmente. Intenta nuevamente en 15 minutos."
    Cuando vuelve a intentarlo 10 minutos después del quinto intento fallido
    Entonces la cuenta sigue bloqueada hasta 15 minutos después del quinto intento fallido, sin ampliar el plazo
    Cuando pasan 15 minutos desde el quinto intento fallido
    Y inicia sesión con el correo "juan.quispe@correo.pe" y la contraseña "Pesca2026*"
    Entonces el sistema le concede acceso a las funcionalidades del rol "Patrón de embarcación"
    Y el contador de intentos fallidos vuelve a cero
