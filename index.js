const Discord = require('discord.js'); //looks in node_modules folder for discord.js
const { prefix, token, giphyToken } = require('./config.json');
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

var weeklyMessage = "There is not yet a weekly tournament link"
var weeklyLink = "There is not yet a weekly tournament message"

var GphApiClient = require('giphy-js-sdk-core')
giphy = GphApiClient(giphyToken) //look here for giphy api documentation: https://github.com/Giphy/giphy-js-sdk-core

var weeklyThisWeek = false;

client.on('ready', () => {
	console.log('Ready!')
	var myChannel = client.channels.find(channel => channel.id === '633430592184123395') //FIXME: change this to the main one in smash discord

	//SEND WEEKLY TOURNAMENT UPDATES AT 7 PM ON TUESDAYS AND WEDNESDAYS
	cron.schedule("* * * * * *", async function(){ //LOH: it sends the message and link from the google sheet. I need to get it to set it to send on Tues and Wed. I then need to figure out how to get the bot on a different sever and run it 24/7
		if(weeklyThisWeek){
			const gsapi = google.sheets({version: 'v4', auth: sheetsClient});

			const options = {
				spreadsheetId: "1TcleNAyGY6KZADeBap73T2guOwcgXG5IwRBqnex4HRo",
				range: "A2:B2"
			};

			let sheetsData = await gsapi.spreadsheets.values.get(options);
			weeklyMessage = sheetsData.data.values[0][0]
			weeklyLink = sheetsData.data.values[0][1]

			myChannel.send(weeklyMessage).catch(err => {
				console.log("Something went wrong when running this command!")
				message.channel.send("Something went wrong when running this command!")
			})

			myChannel.send(weeklyLink).catch(err => {
				console.log("Something went wrong when running this command!")
				message.channel.send("Something went wrong when running this command!")
			})
		}
	})
})

client.on('message', /*async*/ (message) => { //can look at message class in discord.js to learn more about this

	//SENDING GIFS
	if(message.content.startsWith(`${prefix}gif-`)){
		let gifWord = message.content.substring(5, message.content.length);
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

	//SETTING WHETHER OR NOT THERE IS A WEEKLY FOR TOs
	if(message.channel.id == '667862290732941343'){ //change this to TO channel's ID
		//THERE IS A WEEKLY THIS WEEK
		if(message.content.startsWith(`${prefix}weeklyThisWeek`)){
			weeklyThisWeek = true;
			message.channel.send("There is a weekly this week. The bot will send updates every Tuesday and Wednesday until you type !noWeeklyThisWeek to indicate there is not a tournament this week.")
		}
		//THERE IS NO WEEKLY THIS WEEK
		if(message.content.startsWith(`${prefix}noWeeklyThisWeek`)){
			weeklyThisWeek = false;
			message.channel.send("There is not a weekly this week. The bot will not send updates until you type !weeklyThisWeek to indicate that there is a tournament this week.")
		}

		//UPDATE TOURNAMENT LINK
		if(message.content.startsWith(`${prefix}setTourneyLink-`)){
			let newLink = message.content.substring(16, message.content.length);

			if(!(newLink.startsWith(`https://`))){
				let https = "https://"
				newLink = https.concat(newLink)
			}

			const gsapi = google.sheets({version: 'v4', auth: sheetsClient});

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

			const gsapi = google.sheets({version: 'v4', auth: sheetsClient});

			const options = {
				spreadsheetId: "1TcleNAyGY6KZADeBap73T2guOwcgXG5IwRBqnex4HRo",
				range: "A2",
				valueInputOption: 'RAW',
				resource: { values: [ [newMessage] ] }
			};

			gsapi.spreadsheets.values.update(options)
		}
	}

	//get the tournament link
	if(message.content.startsWith(`${prefix}getTourneyLink`)){

		message.author.send(weeklyLink).catch(err => { //LOH: Got this to work, need to get thing to update by sending message to bot
			console.log("Something went wrong when running this command!")
			message.channel.send("Something went wrong when running this command!")
		})
	}
})

client.login(token);
