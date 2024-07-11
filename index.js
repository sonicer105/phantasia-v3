const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');
const User = require('./models/User');
const Task = require('./models/Task');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

mongoose.connect(process.env.MONGODB_URI);

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

function getLevel(xp) {
    const levels = [2000, 4000, 8000, 15800, 34000, 72000, 100000, 200000, 300000, 500000];
    let level = 0;
    for (let i = 0; i < levels.length; i++) {
        if (xp >= levels[i]) {
            level = i + 1;
        } else {
            break;
        }
    }
    return level;
}

async function addTask(interaction) {
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
        return interaction.reply('You do not have permission to use this command.');
    }

    const assignedTo = interaction.options.getUser('userid');
    const xp = interaction.options.getInteger('xp');
    const xpType = interaction.options.getString('xptype');
    const description = interaction.options.getString('description');

    const task = new Task({ description, xp, xpType, assignedTo: assignedTo.id });

    await task.save();
    return interaction.reply(`Task ${task.taskId} added for ${assignedTo.displayName} with ${xp} XP in ${xpType}.`);
}

async function completeTask(interaction) {
    const taskId = interaction.options.getString('taskid');
    const task = await Task.findOne({ taskId });

    if (!task) {
        return interaction.reply(`Task not found.`);
    }

    const isAdmin = interaction.member.permissions.has('ADMINISTRATOR');
    const isAssignedToUser = task.assignedTo === interaction.user.id;

    if (isAdmin || isAssignedToUser) {
        await Task.deleteOne({ taskId });

        let user = await User.findOne({ userId: task.assignedTo });
        if (!user) {
            user = new User({ userId: task.assignedTo });
        }

        user.xp.set(task.xpType, (user.xp.get(task.xpType) || 0) + task.xp);
        await user.save();

        const assignedMember = await interaction.guild.members.fetch(task.assignedTo);
        return interaction.reply(`Task ${taskId} completed! ${assignedMember.displayName} earned ${task.xp} XP in ${task.xpType}.`);
    } else {
        return interaction.reply(`You do not have permission to complete this task.`);
    }
}


async function deleteTask(interaction) {
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
        return interaction.reply('You do not have permission to use this command.');
    }

    const taskId = interaction.options.getString('taskid');
    const task = await Task.findOne({ taskId });

    if (task) {
        await Task.deleteOne({ taskId });
        return interaction.reply(`Task ${taskId} has been deleted.`);
    } else {
        return interaction.reply(`Task not found.`);
    }
}

async function showProfile(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id);

    let user = await User.findOne({ userId: targetUser.id });
    if (!user) {
        user = new User({ userId: targetUser.id });
        await user.save();
    }

    let response = `${member.displayName}'s Profile:\n`;
    for (let [xpType, xpAmount] of user.xp) {
        const level = getLevel(xpAmount);
        response += `**${xpType}**: Level ${level}, ${xpAmount} XP\n`;
    }

    const tasks = await Task.find({ assignedTo: targetUser.id });
    if (tasks.length > 0) {
        const taskList = tasks.map(task => `ID: ${task.taskId}, Description: ${task.description}, XP: ${task.xp} in ${task.xpType}`).join('\n');
        response += `\nOutstanding tasks:\n${taskList}`;
    } else {
        response += '\nNo outstanding tasks.';
    }

    return interaction.reply(response);
}

async function manageXP(interaction) {
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
        return interaction.reply('You do not have permission to use this command.');
    }

    const action = interaction.options.getString('action');
    const amount = interaction.options.getInteger('amount');
    const xpType = interaction.options.getString('xptype');
    const targetUser = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(targetUser.id);

    let user = await User.findOne({ userId: targetUser.id });
    if (!user) {
        user = new User({ userId: targetUser.id });
    }

    let currentXP = user.xp.get(xpType) || 0;
    if (action === 'set') {
        currentXP = amount;
    } else if (action === 'add') {
        currentXP += amount;
    } else if (action === 'remove') {
        currentXP = Math.max(0, currentXP - amount);
    } else {
        return interaction.reply('Invalid action. Use set, add, or remove.');
    }

    user.xp.set(xpType, currentXP);
    await user.save();

    return interaction.reply(`${member.displayName} now has ${currentXP} XP in ${xpType}.`);
}

async function showLeaderboard(interaction) {
    // Find all users who have any XP
    const users = await User.find({ xp: { $exists: true, $ne: {} } });

    // Calculate total levels for each user
    const leaderboardData = users.map(user => {
        let totalLevels = 0;
        for (let xpAmount of user.xp.values()) {
            totalLevels += getLevel(xpAmount);
        }
        return {
            userId: user.userId,
            totalLevels: totalLevels
        };
    });

    // Sort users by total levels in descending order and get top 10
    const sortedLeaderboard = leaderboardData.sort((a, b) => b.totalLevels - a.totalLevels).slice(0, 10);

    // Generate leaderboard message
    const leaderboard = await Promise.all(sortedLeaderboard.map(async (entry, index) => {
        const member = await interaction.guild.members.fetch(entry.userId);
        return `${index + 1}. ${member.displayName} - Total Levels: ${entry.totalLevels}`;
    }));

    return interaction.reply(`Leaderboard:\n${leaderboard.join('\n')}`);
}

async function handleInteraction(interaction) {
    const { commandName } = interaction;
    let initialXPMap = new Map(), newXPMap = new Map(), user;

    if (['addtask', 'completetask', 'profile', 'xp', 'leaderboard'].includes(commandName)) {
        if (commandName === 'xp') {
            user = await User.findOne({ userId: interaction.options.getUser('user').id });
        } else {
            user = await User.findOne({ userId: interaction.user.id });
        }
        if (user) {
            initialXPMap = new Map(user.xp);
        }
    }

    if (commandName === 'addtask') {
        await addTask(interaction);
    } else if (commandName === 'completetask') {
        await completeTask(interaction);
    } else if (commandName === 'deletetask') {
        await deleteTask(interaction);
    } else if (commandName === 'profile') {
        await showProfile(interaction);
    } else if (commandName === 'xp') {
        await manageXP(interaction);
    } else if (commandName === 'leaderboard') {
        await showLeaderboard(interaction);
    }

    if (['addtask', 'completetask', 'profile', 'xp', 'leaderboard'].includes(commandName)) {
        if (commandName === 'xp') {
            user = await User.findOne({ userId: interaction.options.getUser('user').id });
        } else {
            user = await User.findOne({ userId: interaction.user.id });
        }
        if (user) {
            newXPMap = new Map(user.xp);
        }

        for (let [xpType, newXP] of newXPMap) {
            const initialXP = initialXPMap.get(xpType) || 0;
            const initialLevel = getLevel(initialXP);
            const newLevel = getLevel(newXP);

            if (initialLevel !== newLevel) {
                const member = await interaction.guild.members.fetch(user.userId);
                const levelChangeMessage = newLevel > initialLevel ?
                    `${member.displayName} has leveled up to level ${newLevel} in ${xpType}!` :
                    `${member.displayName} has leveled down to level ${newLevel} in ${xpType}.`;
                interaction.channel.send(levelChangeMessage);
            }
        }
    }
}

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    await handleInteraction(interaction);
});

client.login(process.env.DISCORD_TOKEN);

