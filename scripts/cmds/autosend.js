let lastSentHour = -1;
let isProcessing = false;

module.exports = {
  config: {
    name: "autosent",
    aliases: ["autopoetry"],
    version: "10.06",
    author: "TAHA KHAN",
    countDown: 0,
    role: 0,
    description: {
      en: "Fully automatic 24/7 hourly poetry background process",
      ur: "Bina kisi command ke khud-ba-khud 24 ghante background mein chalne wala script"
    },
    category: "system",
    guide: {
      en: "{pn}",
      ur: "{pn}"
    }
  },

  onLoad({ api }) {
    const poetryList = [
      { timeDisplay: "12:00 AM", text: "کیا میں نے کبھی سوچا تھا کہ خوابوں کا پیچھا کرتے ہوئے میں خود کو کھو دوں گا؟\nمگر یہ کیا، جب میں نے خود کو پایا تو سارے خواب کہیں کھو گئے۔" },
      { timeDisplay: "01:00 AM", text: "دلوں میں تنہائی ہے،\nپھر بھی امیدیں ہمیشہ دل کو زندہ رکھتی ہیں۔\nجو سیدھی راہ پر چلے گا وہ ضرور کچھ روشنی پائے گا۔" },
      { timeDisplay: "02:00 AM", text: "جب ہم گرتے ہیں تو دنیا کی نظروں میں ہماری قدر بڑھ جاتی ہے،\nکیونکہ یہ ہمیں دوبارہ کھڑے ہونے کی طاقت دیتا ہے۔" },
      { timeDisplay: "03:00 AM", text: "ہم جو چاہتے ہیں وہ آسانی سے نہیں ملتا\nلیکن جب ہم محنت اور صبر حاصل کرتے ہیں تو یہ سب سے قیمتی ہوتا ہے۔" },
      { timeDisplay: "04:00 AM", text: "تنہائی میں خود کو کبھی تنہا مت سمجھو\nکیونکہ دنیا کا سب سے بڑا دوست آپ کا خود اعتمادی ہے۔" },
      { timeDisplay: "05:00 AM", text: "ہر شخص کے دل میں ایک کہانی ہے جسے کبھی کوئی نہیں جانتا،\nکیونکہ وہ کہانی صرف اس شخص کے دل میں رہتی ہے۔" },
      { timeDisplay: "06:00 AM", text: "ہر موڑ پر نیا رستہ ڈھونڈتا ہوں\nکیونکہ میں ان راستوں پر نہیں چلتا جو پہلے سے طے شدہ ہوں۔" },
      { timeDisplay: "07:00 AM", text: "خوش رہنا اور مسکرانا سب سے بڑی طاقت ہے\nکیونکہ یہ درد کو کم کرتا ہے اور زندگی کو آسان بناتا ہے۔ 🕊️" },
      { timeDisplay: "08:00 AM", text: "زندگی میں مشکلیں آتی ہیں، لیکن اگر ہم ان کے ساتھ ہنستے ہوئے چلیں تو وہ ہمیں کبھی ہارنے نہیں دیتے۔" },
      { timeDisplay: "09:00 AM", text: "اچھے برے وقت کا ملنا کسی کے بس میں نہیں ہوتا\nلیکن جو اسے قبول کرتا ہے وہی حقیقی فاتح ہے۔" },
      { timeDisplay: "10:00 AM", text: "زندگی کی سب سے اچھی بات یہ ہے کہ وقت جو بھی گزر جائے\nوہ کبھی واپس نہیں آتا، اس لیے جتنا ہو سکے جیو۔" },
      { timeDisplay: "11:00 AM", text: "لوگ اکثر مجھے خوش رہنے کو کہتے ہیں،\nلیکن ان کی سمجھ میں نہیں آتا کہ مسکراہٹ کے پیچھے کتنی کہانیاں چھپی ہیں۔" },
      { timeDisplay: "12:00 PM", text: "ہمیں چھوڑنے والے، ہم ان کے بغیر بھی جی سکتے ہیں\nلیکن جو دل سے جڑے رہتے ہیں وہ کبھی نہیں جاتے۔" },
      { timeDisplay: "01:00 PM", text: "کبھی کبھی ہماری خاموشی ہماری سب سے بڑی آواز بن جاتی ہے\nکیونکہ اس آواز میں سچائی اور درد ہے۔" },
      { timeDisplay: "02:00 PM", text: "زندگی کی راہیں آسان نہیں، ہر کسی کا دل کبھی نہ کبھی ٹوٹتا ہے\nلیکن جو دل ٹوٹا اور جڑا ہو وہ سب سے مضبوط ہوتا ہے۔" },
      { timeDisplay: "03:00 PM", text: "امید کے بارے میں کیا، یہ ہر روز ٹوٹتا ہے اور پھر سے بڑھتا ہے۔\nبس اسے پکڑو یہاں تک کہ جب وہ گرے، کیونکہ یہ تمہاری طاقت ہے۔" },
      { timeDisplay: "04:00 PM", text: "انسان اپنے حالات کا پابند نہیں ہوتا، آپ کا عزم آپ کی نیت سے بڑا ہے۔\nجو کبھی ہار نہیں مانتا وہی سب سے زیادہ جیتتا ہے۔" },
      { timeDisplay: "05:00 PM", text: "جو اپنے خواب پورے دل سے جیتا ہے وہ اپنی زندگی میں کبھی ہار نہیں سکتا۔\nشکست صرف وہی لوگ قبول کرتے ہیں جو اپنی امیدیں چھوڑ دیتے ہیں۔" },
      { timeDisplay: "06:00 PM", text: "زندگی بہت مختصر ہے،\nلیکن بعض اوقات ہم اپنے خوابوں کو پورا کرنے میں اتنی دیر لگا دیتے ہیں کہ ہم جینے کا صحیح طریقہ بھول جاتے ہیں۔" },
      { timeDisplay: "07:00 PM", text: "ہمیشہ یاد رکھنا، دکھ اور خوشی دونوں وقت کی طرح ہیں۔\nجب ایک آتا ہے تو دوسرا بھی جلد آتا ہے، اس لیے کبھی تنہا محسوس نہ کریں۔" },
      { timeDisplay: "08:00 PM", text: "جو گزر گیا اسے بھول جاؤ، ابھی کیا ہے اس پر توجہ دیں۔\nآج آپ کی محنت، آپ کے کل کا چہرہ بنائے گی۔" },
      { timeDisplay: "09:00 PM", text: "انسان خود کو اسی دن سمجھتا ہے جس دن وہ دوسروں کے بارے میں سوچنا چھوڑ دیتا ہے۔\nکیونکہ دوسروں کے بارے میں سوچتے ہوئے ہم اپنے آپ کو کھو دیتے ہیں۔ 🕊️" },
      { timeDisplay: "10:00 PM", text: "زندگی کی سب سے بڑی سزا کسی کو دل سے پیار کرنے کے بعد اسے کھونا پڑتا ہے۔\nلیکن یہ وہ وقت ہوتا ہے جب انسان سب سے مضبوط ہوتا ہے۔" },
      { timeDisplay: "11:00 PM", text: "زندگی میں ہمیشہ خوش رہنے کی کوشش کرو\nکیونکہ جب آپ خوش ہوتے ہیں تو دنیا آپ کے ساتھ ہوتی ہے\nاور جب آپ اداس ہوتے ہیں تو دنیا بھی چلی جاتی ہے۔" }
    ];

    setInterval(async () => {
      try {
        if (!api || typeof api.getThreadList !== "function") return;

        // PKT Time Zone handling
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Karachi",
          hour: "numeric",
          minute: "numeric",
          hour12: false
        });

        const parts = formatter.formatToParts(new Date());
        let currentHour = 0;
        let currentMinute = 0;

        for (const part of parts) {
          if (part.type === "hour") currentHour = parseInt(part.value, 10) % 24;
          if (part.type === "minute") currentMinute = parseInt(part.value, 10);
        }

        // Exact minute 00 condition & Lock logic
        if (currentMinute === 0 && lastSentHour !== currentHour && !isProcessing) {
          isProcessing = true;
          lastSentHour = currentHour; // Lock updated immediately before async calls

          const matched = poetryList[currentHour];

          const formattedMessage = 
`╭━━━•✨ 𝑺𝑼𝑵𝑬𝑯𝑹𝑰 𝑨𝑳𝑭𝑨𝑨𝒁 ✨•━━━╮

⏳ 𝐀𝐛𝐡𝐢 𝐓𝐢𝐦𝐞 𝐇𝐚𝐢: ${matched.timeDisplay}

${matched.text}

👑 𝐎𝐖𝐍𝐄𝐑 »» 𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍 ««
╰━━━━━━━━━━━━━━━━━━━━━━━╯`;

          api.getThreadList(100, null, ["INBOX"], (err, list) => {
            isProcessing = false; // Processing complete
            if (err || !list) return;

            const groupThreads = list.filter(t => t.isGroup && t.isSubscribed);

            for (const thread of groupThreads) {
              api.sendMessage(formattedMessage, thread.threadID, (e) => {
                if (e) console.error(`[Autosent Fail] Thread: ${thread.threadID}`);
              });
            }
          });
        }
      } catch (e) {
        isProcessing = false;
        console.error("[Autosent Error]:", e.message);
      }
    }, 15000); // 15 seconds interval avoids double triggers
  },

  async onStart({ api, event }) {
    return api.sendMessage("🤖 Autosent system 100% automatic hai. Isay alag se chalu karne ki zaroorat nahi, ye background mein chal رہا hai.", event.threadID, event.messageID);
  }
};
