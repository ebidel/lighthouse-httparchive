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

'use strict';

const bodyParser = require('body-parser');
const express = require('express');
const LigthhouseBigQueryHelper = require('./lighthouse-big-query');

const DEFAULT_CACHE_TIME = 60 * 60 * 2 // 2hrs.

const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static('public', {extensions: ['html', 'htm']}));
app.use(express.static('node_modules'));

app.get('/data', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', `public, max-age=${DEFAULT_CACHE_TIME}`);
  res.setHeader('Content-Type', 'application/json;charset=utf-8');

  // const forMobile = req.query.platform === 'mobile' || false;

  const bq = new LigthhouseBigQueryHelper();
  // bq.getData(forMobile)
  bq.getAllData()
    .then(results => res.send(results))
    .catch(err => {
      console.error(err);
      res.status(500).send({error: err});
    });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});
