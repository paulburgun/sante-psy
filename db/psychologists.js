const knexConfig = require("../knexfile")
const knex = require("knex")(knexConfig)
const date = require("../utils/date")

module.exports.psychologistsTable =  "psychologists";

module.exports.getPsychologists = async () => {
  try {
    const psychologists = await knex(module.exports.psychologistsTable)
        .select();

    return psychologists;
  } catch (err) {
    console.error(`Impossible de récupérer les psychologistes`, err)
    throw new Error(`Impossible de récupérer les psychologistes`)
  }
}

/**
 * Perform a UPSERT with https://knexjs.org/#Builder-merge
 * @param {*} psy 
 */
module.exports.savePsychologistInPG = async function savePsychologistInPG(psyList) {
  console.log(`UPSERT of ${psyList.length} psychologists into PG....`);
  const updatedAt = date.getDateNowPG(); // use to perform UPSERT in PG

  const upsertArray = psyList.map( psy => {
    const upsertingKey = 'dossierNumber';

    return knex(module.exports.psychologistsTable)
    .insert(psy)
    .onConflict(upsertingKey)
    .merge({ // update every field and add updatedAt
      firstNames : psy.firstNames,
      lastName : psy.lastName,
      address: psy.address,
      region: psy.region,
      departement: psy.departement,
      phone: psy.phone,
      website: psy.website,
      email: psy.email,
      teleconsultation: psy.teleconsultation,
      description: psy.description,
      training: psy.training,
      adeli: psy.adeli,
      diploma: psy.diploma,
      languages: psy.languages,
      updatedAt: updatedAt
    });
  });

  const query = await Promise.all(upsertArray);

  console.log(`UPSERT into PG : done`);

  return query;
}

/**
 * @TODO fix me 
 * 
 */
module.exports.getNumberOfPsychologists = async function getNumberOfPsychologists() {
  const query = await knex(module.exports.psychologistsTable).count('dossierNumber').first();

  return query.count;
}