//// TODO: take out all spreadsheetId and put in config

const Discord = require('discord.js'); //looks in node_modules folder for discord.js
const { prefix, token, giphyToken, TOChatGeneral, CStatSmashAnnouncements, botID, poolPref, meID, tourneySheetID, serverTOID, helpMessage } = require('./config.json');
const cron = require("node-cron");
const client = new Discord.Client();
var botFuncs = require("./botFunctions.js")

const {google} = require('googleapis');
const sheetsKeys = require('./sheetsKeys.json')

const sheetsClient = new google.auth.JWT(
	sheetsKeys.client_email,
	null,
	sheetsKeys.private_key,
	['https://www.googleapis.com/auth/spreadsheets']
);

//connect to Google
sheetsClient.authorize(function(err, tokens){
	if(err){
		console.log("Error connecting to google");
	}
	else{
		console.log("Connected to Google!");
	}
});
const gsapi = google.sheets({version: 'v4', auth: sheetsClient});

client.on('ready', () => {
	console.log('Ready!')

	//find me (jakerdou)
	var me = client.users.find(user => user.id === meID)

	//channel to send announcements to
	var announcementsChannel = client.channels.find(channel => channel.id === CStatSmashAnnouncements)

	//SEND WEEKLY TOURNAMENT UPDATES AT 7 PM ON TUESDAYS AND WEDNESDAYS
	cron.schedule("0 1 * * 2-4", async function(){ //changed this to correct time

		const options = {
			spreadsheetId: tourneySheetID,
			range: "A2:C2"
		};

		let sheetsData = await gsapi.spreadsheets.values.get(options);
		weeklyMessage = sheetsData.data.values[0][0]
		weeklyLink = sheetsData.data.values[0][1]
		weeklyTorF = sheetsData.data.values[0][2]

		if(weeklyTorF == "f"){weeklyThisWeek = false;}
		else{weeklyThisWeek = true;}

		if(weeklyThisWeek){
			announcementsChannel.send(weeklyMessage)
			announcementsChannel.send(weeklyLink)
		}
	})
})

client.on('message', async (message) => {

	if(message.content == "!test" && message.author.id == meID){
		message.author.send("you rang?")
	}

	//if the bot sends the message, ignore it
	if(!(message.author.id == botID)){

		//GET HELP ON HOW TO USE THE BOT
		if(message.content.startsWith(`${prefix}botHelp`)){
			if(message.content.startsWith(`${prefix}botHelpChannel`)){
				message.channel.send(helpMessage)
			}
			else{
				message.author.send(helpMessage)
			}
		}

		//SENDING GIFS
		if(message.content.startsWith(`${prefix}gif-`)){
			botFuncs.sendGif(message)
		}

		//get the tournament link
		if(message.content.startsWith(`${prefix}getTourneyLink`)){

			const options = {
				spreadsheetId: tourneySheetID,
				range: "B2:C2"
			};

			let sheetsData = await gsapi.spreadsheets.values.get(options);

			var weeklyLink = sheetsData.data.values[0][0]
			var weeklyTorF = sheetsData.data.values[0][1]

			if(weeklyTorF == "f"){
				message.author.send("There is no tournament this week")
			}
			else{
				message.author.send(weeklyLink)
			}
		}

		// //request early or late pool
		// if(message.content.startsWith(`${prefix}request`)){
		// 	var poolPrefChannel = client.channels.find(channel => channel.id === poolPref) //figure out where to define this
		//
		// 	if(message.content.startsWith(`${prefix}requestEarlyPool`)){
		// 		poolPrefChannel.send("@" + message.author.username + " would like to request an early pool for this week.")
		// 		message.channel.send("The TOs have been notified.")
		// 	}
		// 	if(message.content.startsWith(`${prefix}requestLatePool`)){
		// 		poolPrefChannel.send("@" + message.author.username + " would like to request a late pool for this week.")
		// 		message.channel.send("The TOs have been notified.")
		// 	}
		// }

		if(message.content.startsWith(`${prefix}requestUnregister`)){
			poolPrefChannel.send("@" + message.author.username + " would like to unregister from the tournament.")
			message.channel.send("The TOs have been notified.")
		}

		//ADMIN COMMANDS
		//TO Server
		let serverTO = client.guilds.find(guild => guild.id === serverTOID) // TODO: add this to config
		let senderInTOServer = serverTO.members.find(member => member.id === message.author.id)

		if(senderInTOServer != null){ //change this to TO channel's ID
			//THERE IS A WEEKLY THIS WEEK
			if(message.content.startsWith(`${prefix}weeklyThisWeek`)){
				const options = {
				spreadsheetId: tourneySheetID,
				range: "C2",
				valueInputOption: 'RAW',
				resource: { values: [ ["t"] ] }
				};

				gsapi.spreadsheets.values.update(options)

				message.channel.send("There is a weekly this week. The bot will send updates every Tuesday and Wednesday until you type !noWeeklyThisWeek to indicate there is not a tournament this week.")
			}

			//THERE IS NO WEEKLY THIS WEEK
			if(message.content.startsWith(`${prefix}noWeeklyThisWeek`)){
				const options = {
				spreadsheetId: tourneySheetID,
				range: "C2",
				valueInputOption: 'RAW',
				resource: { values: [ ["f"] ] }
				};

				gsapi.spreadsheets.values.update(options)

				message.channel.send("There is not a weekly this week. The bot will not send updates until you type !weeklyThisWeek to indicate that there is a tournament this week.")
			}

			//UPDATE TOURNAMENT LINK
			if(message.content.startsWith(`${prefix}setTourneyLink-`)){
				let newLink = message.content.substring(16, message.content.length);

				if(!(newLink.startsWith(`https://`))){
					let https = "https://"
					newLink = https.concat(newLink)
				}

				const options = {
					spreadsheetId: tourneySheetID,
					range: "B2",
					valueInputOption: 'RAW',
					resource: { values: [ [newLink] ] }
				};

				gsapi.spreadsheets.values.update(options)
			}

			//UPDATE TOURNAMENT MESSAGE
			if(message.content.startsWith(`${prefix}setTourneyMessage-`)){
				let newMessage = message.content.substring(19, message.content.length);

				const options = {
					spreadsheetId: tourneySheetID,
					range: "A2",
					valueInputOption: 'RAW',
					resource: { values: [ [newMessage] ] }
				};

				gsapi.spreadsheets.values.update(options)
			}
		}
	}
})

client.login(token);
