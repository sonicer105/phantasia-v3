const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
require('dotenv').config();

const commands = [
    {
        name: 'addtask',
        description: 'Add a task for a user',
        options: [
            {
                name: 'userid',
                type: 6, // USER
                description: 'The user to assign the task to',
                required: true,
            },
            {
                name: 'description',
                type: 3, // STRING
                description: 'The description of the task',
                required: true,
            },
            {
                name: 'xp',
                type: 4, // INTEGER
                description: 'The XP to be awarded for the task',
                required: true,
            },
            {
                name: 'xptype',
                type: 3, // STRING
                description: 'The type of XP to be awarded for the task',
                required: true,
            }
        ],
    },
    {
        name: 'completetask',
        description: 'Complete a task',
        options: [
            {
                name: 'taskid',
                type: 3, // STRING
                description: 'The ID of the task to complete',
                required: true,
            }
        ],
    },
    {
        name: 'deletetask',
        description: 'Delete a task',
        options: [
            {
                name: 'taskid',
                type: 3, // STRING
                description: 'The ID of the task to delete',
                required: true,
            }
        ],
    },
    {
        name: 'profile',
        description: 'View your profile and outstanding tasks',
        options: [
            {
                name: 'user',
                type: 6, // USER
                description: 'The user whose profile to view',
                required: false,
            }
        ],
    },
    {
        name: 'xp',
        description: 'Manage XP for a user',
        options: [
            {
                name: 'action',
                type: 3, // STRING
                description: 'The action to perform (set, add, remove)',
                required: true,
                choices: [
                    {
                        name: 'set',
                        value: 'set'
                    },
                    {
                        name: 'add',
                        value: 'add'
                    },
                    {
                        name: 'remove',
                        value: 'remove'
                    }
                ]
            },
            {
                name: 'amount',
                type: 4, // INTEGER
                description: 'The amount of XP',
                required: true
            },
            {
                name: 'user',
                type: 6, // USER
                description: 'The user to manage XP for',
                required: true
            },
            {
                name: 'xptype',
                type: 3, // STRING
                description: 'The type of XP to manage',
                required: true,
            }
        ]
    },
    {
        name: 'leaderboard',
        description: 'Show the top 10 users with the most Levels'
    }
];

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
