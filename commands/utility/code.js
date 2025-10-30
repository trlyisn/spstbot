const UserProfile = require("../../schemas/UserProfile");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
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
      await interaction.deferReply({ ephemeral: true });

      const roleId = process.env.VERIFIED_ROLE_ID;
      if (!roleId) {
        await interaction.editReply({
          content: "Server není nastavený: chybí VERIFIED_ROLE_ID v .env.",
          ephemeral: true,
        });
        return;
      }

      let member = interaction.member;
      if (!member || !member.roles) {
        member = await interaction.guild.members
          .fetch(interaction.user.id)
          .catch(() => null);
      }
      if (!member) {
        await interaction.editReply({
          content: "Nepodařilo se načíst uživatele na serveru.",
          ephemeral: true,
        });
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
        await interaction.editReply({
          content:
            "Nemáte uložený verifikační kód. Pošlete si znovu kód a opakujte příkaz.",
          ephemeral: true,
        });
        return;
      }

      if (String(userCode) === String(inputCode)) {
        userProfile.verified = true;
        await userProfile.save();

        await member.roles
          .add(roleId)
          .catch((err) => console.error("Failed to add role:", err));

        await interaction.editReply({
          content: "Zadali jste správný kód. Role byla přidána.",
          ephemeral: true,
        });

        const modLogEmbed = new EmbedBuilder()
          .setTitle("User Verified")
          .setColor(0x00ff00)
          .addFields(
            { name: "Username", value: `${member}` },
            { name: "User ID", value: `${interaction.user.id}` },
            { name: "Email", value: `${userProfile.email}` }
          )
          .setTimestamp();

        // Send to mod log channel
        const modLogChannelId = process.env.MODLOG_CHANNEL_ID;
        if (modLogChannelId) {
          const modLogChannel = await interaction.guild.channels.fetch(
            modLogChannelId
          );
          if (modLogChannel) {
            await modLogChannel.send({ embeds: [modLogEmbed] });
          }
        }
      } else {
        await interaction.editReply({
          content: "Zadali jste špatný kód.",
          ephemeral: true,
        });
      }
    } catch (error) {
      console.error(`Error handling /code: ${error}`);
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: "Došlo k chybě při ověřování. Kontaktujte administrátora.",
            ephemeral: true,
          });
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
