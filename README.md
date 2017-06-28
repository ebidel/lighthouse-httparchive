# lighthouse-httparchive

Lighthouse metrics from HTTPArchive snapshots.

### Setup

#### Installation

```
yarn
```

#### Run it

You can run the app from the command line or by firing up a web server. The
first time you run either, results may take a while to fetch. A file called
`.biqquery_cache.json` will be created to cache the results.

Subsequent runs should be fast and consult the cache. If you're running the
script after a 24hr period, HTTPArchive's BigQuery data will be checked for
newer data dumps. If there are newer results, the data will be fetched and
the will get updated.

To run the CLI:

```
node lighthouse-big-query.js
```

To start the server:

```
yarn start
```

Navigate to http://localhost:8080.
