const statusEl = document.getElementById('system-status');
statusEl.classList.add('status-pill');

const grid = GridStack.init({
  float: true,
  column: 12,
  minRow: 3,
  cellHeight: 120,
  disableOneColumnMode: true,
  margin: 6,
});

const widgetElements = new Map();
const intervalHandles = new Map();

initDashboard();

async function initDashboard() {
  await updateSystemStatus();
  setInterval(updateSystemStatus, 30000);

  try {
    const [widgets, serverLayout] = await Promise.all([
      fetchJson('/api/widgets'),
      fetchJson('/api/layout'),
    ]);

    const localLayout = readLocalLayout();
    const layoutById = new Map();
    (Array.isArray(serverLayout) ? serverLayout : []).forEach((entry) => {
      layoutById.set(entry.id, entry);
    });
    (Array.isArray(localLayout) ? localLayout : []).forEach((entry) => {
      layoutById.set(entry.id, entry);
    });

    widgets.forEach((widget, index) => {
      const layout = layoutById.get(widget.id) || widget.layout || {};
      const { element, body, meta } = createWidgetElement(widget);
      widgetElements.set(widget.id, { body, meta });

      grid.addWidget(element, {
        id: widget.id,
        x: layout.x ?? (index * 4) % 12,
        y: layout.y ?? Math.floor((index * 4) / 12) * 3,
        w: layout.w ?? widget.layout?.w ?? 4,
        h: layout.h ?? widget.layout?.h ?? 3,
        minW: 3,
        minH: 2,
      });

      initializeWidget(widget);
    });

    grid.on('change', debounce(persistLayout, 500));
  } catch (error) {
    console.error('Failed to initialize dashboard', error);
    statusEl.textContent = 'ERROR INITIALIZING';
  }
}

function createWidgetElement(widget) {
  const wrapper = document.createElement('div');
  wrapper.dataset.widgetId = widget.id;

  const content = document.createElement('div');
  content.classList.add('grid-stack-item-content', 'widget');

  const header = document.createElement('div');
  header.classList.add('widget-header');

  const title = document.createElement('div');
  title.textContent = widget.title || widget.type;

  const meta = document.createElement('div');
  meta.classList.add('widget-header__meta', 'status-pill');
  meta.textContent = 'SYNCING';

  const body = document.createElement('div');
  body.classList.add('widget-body');
  body.innerHTML = '<div class="status-pill">Loading</div>';

  header.append(title, meta);
  content.append(header, body);
  wrapper.append(content);

  return { element: wrapper, body, meta };
}

function initializeWidget(widget) {
  const renderer = widgetRenderers[widget.type];
  if (!renderer) {
    const { body, meta } = widgetElements.get(widget.id) || {};
    if (body) {
      body.innerHTML = `<p class="error-message">Unsupported widget type: ${widget.type}</p>`;
    }
    if (meta) {
      meta.textContent = 'UNSUPPORTED';
    }
    return;
  }

  renderer(widget);
}

const widgetRenderers = {
  bitcoin: (widget) => {
    const { body, meta } = widgetElements.get(widget.id);
    const refreshInterval = Number(widget.config?.refreshInterval ?? 60000);

    const load = async () => {
      try {
        const data = await fetchJson(`/api/bitcoin?id=${encodeURIComponent(widget.id)}`);
        const formattedPrice = formatCurrency(data.price, data.currency);
        body.innerHTML = `
          <div class="bitcoin-price">${formattedPrice}</div>
          <div class="bitcoin-meta">Source: ${data.source.toUpperCase()}</div>
        `;
        meta.textContent = `UPDATED ${formatTime(data.fetchedAt)}`;
      } catch (error) {
        body.innerHTML = `<p class="error-message">${error.message}</p>`;
        meta.textContent = 'ERROR';
      }
    };

    load();
    registerInterval(widget.id, setInterval(load, refreshInterval));
  },
  calendar: (widget) => {
    const { body, meta } = widgetElements.get(widget.id);
    const refreshInterval = Number(widget.config?.refreshInterval ?? 300000);

    const load = async () => {
      try {
        const data = await fetchJson(`/api/calendar?id=${encodeURIComponent(widget.id)}`);
        if (!data.events || data.events.length === 0) {
          body.innerHTML = '<p>No upcoming events.</p>';
        } else {
          body.innerHTML = data.events
            .map((event) => {
              const start = formatEventDate(event.start, event.allDay);
              return `
                <div class="event-item">
                  <div class="event-item__time">${start}</div>
                  <div class="event-item__summary">${event.summary}</div>
                  ${event.location ? `<div class="event-item__location">${event.location}</div>` : ''}
                </div>
              `;
            })
            .join('');
        }
        meta.textContent = `SYNC ${formatTime(new Date().toISOString())}`;
      } catch (error) {
        body.innerHTML = `<p class="error-message">${error.message}</p>`;
        meta.textContent = 'ERROR';
      }
    };

    load();
    registerInterval(widget.id, setInterval(load, refreshInterval));
  },
  finance: (widget) => {
    const { body, meta } = widgetElements.get(widget.id);
    const refreshInterval = Number(widget.config?.refreshInterval ?? 300000);
    const limit = Number(widget.config?.limit ?? 5);

    const load = async () => {
      try {
        const data = await fetchJson(`/api/finance?id=${encodeURIComponent(widget.id)}&limit=${limit}`);
        if (!data.transactions || data.transactions.length === 0) {
          body.innerHTML = '<p>No recent transactions found.</p>';
        } else {
          const headers = data.headers || Object.keys(data.transactions[0] || {});
          body.innerHTML = `
            <table>
              <thead>
                <tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${data.transactions
                  .map(
                    (transaction) => `
                      <tr>
                        ${headers.map((header) => `<td>${transaction[header] ?? ''}</td>`).join('')}
                      </tr>
                    `
                  )
                  .join('')}
              </tbody>
            </table>
          `;
        }
        meta.textContent = `SYNC ${formatTime(new Date().toISOString())}`;
      } catch (error) {
        if (error.status === 428 && error.payload?.authorizationUrl) {
          body.innerHTML = `
            <p class="error-message">${error.message}</p>
            <p><a href="${error.payload.authorizationUrl}" target="_blank" rel="noreferrer">Complete Authorization</a></p>
          `;
        } else {
          body.innerHTML = `<p class="error-message">${error.message}</p>`;
        }
        meta.textContent = 'AUTH REQUIRED';
      }
    };

    load();
    registerInterval(widget.id, setInterval(load, refreshInterval));
  },
};

function registerInterval(id, handle) {
  if (intervalHandles.has(id)) {
    clearInterval(intervalHandles.get(id));
  }
  intervalHandles.set(id, handle);
}

async function persistLayout() {
  const nodes = grid.engine.nodes || [];
  const layout = nodes.map((node) => ({
    id: node.id || node.el?.dataset.widgetId,
    x: node.x,
    y: node.y,
    w: node.w,
    h: node.h,
  }));

  try {
    localStorage.setItem('nervdash-layout', JSON.stringify(layout));
  } catch (error) {
    console.warn('Unable to persist layout in localStorage', error);
  }

  try {
    const response = await fetch('/api/layout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(layout),
    });

    if (!response.ok) {
      console.warn('Server rejected layout persistence request', response.status, response.statusText);
    }
  } catch (error) {
    console.warn('Unable to persist layout to server', error);
  }
}

function readLocalLayout() {
  try {
    const raw = localStorage.getItem('nervdash-layout');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Unable to read layout from localStorage', error);
    return null;
  }
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') || '';
  let data = null;

  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const error = new Error((data && data.message) || response.statusText || 'Request failed');
    error.status = response.status;
    if (data && typeof data === 'object') {
      error.payload = data;
    }
    throw error;
  }

  return data;
}

async function updateSystemStatus() {
  try {
    const health = await fetchJson('/api/health');
    statusEl.textContent = `ONLINE :: ${formatTime(health.time)}`;
  } catch (error) {
    statusEl.textContent = 'OFFLINE';
  }
}

function formatCurrency(value, currency) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch (error) {
    return `${value} ${currency}`;
  }
}

function formatTime(timestamp) {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatEventDate(timestamp, allDay = false) {
  const date = new Date(timestamp);
  const options = allDay
    ? { weekday: 'short', month: 'short', day: 'numeric' }
    : { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return date.toLocaleString([], options);
}

function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(null, args), delay);
  };
}

window.addEventListener('beforeunload', () => {
  intervalHandles.forEach((handle) => clearInterval(handle));
  intervalHandles.clear();
});
