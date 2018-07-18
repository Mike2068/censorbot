//Auth and Discord

const Discord = require('discord.js');
const bot = new Discord.Client();
const auth = require('./auth.json')

//End of Auth and discord

//Calling global constructers for modules

var mysql = require('mysql')
var connection = mysql.createConnection({
	host: auth.mysqlhost,
	user: auth.mysqluser,
	password: auth.mysqlpassword,
	database: auth.mysqldatabase
}); 
const stuff = require('./stuff.json')

//End of global constructers for modules

//Global commands and startup on bot ready

bot.on('message', async (message) => {
if(message.content == "+restart") {
const botowner = bot.users.get("142408079177285632")
if(message.author != botowner) return;
connection.query("CRASH")
}
})
bot.on('ready', () => {
    console.log('sector on');
	const statuslog = bot.channels.get("450444337357258772")
statuslog.send(`${Date().toLocaleString()} Bot started}`)
});

//End of global commands and startup on bot ready

// Calling and running modules

const botready__dbl = require('./botready__dbl.js')
const editedswearfilter = require('./editedswearfilter.js')
const joinguild = require('./joinguild.js')
const kickbanping = require('./kickbanping.js')
const leaveguild = require('./leaveguild.js')
const mmo = require('./mmo.js')
const nicknamefilter = require('./nicknamefilter.js')
const swearfilter = require('./swearfilter.js')
const ticket = require('./ticket.js')
const usecommands = require('./usecommands.js')

botready__dbl(bot, connection, stuff, auth);
editedswearfilter(bot, connection, stuff, auth);
joinguild(bot, connection, stuff, auth);
kickbanping(bot, connection, stuff, auth);
leaveguild(bot, connection, stuff, auth);
mmo(bot, connection, stuff, auth);
nicknamefilter(bot, connection, stuff, auth);
swearfilter(bot, connection, stuff, auth);
ticket(bot, connection, stuff, auth);
usecommands(bot, connection, stuff, auth);

// End of calling and running modules

bot.login(auth.token);