const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();
const token = process.env.token;
const bot = new TelegramBot(token, { polling: true });
const radioUrl = "http://live.mp3quran.net:8006/";

const keyboard = {
    reply_markup: {
        keyboard: [
            [{ text: '📖 Quran Radio' }]  // Button for requesting surah/ayah
        ],
        resize_keyboard: true,  // This resizes the keyboard to fit the buttons
        one_time_keyboard: false  // Ensures the keyboard stays open
    }
};

// Welcome message in Uzbek when the bot starts
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name;
    bot.sendMessage(chatId, `Assalamu 'alaykum ${userName}!\n❓To'liq surani olish uchun sura raqamini (masalan, 1) yuboring yoki ma'lum bir oyatni olish uchun sura va oyat raqamini yuboring (masalan, 1:2).\n❓Quran Radio eshitish uchun esa [📖 Quran Radio] tugmasini bosing.\n ❗️Bot sekinroq ishlashi mumkin,\nsabirli bo'ling❗️`, keyboard);
});

// Command to play Quran radio in Uzbek
bot.onText(/📖 Quran Radio/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `Quran Radio eshitish uchun bosing: ${radioUrl}`);
});

// Function to fetch a full surah or a specific verse in Uzbek
async function fetchQuranData(surah, ayah = null) {
    try {
        let response;
        if (ayah) {
            // Get a specific ayah (in Uzbek translation if available)
            response = await axios.get(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/uz.sodik`);
        } else {
            // Get the full surah (in Uzbek translation if available)
            response = await axios.get(`https://api.alquran.cloud/v1/surah/${surah}/uz.sodik`);
        }
        if (response.data.status === 'OK') {
            return response.data.data;
        } else {
            // Xatolik holatida `null` qaytariladi
            return null;
        }
    } catch (error) {
        return null;  // Xatolik bo'lsa `null` qaytarish
    }
}

// Handle surah or ayah request
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    // Check if the message is a surah or ayah request (e.g., "2", "2:255")
    const surahAyahPattern = /^(\d+)(?::(\d+))?$/;  // Matches "n" or "n:m"
    const match = text.match(surahAyahPattern);

    if (match) {
        const surahNumber = match[1];
        const ayahNumber = match[2];

        // Fetch the requested data from the Quran API in Uzbek
        const quranData = await fetchQuranData(surahNumber, ayahNumber);

        if (quranData) {
            if (ayahNumber) {
                // Send the specific ayah in Uzbek
                bot.sendMessage(chatId, `Surah ${quranData.surah.englishName}, Oyat ${ayahNumber}:\n${quranData.text}`);
            } else {
                // Send the full surah in a file
                let surahText = `Surah ${quranData.englishName} (${quranData.englishNameTranslation}) - ${quranData.numberOfAyahs} oyat:\n`;
                quranData.ayahs.forEach((ayah) => {
                    surahText += `${ayah.numberInSurah}. ${ayah.text}\n`;
                });
                const fileName = `surah_${quranData.englishName}.txt`;

                // Write the surah to a file
                fs.writeFileSync(fileName, surahText);

                // Send the file to the user
                bot.sendDocument(chatId, fileName).then(() => {
                    // Optionally delete the file after sending
                    fs.unlinkSync(fileName);
                }).catch(err => {
                    console.error("Faylni jo'natishda xatolik:", err);
                    bot.sendMessage(chatId, "Faylni jo'natishda xatolik yuz berdi.");
                });
            }
        } else {
            // Ogohlantirish xabari: sura yoki oyat mavjud emas
            bot.sendMessage(chatId, "Bunday sura yoki oyat mavjud emas!");
        }
    }
});

console.log('bot starting ...');
