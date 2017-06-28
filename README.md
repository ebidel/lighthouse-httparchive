# lighthouse-httparchive

Lighthouse metrics from HTTPArchive snapshots.

### Setup

#### Installation

```
yarn
```

Get a `service-account.json` for your project in the [Google Developer Console](https://developers.google.com/api-client-library/php/auth/service-accounts)
and update `PROJECT_ID` at the top of `lighthouse-big-query.js` with your
project's id.

#### Run it

You can run the app from the command line or by firing up a web server. The
first time you run either, results may take a while to fetch from BigQuery.
One fetched, a file called `.biqquery_cache.json` will be created that contains
the cached results.

Subsequent runs should be fast and will consult the cache if you're running the
script within a 24hr period. Afer 24hrs, HTTPArchive's BigQuery data will be
checked for newer data dumps. If there are newer results, the data will be
fetched from BigQuery and the cache file will be updated. Rinse and repeat.

##### CLI

To run the CLI:

```
node lighthouse-big-query.js
```

##### Web server

To start the server:

```
yarn start
```

Navigate to http://localhost:8080.

### Deployment

```
./scripts/deploy YYY-MM-DD user@gmail.com
```