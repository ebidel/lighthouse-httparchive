/**
 * @license
 *
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

 /**
  * @fileoverview
  *
  * Provides an API for querying HTTPArchive data stored in Google BigQuery.
  *
  * To minimize network requests, Big Query API results are cached locally in a
  * file called .biqquery_cache.json. This file is checked in to source so users
  * have local data when installing Lighthouse for the first time.
  *
  * The cache is always consulted first before making requests to live data.
  * If the user has not run Lighthouse within the last 24 hours, newer results
  * will be requested from the API. The last modified timestamp of the cache
  * file is used to determine whether newer results should be attempted. If the
  * API has a new HTTPArchive dump, then additional network requests are made
  * to the Big Query API to update the cache.
  *
  *   To check that the latest data dump is checked, daily:
  *     1. Update the last modified timestamp of the cache:
  *        touch -mt 1612151533 .biqquery_cache.json
  *     2. Run this script
  *     3. Verify that you see the "fetching latest table names" message.
  *
  *   To check that the cache is updated when newer dumps are available:
  *     1. Modify the latestFetchDate in .biqquery_cache.json to an older date.
  *     2. Update the last modified timestamp of the cache:
  *        touch -mt 1612151533 .biqquery_cache.json
  *     3. Run this script
  *     4. Verify that latestFetchDate is now the latest.
  *     5. Verify that you see "fetching latest table names" and additional
  *        message for fetching data.
  */

// Author: Eric Bidelman <ebidel@>

'use strict';

const path = require('path');
const fs = require('fs');
const gcloud = require('google-cloud');

const PROJECT_ID = 'lighthouse-viewer';
const CACHE_FILE = '.biqquery_cache.json';
const BigQuery = gcloud.bigquery({projectId: PROJECT_ID});


/**
 * Returns the original object with sorted keys.
 * @param {!Object} obj
 * @return {!Object}
 */
function orderKeys(obj) {
  const ordered = {};
  Object.keys(obj).sort().forEach(key => ordered[key] = obj[key]);
  return ordered;
}

class CacheFile {
  constructor(cacheFilename=CACHE_FILE) {
    this.file = path.join(__dirname, cacheFilename);
    try {
      this.content = require(this.file);
    } catch (err) {
      this.content = null;
    }
  }

  get fileExists() {
    return this.content;
  }

  /**
   * Returns true if a request to BiqQuery should be made to check for newer data.
   * At most, this returns true every 24 hours.
   * @param {!boolean}
   */
  shouldCheckForLatestData() {
    if (!this.fileExists) {
      return true;
    }

    // At most, check for new biq query data every 24hrs. The 24 hour period is
    // determined by comparing the cache file's last modified timestamp date
    // with today's date (YYYY-MM-DD).
    const stat = fs.statSync(this.file);
    const lastModifiedDate = (new Date(stat.mtime)).toJSON().split('T')[0];
    const todayDate = (new Date()).toJSON().split('T')[0];

    return todayDate > lastModifiedDate;
  }

  /**
   * Returns true if the data in the cache file should be updated.
   * @param {!string} latestFetchDate Date (YYYY-MM-DD) of the last httparchive
   *     data dump in BigQuery.
   * @return {!boolean}
   */
  cacheNeedsUpdate(latestFetchDate) {
    // Cache file doesn't exist yet.
    if (!this.fileExists) {
      return true;
    }

    // Results are stale if cache's latestFetchDate is older.
    return new Date(this.content.latestFetchDate) < new Date(latestFetchDate);
  }

  /**
   * Writes json into the cache file.
   * @param {!Object} json The JSON object to write.
   */
  writeJSONFile(json) {
    console.info('Caching BigQuery results.');

    this.content = json;

    try {
      fs.writeFileSync(this.file, JSON.stringify(json, null, 2), 'utf8');
    } catch (err) {
      console.error(err);
    }
  }
}

/**
 * Wrapper around the BigQuery API with provides a filesystem-backed caching
 * layer on top of API requests.
 */
class BigQueryCache {

  constructor() {
    this.cache = new CacheFile();
  }

  /**
   * @return {!Promise<string>} Resolves with the date string of the latest
   *     data dump. In YYYY-MM-DD.
   */
  latestFetchDate(onMobile) {
    if (this.cache.shouldCheckForLatestData()) {
      return this.getLatestTableNameQuery(onMobile);
    }
    return Promise.resolve(this.cache.content.latestFetchDate);
  }

  /**
   * @param {!Object} stats A BigQuery result.
   * @return {!Object} Modified stats.
   */
  formatAvgResults(stats) {
    const temp = {
      render_start_avg: Math.ceil(stats.avg_render_start),
      img_requests_avg: Math.floor(stats.avg_img_requests),
      css_requests_avg: Math.floor(stats.avg_css_requests),
      js_requests_avg: Math.floor(stats.avg_js_requests),
      html_requests_avg: Math.floor(stats.avg_html_requests),
      speed_index_avg: Math.ceil(stats.avg_speed_index),
      css_bytes_avg: Math.ceil(stats.avg_css_bytes),
      img_bytes_avg: Math.ceil(stats.avg_img_bytes),
      js_bytes_avg: Math.ceil(stats.avg_js_bytes),
      html_bytes_avg: Math.ceil(stats.avg_html_bytes),
      html_doc_bytes_avg: Math.ceil(stats.avg_html_doc_bytes),
      font_bytes_avg: Math.ceil(stats.avg_font_bytes),
      total_bytes_avg: Math.ceil(stats.avg_total_bytes),
      num_dom_elements_avg: Math.floor(stats.avg_num_dom_elements),
      percentage_requests_https_avg: Math.floor(stats.avg_num_dom_elements),
    };
    return temp;
  }

  /**
   * @param {!Object} stats A BigQuery result.
   * @return {!Object} Formatted stats.
   */
  formatMedianResults(stats) {
    return {
      render_start: Math.ceil(stats.render_start),
      img_requests: Math.floor(stats.img_requests),
      css_requests: Math.floor(stats.css_requests),
      js_requests: Math.floor(stats.js_requests),
      html_requests: Math.floor(stats.html_requests),
      speed_index: Math.ceil(stats.speed_index),
      css_bytes: Math.ceil(stats.css_bytes),
      img_bytes: Math.ceil(stats.img_bytes),
      js_bytes: Math.ceil(stats.js_bytes),
      html_bytes: Math.ceil(stats.html_bytes),
      html_doc_bytes: Math.ceil(stats.html_doc_bytes),
      font_bytes: Math.floor(stats.font_bytes),
      total_bytes: Math.ceil(stats.total_bytes),
      num_dom_elements: Math.floor(stats.num_dom_elements),
      percentage_https_requests: Math.floor(stats.percentage_https_requests),
    };
  }

  /**
   * @param {boolean=} onMobile Optionally query mobile results instead of
   *     desktop. Default is false.
   * @return {!Promise<string>} Date string of the latest data dump. In YYYY-MM-DD.
   */
  getLatestTableNameQuery(onMobile = false) {
    const view = onMobile ? 'pages_mobile': 'pages';

    const query = `
      SELECT
        label
      FROM
        TABLE_QUERY([httparchive:runs], "table_id IN (
              SELECT table_id FROM [httparchive:runs.__TABLES__]
              WHERE REGEXP_MATCH(table_id, '2.*${view}$')
              ORDER BY table_id DESC LIMIT 1)")
      GROUP BY
        label`;

    console.info('BigQuery: fetching latest table names...');

    if (this.cache.fileExists) {
      // Update cache file's last modified timestamp.
      const now = new Date();
      fs.utimesSync(this.cache.file, now, now);
    }

    return BigQuery.query({query}).then(results => {
      return new Date(results[0][0].label).toJSON().split('T')[0];
    });
  }

  /**
   * @param {boolean=} onMobile Optionally query mobile results instead of
   *     desktop. Default is false.
   * @return {!Promise<Object>}
   */
  getLatestAveragesQuery(onMobile = false) {
    const tableName = onMobile ? 'latest_pages_mobile' : 'latest_pages';

    const query = `
      SELECT
        AVG(renderStart) AS avg_render_start,
        AVG(SpeedIndex) AS avg_speed_index,
        AVG(bytesTotal) AS avg_total_bytes,
        AVG(bytesHtmlDoc) as avg_html_doc_bytes,
        AVG(bytesHtml) as avg_html_bytes,
        AVG(bytesImg) AS avg_img_bytes,
        AVG(bytesJS) AS avg_js_bytes,
        AVG(bytesCSS) AS avg_css_bytes,
        AVG(bytesFont) AS avg_font_bytes,
        AVG(reqImg) AS avg_img_requests,
        AVG(reqJs) AS avg_js_requests,
        AVG(reqHtml) AS avg_html_requests,
        AVG(reqCSS) AS avg_css_requests,
        AVG(numDomElements) AS avg_num_dom_elements
        AVG(numHttps) AS avg_percentage_https_requests,
      FROM
        [httparchive:runs.${tableName}]
      `;

    console.info(`BigQuery: fetching averages from table: ${tableName}`);

    return BigQuery.query({query, useLegacySql: true}).then(results => {
      return this.formatAvgResults(results[0][0]);
    });
  }

  /**
   * @param {boolean=} onMobile Optionally query mobile results instead of
   *     desktop. Default is false.
   * @return {!Promise<Object>}
   */
  getMediansQuery(onMobile = false) {
    const tableName = onMobile ? 'latest_pages_mobile' : 'latest_pages';

    // Calculates medians with 0.1% error.
    // See https://cloud.google.com/bigquery/docs/reference/legacy-sql#quantiles
    const query = `
      SELECT
        #QUANTILES(renderStart, 11) AS speed_index_percentiles,
        NTH(501, QUANTILES(renderStart, 1001)) AS render_start,
        NTH(501, QUANTILES(SpeedIndex, 1001)) AS speed_index,
        NTH(501, QUANTILES(bytesTotal, 1001)) AS total_bytes,
        NTH(501, QUANTILES(bytesHtmlDoc, 1001)) AS html_doc_bytes,
        NTH(501, QUANTILES(bytesHtml, 1001)) AS html_bytes,
        NTH(501, QUANTILES(bytesImg, 1001)) AS img_bytes,
        NTH(501, QUANTILES(bytesJS, 1001)) AS js_bytes,
        NTH(501, QUANTILES(bytesCSS, 1001)) AS css_bytes,
        NTH(501, QUANTILES(bytesFont, 1001)) AS font_bytes,
        NTH(501, QUANTILES(reqImg, 1001)) AS img_requests,
        NTH(501, QUANTILES(reqJs, 1001)) AS js_requests,
        NTH(501, QUANTILES(reqHtml, 1001)) AS html_requests,
        NTH(501, QUANTILES(reqCSS, 1001)) AS css_requests,
        NTH(501, QUANTILES(numDomElements, 1001)) AS num_dom_elements,
        NTH(501, QUANTILES(numHttps, 1001)) AS percentage_https_requests
      FROM
        [httparchive.runs.${tableName}]
      `;

    console.info(`BigQuery: fetching medians from table: ${tableName}`);

    return BigQuery.query({query, useLegacySql: true}).then(results => {
      return this.formatMedianResults(results[0][0]);
    });
  }

  /**
   * Queries BiqQuery API for latest results if cache content is stale. Updates
   * the cache file if necessary.
   * @return {!Promise<Object>} Resolves with json results.
   */
  async getAllData() {
    const latestFetchDate = await this.latestFetchDate();

    if (!this.cache.cacheNeedsUpdate(latestFetchDate)) {
      return Promise.resolve(this.cache.content);
    }

    return Promise.all([
      // this.getLatestAveragesQuery(true),
      // this.getLatestAveragesQuery(false),
      this.getMediansQuery(true),
      this.getMediansQuery(false),
      this.getLighthouseData(true)
    ]).then(([mobileMedians, desktopMedians, lighthouseData]) => {
      const json = {
        latestFetchDate,
        mobile: orderKeys(mobileMedians),
        desktop: orderKeys(desktopMedians),
        lighthouse: lighthouseData
      };

      this.cache.writeJSONFile(json);

      return json;
    });
  }

  /**
   * @param {boolean=} onMobile Optionally query mobile results instead of
   *     desktop. Default is false.
   * @return {!Promise<Object>} Resolves with json results.
   */
  async getLighthouseData(onMobile = false) {
    const latestFetchDate = await this.latestFetchDate();
    if (!this.cache.cacheNeedsUpdate(latestFetchDate) && this.cache.content.lighthouse) {
      return Promise.resolve(this.cache.content);
    }

    const view = onMobile ? 'android' : 'chrome';
    const dateStr = latestFetchDate.replace(/-/g, '_');
    const tableName = `${dateStr}_${view}_pages`;

    // Calculates medians with 0.1% error.
    // See https://cloud.google.com/bigquery/docs/reference/legacy-sql#quantiles
    // Note: If reportCategories changes its order, this query needs to be updated.
    const query = `
      SELECT
        #NTH(501, QUANTILES(CAST(JSON_EXTRACT_SCALAR(lighthouse, '$.audits.first-meaningful-paint.rawValue') AS FLOAT), 1001)) AS lhFMP,
        #NTH(501, QUANTILES(CAST(JSON_EXTRACT_SCALAR(lighthouse, '$.audits.dom-size.rawValue') AS FLOAT), 1001)) AS lhDomSize,
        NTH(501, QUANTILES(CAST(JSON_EXTRACT_SCALAR(lighthouse, '$.reportCategories[0].score') AS FLOAT), 1001)) AS pwaScore,
        NTH(501, QUANTILES(CAST(JSON_EXTRACT_SCALAR(lighthouse, '$.reportCategories[1].score') AS FLOAT), 1001)) AS perfScore,
        NTH(501, QUANTILES(CAST(JSON_EXTRACT_SCALAR(lighthouse, '$.reportCategories[2].score') AS FLOAT), 1001)) AS a11yScore,
        NTH(501, QUANTILES(CAST(JSON_EXTRACT_SCALAR(lighthouse, '$.reportCategories[3].score') AS FLOAT), 1001)) AS bestPracticesScore
      FROM
        [httparchive.har.${tableName}]
      WHERE
        lighthouse != 'null'`;

    console.info(`BigQuery: fetching medians from table: ${tableName}`);

    return BigQuery.query({query, useLegacySql: true}).then(results => {
      return results[0][0];
    });
  }
}

// Run if called directly.
if (require.main === module) {
(async () => {

  const bq = new BigQueryCache();
  try {
    const results = await bq.getAllData();
    console.log(results);
  } catch(err) {
    console.error(err);
  }

})();
}

module.exports = BigQueryCache;