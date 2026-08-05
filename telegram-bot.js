const TelegramBot = require('node-telegram-bot-api');

// 🔑 REEMPLAZA CON TU TOKEN
const token = '8324352606:AAG-jPFwZ8vOevLonktSDLialqGIUmOFyTM';

const bot = new TelegramBot(token, { polling: true });

console.log('🤖 Bot de Telegram iniciado!');

// ============================================
// TUS FUNCIONES ORIGINALES (TAL CUAL)
// ============================================

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

function generarCVV() {
  return Math.floor(Math.random() * 900) + 100;
}

function generarFechaFutura(anioFuturo, mesFuturo) {
  let mesAleatorio = mesFuturo || Math.floor(Math.random() * 12) + 1;
  let anioAleatorio = anioFuturo || (2025 + Math.floor(Math.random() * 6));
  return new Date(anioAleatorio, mesAleatorio - 1, 1);
}

// ============================================
// FUNCIÓN PRINCIPAL - TAL CUAL TU CÓDIGO
// ============================================

function generarTarjetas(bin, cantidad, mesInput, anioInput, cvvInput) {
  const resultados = [];
  
  // EXACTAMENTE IGUAL QUE TU CÓDIGO ORIGINAL
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
      cvv: cvv
    });
  }
  
  return resultados;
}

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
// COMANDOS DE TELEGRAM
// ============================================

// Comando /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 
    '🤖 *Bot Validador de BINs*\n\n' +
    'Comandos:\n' +
    '🔹 /bin [6 dígitos] - Validar BIN\n' +
    '🔹 /gen BIN/MES/AÑO/CVV - Generar tarjetas\n' +
    '🔹 /help - Mostrar ayuda\n\n' +
    'Ejemplo: /gen 1233343312435xxx/10/2028/rnd',
    { parse_mode: 'Markdown' }
  );
});

// Comando /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId,
    '📋 *Comandos disponibles:*\n\n' +
    '🔹 /bin [6 dígitos] - Validar BIN\n' +
    '  Ej: `/bin 457173`\n\n' +
    '🔹 /gen BIN/MES/AÑO/CVV - Generar tarjetas\n' +
    '  Ej: `/gen 1233343312435xxx/10/2028/rnd`\n\n' +
    '🔹 /help - Muestra esta ayuda',
    { parse_mode: 'Markdown' }
  );
});

// Comando /bin
bot.onText(/\/bin\s+(\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const bin = match[1];
  
  if (!/^\d{6}$/.test(bin)) {
    bot.sendMessage(chatId, '❌ BIN inválido. Usa 6 dígitos: /bin 457173');
    return;
  }
  
  bot.sendMessage(chatId, `🔍 Consultando BIN: ${bin}...`);
  const result = await validateBin(bin);
  bot.sendMessage(chatId, result);
});

// Comando /gen
bot.onText(/\/gen\s+(.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  
  const partes = text.split('/');
  if (partes.length < 4) {
    bot.sendMessage(chatId, '❌ Formato: /gen BIN/MES/AÑO/CVV');
    return;
  }
  
  const bin = partes[0];
  const mes = parseInt(partes[1]) || undefined;
  const anio = parseInt(partes[2]) || undefined;
  const cvv = partes[3].toLowerCase() === 'rnd' ? undefined : parseInt(partes[3]);
  
  bot.sendMessage(chatId, `🔧 Generando tarjetas con BIN: ${bin}...`);
  
  const resultados = generarTarjetas(bin, 5, mes, anio, cvv);
  let mensaje = '';
  resultados.forEach((r) => {
    mensaje += `${r.tarjeta}|${r.mes}|${r.anio}|${r.cvv}\n`;
  });
  
  bot.sendMessage(chatId, mensaje.trim());
});

console.log('✅ Bot de Telegram listo!');
console.log('📝 Busca tu bot en Telegram y escribe /start');