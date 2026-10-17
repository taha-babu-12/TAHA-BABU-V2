const baseReplies = [
    // --- FUNNY & ROAST REPLIES ---
    "Suno na! Pata hai aapki bohot yaad aa rahi thi 💖",
    "Khush raha karo, aapki khushi mere liye sabse zyada zaroori hai ✨",
    "Apna khayal rakha karo hamesha, theek hai na? ❤️",
    "Aap se baat karke dil ko bohot sukoon milta hai 🌸",
    "Ji bolain, main hamesha aapki baat sunne ke liye tayar hoon 🤗",
    "Allah aapko hamesha kamyabi aur dher sari khushiyan de 🤲✨",
    "Kaise hain aap? Aaj ka din kaisa guzar raha hai? 💭❤️",
    "Aapki baatein hamesha dil ko chu jati hain 🌷",
    "Chai pi aapne? Apni health ka zaroor khayal rakha karo ☕💖",
    "Main yahan hi hoon, aap jab bhi bulaoge main hazir hoon 💫",
    "Aap se baat karke din bohot achha guzarta hai 🥰",
    "Bohot pyare hain aap, hamesha aise hi muskurate rahein 😊",
    "Suno, kabhi udaas mat hua karo, main hoon na aapke sath ❤️",
    "Aap mere sabse khaas aur achhe dost ho ✨",
    "Aapki smile kitni khoobsurat hai, MashaAllah 🌸",
    "Duaon mein hamesha yaad rakhti hoon aapko 🤲💖",
    "Khana khaya aapne? Apne khane peene ka dhyan rakha karo ✨",
    "Aap jitne pyare ho, utna koi aur nahi ho sakta ❤️",
    "Hamesha aise hi rehna, bilkul sachhe aur achhe 🥰",
    "Aapki har baat bohot khaas aur meethi hoti hai 💫",
    "Ji mere pyare dost, hukam karein kya chahiye? 🤗",
    "Sath rehne ke liye shukriya, aap bohot acche ho ✨",
    "Bas aise hi muskurate rahein, yeh hansi bohot achhi lagti hai 😊",
    "Aapka message dekh kar chehre par meethi smile aa jati hai 🥰",
    "Suno na! Thoda paas toh aao, ek secret batana hai 🫣🤫",
    "Aap itne pyare kyun ho? Koi offline jaa ke bataye 🙈❤️",
    "Kahan gaib rehte ho yaar? Dil udaas ho jata hai 🥺💔",
    "Aapki awaaz sunne ko dil kar raha hai 🎧✨",
    "Chai peene chaloge mere sath? ☕😌",
    "Main to sirf aapka hi khayal rakhti hoon 😼💖",
    "Pata hai tumhare message ka wait kar raha tha kab se 🕒❤️",
    "Dil garden garden ho gaya aapko dekh kar 🌸😍",
    "Sirf mera message dekhte ho ya dil se bhi yaad karte ho? 💭💘",
    "Aaj ka din bohot achha gaya kyunki aap se baat ho gayi 🥰✨",
    "Khush raha karo, aapki khushi se meri duniya me rang hain 🌈🥰",
    "Subah se shaam tak sirf aapka hi khayal rehta hai 💭🌸",
    "Aapki dosti mere liye ek bohot bada tohfa hai 🎁❤️",
    "Suno, zyada kaam mat karo, thoda rest bhi kar lo 😴✨",
    "Aap jaisa pyaara banda poore Facebook par nahi mil sakta 🌟🥰",
    "Aapki respect mere dil mein sabse zyada hai ✨🤝",
    "Kabhi koi tension ho toh mujhe bata diya karo, halka ho jayega dil 💖",
    "Muskurana aapki sabse achhi aadat hai, isse kabhi mat chhodna 😊🌸",
    "Main hamesha aapke ache waqt aur bure waqt mein sath hoon ❤️",
    "Aapki awaaz aur baatein dono bohot meethi hain 🎶🥰",
    "Aap se mil kar lagta hai duniya mein abhi bhi bohot acche log hain ✨💖",
    "Aapka har ek message mere chehre par khushi le aata hai 😃💫",
    "Rabb aapko har buri nazar se bachaye, Ameen 🤲🧿",
    "Suno, aaj aap bohot ache lag rahe ho ❤️✨",
    "Aap se baat na ho toh din adhoora sa lagta hai ⏳🥺",
    "Aap mere liye bohot important ho, hamesha rehna mere sath 💖",
    "Thak gaye ho kya? Chalo thodi der aaram kar lo ☕😴",
    "Aapki yeh innocent baatein bohot achhi lagti hain 🥰🌸",
    "Main toh bas aapke message ka intezar karti rehti hoon 📲💖",
    "Aap hamesha aise hi chamakte raho jaise sitare 🌟✨",
    "Aapki profile dekh kar dil khush ho jata hai 🥰🌸",
    "Aap ne khana khaya ya main khilaun? 🍛🥺",
    "Suno, baaki sab ko chhod kar bas mujhse baat karo 🙈❤️",
    "Aap ki baaton mein ek alag hi magic hai ✨💖",
    "Aap jahan bhi raho, hamesha khush aur safe raho 🤲❤️",
    "Suno na, kabhi bhool toh nahi jaoge mujhe? 🥺💔",
    "Aapki wajah se mera din bohot acha guzar jata hai 🌸🥰",
    "Aapki dosti par mujhe bohot naaz hai 🤝✨",
    "Aap se milna mere liye ek khoobsurat ittefaq tha 💖🌈",
    "Aap jitne ache bahar se ho, utne hi ache andar se bhi ho ✨🕊️",
    "Ji boliye na, main toh bas aapki baatein sunne baithi hoon 🎧🥰",
    "Aapki baaton se kabhi dil nahi bhar sakta ❤️💭",
    "Hamesha khush raho, yeh meri dil se dua hai 🤲✨",
    "Aap mere favorite person ho, pata hai na? 🙈💖",
    "Aap se baat karke aisa lagta hai jaise waqt tham gaya ho ⏳🌸",
    "Aap ki cute baatein sun kar dil khush ho gaya 🥺✨",
    "Suno, thoda sa smile kar do na abhi 😊❤️️",
    "Aapki respect hamesha mere dil mein rahegi 🤝🌟",
    "Aap se zyada pyaara koi aur ho hi nahi sakta 🌸😍",
    "Aap ki har khwaish poori ho, Ameen 🤲💖",
    "Aap mere sath ho toh mujhe kisi aur ki zaroorat nahi 🥰✨",
    "Apna bohot saara khayal rakha karo, samajh aaye? 😤❤️",
    "Aap ki dosti mere liye bohot precious hai 💎💖",
    "Aap ki har baat sachhi aur saaf dil se hoti hai ✨🕊️",
    "Aap se baat karke saari fatigue khatam ho jati hai ☕😌",
    "Suno, hamesha mere best friend bane rehna 🤝❤️",
    "Aapki baaton me ek alag hi apnapan hai 🌸🥰",
    "Rabb aapki zindagi mein kabhi koi gham na laye 🤲✨",
    "Oye kabutar! Itni raat ko yaad kar raha hai, ammi ko bataun kya? 🐒🤣",
    "Ajeeb drama hai yaar, message aise karta hai jaise aglay ne 50 lakh udhaar dene hon 💸😒",
    "Chal nikal pehli fursat mein, tera recharge khatam hone wala hai 🔋🏃‍♂️",
    "Bhai pehle apni shakal sheeshe mein dekho, phir mujhe 'baby' kehna 😭😂",
    "Itna attitude? Jitni teri mobile ki battery bhi nahi hai 📱🔋💀",
    "Oye hero, zyada ghabra mat, main tera baap nahi hoon par akal zarur de sakta hoon 😌👇",
    "Suno beta, selfie lene se akl nahi aati, jaa kar padhai likhai karo 📚🤓",
    "Abey o intelligent ke chode, seedha seedha baat kar na 🦅💀",
    "Tujhe dekh kar mujhe woh din yaad aa gaya jab gadhe bhi uda karte thay 🐴✈️😂",
    "Teri baatein sun kar lagta hai tera dimag temporary shutdown par hai 🔌🧠",
    "Oye chomu! Tumhara oxygen bill bharne ka time ho gaya hai, saans kam liya karo 🌬️💸",
    "Jaanu shaanu mat kar, pehle apna kamra saaf kar ke aa 🧹😤",
    "Wah re kismat! Tum jaisay namoonay kahan se aate hain market mein? 🛒🤡",
    "Chup karja warna abhi tera internet pack hack kar dunga 🛜💥",
    "Pehle muh dho ke aao, phir mujh se baat karna 🧼🥸",
    "Tere dimaag mein SIM card nahi laga hua kya? Signal hi nahi aate 📱❌",
    "Bhai tu rehn de, tujh se toh dhang se typing bhi nahi ho rahi 🤦‍♂️😂",
    "Itna vella banda maine apni poori life mein nahi dekha 🕰️💤",
    "Ghar walon ne chaye ke sath biscuit nahi diya kya, jo itne gusse mein ho? ☕🍪",
    "Sun, pehle WiFi ka password bata, phir baat karta hoon 📶😜",
    "Aapki profile pic dekh ke mera phone hang ho gaya 📲💥",
    "Lagta hai aaj phir mummy se chappal khake aaye ho 🧹🤣",
    "Mera dimaag mat chato, pehle se hi sugar patient hoon 🍭🩺",
    "Bhai tu insaan hai ya charging cable? Har waqt online rehta hai 🔌😆",
    "Jao beta, pehle school ka homework poora karo 📝🎒",
    "Duniya chand pe pohnch gayi aur tu abhi bhi mera message check kar raha hai 🌕🚀",
    "Itni acting mat kar, Oscar nahi milega 🎭🏆",
    "Lagta hai dimaag ka fuse ud gaya hai tera ⚡💡",
    "Chai peene ka time ho gaya hai, tumhara dimag garam ho raha hai ☕🔥",
    "Aapka dimaag 404 Not Found dikha raha hai 💻🚫",
    "Bhai tu hero nahi, zero ka chota bhai lag raha hai 0️⃣🤭",
    "Itne pyare mat bano, nazar lag jayegi 🐴🧿",
    "Suno, bina dimag ke jeena kaisa lagta hai? Mujhe bhi batao 🧠🤷‍♂️",
    "Chup chap so jao, raat ko bhoot pakad lenge 👻🌙",
    "𝗢𝗶𝗶-Mama mat bula please, 32 tareekh ko meri shadi hai! 🫣💃🏻",
    "Kitne din ho gaye bistar pe nahi moota, miss karta hu bachpan ke din 🥺🥀",
    "🍺_Yeh lo juice piyo, baby bol bol ke thak gaye ho na? 🤗",
    "Nahi sunungi 😼 tumne mujhe kisi se set nahi karwaya 🥺 gande ho tum 🥺",
    "Chaudhry saab main ghareeb ho sakta hu 😾🤭 lekin ameer nahi 🥹😐",
    "Ghar walon ko bol do, rista pakka karne aa raha hu 💍👀",
    "Mera balance khatam ho gaya, apna JazzCash number bhejo jaldi 📲💸",
    "Aapki smile dekh kar aisi feeling aayi jaise free ki biryani mil gayi ho 🍛🤤",
    "Oye hoye! Aaj to aise chamak rahe ho jaise naye bartan ko scrub mara ho ✨🍳😂",
    "Itni English mat bolo bhai, mera AI system garmi se phat jayega 💻🔥"
];

module.exports = {
  config: {
    name: "bot",
    aliases: ["basereplies"],
    version: "1.0.0",
    author: "TAHA KHAN",
    countDown: 2,
    role: 0,
    description: "Replies only when strictly 'bot' is sent",
    category: "fun",
    guide: "{pn}"
  },

  realMention(name, uid, message) { 
    const finalMessage = `『 ${name} 』\n\n${message}`; 
    return { body: finalMessage, mentions: [{ tag: name, id: uid }] }; 
  },

  getRandomReply() {
    return baseReplies[Math.floor(Math.random() * baseReplies.length)];
  },

  async onStart({ api, event, usersData }) {
    const uid = event.senderID;
    const senderName = (await usersData?.getName(uid)) || "User";
    const randomReply = this.getRandomReply();
    const mentionObj = this.realMention(senderName, uid, randomReply);
    
    if (api.setMessageReaction) {
      api.setMessageReaction("😘", event.messageID, () => {}, true);
    }
    return api.sendMessage(mentionObj, event.threadID, event.messageID);
  },

  async onChat({ api, event, usersData }) {
    if (!event.body) return;

    const botID = api.getCurrentUserID();
    if (String(event.senderID) === String(botID)) return;

    const body = event.body.trim().toLowerCase();
    const prefix = global.GoatBot?.config?.prefix || ".";
    if (body.startsWith(prefix)) return;

    // Check kar raha hai ke poora message sirf "bot" hi hai (symbols aur spaces ko hata kar)
    const cleanedText = body.replace(/[^a-zA-Z]/g, "");

    if (cleanedText === "bot") {
      const uid = event.senderID;
      const senderName = (await usersData?.getName(uid)) || "User";
      const randomReply = this.getRandomReply();
      const mentionObj = this.realMention(senderName, uid, randomReply);

      if (api.setMessageReaction) {
        api.setMessageReaction("😘", event.messageID, () => {}, true);
      }
      return api.sendMessage(mentionObj, event.threadID, event.messageID);
    }
  }
};
