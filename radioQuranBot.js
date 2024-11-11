const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const adminID = 5302582529

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
    const text = msg.text && typeof msg.text === 'string' ? msg.text.trim() : '';

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


//-----------------------------------------------------------------ADMIN--------------------------------------------------------------------------------

const usersFile = './users.json';

// Load or create the users list
let users = [];
if (fs.existsSync(usersFile)) {
    users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
}

// Save users list to file
function saveUsers() {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// Track admin's step in sending process
let sendStep = null;

// Listen for any message to add the user ID to the list
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    if (!users.includes(chatId)) {
        users.push(chatId);
        saveUsers();
    }

    // Process messages based on the current step
    if (sendStep === 'text' && chatId === adminID) {
        users.forEach(userId => bot.sendMessage(userId, msg.text).catch(console.error));
        bot.sendMessage(chatId, 'Text foydalanuvchilarga yuborildi.');
        sendStep = null;
    } else if (sendStep === 'photo' && msg.photo && chatId === adminID) {
        users.forEach(userId => bot.sendPhoto(userId, msg.photo[msg.photo.length - 1].file_id).catch(console.error));
        bot.sendMessage(chatId, 'Photo foydalanuvchilarga yuborildi.');
        sendStep = null;
    } else if (sendStep === 'video' && msg.video && chatId === adminID) {
        users.forEach(userId => bot.sendVideo(userId, msg.video.file_id).catch(console.error));
        bot.sendMessage(chatId, 'Video foydalanuvchilarga yuborildi.');
        sendStep = null;
    }
});

// Start send sequence with /send command
bot.onText(/\/send/, (msg) => {
    const chatId = msg.chat.id;

    if (chatId === adminID) {
        bot.sendMessage(chatId, 'Message formatini tanlang:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Text', callback_data: 'text' }],
                    [{ text: 'Picture', callback_data: 'photo' }],
                    [{ text: 'Video', callback_data: 'video' }]
                ]
            }
        });
    } else {
        bot.sendMessage(chatId, `Bu buyruqni ishlatish uchun bot admini bo'lishingiz kerak`);
    }
});

// Handle the choice and set the step
bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;

    if (chatId === adminID) {
        sendStep = callbackQuery.data;
        bot.sendMessage(chatId, `OK, send the ${sendStep}.`);
        bot.answerCallbackQuery(callbackQuery.id);
    }
});


//    get all users 
const usersFile2 = './usersData.json';

// Load or create the users list
let users2 = [];
if (fs.existsSync(usersFile2)) {
    users2 = JSON.parse(fs.readFileSync(usersFile2, 'utf8'));
}

// Save users list to file
function saveUsers() {
    fs.writeFileSync(usersFile2, JSON.stringify(users2, null, 2));
}

// Listen for any message to add the user ID, username, and name to the list
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userInfo = {
        id: chatId,
        username: msg.from.username || "No username",
        name: `${msg.from.first_name || ""} ${msg.from.last_name || ""}`.trim()
    };

    if (!users2.some(user => user.id === chatId)) {
        users2.push(userInfo);
        saveUsers();
    }
});

// Command to generate and send user list as a .txt file
bot.onText(/\/users/, (msg) => {
    const chatId = msg.chat.id;

    if (chatId === adminID) {
        // Create the .txt file content with user count
        let userList = `Total Users: ${users2.length}\n\nUser List:\n\n`;
        users2.forEach(user => {
            userList += `Name: ${user.name}\nUsername: ${user.username}\nUser ID: ${user.id}\n\n`;
        });

        // Define file path
        const filePath = path.join(__dirname, 'user_list.txt');
        
        // Write to the file
        fs.writeFileSync(filePath, userList);

        // Send the file to the admin
        bot.sendDocument(adminID, filePath, {}, { contentType: 'text/plain' }).catch(error => console.error(error));
    } else {
        bot.sendMessage(chatId, 'You are not authorized to use this command.');
    }
});
console.log('Assalamu alaykum...');


