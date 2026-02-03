const { Client, GatewayIntentBits } = require('discord.js');
const { Shoukaku, Connectors } = require('shoukaku');
const { Kazagumo } = require('kazagumo');
const express = require('express');
require('dotenv').config();

// ============ EXPRESS KEEP-ALIVE SERVER ============
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot is running!'));
app.get('/ping', (req, res) => res.status(200).send('Pong!'));

app.listen(PORT, () => {
    console.log(`🌐 Keep-alive server running on port ${PORT}`);
});

// ============ DISCORD CLIENT ============
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ============ LAVALINK NODES ============
const LavalinkNodes = [
    {
        name: 'Serenetia-v4',
        url: 'lavalinkv4.serenetia.com:443',
        auth: 'https://dsc.gg/ajidevserver',
        secure: true
    },
    {
        name: 'Serenetia-v4-backup',
        url: 'lavalinkv4.serenetia.com:80',
        auth: 'https://dsc.gg/ajidevserver',
        secure: false
    }
];

// ============ KAZAGUMO (SHOUKAKU WRAPPER) ============
const kazagumo = new Kazagumo({
    defaultSearchEngine: 'youtube',
    send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
    }
}, new Shoukaku(new Connectors.DiscordJS(client), LavalinkNodes));

// Lavalink Events
kazagumo.on('ready', (name) => console.log(`✅ Lavalink ${name} connected!`));
kazagumo.on('error', (name, error) => console.error(`❌ Lavalink ${name} error:`, error));

kazagumo.on('playerStart', (player, track) => {
    const channel = client.channels.cache.get(player.textId);
    if (channel) channel.send(`🎵 Now playing: **${track.title}**`);
});

kazagumo.on('playerEmpty', (player) => {
    const channel = client.channels.cache.get(player.textId);
    if (channel) channel.send('⏹️ Queue finished! Disconnecting...');
    player.destroy();
});

// ============ BOT READY ============
client.once('ready', () => {
    console.log(`🤖 ${client.user.tag} is online!`);
});

// ============ COMMANDS ============
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // !play
    if (command === 'play') {
        if (!message.member.voice.channel) {
            return message.reply('❌ Join a voice channel first!');
        }
        
        const query = args.join(' ');
        if (!query) return message.reply('❌ Provide a song name!');

        let player = kazagumo.players.get(message.guild.id);
        
        if (!player) {
            player = await kazagumo.createPlayer({
                guildId: message.guild.id,
                textId: message.channel.id,
                voiceId: message.member.voice.channel.id,
                volume: 80,
                deaf: true
            });
        }

        const result = await kazagumo.search(query, { requester: message.author });
        if (!result?.tracks.length) return message.reply('❌ No results found!');

        player.queue.add(result.tracks[0]);
        message.channel.send(`➕ Added: **${result.tracks[0].title}**`);

        if (!player.playing && !player.paused) player.play();
    }

    // !skip
    if (command === 'skip') {
        const player = kazagumo.players.get(message.guild.id);
        if (!player) return message.reply('❌ Nothing playing!');
        player.skip();
        message.channel.send('⏭️ Skipped!');
    }

    // !stop
    if (command === 'stop') {
        const player = kazagumo.players.get(message.guild.id);
        if (!player) return message.reply('❌ Nothing playing!');
        player.destroy();
        message.channel.send('⏹️ Stopped!');
    }

    // !pause
    if (command === 'pause') {
        const player = kazagumo.players.get(message.guild.id);
        if (!player) return message.reply('❌ Nothing playing!');
        player.pause(!player.paused);
        message.channel.send(player.paused ? '⏸️ Paused!' : '▶️ Resumed!');
    }
});

// Login
client.login(process.env.DISCORD_TOKEN);
