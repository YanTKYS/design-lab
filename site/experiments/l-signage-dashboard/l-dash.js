// L「標示盤」（仮称）ダッシュボードの独立試作。集計条件の状態とイベントは shared/dashboard-poc.js、集計は共通の dashboard.js。
import { startDashboardPoc } from '../shared/dashboard-poc.js';
import { view } from './l-dash-view.js';

startDashboardPoc({ app: document.getElementById('ls-app'), live: document.getElementById('ls-live'), view, title: 'ダッシュボード（標示盤 試作）— Design Lab' });
