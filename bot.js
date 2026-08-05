const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('🚀 Iniciando bot validador de BINs...');

// ============================================
// FUNCIONES DEL GENERADOR (DE TU CÓDIGO ORIGINAL)
// ============================================

// Verificar Luhn
function verificarLuhn(numero) {
  let suma = 0;
  let doble = false;
  for (let i = numero.length - 1; i >= 0; i--) {
    let digito = parseInt(numero.charAt(i));
    if (doble) {
      digito *= 2;
      if (digito > 9) digito -= 9;
    }
    suma += digito;
    doble = !doble;
  }
  return suma % 10 === 0;
}

// Generar número válido con Luhn
function generarNumeroValidoLuhn(texto) {
  let numero = texto.replace(/x/g, () => Math.floor(Math.random() * 10).toString());
  
  if (numero.length !== 16) {
    let missingDigits = 16 - numero.length;
    for (let i = 0; i < missingDigits; i++) {
      numero += Math.floor(Math.random() * 10).toString();
    }
  }

  let suma = 0;
  let doble = false;
  for (let i = numero.length - 1; i >= 0; i--) {
    let digito = parseInt(numero.charAt(i));
    if (doble) {
      digito *= 2;
      if (digito > 9) digito -= 9;
    }
    suma += digito;
    doble = !doble;
  }

  let digitoControl = (10 - (suma % 10)) % 10;
  numero = numero.slice(0, -1) + digitoControl;

  if (!verificarLuhn(numero)) {
    return generarNumeroValidoLuhn(texto);
  }

  return numero;
}

// Generar CVV aleatorio
function generarCVV() {
  return Math.floor(Math.random() * 900) + 100;
}

// Generar fecha futura
function generarFechaFutura(anioInput, mesInput) {
  let mesAleatorio = mesInput || Math.floor(Math.random() * 12) + 1;
  let anioAleatorio = anioInput || (2026 + Math.floor(Math.random() * 5));
  return new Date(anioAleatorio, mesAleatorio - 1, 1);
}

// ============================================
// FUNCIÓN PRINCIPAL DEL GENERADOR (DE TU CÓDIGO)
// ============================================

function generarTarjetas(bin, cantidad, mesInput, anioInput, cvvInput) {
  const resultados = [];
  
  let binLimpio = bin;
  if (binLimpio.includes('x') || binLimpio.includes('X')) {
    const chars = binLimpio.split('');
    for (let i = 0; i < chars.length; i++) {
      if (chars[i].toLowerCase() === 'x') {
        chars[i] = Math.floor(Math.random() * 10).toString();
      }
    }
    binLimpio = chars.join('');
  }

  for (let i = 0; i < cantidad; i++) {
    let tarjeta = generarNumeroValidoLuhn(binLimpio);
    let fecha = generarFechaFutura(anioInput, mesInput);
    let mes = String(fecha.getMonth() + 1).padStart(2, '0');
    let anio = String(fecha.getFullYear()).slice(-2);
    let cvv = cvvInput || generarCVV();
    
    resultados.push({
      tarjeta: tarjeta,
      mes: mes,
      anio: anio,
      cvv: cvv,
      valida: verificarLuhn(tarjeta)
    });
  }
  
  return resultados;
}

// ============================================
// FUNCIÓN PARA VALIDAR BIN (API)
// ============================================

async function validateBin(bin) {
  try {
    const response = await fetch(`https://lookup.binlist.net/${bin}`);
    if (!response.ok) throw new Error('BIN no encontrado');
    
    const data = await response.json();
    
    let mensaje = `🔍 BIN: ${bin}\n`;
    mensaje += `🏦 Banco: ${data.bank?.name || 'Desconocido'}\n`;
    mensaje += `🌎 País: ${data.country?.name || 'Desconocido'} ${data.country?.emoji || ''}\n`;
    mensaje += `💳 Tipo: ${data.type || 'Desconocido'}\n`;
    mensaje += `⭐ Marca: ${data.scheme || 'Desconocido'}\n`;
    mensaje += `💰 Prepago: ${data.prepaid ? 'Sí' : 'No'}`;
    
    return mensaje;
  } catch (error) {
    return '❌ Error al consultar el BIN. Verifica que sea correcto.';
  }
}

// ============================================
// PARSEAR COMANDO !gen
// ============================================

function parsearComandoGen(texto) {
  const partes = texto.split('/');
  if (partes.length < 4) return null;
  
  const primerParte = partes[0].trim();
  const binMatch = primerParte.match(/!gen\s+(\d+x*)/i);
  if (!binMatch) return null;
  
  const bin = binMatch[1];
  const mes = parseInt(partes[1]) || undefined;
  const anio = parseInt(partes[2]) || undefined;
  const cvv = partes[3].trim().toLowerCase() === 'rnd' ? undefined : parseInt(partes[3]);
  
  const cantidad = 5;
  
  return { bin, cantidad, mes, anio, cvv };
}

// ============================================
// CLIENTE DE WHATSAPP
// ============================================

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--disable-software-rasterizer'
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium'
  }
});

client.on('qr', (qr) => {
  console.log('📱 Escanea este QR con WhatsApp:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ Bot conectado exitosamente!');
  console.log('📝 Comandos disponibles:');
  console.log('  !bin [6 dígitos] - Validar BIN');
  console.log('  !gen BIN/MES/AÑO/CVV - Generar tarjetas');
  console.log('  !help - Mostrar ayuda');
  console.log('');
  console.log('📝 Ejemplo: !gen 1233343312435xxx/10/2028/rnd');
});

// ============================================
// PROCESAMIENTO DE MENSAJES
// ============================================

client.on('message', async (message) => {
  if (message.fromMe) return;
  
  const text = message.body;
  console.log(`📩 Mensaje recibido: "${text}"`);
  
  // =========================================
  // COMANDO: !help
  // =========================================
  if (text && text.toLowerCase() === '!help') {
    const helpMsg = 
      '📋 *Comandos disponibles:*\n\n' +
      '🔹 *!bin [6 dígitos]*\n' +
      '  Valida un BIN y muestra información\n' +
      '  Ej: `!bin 457173`\n\n' +
      '🔹 *!gen BIN/MES/AÑO/CVV*\n' +
      '  Genera 5 tarjetas válidas con Luhn\n' +
      '  - BIN: puede tener X para aleatorio\n' +
      '  - MES: 1-12\n' +
      '  - AÑO: 2028, 2029, etc\n' +
      '  - CVV: 3 dígitos o "rnd" para aleatorio\n' +
      '  Ej: `!gen 1233343312435xxx/10/2028/rnd`\n\n' +
      '🔹 *!help*\n' +
      '  Muestra esta ayuda';
    
    await client.sendMessage(message.from, helpMsg);
    console.log('✅ Enviado: help');
    return;
  }
  
  // =========================================
  // COMANDO: !bin
  // =========================================
  if (text && text.toLowerCase().startsWith('!bin ')) {
    const bin = text.substring(5).trim();
    console.log(`🔍 Procesando BIN: ${bin}`);
    
    if (!/^\d{6}$/.test(bin)) {
      await client.sendMessage(
        message.from,
        '❌ BIN inválido. Debe ser exactamente 6 dígitos. Ejemplo: !bin 457173'
      );
      return;
    }

    try {
      await client.sendMessage(message.from, `🔍 Consultando BIN: ${bin}...`);
      const result = await validateBin(bin);
      await client.sendMessage(message.from, result);
      console.log(`✅ Respondido BIN: ${bin}`);
    } catch (error) {
      console.log('❌ Error:', error.message);
      await client.sendMessage(
        message.from,
        '❌ Error al procesar. Intenta de nuevo.'
      );
    }
    return;
  }
  
  // =========================================
  // COMANDO: !gen (RESPUESTA LIMPIA - SOLO TARJETAS)
  // =========================================
  if (text && text.toLowerCase().startsWith('!gen ')) {
    console.log(`🔧 Procesando generador: ${text}`);
    
    const parsed = parsearComandoGen(text);
    if (!parsed) {
      await client.sendMessage(
        message.from,
        '❌ Formato inválido.\n' +
        'Usa: `!gen BIN/MES/AÑO/CVV`\n' +
        'Ej: `!gen 1233343312435xxx/10/2028/rnd`\n' +
        '  - BIN: puede tener X para aleatorio\n' +
        '  - MES: 1-12\n' +
        '  - AÑO: 2028, 2029, etc\n' +
        '  - CVV: 3 dígitos o "rnd"'
      );
      return;
    }
    
    const { bin, cantidad, mes, anio, cvv } = parsed;
    
    try {
      await client.sendMessage(message.from, `🔧 Generando tarjetas con BIN: ${bin}...`);
      
      const resultados = generarTarjetas(bin, cantidad, mes, anio, cvv);
      
      // ============================================
      // RESPUESTA LIMPIA - SOLO LAS TARJETAS
      // ============================================
      let mensaje = '';
      resultados.forEach((r) => {
        mensaje += `${r.tarjeta}|${r.mes}|${r.anio}|${r.cvv}\n`;
      });
      
      await client.sendMessage(message.from, mensaje.trim());
      console.log(`✅ Enviadas ${resultados.length} tarjetas generadas (solo tarjetas)`);
      
    } catch (error) {
      console.log('❌ Error:', error.message);
      await client.sendMessage(
        message.from,
        '❌ Error al generar tarjetas. Verifica el formato.'
      );
    }
    return;
  }
});

// ============================================
// ERRORES Y RECONEXIÓN
// ============================================

client.on('auth_failure', () => {
  console.log('❌ Error de autenticación.');
});

client.on('disconnected', (reason) => {
  console.log('⚠️ Bot desconectado:', reason);
  console.log('🔄 Reconectando...');
  setTimeout(() => {
    client.initialize();
  }, 5000);
});

// ============================================
// INICIAR BOT
// ============================================

console.log('🔄 Iniciando sesión...');
client.initialize();

process.on('SIGINT', () => {
  console.log('\n👋 Cerrando bot...');
  client.destroy();
  process.exit(0);
});