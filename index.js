const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { Connectors } = require('shoukaku');
const { Kazagumo } = require('kazagumo');
const express = require('express');
require('dotenv').config();

// ============ EXPRESS KEEP-ALIVE ============
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.status(200).send('OK'));
app.get('/ping', (req, res) => res.status(200).send('OK'));
app.get('/status', (req, res) => {
    res.status(200).json({
        status: 'online',
        uptime: Math.floor(process.uptime()),
        servers: client.guilds.cache.size
    });
});

app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));

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
const Nodes = [
    {
        name: 'Serenetia',
        url: 'lavalinkv4.serenetia.com:443',
        auth: 'https://dsc.gg/ajidevserver',
        secure: true
    },
    {
        name: 'Serenetia-Backup',
        url: 'lavalinkv4.serenetia.com:80',
        auth: 'https://dsc.gg/ajidevserver',
        secure: false
    }
];

// ============ SHOUKAKU OPTIONS ============
const shoukakuOptions = {
    moveOnDisconnect: false,
    resumable: false,
    resumableTimeout: 30,
    reconnectTries: 3,
    restTimeout: 15000
};

// ============ KAZAGUMO SETUP ============
const kazagumo = new Kazagumo(
    {
        defaultSearchEngine: 'youtube',
        send: (guildId, payload) => {
            const guild = client.guilds.cache.get(guildId);
            if (guild) guild.shard.send(payload);
        }
    },
    new Connectors.DiscordJS(client),
    Nodes,
    shoukakuOptions
);

// ============ LAVALINK EVENTS ============
kazagumo.shoukaku.on('ready', (name) => {
    console.log(`✅ Lavalink ${name} connected!`);
});

kazagumo.shoukaku.on('error', (name, error) => {
    console.error(`❌ Lavalink ${name} error:`, error);
});

kazagumo.shoukaku.on('close', (name, code, reason) => {
    console.warn(`⚠️ Lavalink ${name} closed: ${code} - ${reason}`);
});

kazagumo.shoukaku.on('disconnect', (name, reason) => {
    console.warn(`⚠️ Lavalink ${name} disconnected:`, reason);
});

// ============ PLAYER EVENTS ============
kazagumo.on('playerStart', (player, track) => {
    const channel = client.channels.cache.get(player.textId);
    if (channel) {
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🎵 Now Playing')
            .setDescription(`**${track.title}**`)
            .addFields(
                { name: '👤 Author', value: track.author || 'Unknown', inline: true },
                { name: '⏱️ Duration', value: formatDuration(track.length), inline: true },
                { name: '🎧 Requested by', value: `${track.requester}`, inline: true }
            )
            .setThumbnail(track.thumbnail || null)
            .setTimestamp();
        
        channel.send({ embeds: [embed] });
    }
});

kazagumo.on('playerEnd', (player) => {
    console.log(`Player ended in guild ${player.guildId}`);
});

kazagumo.on('playerEmpty', (player) => {
    const channel = client.channels.cache.get(player.textId);
    if (channel) {
        channel.send('⏹️ Queue selesai! Bot disconnect.');
    }
    player.destroy();
});

kazagumo.on('playerError', (player, error) => {
    console.error('Player error:', error);
    const channel = client.channels.cache.get(player.textId);
    if (channel) {
        channel.send('❌ Terjadi error saat memutar lagu. Skipping...');
    }
});

// ============ BOT READY ============
client.once('ready', () => {
    console.log(`🤖 ${client.user.tag} is online!`);
    console.log(`📊 Serving ${client.guilds.cache.size} servers`);
    
    client.user.setActivity('🎵 !help', { type: 2 }); // "Listening to !help"
});

// ============ HELPER FUNCTIONS ============
function formatDuration(ms) {
    if (!ms || ms === 0) return 'Live 🔴';
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ============ PRESETS & FILTERS ============
const bassLevels = {
    off: Array(15).fill(0).map((_, i) => ({ band: i, gain: 0 })),
    low: [
        { band: 0, gain: 0.1 },
        { band: 1, gain: 0.1 },
        { band: 2, gain: 0.05 },
        { band: 3, gain: 0.05 },
        ...Array(11).fill(0).map((_, i) => ({ band: i + 4, gain: 0 }))
    ],
    medium: [
        { band: 0, gain: 0.2 },
        { band: 1, gain: 0.15 },
        { band: 2, gain: 0.1 },
        { band: 3, gain: 0.05 },
        ...Array(11).fill(0).map((_, i) => ({ band: i + 4, gain: 0 }))
    ],
    high: [
        { band: 0, gain: 0.35 },
        { band: 1, gain: 0.3 },
        { band: 2, gain: 0.2 },
        { band: 3, gain: 0.15 },
        { band: 4, gain: 0.1 },
        ...Array(10).fill(0).map((_, i) => ({ band: i + 5, gain: 0 }))
    ]
};

const audioPresets = {
    clear: [
        { band: 0, gain: 0 },
        { band: 1, gain: 0 },
        { band: 2, gain: 0 },
        { band: 3, gain: 0.1 },
        { band: 4, gain: 0.15 },
        { band: 5, gain: 0.15 },
        { band: 6, gain: 0.1 },
        { band: 7, gain: 0.05 },
        { band: 8, gain: 0 },
        { band: 9, gain: 0 },
        { band: 10, gain: 0 },
        { band: 11, gain: 0 },
        { band: 12, gain: 0 },
        { band: 13, gain: 0 },
        { band: 14, gain: 0 }
    ],
    vocal: [
        { band: 0, gain: -0.1 },
        { band: 1, gain: -0.05 },
        { band: 2, gain: 0.1 },
        { band: 3, gain: 0.2 },
        { band: 4, gain: 0.2 },
        { band: 5, gain: 0.15 },
        { band: 6, gain: 0.1 },
        { band: 7, gain: 0 },
        { band: 8, gain: -0.05 },
        { band: 9, gain: -0.1 },
        { band: 10, gain: -0.1 },
        { band: 11, gain: -0.1 },
        { band: 12, gain: -0.1 },
        { band: 13, gain: -0.1 },
        { band: 14, gain: -0.1 }
    ],
    boost: [
        { band: 0, gain: 0.15 },
        { band: 1, gain: 0.1 },
        { band: 2, gain: 0.1 },
        { band: 3, gain: 0.1 },
        { band: 4, gain: 0.1 },
        { band: 5, gain: 0.1 },
        { band: 6, gain: 0.1 },
        { band: 7, gain: 0.1 },
        { band: 8, gain: 0.1 },
        { band: 9, gain: 0.1 },
        { band: 10, gain: 0.1 },
        { band: 11, gain: 0.15 },
        { band: 12, gain: 0.15 },
        { band: 13, gain: 0.2 },
        { band: 14, gain: 0.2 }
    ],
    flat: Array(15).fill(0).map((_, i) => ({ band: i, gain: 0 }))
};

// ============ MESSAGE COMMANDS ============
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // ==================== PLAY ====================
    if (command === 'play' || command === 'p') {
        if (!message.member.voice.channel) {
            return message.reply('❌ Join voice channel dulu!');
        }

        const query = args.join(' ');
        if (!query) {
            return message.reply('❌ Kasih judul lagu! Contoh: `!play never gonna give you up`');
        }

        try {
            let player = kazagumo.players.get(message.guild.id);

            if (!player) {
                player = await kazagumo.createPlayer({
                    guildId: message.guild.id,
                    textId: message.channel.id,
                    voiceId: message.member.voice.channel.id,
                    volume: 70,
                    deaf: true,
                    shardId: message.guild.shardId
                });
            }

            message.channel.send(`🔍 Searching: **${query}**...`);

            const result = await kazagumo.search(query, { requester: message.author });

            if (!result || !result.tracks.length) {
                return message.reply('❌ Lagu tidak ditemukan!');
            }

            if (result.type === 'PLAYLIST') {
                for (const track of result.tracks) {
                    player.queue.add(track);
                }
                message.channel.send(`📃 Ditambahkan **${result.tracks.length} lagu** dari playlist: **${result.playlistName}**`);
            } else {
                player.queue.add(result.tracks[0]);
                if (player.playing || player.paused) {
                    message.channel.send(`➕ Ditambahkan ke queue: **${result.tracks[0].title}**`);
                }
            }

            if (!player.playing && !player.paused) {
                player.play();
            }

        } catch (error) {
            console.error('Play error:', error);
            message.reply('❌ Error saat memutar lagu! Coba lagi.');
        }
    }

    // ==================== SKIP ====================
    if (command === 'skip' || command === 's') {
        const player = kazagumo.players.get(message.guild.id);
        if (!player) return message.reply('❌ Tidak ada musik!');
        if (!player.queue.current) return message.reply('❌ Tidak ada lagu yang bisa di-skip!');

        player.skip();
        message.channel.send('⏭️ Skipped!');
    }

    // ==================== STOP ====================
    if (command === 'stop' || command === 'dc' || command === 'disconnect' || command === 'leave') {
        const player = kazagumo.players.get(message.guild.id);
        if (!player) return message.reply('❌ Tidak ada musik!');

        player.destroy();
        message.channel.send('⏹️ Stopped & Disconnected!');
    }

    // ==================== PAUSE / RESUME ====================
    if (command === 'pause') {
        const player = kazagumo.players.get(message.guild.id);
        if (!player) return message.reply('❌ Tidak ada musik!');

        if (player.paused) {
            return message.reply('⏸️ Musik sudah di-pause! Gunakan `!resume` untuk melanjutkan.');
        }

        player.pause(true);
        message.channel.send('⏸️ Paused!');
    }

    if (command === 'resume' || command === 'unpause') {
        const player = kazagumo.players.get(message.guild.id);
        if (!player) return message.reply('❌ Tidak ada musik!');

        if (!player.paused) {
            return message.reply('▶️ Musik tidak sedang di-pause!');
        }

        player.pause(false);
        message.channel.send('▶️ Resumed!');
    }

    // ==================== QUEUE ====================
    if (command === 'queue' || command === 'q') {
        const player = kazagumo.players.get(message.guild.id);
        if (!player || !player.queue.current) {
            return message.reply('❌ Queue kosong!');
        }

        const current = player.queue.current;
        const queue = player.queue;

        let description = `**Now Playing:**\n🎵 [${current.title}](${current.uri}) - \`${formatDuration(current.length)}\`\n\n`;

        if (queue.length > 0) {
            description += `**Up Next:**\n`;
            const tracks = queue.slice(0, 10);
            tracks.forEach((track, index) => {
                description += `\`${index + 1}.\` [${track.title}](${track.uri}) - \`${formatDuration(track.length)}\`\n`;
            });

            if (queue.length > 10) {
                description += `\n...dan **${queue.length - 10}** lagu lainnya`;
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`📃 Queue - ${message.guild.name}`)
            .setDescription(description)
            .setFooter({ text: `Total: ${queue.length + 1} lagu | Volume: ${player.volume}%` })
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // ==================== NOW PLAYING ====================
    if (command === 'nowplaying' || command === 'np') {
        const player = kazagumo.players.get(message.guild.id);
        if (!player || !player.queue.current) {
            return message.reply('❌ Tidak ada lagu yang diputar!');
        }

        const current = player.queue.current;
        const position = player.position;
        const duration = current.length;

        // Progress bar
        const progress = duration ? Math.round((position / duration) * 20) : 0;
        const progressBar = '▬'.repeat(progress) + '🔘' + '▬'.repeat(20 - progress);

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🎵 Now Playing')
            .setDescription(`**[${current.title}](${current.uri})**`)
            .addFields(
                { name: '👤 Author', value: current.author || 'Unknown', inline: true },
                { name: '🎧 Requested by', value: `${current.requester}`, inline: true },
                { name: '🔊 Volume', value: `${player.volume}%`, inline: true }
            )
            .setThumbnail(current.thumbnail || null)
            .setFooter({ text: `${formatDuration(position)} ${progressBar} ${formatDuration(duration)}` })
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // ==================== VOLUME ====================
    if (command === 'volume' || command === 'vol' || command === 'v') {
        const player = kazagumo.players.get(message.guild.id);
        if (!player) return message.reply('❌ Tidak ada musik!');

        if (!args[0]) {
            return message.reply(`🔊 Volume saat ini: **${player.volume}%**`);
        }

        const volume = parseInt(args[0]);
        if (isNaN(volume) || volume < 0 || volume > 100) {
            return message.reply('❌ Volume harus antara **0-100**!');
        }

        player.setVolume(volume);
        
        let emoji = '🔊';
        if (volume === 0) emoji = '🔇';
        else if (volume < 30) emoji = '🔈';
        else if (volume < 70) emoji = '🔉';

        message.channel.send(`${emoji} Volume: **${volume}%**`);
    }

    // ==================== SHUFFLE ====================
    if (command === 'shuffle') {
        const player = kazagumo.players.get(message.guild.id);
        if (!player) return message.reply('❌ Tidak ada musik!');
        if (player.queue.length < 2) return message.reply('❌ Butuh minimal 2 lagu di queue!');

        player.queue.shuffle();
        message.channel.send('🔀 Queue telah di-shuffle!');
    }

    // ==================== LOOP ====================
    if (command === 'loop' || command === 'repeat') {
        const player = kazagumo.players.get(message.guild.id);
        if (!player) return message.reply('❌ Tidak ada musik!');

        const mode = args[0]?.toLowerCase();

        if (!mode) {
            const currentLoop = player.loop || 'none';
            return message.reply(`🔁 Loop saat ini: **${currentLoop}**\nGunakan: \`!loop track\`, \`!loop queue\`, atau \`!loop off\``);
        }

        if (mode === 'track' || mode === 'song' || mode === 'current') {
            player.setLoop('track');
            message.channel.send('🔂 Loop: **Track** (lagu ini akan diulang)');
        } else if (mode === 'queue' || mode === 'all') {
            player.setLoop('queue');
            message.channel.send('🔁 Loop: **Queue** (semua lagu akan diulang)');
        } else if (mode === 'off' || mode === 'none' || mode === 'disable') {
            player.setLoop('none');
            message.channel.send('➡️ Loop: **Off**');
        } else {
            message.reply('❌ Mode tidak valid! Gunakan: `track`, `queue`, atau `off`');
        }
    }

    // ==================== REMOVE ====================
    if (command === 'remove' || command === 'rm') {
        const player = kazagumo.players.get(message.guild.id);
        if (!player) return message.reply('❌ Tidak ada musik!');

        const index = parseInt(args[0]) - 1;
        if (isNaN(index) || index < 0 || index >= player.queue.length) {
            return message.reply(`❌ Index tidak valid! Gunakan angka 1-${player.queue.length}`);
        }

        const removed = player.queue.splice(index, 1);
        message.channel.send(`🗑️ Dihapus: **${removed[0].title}**`);
    }

    // ==================== CLEAR QUEUE ====================
    if (command === 'clear') {
        const player = kazagumo.players.get(message.guild.id);
        if (!player) return message.reply('❌ Tidak ada musik!');
        if (player.queue.length === 0) return message.reply('❌ Queue sudah kosong!');

        player.queue.clear();
        message.channel.send('🗑️ Queue telah dikosongkan!');
    }

    // ==================== SEEK ====================
    if (command === 'seek') {
        const player = kazagumo.players.get(message.guild.id);
        if (!player || !player.queue.current) return message.reply('❌ Tidak ada musik!');

        const time = args[0];
        if (!time) return message.reply('❌ Masukkan waktu! Contoh: `!seek 1:30` atau `!seek 90`');

        let seekTime;
        if (time.includes(':')) {
            const parts = time.split(':').map(Number);
            if (parts.length === 2) {
                seekTime = (parts[0] * 60 + parts[1]) * 1000;
            } else if (parts.length === 3) {
                seekTime = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
            }
        } else {
            seekTime = parseInt(time) * 1000;
        }

        if (isNaN(seekTime) || seekTime < 0 || seekTime > player.queue.current.length) {
            return message.reply('❌ Waktu tidak valid!');
        }

        player.seek(seekTime);
        message.channel.send(`⏩ Seeking ke: **${formatDuration(seekTime)}**`);
    }

    // ==================== BASS BOOST ====================
    if (command === 'bassboost' || command === 'bass' || command === 'bb') {
        const player = kazagumo.players.get(message.guild.id);
        if (!player) return message.reply('❌ Tidak ada musik!');

        const level = args[0]?.toLowerCase() || 'medium';

        if (!bassLevels[level]) {
            return message.reply('❌ Level tidak valid! Gunakan: `off`, `low`, `medium`, `high`');
        }

        player.setEqualizer(bassLevels[level]);
        
        const emojis = { off: '🔇', low: '🔈', medium: '🔉', high: '🔊' };
        message.channel.send(`${emojis[level]} Bass Boost: **${level.toUpperCase()}**`);
    }

    // ==================== PRESET ====================
    if (command === 'preset' || command === 'eq') {
        const player = kazagumo.players.get(message.guild.id);
        if (!player) return message.reply('❌ Tidak ada musik!');

        const preset = args[0]?.toLowerCase();

        if (!preset) {
            return message.reply('🎵 Preset tersedia: `clear`, `vocal`, `boost`, `flat`\nContoh: `!preset clear`');
        }

        if (!audioPresets[preset]) {
            return message.reply('❌ Preset tidak valid! Gunakan: `clear`, `vocal`, `boost`, `flat`');
        }

        player.setEqualizer(audioPresets[preset]);
        message.channel.send(`🎵 Preset: **${preset.toUpperCase()}** aktif!`);
    }

    // ==================== NIGHTCORE ====================
    if (command === 'nightcore' || command === 'nc') {
        const player = kazagumo.players.get(message.guild.id);
        if (!player) return message.reply('❌ Tidak ada musik!');

        player.setTimescale({ speed: 1.25, pitch: 1.25, rate: 1 });
        message.channel.send('🌙 **Nightcore** mode: ON');
    }

    // ==================== SLOWED ====================
    if (command === 'slowed' || command === 'slow') {
        const player = kazagumo.players.get(message.guild.id);
        if (!player) return message.reply('❌ Tidak ada musik!');

        player.setTimescale({ speed: 0.8, pitch: 0.85, rate: 1 });
        message.channel.send('🎵 **Slowed** mode: ON');
    }

    // ==================== 8D AUDIO ====================
    if (command === '8d') {
        const player = kazagumo.players.get(message.guild.id);
        if (!player) return message.reply('❌ Tidak ada musik!');

        player.setRotation({ rotationHz: 0.2 });
        message.channel.send('🎧 **8D Audio** mode: ON (Pakai headphone!)');
    }

    // ==================== VAPORWAVE ====================
    if (command === 'vaporwave' || command === 'vw') {
        const player = kazagumo.players.get(message.guild.id);
        if (!player) return message.reply('❌ Tidak ada musik!');

        player.setTimescale({ speed: 0.85, pitch: 0.8, rate: 1 });
        player.setEqualizer(bassLevels.low);
        message.channel.send('🌴 **Vaporwave** mode: ON');
    }

    // ==================== KARAOKE ====================
    if (command === 'karaoke') {
        const player = kazagumo.players.get(message.guild.id);
        if (!player) return message.reply('❌ Tidak ada musik!');

        player.setKaraoke({ level: 1, monoLevel: 1, filterBand: 220, filterWidth: 100 });
        message.channel.send('🎤 **Karaoke** mode: ON (vocal dikurangi)');
    }

    // ==================== TREMOLO ====================
    if (command === 'tremolo') {
        const player = kazagumo.players.get(message.guild.id);
        if (!player) return message.reply('❌ Tidak ada musik!');

        player.setTremolo({ frequency: 4, depth: 0.75 });
        message.channel.send('〰️ **Tremolo** effect: ON');
    }

    // ==================== VIBRATO ====================
    if (command === 'vibrato') {
        const player = kazagumo.players.get(message.guild.id);
        if (!player) return message.reply('❌ Tidak ada musik!');

        player.setVibrato({ frequency: 4, depth: 0.75 });
        message.channel.send('🎸 **Vibrato** effect: ON');
    }

    // ==================== CLEAR FILTERS ====================
    if (command === 'clearfilter' || command === 'cf' || command === 'reset') {
        const player = kazagumo.players.get(message.guild.id);
        if (!player) return message.reply('❌ Tidak ada musik!');

        player.clearFilters();
        message.channel.send('✨ Semua filter telah direset!');
    }

    // ==================== FILTERS LIST ====================
    if (command === 'filters') {
        const embed = new EmbedBuilder()
            .setColor('#ff00ff')
            .setTitle('🎛️ Available Filters')
            .setDescription('Gunakan command berikut untuk mengubah audio:')
            .addFields(
                { name: '🎵 Presets', value: '`!preset clear` - Suara jernih\n`!preset vocal` - Vocal jelas\n`!preset boost` - Boost semua\n`!preset flat` - Default', inline: true },
                { name: '🔊 Bass', value: '`!bass off`\n`!bass low`\n`!bass medium`\n`!bass high`', inline: true },
                { name: '🎧 Effects', value: '`!nightcore` - Cepat & tinggi\n`!slowed` - Lambat\n`!8d` - 8D rotating\n`!vaporwave` - Aesthetic', inline: true },
                { name: '🎤 Vocal', value: '`!karaoke` - Kurangi vocal\n`!tremolo` - Tremolo\n`!vibrato` - Vibrato', inline: true },
                { name: '🔄 Reset', value: '`!clearfilter` - Reset semua', inline: true }
            )
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // ==================== HELP ====================
    if (command === 'help' || command === 'h') {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎵 Music Bot Commands')
            .setDescription('Prefix: `!`')
            .addFields(
                { 
                    name: '🎶 Music', 
                    value: '`play` `skip` `stop` `pause` `resume`\n`queue` `nowplaying` `shuffle` `loop`', 
                    inline: true 
                },
                { 
                    name: '🔧 Control', 
                    value: '`volume` `seek` `remove` `clear`', 
                    inline: true 
                },
                { 
                    name: '🎛️ Filters', 
                    value: '`bass` `preset` `nightcore` `slowed`\n`8d` `vaporwave` `karaoke` `clearfilter`\n\nKetik `!filters` untuk detail', 
                    inline: true 
                }
            )
            .addFields(
                { name: '📋 Command Details', value: '`!play <lagu>` - Putar lagu dari YouTube\n`!volume <0-100>` - Atur volume (recommended: 70)\n`!loop <track/queue/off>` - Atur loop\n`!seek <1:30>` - Skip ke waktu tertentu\n`!preset clear` - Suara paling jernih ⭐' }
            )
            .setFooter({ text: 'Tip: Gunakan !preset clear dan !volume 70 untuk suara terbaik!' })
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // ==================== PING ====================
    if (command === 'ping') {
        const msg = await message.reply('🏓 Pinging...');
        const latency = msg.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);
        
        msg.edit(`🏓 Pong!\n📡 Latency: **${latency}ms**\n💓 API: **${apiLatency}ms**`);
    }
});

// ============ LOGIN ============
client.login(process.env.DISCORD_TOKEN);
