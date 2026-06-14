// ---------------------------------------------------------------------------
// Mirpur Help — Telegram bot (Phase 1, unified data)
//
// Reads the SAME shared data as the web app (../data/services.json and
// ../data/events.json), so there is ONE source of truth. Update the JSON files
// and both the website and the bot stay in sync automatically.
//
// SETUP
//   1) On Telegram, message @BotFather -> /newbot -> copy the token
//   2) set the env var and run:
//        Windows PowerShell:  $env:TELEGRAM_TOKEN="123:ABC"; npm start
//        Linux/macOS:         TELEGRAM_TOKEN=123:ABC npm start
// ---------------------------------------------------------------------------

const TelegramBot = require("node-telegram-bot-api");
const services = require("../data/services.json");
const eventsData = require("../data/events.json");

const TOKEN = process.env.TELEGRAM_TOKEN;
if (!TOKEN) {
  console.error("❌ Set TELEGRAM_TOKEN first. See setup notes at top of bot.js");
  process.exit(1);
}

const CATEGORIES = services.categories; // [{id,bn,en,icon,color}]
const HELPLINES = services.helplines; // [{number,bn,en}]
const SERVICES = services.services; // [{...,categories:[]}]

function upcomingEvents() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventsData.events
    .filter((e) => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

const bot = new TelegramBot(TOKEN, { polling: true });

function mainMenuKeyboard() {
  const rows = CATEGORIES.map((c) => [
    { text: `${c.icon} ${c.bn} / ${c.en}`, callback_data: `cat:${c.id}` },
  ]);
  rows.push([{ text: "🎪 বিনা মূল্যে সেবা / Free camps", callback_data: "events" }]);
  rows.push([{ text: "📞 জরুরি নম্বর / Helplines", callback_data: "help" }]);
  return { reply_markup: { inline_keyboard: rows } };
}

function welcome(chatId) {
  bot.sendMessage(
    chatId,
    "🤝 *মিরপুর সাহায্য*\nআপনি কী খুঁজছেন? নিচ থেকে বেছে নিন।\n\n*Mirpur Help* — what do you need? Tap below.",
    { parse_mode: "Markdown", ...mainMenuKeyboard() }
  );
}

bot.onText(/\/start|\/help|সাহায্য|help/i, (msg) => welcome(msg.chat.id));

bot.on("callback_query", (q) => {
  const chatId = q.message.chat.id;

  if (q.data === "help") {
    const text =
      "📞 *জরুরি নম্বর / Helplines*\n\n" +
      HELPLINES.map((h) => `• *${h.number}* — ${h.bn} / ${h.en}`).join("\n");
    bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
    return bot.answerCallbackQuery(q.id);
  }

  if (q.data === "events") {
    const list = upcomingEvents();
    const head = "🎪 *বিনা মূল্যে সেবা ও শিবির / Free camps & events*\n\n";
    const body =
      list.length === 0
        ? "এখন কোনো ইভেন্ট নেই। / No upcoming events right now."
        : list
            .map((e) => {
              const d = new Date(e.date).toLocaleDateString("bn-BD", {
                month: "long",
                day: "numeric",
              });
              return (
                `${e.icon} *${e.titleBn}*\n` +
                `  📅 ${d}, ${e.startTime}–${e.endTime}\n` +
                `  📍 ${e.location}\n` +
                `  🏢 ${e.organizerBn}` +
                (e.phone ? `\n  📞 ${e.phone}` : "")
              );
            })
            .join("\n\n");
    const tail =
      "\n\n⚠️ যাওয়ার আগে ফোন করে নিশ্চিত হোন। / Please call before going.";
    bot.sendMessage(chatId, head + body + tail, { parse_mode: "Markdown" });
    return bot.answerCallbackQuery(q.id);
  }

  if (q.data.startsWith("cat:")) {
    const catId = q.data.split(":")[1];
    const cat = CATEGORIES.find((c) => c.id === catId);
    const list = SERVICES.filter((s) => s.categories.includes(catId));
    const head = `${cat.icon} *${cat.bn} / ${cat.en}*\n\n`;
    const body =
      list.length === 0
        ? "শীঘ্রই তথ্য যোগ হবে। / Coming soon."
        : list
            .map(
              (s) =>
                `• *${s.nameBn}*\n  ${s.nameEn}\n  📍 ${s.area}` +
                (s.phone ? `\n  📞 ${s.phone}` : "") +
                (s.hours ? `\n  🕒 ${s.hours}` : "")
            )
            .join("\n\n");
    const tail =
      "\n\n⚠️ যাওয়ার আগে ফোন করে নিশ্চিত হোন। / Please call before visiting.";
    bot.sendMessage(chatId, head + body + tail, { parse_mode: "Markdown" });
    return bot.answerCallbackQuery(q.id);
  }

  bot.answerCallbackQuery(q.id);
});

// Any free-text message -> show the menu.
bot.on("message", (msg) => {
  if (msg.text && msg.text.startsWith("/")) return;
  welcome(msg.chat.id);
});

console.log("✅ Mirpur Help bot is running (unified data). Press Ctrl+C to stop.");
