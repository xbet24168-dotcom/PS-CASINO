require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const userBalances = new Map();
const dailyCooldowns = new Map();
let casinoActive = true;

// crash game map: { bet, mult, timer }
const crashGames = new Map();

// ➤ الدالة للحصول على رصيد اللاعب
function getBalance(userId) {
  if (!userBalances.has(userId)) userBalances.set(userId, 500.00); // رصيد ابتدائي 500.00
  return userBalances.get(userId);
}

// ➤ الدالة لتحديث الرصيد
function updateBalance(userId, amount) {
  const newBal = parseFloat((getBalance(userId) + amount).toFixed(2));
  userBalances.set(userId, newBal);
  return newBal;
}

client.once('clientReady', () => {
  console.log(`🎰 PARASITE-CASINO شغال!`);
  client.user.setActivity('🎰 ألعاب الكازينو | /help');
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  const { commandName, user } = interaction;

  // ---- زر Cash Out ----
  if (interaction.isButton()) {
    const [action, userId] = interaction.customId.split(':');
    if (action === 'cashout') {
      if (interaction.user.id !== userId)
        return interaction.reply({ content: '❌ هذا الزر ليس لك!', ephemeral: true });

      if (!crashGames.has(userId))
        return interaction.reply({ content: '⚠️ لقد تم سحب أرباحك مسبقاً أو انتهت اللعبة!', ephemeral: true });

      const game = crashGames.get(userId);
      clearInterval(game.timer);

      const winnings = parseFloat((game.bet * game.mult).toFixed(2));
      const newBal = updateBalance(userId, winnings);

      crashGames.delete(userId);

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('💸 تم السحب!')
        .setDescription(`ضربت **x${game.mult.toFixed(2)}** وربحت **${winnings.toFixed(2)}** عملة!\nرصيدك الآن: **${newBal.toFixed(2)}**`)
        .setFooter({ text: 'PARASITE-CASINO | لعبة Crash' });

      return interaction.update({ embeds: [embed], components: [] });
    }
    return;
  }

  // ---- /balance ----
  if (commandName === 'balance') {
    const balance = getBalance(user.id);
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('💰 رصيدك')
          .setDescription(`**${balance.toFixed(2)}** عملة`)
      ]
    });
  }

  // ---- /daily ----
  if (commandName === 'daily') {
    const now = Date.now();
    const cooldown = 5 * 60 * 1000;
    const last = dailyCooldowns.get(user.id) || 0;

    if (now - last < cooldown)
      return interaction.reply({ content: '⏳ انتظر قبل المطالبة بالمكافأة مرة أخرى.', ephemeral: true });

    const newBal = updateBalance(user.id, 500.00);
    dailyCooldowns.set(user.id, now);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('🎁 مكافأة يومية')
          .setDescription(`+500 عملة!\nرصيدك الآن: ${newBal.toFixed(2)}`)
      ]
    });
  }

  // ---- /slots ----
  if (commandName === 'slots') {
    if (!casinoActive) return interaction.reply({ content: '🎰 الكازينو مغلق.', ephemeral: true });
    const bet = parseFloat(interaction.options.getNumber('bet').toFixed(2));
    const bal = getBalance(user.id);
    if (bet > bal) return interaction.reply({ content: '❌ ليس لديك رصيد كافي.', ephemeral: true });
    if (bet < 10) return interaction.reply({ content: '❌ الحد الأدنى للرهان 10.00 عملة.', ephemeral: true });

    const symbols = ['🍒', '🍋', '🍊', '💎', '7️⃣'];
    const s = Array(3).fill().map(() => symbols[Math.floor(Math.random() * symbols.length)]);
    let result = '', win = 0;
    if (s[0] === s[1] && s[1] === s[2]) win = bet * 5, result = '🎉 ثلاث رموز متطابقة!';
    else if (s[0] === s[1] || s[1] === s[2] || s[0] === s[2]) win = bet * 2, result = '✨ رمزين متطابقين!';
    else win = -bet, result = '💸 خسرت.';

    const nb = updateBalance(user.id, win);
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(win > 0 ? '#00FF00' : '#FF0000')
          .setTitle('🎰 ماكينة الحظ')
          .setDescription(`[ ${s.join(' | ')} ]\n${result}`)
          .addFields(
            { name: 'الرهان', value: `${bet.toFixed(2)}`, inline: true },
            { name: 'النتيجة', value: `${win > 0 ? '+' : ''}${win.toFixed(2)}`, inline: true },
            { name: 'رصيدك', value: `${nb.toFixed(2)}`, inline: true }
          )
      ]
    });
  }

  // ---- /coinflip ----
  if (commandName === 'coinflip') {
    if (!casinoActive) return interaction.reply({ content: '🎰 الكازينو مغلق.', ephemeral: true });
    const bet = parseFloat(interaction.options.getNumber('bet').toFixed(2));
    const choice = interaction.options.getString('choice');
    const bal = getBalance(user.id);
    if (bet > bal) return interaction.reply({ content: '❌ ليس لديك رصيد كافي.', ephemeral: true });
    if (bet < 10) return interaction.reply({ content: '❌ الحد الأدنى للرهان 10.00 عملة.', ephemeral: true });

    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const win = result === choice ? bet : -bet;
    const nb = updateBalance(user.id, win);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(win > 0 ? '#00FF00' : '#FF0000')
          .setTitle('🪙 عملة')
          .setDescription(`النتيجة: **${result}**!`)
          .addFields(
            { name: 'اختيارك', value: choice, inline: true },
            { name: 'النتيجة', value: `${win > 0 ? 'فزت' : 'خسرت'} ${Math.abs(win).toFixed(2)}`, inline: true },
            { name: 'رصيدك', value: `${nb.toFixed(2)}`, inline: true }
          )
      ]
    });
  }

  // ---- /roulette ----
  if (commandName === 'roulette') {
    if (!casinoActive) return interaction.reply({ content: '🎰 الكازينو مغلق.', ephemeral: true });
    const bet = parseFloat(interaction.options.getNumber('bet').toFixed(2));
    const num = interaction.options.getInteger('number');
    const colorC = interaction.options.getString('color');
    const bal = getBalance(user.id);
    if (bet > bal) return interaction.reply({ content: '❌ ليس لديك رصيد كافي.', ephemeral: true });
    if (bet < 10) return interaction.reply({ content: '❌ الحد الأدنى للرهان 10.00 عملة.', ephemeral: true });

    const n = Math.floor(Math.random() * 37);
    const c = n === 0 ? 'green' : [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(n) ? 'red' : 'black';
    let win = 0, txt = '';
    if (num !== null && num === n) win += bet * 100, txt += `🎯 الرقم صحيح! (+${(bet*100).toFixed(2)})\n`; else if (num !== null) win -= bet;
    if (colorC && colorC === c) win += bet * 2, txt += `🎨 اللون صحيح! (+${(bet*2).toFixed(2)})\n`; else if (colorC) win -= bet;

    const nb = updateBalance(user.id, win);
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(win > 0 ? '#00FF00' : '#FF0000')
          .setTitle('🎡 روليت')
          .setDescription(`النتيجة: **${n} (${c})**\n${txt}`)
          .addFields(
            { name: 'الرهان', value: `${bet.toFixed(2)}`, inline: true },
            { name: 'النتيجة', value: `${win > 0 ? '+' : ''}${win.toFixed(2)}`, inline: true },
            { name: 'رصيدك', value: `${nb.toFixed(2)}`, inline: true }
          )
      ]
    });
  }

  // ---- /crash ----
  if (commandName === 'crash') {
    if (!casinoActive) return interaction.reply({ content: '🎰 الكازينو مغلق.', ephemeral: true });
    if (crashGames.has(user.id)) return interaction.reply({ content: '⚠️ أنت بالفعل في لعبة Crash! انتظر انتهاءها.', ephemeral: true });

    const bet = parseFloat(interaction.options.getNumber('bet').toFixed(2));
    const bal = getBalance(user.id);
    if (bet > bal) return interaction.reply({ content: '❌ ليس لديك رصيد كافي.', ephemeral: true });
    if (bet < 10) return interaction.reply({ content: '❌ الحد الأدنى للرهان 10.00 عملة.', ephemeral: true });

    updateBalance(user.id, -bet);
    let mult = 1.00;

    // تحديد المضاعف عند الانفجار حسب الاحتمالات النادرة
    let crashAt;
    const chance = Math.random();
    if (chance < 0.45) crashAt = parseFloat((Math.random() * (2-1)+1).toFixed(2));   // 45% احتمال x1-x2
    else if (chance < 0.45 + 0.28) crashAt = parseFloat((Math.random() * (4-2)+2).toFixed(2)); // 28% x2-x4
    else if (chance < 0.45 + 0.28 + 0.14) crashAt = parseFloat((Math.random() * (10-4)+4).toFixed(2)); // 14% x4-x10
    else if (chance < 0.45 + 0.28 + 0.14 + 0.08) crashAt = parseFloat((Math.random() * (20-10)+10).toFixed(2)); // 8% x10-x20
    else crashAt = parseFloat((Math.random() * (30-20)+20).toFixed(2)); // 5% x20-x30

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('🚀 لعبة Crash')
      .setDescription(`الرهان: **${bet.toFixed(2)}**\nالمضاعف الحالي: **x${mult.toFixed(2)}**`)
      .setFooter({ text: 'اضغط 💸 Cash Out قبل الانفجار!' });

    const btn = new ButtonBuilder()
      .setCustomId(`cashout:${user.id}`)
      .setLabel('💸 Cash Out')
      .setStyle(ButtonStyle.Success);
    const row = new ActionRowBuilder().addComponents(btn);

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const timer = setInterval(async () => {
      mult = parseFloat((mult + Math.random() * 0.3).toFixed(2));
      if (mult >= crashAt) {
        clearInterval(timer);
        if (crashGames.has(user.id)) {
          crashGames.delete(user.id);
          await msg.edit({
            embeds: [
              new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('💥 انفجار!')
                .setDescription(`انفجر عند **x${crashAt.toFixed(2)}**\n❌ خسرت **${bet.toFixed(2)}** عملة.`)
            ],
            components: []
          });
        }
        return;
      }
      if (crashGames.has(user.id)) {
        crashGames.set(user.id, { bet, mult, timer });
        const upd = EmbedBuilder.from(embed)
          .setDescription(`الرهان: **${bet.toFixed(2)}**\nالمضاعف الحالي: **x${mult.toFixed(2)}**`);
        await msg.edit({ embeds: [upd], components: [row] });
      }
    }, 500);

    crashGames.set(user.id, { bet, mult, timer });
  }

  // ---- /help ----
  if (commandName === 'help') {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('🎰 أوامر PARASITE-CASINO')
        .setDescription('جميع أوامر ألعاب الكازينو:')
        .addFields(
          { name: '/balance', value: 'عرض الرصيد' },
          { name: '/daily', value: 'استلام مكافأة يومية 500 عملة' },
          { name: '/slots <bet>', value: 'ماكينة الحظ (الحد الأدنى 10.00)' },
          { name: '/coinflip <bet> <choice>', value: 'عملة (الحد الأدنى 10.00)' },
          { name: '/roulette <bet> [number] [color]', value: 'لعبة روليت (الحد الأدنى 10.00)' },
          { name: '/crash <bet>', value: 'لعبة Crash (الحد الأدنى 10.00)' },
          { name: '/casino-off', value: 'إيقاف الكازينو (مالك السيرفر)' },
          { name: '/reset-coins', value: 'إعادة ضبط جميع الأرصدة (مالك السيرفر)' }
        )]
    });
  }

  // ---- /casino-off ----
  if (commandName === 'casino-off') {
    const OWNER_ID = 'PUT_YOUR_ID_HERE';
    if (user.id !== OWNER_ID) return interaction.reply({ content: '❌ غير مسموح!', ephemeral: true });
    casinoActive = false;
    return interaction.reply('🛑 تم إيقاف الكازينو.');
  }

  // ---- /reset-coins ----
  if (commandName === 'reset-coins') {
    const OWNER_ID = 'PUT_YOUR_ID_HERE';
    if (user.id !== OWNER_ID) return interaction.reply({ content: '❌ غير مسموح!', ephemeral: true });
    userBalances.forEach((_, k) => userBalances.set(k, 500.00));
    return interaction.reply('💎 تم إعادة ضبط أرصدة الجميع إلى 500 عملة.');
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
