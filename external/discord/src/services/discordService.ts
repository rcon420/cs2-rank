import * as Discord from 'discord.js';
import { Inject, Singleton } from 'typescript-ioc';
import { EmptyString, IColor } from '../utils/const';
import _ from 'lodash';
import LoggerService from './loggerService';
import DiscordProvider from '../providers/discordProvider';
import moment from 'moment';
import MysqlService from './mysqlService';
import { ITopPlayer } from '../interface/ITop';

const embededGhostField: any = {
    name: EmptyString,
    value: EmptyString,
    inline: true
}

@Singleton
export default class DiscordService {
    @Inject
    private _discordProvider!: DiscordProvider;

    @Inject
    private _loggerService: LoggerService;

    @Inject
    private _mysqlService: MysqlService;

    private _client: Discord.Client = null;

    // TODO: user action cache to prevent flood

    constructor() {

    }

    public async run(): Promise<void> {
        this._client = this._discordProvider.client;
        this._subscribe();

        this._loggerService.info("[Discord Service] Running ");
    }

    private _subscribe(): void {
        this._client.on('interactionCreate', async (interaction: Discord.Interaction<Discord.CacheType>) => {
            try {
                if (interaction.isChatInputCommand()) {
                    switch (interaction.commandName) {
                        case 'rank':
                            await this._sendRank(interaction);
                            break;
                        case 'top':
                            await this._sendTop(interaction);
                            break;
                    }

                    return;
                }
            } catch (error: any) {
                this._loggerService.error(`[Discord Provider] ${error.stack} `);
            }
        });
    }

    private async _sendRank(interaction: Discord.ChatInputCommandInteraction<Discord.CacheType>): Promise<void> {
        const userId: string = interaction.user.id;
        const player: string = interaction.options.getString('player', true);
        const group: string = interaction.options.getString('group', true);

        const embeded: Discord.EmbedBuilder = new Discord.EmbedBuilder();

        embeded.setAuthor({ name: "KRIAX" })
            .setTitle('You have X points')
            .setThumbnail("https://avatars.cloudflare.steamstatic.com/a6f6a9c1958fd89781c4ddd94e79ce96bd231275_full.jpg")
            .setFooter({ text: moment(new Date()).locale(process.env.LOCALE ?? "en").format('LLL') })
            .addFields({ name: "Kill: X", value: `%ct %t \n %headshot \n %knife`, inline: true })
            .addFields({ name: "Assist: X", value: `%ct %t`, inline: true })
            .addFields(embededGhostField)
            .addFields({ name: "Death: x", value: `%suicide`, inline: true })
            .addFields({ name: "Bomb: X", value: `%planted \n %defused \n %exploded`, inline: true });

        // if not ranked
        //             .setDescription(`You are not ranked yet`)
        // .setColor(IColor.Warning)

        embeded.setDescription(`You are ranked XXX`)
            .setColor(IColor.Success);

        await interaction.reply({ embeds: [embeded], ephemeral: true });
    }

    private async _sendTop(interaction: Discord.ChatInputCommandInteraction<Discord.CacheType>): Promise<void> {
        try {
            const userId: string = interaction.user.id; // Need for future feature
            const group: string = interaction.options.getString('group', true);
            const players: ITopPlayer[] = await this._mysqlService.getTop(group);

            let content: string = "";

            let index = 1;
            for (let player of players) {
                content = content + `\n ${index} - ${player.name} with ${player.points}`;
                index++;
            }

            const embeded: Discord.EmbedBuilder = new Discord.EmbedBuilder();
            embeded
                .setTitle("TOP Players")
                .setColor(IColor.Success)
                .setDescription(content)

            await interaction.reply({ embeds: [embeded], ephemeral: true });
        } catch (error: any) {
            this._sendError(interaction);
            this._loggerService.error(error);
        }
    }

    private async _sendError(interaction: Discord.ChatInputCommandInteraction<Discord.CacheType>): Promise<void> {
        const embeded: Discord.EmbedBuilder = new Discord.EmbedBuilder();
        embeded
            .setTitle("TOP Players")
            .setColor(IColor.Danger)
            .setDescription("I cannot perform this action");
    }
}