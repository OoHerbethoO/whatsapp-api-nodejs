const { WhatsAppInstance } = require('../class/instance')
const fs = require('fs')
const path = require('path')
const config = require('../../config/config')
const { Session } = require('../class/session')

exports.init = async (req, res) => {
    try {
        const key = req.body.key
        const webhook = !req.body.webhook ? false : req.body.webhook
        const webhookUrl = !req.body.webhookUrl ? null : req.body.webhookUrl
        const appUrl = config.appUrl || req.protocol + '://' + req.headers.host
        const chatwootConfig = config.chatwoot
        chatwootConfig.enable = !req.body.chatwoot?.enable ? false : req.body.chatwoot.enable
        chatwootConfig.baseURL = !req.body.chatwoot?.baseURL ? null : req.body.chatwoot.baseURL
        chatwootConfig.token = !req.body.chatwoot?.token ? null : req.body.chatwoot.token
        chatwootConfig.inbox_id = !req.body.chatwoot?.inbox_id ? null : req.body.chatwoot.inbox_id
        chatwootConfig.account_id = !req.body.chatwoot?.account_id ? null : req.body.chatwoot.account_id
        
        const instance = new WhatsAppInstance(key, webhook, webhookUrl, chatwootConfig)
        const data = await instance.init()
        WhatsAppInstances[data.key] = instance
        res.json({
            error: false,
            message: 'Initializing successfully',
            key: data.key,
            webhook: {
                enabled: webhook,
                webhookUrl: webhookUrl,
            },
            chatwoot: { ...chatwootConfig },
            qrcode: {
                url: appUrl + '/instance/qr?key=' + data.key,
            },
            browser: config.browser,
        })
    } catch(err) {
        console.log(err)
        res.json({
            error: true,
            message: 'Initializing failed'
        });
    }
}

exports.qr = async (req, res) => {
    try {
        const qrcode = await WhatsAppInstances[req.query.key]?.instance.qr
        res.render('qrcode', {
            qrcode: qrcode,
        })
    } catch {
        res.json({
            qrcode: '',
        })
    }
}

exports.qrbase64 = async (req, res) => {
    try {
        const qrcode = await WhatsAppInstances[req.query.key]?.instance.qr
        res.json({
            error: false,
            message: 'QR Base64 fetched successfully',
            qrcode: qrcode,
        })
    } catch {
        res.json({
            qrcode: '',
        })
    }
}

exports.info = async (req, res) => {
    const instance = WhatsAppInstances[req.query.key]
    let data
    try {
        data = await instance.getInstanceDetail(req.query.key)
    } catch (error) {
        data = {}
    }
    return res.json({
        error: false,
        message: 'Instance fetched successfully',
        instance_data: data,
    })
}

exports.restore = async (req, res, next) => {
    try {
        const session = new Session()
        let restoredSessions = await session.restoreSessions()
        return res.json({
            error: false,
            message: 'All instances restored',
            data: restoredSessions,
        })
    } catch (error) {
        next(error)
    }
}

exports.logout = async (req, res) => {
    let errormsg
    try {
        await WhatsAppInstances[req.query.key].instance?.sock?.logout()
    } catch (error) {
        errormsg = error
    }
    return res.json({
        error: false,
        message: 'logout successfull',
        errormsg: errormsg ? errormsg : null,
    })
}

exports.delete = async (req, res) => {
    let errormsg
    try {
        await WhatsAppInstances[req.query.key].instance?.sock?.logout()
        delete WhatsAppInstances[req.query.key]
    } catch (error) {
        errormsg = error
    }
    return res.json({
        error: false,
        message: 'Instance deleted successfully',
        data: errormsg ? errormsg : null,
    })
}

exports.list = async (req, res) => {
    if (req.query.active) {
        let instance = Object.keys(WhatsAppInstances).map(async (key) =>
            WhatsAppInstances[key].getInstanceDetail(key)
        )
        let data = await Promise.all(instance)
        return res.json({
            error: false,
            message: 'All active instance',
            data: data,
        })
    } else {
        let instance = []
        const db = mongoClient.db('whatsapp-api')
        const result = await db.listCollections().toArray()
        result.forEach((collection) => {
            instance.push(collection.name)
        })

        return res.json({
            error: false,
            message: 'All instance listed',
            data: instance,
        })
    }
}
