// H′「折本」（仮称）ダッシュボードの独立試作。集計条件の状態とイベントは shared/dashboard-poc.js、集計は共通の dashboard.js。
import { startDashboardPoc } from '../shared/dashboard-poc.js';
import { view } from './h-dash-view.js';

startDashboardPoc({ app: document.getElementById('poc-app'), live: document.getElementById('poc-live'), view, title: 'ダッシュボード（折本 試作）— Design Lab' });
