const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();
const token = process.env.token;
const bot = new TelegramBot(token, { polling: true });
const radioUrl1 = "https://backup.qurango.net/radio/mohammed_allohaidan";
const radioUrl2 = "https://backup.qurango.net/radio/yasser_aldosari"

const keyboard = {
    reply_markup: {
        keyboard: [
            [{ text: '📖 Quran Radio' }]  // Button for requesting surah/ayah
        ],
        resize_keyboard: true,  // This resizes the keyboard to fit the buttons
        one_time_keyboard: false  // Ensures the keyboard stays open
    }
};


bot.onText(/📖 Quran Radio/, (msg) => {
    const chatId = msg.chat.id;
    const option = {
        reply_markup: {
            inline_keyboard: [
                [{text: "Muhammad Al-Luhaidan", callback_data: "radio1"}],
                [{text: "Yasser Al-Dosari", callback_data: "radio2"}]
            ]
        }
    }
    bot.sendMessage(chatId, `Qorini tanlang.`, option)
})

bot.on('callback_query', (callbackQuery) => {
    const message = callbackQuery.message;
    const data = callbackQuery.data;
    
    let response;

    if(data === "radio1"){
        response = radioUrl1
    }
    if(data === "radio2"){
        response = radioUrl2
    }
    bot.sendMessage(message.chat.id, `Eshitish uchun bosing:  ${response}`)
})



// Welcome message in Uzbek when the bot starts
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name;
    bot.sendMessage(chatId, `Assalamu 'alaykum ${userName}!\n❓To'liq surani olish uchun sura raqamini (masalan, 1) yuboring yoki ma'lum bir oyatni olish uchun sura va oyat raqamini yuboring (masalan, 1:2).\n❓Quran Radio eshitish uchun esa [📖 Quran Radio] tugmasini bosing.\n ❗️Bot sekinroq ishlashi mumkin,\nsabirli bo'ling❗️`, keyboard);
});

// Function to fetch a full surah or a specific ayah in Arabic and Uzbek
async function fetchQuranData(surah, ayah = null) {
    try {
        if (ayah) {
            // Get the specific ayah in both Arabic and Uzbek
            const response = await axios.get(`https://api.alquran.cloud/v1/surah/${surah}/uz.sodik`);
            const arabicResponse = await axios.get(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/ar.alafasy`);
            const uzbekResponse = await axios.get(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/uz.sodik`);
            if (arabicResponse.data.status === 'OK' && uzbekResponse.data.status === 'OK' ) {
                const arabicText = arabicResponse.data.data.text;
                const uzbekText = uzbekResponse.data.data.text;
                return `✦${response.data.data.englishName}\n━━━━━━━━❀༻༺❀━━━━━━━━━━━━━━ا\n\n❁${arabicText}\n\n━━━━━━━━❀༻༺❀━━━━━━━━━━━━━ا\n\n❁ ${uzbekText}`;
            }
        } else {
            // Get the full surah in Uzbek translation only
            const response = await axios.get(`https://api.alquran.cloud/v1/surah/${surah}/uz.sodik`);
            if (response.data.status === 'OK') {
                let surahText = `📘 *Surah ${response.data.data.englishName} (${response.data.data.englishNameTranslation}) - ${response.data.data.numberOfAyahs} oyat*\n\n`;
                response.data.data.ayahs.forEach((ayah) => {
                    surahText += `${ayah.numberInSurah}. ${ayah.text}\n`;
                });

                // Write the surah to a .txt file
                const fileName = `surah_${response.data.data.englishName}.txt`;
                fs.writeFileSync(fileName, surahText);

                return fileName; // Return the filename to be sent
            }
        }
        return null; // If something goes wrong
    } catch (error) {
        console.error("Xatolik:", error.message || error);
        return null;
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

        // Fetch the requested data from the Quran API
        const quranData = await fetchQuranData(surahNumber, ayahNumber);

        if (quranData) {
            // If it's a file (for full surah), send the file
            if (fs.existsSync(quranData)) {
                bot.sendDocument(chatId, quranData).then(() => {
                    // Optionally delete the file after sending
                    fs.unlinkSync(quranData);
                }).catch(err => {
                    console.error("Faylni jo'natishda xatolik:", err);
                    bot.sendMessage(chatId, "Faylni jo'natishda xatolik yuz berdi.");
                });
            } else {
                // Send the specific ayah (Arabic and Uzbek)
                bot.sendMessage(chatId, quranData);
            }
        } else {
            bot.sendMessage(chatId, "Bunday sura yoki oyat mavjud emas!");
        }
    }
});





console.log('bot starting ...');
