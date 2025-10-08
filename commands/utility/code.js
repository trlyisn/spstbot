const UserProfile = require("../../schemas/UserProfile");
const { SlashCommandBuilder } = require("discord.js");
require("dotenv").config();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("code")
    .setDescription("Zadání kódu z emailu")
    .addNumberOption((option) =>
      option.setName("code").setDescription("Verifikační kód").setRequired(true)
    ),
  async execute(interaction) {
    const inputCode = interaction.options.getNumber("code");
    try {
      await interaction.deferReply();

      const roleId = process.env.VERIFIED_ROLE_ID;
      if (!roleId) {
        await interaction.editReply(
          "Server není nastavený: chybí VERIFIED_ROLE_ID v .env."
        );
        return;
      }

      // Prefer interaction.member; fetch if not available in cache
      let member = interaction.member;
      if (!member || !member.roles) {
        member = await interaction.guild.members
          .fetch(interaction.user.id)
          .catch(() => null);
      }
      if (!member) {
        await interaction.editReply(
          "Nepodařilo se načíst uživatele na serveru."
        );
        return;
      }

      let userProfile = await UserProfile.findOne({
        userId: interaction.user.id,
      });
      if (!userProfile) {
        userProfile = new UserProfile({ userId: interaction.user.id });
      }

      const userCode = userProfile.verificationCode;
      if (!userCode) {
        await interaction.editReply(
          "Nemáte uložený verifikační kód. Pošlete si znovu kód a opakujte příkaz."
        );
        return;
      }

      if (String(userCode) === String(inputCode)) {
        userProfile.verified = true;
        await userProfile.save();

        await member.roles
          .add(roleId)
          .catch((err) => console.error("Failed to add role:", err));

        await interaction.editReply(
          "Zadali jste správný kód. Role byla přidána."
        );
      } else {
        await interaction.editReply("Zadali jste špatný kód.");
      }
    } catch (error) {
      console.error(`Error handling /code: ${error}`);
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(
            "Došlo k chybě při ověřování. Kontaktujte administrátora."
          );
        } else {
          await interaction.reply({
            content: "Došlo k chybě při ověřování. Kontaktujte administrátora.",
            ephemeral: true,
          });
        }
      } catch (e) {
        console.error("Also failed to send error reply:", e);
      }
    }
  },
};
