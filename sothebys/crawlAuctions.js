const cheerio = require('cheerio');
const moment = require('moment');
const _ = require('lodash');

const { fetch } = require('./fetch');

const getDate = $ => {
  const dateStr = _.first(
    $('.Card-details')
      .text()
      .split(' | '),
  );

  return moment.utc(_.last(dateStr.split('–')), 'DD MMM YYYY').format('YYYY-MM-DD');
};

const getLocation = $ =>
  _.last(
    $('.Card-details')
      .text()
      .split(' | '),
  ).trim();

function getUID($) {
  return $('.AuctionActionLink').attr('uuid');
}

const getOriginUrl = ($, date) => {
  const overviewUrl = $('.Card-info-aside a')
    .attr('href')
    .trim();

  if (overviewUrl.includes('/digital-catalogues/')) {
    return null;
    // const year = moment.utc(date).year();
    // return overviewUrl.replace('digital-catalogues', `buy/auction/${year}`);
  }

  return overviewUrl;
};

const crawlAuction = $ => {
  const name = $('.Card-title')
    .text()
    .trim();
  const date = getDate($);
  const originUrl = getOriginUrl($, date);
  const location = getLocation($);
  const uid = getUID($);

  return {
    name,
    date,
    origin_url: originUrl,
    location,
    uid,
  };
};

const crawlAuctions = async url => {
  console.log("[sothebys][crawlAuctions]", url);

  const res = await fetch({
    url,
  });

  const $ = cheerio.load(res.body);

  let ress = $('.SearchModule-results-item').toArray();
  console.log("[sothebys][crawlAuctions] SearchModule ress", ress.length);
  // const chrHtml = cheerio.html || cheerio.default.html;
  ress = ress
    .map(n => cheerio.load(n))
    .map(crawlAuction)
    .filter(auction => auction.origin_url);

  const uidList = ress.map(r => r.uid).join(',');
  const availableActionsRaw = await fetch({
    url: `https://www.sothebys.com/data/api/asset.actions.json?id=${uidList}`,
  });

  // fetch should return json, but for some reason it gives text, converted it to json
  const availableActions = JSON.parse(availableActionsRaw.body);
  ress = ress.filter(r => !availableActions[r.uid].availableActions.includes('preview')).map(r => ({
    ...r,
    uid: undefined,
  }))

  return ress;
};

module.exports = crawlAuctions;
