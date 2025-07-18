require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const puppeteer = require('puppeteer');
const express = require('express');
const benefits = require('../data/benefitsData');

const baseUrl = 'https://vendor.tu7.cl/account';

const cotizadoresInfo = {
  1: { user: 'cam.reyesmora@gmail.com', password: 'cotizador1' },
  2: { user: 'naranjo.paula.ps@gmail.com', password: 'cotizador2' },
  3: { user: 'freyes.mora@gmail.com', password: 'cotizador3' }
};
const bicevida = { user: 'fernanda.lange', password: 'Bice.2020' };
const slots = { 1: false, 2: false, 3: false };

// Servidor Express para mantener vivo en Railway
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('🤖 Bot WhatsApp MTS en funcionamiento'));
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
    ],
    executablePath: puppeteer.executablePath()
  }
});

// QR como URL
client.on('qr', qr => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
  console.log('🔗 Escanea este QR desde tu navegador:');
  console.log(qrUrl);
});

client.on('ready', () => console.log('✅ Cliente WhatsApp listo'));
client.on('auth_failure', () => console.log('❌ Error de autenticación'));

client.on('message', async msg => {
  const chat = await msg.getChat();
  const isGroup = chat.isGroup;
  const text = msg.body.trim().toLowerCase();
  let m;

  // En grupos: responde solo si comienza con @
  if (isGroup && !text.startsWith('@')) return;

  if (text.startsWith('@beneficios')) {
    let options = 'Selecciona una opción (responde con el número):\n\n';
    benefits.forEach((b, i) => options += `${i}. ${b.title}\n`);
    await client.sendMessage(msg.from, options);
    return;
  }

  // Escucha cualquier número válido sin importar quién lo escribió
  if (!isNaN(text) && benefits[parseInt(text, 10)]) {
    const idx = parseInt(text, 10);
    const b = benefits[idx];
    await client.sendMessage(msg.from, `*${b.title}*\n\n${b.content}\n\n🔗 Más info: ${b.link}`);
    return;
  }

  if ((m = text.match(/^@cotizador([123])$/))) {
    const n = +m[1];
    if (!slots[n]) {
      slots[n] = true;
      let reply = `🌐 *Acceso a la plataforma:* ${baseUrl}\n\n`;
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

  if ((m = text.match(/^@cotizador([123])off$/))) {
    const n = +m[1];
    if (slots[n]) {
      slots[n] = false;
      await client.sendMessage(msg.from, `✅ Cotizador ${n} liberado.`);
    } else {
      await client.sendMessage(msg.from, `⚠️ El cotizador ${n} ya estaba libre.`);
    }
    return;
  }
});

client.initialize();
