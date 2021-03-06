/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const KEYS_TO_LABEL = {
  total_bytes: 'Total',
  img_bytes: 'Images',
  html_doc_bytes: 'Size of main page',
  html_bytes: 'HTML',
  css_bytes: 'CSS',
  font_bytes: 'Fonts',
  js_bytes: 'JS',
  js_requests: 'JS',
  css_requests: 'CSS',
  img_requests: 'Images',
  html_requests: 'HTML',
  num_dom_elements: '# of DOM nodes',
  render_start: 'First paint (ms)',
  speed_index: 'Page Speed Index',
  pwaScore: 'Progressive Web App',
  bestPracticesScore: 'Best Practices',
  a11yScore: 'Accessibility',
  perfScore: 'Performance',
  lhFirstInteractive: 'First Interactive (ms)',
  lhConsistentlyInteractive: 'Consistently Interactive (ms)',
};

function createCard(label, vals) {
  const tmpl = document.querySelector('#card-template');
  const card = document.importNode(tmpl.content, true);
  card.querySelector('.scorecard-title').textContent = label;

  const rows = card.querySelector('.scorecard-rows');
  rows.dataset.name = label;
  const rowTmpl = card.querySelector('.scorecard-row');

  rowTmpl.remove(); // remove the placeholder DOM.

  for (let i = 0; i < vals.length; ++i) {
    const values = vals[i];

    const row = rowTmpl.cloneNode(true);
    row.querySelector('.scorecard-row-title').textContent = values.label;

    const score = row.querySelector('.scorecard-row-score');
    score.textContent = values.value.formatted;
    score.title = values.value.raw;

    rows.appendChild(row);
  }

  return card;
}

function formatBytesToKb(bytes) {
  return {
    raw: bytes,
    formatted: filesize(bytes, {base: 10, round: 1})
  };
}

function formatNumber(num) {
  return {raw: num, formatted: num.toLocaleString(undefined, {maximumFractionDigits: 0})};
}

function sortArrayOfObjectsByValues(stats) {
  const sortedEntries = stats;
  sortedEntries.sort((a, b) => {
    if (a.value.raw < b.value.raw) {
      return -1;
    }
    if (a.value.raw > b.value.raw) {
      return 1;
    }
    return 0;
  });
  return sortedEntries.reverse();
}

function render(stats, container) {
  const KEYS = {size: 'Weight', requests: 'Requests', perf: 'Page performance'};
  const groups = {
    [KEYS.size]: [],
    [KEYS.requests]: [],
    [KEYS.perf]: []
  };

  // Construct formatted object for rendering.
  for (const [key, val] of Object.entries(stats)) {
    const label = KEYS_TO_LABEL[key];
    if (!label) {
      continue;
    }

    if (key == 'html_doc_bytes') {
      groups[KEYS.perf].push({label, value: formatBytesToKb(val)});
    } else if (key.endsWith('bytes')) {
      groups[KEYS.size].push({label, value: formatBytesToKb(val)});
    } else if (key.endsWith('_requests')) {
      groups[KEYS.requests].push({label, value: formatNumber(val)});
    } else {
      groups[KEYS.perf].push({label, value: formatNumber(val)});
    }
  }

  const docFragment = new DocumentFragment();

  // Create a card for each group.
  // eslint-disable-next-line prefer-const
  for (let [label, values] of Object.entries(groups)) {
    // Sort some of the groups, largest -> smallest.
    if (label === KEYS.size || label === KEYS.requests) {
      values = sortArrayOfObjectsByValues(values);
    }

    docFragment.appendChild(createCard(label, values));
  }

  container.appendChild(docFragment);
}

function renderLHResults(stats) {
  const KEYS = {
    categories: 'Report scores',
    interactive: 'Interactivity',
  };
  const groups = {
    [KEYS.categories]: [],
    [KEYS.interactive]: [],
  };

  // Construct formatted object for rendering.
  for (const [key, val] of Object.entries(stats)) {
    const label = KEYS_TO_LABEL[key];
    if (!label) {
      continue;
    }

    if (key.endsWith('Interactive')) {
      groups[KEYS.interactive].push({label, value: formatNumber(val)});
    } else {
      groups[KEYS.categories].push({label, value: formatNumber(val)});
    }
  }

  const docFragment = new DocumentFragment();
  for (let [label, values] of Object.entries(groups)) {
    docFragment.appendChild(createCard(label, values));
  }

  const lighthouseContainer = document.querySelector('#lighthouse-results');
  lighthouseContainer.appendChild(docFragment);
  lighthouseContainer.classList.remove('loading-data');
}

function fetchData() {
  fetch('/data?2017-06-27').then(resp => resp.json()).then(stats => {
    document.querySelector('#date').textContent = stats.latestFetchDate;

    const mobileContainer = document.querySelector('#mobile-results');
    render(stats.mobile, mobileContainer);
    mobileContainer.classList.remove('loading-data');

    const desktopContainer = document.querySelector('#desktop-results');
    render(stats.desktop, desktopContainer);
    desktopContainer.classList.remove('loading-data');

    renderLHResults(stats.lighthouse);
  });
}

fetchData();
