// const Discord = require('discord.js'); //looks in node_modules folder for discord.js
const { prefix, token, giphyToken, TOChatGeneral, CStatSmashAnnouncements, botID, poolPref, meID, tourneySheetID, serverTOID, helpMessage } = require('./config.json');
// const client = new Discord.Client();

var botFuncs = {
  testFunction: function(msg) {
    msg.author.send("ayyyyyyyyy")
  },

  sendGif: function(msg) {
    var GphApiClient = require('giphy-js-sdk-core')
    giphy = GphApiClient(giphyToken) //look here for giphy api documentation: https://github.com/Giphy/giphy-js-sdk-core

    let gifWord = msg.content.substring(5, msg.content.length);
    if(!(gifWord == "")){
      giphy.search('gifs', {"q": gifWord})
        .then((response) => {
          let totalGifs = response.data.length;
          let gifIndex = Math.floor((Math.random() * 10) + 1) % totalGifs;
          let finalGif = response.data[gifIndex];
          msg.channel.send({files: [finalGif.images.fixed_height.url]})
        }).catch(err => {
          msg.channel.send("Either there are no gifs of " + gifWord + " or something went wrong when running this command!")
        })
    }
  }
}

module.exports = botFuncs;
