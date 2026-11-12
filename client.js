window.__ModuleLoader__.load({
  id: '@local/stats-cost',
  factory(require) {
    const React = require('react');
    const createPortal = require('react-dom').createPortal;
    const h = React.createElement;
    const useState = React.useState;
    const useEffect = React.useEffect;
    const useSyncExternalStore = React.useSyncExternalStore;
    const {
      SettingsFormModel,
      settingsNumberField,
      SettingsForm,
      SettingsValueField
    } = require('@deepseek-ai/dsh-client-ui-primitives');
    const NS = 'statsCost';
    // The settings namespace this plugin's host Config registers (the
    // profile entry id), and the plugin-manager ledger keys: the bundle's
    // own config section (rendered on the bundle's detail page) and the
    // row's configure control.
    const SETTINGS_NS = 'stats-cost';
    const BUNDLE_CONFIG_KEY = '@local/stats-cost';
    const ROW_CONFIG_KEY = '@local/stats-cost#stats-cost';
    const CURRENCY = '¥';

    // ------------------------------------------------------------------
    // Locale dictionaries (zh is the key-set source of truth).
    // ------------------------------------------------------------------
    const zh = {
      'dock.cost': '成本',
      'dialog.cost': '成本统计',
      'turn.title': '本轮成本',
      'price.input': '输入（未缓存）',
      'price.cache': '输入（缓存）',
      'price.output': '输出',
      'price.inputHint': '每百万未缓存输入 token 的单价。',
      'price.cacheHint': '每百万缓存输入（读取）token 的单价。',
      'price.outputHint': '每百万输出 token 的单价。',
      'usage.total': '总成本',
      'na': '—',
      'settings.description': '填写模型的单价（按每 100 万 token 计），对话中就能看到每一轮回复和整段对话花了多少钱。',
      'settings.title': '模型单价',
      'settings.writeHint': '写入缓存的内容按“输入（未缓存）”的单价计算。',
      'settings.unavailable': '设置暂时无法加载，请稍后再试。',
      'settings.readOnly': '当前环境为只读，无法保存设置。',
      'settings.save': '保存',
      'settings.saving': '保存中…',
      'settings.saveFailed': '保存失败，请修改后重试。',
      'settings.overridden': '已覆盖',
      'settings.reset': '恢复默认',
      'settings.invalidNumber': '请填数字；留空表示不定价。'
    };
    const en = {
      'dock.cost': 'Cost',
      'dialog.cost': 'Cost details',
      'turn.title': 'Turn cost',
      'price.input': 'Input (uncached)',
      'price.cache': 'Input (cached)',
      'price.output': 'Output',
      'price.inputHint': 'Price per million uncached input tokens.',
      'price.cacheHint': 'Price per million cached input (read) tokens.',
      'price.outputHint': 'Price per million output tokens.',
      'usage.total': 'Total cost',
      'na': '—',
      'settings.description': 'Enter your model prices to see what each reply and the whole conversation cost so far.',
      'settings.title': 'Model prices',
      'settings.writeHint': 'New cache writes are billed at the uncached input price.',
      'settings.unavailable': 'Settings could not be loaded right now. Please try again later.',
      'settings.readOnly': 'Settings are read-only in this environment and cannot be saved.',
      'settings.save': 'Save',
      'settings.saving': 'Saving…',
      'settings.saveFailed': 'Saving failed. Adjust the values and try again.',
      'settings.overridden': 'Overridden',
      'settings.reset': 'Reset to default',
      'settings.invalidNumber': 'Enter a number, or leave blank to leave it unpriced.'
    };
    const ja = {
      'dock.cost': 'コスト',
      'dialog.cost': 'コスト統計',
      'turn.title': 'このターンのコスト',
      'price.input': '入力（非キャッシュ）',
      'price.cache': '入力（キャッシュ）',
      'price.output': '出力',
      'price.inputHint': '100万トークンあたりの非キャッシュ入力の料金。',
      'price.cacheHint': '100万トークンあたりのキャッシュ入力（読み取り）の料金。',
      'price.outputHint': '100万トークンあたりの出力の料金。',
      'usage.total': '合計コスト',
      'na': '—',
      'settings.description': 'モデルの単価を設定すると、各ターンと会話全体のコストを確認できます。',
      'settings.title': 'モデルの単価',
      'settings.writeHint': 'キャッシュへの新しい書き込みは「入力（非キャッシュ）」の単価で計算します。',
      'settings.unavailable': '設定を読み込めませんでした。時間をおいてもう一度お試しください。',
      'settings.readOnly': 'この環境では設定が読み取り専用のため、保存できません。',
      'settings.save': '保存',
      'settings.saving': '保存中…',
      'settings.saveFailed': '保存に失敗しました。値を確認して再試行してください。',
      'settings.overridden': '上書き済み',
      'settings.reset': 'デフォルトに戻す',
      'settings.invalidNumber': '数値を入力するか、空欄のままにすると未計費になります。'
    };
    const de = {
      'dock.cost': 'Kosten',
      'dialog.cost': 'Kostendetails',
      'turn.title': 'Kosten dieses Turns',
      'price.input': 'Eingabe (nicht gecacht)',
      'price.cache': 'Eingabe (gecacht)',
      'price.output': 'Ausgabe',
      'price.inputHint': 'Preis pro Million nicht gecachter Eingabetokens.',
      'price.cacheHint': 'Preis pro Million gecachter Eingabetokens (Lesen).',
      'price.outputHint': 'Preis pro Million Ausgabetokens.',
      'usage.total': 'Gesamtkosten',
      'na': '—',
      'settings.description': 'Geben Sie die Preise Ihres Modells an, um zu sehen, was jeder Turn und das ganze Gespräch bisher gekostet haben.',
      'settings.title': 'Modelpreise',
      'settings.writeHint': 'Neue Schreibvorgänge in den Cache werden zum Preis von „Eingabe (nicht gecacht)“ berechnet.',
      'settings.unavailable': 'Die Einstellungen konnten gerade nicht geladen werden. Bitte versuchen Sie es später noch einmal.',
      'settings.readOnly': 'Die Einstellungen sind in dieser Umgebung schreibgeschützt und können nicht gespeichert werden.',
      'settings.save': 'Speichern',
      'settings.saving': 'Speichern…',
      'settings.saveFailed': 'Speichern fehlgeschlagen. Bitte korrigieren Sie die Werte und versuchen Sie es erneut.',
      'settings.overridden': 'Überschrieben',
      'settings.reset': 'Auf Standard zurücksetzen',
      'settings.invalidNumber': 'Geben Sie eine Zahl ein oder lassen Sie das Feld leer, damit kein Preis gesetzt wird.'
    };
    const es = {
      'dock.cost': 'Coste',
      'dialog.cost': 'Costes',
      'turn.title': 'Coste de este turno',
      'price.input': 'Entrada (sin caché)',
      'price.cache': 'Entrada (con caché)',
      'price.output': 'Salida',
      'price.inputHint': 'Precio por millón de tokens de entrada sin caché.',
      'price.cacheHint': 'Precio por millón de tokens de entrada con caché (lectura).',
      'price.outputHint': 'Precio por millón de tokens de salida.',
      'usage.total': 'Coste total',
      'na': '—',
      'settings.description': 'Indique los precios de su modelo para ver cuánto cuesta cada turno y toda la conversación hasta ahora.',
      'settings.title': 'Precios del modelo',
      'settings.writeHint': 'Las escrituras nuevas en caché se facturan al precio de «Entrada (sin caché)».',
      'settings.unavailable': 'No se pudieron cargar los ajustes ahora mismo. Inténtelo de nuevo más tarde.',
      'settings.readOnly': 'Los ajustes son de solo lectura en este entorno y no se pueden guardar.',
      'settings.save': 'Guardar',
      'settings.saving': 'Guardando…',
      'settings.saveFailed': 'No se pudieron guardar. Ajuste los valores e inténtelo de nuevo.',
      'settings.overridden': 'Anulado',
      'settings.reset': 'Restablecer los valores predeterminados',
      'settings.invalidNumber': 'Ingrese un número o déjelo en blanco para dejarlo sin precio.'
    };
    const fr = {
      'dock.cost': 'Coût',
      'dialog.cost': 'Détails du coût',
      'turn.title': 'Coût de ce tour',
      'price.input': 'Entrée (non en cache)',
      'price.cache': 'Entrée (en cache)',
      'price.output': 'Sortie',
      'price.inputHint': "Prix par million de jetons d'entrée non en cache.",
      'price.cacheHint': "Prix par million de jetons d'entrée en cache (lecture).",
      'price.outputHint': 'Prix par million de jetons de sortie.',
      'usage.total': 'Coût total',
      'na': '—',
      'settings.description': 'Indiquez les tarifs de votre modèle pour connaître le coût de chaque tour et de toute la conversation.',
      'settings.title': 'Tarifs du modèle',
      'settings.writeHint': "Les nouvelles écritures en cache sont facturées au tarif « Entrée (non en cache) ».",
      'settings.unavailable': 'Impossible de charger les paramètres pour le moment. Réessayez plus tard.',
      'settings.readOnly': 'Les paramètres sont en lecture seule dans cet environnement et ne peuvent pas être enregistrés.',
      'settings.save': 'Enregistrer',
      'settings.saving': 'Sauvegarde…',
      'settings.saveFailed': "L'enregistrement a échoué. Ajustez les valeurs et réessayez.",
      'settings.overridden': 'Remplacé',
      'settings.reset': 'Réinitialiser aux valeurs par défaut',
      'settings.invalidNumber': 'Entrez un nombre ou laissez ce champ vide pour le laisser sans tarif.'
    };
    const pt = {
      'dock.cost': 'Custo',
      'dialog.cost': 'Custos',
      'turn.title': 'Custo desta rodada',
      'price.input': 'Entrada (sem cache)',
      'price.cache': 'Entrada (com cache)',
      'price.output': 'Saída',
      'price.inputHint': 'Preço por milhão de tokens de entrada sem cache.',
      'price.cacheHint': 'Preço por milhão de tokens de entrada com cache (leitura).',
      'price.outputHint': 'Preço por milhão de tokens de saída.',
      'usage.total': 'Custo total',
      'na': '—',
      'settings.description': 'Informe os preços do seu modelo para ver quanto custa cada rodada e toda a conversa até agora.',
      'settings.title': 'Preços do modelo',
      'settings.writeHint': 'As novas escritas em cache são cobradas pelo preço de "Entrada (sem cache)".',
      'settings.unavailable': 'Não foi possível carregar as configurações agora. Tente novamente mais tarde.',
      'settings.readOnly': 'As configurações são somente leitura neste ambiente e não podem ser salvas.',
      'settings.save': 'Salvar',
      'settings.saving': 'Salvando…',
      'settings.saveFailed': 'Falha ao salvar. Ajuste os valores e tente novamente.',
      'settings.overridden': 'Substituído',
      'settings.reset': 'Redefinir para o padrão',
      'settings.invalidNumber': 'Insira um número ou deixe em branco para deixar sem preço.'
    };
    const ru = {
      'dock.cost': 'Стоимость',
      'dialog.cost': 'Сводка стоимости',
      'turn.title': 'Стоимость хода',
      'price.input': 'Вход (без кэша)',
      'price.cache': 'Вход (из кэша)',
      'price.output': 'Выход',
      'price.inputHint': 'Цена за миллион входных токенов без кэша.',
      'price.cacheHint': 'Цена за миллион входных токенов из кэша (чтение).',
      'price.outputHint': 'Цена за миллион выходных токенов.',
      'usage.total': 'Итоговая стоимость',
      'na': '—',
      'settings.description': 'Укажите цены вашей модели, чтобы видеть стоимость каждого хода и всей беседы.',
      'settings.title': 'Цены модели',
      'settings.writeHint': 'Новые записи в кэш тарифицируются по цене «Вход (без кэша)».',
      'settings.unavailable': 'Не удалось загрузить настройки. Попробуйте позже.',
      'settings.readOnly': 'Настройки в этой среде доступны только для чтения и не могут быть сохранены.',
      'settings.save': 'Сохранить',
      'settings.saving': 'Сохранение…',
      'settings.saveFailed': 'Не удалось сохранить. Исправьте значения и повторите.',
      'settings.overridden': 'Переопределено',
      'settings.reset': 'Сбросить настройки по умолчанию',
      'settings.invalidNumber': 'Введите число или оставьте поле пустым, чтобы не задавать цену.'
    };
    /** The form frame's copy, read from this plugin's dictionary. */
    function formLabels(t) {
      return {
        unavailable: t('settings.unavailable'),
        readOnly: t('settings.readOnly'),
        saveFailed: t('settings.saveFailed'),
        save: t('settings.save'),
        saving: t('settings.saving')
      };
    }

    // ------------------------------------------------------------------
    // Styles: host theme tokens only; classes carry the scst_ prefix.
    // ------------------------------------------------------------------
    const CSS = [
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
      '.scst_totalValue{color:var(--dsw-alias-brand-primary);font-weight:500}',
      // Plugin-manager settings form: the section heading and the billing
      // note under the three prices.
      '.scst_configHeading{margin:0 0 6px;font-weight:500;color:var(--dsw-alias-label-primary)}',
      '.scst_writeHint{margin:4px 0 0;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-secondary)}'
    ].join('\n');

    // ------------------------------------------------------------------
    // Price source: this plugin's host configuration (per-million-token
    // unit prices), edited in the plugin manager's settings form. The
    // module-level revision store re-renders the already-mounted pills
    // and chips whenever the settings document changes (volatile fields:
    // no plugin restart on edit).
    // ------------------------------------------------------------------
    let livePrices = { input: null, cache: null, output: null };
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
    /** Fold one settings snapshot into livePrices, bumping the revision on change. */
    function syncPricesFromSettings(form) {
      const snapshot = form.getSnapshot();
      const value = snapshot.status === 'ready' ? snapshot.value : undefined;
      const pick = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
      const next = {
        input: pick(value && value.priceInput),
        cache: pick(value && value.priceCache),
        output: pick(value && value.priceOutput)
      };
      if (next.input !== livePrices.input
        || next.cache !== livePrices.cache
        || next.output !== livePrices.output) {
        livePrices = next;
        bumpPriceRevision();
      }
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

    // tokens × per-million price → cost
    function costOf(tokens, price) {
      if (tokens === null || price === null) return null;
      return tokens * price / 1e6;
    }

    // ------------------------------------------------------------------
    // Plugin-manager settings form: the three unit prices over the
    // `stats-cost` settings namespace the host half declares. The card
    // renders the shared settings form in the bundle's own config section
    // (plugins.bundle.config, shown on the bundle's detail page) and in
    // the row's configure page (plugins.row.config); the summary view
    // contributes its one-liner.
    // ------------------------------------------------------------------
    /** Staged form over this plugin's settings namespace (shell-companion pattern). */
    class CostConfigController {
      constructor(scope) {
        this.form = new SettingsFormModel(scope, [
          settingsNumberField('priceInput'),
          settingsNumberField('priceCache'),
          settingsNumberField('priceOutput')
        ]);
        this.store = this.form.bind(() => this.projection());
      }
      projection() {
        return {
          ...this.form.shell(),
          priceInput: this.form.field('priceInput'),
          priceCache: this.form.field('priceCache'),
          priceOutput: this.form.field('priceOutput')
        };
      }
      inject() {
        return {
          hooks: { costConfig: this.store },
          ...this.form.actions()
        };
      }
      dispose() {
        this.form.dispose();
      }
    }

    function CostConfigCard(props) {
      const { t } = props;
      const state = props.useCostConfig((snapshot) => snapshot);
      if (props.view === 'summary') return t('settings.description');
      const disabled = !state.writable;
      return h(SettingsForm, {
        labels: formLabels(t),
        state,
        onSave: props.save,
        onDiscard: props.discard
      },
        h('p', { className: 'scst_configHeading' }, t('settings.title')),
        h(SettingsValueField, {
          id: 'stats-cost-price-input',
          label: t('price.input'),
          hint: t('price.inputHint'),
          overriddenLabel: t('settings.overridden'),
          resetLabel: t('settings.reset'),
          invalidLabel: t('settings.invalidNumber'),
          numeric: true,
          disabled,
          ...state.priceInput,
          onEdit: (text) => props.edit('priceInput', text),
          onReset: () => props.resetField('priceInput')
        }),
        h(SettingsValueField, {
          id: 'stats-cost-price-cache',
          label: t('price.cache'),
          hint: t('price.cacheHint'),
          overriddenLabel: t('settings.overridden'),
          resetLabel: t('settings.reset'),
          invalidLabel: t('settings.invalidNumber'),
          numeric: true,
          disabled,
          ...state.priceCache,
          onEdit: (text) => props.edit('priceCache', text),
          onReset: () => props.resetField('priceCache')
        }),
        h(SettingsValueField, {
          id: 'stats-cost-price-output',
          label: t('price.output'),
          hint: t('price.outputHint'),
          overriddenLabel: t('settings.overridden'),
          resetLabel: t('settings.reset'),
          invalidLabel: t('settings.invalidNumber'),
          numeric: true,
          disabled,
          ...state.priceOutput,
          onEdit: (text) => props.edit('priceOutput', text),
          onReset: () => props.resetField('priceOutput')
        }),
        h('p', { className: 'scst_writeHint' }, t('settings.writeHint'))
      );
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
      const priceInput = livePrices.input;
      const priceCache = livePrices.cache;
      const priceOutput = livePrices.output;
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
      usePriceRevision();
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
      if (usage === void 0) return null;
      const priceInput = livePrices.input;
      const priceCache = livePrices.cache;
      const priceOutput = livePrices.output;
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

      // The unit prices live in this plugin's host configuration: the
      // plugin manager's settings form edits them, and this bridge feeds
      // the live values to the dock pill and the per-turn chip.
      const form = ctx.configForms.get(SETTINGS_NS);
      const controller = new CostConfigController(form);
      ctx.effect(() => () => controller.dispose(), 'stats-cost: form subscription');
      ctx.effect(() => {
        syncPricesFromSettings(form);
        return form.subscribe(() => syncPricesFromSettings(form));
      }, 'stats-cost: price bridge');

      // The settings form, contributed while the Host serves this plugin's
      // settings namespace: the bundle's own config section on its detail
      // page, plus the row's configure control and page.
      ctx.effect(() => ctx.configForms.whileServed([SETTINGS_NS], () => {
        ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
          name: 'plugins.bundle.config',
          key: BUNDLE_CONFIG_KEY,
          locale: NS,
          inject: () => controller.inject()
        }, CostConfigCard));
        ctx.slots.inject('plugins.row.config', () => ctx.slots.register({
          name: 'plugins.row.config',
          key: ROW_CONFIG_KEY,
          locale: NS,
          inject: () => controller.inject()
        }, CostConfigCard));
      }), 'stats-cost: settings page');

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
      inject: ['slots', 'locale', 'configForms'],
      apply
    };
  }
});