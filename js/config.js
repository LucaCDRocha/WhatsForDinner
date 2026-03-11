// Configuration constants

const API_BASE_URL = window.location.origin;
const WS_PROTOCOL = window.location.protocol === "https:" ? "wss:" : "ws:";
const WS_URL = `${WS_PROTOCOL}//${window.location.host}`;

const COUNTDOWN_DURATION = 10; // seconds
