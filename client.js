window.__ModuleLoader__.load({
  id: '@local/stats-cost',
  factory(require) {
    const React = require('react');
    const createPortal = require('react-dom').createPortal;
    const h = React.createElement;
    const useState = React.useState;
    const useEffect = React.useEffect;
    const useSyncExternalStore = React.useSyncExternalStore;
    const NS = 'statsCost';
    const STORAGE_KEY = 'dsh.stats.costPrices.v1';
    const CURRENCY = '¥';

    // ------------------------------------------------------------------
    // Locale dictionaries (zh is the key-set source of truth).
    // ------------------------------------------------------------------
    const zh = {
      'view.cost': '成本',
      'dock.cost': '成本',
      'dialog.cost': '成本统计',
      'turn.title': '本轮成本',
      'section.prices': '单价（每百万 token）',
      'section.usage': '本次对话',
      'price.input': '输入（未缓存）',
      'price.cache': '输入（缓存）',
      'price.output': '输出',
      'price.unit': '¥ / 1M',
      'price.per': '1M',
      'hint.write': '缓存写入按未缓存输入的单价计费。',
      'usage.input': '未缓存输入',
      'usage.cache': '缓存读取',
      'usage.write': '缓存写入',
      'usage.output': '输出',
      'usage.total': '总成本',
      'col.tokens': 'Tokens',
      'col.cost': '成本',
      'na': '—'
    };
    const en = {
      'view.cost': 'Cost',
      'dock.cost': 'Cost',
      'dialog.cost': 'Cost details',
      'turn.title': 'Turn cost',
      'section.prices': 'Prices (per million tokens)',
      'section.usage': 'This conversation',
      'price.input': 'Input (uncached)',
      'price.cache': 'Input (cached)',
      'price.output': 'Output',
      'price.unit': '¥ / 1M',
      'price.per': '1M',
      'hint.write': 'Cache writes are billed at the uncached input price.',
      'usage.input': 'Uncached input',
      'usage.cache': 'Cache reads',
      'usage.write': 'Cache writes',
      'usage.output': 'Output',
      'usage.total': 'Total cost',
      'col.tokens': 'Tokens',
      'col.cost': 'Cost',
      'na': '—'
    };
    const ja = {
      'view.cost': 'コスト',
      'dock.cost': 'コスト',
      'dialog.cost': 'コスト統計',
      'turn.title': 'このターンのコスト',
      'section.prices': '料金（100万トークンあたり）',
      'section.usage': 'この会話',
      'price.input': '入力（非キャッシュ）',
      'price.cache': '入力（キャッシュ）',
      'price.output': '出力',
      'price.unit': '¥ / 1M',
      'price.per': '1M',
      'hint.write': 'キャッシュ書き込みは非キャッシュ入力の単価で計算します。',
      'usage.input': '非キャッシュ入力',
      'usage.cache': 'キャッシュ読み取り',
      'usage.write': 'キャッシュ書き込み',
      'usage.output': '出力',
      'usage.total': '合計コスト',
      'col.tokens': 'トークン',
      'col.cost': 'コスト',
      'na': '—'
    };
    const de = {
      'view.cost': 'Kosten',
      'dock.cost': 'Kosten',
      'dialog.cost': 'Kostendetails',
      'turn.title': 'Kosten dieses Turns',
      'section.prices': 'Preise (pro Million Tokens)',
      'section.usage': 'Dieses Gespräch',
      'price.input': 'Eingabe (nicht gecacht)',
      'price.cache': 'Eingabe (gecacht)',
      'price.output': 'Ausgabe',
      'price.unit': '¥ / 1M',
      'price.per': '1M',
      'hint.write': 'Cache-Writes werden zum Preis der nicht gecachten Eingabe berechnet.',
      'usage.input': 'Nicht gecachte Eingabe',
      'usage.cache': 'Cache-Lesezugriffe',
      'usage.write': 'Cache-Schreibzugriffe',
      'usage.output': 'Ausgabe',
      'usage.total': 'Gesamtkosten',
      'col.tokens': 'Tokens',
      'col.cost': 'Kosten',
      'na': '—'
    };
    const es = {
      'view.cost': 'Coste',
      'dock.cost': 'Coste',
      'dialog.cost': 'Costes',
      'turn.title': 'Coste de este turno',
      'section.prices': 'Precios (por millón de tokens)',
      'section.usage': 'Esta conversación',
      'price.input': 'Entrada (sin caché)',
      'price.cache': 'Entrada (con caché)',
      'price.output': 'Salida',
      'price.unit': '¥ / 1M',
      'price.per': '1M',
      'hint.write': 'Las escrituras en caché se facturan al precio de entrada sin caché.',
      'usage.input': 'Entrada sin caché',
      'usage.cache': 'Lecturas de caché',
      'usage.write': 'Escrituras en caché',
      'usage.output': 'Salida',
      'usage.total': 'Coste total',
      'col.tokens': 'Tokens',
      'col.cost': 'Coste',
      'na': '—'
    };
    const fr = {
      'view.cost': 'Coût',
      'dock.cost': 'Coût',
      'dialog.cost': 'Détails du coût',
      'turn.title': 'Coût de ce tour',
      'section.prices': 'Tarifs (par million de jetons)',
      'section.usage': 'Cette conversation',
      'price.input': 'Entrée (non en cache)',
      'price.cache': 'Entrée (en cache)',
      'price.output': 'Sortie',
      'price.unit': '¥ / 1M',
      'price.per': '1M',
      'hint.write': "Les écritures en cache sont facturées au tarif d'entrée non en cache.",
      'usage.input': 'Entrée non en cache',
      'usage.cache': 'Lectures du cache',
      'usage.write': 'Écritures du cache',
      'usage.output': 'Sortie',
      'usage.total': 'Coût total',
      'col.tokens': 'Jetons',
      'col.cost': 'Coût',
      'na': '—'
    };
    const pt = {
      'view.cost': 'Custo',
      'dock.cost': 'Custo',
      'dialog.cost': 'Custos',
      'turn.title': 'Custo desta rodada',
      'section.prices': 'Preços (por milhão de tokens)',
      'section.usage': 'Esta conversa',
      'price.input': 'Entrada (sem cache)',
      'price.cache': 'Entrada (com cache)',
      'price.output': 'Saída',
      'price.unit': '¥ / 1M',
      'price.per': '1M',
      'hint.write': 'Escrituras em cache são cobradas pelo preço de entrada sem cache.',
      'usage.input': 'Entrada sem cache',
      'usage.cache': 'Leituras de cache',
      'usage.write': 'Escrituras de cache',
      'usage.output': 'Saída',
      'usage.total': 'Custo total',
      'col.tokens': 'Tokens',
      'col.cost': 'Custo',
      'na': '—'
    };
    const ru = {
      'view.cost': 'Стоимость',
      'dock.cost': 'Стоимость',
      'dialog.cost': 'Сводка стоимости',
      'turn.title': 'Стоимость хода',
      'section.prices': 'Цены (за миллион токенов)',
      'section.usage': 'Эта беседа',
      'price.input': 'Вход (без кэша)',
      'price.cache': 'Вход (из кэша)',
      'price.output': 'Выход',
      'price.unit': '¥ / 1M',
      'price.per': '1M',
      'hint.write': 'Записи в кэш тарифицируются по цене входа без кэша.',
      'usage.input': 'Вход без кэша',
      'usage.cache': 'Чтение кэша',
      'usage.write': 'Запись в кэш',
      'usage.output': 'Выход',
      'usage.total': 'Итоговая стоимость',
      'col.tokens': 'Токены',
      'col.cost': 'Стоимость',
      'na': '—'
    };

    // ------------------------------------------------------------------
    // Styles: host theme tokens only; classes carry the scst_ prefix.
    // ------------------------------------------------------------------
    const CSS = [
      '.scst_root{box-sizing:border-box;display:flex;flex-direction:column;gap:20px;height:100%;overflow:auto;padding:16px 20px;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-primary)}',
      '.scst_title{margin:0 0 10px;font:var(--dsw-font-xs-strong-13);color:var(--dsw-alias-label-secondary)}',
      '.scst_prices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}',
      '.scst_price{display:flex;flex-direction:column;gap:6px}',
      '.scst_priceLabel{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-secondary)}',
      '.scst_priceField{display:flex;align-items:center;gap:8px}',
      '.scst_priceInput{box-sizing:border-box;width:100%;min-width:0;padding:5px 8px;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l2);border-radius:6px;outline:none}',
      '.scst_priceInput:focus{border-color:var(--dsw-alias-brand-primary)}',
      '.scst_priceInput::placeholder{color:var(--dsw-alias-label-secondary)}',
      '.scst_priceUnit{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-secondary);white-space:nowrap}',
      '.scst_hint{margin:10px 0 0;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-secondary)}',
      '.scst_table{width:100%;max-width:720px;border-collapse:collapse;font:var(--dsw-font-xs-13)}',
      '.scst_table th{box-sizing:border-box;padding:6px 8px;text-align:left;font:var(--dsw-font-xxs-12);font-weight:500;color:var(--dsw-alias-label-secondary);border-bottom:.5px solid var(--dsw-alias-border-l2)}',
      '.scst_table td{box-sizing:border-box;padding:7px 8px;border-bottom:.5px solid var(--dsw-alias-border-l1)}',
      '.scst_num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}',
      '.scst_tokens{color:var(--dsw-alias-label-secondary)}',
      '.scst_totalRow td{border-bottom:none;border-top:1px solid var(--dsw-alias-border-l2);font:var(--dsw-font-xs-strong-13)}',
      '.scst_totalCost{color:var(--dsw-alias-brand-primary)}',
      // Composer dock pill + portaled details dialog. Token usage mirrors the
      // shipped StatsPills/stat-dialog modules so the pill sits in the dock row.
      '.scst_anchor{min-width:0;font-size:calc(var(--dsh-content-font-size-secondary,13px) - 1px);line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px));display:inline-flex}',
      '.scst_pill{box-sizing:border-box;border-radius:var(--dsw-radius-sm);max-width:100%;color:var(--dsw-alias-label-tertiary);font:inherit;font-variant-numeric:tabular-nums;line-height:inherit;white-space:nowrap;background:0 0;border:none;align-items:center;gap:6px;padding:1px 8px;display:inline-flex;cursor:pointer}',
      '.scst_pill svg{flex:none;width:14px;height:14px}',
      '.scst_pill[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}',
      '@media (hover:hover){.scst_pill:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}}',
      '.scst_pillLabel{text-overflow:ellipsis;min-width:0;overflow:hidden}',
      // Per-turn chip in the completed-turn action row (same row as the shipped
      // turn-usage pill); type/color match the row's end info span.
      '.scst_turnChip{align-items:center;gap:4px;color:var(--dsw-alias-label-tertiary);font-size:calc(var(--dsh-content-font-size-secondary,13px) - 1px);font-variant-numeric:tabular-nums;line-height:calc(24px + var(--dsh-content-font-delta,0px));white-space:nowrap;display:inline-flex}',
      '.scst_turnChip svg{flex:none;width:14px;height:14px}',
      '.scst_panel{z-index:1100;box-sizing:border-box;width:max-content;min-width:min(280px, calc(100vw - 24px));max-width:min(440px, calc(100vw - 24px));border-radius:var(--dsw-radius-lg);background:var(--dsw-specific-menu);backdrop-filter:var(--dsw-menu-backdrop-filter);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);box-shadow:var(--dsw-elevation-prominent);color:var(--dsw-alias-label-secondary);cursor:default;max-height:var(--dsh-anchored-max-height,none);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border:0;padding:16px;font-size:12px;line-height:18px;position:fixed;overflow:hidden auto}',
      '.scst_panelTitle{color:var(--dsw-alias-label-primary);justify-content:space-between;gap:16px;margin-bottom:8px;font-weight:500;display:flex}',
      '.scst_panelRule{border-top:.5px solid var(--dsw-alias-border-l2);margin-bottom:10px}',
      '.scst_panelTitleLabel{align-items:center;gap:6px;min-width:0;display:inline-flex}',
      '.scst_panelTitleLabel svg{flex:none;width:14px;height:14px}',
      '.scst_details{color:var(--dsw-alias-label-tertiary);grid-template-columns:minmax(76px,auto) minmax(0,1fr);gap:6px 16px;margin:0;display:grid}',
      '.scst_details dt,.scst_details dd{min-width:0;margin:0}',
      '.scst_details dd{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;text-align:right}',
      '.scst_totalValue{color:var(--dsw-alias-brand-primary);font-weight:500}'
    ].join('\n');

    // ------------------------------------------------------------------
    // Price persistence (raw input strings; parsed at use time).
    // ------------------------------------------------------------------
    const EMPTY_PRICES = { input: '', cache: '', output: '' };
    function readPrices() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw === null) return { ...EMPTY_PRICES };
        const parsed = JSON.parse(raw);
        if (parsed === null || typeof parsed !== 'object') return { ...EMPTY_PRICES };
        const out = {};
        for (const key of ['input', 'cache', 'output']) {
          const value = parsed[key];
          out[key] = typeof value === 'string' ? value : '';
        }
        return out;
      } catch (_error) {
        return { ...EMPTY_PRICES };
      }
    }
    function writePrices(prices) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prices));
      } catch (_error) {
        // Storage unavailable (quota/private mode): prices stay session-local.
      }
    }
    // Revision store so already-rendered cost chips re-read localStorage
    // when the price fields change (the session projections stay stale once
    // a turn has completed).
    const priceListeners = new Set();
    let priceRevision = 0;
    const subscribePriceRevision = (listener) => {
      priceListeners.add(listener);
      return () => {
        priceListeners.delete(listener);
      };
    };
    const getPriceRevision = () => priceRevision;
    function bumpPriceRevision() {
      priceRevision += 1;
      for (const listener of [...priceListeners]) listener();
    }
    function usePriceRevision() {
      return useSyncExternalStore(subscribePriceRevision, getPriceRevision);
    }
    /** Parse a raw price input: a finite non-negative number, or null. */
    function parsePrice(raw) {
      if (raw === '') return null;
      const value = Number(raw);
      return Number.isFinite(value) && value >= 0 ? value : null;
    }

    // ------------------------------------------------------------------
    // Number formatting.
    // ------------------------------------------------------------------
    function formatTokens(value) {
      if (value === null || !Number.isFinite(value)) return '—';
      if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
      if (value >= 1e4) return (value / 1e3).toFixed(1) + 'k';
      return String(value);
    }
    function formatTokensFull(value) {
      if (value === null || !Number.isFinite(value)) return '';
      return value.toLocaleString();
    }
    function formatCost(value) {
      if (value === null || !Number.isFinite(value)) return null;
      if (value === 0) return '0.00';
      if (value < 0.005) return '<0.01';
      if (value >= 10000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
      return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // ------------------------------------------------------------------
    // The Cost view: price inputs plus whole-conversation token cost.
    // Whole-conversation totals come from the host projections
    // (tokenUsage, sessionStats), which cover the complete session log,
    // not just the loaded window.
    // ------------------------------------------------------------------
    function PriceField({ labelKey, unitKey, value, onChange, t }) {
      return h('label', { className: 'scst_price' },
        h('span', { className: 'scst_priceLabel' }, t(labelKey)),
        h('span', { className: 'scst_priceField' },
          h('input', {
            className: 'scst_priceInput',
            type: 'number',
            step: 'any',
            min: '0',
            inputMode: 'decimal',
            value: value,
            placeholder: '0',
            onChange: (event) => onChange(event.target.value)
          }),
          h('span', { className: 'scst_priceUnit' }, t(unitKey))
        )
      );
    }

    function CostView({ useProjection, t }) {
      const usage = useProjection('tokenUsage');
      const stats = useProjection('sessionStats');
      const [prices, setPrices] = useState(readPrices);
      useEffect(() => {
        writePrices(prices);
        bumpPriceRevision();
      }, [prices]);
      const setPrice = (key) => (raw) => setPrices((current) => ({ ...current, [key]: raw }));

      const priceInput = parsePrice(prices.input);
      const priceCache = parsePrice(prices.cache);
      const priceOutput = parsePrice(prices.output);
      // Cache writes carry prompt tokens billed at the uncached input rate.
      const priceWrite = priceInput;

      const ready = usage !== void 0;
      const hasSteps = stats !== void 0 && stats.steps > 0;
      // No step has reported yet: the session has no usage, show "—" like the host totals row.
      const measured = ready && hasSteps;
      const rows = [];
      if (measured) {
        rows.push({ key: 'usage.input', tokens: usage.uncachedInputTokens, cost: costOf(usage.uncachedInputTokens, priceInput) });
        rows.push({ key: 'usage.cache', tokens: usage.cacheReadTokens, cost: costOf(usage.cacheReadTokens, priceCache) });
        rows.push({ key: 'usage.write', tokens: usage.cacheWriteTokens, cost: costOf(usage.cacheWriteTokens, priceWrite) });
        rows.push({ key: 'usage.output', tokens: usage.outputTokens, cost: costOf(usage.outputTokens, priceOutput) });
      }
      const totalTokens = measured ? usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens + usage.outputTokens : null;
      let totalCost = null;
      for (const row of rows) {
        if (row.cost !== null) totalCost = (totalCost ?? 0) + row.cost;
      }
      const na = t('na');
      const costCell = (value) => {
        const formatted = formatCost(value);
        return h('td', { className: 'scst_num' }, formatted === null ? na : `${CURRENCY} ${formatted}`);
      };

      return h('div', { className: 'scst_root' },
        h('section', null,
          h('h3', { className: 'scst_title' }, t('section.prices')),
          h('div', { className: 'scst_prices' },
            h(PriceField, { labelKey: 'price.input', unitKey: 'price.unit', value: prices.input, onChange: setPrice('input'), t }),
            h(PriceField, { labelKey: 'price.cache', unitKey: 'price.unit', value: prices.cache, onChange: setPrice('cache'), t }),
            h(PriceField, { labelKey: 'price.output', unitKey: 'price.unit', value: prices.output, onChange: setPrice('output'), t })
          ),
          h('p', { className: 'scst_hint' }, t('hint.write'))
        ),
        h('section', null,
          h('h3', { className: 'scst_title' }, t('section.usage')),
          h('table', { className: 'scst_table' },
            h('thead', null,
              h('tr', null,
                h('th', null, ''),
                h('th', { className: 'scst_num' }, t('col.tokens')),
                h('th', { className: 'scst_num' }, t('col.cost'))
              )
            ),
            h('tbody', null, measured
              ? rows.map((row) => h('tr', { key: row.key },
                  h('td', null, t(row.key)),
                  h('td', { className: 'scst_num scst_tokens', title: formatTokensFull(row.tokens) }, formatTokens(row.tokens)),
                  costCell(row.cost))
                )
              : h('tr', null,
                  h('td', { colSpan: 3, className: 'scst_hint' }, na))),
            h('tfoot', null,
              h('tr', { className: 'scst_totalRow' },
                h('td', null, t('usage.total')),
                h('td', { className: 'scst_num scst_tokens', title: formatTokensFull(totalTokens) }, formatTokens(totalTokens)),
                h('td', { className: 'scst_num scst_totalCost' }, (() => {
                  const formatted = formatCost(totalCost);
                  return formatted === null ? na : `${CURRENCY} ${formatted}`;
                })())
              )
            )
          )
        )
      );
    }

    // tokens × per-million price → cost
    function costOf(tokens, price) {
      if (tokens === null || price === null) return null;
      return tokens * price / 1e6;
    }

    // ------------------------------------------------------------------
    // Composer dock pill: live total cost in the dock row beside the
    // speed/usage pills; clicking opens a portaled details dialog that
    // mirrors the shipped session-statistics dialog.
    // ------------------------------------------------------------------
    const PANEL_MARGIN = 12;
    const PANEL_GAP = 8;
    const MEASURE_STYLE = { visibility: 'hidden', left: 0, top: 0 };

    /** One trigger-anchored dialog seat: open state, viewport-clamped placement, outside close. */
    function useCostDialog() {
      const [open, setOpen] = useState(false);
      const [pos, setPos] = useState(null);
      const rootRef = React.useRef(null);
      const panelRef = React.useRef(null);
      useEffect(() => {
        if (!open) {
          setPos(null);
          return;
        }
        let frame = 0;
        const place = () => {
          const root = rootRef.current;
          const panel = panelRef.current;
          if (root === null || panel === null) return;
          const rect = root.getBoundingClientRect();
          let left = rect.left + rect.width / 2 - panel.offsetWidth / 2;
          left = Math.max(PANEL_MARGIN, Math.min(left, window.innerWidth - PANEL_MARGIN - panel.offsetWidth));
          if (left < PANEL_MARGIN) left = PANEL_MARGIN;
          let top = rect.top - PANEL_GAP - panel.offsetHeight;
          if (top < PANEL_MARGIN) top = rect.bottom + PANEL_GAP;
          setPos({ left: left, top: top });
        };
        frame = window.requestAnimationFrame(place);
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setOpen(false);
        };
        const onPointerDown = (event) => {
          const target = event.target;
          if (target instanceof Node
            && rootRef.current !== null
            && panelRef.current !== null
            && rootRef.current.contains(target) !== true
            && panelRef.current.contains(target) !== true) {
            setOpen(false);
          }
        };
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('pointerdown', onPointerDown, true);
        return () => {
          window.cancelAnimationFrame(frame);
          document.removeEventListener('keydown', onKeyDown);
          document.removeEventListener('pointerdown', onPointerDown, true);
        };
      }, [open]);
      return { open, toggle: () => setOpen(!open), rootRef, panelRef, pos };
    }

    function costIcon() {
      return h('svg', {
        viewBox: '0 0 16 16',
        width: 14,
        height: 14,
        'aria-hidden': true
      }, h('path', {
        d: 'M4 2l4 5 4-5M4.6 6.5h6.8M4.6 9h6.8M8 6.5v7.5',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: '1.4',
        strokeLinecap: 'round'
      }));
    }

    function CostPill({ useProjection, t }) {
      usePriceRevision();
      const usage = useProjection('tokenUsage');
      const stats = useProjection('sessionStats');
      const prices = readPrices();
      const priceInput = parsePrice(prices.input);
      const priceCache = parsePrice(prices.cache);
      const priceOutput = parsePrice(prices.output);
      const measured = usage !== void 0 && stats !== void 0 && stats.steps > 0;
      const na = t('na');
      // Each row pairs the live per-category cost with the actual tokens
      // that produced it, dot-separated — "amount · usage": both come from
      // the projections and track the conversation in real time.
      const count = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
      const rows = [
        { label: 'price.cache', tokens: count(usage?.cacheReadTokens), price: priceCache },
        { label: 'price.input', tokens: count(usage?.uncachedInputTokens) + count(usage?.cacheWriteTokens), price: priceInput },
        { label: 'price.output', tokens: count(usage?.outputTokens), price: priceOutput }
      ];
      const rowText = (row) => {
        if (!measured) return na;
        const costText = formatCost(costOf(row.tokens, row.price));
        return `${costText === null ? na : `${CURRENCY} ${costText}`} · ${formatTokens(row.tokens)}`;
      };
      // Cache writes carry prompt tokens billed at the uncached input rate.
      const priced = rows.map((row) => costOf(row.tokens, row.price)).filter((value) => value !== null && Number.isFinite(value));
      const total = measured && priced.length > 0 ? priced.reduce((sum, value) => sum + value, 0) : null;
      const { open, toggle, rootRef, panelRef, pos } = useCostDialog();
      const totalText = formatCost(total);
      const panel = open ? createPortal(h('div', {
        ref: panelRef,
        className: 'scst_panel',
        role: 'dialog',
        'aria-label': t('dialog.cost'),
        style: pos === null ? MEASURE_STYLE : pos
      },
        h('div', { className: 'scst_panelTitle' },
          h('span', { className: 'scst_panelTitleLabel' }, costIcon(), t('dialog.cost'))),
        h('div', { className: 'scst_panelRule', 'aria-hidden': true }),
        h('dl', { className: 'scst_details' },
          h('dt', null, t('price.cache')),
          h('dd', null, rowText(rows[0])),
          h('dt', null, t('price.input')),
          h('dd', null, rowText(rows[1])),
          h('dt', null, t('price.output')),
          h('dd', null, rowText(rows[2])),
          h('dt', null, t('usage.total')),
          h('dd', { className: total === null ? null : 'scst_totalValue' }, total === null ? na : `${CURRENCY} ${totalText}`)
        )
      ), document.body) : null;
      return h('span', { ref: rootRef, className: 'scst_anchor' },
        h('button', {
          type: 'button',
          className: 'scst_pill',
          'aria-haspopup': 'dialog',
          'aria-expanded': open,
          'aria-label': t('dialog.cost'),
          title: t('dialog.cost'),
          onClick: toggle
        },
          costIcon(),
          h('span', { className: 'scst_pillLabel' }, totalText === null ? na : totalText)
        ),
        panel
      );
    }

    // ------------------------------------------------------------------
    // Per-turn cost chip: sits in each completed turn's action row (the
    // conversation.chat.assistant-actions seat renders inline in that row,
    // beside the shipped 本轮用量 pill). The per-turn token bucket is the
    // turn-tail node's data.tokenUsage, located through the chat snapshot
    // by the turn's closing assistant message id.
    // ------------------------------------------------------------------
    function TurnCostChip({ useChat, messageId, t }) {
      const usage = useChat((snapshot) => {
        const nodes = snapshot.nodes.values();
        for (let i = nodes.length - 1; i >= 0; i -= 1) {
          const node = nodes[i];
          if (node.kind === 'turn-tail'
            && node.data.closing !== null
            && node.data.closing.finalNode.messageId === messageId) {
            return node.data.tokenUsage;
          }
        }
        return undefined;
      });
      usePriceRevision();
      if (usage === void 0) return null;
      const prices = readPrices();
      const priceInput = parsePrice(prices.input);
      const priceCache = parsePrice(prices.cache);
      const priceOutput = parsePrice(prices.output);
      // The per-turn bucket only carries cacheReadTokens / cacheWriteTokens
      // when they are provable for every step; a missing field means "none".
      const count = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
      // Cache writes carry prompt tokens billed at the uncached input rate.
      const parts = [
        costOf(count(usage.uncachedInputTokens) + count(usage.cacheWriteTokens), priceInput),
        costOf(count(usage.cacheReadTokens), priceCache),
        costOf(count(usage.outputTokens), priceOutput)
      ];
      const priced = parts.filter((value) => value !== null && Number.isFinite(value));
      const total = priced.length > 0 ? priced.reduce((sum, value) => sum + value, 0) : null;
      const text = formatCost(total);
      return h('span', {
        className: 'scst_turnChip',
        title: t('turn.title'),
        'aria-label': `${t('turn.title')}: ${text === null ? t('na') : `${CURRENCY} ${text}`}`
      },
        costIcon(),
        h('span', null, text === null ? t('na') : text)
      );
    }

    // ------------------------------------------------------------------
    // Plugin body.
    // ------------------------------------------------------------------
    function injectStyle() {
      const tagId = '@local/stats-cost/cost.css';
      let tag = document.querySelector(`style[data-plugin-css="${tagId}"]`);
      if (tag === null) {
        tag = document.createElement('style');
        tag.setAttribute('data-plugin-css', tagId);
        document.head.appendChild(tag);
      }
      tag.textContent = CSS;
      return () => {
        if (tag.parentNode !== null) tag.parentNode.removeChild(tag);
      };
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, {
        zh,
        en,
        ja,
        de,
        es,
        fr,
        pt,
        ru
      }), 'stats-cost: dictionaries');
      ctx.effect(() => injectStyle(), 'stats-cost: styles');
      const t = ctx.locale.bind(NS);
      ctx.slots.inject('conversation.view', () => ctx.slots.register({
        name: 'conversation.view',
        id: 'cost',
        order: 45,
        locale: NS,
        label: () => t('view.cost')
      }, CostView));
      ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
        name: 'conversation.composer.dock',
        id: 'cost',
        order: 2,
        locale: NS,
        label: () => t('dock.cost')
      }, CostPill));
      ctx.slots.inject('conversation.chat.assistant-actions', () => ctx.slots.register({
        name: 'conversation.chat.assistant-actions',
        id: 'cost',
        order: 20,
        locale: NS,
        label: () => t('dock.cost')
      }, TurnCostChip));
    }

    return {
      inject: ['slots', 'locale'],
      apply
    };
  }
});