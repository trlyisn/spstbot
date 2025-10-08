const UserProfile = require("../../schemas/UserProfile");
const { SlashCommandBuilder } = require("discord.js");

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
      await userProfile.save();

      let verificationCodeGEN = Math.floor(Math.random() * 900000) + 100000;
      userProfile.verificationCode = verificationCodeGEN;
      return interaction.editReply(`${email}\n${verificationCodeGEN}`);
    } catch (error) {
      console.log(`Error handling /verify: ${error}`);
    }
  },
};
