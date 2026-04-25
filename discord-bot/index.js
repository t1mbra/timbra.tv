require("dotenv").config();

const { Client, GatewayIntentBits, Events } = require("discord.js");
const { handleGuildMemberAdd } = require("./lib/guildMemberAdd");
const { handleGuildMemberUpdate } = require("./lib/guildMemberUpdate");
const { handleGuildMemberRemove } = require("./lib/guildMemberRemove");
const { writeBotStateNow, scheduleBotStateWrite } = require("./lib/botState");

const RESYNC_INTERVAL_MS = 60_000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Бот запущен как ${readyClient.user.tag}`);
  scheduleBotStateWrite(readyClient);
  setInterval(() => {
    void writeBotStateNow(client);
  }, RESYNC_INTERVAL_MS);
});

client.on(Events.GuildCreate, () => {
  scheduleBotStateWrite(client);
});

client.on(Events.GuildDelete, () => {
  scheduleBotStateWrite(client);
});

client.on(Events.GuildMemberAdd, (member) => {
  void handleGuildMemberAdd(member);
});

client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
  void handleGuildMemberUpdate(oldMember, newMember);
});

client.on(Events.GuildMemberRemove, (member) => {
  void handleGuildMemberRemove(member);
});

client.login(process.env.DISCORD_TOKEN);