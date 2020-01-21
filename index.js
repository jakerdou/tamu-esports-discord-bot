const Discord = require('discord.js'); //looks in node_modules folder for discord.js
const { prefix, token, giphyToken, TOChatGeneral, CStatSmashAnnouncements, botID, helpMessage } = require('./config.json');
const cron = require("node-cron");
const client = new Discord.Client();

const {google} = require('googleapis');
const sheetsKeys = require('./sheetsKeys.json')

const sheetsClient = new google.auth.JWT(
	sheetsKeys.client_email,
	null,
	sheetsKeys.private_key,
	['https://www.googleapis.com/auth/spreadsheets']
);
sheetsClient.authorize(function(err, tokens){
	if(err){
		console.log("Error connecting to google");
	}
	else{
		console.log("Connected to Google!");
	}
});
const gsapi = google.sheets({version: 'v4', auth: sheetsClient});
/*********************************FIXME: need to get things to take directly from google sheets instead of relying on local variables**************************************/
client.on('ready', () => {
	console.log('Ready!')

	//channel to send announcements to
	var announcementsChannel = client.channels.find(channel => channel.id === CStatSmashAnnouncements) //FIXME: change this to the main one in smash discord

	//SEND WEEKLY TOURNAMENT UPDATES AT 7 PM ON TUESDAYS AND WEDNESDAYS
	cron.schedule("0 19 * * 2-3", async function(){ //LOH: it sends the message and link from the google sheet. I need to get it to set it to send on Tues and Wed. I then need to figure out how to get the bot on a different sever and run it 24/7

		const options = {
			spreadsheetId: "1TcleNAyGY6KZADeBap73T2guOwcgXG5IwRBqnex4HRo",
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

client.on('message', async (message) => { //can look at message class in discord.js to learn more about this

	//if the bot sends the message, ignore it
	if(!(message.author.id == botID)){ //FIXME: change to correct id when put on other server

		//GET HELP ON HOW TO USE THE BOT, maybe get them to change the pinned message to the right thing
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
			var GphApiClient = require('giphy-js-sdk-core')
			giphy = GphApiClient(giphyToken) //look here for giphy api documentation: https://github.com/Giphy/giphy-js-sdk-core

			let gifWord = message.content.substring(5, message.content.length);
			if(!(gifWord == "")){
				giphy.search('gifs', {"q": gifWord})
					.then((response) => {
						let totalGifs = response.data.length;
						let gifIndex = Math.floor((Math.random() * 10) + 1) % totalGifs;
						let finalGif = response.data[gifIndex];
						message.channel.send({files: [finalGif.images.fixed_height.url]})
					}).catch(err => {
						console.log("Something went wrong when running this command!")
						message.channel.send("Something went wrong when running this command!")
					})
			}

		}

		//check if there is a tournament this week
		if(message.content.startsWith(`${prefix}tourneyThisWeek?`)){

			const options = {
				spreadsheetId: "1TcleNAyGY6KZADeBap73T2guOwcgXG5IwRBqnex4HRo",
				range: "B2:C2"
			};

			let sheetsData = await gsapi.spreadsheets.values.get(options);

			var weeklyLink = sheetsData.data.values[0][0]
			var weeklyTorF = sheetsData.data.values[0][1]

			if(weeklyTorF == "f"){
				message.author.send("There is no tournament this week")
			}
			else{
				message.author.send("There is a tournament this week, here is the link:")
				message.author.send(weeklyLink)
			}
		}

		//get the tournament link
		if(message.content.startsWith(`${prefix}getTourneyLink`)){

			const options = {
				spreadsheetId: "1TcleNAyGY6KZADeBap73T2guOwcgXG5IwRBqnex4HRo",
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

		//ADMIN COMMANDS FIXME: need to get it so you can admins can send link & message to the whole general channel, maybe set it so the admins can do it regardless of what channel they send it in
		if(message.channel.id == TOChatGeneral){ //change this to TO channel's ID
			//THERE IS A WEEKLY THIS WEEK
			if(message.content.startsWith(`${prefix}weeklyThisWeek`)){
				const options = {
				spreadsheetId: "1TcleNAyGY6KZADeBap73T2guOwcgXG5IwRBqnex4HRo",
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
				spreadsheetId: "1TcleNAyGY6KZADeBap73T2guOwcgXG5IwRBqnex4HRo",
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
					spreadsheetId: "1TcleNAyGY6KZADeBap73T2guOwcgXG5IwRBqnex4HRo",
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
					spreadsheetId: "1TcleNAyGY6KZADeBap73T2guOwcgXG5IwRBqnex4HRo",
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
