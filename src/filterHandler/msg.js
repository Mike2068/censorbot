module.exports = async (client, message) => {
    if (message.guild && message.guild.id == "264445053596991498") return;
    if (message.content.toLowerCase().split(' ')[0] == client.config.prefix + "ticket") {
        message.delete();
        return;
    }
    if (message.content.toLowerCase().split(' ')[0] == client.config.prefix + "filter") {
        message.delete();
        return;
    }
    if (message.content.toLowerCase().split(' ')[0] == client.config.prefix + "f") {
        message.delete();
        return;
    }
    if (message.content.toLowerCase().split(' ')[0] == client.config.prefix + "uncensor") {
        message.delete();
        return;
    }
    if (message.channel.nsfw) return;
    let attachments = message.attachments.map(x => x.name)
    if (attachments.length > 0) {
        attachments.forEach(a => {
            message.content += ` ${a.replace(/(_|\.)/g)}`
            //arg.push(a.replace(/(_|\.)/g, " "))
        })
    }
    var data = await client.rdb.get(message.guild.id).run();
    if(!data) {
        var newConfig = new client.config.serverConfig(message.guild.id);
        client.rdb.insert(newConfig).run();
        data = newConfig;
    }
    if (data.role && message.member.roles.has(data.role)) return;

    var response = client.filter.test(message.content, data.censor.msg, data.filter, data.uncensor);

    if (response.censor) {
        var msg = message;
        var error;
        try {
            await msg.delete();
        } catch (err) {
            console.log(`Shard ${client.shard.id} | ${msg.guild.name} ${msg.guild.id} ${err.message}`.red)
            error = "Error! Missing permission to manage messages!";
        }

        if (data.msg !== false) {
            try {
                const popmsg = await message.reply(data.msg || client.config.defaultMsg);
                if (data.pop_delete) {
                    setTimeout(() => {
                        popmsg.delete()
                    }, data.pop_delete);
                    if (data.antighostping && msg.mentions.users.first() && !(msg.mentions.users.size == 1 && msg.mentions.users.first().bot)) {
                        msg.channel.send(`ANTI-GHOSTPING:::Attention ${msg.mentions.users.filter(b=>!b.bot).map(x=>x.tag).join(' ')} you might've been ghost pinged by ${msg.author} (Don't want this message. Run +agp)`)
                    }
                }
            } catch (err) {
                console.error(err);
            }
            console.log(`Shard ${client.shard.id} | Deleted message from ${msg.author} ${msg.author.username}: `.yellow + `${msg.content}`.yellow.underline)
            var content = "";
            if (msg.content !== 0) {
                if (msg.content.length > 256) {
                    content = "Message too long to include in embed!"
                } else {
                    content = msg.content
                }
            }
            if (msg.attachments.map(x => x.name).length > 0 && msg.content == 0) {
                content = "File: " + msg.attachments.map(x => x.name)[0]
            }
            client.msg("log", `Shard ${client.shard.id} | Deleted message from ${msg.author.tag} ${msg.author.username}: | Server: ${msg.guild.name} ${msg.guild.id} | Channel: ${msg.channel.name} ${msg.channel.id}`, client.embeds.adminLog(content, msg.author, {
                arg: response.arg,
                word: response.word
            }))
            var log = msg.guild.channels.get(data.log);
            if (!log) {
                return client.sendErr(msg, "Error no log channel found! Do +setlog in the desired log channel")
            }
            log.send(client.embeds.log([msg.content], msg, response.method, 0, error, response));
            if (data.punish) {
                console.log("punish");
                var guildc = await client.punishdb.get(msg.guild.id).run();
                if (!guildc || !guildc.amount) return;
                var role = msg.guild.roles.get(guildc.role);
                if (!role) return;
                if (!guildc.users[msg.author.id]) guildc.users[msg.author.id] = 1;
                else guildc.users[msg.author.id]++;
                if (guildc.users[msg.author.id] >= guildc.amount) {
                    msg.member.roles.add(role);
                    delete guildc.users[msg.author.id];
                    console.log(guildc)
                    var embed = new client.discord.MessageEmbed()
                        .setTitle("User Punished")
                        .setDescription(`${msg.author} Reached the max ${guildc.amount} warnings.\n\nThey have received the ${role} role as punishment!`)
                        .setColor("RED")
                        .setFooter("This system is heavily WIP!")
                    log.send(embed);
                }
                client.punishdb.replace(guildc).run();
            }
            if(data.webhook) {
                var cc = msg.content.split(" ");
                for(var z = 0; z < cc.length; z++) {
                    var s = false;
                    response.arg.forEach(arg=>{
                        if(s) return;
                        if(cc[z].match(arg)) {
                            cc[z] = `||${cc[z]}||`;
                            s = true;
                        }
                    })
                }
                var content = cc.join(" ").replace(/\`\`\`/gi, "");
                client.u.sendAsWebhook(msg.author, msg.channel, content);
            }
        }
    }
}