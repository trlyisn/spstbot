const UserProfile = require("../../schemas/UserProfile");
const { SlashCommandBuilder } = require("discord.js");
const nodemailer = require("nodemailer");
require("dotenv").config();

const mail = process.env.MAIL_NAME;
const pass = process.env.MAIL_PASS;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: mail,
    pass: pass,
  },
});

function sendVerificationEmail(to, verificationCode) {
  const mailOptions = {
    from: "studenti@spst.eu",
    to: to,
    subject: "Ověření emailu",
    text: `Váš ověřovací kód je: ${verificationCode}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log("Email sent: " + info.response);
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Ověření emailu")
    .addStringOption((option) =>
      option
        .setName("email")
        .setDescription("První část emailu")
        .setRequired(true)
    ),
  async execute(interaction) {
    const firstpart = interaction.options.getString("email");
    const endpart = "@spst.eu";
    const email = firstpart + endpart;
    try {
      await interaction.deferReply();
      let userProfile = await UserProfile.findOne({
        userId: interaction.user.id,
      });

      if (!userProfile) {
        userProfile = new UserProfile({
          userId: interaction.user.id,
        });
      }

      userProfile.email = email;
      let verificationCodeGEN = Math.floor(Math.random() * 900000) + 100000;
      userProfile.verificationCode = verificationCodeGEN;
      await userProfile.save();
      sendVerificationEmail(email, verificationCodeGEN);
      return interaction.editReply(
        `Zaslali jsme vám kód na email **${email}**`
      );
    } catch (error) {
      console.log(`Error handling /verify: ${error}`);
    }
  },
};
