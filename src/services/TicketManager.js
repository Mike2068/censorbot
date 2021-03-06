const GenerateID = require('../util/GenerateID')

/**
 * Representing tickets sent in by users
 * @typedef {Object} Ticket
 * @property {SmallID} id ID of ticket
 * @property {Snowflake} user User who sent ticket
 * @property {String} word Content of ticket
 */
/**
 * Representing ticket ban objects
 * @typedef {Object} TicketBan
 * @property {Snowflake} id ID of user
 * @property {?String} reason Reason why user was banned
 * @property {Snowflake} admin Admin who banned them
 * @property {Date} when When user was banned
 */

/**
 * Used for managing and adding censor bot tickets
 */
class TicketManager {
  /**
   * Ticket Manager
   * @param {Client} client Client
   */
  constructor (client) {
    /**
     * Client
     * @type {Client}
     */
    this.client = client
  }

  /**
   * Database
   * @type {MongoDB.Collection}
   */
  get db () {
    return this.client.db.collection('tickets')
  }

  /**
   * Ban database
   * @type {MongoDB.Collection}
   */
  get banDB () {
    return this.client.db.collection('ticketban')
  }

  /**
   * If a user is banned
   * @param {Snowflake} id User
   * @returns {TicketBan} Ban object
   */
  async isBanned (id) {
    const res = await this.banDB.findOne({ id })
    if (res) res.banned = true
    return res || { banned: false, reason: null, when: null, admin: null }
  }

  /**
   * Add a ticket
   * @param {String} word Word
   * @param {Snowflake} user User who added
   */
  async add (word, user) {
    const isBanned = await this.isBanned(user)
    if (isBanned.banned) throw new Error(`User is banned for \`${isBanned.reason}\``)

    const res = this.client.filter.test(word, this.client.db.Config.constants.allowedFilters)
    if (!res.censor) throw new Error('Phrase is not censored by the base filter')

    const tickets = await this.db.find({}).toArray()
    const id = GenerateID(tickets.map(x => x.id))

    const msg = await this.client.interface.embed
      .title(`Ticket (${id})`)
      .description(`<@${user}> \`\`\`${word}\`\`\``)
      .timestamp()
      .send('ticket')

    this.client.interface.addReaction(this.client.config.channels.ticket, msg.id, this.client.config.emojis.yes)
    this.client.interface.addReaction(this.client.config.channels.ticket, msg.id, this.client.config.emojis.no)

    this.db.insertOne({
      id,
      word,
      user,
      msg: msg.id
    })

    if (this.client.cluster.done) this.client.stats.tickets.waiting.put()
  }

  /**
   * Deny a ticket
   * @param {SmallID} id Ticket ID
   * @param {Snowflake} admin Admin who denied
   */
  async deny (id, admin) {
    const ticket = await this.db.findOne({ id })

    this.client.interface.embed
      .title(`Denied (${id})`)
      .description(`<@${ticket.user}> denied by <@${admin.id}> \`\`\`${ticket.word}\`\`\``)
      .timestamp()
      .send('ticketLog')

    this.client.interface.embed
      .title(`Ticket was denied (${ticket.id})`)
      .description(ticket.word)
      .field('Admin', `<@${admin.id}> (${admin.username}#${admin.discriminator})`)
      .footer('Reminder that you can always add words to your uncensor list to stop it in your server specifically.')
      .timestamp()
      .dm(ticket.user)

    this.client.interface.delete(this.client.config.channels.ticket, ticket.msg)

    this.db.removeOne({ id })

    if (this.client.cluster.done) this.client.stats.tickets.waiting.delete({ query: { user: admin.id } })
  }

  /**
   * Approve a ticket
   * @param {SmallID} id Ticket ID
   * @param {Object} admin Admin who approved
   */
  async approve (id, admin) {
    const ticket = await this.db.findOne({ id })

    this.client.interface.embed
      .title(`Accepted (${id})`)
      .description(`<@${ticket.user}> accepted by <@${admin.id}> \`\`\`${ticket.word}\`\`\``)
      .timestamp()
      .send('ticketLog')

    this.client.interface.embed
      .title(`Ticket was accepted (${ticket.id})`)
      .description(ticket.word)
      .footer('Please wait as we need to add the bypass, you will receive a DM once the word has been added.')
      .timestamp()
      .dm(ticket.user)

    this.client.interface.delete(this.client.config.channels.ticket, ticket.msg)

    this.db.updateOne({
      id: ticket.id
    }, {
      $set: {
        accepted: true,
        admin: admin.id,
        msg: null
      }
    })

    if (this.client.cluster.done) this.client.stats.tickets.accepted.put({ query: { user: admin.id } })
  }

  /**
   * Event handler for reactions
   * @param {Object} reaction Reaction
   */
  async event (reaction) {
    if (reaction.channel_id !== this.client.config.channels.ticket || reaction.member.user.bot) return
    const { id } = await this.db.findOne({ msg: reaction.message_id })

    switch (reaction.emoji.id) {
      case this.client.config.emojis.yes:
        this.approve(id, reaction.member.user)
        break
      case this.client.config.emojis.no:
        this.deny(id, reaction.member.user)
        break
    }
  }
}

module.exports = TicketManager
