const cfg=require('./app.json'); if(cfg && cfg.expo && cfg.expo.plugins) delete cfg.expo.plugins; module.exports = cfg;
