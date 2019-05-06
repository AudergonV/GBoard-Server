let utils = require('../wrk/utils');
let fs = require('fs');
let config = {};
const CONFIG_PATH = 'config.json';

var getConfig = function () {
    return config;
}

var setConfig = async function (c) {
    let retour = false;
    let data = JSON.stringify(c);
    await new Promise((resolve, reject) => {
        fs.writeFile(CONFIG_PATH, data, (err) => {
            if (err) resolve(false);
            resolve(true);
        });
    }).then(ok => { 
      if (ok){
        utils.logInfo('Nouvelle configuration enregistrée.');
        config = c;
      } else {
        utils.logError('Une erreur est survenue. Impossible de sauvegarder la nouvelle configuration.');
      }
      retour = ok;
    });
    return retour;
}

var loadConfig = async function () {
    let retour = false;
    utils.logInfo(`Chargement de la configuration ${CONFIG_PATH} en cours...`);
    await new Promise((resolve, reject) => {
        fs.readFile(CONFIG_PATH, function (err, data) {
            if (err) resolve(false);
            config = JSON.parse(data);
            resolve(true);
        });
    }).then((ok) => {
        if (ok) {
            utils.logSuccess(`Configuration chargée avec succès.`);
        } else {
            utils.logError(`Impossible de charger la configuration ${CONFIG_PATH}. Vérifiez que le fichier soit existant à l'emplacement donné.`)
        }
        retour = ok;
    });
    return retour;
}

module.exports = { getConfig, setConfig, loadConfig }