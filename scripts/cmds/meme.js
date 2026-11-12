const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "meme",
    version: "2.1.0",
    author: "TAHA KHAN",
    countDown: 2,
    role: 0,
    category: "image",
    description: { en: "Chaeyoung Pictures & Memes", ur: "Chaeyoung Pictures & Memes" },
    guide: { en: "{pn}", ur: "{pn}" }
  },

  link: [
    "https://i.imgur.com/2YpLtS7.jpeg", "https://i.imgur.com/2U6ZsLI.jpeg", "https://i.imgur.com/7JHCJXX.jpeg", "https://i.imgur.com/wiQsALL.jpeg", "https://i.imgur.com/VKVryDl.jpeg", "https://i.imgur.com/bXWt2Vo.jpeg", "https://i.imgur.com/HE4lB0J.jpeg", "https://i.imgur.com/UVwl7G0.jpeg", "https://i.imgur.com/71lly7P.jpeg", "https://i.imgur.com/lLo5zIa.jpeg", "https://i.imgur.com/Lrrr2al.jpeg", "https://i.imgur.com/whAl9JL.jpeg", "https://i.imgur.com/qydW9aP.jpeg", "https://i.imgur.com/nt2hH5R.jpeg", "https://i.imgur.com/V9iLIdl.jpeg", "https://i.imgur.com/9lNqYDF.jpeg", "https://i.imgur.com/0zwDU8K.jpeg", "https://i.imgur.com/1lR1afn.jpeg", "https://i.imgur.com/JujY4IN.jpeg", "https://i.imgur.com/zY5pWuJ.jpeg", "https://i.imgur.com/7yJRlW4.jpeg", "https://i.imgur.com/JVCupvz.jpeg", "https://i.imgur.com/SqZdP6u.jpeg", "https://i.imgur.com/H6D31XO.jpeg", "https://i.imgur.com/5jjn61J.jpeg", "https://i.imgur.com/8HCgJxW.jpeg", "https://i.imgur.com/ZyyCLIS.jpeg", "https://i.imgur.com/ZR4BCvi.jpeg", "https://i.imgur.com/ZhSeoiw.jpeg", "https://i.imgur.com/qaxUUXU.jpeg", "https://i.imgur.com/DbuYSgN.jpeg", "https://i.imgur.com/PfhHDi7.jpeg", "https://i.imgur.com/jZva1h2.jpeg", "https://i.imgur.com/0iclBu5.jpeg", "https://i.imgur.com/InRwtPh.jpeg", "https://i.imgur.com/WBbDIQV.jpeg", "https://i.imgur.com/37bfgmq.jpeg", "https://i.imgur.com/usLhexF.jpeg", "https://i.imgur.com/xRKENLc.jpeg", "https://i.imgur.com/leDbcJy.jpeg", "https://i.imgur.com/vbjs6D3.jpeg", "https://i.imgur.com/wTJRPLz.jpeg", "https://i.imgur.com/uIKEpkf.jpeg", "https://i.imgur.com/StgmMWh.jpeg", "https://i.imgur.com/iBLYxcI.jpeg", "https://i.imgur.com/ZmrhDAp.jpeg", "https://i.imgur.com/4BeUjFP.jpeg", "https://i.imgur.com/30xKCX7.jpeg", "https://i.imgur.com/kzRBOFD.jpeg", "https://i.imgur.com/KS6bP7v.jpeg", "https://i.imgur.com/Po2rVsT.jpeg", "https://i.imgur.com/6TDPFcF.jpeg", "https://i.imgur.com/p5zTIvK.jpeg", "https://i.imgur.com/GwxQ3LA.jpeg", "https://i.imgur.com/2C74tSt.jpeg", "https://i.imgur.com/k1I1I2N.jpeg", "https://i.imgur.com/9I141q7.jpeg", "https://i.imgur.com/dTWjsMG.jpeg", "https://i.imgur.com/ZLeYjUh.jpeg", "https://i.imgur.com/acFQf0P.jpeg", "https://i.imgur.com/I3HVUwo.jpeg", "https://i.imgur.com/xecwUPK.jpeg", "https://i.imgur.com/f3CupKY.jpeg", "https://i.imgur.com/g05BeJt.jpeg", "https://i.imgur.com/PHIgeGL.jpeg", "https://i.imgur.com/3uQo7ps.jpeg", "https://i.imgur.com/7VrPuD6.jpeg", "https://i.imgur.com/WPt0M6q.jpeg", "https://i.imgur.com/Y4P7JrS.jpeg", "https://i.imgur.com/rrXAwSi.jpeg", "https://i.imgur.com/MV7TnBr.jpeg", "https://i.imgur.com/7BzdX55.jpeg", "https://i.imgur.com/TpgOXEu.jpeg", "https://i.imgur.com/KWPHYCr.jpeg", "https://i.imgur.com/HoxWbaB.jpeg", "https://i.imgur.com/bQRpgaR.jpeg", "https://i.imgur.com/zAx2S5a.jpeg", "https://i.imgur.com/jQ6Q0Ib.jpeg", "https://i.imgur.com/Gu37pbd.jpeg", "https://i.imgur.com/Zj2F5fs.jpeg", "https://i.imgur.com/Ezwfvrg.jpeg", "https://i.imgur.com/qRhS7Iu.jpeg", "https://i.imgur.com/BHVBrC3.jpeg", "https://i.imgur.com/hpWNMPa.jpeg", "https://i.imgur.com/hA4Mv0J.jpeg", "https://i.imgur.com/fyYv0uv.jpeg", "https://i.imgur.com/abzca0q.jpeg", "https://i.imgur.com/9xAGPoj.jpeg", "https://i.imgur.com/BPzcsAC.jpeg", "https://i.imgur.com/bliznUS.jpeg", "https://i.imgur.com/DViPwAR.jpeg", "https://i.imgur.com/M48rF5x.jpeg", "https://i.imgur.com/LCb7Rk8.jpeg", "https://i.imgur.com/0SNyPz9.jpeg", "https://i.imgur.com/m5gezsf.jpeg", "https://i.imgur.com/pRwgUMv.jpeg", "https://i.imgur.com/eBhcrI5.jpeg", "https://i.imgur.com/q9UQ4c1.jpg", "https://i.imgur.com/bJOPOe7.jpg", "https://i.imgur.com/2gihJLT.jpg", "https://i.imgur.com/nuRbXNA.jpg", "https://i.imgur.com/QPjDQhC.jpg", "https://i.imgur.com/ANTFbY8.jpg", "https://i.imgur.com/zoQxUwC.jpg", "https://i.imgur.com/bXVBasN.jpg", "https://i.imgur.com/E3bMZMM.jpg", "https://i.imgur.com/pkchwDe.jpg", "https://i.imgur.com/PFV6etU.jpg", "https://i.imgur.com/DLElS0y.jpg", "https://i.imgur.com/6hufzML.jpg", "https://i.imgur.com/ikevA6M.jpg", "https://i.imgur.com/aGuU2tB.jpg", "https://i.imgur.com/tsUsL6B.jpg", "https://i.imgur.com/sAUL2X0.jpg", "https://i.imgur.com/fGSX9z3.jpg", "https://i.imgur.com/TeT8dXA.jpg", "https://i.imgur.com/kCnHvly.jpg", "https://i.imgur.com/wfB1cU7.jpg", "https://i.imgur.com/dmUAjtN.jpg", "https://i.imgur.com/RqaTxa4.jpg", "https://i.imgur.com/gXFNJGi.jpg", "https://i.imgur.com/DwDTSsS.jpg", "https://i.imgur.com/BSreuve.jpg", "https://i.imgur.com/B6TOC4a.jpg", "https://i.imgur.com/S83pmyW.jpg", "https://i.imgur.com/7FNPBkX.jpg", "https://i.imgur.com/SIdbUrD.jpg", "https://i.imgur.com/ErngTHc.jpg", "https://i.imgur.com/onfBoPC.jpg", "https://i.imgur.com/UVk3zcd.jpg", "https://i.imgur.com/3aOuDZ9.jpg", "https://i.imgur.com/OHfqttV.jpg", "https://i.imgur.com/aiNRtVF.jpg", "https://i.imgur.com/rgPnYTJ.jpg", "https://i.imgur.com/YOVZBYH.jpg", "https://i.imgur.com/aiFNcBf.jpg", "https://i.imgur.com/FbI0kGj.jpg", "https://i.imgur.com/QOMUwDy.jpg", "https://i.imgur.com/UP8wysc.jpg", "https://i.imgur.com/seb2NbZ.jpg", "https://i.imgur.com/YdcVmTe.jpg", "https://i.imgur.com/WjkPmwu.jpg", "https://i.imgur.com/z7ZeFky.jpg", "https://i.imgur.com/H8YGlIn.jpg", "https://i.imgur.com/gjCymKq.jpg", "https://i.imgur.com/4XiF5dQ.jpg", "https://i.imgur.com/Nd5nrJW.jpg", "https://i.imgur.com/C4f0pdf.jpg", "https://i.imgur.com/EO0YsOT.jpg", "https://i.imgur.com/dKEAsb9.jpg", "https://i.imgur.com/7zfnhkO.jpg", "https://i.imgur.com/LrOjwMX.jpg", "https://i.imgur.com/7wAImE3.jpg", "https://i.imgur.com/D8Kzo1X.jpg", "https://i.imgur.com/VTXRcYo.jpg", "https://i.imgur.com/BcjRdU8.jpg", "https://i.imgur.com/hNb9WCk.jpg", "https://i.imgur.com/8GM1pn9.jpg", "https://i.imgur.com/SHiXJ0G.jpg", "https://i.imgur.com/0qCoPhR.jpg", "https://i.imgur.com/IhRr8Gx.jpg", "https://i.imgur.com/eAqbfri.jpg", "https://i.imgur.com/Q6m1EEm.jpg", "https://i.imgur.com/SzzeFeV.jpg", "https://i.imgur.com/ZfnJQHj.jpg", "https://i.imgur.com/puwolKD.jpg", "https://i.imgur.com/FQklA6q.jpg", "https://i.imgur.com/SwLufsH.jpg", "https://i.imgur.com/SmOYXY5.jpg", "https://i.imgur.com/7w3hmYF.jpg", "https://i.imgur.com/TmfIRv5.jpg", "https://i.imgur.com/aBwvOal.jpg", "https://i.imgur.com/eGIF9B1.jpg", "https://i.imgur.com/hjmok8Q.jpg", "https://i.imgur.com/RrPuRfT.jpg", "https://i.imgur.com/UzkdFiS.jpg", "https://i.imgur.com/Mn9GMDf.jpg", "https://i.imgur.com/OPZ9857.jpg", "https://i.imgur.com/ZsHL2Y2.jpg", "https://i.imgur.com/MIG763l.jpg", "https://i.imgur.com/1Zr3rcS.jpg", "https://i.imgur.com/flMpukD.jpg", "https://i.imgur.com/u1YieFf.jpg", "https://i.imgur.com/nGG1Rq3.jpg", "https://i.imgur.com/tbXQXmA.jpg", "https://i.imgur.com/2s6oXka.jpg", "https://i.imgur.com/KrAQO5Z.jpg", "https://i.imgur.com/oCeGlm4.jpg", "https://i.imgur.com/m7dBh5G.jpg", "https://i.imgur.com/gvOK3Rk.jpg", "https://i.imgur.com/MwvLw2x.jpg", "https://i.imgur.com/WnuiI8E.jpg", "https://i.imgur.com/7mwcaYl.jpg", "https://i.imgur.com/PwSkA3b.jpg", "https://i.imgur.com/lGUiOWJ.jpg", "https://i.imgur.com/6tILjzR.jpg", "https://i.imgur.com/s2k6F7b.jpg", "https://i.imgur.com/U8snOes.jpg", "https://i.imgur.com/BEpH4tL.jpg", "https://i.imgur.com/LYW6vCV.jpg", "https://i.imgur.com/uL4vzUm.jpg", "https://i.imgur.com/nfaJSc8.jpg", "https://i.imgur.com/2VVnQdy.jpg", "https://i.imgur.com/PiEEsSU.jpg", "https://i.imgur.com/VaKdGyK.jpg", "https://i.imgur.com/DBBCMT5.jpg", "https://i.imgur.com/9SzyANt.jpg", "https://i.imgur.com/8wvo2rv.jpg", "https://i.imgur.com/CZ3u4pG.jpg", "https://i.imgur.com/rDXCZ7T.jpg", "https://i.imgur.com/k7hFQDI.jpg", "https://i.imgur.com/ZUbdLcH.jpg", "https://i.imgur.com/4B6q7qo.jpg", "https://i.imgur.com/uns90FG.jpg", "https://i.imgur.com/BUo8Gip.jpg", "https://i.imgur.com/OEjUJpt.jpg", "https://i.imgur.com/0EMIF5N.jpg", "https://i.imgur.com/pfClCuw.jpg", "https://i.imgur.com/B3xmc6u.jpg", "https://i.imgur.com/r3k76o1.jpg", "https://i.imgur.com/rF7elZ9.jpg", "https://i.imgur.com/sUCiNka.jpg", "https://i.imgur.com/H4txTF9.jpg", "https://i.imgur.com/XJYsBGt.jpg", "https://i.imgur.com/VhUKFn6.jpg", "https://i.imgur.com/4NMv9DQ.jpg", "https://i.imgur.com/BF7REhe.jpg", "https://i.imgur.com/vXJ177V.jpg", "https://i.imgur.com/rpLbigJ.jpg", "https://i.imgur.com/kTH9hI0.jpg", "https://i.imgur.com/qdFVoSy.jpg", "https://i.imgur.com/otrQpMc.jpg", "https://i.imgur.com/D3WqpgT.jpg", "https://i.imgur.com/MW0N2it.jpg", "https://i.imgur.com/GwbXEte.jpg", "https://i.imgur.com/9JR6W3w.jpg", "https://i.imgur.com/YgIPVwa.jpg", "https://i.imgur.com/czv7Fz5.jpg", "https://i.imgur.com/Zw9KZBd.jpg", "https://i.imgur.com/BDVgpWb.jpg", "https://i.imgur.com/0y9UHo3.jpg", "https://i.imgur.com/o13FtAd.jpg", "https://i.imgur.com/caEX9gQ.jpg", "https://i.imgur.com/5HUayMT.jpg", "https://i.imgur.com/mfA3aZm.jpg", "https://i.imgur.com/fvZlGx4.jpg", "https://i.imgur.com/9X7xHrc.jpg", "https://i.imgur.com/fhC0uQO.jpg", "https://i.imgur.com/k0kgL6g.jpg", "https://i.imgur.com/tKJbKC3.jpg", "https://i.imgur.com/XAG9XXY.jpg", "https://i.imgur.com/WOITKH9.jpg", "https://i.imgur.com/AlSxfCU.jpg", "https://i.imgur.com/dcldScy.jpg", "https://i.imgur.com/CGvFkMn.jpg", "https://i.imgur.com/pXC6YUo.jpg", "https://i.imgur.com/loz0CDt.jpg", "https://i.imgur.com/XWbFJ67.jpg", "https://i.imgur.com/bpzaZda.jpg", "https://i.imgur.com/QRoyoSB.jpg", "https://i.imgur.com/VwbnHjt.jpg", "https://i.imgur.com/4CCcn4w.jpg", "https://i.imgur.com/TWnfUPu.jpg", "https://i.imgur.com/jL9zgtp.jpg", "https://i.imgur.com/6Hh2eap.jpg", "https://i.imgur.com/EHD734u.jpg", "https://i.imgur.com/uC2YI3l.jpg", "https://i.imgur.com/zCP4AzS.jpg", "https://i.imgur.com/bovYCdz.jpg", "https://i.imgur.com/2lO8cZg.jpg", "https://i.imgur.com/ehEVYQK.jpg", "https://i.imgur.com/IzhVUTo.jpg", "https://i.imgur.com/nViB6oJ.jpg", "https://i.imgur.com/6YzpZyq.jpg", "https://i.imgur.com/9bwh3qa.jpg", "https://i.imgur.com/oTy9Ylw.jpg", "https://i.imgur.com/jHzuUKA.jpg", "https://i.imgur.com/8Y8NrSw.jpg", "https://i.imgur.com/OTH5p7Z.jpg", "https://i.imgur.com/Yyb0sdO.jpg", "https://i.imgur.com/hA7p8M3.jpg", "https://i.imgur.com/LbwoVjX.jpg", "https://i.imgur.com/z9X2gPw.jpg", "https://i.imgur.com/XzyO1x6.jpg", "https://i.imgur.com/9VLIeHE.jpg", "https://i.imgur.com/bSAggk1.jpg", "https://i.imgur.com/PtiAaHm.jpg", "https://i.imgur.com/VvD1BO7.jpg", "https://i.imgur.com/99QmViE.jpg", "https://i.imgur.com/HAHOYFm.jpg", "https://i.imgur.com/Gw33heq.jpg", "https://i.imgur.com/Oc5v81n.jpg", "https://i.imgur.com/IQLPXsn.jpg", "https://i.imgur.com/b8KE45g.jpg", "https://i.imgur.com/3Adx4WN.jpg", "https://i.imgur.com/N0BCsl7.jpg", "https://i.imgur.com/VFRn575.jpg", "https://i.imgur.com/GJbWcCy.jpg", "https://i.imgur.com/YbWXwDd.jpg", "https://i.imgur.com/BIaJ0rP.jpg", "https://i.imgur.com/A1C9CNt.jpg", "https://i.imgur.com/Ar2Mtvy.jpg", "https://i.imgur.com/DGTIp1i.jpg", "https://i.imgur.com/1qOGiYV.jpg", "https://i.imgur.com/hr0EHTb.jpg", "https://i.imgur.com/vAsgQst.jpg", "https://i.imgur.com/jVgapSO.jpg", "https://i.imgur.com/LH9RZdn.jpg", "https://i.imgur.com/frkJZ1M.jpg", "https://i.imgur.com/fiyW8dO.jpg", "https://i.imgur.com/SaSgjuB.jpg", "https://i.imgur.com/KtneWEN.jpg", "https://i.imgur.com/rM8A3Zl.jpg", "https://i.imgur.com/jR6DcLT.jpg", "https://i.imgur.com/uWKiNLn.jpg", "https://i.imgur.com/NBRKOfg.jpg", "https://i.imgur.com/jKA05vC.jpg", "https://i.imgur.com/0X706YR.jpg", "https://i.imgur.com/EvOv3jE.jpg", "https://i.imgur.com/QNnnXIc.jpg", "https://i.imgur.com/t5uQRhT.jpg", "https://i.imgur.com/erB6gj3.jpg", "https://i.imgur.com/63iydJC.jpg", "https://i.imgur.com/RH1YinJ.jpg", "https://i.imgur.com/qt8TmLM.jpg", "https://i.imgur.com/P2wkD52.jpg", "https://i.imgur.com/b8vDMuU.jpg", "https://i.imgur.com/KZ9R9HY.jpg", "https://i.imgur.com/s84ogtX.jpg", "https://i.imgur.com/ebT27Ho.jpg", "https://i.imgur.com/hVqaTKa.jpg", "https://i.imgur.com/wrydrf6.jpg", "https://i.imgur.com/a5FmXef.jpg", "https://i.imgur.com/Put4cUm.jpg", "https://i.imgur.com/pLHUONd.jpg", "https://i.imgur.com/Yrenc2R.jpg", "https://i.imgur.com/MO2n9c8.jpg", "https://i.imgur.com/Sd8M4P1.jpg", "https://i.imgur.com/JceYbZ9.jpg", "https://i.imgur.com/OO2HHbe.jpg", "https://i.imgur.com/8XbncY7.jpg", "https://i.imgur.com/EapRG2l.jpg", "https://i.imgur.com/laWJCD1.jpg", "https://i.imgur.com/uiqy66z.jpg", "https://i.imgur.com/amHzUJO.jpg", "https://i.imgur.com/GBfY6QF.jpg", "https://i.imgur.com/rZ0xm2d.jpg", "https://i.imgur.com/S482v7g.jpg", "https://i.imgur.com/1ElFRik.jpg", "https://i.imgur.com/dtBMiNZ.jpg", "https://i.imgur.com/NIDfRlO.jpg", "https://i.imgur.com/5Ov0TeS.jpg", "https://i.imgur.com/euiRsRb.jpg", "https://i.imgur.com/ZlY19ug.jpg", "https://i.imgur.com/8V1Z1c8.jpg", "https://i.imgur.com/v3MUQ23.jpg", "https://i.imgur.com/4nFOS0w.jpg", "https://i.imgur.com/tC2Sy8a.jpg"
  ],

  async onStart({ api, event, message }) {
    const { threadID, messageID, senderID } = event;
    
    if (api.setMessageReaction) api.setMessageReaction("⏳", messageID, () => {}, true);

    const randomImg = this.link[Math.floor(Math.random() * this.link.length)];
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const filePath = path.join(cacheDir, `meme_${senderID}_${Date.now()}.jpg`);

    try {
      // 🔥 FIX 1: User-Agent aur Referer add kiya taake Imgur block na kare
      const res = await axios({ 
        url: randomImg, 
        method: "GET", 
        responseType: "stream", 
        timeout: 15000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://imgur.com/"
        }
      });
      
      const writer = fs.createWriteStream(filePath);
      res.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      // Check karo file download hui ya nahi
      if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 1000) {
        throw new Error("File download nahi hui (Imgur ne block kiya).");
      }

      if (api.setMessageReaction) api.setMessageReaction("✅", messageID, () => {}, true);

      await message.reply({
        body: 
          `╭─────────────────────╮\n` +
          `     📸 𝐂𝐡𝐚𝐞𝐲𝐨𝐮𝐧𝐠 𝐌𝐞𝐦𝐞 📸\n` +
          `╰─────────────────────╯\n\n` +
          `✨ Lijiye aapki image hazir hai!\n` +
          `💖 Total Photos: ${this.link.length}\n\n` +
          `┏━━━━━━━━━━━━━━━━━━━━━┓\n` +
          `    ⚡ 𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍 ⚡\n` +
          `┗━━━━━━━━━━━━━━━━━━━━━┛`,
        attachment: fs.createReadStream(filePath)
      });

      setTimeout(() => fs.unlink(filePath).catch(() => {}), 5000);

    } catch (err) {
      console.error("[Meme Error]", err.message);
      if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
      await fs.unlink(filePath).catch(() => {});
      
      // 🔥 FIX 2: Exact error chat mein bhejo taake pata chale kya masla hai
      return message.reply(`❌ Bhai, image download nahi ho payi.\nWajah: ${err.message}\n\n(Imgur links block kar raha hai, thodi der baad try karo)`);
    }
  }
};