import dotenv from 'dotenv'

dotenv.config()

var API_KEY = process.env.POE_API_KEY || ''
var URL_API = 'https://api.poe.com/v1/chat/completions'
var MODELO = process.env.POE_MODEL || 'Gemini-2.5-Pro'

export async function preguntarAI(listaMensajes) {
  if (!API_KEY) {
    console.log('POE_API_KEY no configurada, usando respuesta simulada')
    return 'No hay API key de Poe configurada. Consulta pendiente de integrar.'
  }

  try {
    var respuesta = await fetch(URL_API, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODELO,
        messages: listaMensajes
      })
    })

    var textoCrudo = await respuesta.text()
    console.log('respuesta cruda Poe:', textoCrudo.substring(0, 300))

    var datos = JSON.parse(textoCrudo)

    if (!respuesta.ok) {
      console.error('error Poe API:', datos)
      return 'Error al comunicarse con la IA.'
    }

    return datos.choices[0].message.content
  } catch (e) {
    console.error('error llamando a Poe:', e.message)
    return 'Error de conexión con el servicio de IA.'
  }
}

export async function preguntarAIConStream(listaMensajes, onChunk) {
  if (!API_KEY) {
    console.log('POE_API_KEY no configurada, usando respuesta simulada')
    onChunk('No hay API key de Poe configurada. Consulta pendiente de integrar.')
    return
  }

  try {
    var respuesta = await fetch(URL_API, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODELO,
        messages: listaMensajes,
        stream: true
      })
    })

    if (!respuesta.ok) {
      var datos = await respuesta.json()
      console.error('error Poe API:', datos)
      onChunk('Error al comunicarse con la IA.')
      return
    }

    var reader = respuesta.body.getReader()
    var decoder = new TextDecoder()
    var textoCompleto = ''

    while (true) {
      var { done, value } = await reader.read()
      if (done) break

      var chunk = decoder.decode(value)
      var lineas = chunk.split('\n').filter(l => l.startsWith('data: '))

      for (var linea of lineas) {
        var dataStr = linea.slice(6)
        if (dataStr === '[DONE]') continue
        try {
          var data = JSON.parse(dataStr)
          var content = data.choices[0]?.delta?.content || ''
          if (content) {
            textoCompleto += content
            onChunk(content)
          }
        } catch (e) {
          // ignorar lineas mal formateadas
        }
      }
    }

    return textoCompleto
  } catch (e) {
    console.error('error llamando a Poe:', e.message)
    onChunk('Error de conexión con el servicio de IA.')
  }
}
