require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const puppeteer = require('puppeteer');
const benefits = require('../data/benefitsData');

// Configuración de cotizadores
const baseUrl = 'https://vendor.tu7.cl/account';
const cotizadoresInfo = {
  1: { user: 'cam.reyesmora@gmail.com', password: 'cotizador1' },
  2: { user: 'naranjo.paula.ps@gmail.com', password: 'cotizador2' },
  3: { user: 'freyes.mora@gmail.com', password: 'cotizador3' }
};
const bicevida = { user: 'fernanda.lange', password: 'Bice.2020' };
const slots = { 1: false, 2: false, 3: false };
const waitingForBenefitNumber = new Map();

// Servidor Express
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot corriendo!'));
app.listen(port, () => console.log(`✅ Servidor en puerto ${port}`));

// Cliente WhatsApp
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process'
    ]
  }
});


client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => console.log('✅ Cliente listo'));
client.on('auth_failure', () => console.log('❌ Error de autenticación'));

client.on('message', async msg => {
  const text = msg.body.trim().toLowerCase();
  let m;

  // @beneficios
  if (text.startsWith('@beneficios')) {
    let options = 'Selecciona una opción (responde con el número):\n\n';
    benefits.forEach((b, i) => options += `${i}. ${b.title}\n`);
    await client.sendMessage(msg.from, options);
    waitingForBenefitNumber.set(msg.from, true);
    return;
  }

  // Respuesta a beneficios
  if (!isNaN(text) && waitingForBenefitNumber.get(msg.from)) {
    waitingForBenefitNumber.delete(msg.from);
    const idx = parseInt(text, 10);
    const b = benefits?.[idx];
    if (!b) {
      await client.sendMessage(msg.from, `❌ Número inválido. Escribe un número entre 0 y ${benefits.length - 1}.`);
    } else {
      await client.sendMessage(msg.from, `*${b.title}*\n\n${b.content}\n\n🔗 Más info: ${b.link}`);
    }
    return;
  }

  // @cotizador1|2|3
  if ((m = text.match(/^@cotizador([123])$/))) {
    const n = +m[1];
    if (!slots[n]) {
        slots[n] = true;
        let reply = `🌐 *Acceso a la plataforma:* https://www.vendor.tu7.cl/account\n\n`;
        reply += `*Cotizador asignado:* ${n} ✅\n`;
        reply += `• Usuario: ${cotizadoresInfo[n].user}\n`;
        reply += `• Contraseña: ${cotizadoresInfo[n].password}\n\n`;

        reply += `*Estado actual de los cotizadores:*\n`;
        [1, 2, 3].forEach(i => {
            reply += `${slots[i] ? '❌ Ocupado' : '✅ Disponible'} → Cotizador ${i}\n`;
        });

        reply += `\n*BICEVIDA (siempre disponible):*\n`;
        reply += `• Usuario: ${bicevida.user}\n`;
        reply += `• Contraseña: ${bicevida.password}`;

        await client.sendMessage(msg.from, reply);
    } else {
        await client.sendMessage(msg.from, `❌ El cotizador ${n} ya está ocupado.`);
    }
    return;
}


  // @cotizadorXoff
  if ((m = text.match(/^@cotizador([123])off$/))) {
    const n = +m[1];
    if (slots[n]) {
      slots[n] = false;
      await client.sendMessage(msg.from, `✅ Cotizador ${n} liberado.`);
    } else {
      await client.sendMessage(msg.from, `⚠️ Cotizador ${n} ya estaba libre.`);
    }
    return;
  }
});

client.initialize();
