require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your coin balance'),

    new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily 500 coins'),

    new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Spin the slot machine (min 10 coins)')
        .addNumberOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin (min 10 coins)')
        .addNumberOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('choice')
                .setDescription('Heads or tails')
                .setRequired(true)
                .addChoices(
                    { name: 'heads', value: 'heads' },
                    { name: 'tails', value: 'tails' }
                )
        ),

    new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Spin the roulette wheel (min 10 coins)')
        .addNumberOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('color')
                .setDescription('red, black, or green')
                .setRequired(true)
                .addChoices(
                    { name: 'red', value: 'red' },
                    { name: 'black', value: 'black' },
                    { name: 'green', value: 'green' }
                )
        ),

    new SlashCommandBuilder()
        .setName('crash')
        .setDescription('Play the Crash game (min 10 coins)')
        .addNumberOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show casino commands')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
